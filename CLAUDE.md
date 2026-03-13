# Finanzas Personales - Contexto del Proyecto

App de finanzas personales para uso exclusivamente personal, accesible desde el celular via URL (web app responsiva).

## Package manager

pnpm

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (preset Nova, componentes Radix)
- **Prisma ORM** (pendiente de instalar)
- **PostgreSQL en Neon** (pendiente de configurar)
- **Auth.js con Google OAuth** (pendiente de instalar)
- **Deploy en Vercel**

## MVP Scope

1. Cuentas y categorías básicas
2. Carga de transacciones (ingreso/egreso)
3. Balance actual por cuenta
4. Lista de transacciones con filtros simples

## Estado actual

- [x] Proyecto Next.js creado
- [x] shadcn/ui instalado y configurado (preset Nova, Radix)
- [x] Prisma 7 + Neon configurados (con @prisma/adapter-pg)
- [x] Auth.js v5 con Credentials (email/password), login funcionando
- [x] Modelos de base de datos: User, Account, Category, Concept, Transaction
- [ ] UI y lógica del MVP

## Preferencias de trabajo

- Avanzar paso a paso, sin saltear ni agrupar pasos.
- App para uso personal: no priorizar diseño diferenciador.
