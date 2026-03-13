import "dotenv/config"
import { PrismaClient, CategoryType } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const categories: { name: string; type: CategoryType }[] = [
  { name: "Sueldos", type: "INCOME" },
  { name: "Honorarios", type: "INCOME" },
  { name: "Rentas", type: "INCOME" },
  { name: "Otros ingresos", type: "INCOME" },
  { name: "Alimentación", type: "EXPENSE" },
  { name: "Vestimenta", type: "EXPENSE" },
  { name: "Esparcimiento", type: "EXPENSE" },
  { name: "Cuidado personal", type: "EXPENSE" },
  { name: "Servicios y tarifas", type: "EXPENSE" },
  { name: "Salud y gastos médicos", type: "EXPENSE" },
  { name: "Educación", type: "EXPENSE" },
  { name: "Vivienda, mejoras y arreglos", type: "EXPENSE" },
  { name: "Transporte, locomoción y vehículos", type: "EXPENSE" },
  { name: "Regalos, donaciones y aportes", type: "EXPENSE" },
  { name: "Gastos laborales", type: "EXPENSE" },
  { name: "Gastos varios", type: "EXPENSE" },
]

async function main() {
  await prisma.category.createMany({
    data: categories,
    skipDuplicates: true,
  })
  console.log(`${categories.length} categorías insertadas.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
