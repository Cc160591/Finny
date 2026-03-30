"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Wallet, CreditCard, Banknote, TrendingUp, Trash2, ArrowLeftRight, Link2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatEuro } from "@/lib/format";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Account {
  id: string; name: string; type: string; balance: number; color: string; icon: string; tinkAccountId?: string | null; tinkLastSync?: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  CHECKING: "Corrente", SAVINGS: "Risparmio", CASH: "Contante", CREDIT: "Carta di credito", INVESTMENT: "Investimento",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  CHECKING: Wallet, SAVINGS: Banknote, CASH: Banknote, CREDIT: CreditCard, INVESTMENT: TrendingUp,
};

const COLORS = ["#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#3B82F6", "#F97316", "#EC4899", "#06B6D4"];

function TinkToast() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tink = searchParams.get("tink");
    if (tink === "success") toast.success("Banca collegata con successo!");
    else if (tink === "error") toast.error("Errore nel collegamento alla banca");
  }, [searchParams]);
  return null;
}

export function ContiClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [form, setForm] = useState({ name: "", type: "CHECKING", balance: "", color: "#F59E0B" });
  const [transferForm, setTransferForm] = useState({ fromAccountId: "", toAccountId: "", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connectingBank, setConnectingBank] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, type: form.type, balance: parseFloat(form.balance) || 0, color: form.color }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Conto aggiunto!");
      setShowDialog(false);
      setForm({ name: "", type: "CHECKING", balance: "", color: "#F59E0B" });
      load();
    } else {
      toast.error("Errore durante il salvataggio");
    }
  }

  async function handleConnectBank() {
    setConnectingBank(true);
    try {
      const res = await fetch("/api/tink/auth");
      const text = await res.text();
      let data: { url?: string; error?: string } = {};
      try { data = JSON.parse(text); } catch { throw new Error(`Risposta non valida (${res.status}): ${text.slice(0, 150)}`); }
      if (!res.ok || !data.url) throw new Error(data.error ?? "Errore sconosciuto");
      window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      toast.error(`Impossibile collegare la banca: ${msg}`);
      setConnectingBank(false);
    }
  }

  async function handleSync(accountId?: string) {
    setSyncing(accountId ?? "all");
    try {
      const res = await fetch("/api/tink/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore");
      toast.success(`Sincronizzati ${data.imported} movimenti`);
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      toast.error(msg);
    } finally {
      setSyncing(null);
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!transferForm.fromAccountId || !transferForm.toAccountId || !transferForm.amount) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }
    if (transferForm.fromAccountId === transferForm.toAccountId) {
      toast.error("I conti devono essere diversi");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromAccountId: transferForm.fromAccountId,
        toAccountId: transferForm.toAccountId,
        amount: parseFloat(transferForm.amount),
        description: transferForm.description || undefined,
        date: transferForm.date,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Trasferimento effettuato!");
      setShowTransferDialog(false);
      setTransferForm({ fromAccountId: "", toAccountId: "", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
      load();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Errore durante il trasferimento");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo conto? Verranno eliminate anche tutte le transazioni associate.")) return;
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Conto eliminato"); load(); }
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={null}><TinkToast /></Suspense>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conti</h1>
          <p className="text-muted-foreground text-sm mt-1">Saldo totale: {formatEuro(totalBalance)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="rounded-xl gap-2" onClick={handleConnectBank} disabled={connectingBank}>
            <Link2 size={16} />{connectingBank ? "Reindirizzamento..." : "Collega banca"}
          </Button>
          <Button variant="outline" className="rounded-xl gap-2" onClick={() => setShowTransferDialog(true)} disabled={accounts.length < 2}>
            <ArrowLeftRight size={16} />Trasferimento conto
          </Button>
          <Button className="rounded-xl gap-2" onClick={() => setShowDialog(true)}>
            <Plus size={16} />Aggiungi conto
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Wallet size={28} className="text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Nessun conto</p>
          <p className="text-sm text-muted-foreground mt-1">Aggiungi il tuo primo conto per iniziare a tracciare le spese.</p>
          <Button className="mt-4 rounded-xl gap-2" onClick={() => setShowDialog(true)}>
            <Plus size={16} />Aggiungi conto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => {
            const Icon = TYPE_ICONS[a.type] ?? Wallet;
            return (
              <Card key={a.id} className="border-border/50 shadow-sm group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: a.color + "25" }}>
                      <Icon size={20} style={{ color: a.color }} />
                    </div>
                    <div className="flex items-center gap-2">
                      {a.tinkAccountId && (
                        <Badge variant="secondary" className="text-xs rounded-lg gap-1 flex items-center" style={{ backgroundColor: "#10B98120", color: "#10B981" }}>
                          <Link2 size={10} />collegato
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs rounded-lg">{TYPE_LABELS[a.type]}</Badge>
                      {a.tinkAccountId && (
                        <Button
                          variant="ghost" size="icon"
                          className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                          onClick={() => handleSync(a.id)}
                          disabled={syncing === a.id}
                          title="Sincronizza movimenti"
                        >
                          <RefreshCw size={13} className={syncing === a.id ? "animate-spin" : ""} />
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon"
                        className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(a.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                  <p className="font-semibold text-foreground">{a.name}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: a.color }}>{formatEuro(a.balance)}</p>
                  {a.tinkLastSync && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Ultimo sync: {new Date(a.tinkLastSync).toLocaleDateString("it-IT")}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Trasferimento conto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Da conto</Label>
              <Select value={transferForm.fromAccountId} onValueChange={(v) => setTransferForm({ ...transferForm, fromAccountId: v ?? "" })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleziona conto sorgente" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>A conto</Label>
              <Select value={transferForm.toAccountId} onValueChange={(v) => setTransferForm({ ...transferForm, toAccountId: v ?? "" })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleziona conto destinazione" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter((a) => a.id !== transferForm.fromAccountId).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Importo (€)</Label>
              <Input
                type="number" step="0.01" min="0.01" placeholder="0.00"
                value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                className="rounded-xl" required
              />
            </div>
            <div className="space-y-2">
              <Label>Nota (opzionale)</Label>
              <Input
                placeholder="es. Ricarica risparmio"
                value={transferForm.description} onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date" value={transferForm.date} onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowTransferDialog(false)}>Annulla</Button>
              <Button type="submit" className="flex-1 rounded-xl" disabled={saving}>
                {saving ? "Trasferimento..." : "Trasferisci"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nuovo conto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome conto</Label>
              <Input placeholder="es. Conto corrente Intesa" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? "" })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue>{TYPE_LABELS[form.type as keyof typeof TYPE_LABELS] ?? form.type}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Saldo iniziale (€)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Colore</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c} type="button"
                    className={`w-8 h-8 rounded-xl transition-transform ${form.color === c ? "scale-110 ring-2 ring-offset-2 ring-foreground/30" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, color: c })}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDialog(false)}>Annulla</Button>
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
