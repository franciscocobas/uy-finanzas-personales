import * as XLSX from "xlsx"
import type { BankParser, RawMovement } from "./types"

const ACCOUNT_NAME = "Prex UY"

// Movimientos que no llegaron a impactar en la cuenta
const IGNORED_STATUS = /rechaz|anulad|cancelad|revertid/i

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
}

// La fecha puede venir como número de serie de Excel (formato nuevo) o como "dd/mm/aaaa" (formato viejo)
function parseDate(value: unknown): Date | null {
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value)
    return d ? new Date(d.y, d.m - 1, d.d) : null
  }
  const match = String(value ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!match) return null
  const [, day, month, year] = match.map(Number)
  return new Date(year < 100 ? 2000 + year : year, month - 1, day)
}

function parseAmount(value: unknown): number {
  if (typeof value === "number") return value
  return Number(String(value ?? "").replace(/\./g, "").replace(",", "."))
}

// Formato nuevo: Estado | Fecha | Detalle | Importe | Importe (formateado) | Moneda
// Formato viejo: Fecha | Descripción | ... | Importe (columna F)
function getColumns(header: unknown[]) {
  const names = header.map(normalize)
  const find = (...candidates: string[]) => names.findIndex((n) => candidates.includes(n))

  const date = find("fecha")
  const description = find("detalle", "descripcion")
  const amount = find("importe")
  if (date !== -1 && description !== -1 && amount !== -1) {
    return { date, description, amount, status: find("estado"), currency: find("moneda") }
  }
  return { date: 0, description: 1, amount: 5, status: -1, currency: -1 }
}

export const prexParser: BankParser = {
  parse(buffer: ArrayBuffer): RawMovement[] {
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true }) as unknown[][]
    if (rows.length === 0) return []

    const col = getColumns(rows[0])
    const movements: RawMovement[] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const date = parseDate(row[col.date])
      const description = String(row[col.description] ?? "").trim()
      const importe = parseAmount(row[col.amount])

      if (!date || !description || isNaN(importe) || importe === 0) continue
      if (col.status !== -1 && IGNORED_STATUS.test(String(row[col.status] ?? ""))) continue

      const isUSD = col.currency !== -1 && /usd|d[oó]lar/i.test(String(row[col.currency] ?? ""))

      movements.push({
        date,
        amount: Math.abs(importe),
        type: importe < 0 ? "EXPENSE" : "INCOME",
        description: isUSD ? `${description} (USD)` : description,
        accountName: ACCOUNT_NAME,
        isUSD,
      })
    }

    return movements
  },
}
