import * as XLSX from "xlsx"
import type { BankParser, ParseOptions, RawMovement } from "./types"

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

// The statement is copied from the BROU site and pasted into Google Sheets, which
// turns amounts like "28.03" into a date (28/03, format "dd.mm"). The cell then
// holds the date serial (46110), so we rebuild the amount as day.month.
function readAmountCell(cell: XLSX.CellObject | undefined): number | null {
  if (!cell) return null
  if (cell.t === "n" && typeof cell.v === "number" && typeof cell.z === "string" && XLSX.SSF.is_date(cell.z)) {
    const date = excelSerialToDate(cell.v)
    return Math.round((date.getDate() + (date.getMonth() + 1) / 100) * 100) / 100
  }
  return parseFormattedAmount(cell.v)
}

const SKIP_DESCRIPTIONS = ["PAGOS", "SALDO ANTERIOR", "TOTAL TARJETA"]

function shouldSkip(description: string): boolean {
  return SKIP_DESCRIPTIONS.some((s) => description.toUpperCase().startsWith(s))
}

const DISCOUNT_PREFIX = "DTO.BROU"

// BROU discounts come as separate credit rows ("DTO.BROU- ANCAP", "DTO.BROU-
// SUPERMERCADOS") on the same day as the purchase, for a round percentage of it
// (5 %, 10 %...). Their text doesn't name the merchant, so each one is matched to
// a same-day peso purchase by percentage and subtracted from it. Discounts with
// no matching purchase are kept as income and flagged.
function applyDiscounts(movements: RawMovement[]): RawMovement[] {
  const isDiscount = (m: RawMovement) =>
    m.type === "INCOME" && m.description.toUpperCase().startsWith(DISCOUNT_PREFIX)

  const purchases = movements.filter((m) => !isDiscount(m))

  for (const discount of movements.filter(isDiscount)) {
    let best: { purchase: RawMovement; error: number } | null = null

    for (const purchase of purchases) {
      if (purchase.type !== "EXPENSE" || purchase.isUSD || purchase.discount !== undefined) continue
      if (purchase.date.getTime() !== discount.date.getTime()) continue

      const percent = Math.round((discount.amount / purchase.amount) * 100)
      if (percent <= 0 || percent > 50 || percent % 5 !== 0) continue
      const error = Math.abs(purchase.amount * (percent / 100) - discount.amount)
      if (error > 0.011) continue
      if (!best || error < best.error) best = { purchase, error }
    }

    if (best) {
      const { purchase } = best
      purchase.amount = Math.round((purchase.amount - discount.amount) * 100) / 100
      purchase.discount = discount.amount
      purchase.description = `${purchase.description} (dto. BROU ${discount.amount.toFixed(2)})`
    } else {
      discount.unmatchedDiscount = true
      purchases.push(discount)
    }
  }

  return purchases
}

// Tolls (telepeaje, "OFICINA CENTRAL CVU") come as one row per toll booth, often
// several on the same day for the same amount. Same-day rows with the same
// description and amount are merged into one expense: "... (8 × 167)".
function groupTolls(movements: RawMovement[]): RawMovement[] {
  const result: RawMovement[] = []
  const groups = new Map<string, { movement: RawMovement; unit: number; count: number }>()

  for (const m of movements) {
    if (m.type !== "EXPENSE" || !/\bCVU\b/i.test(m.description)) {
      result.push(m)
      continue
    }
    const key = `${m.date.getTime()}|${m.description}|${m.amount}`
    const group = groups.get(key)
    if (group) {
      group.count++
    } else {
      const movement = { ...m }
      groups.set(key, { movement, unit: m.amount, count: 1 })
      result.push(movement)
    }
  }

  for (const { movement, unit, count } of groups.values()) {
    if (count === 1) continue
    movement.amount = Math.round(unit * count * 100) / 100
    movement.description = `${movement.description} (${count} × ${unit})`
  }

  return result
}

export const brouRecompensaParser: BankParser = {
  parse(buffer: ArrayBuffer, options: ParseOptions = {}): RawMovement[] {
    const workbook = XLSX.read(buffer, { type: "array", cellNF: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][]
    const firstRow = XLSX.utils.decode_range(sheet["!ref"] ?? "A1").s.r
    const amountCell = (i: number, col: number) =>
      sheet[XLSX.utils.encode_cell({ r: firstRow + i, c: col })] as XLSX.CellObject | undefined

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

      const amountPesos = readAmountCell(amountCell(i, 3))
      const amountUSD = readAmountCell(amountCell(i, 4))
      const rawAmount = amountPesos ?? amountUSD
      if (rawAmount === null) continue

      const isUSD = amountPesos === null && amountUSD !== null
      const { usdRate } = options
      const convert = isUSD && usdRate !== undefined && usdRate > 0

      let amount = Math.abs(rawAmount)
      let description = descripcion
      if (convert) {
        description = `${descripcion} (USD ${amount})`
        amount = Math.round(amount * usdRate * 100) / 100
      } else if (isUSD) {
        description = `${descripcion} (USD)`
      }

      movements.push({
        date: excelSerialToDate(Number(fecha)),
        amount,
        type: rawAmount > 0 ? "EXPENSE" : "INCOME",
        description,
        accountName: ACCOUNT_NAME,
        isUSD,
      })
    }

    return groupTolls(applyDiscounts(movements))
  },
}
