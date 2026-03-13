import { getCategories } from "./actions"
import { CategoriesList } from "./categories-list"

export default async function CategoriasPage() {
  const categories = await getCategories()

  return (
    <div className="max-w-xl space-y-6">
      <h2 className="text-2xl font-semibold">Categorías y Conceptos</h2>
      <CategoriesList categories={categories} />
    </div>
  )
}
