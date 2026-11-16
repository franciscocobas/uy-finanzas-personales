import { prisma } from "@/lib/prisma"
import { QuestionForm } from "./question-form"
import type { SavedQuestionItem } from "./actions"

// El loop con Claude puede hacer varias consultas antes de responder
export const maxDuration = 120
// El historial se lee de la base en cada visita
export const dynamic = "force-dynamic"

export default async function PreguntarPage() {
  const rows = await prisma.savedQuestion.findMany({ orderBy: { createdAt: "desc" } })
  const history: SavedQuestionItem[] = rows.map((r) => ({
    id: r.id,
    question: r.question,
    createdAt: r.createdAt.toISOString(),
    result:
      r.answer !== null
        ? { ok: true, answer: r.answer, queries: r.queries, costUsd: r.costUsd }
        : { ok: false, error: r.error ?? "Sin respuesta.", queries: r.queries, costUsd: r.costUsd },
  }))

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Preguntar</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Hacé una pregunta sobre tus finanzas y Claude consulta la base (solo lectura) para responderte.
        </p>
      </div>
      <QuestionForm initialHistory={history} />
    </div>
  )
}
