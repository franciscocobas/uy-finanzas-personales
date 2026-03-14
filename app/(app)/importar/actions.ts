"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number)
  return new Date(year, month - 1, day)
}

export async function getImportFormData() {
  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({ where: { active: true }, orderBy: { name: "asc" } })
      .then((a) => a.map((acc) => ({ ...acc, balance: Number(acc.balance) }))),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { concepts: { orderBy: { name: "asc" } } },
    }),
  ])
  return { accounts, categories }
}

export async function checkDuplicates(
  movements: { date: string; amount: number; accountId: string }[]
): Promise<boolean[]> {
  return Promise.all(
    movements.map(async ({ date, amount, accountId }) => {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)

      const existing = await prisma.transaction.findFirst({
        where: {
          accountId,
          amount,
          date: { gte: start, lte: end },
        },
      })
      return existing !== null
    })
  )
}

interface MovementToCreate {
  date: string
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  amount: number
  accountId: string
  conceptId: string
  description: string
  toAccountId?: string
}

export async function bulkCreateTransactions(movements: MovementToCreate[]) {
  for (const m of movements) {
    if (m.type === "TRANSFER") {
      const toAccount = await prisma.account.findUnique({
        where: { id: m.toAccountId! },
        select: { name: true },
      })
      const fromAccount = await prisma.account.findUnique({
        where: { id: m.accountId },
        select: { name: true },
      })
      const transferId = randomUUID()
      await prisma.$transaction([
        prisma.transaction.create({
          data: {
            date: parseLocalDate(m.date),
            type: "TRANSFER",
            amount: m.amount,
            description: `→ ${toAccount!.name}`,
            accountId: m.accountId,
            transferId,
          },
        }),
        prisma.transaction.create({
          data: {
            date: parseLocalDate(m.date),
            type: "TRANSFER",
            amount: m.amount,
            description: `← ${fromAccount!.name}`,
            accountId: m.toAccountId!,
            transferId,
          },
        }),
      ])
    } else {
      await prisma.transaction.create({
        data: {
          date: parseLocalDate(m.date),
          type: m.type,
          amount: m.amount,
          accountId: m.accountId,
          conceptId: m.conceptId || undefined,
          description: m.description || undefined,
        },
      })
    }
  }

  revalidatePath("/transacciones")
}
