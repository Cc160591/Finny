"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet, TrendingUp, TrendingDown, AlertCircle, ChevronLeft, ChevronRight,
  Plus, Clock, ArrowRight, Target, PiggyBank,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatEuro } from "@/lib/format";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function fmtEUR(amount: number): string {
  return "EUR " + new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
}

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

// Stat card con blob decorativo
function StatCard({
  title, value, subtitle, icon: Icon, iconBg, iconColor, blobColor, valueColor,
}: {
  title: string; value: string; subtitle?: string;
  icon: React.ElementType; iconBg: string; iconColor: string; blobColor: string; valueColor: string;
}) {
  return (
    <Card className="border-border/40 shadow-sm overflow-hidden relative">
      <CardContent className="p-5">
        {/* Decorative blob */}
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-30 pointer-events-none"
          style={{ backgroundColor: blobColor }}
        />
        <div
          className="absolute top-6 -right-2 w-14 h-14 rounded-full opacity-15 pointer-events-none"
          style={{ backgroundColor: blobColor }}
        />

        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 relative z-10"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold leading-tight" style={{ color: valueColor }}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardClient({ userName }: { userName: string }) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/dashboard?month=${selectedMonth}&year=${selectedYear}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [selectedMonth, selectedYear]);

  useEffect(() => { load(); }, [load]);

  function prevMonth() {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  }

  function nextMonth() {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  }

  const savings = (data?.monthIncome ?? 0) - (data?.monthExpense ?? 0);
  const monthLabel = `${MONTHS[selectedMonth - 1]} ${selectedYear}`;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month navigation */}
          <div className="flex items-center gap-1 border border-border rounded-xl px-1 py-1 bg-background shadow-sm">
            <button
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer px-1"
            >
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer px-1"
            >
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Nuova transazione */}
          <Link href="/transazioni">
            <Button className="rounded-xl gap-2 font-semibold shadow-sm">
              <Plus size={15} />Nuova transazione
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Saldo Attuale"
            value={fmtEUR(data?.totalBalance ?? 0)}
            subtitle="Saldo totale aggiornato"
            icon={Wallet}
            iconBg="#EEF2FF"
            iconColor="#6366F1"
            blobColor="#818CF8"
            valueColor="#10B981"
          />
          <StatCard
            title={`Entrate ${MONTHS[selectedMonth - 1]}`}
            value={`+${fmtEUR(data?.monthIncome ?? 0)}`}
            subtitle={monthLabel}
            icon={TrendingUp}
            iconBg="#ECFDF5"
            iconColor="#10B981"
            blobColor="#6EE7B7"
            valueColor="#10B981"
          />
          <StatCard
            title={`Uscite ${MONTHS[selectedMonth - 1]}`}
            value={`-${fmtEUR(data?.monthExpense ?? 0)}`}
            subtitle={monthLabel}
            icon={TrendingDown}
            iconBg="#FEF2F2"
            iconColor="#EF4444"
            blobColor="#FCA5A5"
            valueColor="#EF4444"
          />
          <StatCard
            title={`Risparmio ${MONTHS[selectedMonth - 1]}`}
            value={`${savings < 0 ? "-" : ""}${fmtEUR(savings)}`}
            subtitle="Entrate − Uscite"
            icon={AlertCircle}
            iconBg={savings >= 0 ? "#ECFDF5" : "#FEF2F2"}
            iconColor={savings >= 0 ? "#10B981" : "#EF4444"}
            blobColor={savings >= 0 ? "#6EE7B7" : "#FCA5A5"}
            valueColor={savings >= 0 ? "#10B981" : "#EF4444"}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uscite per categoria - donut */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <span className="text-base">🍩</span> Uscite per categoria
            </CardTitle>
            <Badge variant="secondary" className="text-xs rounded-lg font-medium" style={{ backgroundColor: "#EEF2FF", color: "#6366F1" }}>
              {monthLabel}
            </Badge>
          </CardHeader>
          <CardContent>
            {(data?.categoryData ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">Nessuna spesa questo mese</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <PieChart width={260} height={260}>
                    <Pie
                      data={data?.categoryData ?? []}
                      cx={125} cy={125}
                      innerRadius={70} outerRadius={120}
                      dataKey="amount" paddingAngle={2}
                    >
                      {(data?.categoryData ?? []).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [formatEuro(Number(v)), ""]}
                      contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
                    />
                  </PieChart>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
                  {(data?.categoryData ?? []).map((cat, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Andamento 6 mesi - area chart */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <span className="text-base">📈</span> Andamento ultimi 6 mesi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-3 justify-end">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />Entrate
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />Uscite
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data?.monthlyData ?? []} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => `€${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                />
                <Tooltip
                  formatter={(value, name) => [formatEuro(Number(value)), name === "income" ? "Entrate" : "Uscite"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2.5} fill="url(#gradIncome)" dot={{ r: 4, fill: "#10B981", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2.5} fill="url(#gradExpense)" dot={{ r: 4, fill: "#EF4444", strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ultime transazioni */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Clock size={16} className="text-muted-foreground" />
            Ultime transazioni — {monthLabel}
          </CardTitle>
          <Link href="/transazioni" className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
            Vedi tutte <ArrowRight size={14} />
          </Link>
        </CardHeader>
        <CardContent className="space-y-1">
          {(data?.recentTransactions ?? []).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Nessuna transazione in {monthLabel}</p>
              <Link href="/transazioni">
                <Button size="sm" variant="outline" className="mt-3 rounded-xl gap-1.5 text-xs">
                  <Plus size={12} />Aggiungi transazione
                </Button>
              </Link>
            </div>
          ) : (
            data?.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{
                      backgroundColor: (tx.category?.color ?? tx.account.color) + "20",
                      color: tx.category?.color ?? tx.account.color,
                    }}
                  >
                    {tx.type === "INCOME" ? "↑" : "↓"}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">{tx.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tx.category?.name ?? tx.account.name} · {format(new Date(tx.date), "d MMM yyyy", { locale: it })}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${tx.type === "INCOME" ? "text-emerald-600" : "text-red-500"}`}>
                  {tx.type === "INCOME" ? "+" : "-"}{formatEuro(tx.amount)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Budget + Obiettivi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget */}
        {(data?.budgets ?? []).length > 0 && (
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PiggyBank size={16} />Budget del mese
              </CardTitle>
              <Link href="/budget">
                <Button variant="ghost" size="sm" className="text-xs rounded-lg h-7">Gestisci</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>
        )}

        {/* Obiettivi */}
        {(data?.goals ?? []).length > 0 && (
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Target size={16} />Obiettivi
              </CardTitle>
              <Link href="/obiettivi">
                <Button variant="ghost" size="sm" className="text-xs rounded-lg h-7">Tutti</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.goals.map((g) => (
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
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
