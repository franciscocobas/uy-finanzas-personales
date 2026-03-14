"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AccountForm } from "./account-form"
import { deleteAccount, setDefaultAccount } from "./actions"
import { Pencil, Trash2, Plus, Star } from "lucide-react"
import type { Account } from "@/lib/generated/prisma/client"

type SerializedAccount = Omit<Account, "balance"> & { balance: number; currentBalance: number }

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  BANK: "Banco",
  CARD: "Tarjeta",
}

export function AccountsList({ accounts }: { accounts: SerializedAccount[] }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SerializedAccount | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  function handleEdit(account: SerializedAccount) {
    setEditing(account)
    setShowForm(false)
    setConfirmingDelete(null)
  }

  function handleDone() {
    setEditing(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="divide-y border rounded-lg">
        {accounts.length === 0 && (
          <p className="text-sm text-muted-foreground p-4">No hay cuentas creadas.</p>
        )}
        {accounts.map((account) => (
          <div key={account.id}>
            <div className={`grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 gap-4 ${!account.active ? "opacity-50" : ""}`}>
              <div>
                <p className="font-medium">{account.name}</p>
                <p className="text-sm text-muted-foreground">
                  {ACCOUNT_TYPE_LABELS[account.type]}
                  {!account.active && " · Inactiva"}
                </p>
              </div>
              <p className="text-sm font-medium tabular-nums text-right">
                Saldo: <span className={account.currentBalance < 0 ? "text-red-600" : ""}>{account.currentBalance.toLocaleString("es-UY", { minimumFractionDigits: 2 })}</span>
              </p>
              <div className="flex items-center gap-1">
                {confirmingDelete === account.id ? (
                  <>
                    <span className="text-sm text-muted-foreground mr-2">¿Confirmás?</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => { deleteAccount(account.id); setConfirmingDelete(null) }}
                    >
                      Eliminar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(null)}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDefaultAccount(account.id)}
                      title={account.isDefault ? "Cuenta predeterminada" : "Marcar como predeterminada"}
                    >
                      <Star className={`h-4 w-4 ${account.isDefault ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmingDelete(account.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            {editing?.id === account.id && (
              <div className="px-4 pb-4">
                <AccountForm account={account} onDone={handleDone} />
              </div>
            )}
          </div>
        ))}
      </div>

      {!editing && (
        <div>
          <Button
            variant="outline"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva cuenta
          </Button>
          {showForm && (
            <AccountForm onDone={handleDone} />
          )}
        </div>
      )}
    </div>
  )
}
