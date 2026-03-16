import { prisma } from "@/lib/prisma"
import { MonthlyChart } from "./monthly-chart"

function formatAmount(amount: number) {
  return amount.toLocaleString("es-UY", { minimumFractionDigits: 2 })
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export default async function HomePage() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() // 0-indexed

  const [monthTransactions, yearTransactions, recurringConcepts] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        date: { gte: new Date(Date.UTC(year, month, 1)), lt: new Date(Date.UTC(year, month + 1, 1)) },
        type: { in: ["INCOME", "EXPENSE"] },
      },
      select: { type: true, amount: true, conceptId: true },
    }),
    prisma.transaction.findMany({
      where: {
        date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
        type: { in: ["INCOME", "EXPENSE"] },
      },
      select: { type: true, amount: true, date: true },
    }),
    prisma.concept.findMany({
      where: { recurring: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const income = monthTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const expense = monthTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = income - expense

  // Which recurring concepts were paid this month
  const paidConceptIds = new Set(monthTransactions.map((t) => t.conceptId).filter(Boolean))

  // Aggregate year data by month
  const monthlyMap: Record<number, { income: number; expense: number }> = {}
  for (const t of yearTransactions) {
    const m = t.date.getUTCMonth() + 1
    if (!monthlyMap[m]) monthlyMap[m] = { income: 0, expense: 0 }
    if (t.type === "INCOME") monthlyMap[m].income += Number(t.amount)
    else monthlyMap[m].expense += Number(t.amount)
  }
  const monthlyData = Object.entries(monthlyMap)
    .map(([m, v]) => ({ month: Number(m), ...v }))
    .sort((a, b) => a.month - b.month)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Inicio</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
        {recurringConcepts.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Pagos recurrentes</h3>
            <div className="border rounded-lg divide-y">
              {recurringConcepts.map((concept) => {
                const paid = paidConceptIds.has(concept.id)
                return (
                  <div key={concept.id} className="flex items-center justify-between px-4 py-1">
                    <p className={`text-sm ${paid ? "" : "text-muted-foreground"}`}>{concept.name}</p>
                    <span className="text-lg">{paid ? "✅" : "⬜"}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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

      {monthlyData.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{year} — Ingresos vs Egresos</h3>
          <div className="border rounded-lg p-4">
            <MonthlyChart data={monthlyData} />
          </div>
        </div>
      )}
    </div>
  )
}
