# Finanzas Personales UY

Web app de finanzas personales de uso personal, optimizada para móvil. Permite registrar transacciones, hacer seguimiento de gastos por categoría, gestionar presupuesto mensual y recibir recordatorios de pagos recurrentes.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (preset Nova)
- **Prisma 7** con PostgreSQL en Neon
- **Auth.js v5** (email/password)
- **Resend** (emails de recordatorio)
- **Deploy en Vercel**

## Funcionalidades

- **Dashboard**: balance del mes, tracker de pagos recurrentes, gráfica de gastos por categoría y comparativa ingresos/egresos por mes
- **Transacciones**: listado por año/mes con filtros por tipo, cuenta, categoría y concepto; creación, edición y eliminación con confirmación inline
- **Transferencias**: guardadas como doble entrada vinculada, excluidas de reportes de ingresos/egresos
- **Importación**: carga de extractos bancarios (BROU, BROU Recompensa) con flujo de previsualización y revisión
- **Categorías y conceptos**: CRUD completo; los conceptos pueden marcarse como recurrentes con meses específicos opcionales
- **Presupuesto**: tabla anual de ingresos/egresos por concepto con selector de año
- **Buscador**: búsqueda de comprobantes históricos por descripción o concepto
- **Recordatorios por email**: enviados automáticamente los lunes y el día 10 de cada mes vía cron de Vercel

## Desarrollo local

```bash
pnpm install
pnpm dev
```

Requiere un archivo `.env.local` con las variables de entorno para la base de datos (Neon), Auth.js y Resend.

## Base de datos

```bash
pnpm prisma migrate dev
pnpm prisma generate
```
