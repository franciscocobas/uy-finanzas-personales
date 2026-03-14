import { ImportForm } from "./import-form"

export default function ImportarPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-2xl font-semibold">Importar transacciones</h2>
      <ImportForm />
    </div>
  )
}
