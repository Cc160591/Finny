import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email già registrata" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    // Crea categorie di default
    await prisma.category.createMany({
      data: [
        { userId: user.id, name: "Alimentari", icon: "shopping-cart", color: "#F59E0B", type: "EXPENSE" },
        { userId: user.id, name: "Trasporti", icon: "car", color: "#EF4444", type: "EXPENSE" },
        { userId: user.id, name: "Casa", icon: "home", color: "#8B5CF6", type: "EXPENSE" },
        { userId: user.id, name: "Salute", icon: "heart", color: "#EC4899", type: "EXPENSE" },
        { userId: user.id, name: "Intrattenimento", icon: "tv", color: "#06B6D4", type: "EXPENSE" },
        { userId: user.id, name: "Abbigliamento", icon: "shirt", color: "#84CC16", type: "EXPENSE" },
        { userId: user.id, name: "Ristoranti", icon: "utensils", color: "#F97316", type: "EXPENSE" },
        { userId: user.id, name: "Stipendio", icon: "briefcase", color: "#10B981", type: "INCOME" },
        { userId: user.id, name: "Freelance", icon: "laptop", color: "#3B82F6", type: "INCOME" },
        { userId: user.id, name: "Investimenti", icon: "trending-up", color: "#6366F1", type: "INCOME" },
      ],
    });

    return NextResponse.json({ message: "Registrazione completata" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
