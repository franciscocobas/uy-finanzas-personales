import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env" })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const transactions = await prisma.transaction.deleteMany()
  const concepts = await prisma.concept.deleteMany()
  const categories = await prisma.category.deleteMany()
  const accounts = await prisma.account.deleteMany()
  console.log(`Eliminados: ${transactions.count} transacciones, ${concepts.count} conceptos, ${categories.count} categorías, ${accounts.count} cuentas`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
