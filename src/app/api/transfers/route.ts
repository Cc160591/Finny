import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const schema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const { fromAccountId, toAccountId, amount, description, date } = parsed.data;
  const userId = session.user.id;

  if (fromAccountId === toAccountId) {
    return NextResponse.json({ error: "I conti devono essere diversi" }, { status: 400 });
  }

  const [fromAccount, toAccount] = await Promise.all([
    prisma.account.findFirst({ where: { id: fromAccountId, userId } }),
    prisma.account.findFirst({ where: { id: toAccountId, userId } }),
  ]);

  if (!fromAccount || !toAccount) {
    return NextResponse.json({ error: "Conto non trovato" }, { status: 404 });
  }

  const txDate = date ? new Date(date) : new Date();
  const note = description ? ` · ${description}` : "";

  await prisma.$transaction([
    // Uscita dal conto sorgente
    prisma.transaction.create({
      data: {
        userId,
        accountId: fromAccountId,
        amount,
        description: `Trasferimento → ${toAccount.name}${note}`,
        date: txDate,
        type: "EXPENSE",
        categoryId: null,
      },
    }),
    // Entrata nel conto destinazione
    prisma.transaction.create({
      data: {
        userId,
        accountId: toAccountId,
        amount,
        description: `Trasferimento ← ${fromAccount.name}${note}`,
        date: txDate,
        type: "INCOME",
        categoryId: null,
      },
    }),
    // Aggiorna saldi
    prisma.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: amount } },
    }),
    prisma.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: amount } },
    }),
  ]);

  return NextResponse.json({ success: true });
}
