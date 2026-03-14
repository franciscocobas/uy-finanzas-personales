export interface RawMovement {
  date: Date
  amount: number        // always positive
  type: "INCOME" | "EXPENSE"
  description: string   // pre-filled from the bank file
  accountName: string   // e.g. "Banco $" — resolved to accountId by the import form
}

export interface BankParser {
  parse(buffer: ArrayBuffer): RawMovement[]
}

// Used in the review screen (client state)
export interface ReviewMovement {
  tempId: string
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  accountId: string
  date: Date
  amount: number
  description: string
  conceptId: string
  toAccountId: string   // only for TRANSFER
  excluded: boolean
  duplicateWarning: boolean
}
