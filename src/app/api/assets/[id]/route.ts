import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  symbol: z.string().min(1).optional(),
  type: z.enum(["ETF", "STOCK", "CRYPTO", "CASH", "BOND", "OTHER"]).optional(),
  quantity: z.number().positive().optional(),
  buyPrice: z.number().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const result = await prisma.asset.updateMany({
    where: { id, userId: session.user.id },
    data: parsed.data,
  });

  if (result.count === 0) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const updated = await prisma.asset.findUnique({ where: { id } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;
  await prisma.asset.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ message: "Eliminato" });
}
