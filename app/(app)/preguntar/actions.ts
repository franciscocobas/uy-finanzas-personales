"use server"

import { auth } from "@/auth"
import { askQuestion as runQuestion, type AskResult } from "@/lib/preguntar"

export async function askQuestion(question: string): Promise<AskResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: "No autorizado.", queries: [] }
  return runQuestion(question)
}
