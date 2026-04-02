"use client"

import { useState, useRef } from "react"

export function DueDateNote({
  conceptId,
  note,
  onSave,
}: {
  conceptId: string
  note: string | null
  onSave: (id: string, note: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(note ?? "")
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setValue(note ?? "")
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function save() {
    setEditing(false)
    await onSave(conceptId, value.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save()
    if (e.key === "Escape") setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        placeholder="23/04"
        className="w-16 rounded border border-input bg-background px-1.5 py-0.5 text-xs outline-none"
      />
    )
  }

  if (note) {
    const warning = (() => {
      const match = note.match(/^(\d{1,2})\/(\d{1,2})$/)
      if (!match) return false
      const now = new Date()
      const due = new Date(now.getFullYear(), parseInt(match[2]) - 1, parseInt(match[1]))
      const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return days <= 3
    })()

    return (
      <button onClick={startEditing} className="text-xs text-red-500 hover:text-red-600">
        {warning && "⚠️ "}vence <strong>{note}</strong>
      </button>
    )
  }

  return (
    <button onClick={startEditing} className="text-xs text-muted-foreground/50 hover:text-muted-foreground">
      + venc.
    </button>
  )
}
