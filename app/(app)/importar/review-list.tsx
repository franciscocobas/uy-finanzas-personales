"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ReviewMovement } from "@/lib/importers/types"

type ResolvedMovement = {
  date: Date
  amount: number
  type: "INCOME" | "EXPENSE"
  description: string
  accountId: string
}
import type { Account, Category, Concept } from "@/lib/generated/prisma/client"
import { bulkCreateTransactions } from "./actions"

type SerializedAccount = Omit<Account, "balance"> & { balance: number }
type CategoryWithConcepts = Category & { concepts: Concept[] }

const TYPE_LABELS = { INCOME: "Ingreso", EXPENSE: "Egreso", TRANSFER: "Transferencia" }
const TYPE_COLORS = {
  INCOME: "bg-green-100 text-green-800 border-0",
  EXPENSE: "bg-red-100 text-red-800 border-0",
  TRANSFER: "bg-blue-100 text-blue-800 border-0",
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("es-UY")
}

function formatAmount(amount: number) {
  return amount.toLocaleString("es-UY", { minimumFractionDigits: 2 })
}

interface ReviewListProps {
  movements: ResolvedMovement[]
  duplicateFlags: boolean[]
  accounts: SerializedAccount[]
  categories: CategoryWithConcepts[]
  onBack: () => void
}

export function ReviewList({ movements, duplicateFlags, accounts, categories, onBack }: ReviewListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [rows, setRows] = useState<ReviewMovement[]>(() =>
    [...movements].sort((a, b) => a.date.getTime() - b.date.getTime()).map((m, i) => ({
      tempId: String(i),
      type: m.type,
      accountId: m.accountId,
      date: m.date,
      amount: m.amount,
      description: m.description,
      conceptId: "",
      toAccountId: "",
      excluded: duplicateFlags[i],
      duplicateWarning: duplicateFlags[i],
    }))
  )

  function update(index: number, changes: Partial<ReviewMovement>) {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, ...changes } : r))
  }

  function getFilteredCategories(type: ReviewMovement["type"]) {
    if (type === "TRANSFER") return []
    return categories.filter((c) => c.type === (type === "INCOME" ? "INCOME" : "EXPENSE") && c.concepts.length > 0)
  }

  const activeRows = rows.filter((r) => !r.excluded)
  const hasDuplicates = activeRows.some((r) => r.duplicateWarning)
  const missingConcept = activeRows.some((r) => r.type !== "TRANSFER" && !r.conceptId)
  const missingToAccount = activeRows.some((r) => r.type === "TRANSFER" && !r.toAccountId)
  const canImport = !hasDuplicates && !missingConcept && !missingToAccount

  async function handleImport() {
    setLoading(true)
    await bulkCreateTransactions(
      activeRows.map((r) => ({
        date: r.date.toISOString(),
        type: r.type,
        amount: r.amount,
        accountId: r.accountId,
        conceptId: r.conceptId,
        description: r.description,
        toAccountId: r.type === "TRANSFER" ? r.toAccountId : undefined,
      }))
    )
    router.push("/transacciones")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activeRows.length} de {rows.length} movimientos seleccionados
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Volver</Button>
          <Button onClick={handleImport} disabled={!canImport || loading}>
            {loading ? "Importando..." : `Importar ${activeRows.length} movimientos`}
          </Button>
        </div>
      </div>

      {hasDuplicates && (
        <p className="text-sm text-amber-600 border border-amber-200 bg-amber-50 rounded-md px-3 py-2">
          ⚠ Hay movimientos con posibles duplicados. Excluílos o confirmá que son nuevos antes de importar.
        </p>
      )}

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={row.tempId}
            className={`border rounded-lg p-4 space-y-3 ${row.excluded ? "opacity-50" : ""} ${row.duplicateWarning && !row.excluded ? "border-amber-400" : ""}`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={TYPE_COLORS[row.type]}>{TYPE_LABELS[row.type]}</Badge>
                <span className="text-sm text-muted-foreground">{formatDate(row.date)}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.amount}
                  onChange={(e) => update(i, { amount: parseFloat(e.target.value) || 0 })}
                  className="w-24 font-medium text-sm border rounded px-2 py-0.5 bg-background"
                />
                <span className="text-xs text-muted-foreground">
                  {accounts.find((a) => a.id === row.accountId)?.name}
                </span>
                {row.duplicateWarning && !row.excluded && (
                  <span className="text-xs text-amber-600">⚠ posible duplicado</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => update(i, { excluded: !row.excluded })}
                className="shrink-0 text-xs"
              >
                {row.excluded ? "Incluir" : "Excluir"}
              </Button>
            </div>

            {!row.excluded && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_auto_1fr]">
                {/* Tipo */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <Select
                    value={row.type}
                    onValueChange={(v) => update(i, { type: v as ReviewMovement["type"], conceptId: "", toAccountId: "" })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">Ingreso</SelectItem>
                      <SelectItem value="EXPENSE">Egreso</SelectItem>
                      <SelectItem value="TRANSFER">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Concepto o cuenta destino */}
                {row.type !== "TRANSFER" ? (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Concepto *</label>
                    <Select value={row.conceptId} onValueChange={(v) => update(i, { conceptId: v })}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Seleccioná" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredCategories(row.type).map((cat) => (
                          <SelectGroup key={cat.id}>
                            <SelectLabel>{cat.name}</SelectLabel>
                            {cat.concepts.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Cuenta destino *</label>
                    <Select value={row.toAccountId} onValueChange={(v) => update(i, { toAccountId: v })}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Seleccioná" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts
                          .filter((a) => a.id !== row.accountId)
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Descripción */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Descripción</label>
                  <Input
                    className="h-8 text-sm"
                    value={row.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onBack}>Volver</Button>
        <Button onClick={handleImport} disabled={!canImport || loading}>
          {loading ? "Importando..." : `Importar ${activeRows.length} movimientos`}
        </Button>
      </div>
    </div>
  )
}
