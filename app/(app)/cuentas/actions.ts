"use server"

import { prisma } from "@/lib/prisma"
import { AccountType } from "@/lib/generated/prisma/client"
import { revalidatePath } from "next/cache"

export async function getAccounts() {
  const accounts = await prisma.account.findMany({ orderBy: { name: "asc" } })
  return accounts.map((a) => ({ ...a, balance: Number(a.balance) }))
}

export async function createAccount(name: string, type: AccountType, active: boolean) {
  await prisma.account.create({ data: { name, type, active } })
  revalidatePath("/cuentas")
}

export async function updateAccount(id: string, name: string, type: AccountType, active: boolean) {
  await prisma.account.update({ where: { id }, data: { name, type, active } })
  revalidatePath("/cuentas")
}

export async function deleteAccount(id: string) {
  await prisma.account.delete({ where: { id } })
  revalidatePath("/cuentas")
}

export async function setDefaultAccount(id: string) {
  await prisma.account.updateMany({ data: { isDefault: false } })
  await prisma.account.update({ where: { id }, data: { isDefault: true } })
  revalidatePath("/cuentas")
}
