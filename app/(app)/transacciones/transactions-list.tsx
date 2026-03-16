"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Pencil } from "lucide-react"
import { TransactionForm } from "./transaction-form"
import { deleteTransaction } from "./actions"
import type { Account, Category, Concept, Transaction } from "@/lib/generated/prisma/client"

type SerializedAccount = Omit<Account, "balance"> & { balance: number }
type CategoryWithConcepts = Category & { concepts: Concept[] }
type SerializedTransaction = Omit<Transaction, "amount"> & {
  amount: number
  concept: (Concept & { category: Category }) | null
  account: SerializedAccount | null
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const TYPE_LABELS = { INCOME: "Ingreso", EXPENSE: "Egreso", TRANSFER: "Transferencia" }
const TYPE_COLORS = {
  INCOME: "bg-green-100 text-green-800 border-0",
  EXPENSE: "bg-red-100 text-red-800 border-0",
  TRANSFER: "bg-blue-100 text-blue-800 border-0",
}

const TYPE_DOT_COLORS = {
  INCOME: "bg-green-100",
  EXPENSE: "bg-red-100",
  TRANSFER: "bg-blue-100",
}

function formatAmount(amount: unknown) {
  return Number(amount).toLocaleString("es-UY", { minimumFractionDigits: 2 })
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("es-UY", { timeZone: "UTC" })
}

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState("")
  const router = useRouter()

  const visibleTransactions = categoryFilter
    ? transactions.filter((t) => t.concept?.category.id === categoryFilter)
    : transactions

  function navigate(y: number, m: number) {
    router.push(`/transacciones?year=${y}&month=${m}`)
  }

  function buildEditingProps(t: SerializedTransaction) {
    if (t.type !== "TRANSFER") {
      return { id: t.id, type: t.type, date: t.date, amount: t.amount, description: t.description, conceptId: t.conceptId, accountId: t.accountId, transferId: null }
    }
    // For transfers, find the partner record to get both accounts
    const partner = transactions.find((o) => o.transferId && o.transferId === t.transferId && o.id !== t.id)
    // Current record is "from" (outgoing → description starts with →) or "to"
    const isOutgoing = t.description?.startsWith("→")
    return {
      id: t.id,
      type: t.type,
      date: t.date,
      amount: t.amount,
      description: t.description,
      conceptId: null,
      accountId: null,
      transferId: t.transferId ?? null,
      fromAccountId: isOutgoing ? t.accountId ?? undefined : partner?.accountId ?? undefined,
      toAccountId: isOutgoing ? partner?.accountId ?? undefined : t.accountId ?? undefined,
    }
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

        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo comprobante
        </Button>
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
        onChange={(e) => { setCategoryFilter(e.target.value); setEditingId(null); setConfirmingDelete(null) }}
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
          <div key={t.id}>
            <div className="flex items-center justify-between px-4 py-3 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`sm:hidden w-3 h-3 rounded-full shrink-0 ${TYPE_DOT_COLORS[t.type]}`} />
                <Badge className={`hidden sm:inline-flex ${TYPE_COLORS[t.type]}`}>{TYPE_LABELS[t.type]}</Badge>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {t.type === "TRANSFER"
                      ? <span className="font-normal">{t.description ?? "—"}</span>
                      : <>{t.concept?.name ?? "—"}{t.description && <span className="font-normal text-muted-foreground"> — {t.description}</span>}</>
                    }
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.concept?.category.name}
                    {t.account && <> · <strong>{t.account.name}</strong></>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="font-medium">{formatAmount(t.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setEditingId(editingId === t.id ? null : t.id); setConfirmingDelete(null) }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {editingId === t.id && (
              <div className="px-4 pb-4 border-t">
                <TransactionForm
                  accounts={accounts}
                  categories={categories}
                  defaultAccountId={defaultAccountId}
                  editing={buildEditingProps(t)}
                  onDone={() => setEditingId(null)}
                />
                <div className="mt-4 pt-4 border-t">
                  {confirmingDelete === t.id ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">¿Confirmás la eliminación?</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          await deleteTransaction(t.id)
                          setEditingId(null)
                          setConfirmingDelete(null)
                        }}
                      >
                        Eliminar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(null)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmingDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
