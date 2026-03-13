"use server"

import { prisma } from "@/lib/prisma"
import { TransactionType } from "@/lib/generated/prisma/client"
import { revalidatePath } from "next/cache"

export async function getTransactions() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "desc" },
    include: {
      concept: { include: { category: true } },
      account: true,
      fromAccount: true,
      toAccount: true,
    },
  })
  const serializeAccount = (a: typeof transactions[0]["account"]) =>
    a ? { ...a, balance: Number(a.balance) } : null

  return transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
    account: serializeAccount(t.account),
    fromAccount: serializeAccount(t.fromAccount),
    toAccount: serializeAccount(t.toAccount),
  }))
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
  conceptId: string
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
}) {
  await prisma.transaction.create({
    data: {
      ...data,
      date: new Date(data.date),
    },
  })
  revalidatePath("/transacciones")
}

export async function deleteTransaction(id: string) {
  await prisma.transaction.delete({ where: { id } })
  revalidatePath("/transacciones")
}
