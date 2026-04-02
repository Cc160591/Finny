import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const patchSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  date: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  accountId: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const tx = await prisma.transaction.findFirst({ where: { id, userId: session.user.id } });
  if (!tx) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  // Se cambia importo o tipo, aggiusta il saldo del conto
  const newAmount = parsed.data.amount ?? tx.amount;
  const newType = parsed.data.type ?? tx.type;
  const newAccountId = parsed.data.accountId ?? tx.accountId;

  if (newAmount !== tx.amount || newType !== tx.type || newAccountId !== tx.accountId) {
    // Annulla effetto vecchio
    const oldRevert = tx.type === "INCOME" ? -tx.amount : tx.amount;
    await prisma.account.update({ where: { id: tx.accountId }, data: { balance: { increment: oldRevert } } });
    // Applica effetto nuovo
    const newEffect = newType === "INCOME" ? newAmount : -newAmount;
    await prisma.account.update({ where: { id: newAccountId }, data: { balance: { increment: newEffect } } });
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...parsed.data,
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
    },
    include: {
      account: { select: { name: true, color: true } },
      category: { select: { name: true, color: true, icon: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;
  const tx = await prisma.transaction.findFirst({ where: { id, userId: session.user.id } });
  if (!tx) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const balanceChange = tx.type === "INCOME" ? -tx.amount : tx.amount;
  await prisma.account.update({ where: { id: tx.accountId }, data: { balance: { increment: balanceChange } } });
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ message: "Eliminato" });
}
