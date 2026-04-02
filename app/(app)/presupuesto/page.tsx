import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { YearSelect } from "./year-select"

async function revalidarPresupuesto() {
  "use server"
  revalidatePath("/presupuesto")
}

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function fmt(n: number) {
  if (n === 0) return ""
  return n.toLocaleString("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default async function PresupuestoPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const currentYear = new Date().getFullYear()
  const { year: yearParam } = await searchParams
  const year = yearParam ? parseInt(yearParam) : currentYear

  const minYearResult = await prisma.transaction.findFirst({
    orderBy: { date: "asc" },
    select: { date: true },
  })
  const minYear = minYearResult ? new Date(minYearResult.date).getUTCFullYear() : currentYear
  const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => currentYear - i)

  const [concepts, transactions] = await Promise.all([
    prisma.concept.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.transaction.findMany({
      where: {
        date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
        type: { in: ["INCOME", "EXPENSE"] },
        conceptId: { not: null },
      },
      select: { conceptId: true, amount: true, date: true },
    }),
  ])

  // conceptId -> month (0-11) -> sum
  const totals: Record<string, Record<number, number>> = {}
  for (const t of transactions) {
    if (!t.conceptId) continue
    const month = new Date(t.date).getUTCMonth()
    if (!totals[t.conceptId]) totals[t.conceptId] = {}
    totals[t.conceptId][month] = (totals[t.conceptId][month] ?? 0) + Number(t.amount)
  }

  // Group concepts by category, separated by type
  const groupByCategory = (list: typeof concepts) => {
    const map = new Map<string, { categoryName: string; concepts: typeof concepts }>()
    for (const c of list) {
      if (!map.has(c.categoryId)) {
        map.set(c.categoryId, { categoryName: c.category.name, concepts: [] })
      }
      map.get(c.categoryId)!.concepts.push(c)
    }
    return Array.from(map.values()).sort((a, b) => a.categoryName.localeCompare(b.categoryName))
  }

  const incomeConcepts = concepts.filter((c) => c.category.type === "INCOME")
  const expenseConcepts = concepts.filter((c) => c.category.type === "EXPENSE")
  const incomeGroups = groupByCategory(incomeConcepts)
  const expenseGroups = groupByCategory(expenseConcepts)

  // month -> total income / expense
  const monthlyIncome = Array.from({ length: 12 }, (_, m) =>
    incomeConcepts.reduce((sum, c) => sum + (totals[c.id]?.[m] ?? 0), 0)
  )
  const monthlyExpense = Array.from({ length: 12 }, (_, m) =>
    expenseConcepts.reduce((sum, c) => sum + (totals[c.id]?.[m] ?? 0), 0)
  )

  const renderGroups = (
    groups: ReturnType<typeof groupByCategory>,
    sectionLabel: string,
    colors: { section: string; category: string; row: string; sticky: string }
  ) =>
    groups.map((group, gi) => (
      <>
        {gi === 0 && (
          <tr key={`section-${sectionLabel}`} className={colors.section}>
            <td
              colSpan={13}
              className={`sticky left-0 ${colors.section} px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground`}
            >
              {sectionLabel}
            </td>
          </tr>
        )}
        <tr key={`cat-${group.categoryName}`} className={colors.category}>
          <td
            colSpan={13}
            className={`sticky left-0 ${colors.category} px-3 py-1 text-xs font-semibold text-muted-foreground`}
          >
            {group.categoryName}
          </td>
        </tr>
        {group.concepts.map((concept) => (
          <tr key={concept.id} className={`border-b border-border/40 ${colors.row}`}>
            <td className={`sticky left-0 ${colors.sticky} px-3 py-2 text-sm whitespace-nowrap`}>
              {concept.name}
            </td>
            {MONTHS.map((_, m) => {
              const val = totals[concept.id]?.[m] ?? 0
              return (
                <td key={m} className="border-l border-border px-3 py-2 text-right text-sm tabular-nums text-muted-foreground">
                  {fmt(val)}
                </td>
              )
            })}
          </tr>
        ))}
      </>
    ))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Presupuesto {year}</h2>
        <div className="flex items-center gap-3">
          <YearSelect years={years} selected={year} />
          <form action={revalidarPresupuesto}>
            <button type="submit" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Revalidar
            </button>
          </form>
        </div>
      </div>
      <div className="overflow-auto rounded-md border" style={{ maxHeight: "calc(100vh - 140px)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="sticky top-0 z-10 bg-muted/50 [box-shadow:0_1px_0_#d3d3d3]">
              <th className="sticky left-0 z-20 bg-muted/50 px-3 py-2 text-left font-medium">Concepto</th>
              {MONTHS.map((m) => (
                <th key={m} className="border-l border-border px-3 py-2 text-right font-medium">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderGroups(incomeGroups, "Ingresos", {
              section: "bg-green-100",
              category: "bg-green-50",
              row: "bg-green-50/50 hover:bg-green-100/50",
              sticky: "bg-green-50",
            })}
            {renderGroups(expenseGroups, "Egresos", {
              section: "bg-red-100",
              category: "bg-red-50",
              row: "bg-red-50/50 hover:bg-red-100/50",
              sticky: "bg-red-50",
            })}
          </tbody>
          <tfoot className="border-t-2 border-border">
            <tr className="bg-green-100 font-semibold">
              <td className="sticky left-0 bg-green-100 px-3 py-2 text-sm">Total ingresos</td>
              {monthlyIncome.map((val, m) => (
                <td key={m} className="border-l border-border px-3 py-2 text-right text-sm tabular-nums">
                  {fmt(val)}
                </td>
              ))}
            </tr>
            <tr className="bg-red-100 font-semibold">
              <td className="sticky left-0 bg-red-100 px-3 py-2 text-sm">Total egresos</td>
              {monthlyExpense.map((val, m) => (
                <td key={m} className="border-l border-border px-3 py-2 text-right text-sm tabular-nums">
                  {fmt(val)}
                </td>
              ))}
            </tr>
            <tr className="bg-muted/50 font-bold">
              <td className="sticky left-0 bg-muted/50 px-3 py-2 text-sm">Saldo</td>
              {monthlyIncome.map((inc, m) => {
                const saldo = inc - monthlyExpense[m]
                return (
                  <td
                    key={m}
                    className={`border-l border-border px-3 py-2 text-right text-sm tabular-nums ${saldo < 0 ? "text-red-600" : saldo > 0 ? "text-green-700" : ""}`}
                  >
                    {fmt(saldo)}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
