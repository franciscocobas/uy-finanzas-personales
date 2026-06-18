import { getFormData } from "../transacciones/actions"
import { DictationForm } from "./dictation-form"

export const dynamic = "force-dynamic"

export default async function DictarPage() {
  const { accounts, categories, defaultAccountId } = await getFormData()

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Dictar gasto</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Dictá el movimiento en lenguaje natural y Claude lo interpreta. Revisás
          y confirmás antes de guardar.
        </p>
      </div>
      <DictationForm accounts={accounts} categories={categories} defaultAccountId={defaultAccountId} />
    </div>
  )
}
