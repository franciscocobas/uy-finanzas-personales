import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import RecordatorioPagosEmail from "@/emails/recordatorio-pagos";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export async function GET(request: Request) {
  // Verificar el secret de Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.REMINDER_EMAIL_TO;

  if (!to) {
    return NextResponse.json({ error: "REMINDER_EMAIL_TO not set" }, { status: 500 });
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const dayOfMonth = now.getUTCDate();
  const dayOfWeek = now.getUTCDay(); // 0=dom, 1=lun

  const esPrimerLunes = dayOfWeek === 1 && dayOfMonth <= 7;
  const esDia10 = dayOfMonth === 10;

  if (!esPrimerLunes && !esDia10) {
    return NextResponse.json({ message: "No corresponde enviar hoy, mail no enviado." });
  }

  const mesNombre = `${MONTH_NAMES[month]} ${year}`;

  const currentMonth = month + 1

  const [allRecurringConcepts, monthTransactions] = await Promise.all([
    prisma.concept.findMany({
      where: { recurring: true, active: true },
      select: { id: true, name: true, recurringMonths: true },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.findMany({
      where: {
        date: {
          gte: new Date(Date.UTC(year, month, 1)),
          lt: new Date(Date.UTC(year, month + 1, 1)),
        },
        type: { in: ["INCOME", "EXPENSE"] },
      },
      select: { conceptId: true },
    }),
  ]);

  const recurringConcepts = allRecurringConcepts.filter(
    (c) => c.recurringMonths.length === 0 || c.recurringMonths.includes(currentMonth)
  )

  const paidConceptIds = new Set(monthTransactions.map((t) => t.conceptId).filter(Boolean));

  const pendientes = recurringConcepts
    .filter((c) => !paidConceptIds.has(c.id))
    .map((c) => c.name);

  const pagados = recurringConcepts
    .filter((c) => paidConceptIds.has(c.id))
    .map((c) => c.name);

  if (pendientes.length === 0) {
    return NextResponse.json({ message: "No hay pagos pendientes, mail no enviado." });
  }

  const { error } = await resend.emails.send({
    from: "Finanzas <onboarding@resend.dev>",
    to,
    subject: `Pagos pendientes — ${mesNombre}`,
    react: RecordatorioPagosEmail({ mes: mesNombre, pendientes, pagados }),
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    message: "Mail enviado.",
    pendientes,
    pagados,
  });
}
