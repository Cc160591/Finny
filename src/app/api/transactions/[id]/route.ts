import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;

  const tx = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!tx) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  // Ripristina il saldo
  const balanceChange = tx.type === "INCOME" ? -tx.amount : tx.amount;
  await prisma.account.update({
    where: { id: tx.accountId },
    data: { balance: { increment: balanceChange } },
  });

  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ message: "Eliminato" });
}
