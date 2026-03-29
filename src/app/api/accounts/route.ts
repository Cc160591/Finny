import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["CHECKING", "SAVINGS", "CASH", "CREDIT", "INVESTMENT"]).default("CHECKING"),
  balance: z.number().default(0),
  color: z.string().default("#F59E0B"),
  icon: z.string().default("wallet"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const account = await prisma.account.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json(account, { status: 201 });
}
