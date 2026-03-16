"use client"

import { Cell, Pie, PieChart, Tooltip } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

export interface CategoryExpense {
  category: string
  amount: number
}

function buildChartConfig(data: CategoryExpense[]): ChartConfig {
  return Object.fromEntries(
    data.map((d, i) => [
      d.category,
      { label: d.category, color: COLORS[i % COLORS.length] },
    ])
  )
}

export function CategoryPieChart({ data }: { data: CategoryExpense[] }) {
  const chartConfig = buildChartConfig(data)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <ChartContainer config={chartConfig} className="h-48 w-full max-w-xs mx-auto sm:mx-0 shrink-0">
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80} strokeWidth={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              value.toLocaleString("es-UY", { minimumFractionDigits: 2 }),
              name,
            ]}
          />
        </PieChart>
      </ChartContainer>

      <ul className="flex flex-col gap-1 text-sm min-w-0">
        {data.map((d, i) => (
          <li key={d.category} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="truncate text-muted-foreground">{d.category}</span>
            <span className="ml-auto tabular-nums font-medium pl-2">
              {d.amount.toLocaleString("es-UY", { minimumFractionDigits: 2 })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
