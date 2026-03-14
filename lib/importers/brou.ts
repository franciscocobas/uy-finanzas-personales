import * as XLSX from "xlsx"
import type { BankParser, RawMovement } from "./types"

const ACCOUNT_NAME = "Banco $"

function excelSerialToDate(serial: number): Date {
  const utc = new Date((serial - 25569) * 86400 * 1000)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}

function parseAmount(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    return parseFloat(value.replace(/\./g, "").replace(",", "."))
  }
  return 0
}

export const brouParser: BankParser = {
  parse(buffer: ArrayBuffer): RawMovement[] {
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][]

    // Find header row (contains "Fecha" in first column)
    const headerIndex = rows.findIndex(
      (row) => Array.isArray(row) && String(row[0]).trim() === "Fecha"
    )
    if (headerIndex === -1) throw new Error("No se encontró el encabezado en el archivo BROU")

    const movements: RawMovement[] = []

    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i] as unknown[]
      const fecha = row[0]
      const descripcion = String(row[1] ?? "").trim()
      const asunto = String(row[4] ?? "").trim()
      const debito = row[6]
      const credito = row[7]

      // Stop at footer or empty row
      if (!fecha || descripcion.startsWith("Esta información")) break
      if (!descripcion && !debito && !credito) continue

      const isExpense = debito !== "" && debito !== null && debito !== undefined
      const amount = parseAmount(isExpense ? debito : credito)
      if (!amount) continue

      const description = asunto ? `${descripcion} — ${asunto}` : descripcion

      movements.push({
        date: excelSerialToDate(Number(fecha)),
        amount,
        type: isExpense ? "EXPENSE" : "INCOME",
        description,
        accountName: ACCOUNT_NAME,
      })
    }

    return movements
  },
}
