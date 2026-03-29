import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const schema = z.object({
  accountId: z.string(),
  categoryId: z.string().optional().nullable(),
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const accountId = searchParams.get("accountId");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (accountId) where.accountId = accountId;
  if (month && year) {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true, icon: true } },
      },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({ transactions, total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const { accountId, categoryId, amount, description, date, type } = parsed.data;

  // Aggiorna il saldo del conto
  const balanceChange = type === "INCOME" ? amount : -amount;
  await prisma.account.updateMany({
    where: { id: accountId, userId: session.user.id },
    data: { balance: { increment: balanceChange } },
  });

  const transaction = await prisma.transaction.create({
    data: {
      userId: session.user.id,
      accountId,
      categoryId: categoryId ?? null,
      amount,
      description,
      date: date ? new Date(date) : new Date(),
      type,
    },
    include: {
      account: { select: { id: true, name: true, color: true } },
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
