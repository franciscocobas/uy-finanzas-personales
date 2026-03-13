"use server"

import { prisma } from "@/lib/prisma"
import { CategoryType } from "@/lib/generated/prisma/client"
import { revalidatePath } from "next/cache"

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { concepts: { orderBy: { name: "asc" } } },
  })
}

export async function createCategory(name: string, type: CategoryType) {
  await prisma.category.create({ data: { name, type } })
  revalidatePath("/categorias")
}

export async function updateCategory(id: string, name: string, type: CategoryType) {
  await prisma.category.update({ where: { id }, data: { name, type } })
  revalidatePath("/categorias")
}

export async function deleteCategory(id: string) {
  await prisma.category.delete({ where: { id } })
  revalidatePath("/categorias")
}

export async function createConcept(name: string, categoryId: string) {
  await prisma.concept.create({ data: { name, categoryId } })
  revalidatePath("/categorias")
}

export async function updateConcept(id: string, name: string) {
  await prisma.concept.update({ where: { id }, data: { name } })
  revalidatePath("/categorias")
}

export async function deleteConcept(id: string) {
  await prisma.concept.delete({ where: { id } })
  revalidatePath("/categorias")
}
