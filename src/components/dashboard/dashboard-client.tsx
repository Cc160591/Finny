"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  Plus, Target, PiggyBank,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface DashboardData {
  totalBalance: number;
  accounts: Array<{ id: string; name: string; balance: number; color: string; type: string }>;
  monthIncome: number;
  monthExpense: number;
  recentTransactions: Array<{
    id: string; amount: number; description: string; date: string;
    type: string; account: { name: string; color: string };
    category: { name: string; color: string; icon: string } | null;
  }>;
  budgets: Array<{
    id: string; amount: number; spent: number;
    category: { name: string; color: string; icon: string };
  }>;
  goals: Array<{ id: string; name: string; targetAmount: number; currentAmount: number; color: string }>;
  monthlyData: Array<{ label: string; income: number; expenses: number }>;
  categoryData: Array<{ name: string; amount: number; color: string }>;
}

function StatCard({
  title, value, subtitle, icon: Icon, trend, color = "bg-primary/10 text-primary",
}: {
  title: string; value: string; subtitle?: string;
  icon: React.ElementType; trend?: "up" | "down"; color?: string;
}) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={20} />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3">
            {trend === "up" ? (
              <ArrowUpRight size={14} className="text-emerald-500" />
            ) : (
              <ArrowDownRight size={14} className="text-red-400" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardClient({ userName }: { userName: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buongiorno";
    if (h < 18) return "Buon pomeriggio";
    return "Buonasera";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const savings = (data?.monthIncome ?? 0) - (data?.monthExpense ?? 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting()}, {userName.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: it })}
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          <Link href="/transazioni">
            <Button size="sm" variant="outline" className="rounded-xl gap-2">
              <Plus size={14} />
              Transazione
            </Button>
          </Link>
          <Link href="/conti">
            <Button size="sm" className="rounded-xl gap-2">
              <Wallet size={14} />
              Conti
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Saldo Totale"
          value={formatEuro(data?.totalBalance ?? 0)}
          icon={Wallet}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          title="Entrate Mese"
          value={formatEuro(data?.monthIncome ?? 0)}
          icon={TrendingUp}
          trend="up"
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Uscite Mese"
          value={formatEuro(data?.monthExpense ?? 0)}
          icon={TrendingDown}
          trend="down"
          color="bg-red-50 text-red-500"
        />
        <StatCard
          title="Risparmio"
          value={formatEuro(savings)}
          icon={PiggyBank}
          color={savings >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}
        />
      </div>

      {/* Charts + conti */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafico andamento */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Andamento 6 mesi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.monthlyData ?? []} barGap={4}>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}€`} />
                <Tooltip
                  formatter={(value, name) => [
                    formatEuro(Number(value)),
                    name === "income" ? "Entrate" : "Uscite",
                  ]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", background: "var(--card)" }}
                />
                <Bar dataKey="income" fill="oklch(0.68 0.10 145)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" fill="oklch(0.68 0.16 55)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />Entrate
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-sm bg-primary inline-block" />Uscite
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conti */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">I tuoi conti</CardTitle>
            <Link href="/conti">
              <Button variant="ghost" size="sm" className="text-xs rounded-lg h-7">Tutti</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.accounts ?? []).length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Nessun conto ancora.</p>
                <Link href="/conti">
                  <Button size="sm" variant="outline" className="mt-2 rounded-xl text-xs">
                    <Plus size={12} className="mr-1" />Aggiungi conto
                  </Button>
                </Link>
              </div>
            ) : (
              data?.accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: a.color + "30" }}>
                      <Wallet size={14} style={{ color: a.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{a.type.toLowerCase()}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{formatEuro(a.balance)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget + Goals + Transazioni recenti */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transazioni recenti */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Transazioni recenti</CardTitle>
            <Link href="/transazioni">
              <Button variant="ghost" size="sm" className="text-xs rounded-lg h-7">Tutte</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.recentTransactions ?? []).length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Nessuna transazione ancora. Inizia a spendere! (oppure guadagnare, sarebbe meglio.)</p>
              </div>
            ) : (
              data?.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: (tx.category?.color ?? tx.account.color) + "25" }}
                    >
                      <span className="text-sm">{tx.type === "INCOME" ? "↑" : "↓"}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{tx.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tx.category?.name ?? tx.account.name} • {format(new Date(tx.date), "d MMM", { locale: it })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${tx.type === "INCOME" ? "text-emerald-600" : "text-foreground"}`}
                  >
                    {tx.type === "INCOME" ? "+" : "-"}{formatEuro(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Sidebar destra: obiettivi + budget */}
        <div className="space-y-6">
          {/* Obiettivi */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target size={16} />Obiettivi
              </CardTitle>
              <Link href="/obiettivi">
                <Button variant="ghost" size="sm" className="text-xs rounded-lg h-7">Tutti</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.goals ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Nessun obiettivo. Sognare non costa nulla.</p>
              ) : (
                data?.goals.map((g) => (
                  <div key={g.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate">{g.name}</span>
                      <span className="text-muted-foreground">{Math.round((g.currentAmount / g.targetAmount) * 100)}%</span>
                    </div>
                    <Progress value={(g.currentAmount / g.targetAmount) * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{formatEuro(g.currentAmount)}</span>
                      <span>{formatEuro(g.targetAmount)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Spese per categoria */}
          {(data?.categoryData ?? []).length > 0 && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Spese per categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-3">
                  <PieChart width={120} height={120}>
                    <Pie data={data?.categoryData ?? []} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="amount" paddingAngle={2}>
                      {(data?.categoryData ?? []).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
                <div className="space-y-1.5">
                  {data?.categoryData.slice(0, 4).map((cat, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-muted-foreground truncate max-w-[100px]">{cat.name}</span>
                      </div>
                      <span className="font-medium">{formatEuro(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Budget mese */}
      {(data?.budgets ?? []).length > 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PiggyBank size={16} />Budget del mese
            </CardTitle>
            <Link href="/budget">
              <Button variant="ghost" size="sm" className="text-xs rounded-lg h-7">Gestisci</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.budgets.map((b) => {
                const pct = Math.min((b.spent / b.amount) * 100, 100);
                const isOver = b.spent > b.amount;
                return (
                  <div key={b.id} className="p-3 rounded-xl bg-muted/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{b.category.name}</span>
                      {isOver && <Badge variant="destructive" className="text-xs">Sforato</Badge>}
                    </div>
                    <Progress value={pct} className={`h-1.5 ${isOver ? "[&>div]:bg-destructive" : ""}`} />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                      <span>{formatEuro(b.spent)} spesi</span>
                      <span>{formatEuro(b.amount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
