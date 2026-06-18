"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Mic, X } from "lucide-react"
import { parseDictation, type ParsedDictation } from "./actions"
import { TransactionForm } from "../transacciones/transaction-form"
import type { Account, Category, Concept } from "@/lib/generated/prisma/client"

type SerializedAccount = Omit<Account, "balance"> & { balance: number }
type CategoryWithConcepts = Category & { concepts: Concept[] }

interface Props {
  accounts: SerializedAccount[]
  categories: CategoryWithConcepts[]
  defaultAccountId: string | null
}

export function DictationForm({ accounts, categories, defaultAccountId }: Props) {
  const [text, setText] = useState("")
  const [isParsing, startParsing] = useTransition()
  const [parsed, setParsed] = useState<ParsedDictation | null>(null)
  const [dictado, setDictado] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleProcess() {
    const trimmed = text.trim()
    if (!trimmed) return
    setError(null)
    startParsing(async () => {
      const res = await parseDictation(trimmed)
      if (res.ok) {
        setParsed(res.parsed)
        setDictado(trimmed)
      } else {
        setError(res.error)
      }
    })
  }

  function reset() {
    setParsed(null)
    setText("")
    setDictado("")
    setError(null)
  }

  if (parsed) {
    const initial = {
      type: parsed.type,
      date: parsed.date,
      amount: parsed.amount != null ? String(parsed.amount).replace(".", ",") : "",
      conceptId: parsed.conceptId ?? undefined,
      accountId: parsed.accountId ?? undefined,
      description: parsed.description ?? undefined,
    }

    return (
      <div className="space-y-4">
        <div className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
          <span>
            Dictado: <em>&ldquo;{dictado}&rdquo;</em>
          </span>
          {parsed.conceptId == null && (
            <p className="text-foreground mt-2">
              ⚠️ No reconocí el concepto — elegilo abajo antes de guardar.
            </p>
          )}
          {parsed.amount == null && (
            <p className="text-foreground mt-2">
              ⚠️ No reconocí el importe — completalo abajo antes de guardar.
            </p>
          )}
        </div>
        <TransactionForm
          accounts={accounts}
          categories={categories}
          defaultAccountId={defaultAccountId}
          initial={initial}
          onDone={reset}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm">
        <Mic className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Tocá el campo y usá el micrófono del teclado para dictar. Ej:{" "}
          <em>&ldquo;Agregá un gasto de 45 pesos en alimentación con la cuenta de efectivo&rdquo;</em>.
        </span>
      </div>

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Dictá o escribí el gasto acá…"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border bg-transparent py-2 pr-10 pl-3 text-base shadow-xs transition-all outline-none focus-visible:ring-3"
        />
        {text && (
          <button
            type="button"
            onClick={() => setText("")}
            aria-label="Borrar texto"
            className="text-muted-foreground hover:text-foreground hover:bg-accent absolute top-2 right-2 rounded-md p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button onClick={handleProcess} disabled={isParsing || !text.trim()} className="w-full">
        {isParsing ? "Procesando…" : "Procesar"}
      </Button>
    </div>
  )
}
