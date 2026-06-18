"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import Anthropic from "@anthropic-ai/sdk"

// Inicialización perezosa: el SDK tira error al construirse sin API key, así que
// no lo instanciamos a nivel de módulo (rompería el build/import si falta la key).
function getAnthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  return apiKey ? new Anthropic({ apiKey }) : null
}

export type ParsedDictation = {
  type: "INCOME" | "EXPENSE"
  amount: number | null
  date: string // YYYY-MM-DD
  conceptId: string | null
  accountId: string | null
  description: string | null
}

export type ParseResult =
  | { ok: true; parsed: ParsedDictation }
  | { ok: false; error: string }

function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA") // YYYY-MM-DD en tz local
}

function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export async function parseDictation(text: string): Promise<ParseResult> {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: "El texto está vacío." }

  const [concepts, accounts] = await Promise.all([
    prisma.concept.findMany({
      where: { active: true },
      select: { id: true, name: true, category: { select: { name: true, type: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.account.findMany({
      where: { active: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
  ])

  const cashAccountId = accounts.find((a) => a.type === "CASH")?.id ?? null
  const today = todayLocal()

  const conceptList = concepts
    .map((c) => `${c.id} | ${c.name} | ${c.category.name} (${c.category.type})`)
    .join("\n")
  const accountList = accounts.map((a) => `${a.id} | ${a.name}`).join("\n")

  const system = `Extraés los datos de un movimiento (gasto o ingreso) dictado en lenguaje natural (español rioplatense) y los mapeás a registros existentes. Hoy es ${today}.

CONCEPTOS (id | nombre | categoría (tipo)):
${conceptList}

CUENTAS (id | nombre):
${accountList}

Reglas:
- conceptId y accountId: usá SOLO ids de las listas. Nunca inventes. Si no hay coincidencia clara, devolvé null.
- Matcheá con tolerancia: mayúsculas, plurales, acentos, sinónimos obvios (ej: "alimentación" → concepto "Alimentación"; "efectivo" → cuenta "Efectivo $").
- No te dejes guiar por dónde aparezcan las palabras "cuenta"/"concepto"; matcheá cada término contra la lista que corresponda.
- type: "EXPENSE" para gastos, "INCOME" para ingresos. Si elegís un concepto, su tipo de categoría tiene prioridad.
- date: formato YYYY-MM-DD. Resolvé fechas relativas ("hoy", "ayer", "anteayer", "el lunes pasado") respecto a hoy (${today}). Si no se menciona fecha, usá hoy.
- amount: número. "85 con 32" o "85 pesos con 32 centavos" = 85.32. Ignorá la palabra "pesos". Si no se dice monto, devolvé null.
- description: nota adicional textual si la hay; si no, null.`

  const tool: Anthropic.Tool = {
    name: "registrar_movimiento",
    description: "Registra los datos extraídos del movimiento dictado.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["INCOME", "EXPENSE"] },
        amount: { type: ["number", "null"], description: "Monto en pesos, con decimales si corresponde." },
        date: { type: "string", description: "Fecha en formato YYYY-MM-DD." },
        conceptId: { type: ["string", "null"], enum: [...concepts.map((c) => c.id), null] },
        accountId: { type: ["string", "null"], enum: [...accounts.map((a) => a.id), null] },
        description: { type: ["string", "null"] },
      },
      required: ["type", "amount", "date", "conceptId", "accountId", "description"],
      additionalProperties: false,
    },
  }

  const anthropic = getAnthropic()
  if (!anthropic) {
    return { ok: false, error: "Falta configurar la API key de Anthropic (ANTHROPIC_API_KEY)." }
  }

  let raw: Record<string, unknown>
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system,
      tools: [tool],
      tool_choice: { type: "tool", name: "registrar_movimiento" },
      messages: [{ role: "user", content: trimmed }],
    })
    const block = response.content.find((b) => b.type === "tool_use")
    if (!block || block.type !== "tool_use") {
      return { ok: false, error: "No se pudo interpretar el texto. Probá reformularlo." }
    }
    raw = block.input as Record<string, unknown>
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "Falta o es inválida la API key de Anthropic (ANTHROPIC_API_KEY)." }
    }
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return { ok: false, error: `Error al consultar a Claude: ${msg}` }
  }

  // Validación y reconciliación en el servidor (no confiamos ciegamente en el modelo)
  const concept = typeof raw.conceptId === "string" ? concepts.find((c) => c.id === raw.conceptId) ?? null : null
  const accountId =
    typeof raw.accountId === "string" && accounts.some((a) => a.id === raw.accountId)
      ? (raw.accountId as string)
      : cashAccountId

  // Si hay concepto matcheado, su tipo de categoría manda; si no, el del modelo.
  const type: "INCOME" | "EXPENSE" = concept
    ? concept.category.type
    : raw.type === "INCOME"
      ? "INCOME"
      : "EXPENSE"

  const amount = typeof raw.amount === "number" && raw.amount > 0 ? raw.amount : null

  return {
    ok: true,
    parsed: {
      type,
      amount,
      date: isValidDate(raw.date) ? raw.date : today,
      conceptId: concept?.id ?? null,
      accountId,
      description: typeof raw.description === "string" && raw.description.trim() ? raw.description.trim() : null,
    },
  }
}

export async function getDictations() {
  return prisma.expenseDictation.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  })
}

export async function saveDictation(text: string, userAgent?: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  await prisma.expenseDictation.create({
    data: { text: trimmed, userAgent: userAgent || null },
  })
  revalidatePath("/dictar")
}

export async function deleteDictation(id: string) {
  await prisma.expenseDictation.delete({ where: { id } })
  revalidatePath("/dictar")
}
