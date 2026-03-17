import { searchTransactions, getFormData } from "../actions"
import { SearchResults } from "./search-results"

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function BuscarTransaccionesPage({ searchParams }: Props) {
  const { q = "" } = await searchParams
  const [transactions, { accounts, categories, defaultAccountId }] = await Promise.all([
    searchTransactions(q),
    getFormData(),
  ])

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-2xl font-semibold">Buscar comprobantes</h2>
      <SearchResults
        transactions={transactions}
        query={q}
        accounts={accounts}
        categories={categories}
        defaultAccountId={defaultAccountId}
      />
    </div>
  )
}
