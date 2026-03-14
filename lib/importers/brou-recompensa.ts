import * as XLSX from "xlsx"
import type { BankParser, RawMovement } from "./types"

const ACCOUNT_NAME = "Tarjeta MASTER Recompensa"

function excelSerialToDate(serial: number): Date {
  const utc = new Date((serial - 25569) * 86400 * 1000)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}

function parseFormattedAmount(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null
  const str = String(value).replace(/,/g, "").replace(/\s/g, "").trim()
  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

const SKIP_DESCRIPTIONS = ["PAGOS", "SALDO ANTERIOR", "TOTAL TARJETA"]

function shouldSkip(description: string): boolean {
  return SKIP_DESCRIPTIONS.some((s) => description.toUpperCase().startsWith(s))
}

export const brouRecompensaParser: BankParser = {
  parse(buffer: ArrayBuffer): RawMovement[] {
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][]

    // Find header row
    const headerIndex = rows.findIndex(
      (row) => Array.isArray(row) && String(row[0]).trim() === "Fecha"
    )
    if (headerIndex === -1) throw new Error("No se encontró el encabezado en el archivo BROU Recompensa")

    const movements: RawMovement[] = []

    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i] as unknown[]
      const fecha = row[0]
      const descripcion = String(row[1] ?? "").trim()

      // Skip rows without date or with known non-transaction descriptions
      if (!fecha) continue
      if (shouldSkip(descripcion)) continue

      const amountPesos = parseFormattedAmount(row[3])
      const amountUSD = parseFormattedAmount(row[4])
      const rawAmount = amountPesos ?? amountUSD
      if (rawAmount === null) continue

      const isUSD = amountPesos === null && amountUSD !== null
      const description = isUSD ? `${descripcion} (USD)` : descripcion

      movements.push({
        date: excelSerialToDate(Number(fecha)),
        amount: Math.abs(rawAmount),
        type: rawAmount > 0 ? "EXPENSE" : "INCOME",
        description,
        accountName: ACCOUNT_NAME,
      })
    }

    return movements
  },
}
