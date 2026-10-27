import { revalidatePath } from "next/cache"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { DueDateNote } from "./due-date-note"
import { RecurringCheckbox } from "./recurring-checkbox"

export const revalidate = 3600 // 1 hora

async function setDueDateNote(id: string, note: string) {
  "use server"
  await prisma.concept.update({ where: { id }, data: { dueDateNote: note || null } })
  revalidatePath("/")
}

async function toggleRecurringCompletion(conceptId: string, year: number, month: number, completed: boolean) {
  "use server"
  if (completed) {
    await prisma.recurringCompletion.deleteMany({ where: { conceptId, year, month } })
  } else {
    await prisma.recurringCompletion.create({ data: { conceptId, year, month } })
  }
  revalidatePath("/")
}

const AVERAGE_MONTHS = 6

function formatAmount(amount: number) {
  return amount.toLocaleString("es-UY", { maximumFractionDigits: 0 })
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export default async function HomePage() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() // 0-indexed

  const transactionSelect = {
    type: true,
    amount: true,
    conceptId: true,
    concept: { select: { category: { select: { id: true, name: true } } } },
  } as const

  const [monthTransactions, previousTransactions, recurringConcepts, manualCompletions] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        date: { gte: new Date(Date.UTC(year, month, 1)), lt: new Date(Date.UTC(year, month + 1, 1)) },
        type: { in: ["INCOME", "EXPENSE"] },
      },
      select: transactionSelect,
    }),
    prisma.transaction.findMany({
      where: {
        date: { gte: new Date(Date.UTC(year, month - AVERAGE_MONTHS, 1)), lt: new Date(Date.UTC(year, month, 1)) },
        type: { in: ["INCOME", "EXPENSE"] },
      },
      select: transactionSelect,
    }),
    prisma.concept.findMany({
      where: { recurring: true },
      select: { id: true, name: true, recurringMonths: true, paymentUrl: true, dueDateNote: true },
      orderBy: { name: "asc" },
    }),
    prisma.recurringCompletion.findMany({
      where: { year, month: month + 1 },
      select: { conceptId: true },
    }),
  ])

  // Filter recurring concepts applicable to current month (1-indexed)
  const currentMonth = month + 1
  const applicableRecurring = recurringConcepts.filter(
    (c) => c.recurringMonths.length === 0 || c.recurringMonths.includes(currentMonth)
  )

  // Which recurring concepts were paid this month (via transaction or manual completion)
  const paidConceptIds = new Set([
    ...monthTransactions.map((t) => t.conceptId).filter(Boolean),
    ...manualCompletions.map((c) => c.conceptId),
  ])

  // Monthly averages over the last AVERAGE_MONTHS complete months
  const sumByType = (rows: typeof monthTransactions, type: "INCOME" | "EXPENSE") =>
    rows.filter((t) => t.type === type).reduce((sum, t) => sum + Number(t.amount), 0)

  const avgIncome = sumByType(previousTransactions, "INCOME") / AVERAGE_MONTHS
  const avgExpense = sumByType(previousTransactions, "EXPENSE") / AVERAGE_MONTHS
  const avgSavings = avgIncome - avgExpense
  const monthExpense = sumByType(monthTransactions, "EXPENSE")

  // Current month vs average, per expense category
  const categoryMap: Record<string, { categoryId?: string; current: number; average: number }> = {}
  const addToCategory = (rows: typeof monthTransactions, key: "current" | "average", divisor: number) => {
    for (const t of rows) {
      if (t.type !== "EXPENSE") continue
      const name = t.concept?.category?.name ?? "Sin categoría"
      categoryMap[name] ??= { categoryId: t.concept?.category?.id, current: 0, average: 0 }
      categoryMap[name][key] += Number(t.amount) / divisor
    }
  }
  addToCategory(monthTransactions, "current", 1)
  addToCategory(previousTransactions, "average", AVERAGE_MONTHS)
  const categoryComparison = Object.entries(categoryMap)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.average - a.average || b.current - a.current)

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const dayOfMonth = now.getUTCDate()

  const rangeStart = new Date(Date.UTC(year, month - AVERAGE_MONTHS, 1))
  const rangeEnd = new Date(Date.UTC(year, month - 1, 1))
  const rangeLabel = `${MONTH_NAMES[rangeStart.getUTCMonth()]} – ${MONTH_NAMES[rangeEnd.getUTCMonth()]}`

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Inicio</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
        {/* Col izquierda: pagos recurrentes */}
        {applicableRecurring.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Pagos recurrentes</h3>
            <div className="border rounded-lg divide-y">
              {applicableRecurring.map((concept) => {
                const paid = paidConceptIds.has(concept.id)
                return (
                  <div key={concept.id} className="flex items-center justify-between px-4 py-1">
                    <div>
                      <p className={`text-sm ${paid ? "" : "text-muted-foreground"}`}>{concept.name}</p>
                      {!paid && (
                        <DueDateNote conceptId={concept.id} note={concept.dueDateNote} onSave={setDueDateNote} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!paid && concept.paymentUrl && (
                        <a
                          href={concept.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-medium text-white"
                        >
                          Pagar
                        </a>
                      )}
                      <RecurringCheckbox
                        conceptId={concept.id}
                        year={year}
                        month={month + 1}
                        completed={paid}
                        onToggle={toggleRecurringCompletion}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Col derecha: mes actual vs promedio de los últimos meses */}
        <div className="sm:col-span-2 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Promedio mensual — {rangeLabel}
            </h3>
            <div className="grid grid-cols-3 border rounded-lg divide-x">
              <div className="px-3 py-3">
                <p className="text-xs text-muted-foreground">Ingresos</p>
                <p className="font-medium tabular-nums text-green-600">{formatAmount(avgIncome)}</p>
              </div>
              <div className="px-3 py-3">
                <p className="text-xs text-muted-foreground">Egresos</p>
                <p className="font-medium tabular-nums text-red-600">{formatAmount(avgExpense)}</p>
              </div>
              <div className="px-3 py-3">
                <p className="text-xs text-muted-foreground">Ahorro</p>
                <p className={`font-medium tabular-nums ${avgSavings < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatAmount(avgSavings)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {MONTH_NAMES[month]} vs promedio (día {dayOfMonth} de {daysInMonth})
            </h3>
            <div className="border rounded-lg divide-y">
              {[{ category: "Total", categoryId: undefined, current: monthExpense, average: avgExpense }, ...categoryComparison].map(
                ({ category, categoryId, current, average }) => {
                  const pct = average > 0 ? (current / average) * 100 : null
                  const over = pct === null ? current > 0 : pct > 100
                  const isTotal = category === "Total"
                  const monthUrl = `/transacciones?year=${year}&month=${month + 1}`
                  const href = categoryId ? `${monthUrl}&category=${categoryId}` : isTotal ? monthUrl : null
                  const className = `block px-4 py-2 space-y-1 ${isTotal ? "bg-muted/40" : ""}`
                  const content = (
                    <>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className={`text-sm ${isTotal ? "font-semibold" : ""}`}>{category}</p>
                        <p className="text-sm tabular-nums whitespace-nowrap">
                          <span className={`font-medium ${over ? "text-red-600" : ""}`}>{formatAmount(current)}</span>
                          <span className="text-muted-foreground"> / {formatAmount(average)}</span>
                        </p>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${over ? "bg-red-500" : "bg-primary"}`}
                          style={{ width: `${Math.min(pct ?? (current > 0 ? 100 : 0), 100)}%` }}
                        />
                      </div>
                    </>
                  )
                  return href ? (
                    <Link key={category} href={href} className={`${className} hover:bg-muted/60`}>
                      {content}
                    </Link>
                  ) : (
                    <div key={category} className={className}>
                      {content}
                    </div>
                  )
                },
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
