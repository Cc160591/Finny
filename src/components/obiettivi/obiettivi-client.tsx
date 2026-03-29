"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Target, CheckCircle, Pause, Trash2, Edit2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatEuro } from "@/lib/format";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

interface Goal {
  id: string; name: string; description?: string; targetAmount: number;
  currentAmount: number; deadline?: string; color: string; icon: string; status: string;
}

const COLORS = ["#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#3B82F6", "#F97316", "#EC4899", "#06B6D4"];

export function ObiettiviClient() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", targetAmount: "", currentAmount: "0",
    deadline: "", color: "#F59E0B",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/goals");
    const data = await res.json();
    setGoals(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditGoal(null);
    setForm({ name: "", description: "", targetAmount: "", currentAmount: "0", deadline: "", color: "#F59E0B" });
    setShowDialog(true);
  }

  function openEdit(goal: Goal) {
    setEditGoal(goal);
    setForm({
      name: goal.name,
      description: goal.description ?? "",
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline ? goal.deadline.split("T")[0] : "",
      color: goal.color,
    });
    setShowDialog(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      targetAmount: parseFloat(form.targetAmount),
      currentAmount: parseFloat(form.currentAmount) || 0,
      deadline: form.deadline || null,
      color: form.color,
    };

    const url = editGoal ? `/api/goals/${editGoal.id}` : "/api/goals";
    const method = editGoal ? "PATCH" : "POST";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(editGoal ? "Obiettivo aggiornato!" : "Obiettivo creato!");
      setShowDialog(false);
      load();
    } else {
      toast.error("Errore durante il salvataggio");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo obiettivo?")) return;
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Obiettivo eliminato"); load(); }
  }

  async function toggleStatus(goal: Goal) {
    const newStatus = goal.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { load(); }
  }

  async function markCompleted(goal: Goal) {
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED", currentAmount: goal.targetAmount }),
    });
    if (res.ok) { toast.success("Obiettivo completato! 🎉"); load(); }
  }

  const active = goals.filter((g) => g.status === "ACTIVE");
  const paused = goals.filter((g) => g.status === "PAUSED");
  const completed = goals.filter((g) => g.status === "COMPLETED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Obiettivi</h1>
          <p className="text-muted-foreground text-sm mt-1">Sognare è gratis. Realizzare costa, ma noi ti aiutiamo a monitorarlo.</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={openCreate}>
          <Plus size={16} />Nuovo obiettivo
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Target size={28} className="text-muted-foreground" />
          </div>
          <p className="font-medium">Nessun obiettivo</p>
          <p className="text-sm text-muted-foreground mt-1">Crea il tuo primo obiettivo finanziario. La vacanza dei sogni si paga da sola... o quasi.</p>
          <Button className="mt-4 rounded-xl gap-2" onClick={openCreate}>
            <Plus size={16} />Crea obiettivo
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Attivi ({active.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {active.map((g) => <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleStatus} onComplete={markCompleted} />)}
              </div>
            </div>
          )}
          {paused.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">In pausa ({paused.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {paused.map((g) => <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleStatus} onComplete={markCompleted} />)}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Completati ({completed.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {completed.map((g) => <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleStatus} onComplete={markCompleted} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editGoal ? "Modifica obiettivo" : "Nuovo obiettivo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="es. Vacanza in Giappone" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" required />
            </div>
            <div className="space-y-2">
              <Label>Descrizione (opzionale)</Label>
              <Textarea placeholder="Perché è importante per te..." value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl resize-none" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Obiettivo (€)</Label>
                <Input type="number" step="0.01" min="1" placeholder="5000" value={form.targetAmount}
                  onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} className="rounded-xl" required />
              </div>
              <div className="space-y-2">
                <Label>Accumulato (€)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0" value={form.currentAmount}
                  onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Scadenza (opzionale)</Label>
              <Input type="date" value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Colore</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} type="button"
                    className={`w-8 h-8 rounded-xl transition-transform ${form.color === c ? "scale-110 ring-2 ring-offset-2 ring-foreground/30" : ""}`}
                    style={{ backgroundColor: c }} onClick={() => setForm({ ...form, color: c })} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDialog(false)}>Annulla</Button>
              <Button type="submit" className="flex-1 rounded-xl" disabled={saving}>
                {saving ? "Salvataggio..." : editGoal ? "Aggiorna" : "Crea"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalCard({ goal, onEdit, onDelete, onToggle, onComplete }: {
  goal: Goal;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
  onToggle: (g: Goal) => void;
  onComplete: (g: Goal) => void;
}) {
  const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const isCompleted = goal.status === "COMPLETED";

  return (
    <Card className="border-border/50 shadow-sm group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: goal.color + "25" }}>
              <Target size={18} style={{ color: goal.color }} />
            </div>
            <div>
              <p className="font-semibold">{goal.name}</p>
              {goal.deadline && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scadenza: {format(new Date(goal.deadline), "d MMM yyyy", { locale: it })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isCompleted && <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg" onClick={() => onEdit(goal)}><Edit2 size={13} /></Button>}
            <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => onDelete(goal.id)}><Trash2 size={13} /></Button>
          </div>
        </div>

        {goal.description && <p className="text-xs text-muted-foreground mb-3">{goal.description}</p>}

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span>{formatEuro(goal.currentAmount)}</span>
            <span className="font-semibold text-muted-foreground">{Math.round(pct)}%</span>
          </div>
          <Progress value={pct} className="h-2" style={{ "--progress-color": goal.color } as React.CSSProperties} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Mancano {formatEuro(Math.max(goal.targetAmount - goal.currentAmount, 0))}</span>
            <span>{formatEuro(goal.targetAmount)}</span>
          </div>
        </div>

        {!isCompleted && (
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1 rounded-xl text-xs gap-1.5" onClick={() => onToggle(goal)}>
              {goal.status === "ACTIVE" ? <><Pause size={12} />Pausa</> : <><Target size={12} />Riprendi</>}
            </Button>
            <Button size="sm" className="flex-1 rounded-xl text-xs gap-1.5" onClick={() => onComplete(goal)}>
              <CheckCircle size={12} />Completato
            </Button>
          </div>
        )}
        {isCompleted && (
          <div className="flex items-center gap-2 mt-4 text-emerald-600 text-sm">
            <CheckCircle size={16} /><span className="font-medium">Obiettivo raggiunto!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
