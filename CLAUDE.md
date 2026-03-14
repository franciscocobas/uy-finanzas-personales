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
- [x] UI de cuentas, categorías y conceptos (CRUD)
- [x] UI de transacciones con filtro por año/mes (URL params)
- [x] Crear, editar y eliminar transacciones (con confirmación inline)
- [x] Transferencias como doble entrada vinculada por transferId
- [x] Página de importación con flujo multi-paso (subir archivo → previsualizar → revisar)
- [x] Parsers de importación para BROU y BROU Recompensa
- [x] Scripts de migración histórica (movimientos.xlsx) y seeds (cuentas, categorías, conceptos)
- [ ] Dashboard con resumen y reportes
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

## Preferencias de trabajo

- Avanzar paso a paso, sin saltear ni agrupar pasos.
- App para uso personal: no priorizar diseño diferenciador.
- El usuario hace los commits, solo redactar el mensaje cuando lo pida.
