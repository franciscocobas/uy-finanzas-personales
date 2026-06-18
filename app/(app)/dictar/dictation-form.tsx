"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, Trash2, X } from "lucide-react"
import { saveDictation, deleteDictation } from "./actions"

type Dictation = {
  id: string
  text: string
  userAgent: string | null
  createdAt: Date
}

export function DictationForm({ dictations }: { dictations: Dictation[] }) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [isSaving, startSaving] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleSave() {
    const trimmed = text.trim()
    if (!trimmed) return
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : undefined
    startSaving(async () => {
      await saveDictation(trimmed, userAgent)
      setText("")
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    startSaving(async () => {
      await deleteDictation(id)
      setDeletingId(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="text-muted-foreground flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm">
          <Mic className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Tocá el campo y usá el micrófono del teclado del iPhone para dictar.
            Ej: <em>&ldquo;Añadí un gasto de 45 pesos hoy con la cuenta del banco&rdquo;</em>.
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

        <Button onClick={handleSave} disabled={isSaving || !text.trim()} className="w-full">
          {isSaving ? "Guardando…" : "Guardar"}
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">
          Guardadas ({dictations.length})
        </h3>
        {dictations.length === 0 ? (
          <p className="text-muted-foreground text-sm">Todavía no hay nada guardado.</p>
        ) : (
          <ul className="space-y-2">
            {dictations.map((d) => (
              <li key={d.id}>
                <Card>
                  <CardContent className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 space-y-1">
                      <p className="break-words">{d.text}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(d.createdAt).toLocaleString("es-UY", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(d.id)}
                      disabled={deletingId === d.id}
                      aria-label="Borrar"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
