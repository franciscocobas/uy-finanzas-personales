"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { askQuestion as runQuestion, type AskResult } from "@/lib/preguntar"

export type SavedQuestionItem = {
  id: string
  question: string
  createdAt: string
  result: AskResult
}

export async function askQuestion(question: string): Promise<SavedQuestionItem | { error: string }> {
  const session = await auth()
  if (!session?.user) return { error: "No autorizado." }

  const result = await runQuestion(question)
  const saved = await prisma.savedQuestion.create({
    data: {
      question,
      answer: result.ok ? result.answer : null,
      error: result.ok ? null : result.error,
      queries: result.queries,
      costUsd: result.costUsd,
    },
  })
  return { id: saved.id, question, createdAt: saved.createdAt.toISOString(), result }
}

export async function deleteQuestion(id: string): Promise<void> {
  const session = await auth()
  if (!session?.user) return
  await prisma.savedQuestion.delete({ where: { id } })
}
