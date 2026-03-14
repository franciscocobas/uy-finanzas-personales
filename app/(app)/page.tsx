import { prisma } from "@/lib/prisma"

function formatAmount(amount: number) {
  return amount.toLocaleString("es-UY", { minimumFractionDigits: 2 })
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export default async function HomePage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  const from = new Date(year, month, 1)
  const to = new Date(year, month + 1, 1)

  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: from, lt: to },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    select: { type: true, amount: true },
  })

  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const expense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = income - expense

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Inicio</h2>

      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          {MONTH_NAMES[month]} {year}
        </h3>
        <div className="border rounded-lg divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm">Ingresos</p>
            <p className="font-medium tabular-nums text-green-600">{formatAmount(income)}</p>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm">Egresos</p>
            <p className="font-medium tabular-nums text-red-600">{formatAmount(expense)}</p>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
            <p className="text-sm font-semibold">Balance</p>
            <p className={`font-semibold tabular-nums ${balance < 0 ? "text-red-600" : "text-green-600"}`}>
              {formatAmount(balance)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
