"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getDictations() {
  return prisma.expenseDictation.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  })
}

export async function saveDictation(text: string, userAgent?: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  await prisma.expenseDictation.create({
    data: { text: trimmed, userAgent: userAgent || null },
  })
  revalidatePath("/dictar")
}

export async function deleteDictation(id: string) {
  await prisma.expenseDictation.delete({ where: { id } })
  revalidatePath("/dictar")
}
