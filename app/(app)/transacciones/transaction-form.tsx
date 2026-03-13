"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createTransaction } from "./actions"
import type { Account, Category, Concept } from "@/lib/generated/prisma/client"

type CategoryWithConcepts = Category & { concepts: Concept[] }

const TRANSACTION_TYPE_LABELS = {
  INCOME: "Ingreso",
  EXPENSE: "Egreso",
  TRANSFER: "Transferencia",
}

interface TransactionFormProps {
  accounts: Account[]
  categories: CategoryWithConcepts[]
  defaultAccountId: string | null
  onDone: () => void
}

export function TransactionForm({ accounts, categories, defaultAccountId, onDone }: TransactionFormProps) {
  const today = new Date().toISOString().split("T")[0]

  const [type, setType] = useState("EXPENSE")
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [conceptId, setConceptId] = useState("")
  const [accountId, setAccountId] = useState(defaultAccountId ?? "")
  const [fromAccountId, setFromAccountId] = useState("")
  const [toAccountId, setToAccountId] = useState("")
  const [loading, setLoading] = useState(false)

  const filteredCategories = useMemo(() => {
    if (type === "TRANSFER") return []
    const categoryType = type === "INCOME" ? "INCOME" : "EXPENSE"
    return categories.filter((c) => c.type === categoryType && c.concepts.length > 0)
  }, [type, categories])

  function handleTypeChange(value: string) {
    setType(value)
    setConceptId("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    await createTransaction({
      date,
      type: type as any,
      amount: parseFloat(amount),
      description: description || undefined,
      conceptId,
      accountId: type !== "TRANSFER" ? accountId : undefined,
      fromAccountId: type === "TRANSFER" ? fromAccountId : undefined,
      toAccountId: type === "TRANSFER" ? toAccountId : undefined,
    })

    setLoading(false)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {type !== "TRANSFER" && (
          <div className="space-y-2">
            <Label>Cuenta</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Importe</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      {type !== "TRANSFER" && (
        <>
          <div className="space-y-2">
            <Label>Concepto</Label>
            <Select value={conceptId} onValueChange={setConceptId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un concepto" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((category) => (
                  <SelectGroup key={category.id}>
                    <SelectLabel>{category.name}</SelectLabel>
                    {category.concepts.map((concept) => (
                      <SelectItem key={concept.id} value={concept.id}>
                        {concept.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

        </>
      )}

      {type === "TRANSFER" && (
        <>
          <div className="space-y-2">
            <Label>Cuenta origen</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná cuenta origen" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cuenta destino</Label>
            <Select value={toAccountId} onValueChange={setToAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná cuenta destino" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Nota adicional"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar comprobante"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
