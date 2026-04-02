# Finanzas Personales - Contexto del Proyecto

App de finanzas personales para uso exclusivamente personal, accesible desde el celular via URL (web app responsiva).

## Package manager

pnpm

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (preset Nova, componentes Radix)
- **Prisma 7** (con @prisma/adapter-pg)
- **PostgreSQL en Neon**
- **Auth.js v5** con Credentials (email/password)
- **Deploy en Vercel**

## Estado actual

- [x] Proyecto Next.js creado
- [x] shadcn/ui instalado y configurado (preset Nova, Radix)
- [x] Prisma 7 + Neon configurados (con @prisma/adapter-pg)
- [x] Auth.js v5 con Credentials (email/password), login funcionando
- [x] Modelos de base de datos: User, Account, Category, Concept, Transaction
- [x] UI de cuentas con saldos
- [x] UI de categorías y conceptos (CRUD), conceptos pueden marcarse como recurrentes (con meses específicos opcionales), cambiar de categoría y activarse/desactivarse
- [x] UI de transacciones con filtro por año/mes (URL params) y filtro por categoría (client-side)
- [x] Crear, editar y eliminar transacciones (con confirmación inline)
- [x] Transferencias como doble entrada vinculada por transferId
- [x] Página de importación con flujo multi-paso (subir archivo → previsualizar → revisar)
- [x] Parsers de importación para BROU y BROU Recompensa
- [x] Scripts de migración histórica (movimientos.xlsx) y seeds (cuentas, categorías, conceptos)
- [x] Home: balance del mes corriente (ingresos/egresos/balance)
- [x] Home: tracker de pagos recurrentes del mes (filtra por meses configurados)
- [x] Home: gráfica de torta de gastos por categoría del mes corriente
- [x] Home: gráfica de barras de ingresos vs egresos por mes del año
- [x] Top loading bar en navegación entre páginas
- [x] Buscador de comprobantes histórico en /transacciones/buscar (busca por descripción y concepto)
- [x] /presupuesto: tabla anual de ingresos/egresos por concepto con selector de año
- [x] Recordatorios por email (Resend) vía cron de Vercel (lunes y día 10 de cada mes)
- [ ] Parser de importación para Prex

## Modelo de transferencias

Las transferencias se guardan como **dos registros** vinculados por `transferId`:
- Registro saliente: `type=TRANSFER, accountId=origen, description="→ Destino"`
- Registro entrante: `type=TRANSFER, accountId=destino, description="← Origen"`
- Al eliminar una, se eliminan ambas
- Excluir del cálculo de ingresos/egresos en reportes filtrando `type != TRANSFER`

## Importación de bancos

Los parsers viven en `lib/importers/`. Cada banco implementa la interfaz `BankParser`:
```ts
interface BankParser {
  parse(buffer: ArrayBuffer): RawMovement[]
}
```
`RawMovement` retorna `accountName` (no ID) — el formulario resuelve el ID contra la DB.

Bancos implementados: `brou.ts`, `brou-recompensa.ts`
Pendiente: `prex.ts`

## Modelo de conceptos recurrentes

Los conceptos tienen `recurring: Boolean` y `recurringMonths: Int[]`:
- `recurringMonths` vacío = aplica todos los meses (comportamiento por defecto)
- `recurringMonths` con valores = solo aplica esos meses (ej: `[3, 7, 11]` = Mar, Jul, Nov)

El filtro se aplica en el tracker de home y en el cron de recordatorios:
```ts
c.recurringMonths.length === 0 || c.recurringMonths.includes(currentMonth)
```

En `/categorias`, al marcar un concepto como recurrente aparece una fila de 12 botones de meses para configurar cuáles aplican.

## Preferencias de trabajo

- Avanzar paso a paso, sin saltear ni agrupar pasos.
- App para uso personal: no priorizar diseño diferenciador.
- El usuario puede pedir que Claude haga el commit directamente.
