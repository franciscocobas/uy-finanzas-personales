import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env" })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const esparcimiento = await prisma.concept.findFirst({ where: { name: "Esparcimiento" } })
  const recreacion = await prisma.concept.findFirst({ where: { name: "Recreación" } })

  if (!esparcimiento) {
    console.log("No se encontró el concepto 'Esparcimiento'.")
    return
  }
  if (!recreacion) {
    console.log("No se encontró el concepto 'Recreación'.")
    return
  }

  console.log(`Esparcimiento id: ${esparcimiento.id}`)
  console.log(`Recreación id: ${recreacion.id}`)

  const count = await prisma.transaction.count({ where: { conceptId: esparcimiento.id } })
  console.log(`Transacciones a reasignar: ${count}`)
  console.log("\n¿Confirmar? (s/n): ")

  await new Promise<void>((resolve, reject) => {
    process.stdin.setEncoding("utf8")
    process.stdin.once("data", (data) => {
      const answer = data.toString().trim().toLowerCase()
      if (answer === "s") {
        resolve()
      } else {
        console.log("Cancelado.")
        reject(new Error("cancelado"))
      }
    })
  })

  const updated = await prisma.transaction.updateMany({
    where: { conceptId: esparcimiento.id },
    data: { conceptId: recreacion.id },
  })
  console.log(`Transacciones reasignadas: ${updated.count}`)

  await prisma.concept.delete({ where: { id: esparcimiento.id } })
  console.log("Concepto 'Esparcimiento' eliminado.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
