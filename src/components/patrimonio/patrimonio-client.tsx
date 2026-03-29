"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, TrendingUp, TrendingDown, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatEuro, formatPercent } from "@/lib/format";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";

interface Asset {
  id: string; name: string; symbol: string; type: string; quantity: number;
  buyPrice: number | null; currentPrice: number | null; currentValue: number | null;
  gainLoss: number | null; gainLossPercent: number | null;
}

const TYPE_LABELS: Record<string, string> = {
  ETF: "ETF", STOCK: "Azione", CRYPTO: "Crypto", CASH: "Liquidità", BOND: "Obbligazione", OTHER: "Altro",
};

const TYPE_COLORS: Record<string, string> = {
  ETF: "#F59E0B", STOCK: "#3B82F6", CRYPTO: "#8B5CF6", CASH: "#10B981", BOND: "#F97316", OTHER: "#94a3b8",
};

export function PatrimonioClient() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: "", symbol: "", type: "ETF", quantity: "", buyPrice: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    const res = await fetch("/api/assets");
    const data = await res.json();
    setAssets(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalValue = assets.reduce((s, a) => s + (a.currentValue ?? 0), 0);
  const totalCost = assets.reduce((s, a) => s + (a.buyPrice != null ? a.quantity * a.buyPrice : 0), 0);
  const totalGainLoss = totalValue - (totalCost > 0 ? totalCost : totalValue);
  const totalGainPct = totalCost > 0 ? ((totalGainLoss / totalCost) * 100) : 0;

  // Dati per grafico a torta (per tipo)
  const pieData = Object.entries(
    assets.reduce((acc, a) => {
      const t = a.type;
      acc[t] = (acc[t] ?? 0) + (a.currentValue ?? 0);
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, value]) => ({ name: TYPE_LABELS[type] ?? type, value, color: TYPE_COLORS[type] ?? "#94a3b8" }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        symbol: form.symbol.toUpperCase(),
        type: form.type,
        quantity: parseFloat(form.quantity),
        buyPrice: form.buyPrice ? parseFloat(form.buyPrice) : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Asset aggiunto!");
      setShowDialog(false);
      setForm({ name: "", symbol: "", type: "ETF", quantity: "", buyPrice: "" });
      load();
    } else {
      toast.error("Errore durante il salvataggio");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo asset?")) return;
    const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Asset eliminato"); load(); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Patrimonio</h1>
          <p className="text-muted-foreground text-sm mt-1">Tutti i tuoi asset in un posto solo. Prezzi aggiornati in tempo reale.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </Button>
          <Button className="rounded-xl gap-2" onClick={() => setShowDialog(true)}>
            <Plus size={16} />Aggiungi asset
          </Button>
        </div>
      </div>

      {/* Riepilogo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Valore totale", value: formatEuro(totalValue), color: "text-foreground" },
          { label: "Costo acquisto", value: totalCost > 0 ? formatEuro(totalCost) : "—", color: "text-muted-foreground" },
          { label: "Guadagno/Perdita", value: totalCost > 0 ? formatEuro(totalGainLoss) : "—", color: totalGainLoss >= 0 ? "text-emerald-600" : "text-destructive" },
          { label: "Performance %", value: totalCost > 0 ? formatPercent(totalGainPct) : "—", color: totalGainPct >= 0 ? "text-emerald-600" : "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista asset */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)
          ) : assets.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <TrendingUp size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">Nessun asset</p>
                <p className="text-sm text-muted-foreground mt-1">Aggiungi ETF, azioni, crypto o liquidità per monitorare il tuo patrimonio.</p>
                <Button className="mt-4 rounded-xl gap-2" onClick={() => setShowDialog(true)}>
                  <Plus size={16} />Aggiungi asset
                </Button>
              </CardContent>
            </Card>
          ) : (
            assets.map((a) => (
              <Card key={a.id} className="border-border/50 shadow-sm group">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ backgroundColor: (TYPE_COLORS[a.type] ?? "#94a3b8") + "25", color: TYPE_COLORS[a.type] ?? "#94a3b8" }}>
                        {a.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{a.name}</p>
                          <Badge variant="secondary" className="text-xs rounded-lg">{TYPE_LABELS[a.type]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {a.quantity} unità
                          {a.currentPrice != null && ` · ${formatEuro(a.currentPrice)}/unità`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-sm">{a.currentValue != null ? formatEuro(a.currentValue) : "—"}</p>
                        {a.gainLossPercent != null && (
                          <div className={`flex items-center justify-end gap-1 text-xs ${a.gainLossPercent >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {a.gainLossPercent >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {formatPercent(a.gainLossPercent)}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon"
                        className="w-8 h-8 rounded-xl opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(a.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Grafico allocazione */}
        {pieData.length > 0 && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Allocazione</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatEuro(Number(v))} contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", background: "var(--card)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatEuro(d.value)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({Math.round((d.value / totalValue) * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Aggiungi asset</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Tipo asset</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? "" })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder={form.type === "ETF" ? "Vanguard FTSE All-World" : form.type === "CRYPTO" ? "Bitcoin" : "Apple Inc."}
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" required />
            </div>
            <div className="space-y-2">
              <Label>Simbolo ticker</Label>
              <Input
                placeholder={form.type === "ETF" ? "VWCE.DE" : form.type === "CRYPTO" ? "BTC" : "AAPL"}
                value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="rounded-xl" required
              />
              <p className="text-xs text-muted-foreground">
                {form.type === "ETF" || form.type === "STOCK" ? "Usa il simbolo Yahoo Finance (es. VWCE.DE, ENI.MI)" :
                  form.type === "CRYPTO" ? "Usa il simbolo standard (BTC, ETH, SOL...)" :
                    "Inserisci un identificatore univoco"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantità</Label>
                <Input type="number" step="any" min="0" placeholder="10" value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="rounded-xl" required />
              </div>
              <div className="space-y-2">
                <Label>Prezzo acquisto (€)</Label>
                <Input type="number" step="any" min="0" placeholder="Opzionale" value={form.buyPrice}
                  onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} className="rounded-xl" />
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
