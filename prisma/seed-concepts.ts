import "dotenv/config"
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const concepts: { name: string; category: string }[] = [
  { name: "Sueldo la diaria", category: "Sueldos" },
  { name: "Aguinaldo SUBTE", category: "Sueldos" },
  { name: "Licencia", category: "Sueldos" },
  { name: "Honorarios", category: "Honorarios" },
  { name: "Rentas", category: "Rentas" },
  { name: "Alquiler", category: "Vivienda, mejoras y arreglos" },
  { name: "Electricidad", category: "Servicios y tarifas" },
  { name: "Agua", category: "Servicios y tarifas" },
  { name: "Gas", category: "Servicios y tarifas" },
  { name: "Teléfono", category: "Servicios y tarifas" },
  { name: "Internet", category: "Servicios y tarifas" },
  { name: "Gastos Comunes", category: "Vivienda, mejoras y arreglos" },
  { name: "Contribución Inmobiliaria", category: "Vivienda, mejoras y arreglos" },
  { name: "Impuestos Municipales", category: "Servicios y tarifas" },
  { name: "Mantenimiento", category: "Vivienda, mejoras y arreglos" },
  { name: "Equipamiento", category: "Vivienda, mejoras y arreglos" },
  { name: "Limpieza", category: "Vivienda, mejoras y arreglos" },
  { name: "Salud", category: "Salud y gastos médicos" },
  { name: "Educación", category: "Educación" },
  { name: "Celular", category: "Servicios y tarifas" },
  { name: "Vacaciones", category: "Esparcimiento" },
  { name: "Vestimenta", category: "Vestimenta" },
  { name: "Alimentación", category: "Alimentación" },
  { name: "Transporte", category: "Transporte, locomoción y vehículos" },
  { name: "Esparcimiento", category: "Esparcimiento" },
  { name: "Regalos", category: "Regalos, donaciones y aportes" },
  { name: "Combustible", category: "Transporte, locomoción y vehículos" },
  { name: "Taller Y Lavadero", category: "Transporte, locomoción y vehículos" },
  { name: "Patente", category: "Transporte, locomoción y vehículos" },
  { name: "Seguro Vehículo", category: "Transporte, locomoción y vehículos" },
  { name: "Gastos No Reintegrables", category: "Gastos laborales" },
  { name: "Gastos Reintegrables", category: "Gastos laborales" },
  { name: "Cuota Campito", category: "Vivienda, mejoras y arreglos" },
  { name: "Bar y Asados", category: "Esparcimiento" },
  { name: "Psicólogo", category: "Salud y gastos médicos" },
  { name: "Reintegro de gastos de SUBTE", category: "Otros ingresos" },
  { name: "Comisión Banco", category: "Servicios y tarifas" },
  { name: "Trabajos Freelance", category: "Honorarios" },
  { name: "Garage Auto", category: "Transporte, locomoción y vehículos" },
  { name: "Arreglos Bici", category: "Transporte, locomoción y vehículos" },
  { name: "Ahorro en sueldo", category: "Gastos laborales" },
  { name: "Peluquería", category: "Cuidado personal" },
  { name: "Leche Complemento", category: "Alimentación" },
  { name: "Suscripciones trabajo", category: "Gastos laborales" },
  { name: "Farmacia", category: "Salud y gastos médicos" },
  { name: "Dentista", category: "Salud y gastos médicos" },
  { name: "Recreación", category: "Esparcimiento" },
  { name: "Bajones", category: "Esparcimiento" },
  { name: "Veterinaria", category: "Gastos varios" },
  { name: "Comida y Piedritas Fauna", category: "Gastos varios" },
  { name: "Tributos domiciliarios", category: "Vivienda, mejoras y arreglos" },
  { name: "Viajes Campito", category: "Esparcimiento" },
  { name: "Delivery Comida / Comida afuera", category: "Alimentación" },
  { name: "Compra de apartamento", category: "Vivienda, mejoras y arreglos" },
  { name: "Salario Vacacional", category: "Sueldos" },
  { name: "Restauración Apartamento", category: "Vivienda, mejoras y arreglos" },
  { name: "Telepeaje", category: "Transporte, locomoción y vehículos" },
  { name: "Deuda Merce", category: "Otros ingresos" },
  { name: "Seguro tarjeta de crédito", category: "Servicios y tarifas" },
  { name: "Empleada Limpieza", category: "Vivienda, mejoras y arreglos" },
  { name: "Sueldo SUBTE", category: "Sueldos" },
  { name: "Cuota BHU", category: "Vivienda, mejoras y arreglos" },
  { name: "Aguinaldo la diaria", category: "Sueldos" },
  { name: "Gastos comunes Lucía", category: "Vivienda, mejoras y arreglos" },
  { name: "Materiales, Jugetes y misc Olivia", category: "Esparcimiento" },
  { name: "Bonos SUBTE", category: "Otros ingresos" },
  { name: "Préstamo", category: "Otros ingresos" },
  { name: "Equipamiento > Auto", category: "Transporte, locomoción y vehículos" },
  { name: "Impuesto Primaria", category: "Servicios y tarifas" },
  { name: "DGI - IRPF", category: "Servicios y tarifas" },
  { name: "Saneamiento", category: "Servicios y tarifas" },
  { name: "Salario Vacacional la diaria", category: "Sueldos" },
  { name: "Equipamiento > Accesorios", category: "Vivienda, mejoras y arreglos" },
  { name: "Deporte", category: "Cuidado personal" },
  { name: "Arreglos Apartamento", category: "Vivienda, mejoras y arreglos" },
  { name: "Cumple Oli", category: "Regalos, donaciones y aportes" },
  { name: "Ahorro Gletir", category: "Rentas" },
  { name: "Reintegro IRFP", category: "Otros ingresos" },
  { name: "Otro", category: "Otros ingresos" },
]

async function main() {
  const categories = await prisma.category.findMany()
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]))

  let inserted = 0
  let skipped = 0

  for (const concept of concepts) {
    const categoryId = categoryMap.get(concept.category)
    if (!categoryId) {
      console.warn(`Categoría no encontrada: "${concept.category}" para concepto "${concept.name}"`)
      skipped++
      continue
    }
    await prisma.concept.upsert({
      where: { name_categoryId: { name: concept.name, categoryId } },
      update: {},
      create: { name: concept.name, categoryId },
    })
    inserted++
  }

  console.log(`${inserted} conceptos insertados, ${skipped} omitidos.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
