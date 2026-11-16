"use client"

import { useState, useTransition } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Trash2, X } from "lucide-react"
import { askQuestion, deleteQuestion, type SavedQuestionItem } from "./actions"
import type { AskResult } from "@/lib/preguntar"

const EXAMPLES = [
  "¿Cuánto gasté en combustible este año?",
  "¿Cuándo fue el último service del auto y cuánto salió?",
  "¿En qué categoría gasté más el mes pasado?",
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-UY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatCost(costUsd: number) {
  return `US$${costUsd.toFixed(costUsd < 0.01 ? 4 : 2)}`
}

export function QuestionForm({ initialHistory }: { initialHistory: SavedQuestionItem[] }) {
  const [question, setQuestion] = useState("")
  const [asked, setAsked] = useState("")
  const [result, setResult] = useState<AskResult | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState(initialHistory)
  const [isAsking, startAsking] = useTransition()

  function handleAsk(text = question) {
    const trimmed = text.trim()
    if (!trimmed) return
    setQuestion(trimmed)
    setResult(null)
    setSelectedId(null)
    startAsking(async () => {
      setAsked(trimmed)
      const saved = await askQuestion(trimmed)
      if ("error" in saved) {
        setResult({ ok: false, error: saved.error, queries: [], costUsd: 0 })
        return
      }
      setResult(saved.result)
      setSelectedId(saved.id)
      setHistory((h) => [saved, ...h])
    })
  }

  function showSaved(item: SavedQuestionItem) {
    setAsked(item.question)
    setResult(item.result)
    setSelectedId(item.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleDelete(id: string) {
    setHistory((h) => h.filter((item) => item.id !== id))
    if (selectedId === id) {
      setResult(null)
      setSelectedId(null)
    }
    await deleteQuestion(id)
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleAsk()
            }
          }}
          rows={3}
          placeholder="Ej: ¿cuánto me salió la patente en 2026?"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border bg-transparent py-2 pr-10 pl-3 text-base shadow-xs transition-all outline-none focus-visible:ring-3"
        />
        {question && (
          <button
            type="button"
            onClick={() => setQuestion("")}
            aria-label="Borrar texto"
            className="text-muted-foreground hover:text-foreground hover:bg-accent absolute top-2 right-2 rounded-md p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Button onClick={() => handleAsk()} disabled={isAsking || !question.trim()} className="w-full">
        {isAsking ? "Consultando…" : "Preguntar"}
      </Button>

      {!result && !isAsking && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => handleAsk(ex)}
              className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-full border px-3 py-1 text-xs transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {isAsking && (
        <p className="text-muted-foreground text-sm">Claude está consultando la base, puede tardar unos segundos…</p>
      )}

      {result && (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">
            <em>&ldquo;{asked}&rdquo;</em>
          </p>

          {result.ok ? (
            <div className="space-y-3 text-sm leading-relaxed [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc [&_table]:w-full [&_td]:border-b [&_td]:py-1 [&_td]:pr-3 [&_th]:border-b [&_th]:py-1 [&_th]:pr-3 [&_th]:text-left [&_th]:font-medium">
              <div className="overflow-x-auto space-y-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.answer}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <p className="text-destructive text-sm">{result.error}</p>
          )}

          {result.costUsd > 0 && (
            <p className="text-muted-foreground text-xs">
              Esta pregunta costó {formatCost(result.costUsd)}
            </p>
          )}

          {result.queries.length > 0 && (
            <details className="text-muted-foreground text-xs">
              <summary className="cursor-pointer">
                {result.queries.length} consulta{result.queries.length > 1 ? "s" : ""} SQL
              </summary>
              <div className="mt-2 space-y-2">
                {result.queries.map((q, i) => (
                  <pre key={i} className="bg-muted overflow-x-auto rounded-md p-2 whitespace-pre-wrap break-all">
                    {q}
                  </pre>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-medium">Historial</h3>
          <ul className="divide-y rounded-lg border">
            {history.map((item) => (
              <li key={item.id} className={`flex items-start gap-2 ${item.id === selectedId ? "bg-accent" : ""}`}>
                <button
                  type="button"
                  onClick={() => showSaved(item)}
                  className="hover:bg-accent min-w-0 flex-1 px-3 py-2 text-left transition-colors"
                >
                  <p className="text-sm">{item.question}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {formatDate(item.createdAt)}
                    {item.result.costUsd > 0 && ` · ${formatCost(item.result.costUsd)}`}
                    {!item.result.ok && " · con error"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  aria-label="Borrar del historial"
                  className="text-muted-foreground hover:text-destructive hover:bg-accent m-1 rounded-md p-1.5 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
