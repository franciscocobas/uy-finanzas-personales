import "dotenv/config"
import bcrypt from "bcryptjs"
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as readline from "readline"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function main() {
  const password = await prompt("Contraseña: ")
  const hashed = await bcrypt.hash(password, 12)

  await prisma.user.upsert({
    where: { email: "fcarocena@gmail.com" },
    update: { password: hashed },
    create: { email: "fcarocena@gmail.com", password: hashed },
  })

  console.log("Usuario creado correctamente.")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
