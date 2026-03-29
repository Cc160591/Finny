import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  deadline: z.string().optional().nullable(),
  color: z.string().optional(),
  icon: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.deadline !== undefined) {
    data.deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : null;
  }

  const result = await prisma.goal.updateMany({
    where: { id, userId: session.user.id },
    data,
  });

  if (result.count === 0) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const updated = await prisma.goal.findUnique({ where: { id } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;
  await prisma.goal.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ message: "Eliminato" });
}
