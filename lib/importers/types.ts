export interface RawMovement {
  date: Date
  amount: number        // always positive
  type: "INCOME" | "EXPENSE"
  description: string   // pre-filled from the bank file
  accountName: string   // e.g. "Banco $" — resolved to accountId by the import form
  isUSD?: boolean       // the bank charged it in dollars (converted or not)
  discount?: number     // BROU discount already subtracted from amount
  unmatchedDiscount?: boolean // BROU discount with no purchase found to apply it to
}

export interface ParseOptions {
  usdRate?: number      // if set, USD amounts are converted to pesos (amount × usdRate)
}

export interface BankParser {
  parse(buffer: ArrayBuffer, options?: ParseOptions): RawMovement[]
}

// Used in the review screen (client state)
export interface ReviewMovement {
  tempId: string
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  accountId: string
  date: Date
  amount: string        // editable text — supports "." and "," (parsed on import)
  description: string
  conceptId: string
  toAccountId: string   // only for TRANSFER
  excluded: boolean
  duplicateWarning: boolean
  isUSD: boolean
  hasDiscount: boolean
  unmatchedDiscount: boolean
}
