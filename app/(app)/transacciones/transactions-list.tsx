"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"
import { TransactionForm } from "./transaction-form"
import { deleteTransaction } from "./actions"
import type { Account, Category, Concept, Transaction } from "@/lib/generated/prisma/client"

type CategoryWithConcepts = Category & { concepts: Concept[] }
type TransactionWithRelations = Transaction & {
  concept: Concept & { category: Category }
  account: Account | null
  fromAccount: Account | null
  toAccount: Account | null
}

const TYPE_LABELS = {
  INCOME: "Ingreso",
  EXPENSE: "Egreso",
  TRANSFER: "Transferencia",
}

const TYPE_COLORS = {
  INCOME: "bg-green-100 text-green-800 border-0",
  EXPENSE: "bg-red-100 text-red-800 border-0",
  TRANSFER: "bg-blue-100 text-blue-800 border-0",
}

function formatAmount(amount: unknown) {
  return Number(amount).toLocaleString("es-UY", { minimumFractionDigits: 2 })
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("es-UY")
}

interface TransactionsListProps {
  transactions: TransactionWithRelations[]
  accounts: Account[]
  categories: CategoryWithConcepts[]
  defaultAccountId: string | null
}

export function TransactionsList({ transactions, accounts, categories, defaultAccountId }: TransactionsListProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo comprobante
        </Button>
      </div>

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

      <div className="border rounded-lg divide-y">
        {transactions.length === 0 && (
          <p className="text-sm text-muted-foreground p-4">No hay transacciones registradas.</p>
        )}
        {transactions.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {t.type === "INCOME" ? (
                <Badge className={TYPE_COLORS.INCOME}>{TYPE_LABELS.INCOME}</Badge>
              ) : t.type === "EXPENSE" ? (
                <Badge className={TYPE_COLORS.EXPENSE}>{TYPE_LABELS.EXPENSE}</Badge>
              ) : (
                <Badge className={TYPE_COLORS.TRANSFER}>{TYPE_LABELS.TRANSFER}</Badge>
              )}
              <div className="min-w-0">
                <p className="font-medium truncate">{t.concept.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {t.concept.category.name}
                  {t.account && ` · ${t.account.name}`}
                  {t.fromAccount && t.toAccount && ` · ${t.fromAccount.name} → ${t.toAccount.name}`}
                  {t.description && ` · ${t.description}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="font-medium">{formatAmount(t.amount)}</p>
                <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteTransaction(t.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
