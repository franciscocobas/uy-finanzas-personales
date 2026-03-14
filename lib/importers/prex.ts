import type { BankParser, RawMovement } from "./types"

// TODO: implement once the Prex xlsx format is known
// accountId must match the "Prex UY" account ID from the DB

export const prexParser: BankParser = {
  parse(_buffer: ArrayBuffer): RawMovement[] {
    throw new Error("Parser de Prex no implementado todavía")
  },
}
