"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const chartConfig = {
  income: { label: "Ingresos", color: "var(--color-emerald-500)" },
  expense: { label: "Egresos", color: "var(--color-red-500)" },
} satisfies ChartConfig

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

interface MonthlyData {
  month: number
  income: number
  expense: number
}

export function MonthlyChart({ data }: { data: MonthlyData[] }) {
  const chartData = data.map((d) => ({
    month: MONTH_SHORT[d.month - 1],
    income: d.income,
    expense: d.expense,
  }))

  return (
    <ChartContainer config={chartConfig} className="h-48 w-full">
      <BarChart data={chartData} barCategoryGap="30%">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) =>
                Number(value).toLocaleString("es-UY", { minimumFractionDigits: 2 })
              }
            />
          }
        />
        <Bar dataKey="income" fill="var(--color-emerald-500)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expense" fill="var(--color-red-500)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
