import { getAccounts } from "./actions"
import { AccountsList } from "./accounts-list"

export default async function CuentasPage() {
  const accounts = await getAccounts()

  return (
    <div className="max-w-xl space-y-6">
      <h2 className="text-2xl font-semibold">Cuentas</h2>
      <AccountsList accounts={accounts} />
    </div>
  )
}
