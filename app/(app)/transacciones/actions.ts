"use server"

import { prisma } from "@/lib/prisma"
import { TransactionType } from "@/lib/generated/prisma/client"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export async function getTransactions(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1)

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: startDate, lt: endDate } },
    orderBy: { date: "desc" },
    include: {
      concept: { include: { category: true } },
      account: true,
    },
  })

  const serializeAccount = (a: typeof transactions[0]["account"]) =>
    a ? { ...a, balance: Number(a.balance) } : null

  return transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
    account: serializeAccount(t.account),
  }))
}

export async function getAvailableMonths(year: number): Promise<number[]> {
  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
    },
    select: { date: true },
  })
  const months = [...new Set(transactions.map((t) => t.date.getMonth() + 1))]
  return months.sort((a, b) => a - b)
}

export async function getAvailableYears(): Promise<number[]> {
  const transactions = await prisma.transaction.findMany({
    select: { date: true },
  })
  const years = [...new Set(transactions.map((t) => t.date.getFullYear()))]
  return years.sort((a, b) => b - a)
}

export async function getFormData() {
  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({ orderBy: { name: "asc" }, where: { active: true } }).then((a) => a.map((acc) => ({ ...acc, balance: Number(acc.balance) }))),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { concepts: { orderBy: { name: "asc" } } },
    }),
  ])
  const defaultAccountId = accounts.find((a) => a.isDefault)?.id ?? null
  return { accounts, categories, defaultAccountId }
}

export async function createTransaction(data: {
  date: string
  type: TransactionType
  amount: number
  description?: string
  conceptId?: string
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
}) {
  if (data.type === "TRANSFER") {
    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findUnique({ where: { id: data.fromAccountId! }, select: { name: true } }),
      prisma.account.findUnique({ where: { id: data.toAccountId! }, select: { name: true } }),
    ])
    const transferId = randomUUID()
    const baseDescription = data.description ? ` · ${data.description}` : ""
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          date: parseLocalDate(data.date),
          type: "TRANSFER",
          amount: data.amount,
          description: `→ ${toAccount!.name}${baseDescription}`,
          accountId: data.fromAccountId!,
          transferId,
        },
      }),
      prisma.transaction.create({
        data: {
          date: parseLocalDate(data.date),
          type: "TRANSFER",
          amount: data.amount,
          description: `← ${fromAccount!.name}${baseDescription}`,
          accountId: data.toAccountId!,
          transferId,
        },
      }),
    ])
  } else {
    await prisma.transaction.create({
      data: {
        date: parseLocalDate(data.date),
        type: data.type,
        amount: data.amount,
        description: data.description,
        conceptId: data.conceptId,
        accountId: data.accountId!,
      },
    })
  }
  revalidatePath("/transacciones")
}

export async function updateTransaction(
  id: string,
  data: {
    date: string
    amount: number
    description?: string
    conceptId?: string
    accountId?: string
    fromAccountId?: string
    toAccountId?: string
  }
) {
  const existing = await prisma.transaction.findUnique({ where: { id }, select: { type: true, transferId: true } })
  if (!existing) return

  if (existing.type === "TRANSFER" && existing.transferId) {
    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findUnique({ where: { id: data.fromAccountId! }, select: { name: true } }),
      prisma.account.findUnique({ where: { id: data.toAccountId! }, select: { name: true } }),
    ])
    const baseDescription = data.description ? ` · ${data.description}` : ""
    const linked = await prisma.transaction.findMany({ where: { transferId: existing.transferId } })
    const other = linked.find((t) => t.id !== id)!

    await prisma.$transaction([
      prisma.transaction.update({
        where: { id },
        data: {
          date: parseLocalDate(data.date),
          amount: data.amount,
          accountId: data.fromAccountId!,
          description: `→ ${toAccount!.name}${baseDescription}`,
        },
      }),
      prisma.transaction.update({
        where: { id: other.id },
        data: {
          date: parseLocalDate(data.date),
          amount: data.amount,
          accountId: data.toAccountId!,
          description: `← ${fromAccount!.name}${baseDescription}`,
        },
      }),
    ])
  } else {
    await prisma.transaction.update({
      where: { id },
      data: {
        date: parseLocalDate(data.date),
        amount: data.amount,
        description: data.description,
        conceptId: data.conceptId,
        accountId: data.accountId!,
      },
    })
  }
  revalidatePath("/transacciones")
}

export async function deleteTransaction(id: string) {
  const t = await prisma.transaction.findUnique({ where: { id }, select: { transferId: true } })
  if (t?.transferId) {
    await prisma.transaction.deleteMany({ where: { transferId: t.transferId } })
  } else {
    await prisma.transaction.delete({ where: { id } })
  }
  revalidatePath("/transacciones")
}
