"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2 } from "lucide-react"
import { TransactionForm } from "./transaction-form"
import { deleteTransaction } from "./actions"
import type { Account, Category, Concept, Transaction } from "@/lib/generated/prisma/client"

export type SerializedAccount = Omit<Account, "balance"> & { balance: number }
export type CategoryWithConcepts = Category & { concepts: Concept[] }
export type SerializedTransaction = Omit<Transaction, "amount"> & {
  amount: number
  concept: (Concept & { category: Category }) | null
  account: SerializedAccount | null
}

export const TYPE_LABELS = { INCOME: "Ingreso", EXPENSE: "Egreso", TRANSFER: "Transferencia" }
export const TYPE_COLORS = {
  INCOME: "bg-green-100 text-green-800 border-0",
  EXPENSE: "bg-red-100 text-red-800 border-0",
  TRANSFER: "bg-blue-100 text-blue-800 border-0",
}
export const TYPE_DOT_COLORS = {
  INCOME: "bg-green-100",
  EXPENSE: "bg-red-100",
  TRANSFER: "bg-blue-100",
}

export function formatAmount(amount: number) {
  return amount.toLocaleString("es-UY", { minimumFractionDigits: 2 })
}

export function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("es-UY", { timeZone: "UTC" })
}

function buildEditingProps(t: SerializedTransaction, allTransactions: SerializedTransaction[]) {
  if (t.type !== "TRANSFER") {
    return { id: t.id, type: t.type, date: t.date, amount: t.amount, description: t.description, conceptId: t.conceptId, accountId: t.accountId, transferId: null }
  }
  const partner = allTransactions.find((o) => o.transferId && o.transferId === t.transferId && o.id !== t.id)
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

interface TransactionRowProps {
  transaction: SerializedTransaction
  allTransactions: SerializedTransaction[]
  accounts: SerializedAccount[]
  categories: CategoryWithConcepts[]
  defaultAccountId: string | null
}

export function TransactionRow({ transaction: t, allTransactions, accounts, categories, defaultAccountId }: TransactionRowProps) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <div>
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
          <Button variant="ghost" size="icon" onClick={() => { setEditing((v) => !v); setConfirmingDelete(false) }}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {editing && (
        <div className="px-4 pb-4 border-t">
          <TransactionForm
            accounts={accounts}
            categories={categories}
            defaultAccountId={defaultAccountId}
            editing={buildEditingProps(t, allTransactions)}
            onDone={() => setEditing(false)}
          />
          <div className="mt-4 pt-4 border-t">
            {confirmingDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">¿Confirmás la eliminación?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await deleteTransaction(t.id)
                    setEditing(false)
                    setConfirmingDelete(false)
                  }}
                >
                  Eliminar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
