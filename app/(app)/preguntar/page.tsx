import { QuestionForm } from "./question-form"

// El loop con Claude puede hacer varias consultas antes de responder
export const maxDuration = 120

export default function PreguntarPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Preguntar</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Hacé una pregunta sobre tus finanzas y Claude consulta la base (solo lectura) para responderte.
        </p>
      </div>
      <QuestionForm />
    </div>
  )
}
