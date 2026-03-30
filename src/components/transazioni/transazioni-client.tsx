"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Search, ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatEuro } from "@/lib/format";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

interface Transaction {
  id: string; amount: number; description: string; date: string; type: string;
  account: { id: string; name: string; color: string };
  category: { id: string; name: string; color: string; icon: string } | null;
}

interface Account { id: string; name: string; color: string }
interface Category { id: string; name: string; type: string }

export function TransazioniClient() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [form, setForm] = useState({
    accountId: "", categoryId: "", amount: "", description: "",
    date: new Date().toISOString().split("T")[0], type: "EXPENSE",
  });
  const [saving, setSaving] = useState(false);

  const loadTransactions = useCallback(async () => {
    const res = await fetch("/api/transactions?limit=100");
    const data = await res.json();
    setTransactions(data.transactions ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTransactions();
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, [loadTransactions]);

  const filtered = transactions.filter((tx) => {
    const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.account.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || tx.type === filterType;
    return matchSearch && matchType;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accountId || !form.amount || !form.description) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: form.accountId,
        categoryId: form.categoryId || null,
        amount: parseFloat(form.amount),
        description: form.description,
        date: form.date,
        type: form.type,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Transazione aggiunta!");
      setShowDialog(false);
      setForm({ accountId: "", categoryId: "", amount: "", description: "", date: new Date().toISOString().split("T")[0], type: "EXPENSE" });
      loadTransactions();
    } else {
      toast.error("Errore durante il salvataggio");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa transazione?")) return;
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Transazione eliminata");
      loadTransactions();
    }
  }

  const filteredCats = categories.filter((c) => c.type === form.type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transazioni</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} transazioni totali</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={() => setShowDialog(true)}>
          <Plus size={16} />Aggiungi transazione
        </Button>
      </div>

      {/* Filtri */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca transazioni..."
            className="pl-9 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {["all", "EXPENSE", "INCOME"].map((t) => (
            <Button
              key={t}
              variant={filterType === t ? "default" : "outline"}
              size="sm"
              className="rounded-xl"
              onClick={() => setFilterType(t)}
            >
              {t === "all" ? "Tutte" : t === "EXPENSE" ? "Spese" : "Entrate"}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nessuna transazione trovata.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((tx) => {
                const isTransfer = tx.description.startsWith("Trasferimento →") || tx.description.startsWith("Trasferimento ←");
                return (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-semibold"
                      style={{ backgroundColor: isTransfer ? "#8B5CF625" : (tx.category?.color ?? tx.account.color) + "25", color: isTransfer ? "#8B5CF6" : (tx.category?.color ?? tx.account.color) }}
                    >
                      {isTransfer ? <ArrowLeftRight size={16} /> : tx.type === "INCOME" ? "↑" : "↓"}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{tx.account.name}</span>
                        {isTransfer ? (
                          <Badge variant="secondary" className="text-xs py-0 h-5 rounded-lg" style={{ backgroundColor: "#8B5CF620", color: "#8B5CF6" }}>
                            Trasferimento
                          </Badge>
                        ) : tx.category && (
                          <Badge variant="secondary" className="text-xs py-0 h-5 rounded-lg">
                            {tx.category.name}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(tx.date), "d MMM yyyy", { locale: it })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold text-sm ${isTransfer ? "text-violet-500" : tx.type === "INCOME" ? "text-emerald-600" : "text-foreground"}`}>
                      {isTransfer ? (tx.description.startsWith("Trasferimento →") ? "-" : "+") : tx.type === "INCOME" ? "+" : "-"}{formatEuro(tx.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl w-8 h-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(tx.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nuova transazione</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="flex gap-2">
              {["EXPENSE", "INCOME"].map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={form.type === t ? "default" : "outline"}
                  className="flex-1 rounded-xl"
                  onClick={() => setForm({ ...form, type: t, categoryId: "" })}
                >
                  {t === "EXPENSE" ? "Spesa" : "Entrata"}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Importo (€)</Label>
              <Input
                type="number" step="0.01" min="0.01" placeholder="0.00"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="rounded-xl" required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Input
                placeholder="es. Spesa al supermercato"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-xl" required
              />
            </div>
            <div className="space-y-2">
              <Label>Conto</Label>
              <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v ?? "" })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleziona conto" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria (opzionale)</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v ?? "" })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDialog(false)}>
                Annulla
              </Button>
              <Button type="submit" className="flex-1 rounded-xl" disabled={saving}>
                {saving ? "Salvataggio..." : "Aggiungi"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
