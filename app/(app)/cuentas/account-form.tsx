"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { createAccount, updateAccount } from "./actions"
import type { Account, AccountType } from "@/lib/generated/prisma/client"

type SerializedAccount = Omit<Account, "balance"> & { balance: number }

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  BANK: "Banco",
  CARD: "Tarjeta",
}

interface AccountFormProps {
  account?: SerializedAccount
  onDone: () => void
}

export function AccountForm({ account, onDone }: AccountFormProps) {
  const [name, setName] = useState(account?.name ?? "")
  const [type, setType] = useState<AccountType>(account?.type ?? "CASH")
  const [active, setActive] = useState(account?.active ?? true)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    if (account) {
      await updateAccount(account.id, name, type, active)
    } else {
      await createAccount(name, type, active)
    }
    setLoading(false)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Cuenta corriente"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="active" checked={active} onCheckedChange={setActive} />
        <Label htmlFor="active">Cuenta activa</Label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : account ? "Guardar cambios" : "Crear cuenta"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
