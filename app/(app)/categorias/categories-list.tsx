"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus, ChevronDown, ChevronRight, RefreshCw } from "lucide-react"
import {
  createCategory, updateCategory, deleteCategory,
  createConcept, updateConcept, deleteConcept, toggleConceptRecurring,
} from "./actions"
import type { Category, Concept, CategoryType } from "@/lib/generated/prisma/client"

type CategoryWithConcepts = Category & { concepts: Concept[] }

const CATEGORY_TYPE_LABELS: Record<string, string> = {
  INCOME: "Ingreso",
  EXPENSE: "Egreso",
}

function CategoryForm({
  defaultName = "",
  defaultType = "EXPENSE",
  onSave,
  onCancel,
}: {
  defaultName?: string
  defaultType?: string
  onSave: (name: string, type: string) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(defaultName)
  const [type, setType] = useState(defaultType)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onSave(name.trim(), type)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center flex-wrap">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre de la categoría"
        className="h-8 text-sm w-48"
      />
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="h-8 text-sm w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CATEGORY_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "..." : "Guardar"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancelar
      </Button>
    </form>
  )
}

function InlineInput({
  defaultValue = "",
  onSave,
  onCancel,
  placeholder,
}: {
  defaultValue?: string
  onSave: (value: string) => Promise<void>
  onCancel: () => void
  placeholder?: string
}) {
  const [value, setValue] = useState(defaultValue)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setLoading(true)
    await onSave(value.trim())
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "..." : "Guardar"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancelar
      </Button>
    </form>
  )
}

function ConceptRow({ concept, categories }: { concept: Concept; categories: CategoryWithConcepts[] }) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(concept.name)
  const [editCategoryId, setEditCategoryId] = useState(concept.categoryId)
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim()) return
    setLoading(true)
    await updateConcept(concept.id, editName.trim(), editCategoryId)
    setLoading(false)
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between py-1.5 pl-4">
      {editing ? (
        <form onSubmit={handleSave} className="flex gap-2 items-center flex-wrap">
          <Input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nombre del concepto"
            className="h-8 text-sm w-40"
          />
          <Select value={editCategoryId} onValueChange={setEditCategoryId}>
            <SelectTrigger className="h-8 text-sm w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={loading}>{loading ? "..." : "Guardar"}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
        </form>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm">{concept.name}</span>
            {concept.recurring && (
              <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">recurrente</span>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${concept.recurring ? "text-primary" : "text-muted-foreground"}`}
              title={concept.recurring ? "Quitar recurrente" : "Marcar como recurrente"}
              onClick={() => toggleConceptRecurring(concept.id, !concept.recurring)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteConcept(concept.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function CategoryRow({ category, categories }: { category: CategoryWithConcepts; categories: CategoryWithConcepts[] }) {
  const [expanded, setExpanded] = useState(category.concepts.length > 0)
  const [editingCategory, setEditingCategory] = useState(false)
  const [addingConcept, setAddingConcept] = useState(false)

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3">
        {editingCategory ? (
          <CategoryForm
            defaultName={category.name}
            defaultType={category.type}
            onSave={async (name, type) => { await updateCategory(category.id, name, type as CategoryType); setEditingCategory(false) }}
            onCancel={() => setEditingCategory(false)}
          />
        ) : (
          <>
            <button
              className="flex items-center gap-2 font-medium text-left flex-1"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {category.name}
              {category.type === "INCOME" ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">Ingreso</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-0">Egreso</Badge>
              )}
              <span className="text-xs text-muted-foreground font-normal">
                {category.concepts.length} conceptos
              </span>
            </button>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCategory(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteCategory(category.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </>
        )}
      </div>

      {expanded && (
        <div className="border-t px-4 py-2 space-y-1">
          {category.concepts.map((concept) => (
            <ConceptRow key={concept.id} concept={concept} categories={categories} />
          ))}
          {addingConcept ? (
            <div className="pt-1 pl-4">
              <InlineInput
                placeholder="Nombre del concepto"
                onSave={async (name) => { await createConcept(name, category.id); setAddingConcept(false) }}
                onCancel={() => setAddingConcept(false)}
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground pl-4"
              onClick={() => setAddingConcept(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Agregar concepto
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function CategoriesList({ categories }: { categories: CategoryWithConcepts[] }) {
  const [addingCategory, setAddingCategory] = useState(false)

  return (
    <div className="space-y-3">
      {categories.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay categorías creadas.</p>
      )}
      <div className="pt-2">
        {addingCategory ? (
          <CategoryForm
            onSave={async (name, type) => { await createCategory(name, type as CategoryType); setAddingCategory(false) }}
            onCancel={() => setAddingCategory(false)}
          />
        ) : (
          <Button variant="outline" onClick={() => setAddingCategory(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva categoría
          </Button>
        )}
      </div>
      {categories.map((category) => (
        <CategoryRow key={category.id} category={category} categories={categories} />
      ))}
    </div>
  )
}
