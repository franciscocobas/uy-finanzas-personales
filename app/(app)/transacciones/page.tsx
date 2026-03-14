import { getTransactions, getFormData, getAvailableMonths, getAvailableYears } from "./actions"
import { TransactionsList } from "./transactions-list"

interface Props {
  searchParams: Promise<{ year?: string; month?: string }>
}

export default async function TransaccionesPage({ searchParams }: Props) {
  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year) : now.getFullYear()

  const [{ accounts, categories, defaultAccountId }, availableMonths, availableYears] =
    await Promise.all([
      getFormData(),
      getAvailableMonths(year),
      getAvailableYears(),
    ])

  const lastAvailableMonth = availableMonths.length > 0 ? Math.max(...availableMonths) : now.getMonth() + 1
  const month = params.month ? parseInt(params.month) : lastAvailableMonth

  const transactions = await getTransactions(year, month)

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-2xl font-semibold">Comprobantes</h2>
      <TransactionsList
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        defaultAccountId={defaultAccountId}
        year={year}
        month={month}
        availableMonths={availableMonths}
        availableYears={availableYears}
      />
    </div>
  )
}
