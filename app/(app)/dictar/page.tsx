import { getDictations } from "./actions"
import { DictationForm } from "./dictation-form"

export const dynamic = "force-dynamic"

export default async function DictarPage() {
  const dictations = await getDictations()

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Dictar gasto</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Etapa de prueba: dictá el gasto en lenguaje natural y guardalo. Todavía
          no se crea ninguna transacción — estamos juntando ejemplos reales.
        </p>
      </div>
      <DictationForm dictations={dictations} />
    </div>
  )
}
