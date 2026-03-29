"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, ChevronLeft, ChevronRight, PiggyBank } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatEuro } from "@/lib/format";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

interface Budget {
  id: string; amount: number; spent: number; month: number; year: number;
  category: { id: string; name: string; color: string; icon: string };
}
interface Category { id: string; name: string; type: string }

export function BudgetClient() {
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ categoryId: "", amount: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const m = currentDate.getMonth() + 1;
    const y = currentDate.getFullYear();
    const res = await fetch(`/api/budgets?month=${m}&year=${y}`);
    const data = await res.json();
    setBudgets(data);
    setLoading(false);
  }, [currentDate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((data) => {
      setCategories(data.filter((c: Category) => c.type === "EXPENSE"));
    });
  }, []);

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: form.categoryId,
        amount: parseFloat(form.amount),
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Budget impostato!");
      setShowDialog(false);
      setForm({ categoryId: "", amount: "" });
      load();
    } else {
      toast.error("Errore durante il salvataggio");
    }
  }

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budget</h1>
          <p className="text-muted-foreground text-sm mt-1">Tieni a bada le spese prima che loro tengano a bada te.</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={() => setShowDialog(true)}>
          <Plus size={16} />Aggiungi budget
        </Button>
      </div>

      {/* Navigazione mese */}
      <div className="flex items-center justify-between bg-card border border-border/50 rounded-2xl p-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-xl"><ChevronLeft size={18} /></Button>
        <span className="font-semibold capitalize">{format(currentDate, "MMMM yyyy", { locale: it })}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-xl"><ChevronRight size={18} /></Button>
      </div>

      {/* Riepilogo */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Budget totale", value: formatEuro(totalBudget), color: "text-primary" },
            { label: "Speso", value: formatEuro(totalSpent), color: totalSpent > totalBudget ? "text-destructive" : "text-foreground" },
            { label: "Rimanente", value: formatEuro(totalBudget - totalSpent), color: (totalBudget - totalSpent) >= 0 ? "text-emerald-600" : "text-destructive" },
          ].map((s) => (
            <Card key={s.label} className="border-border/50 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <PiggyBank size={28} className="text-muted-foreground" />
          </div>
          <p className="font-medium">Nessun budget per questo mese</p>
          <p className="text-sm text-muted-foreground mt-1">Imposta dei budget per categoria e smetti di guardarti con orrore nell&apos;estratto conto.</p>
          <Button className="mt-4 rounded-xl gap-2" onClick={() => setShowDialog(true)}>
            <Plus size={16} />Aggiungi budget
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const pct = Math.min((b.spent / b.amount) * 100, 100);
            const isOver = b.spent > b.amount;
            const remaining = b.amount - b.spent;
            return (
              <Card key={b.id} className="border-border/50 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: b.category.color + "25" }}>
                        <span className="text-sm" style={{ color: b.category.color }}>●</span>
                      </div>
                      <span className="font-semibold">{b.category.name}</span>
                    </div>
                    {isOver ? (
                      <Badge variant="destructive" className="rounded-lg text-xs">Sforato!</Badge>
                    ) : pct > 80 ? (
                      <Badge className="rounded-lg text-xs bg-orange-100 text-orange-700 border-orange-200">Attenzione</Badge>
                    ) : null}
                  </div>
                  <Progress value={pct} className={`h-2 mb-2 ${isOver ? "[&>div]:bg-destructive" : pct > 80 ? "[&>div]:bg-orange-500" : ""}`} />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{formatEuro(b.spent)} spesi</span>
                    <span className={isOver ? "text-destructive font-semibold" : "text-muted-foreground"}>
                      {isOver ? `+${formatEuro(Math.abs(remaining))} sforato` : `${formatEuro(remaining)} rimanenti`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Budget: {formatEuro(b.amount)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nuovo budget — {format(currentDate, "MMMM yyyy", { locale: it })}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v ?? "" })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleziona categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Importo budget (€)</Label>
              <Input type="number" step="0.01" min="1" placeholder="es. 200.00"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="rounded-xl" required />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDialog(false)}>Annulla</Button>
              <Button type="submit" className="flex-1 rounded-xl" disabled={saving || !form.categoryId}>
                {saving ? "Salvataggio..." : "Imposta budget"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
