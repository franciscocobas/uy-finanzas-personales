"use client"

import { useState, useTransition } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { askQuestion } from "./actions"
import type { AskResult } from "@/lib/preguntar"

const EXAMPLES = [
  "¿Cuánto gasté en combustible este año?",
  "¿Cuándo fue el último service del auto y cuánto salió?",
  "¿En qué categoría gasté más el mes pasado?",
]

export function QuestionForm() {
  const [question, setQuestion] = useState("")
  const [asked, setAsked] = useState("")
  const [result, setResult] = useState<AskResult | null>(null)
  const [isAsking, startAsking] = useTransition()

  function handleAsk(text = question) {
    const trimmed = text.trim()
    if (!trimmed) return
    setQuestion(trimmed)
    setResult(null)
    startAsking(async () => {
      setAsked(trimmed)
      setResult(await askQuestion(trimmed))
    })
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
    </div>
  )
}
