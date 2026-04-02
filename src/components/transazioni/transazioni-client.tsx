"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Trash2, Search, ArrowLeftRight, Pencil,
  Tag, Shirt, ShoppingCart, Home, Tv, Utensils, Heart, Car, Laptop,
  TrendingUp, Briefcase, Wallet, Coffee, Plane, Music, Dumbbell,
  BookOpen, Gamepad2, Zap, Smartphone, Gift, Clock, type LucideProps,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatEuro } from "@/lib/format";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

interface Transaction {
  id: string; amount: number; description: string; date: string; type: string;
  tinkTransactionId?: string | null;
  account: { id: string; name: string; color: string };
  category: { id: string; name: string; color: string; icon: string } | null;
}
interface Account { id: string; name: string; color: string }
interface Category { id: string; name: string; color: string; type: string }

// ── icon renderer ──────────────────────────────────────────────
const LUCIDE_MAP: Record<string, React.ComponentType<LucideProps>> = {
  tag: Tag, shirt: Shirt, "shopping-cart": ShoppingCart, home: Home, tv: Tv,
  utensils: Utensils, heart: Heart, car: Car, laptop: Laptop,
  "trending-up": TrendingUp, briefcase: Briefcase, wallet: Wallet,
  coffee: Coffee, plane: Plane, music: Music, dumbbell: Dumbbell,
  book: BookOpen, gamepad: Gamepad2, gamepad2: Gamepad2, zap: Zap,
  smartphone: Smartphone, gift: Gift, clock: Clock,
};

function CatIcon({ icon, color, size = 12 }: { icon: string; color: string; size?: number }) {
  const L = LUCIDE_MAP[icon?.toLowerCase()];
  if (L) return <L size={size} style={{ color }} />;
  return <span style={{ fontSize: size, lineHeight: 1 }}>{icon}</span>;
}

// ── empty / add form ──────────────────────────────────────────
const emptyForm = {
  accountId: "", categoryId: "", amount: "", description: "",
  date: new Date().toISOString().split("T")[0], type: "EXPENSE",
};

export function TransazioniClient() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/transactions?limit=200");
    const data = await res.json();
    setTransactions(data.transactions ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, [load]);

  const filtered = transactions.filter((tx) => {
    const q = search.toLowerCase();
    const matchSearch = tx.description.toLowerCase().includes(q) || tx.account.name.toLowerCase().includes(q);
    const matchType = filterType === "all" || tx.type === filterType;
    return matchSearch && matchType;
  });

  function openAdd() {
    setEditTx(null);
    setForm(emptyForm);
    setShowDialog(true);
  }

  function openEdit(tx: Transaction) {
    setEditTx(tx);
    setForm({
      accountId: tx.account.id,
      categoryId: tx.category?.id ?? "",
      amount: String(tx.amount),
      description: tx.description,
      date: tx.date.split("T")[0],
      type: tx.type,
    });
    setShowDialog(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accountId || !form.amount || !form.description) {
      toast.error("Compila tutti i campi obbligatori"); return;
    }
    setSaving(true);
    const payload = {
      accountId: form.accountId,
      categoryId: form.categoryId || null,
      amount: parseFloat(form.amount),
      description: form.description,
      date: form.date,
      type: form.type,
    };
    const res = editTx
      ? await fetch(`/api/transactions/${editTx.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) {
      toast.success(editTx ? "Transazione aggiornata!" : "Transazione aggiunta!");
      setShowDialog(false);
      load();
    } else {
      toast.error("Errore durante il salvataggio");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa transazione?")) return;
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Transazione eliminata"); load(); }
  }

  const filteredCats = categories.filter((c) => c.type === form.type);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transazioni</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} transazioni totali</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={openAdd}>
          <Plus size={16} />Aggiungi transazione
        </Button>
      </div>

      {/* Filtri */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cerca transazioni..." className="pl-9 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(["all", "EXPENSE", "INCOME"] as const).map((t) => (
            <Button key={t} variant={filterType === t ? "default" : "outline"} size="sm" className="rounded-xl"
              onClick={() => setFilterType(t)}>
              {t === "all" ? "Tutte" : t === "EXPENSE" ? "Spese" : "Entrate"}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabella */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden">
        {/* Intestazione colonne */}
        <div className="hidden md:grid grid-cols-[130px_1fr_180px_110px_150px_90px] px-5 py-3 border-b border-border/40 bg-muted/30">
          {["DATA", "DESCRIZIONE", "CATEGORIA", "FONTE", "IMPORTO", ""].map((h) => (
            <span key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground text-sm">Nessuna transazione trovata.</div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map((tx) => {
              const isTransfer = tx.description.startsWith("Trasferimento →") || tx.description.startsWith("Trasferimento ←");
              const catColor = isTransfer ? "#8B5CF6" : (tx.category?.color ?? "#94a3b8");
              const fonte = tx.tinkTransactionId ? "banca" : "manuale";

              return (
                <div
                  key={tx.id}
                  className="grid grid-cols-1 md:grid-cols-[130px_1fr_180px_110px_150px_90px] items-center px-5 py-3.5 hover:bg-muted/20 transition-colors group gap-2 md:gap-0"
                >
                  {/* DATA */}
                  <span className="text-sm text-muted-foreground font-mono tabular-nums">
                    {format(new Date(tx.date), "yyyy-MM-dd")}
                  </span>

                  {/* DESCRIZIONE */}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tx.account.name}</p>
                  </div>

                  {/* CATEGORIA */}
                  <div>
                    {isTransfer ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "#8B5CF620", color: "#8B5CF6" }}>
                        <ArrowLeftRight size={11} />Trasferimento
                      </span>
                    ) : tx.category ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: catColor + "20", color: catColor }}
                      >
                        <CatIcon icon={tx.category.icon} color={catColor} size={11} />
                        {tx.category.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <Clock size={11} />Altro
                      </span>
                    )}
                  </div>

                  {/* FONTE */}
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground w-fit">
                    {fonte}
                  </span>

                  {/* IMPORTO */}
                  <span className={`font-bold text-sm tabular-nums ${isTransfer ? "text-violet-500" : tx.type === "INCOME" ? "text-emerald-600" : "text-red-500"}`}>
                    {isTransfer
                      ? (tx.description.startsWith("Trasferimento →") ? "-" : "+") + formatEuro(tx.amount).replace("€\u00a0", "EUR ").replace("€", "EUR ")
                      : (tx.type === "INCOME" ? "+" : "-") + "EUR " + new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tx.amount)
                    }
                  </span>

                  {/* AZIONI */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded-xl border border-border/60 hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors"
                      onClick={() => openEdit(tx)}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded-xl border border-border/60 hover:border-destructive/40 hover:text-destructive text-muted-foreground transition-colors"
                      onClick={() => handleDelete(tx.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog aggiungi/modifica */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editTx ? "Modifica transazione" : "Nuova transazione"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="flex gap-2">
              {["EXPENSE", "INCOME"].map((t) => (
                <Button key={t} type="button" variant={form.type === t ? "default" : "outline"} className="flex-1 rounded-xl"
                  onClick={() => setForm({ ...form, type: t, categoryId: "" })}>
                  {t === "EXPENSE" ? "Spesa" : "Entrata"}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Importo (€)</Label>
              <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-xl" required />
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Input placeholder="es. Spesa al supermercato" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl" required />
            </div>
            <div className="space-y-2">
              <Label>Conto</Label>
              <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v ?? "" })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleziona conto" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria (opzionale)</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v ?? "" })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleziona categoria" /></SelectTrigger>
                <SelectContent>
                  {filteredCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-xl" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDialog(false)}>Annulla</Button>
              <Button type="submit" className="flex-1 rounded-xl" disabled={saving}>
                {saving ? "Salvataggio..." : editTx ? "Salva" : "Aggiungi"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
