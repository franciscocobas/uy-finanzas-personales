"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Search } from "lucide-react"
import { TransactionForm } from "./transaction-form"
import { TransactionRow, type SerializedAccount, type CategoryWithConcepts, type SerializedTransaction } from "./transaction-row"

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

interface TransactionsListProps {
  transactions: SerializedTransaction[]
  accounts: SerializedAccount[]
  categories: CategoryWithConcepts[]
  defaultAccountId: string | null
  year: number
  month: number
  availableMonths: number[]
  availableYears: number[]
}

export function TransactionsList({
  transactions,
  accounts,
  categories,
  defaultAccountId,
  year,
  month,
  availableMonths,
  availableYears,
}: TransactionsListProps) {
  const [showForm, setShowForm] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState("")
  const router = useRouter()

  const visibleTransactions = categoryFilter
    ? transactions.filter((t) => t.concept?.category.id === categoryFilter)
    : transactions

  function navigate(y: number, m: number) {
    router.push(`/transacciones?year=${y}&month=${m}`)
  }

  return (
    <div className="space-y-4">
      {/* Year selector + new button */}
      <div className="flex items-center justify-between gap-4">
        <select
          value={year}
          onChange={(e) => router.push(`/transacciones?year=${e.target.value}`)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <div className="flex gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/transacciones/buscar" title="Buscar comprobantes">
              <Search className="h-4 w-4" />
            </Link>
          </Button>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo comprobante
          </Button>
        </div>
      </div>

      {/* Month buttons */}
      <div className="flex flex-wrap gap-2">
        {[...availableMonths].reverse().map((m) => (
          <Button
            key={m}
            variant={m === month ? "default" : "outline"}
            size="sm"
            onClick={() => navigate(year, m)}
          >
            {MONTH_NAMES[m - 1]}
          </Button>
        ))}
      </div>

      {/* Category filter */}
      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="border rounded-md px-3 py-1.5 text-sm bg-background w-full sm:w-auto"
      >
        <option value="">Todas las categorías</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* New transaction form */}
      {showForm && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">Nuevo comprobante</h3>
          <TransactionForm
            accounts={accounts}
            categories={categories}
            defaultAccountId={defaultAccountId}
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Transactions */}
      <div className="border rounded-lg divide-y">
        {visibleTransactions.length === 0 && (
          <p className="text-sm text-muted-foreground p-4">No hay transacciones para este período.</p>
        )}
        {visibleTransactions.map((t) => (
          <TransactionRow
            key={t.id}
            transaction={t}
            allTransactions={transactions}
            accounts={accounts}
            categories={categories}
            defaultAccountId={defaultAccountId}
          />
        ))}
      </div>
    </div>
  )
}
