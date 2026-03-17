"use client"

import { useRouter } from "next/navigation"
import { TransactionRow, type SerializedAccount, type CategoryWithConcepts, type SerializedTransaction } from "../transaction-row"

interface SearchResultsProps {
  transactions: SerializedTransaction[]
  query: string
  accounts: SerializedAccount[]
  categories: CategoryWithConcepts[]
  defaultAccountId: string | null
}

export function SearchResults({ transactions, query, accounts, categories, defaultAccountId }: SearchResultsProps) {
  const router = useRouter()

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim()
    if (q) router.push(`/transacciones/buscar?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="Buscar por descripción o concepto..."
          className="border rounded-md px-3 py-1.5 text-sm bg-background flex-1"
        />
        <button type="submit" className="border rounded-md px-4 py-1.5 text-sm bg-background hover:bg-muted">
          Buscar
        </button>
      </form>

      {query && (
        <p className="text-sm text-muted-foreground">
          {transactions.length === 0
            ? "Sin resultados."
            : `${transactions.length} resultado${transactions.length !== 1 ? "s" : ""}${transactions.length === 100 ? " (máximo)" : ""}`}
        </p>
      )}

      {transactions.length > 0 && (
        <div className="border rounded-lg divide-y">
          {transactions.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              allTransactions={transactions}
              accounts={accounts}
              categories={categories}
              defaultAccountId={defaultAccountId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
