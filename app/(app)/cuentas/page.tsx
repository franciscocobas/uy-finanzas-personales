import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { AccountsList } from "./accounts-list"

export const revalidate = 3600

async function revalidarCuentas() {
  "use server"
  revalidatePath("/cuentas")
}

export default async function CuentasPage() {
  const accounts = await prisma.account.findMany({
    orderBy: { name: "asc" },
    include: {
      transactions: { select: { type: true, amount: true, description: true } },
    },
  })

  const accountsWithBalance = accounts.map((a) => {
    const txBalance = a.transactions.reduce((sum, t) => {
      const amt = Number(t.amount)
      if (t.type === "INCOME") return sum + amt
      if (t.type === "EXPENSE") return sum - amt
      if (t.type === "ADJUSTMENT") return sum + amt
      return t.description?.startsWith("←") ? sum + amt : sum - amt
    }, 0)
    const { transactions: _, ...account } = a
    return {
      ...account,
      balance: Number(a.balance),
      currentBalance: Number(a.balance) + txBalance,
    }
  })

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Cuentas</h2>
        <form action={revalidarCuentas}>
          <button type="submit" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
            Revalidar
          </button>
        </form>
      </div>
      <AccountsList accounts={accountsWithBalance} />
    </div>
  )
}
