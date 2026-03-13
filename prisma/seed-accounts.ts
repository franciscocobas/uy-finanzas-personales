import "dotenv/config"
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const accounts = [
  { name: "Efectivo $",               type: "CASH", balance: 26218 },
  { name: "Banco $",                  type: "BANK", balance: -11685.45 },
  { name: "Tarjeta $",                type: "CARD", balance: 0 },
  { name: "Banco U$D",               type: "BANK", balance: 0 },
  { name: "Ahorro en Sueldo",         type: "BANK", balance: 84936.30 },
  { name: "Ahorro en UI",             type: "BANK", balance: 0 },
  { name: "Plazo fijo",               type: "BANK", balance: 0 },
  { name: "Tarjeta MASTER Recompensa", type: "CARD", balance: -97234.55 },
  { name: "Prex UY",                  type: "CARD", balance: -821.36 },
  { name: "Deuda iPhone",             type: "BANK", balance: -33301 },
] as const

async function main() {
  for (const account of accounts) {
    await prisma.account.create({ data: account })
  }
  console.log(`${accounts.length} cuentas insertadas.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
