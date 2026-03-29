import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [accounts, monthIncome, monthExpense, recentTx, budgets, goals] = await Promise.all([
    prisma.account.findMany({ where: { userId } }),
    prisma.transaction.aggregate({
      where: { userId, type: "INCOME", date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      include: {
        account: { select: { name: true, color: true } },
        category: { select: { name: true, color: true, icon: true } },
      },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.budget.findMany({
      where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
      include: { category: { select: { name: true, color: true, icon: true } } },
    }),
    prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  // Calcola speso per ogni budget
  const budgetsWithSpent = await Promise.all(
    budgets.map(async (b) => {
      const spent = await prisma.transaction.aggregate({
        where: { userId, categoryId: b.categoryId, type: "EXPENSE", date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      });
      return { ...b, spent: spent._sum.amount ?? 0 };
    })
  );

  // Spese ultimi 6 mesi per grafico
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: d.toLocaleDateString("it-IT", { month: "short" }) };
  });

  const monthlyData = await Promise.all(
    last6Months.map(async ({ month, year, label }) => {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      const [inc, exp] = await Promise.all([
        prisma.transaction.aggregate({ where: { userId, type: "INCOME", date: { gte: start, lte: end } }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { userId, type: "EXPENSE", date: { gte: start, lte: end } }, _sum: { amount: true } }),
      ]);
      return { label, income: inc._sum.amount ?? 0, expenses: exp._sum.amount ?? 0 };
    })
  );

  // Spese per categoria (mese corrente)
  const categoryExpenses = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type: "EXPENSE", date: { gte: monthStart, lte: monthEnd } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 6,
  });

  const categoryData = await Promise.all(
    categoryExpenses.map(async (c) => {
      if (!c.categoryId) return { name: "Altro", amount: c._sum.amount ?? 0, color: "#94a3b8" };
      const cat = await prisma.category.findUnique({ where: { id: c.categoryId }, select: { name: true, color: true } });
      return { name: cat?.name ?? "Altro", amount: c._sum.amount ?? 0, color: cat?.color ?? "#94a3b8" };
    })
  );

  return NextResponse.json({
    totalBalance: accounts.reduce((s, a) => s + a.balance, 0),
    accounts,
    monthIncome: monthIncome._sum.amount ?? 0,
    monthExpense: monthExpense._sum.amount ?? 0,
    recentTransactions: recentTx,
    budgets: budgetsWithSpent,
    goals,
    monthlyData,
    categoryData,
  });
}
