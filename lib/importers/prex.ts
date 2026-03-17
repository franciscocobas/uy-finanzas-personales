import * as XLSX from "xlsx"
import type { BankParser, RawMovement } from "./types"

const ACCOUNT_NAME = "Prex UY"

function parseDate(value: string): Date {
  const [day, month, year] = value.split("/").map(Number)
  return new Date(year, month - 1, day)
}

export const prexParser: BankParser = {
  parse(buffer: ArrayBuffer): RawMovement[] {
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][]

    const movements: RawMovement[] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[]
      const fecha = String(row[0] ?? "").trim()
      const descripcion = String(row[1] ?? "").trim()
      const importe = Number(row[5])

      if (!fecha || !descripcion || isNaN(importe) || importe === 0) continue

      movements.push({
        date: parseDate(fecha),
        amount: Math.abs(importe),
        type: importe < 0 ? "EXPENSE" : "INCOME",
        description: descripcion,
        accountName: ACCOUNT_NAME,
      })
    }

    return movements
  },
}
