/**
 * Script de importación de movimientos desde movimientos.xlsx
 *
 * Uso: pnpm tsx scripts/import-movimientos.ts [archivo.xlsx]
 *
 * Prerequisito: correr los seeds de cuentas, categorías y conceptos primero.
 *
 * Qué hace:
 *  - Busca la cuenta por nombre (debe existir en la DB)
 *  - Busca el concepto por nombre desde la columna "Concepto" del xlsx
 *  - Usa "Descripción" como el campo description de la transacción
 *  - Importa transferencias como dos registros vinculados por transferId
 *  - Ignora los cambios de divisa (Banco $ ↔ Banco U$D)
 *  - Ignora las etiquetas
 */

import * as XLSX from "xlsx"
import { randomUUID } from "crypto"
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env" })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// --- Helpers ---

function excelDateToJSDate(serial: number): Date {
  const utcDays = serial - 25569
  return new Date(utcDays * 86400 * 1000)
}

const CURRENCY_EXCHANGE_ACCOUNTS = ["Banco U$D"]

function isCurrencyExchange(fromAccount: string, toAccount: string): boolean {
  return (
    CURRENCY_EXCHANGE_ACCOUNTS.includes(fromAccount) ||
    CURRENCY_EXCHANGE_ACCOUNTS.includes(toAccount)
  )
}

// --- Caches ---

const accountCache = new Map<string, string>()  // name -> id
const conceptCache = new Map<string, string>()   // name -> id
const notFoundConcepts = new Set<string>()
const notFoundAccounts = new Set<string>()

async function getAccount(name: string): Promise<string | null> {
  if (accountCache.has(name)) return accountCache.get(name)!
  // Exact match first
  let account = await prisma.account.findFirst({ where: { name } })
  // Fallback: name in DB starts with the extracted (possibly truncated) string
  if (!account) {
    account = await prisma.account.findFirst({ where: { name: { startsWith: name } } })
  }
  if (!account) {
    notFoundAccounts.add(name)
    return null
  }
  accountCache.set(name, account.id)
  return account.id
}

async function getConcept(name: string): Promise<string | null> {
  if (conceptCache.has(name)) return conceptCache.get(name)!
  const concept = await prisma.concept.findFirst({ where: { name } })
  if (!concept) {
    notFoundConcepts.add(name)
    return null
  }
  conceptCache.set(name, concept.id)
  return concept.id
}

// --- Main ---

interface Row {
  Fecha: number
  Tipo: string
  Cuenta: string
  Concepto: string
  Descripción: string
  Importe: number
}

async function main() {
  const filename = process.argv[2] ?? "movimientos.xlsx"
  const workbook = XLSX.readFile(filename)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Row>(sheet)

  console.log(`Filas leídas: ${rows.length}`)

  const transfers = rows.filter((r) => r.Tipo === "Transferencia")
  const nonTransfers = rows.filter((r) => r.Tipo !== "Transferencia")

  const total = rows.length
  let processed = 0
  let created = 0
  let skipped = 0

  function logProgress(label: string) {
    const pct = Math.round((processed / total) * 100)
    process.stdout.write(`\r[${pct.toString().padStart(3)}%] ${label.padEnd(60)}`)
  }

  // --- Ingresos, egresos y ajustes ---
  console.log(`\nImportando ${nonTransfers.length} ingresos/egresos/ajustes...`)

  for (const row of nonTransfers) {
    const type = row.Tipo === "Ingreso" ? "INCOME" : "EXPENSE"
    const date = excelDateToJSDate(row.Fecha)
    const amount = Math.abs(row.Importe)

    const accountId = await getAccount(row.Cuenta)
    if (!accountId) { skipped++; processed++; continue }

    const conceptId = row.Concepto ? await getConcept(row.Concepto) : null

    await prisma.transaction.create({
      data: {
        date,
        type,
        amount,
        accountId,
        conceptId: conceptId ?? undefined,
        description: row.Descripción || undefined,
      },
    })
    created++
    processed++
    logProgress(`${row.Tipo}: ${row.Descripción || row.Concepto} (${row.Cuenta})`)
  }
  console.log(`\n  ${created} transacciones creadas, ${skipped} saltadas`)

  // --- Transferencias ---
  const outgoing = transfers.filter((r) => r.Importe < 0)
  const incoming = transfers.filter((r) => r.Importe > 0)

  console.log(`\nImportando transferencias (${outgoing.length} pares posibles)...`)
  let transfersCreated = 0
  let transfersSkipped = 0

  for (const out of outgoing) {
    logProgress(`Transferencia: ${out.Descripción} (${out.Cuenta})`)

    const haciaMatch =
      out.Descripción.match(/\[hacia (.+?)\]/) ||
      out.Descripción.match(/[Hh]acia (.+)$/)
    if (!haciaMatch) {
      console.log(`\n  ⚠ Sin destino identificable: "${out.Descripción}" — saltando`)
      transfersSkipped++
      processed += 2
      continue
    }

    const toAccountName = haciaMatch[1].trim()
    const fromAccountName = out.Cuenta

    if (isCurrencyExchange(fromAccountName, toAccountName)) {
      transfersSkipped++
      processed += 2
      continue
    }

    const fromAccountId = await getAccount(fromAccountName)
    const toAccountId = await getAccount(toAccountName)
    if (!fromAccountId || !toAccountId) {
      transfersSkipped++
      processed += 2
      continue
    }

    const date = excelDateToJSDate(out.Fecha)
    const amount = Math.abs(out.Importe)
    const transferId = randomUUID()

    await prisma.$transaction([
      prisma.transaction.create({
        data: { date, type: "TRANSFER", amount, description: `→ ${toAccountName}`, accountId: fromAccountId, transferId },
      }),
      prisma.transaction.create({
        data: { date, type: "TRANSFER", amount, description: `← ${fromAccountName}`, accountId: toAccountId, transferId },
      }),
    ])
    transfersCreated++
    processed += 2
  }

  const unpairedIncoming = incoming.filter((r) =>
    !outgoing.some((o) => o.Fecha === r.Fecha && Math.abs(o.Importe) === Math.abs(r.Importe))
  )
  if (unpairedIncoming.length > 0) {
    console.log(`\n  ⚠ ${unpairedIncoming.length} filas de transferencia sin par ignoradas`)
  }

  console.log(`\n  ${transfersCreated} transferencias creadas, ${transfersSkipped} saltadas`)

  // --- Resumen de advertencias ---
  if (notFoundAccounts.size > 0) {
    console.log(`\n⚠ Cuentas no encontradas (${notFoundAccounts.size}): ${[...notFoundAccounts].join(", ")}`)
  }
  if (notFoundConcepts.size > 0) {
    console.log(`\n⚠ Conceptos no encontrados (${notFoundConcepts.size}): ${[...notFoundConcepts].join(", ")}`)
  }

  console.log("\n✓ Importación completa")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
