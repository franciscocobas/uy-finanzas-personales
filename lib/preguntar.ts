import Anthropic from "@anthropic-ai/sdk"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/lib/generated/prisma/client"

const MODEL = "claude-opus-5-5"
const MAX_TOOL_ROUNDS = 10
const MAX_ROWS = 200

// Cliente aparte con el rol de solo lectura (finanzas_readonly): aunque el modelo
// escriba un UPDATE/DELETE, la base lo rechaza. Perezoso por el mismo motivo que el SDK.
const globalForReadonly = globalThis as unknown as { prismaReadonly?: PrismaClient }

function getReadonlyPrisma(): PrismaClient | null {
  const connectionString = process.env.DATABASE_URL_READONLY
  if (!connectionString) return null
  globalForReadonly.prismaReadonly ??= new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  return globalForReadonly.prismaReadonly
}

function getAnthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  return apiKey ? new Anthropic({ apiKey }) : null
}

export type AskResult =
  | { ok: true; answer: string; queries: string[]; costUsd: number }
  | { ok: false; error: string; queries: string[]; costUsd: number }

// US$ por millón de tokens. Cache write = escritura de 5 minutos.
const PRICES: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  "claude-opus-4-8": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
}

function responseCost(response: Anthropic.Beta.BetaMessage): number {
  const p = PRICES[response.model] ?? PRICES[MODEL]
  const u = response.usage
  return (
    (u.input_tokens * p.input +
      u.output_tokens * p.output +
      (u.cache_creation_input_tokens ?? 0) * p.cacheWrite +
      (u.cache_read_input_tokens ?? 0) * p.cacheRead) /
    1_000_000
  )
}

const SYSTEM = `Respondés preguntas sobre las finanzas personales del usuario (Uruguay, español rioplatense) consultando su base PostgreSQL con la herramienta run_sql. Montos en pesos uruguayos salvo que el concepto o la descripción indiquen otra moneda.

ESQUEMA (identificadores con comillas dobles, son case-sensitive):
- "Transaction"(id, date timestamp, type "TransactionType", amount numeric, description text, "conceptId", "accountId", "transferId", "createdAt")
  - type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ADJUSTMENT'. amount siempre positivo en INCOME/EXPENSE.
  - Las transferencias son dos filas TRANSFER vinculadas por "transferId". Para ingresos/egresos/gastos excluí siempre type = 'TRANSFER' y 'ADJUSTMENT'.
  - date se guarda a medianoche; usá date::date para comparar días.
  - description es texto libre (a veces el detalle real del gasto está ahí y no en el concepto). Buscá con ILIKE y variantes (singular/plural, sin tildes, abreviaturas).
- "Concept"(id, name, "categoryId", recurring bool, "recurringMonths" int[], "dueDateNote", active bool)
- "Category"(id, name, type 'INCOME' | 'EXPENSE')
- "Account"(id, name, type 'CASH' | 'BANK' | 'CARD', active, balance numeric, "isDefault")
- "RecurringCompletion"(id, "conceptId", year, month): pagos recurrentes marcados a mano en la home.
- "ExpenseDictation"(id, text, "userAgent", "createdAt"): gastos dictados por voz pendientes de registrar.

Cómo trabajar:
- Solo SELECT (o WITH ... SELECT). Explorá primero si no sabés cómo está registrado algo (por ejemplo, listá los conceptos de una categoría o buscá en description).
- Pedí agregados en SQL en vez de traer muchas filas; los resultados se cortan en ${MAX_ROWS} filas.
- Respuesta final: directa, en español, con los números clave y el detalle mínimo que la respalde (fechas y montos de las transacciones relevantes si son pocas). Formateá montos como $12.345. Si estimás o suponés algo, decilo en una línea. Usá markdown simple (listas, tablas chicas, negritas).`

const runSqlTool: Anthropic.Beta.BetaTool = {
  name: "run_sql",
  description:
    "Ejecuta una consulta SELECT de solo lectura en la base PostgreSQL y devuelve las filas como JSON (máximo 200 filas, timeout de 5 segundos).",
  input_schema: {
    type: "object",
    properties: {
      sql: { type: "string", description: "Una sola consulta SELECT o WITH ... SELECT." },
    },
    required: ["sql"],
    additionalProperties: false,
  },
  strict: true,
}

// El rol ya es de solo lectura; esto solo corta temprano lo que claramente no es una consulta.
function validateSql(sql: string): string | null {
  const trimmed = sql.trim().replace(/;\s*$/, "")
  if (!/^(select|with)\b/i.test(trimmed)) return "Solo se permiten consultas SELECT."
  if (trimmed.includes(";")) return "Solo se permite una consulta por llamada."
  return null
}

function toJson(rows: unknown[]): string {
  // BigInt (count) y Decimal no serializan directo
  return JSON.stringify(rows, (_, v) => (typeof v === "bigint" ? Number(v) : v))
}

async function runSql(db: PrismaClient, sql: string): Promise<{ content: string; isError: boolean }> {
  const invalid = validateSql(sql)
  if (invalid) return { content: invalid, isError: true }
  try {
    const rows = await db.$queryRawUnsafe<unknown[]>(sql.trim().replace(/;\s*$/, ""))
    const truncated = rows.length > MAX_ROWS
    const body = toJson(rows.slice(0, MAX_ROWS))
    return {
      content: truncated ? `${body}\n(Resultado cortado: ${rows.length} filas, se muestran ${MAX_ROWS}.)` : body,
      isError: false,
    }
  } catch (e) {
    return { content: e instanceof Error ? e.message : "Error desconocido", isError: true }
  }
}

export async function askQuestion(question: string): Promise<AskResult> {
  const queries: string[] = []
  let costUsd = 0
  const trimmed = question.trim()
  if (!trimmed) return { ok: false, error: "La pregunta está vacía.", queries, costUsd }

  const anthropic = getAnthropic()
  if (!anthropic) return { ok: false, error: "Falta configurar ANTHROPIC_API_KEY.", queries, costUsd }
  const db = getReadonlyPrisma()
  if (!db) return { ok: false, error: "Falta configurar DATABASE_URL_READONLY.", queries, costUsd }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Montevideo" })
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: `Hoy es ${today}.\n\n${trimmed}` },
  ]

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: "medium" },
        betas: ["server-side-fallback-2026-06-01"],
        fallbacks: [{ model: "claude-opus-4-8" }],
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        tools: [runSqlTool],
        messages,
      })
      costUsd += responseCost(response)

      if (response.stop_reason === "refusal") {
        return { ok: false, error: "El modelo no quiso responder esa pregunta.", queries, costUsd }
      }

      if (response.stop_reason !== "tool_use") {
        const answer = response.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim()
        return answer
          ? { ok: true, answer, queries, costUsd }
          : { ok: false, error: "El modelo no devolvió una respuesta.", queries, costUsd }
      }

      messages.push({ role: "assistant", content: response.content })

      const toolResults: Anthropic.Beta.BetaToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type !== "tool_use") continue
        const sql = typeof (block.input as { sql?: unknown }).sql === "string" ? (block.input as { sql: string }).sql : ""
        queries.push(sql)
        const result = await runSql(db, sql)
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result.content, is_error: result.isError })
      }
      messages.push({ role: "user", content: toolResults })
    }
    return { ok: false, error: "La consulta necesitó demasiados pasos. Probá con una pregunta más concreta.", queries, costUsd }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "La API key de Anthropic es inválida.", queries, costUsd }
    }
    if (e instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Límite de uso de la API alcanzado. Probá en un rato.", queries, costUsd }
    }
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return { ok: false, error: `Error al consultar a Claude: ${msg}`, queries, costUsd }
  }
}
