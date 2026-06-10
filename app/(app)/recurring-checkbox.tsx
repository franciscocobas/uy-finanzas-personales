"use client"

import { useTransition } from "react"

interface Props {
  conceptId: string
  year: number
  month: number
  completed: boolean
  onToggle: (conceptId: string, year: number, month: number, completed: boolean) => Promise<void>
}

export function RecurringCheckbox({ conceptId, year, month, completed, onToggle }: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => onToggle(conceptId, year, month, completed))}
      className="text-lg disabled:opacity-50"
    >
      {completed ? "✅" : "⬜"}
    </button>
  )
}
