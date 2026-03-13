import { getTransactions, getFormData } from "./actions"
import { TransactionsList } from "./transactions-list"

export default async function TransaccionesPage() {
  const [transactions, { accounts, categories, defaultAccountId }] = await Promise.all([
    getTransactions(),
    getFormData(),
  ])

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-2xl font-semibold">Comprobantes</h2>
      <TransactionsList
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        defaultAccountId={defaultAccountId}
      />
    </div>
  )
}
