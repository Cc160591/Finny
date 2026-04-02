"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Category {
  id: string; name: string; icon: string; color: string; type: string;
}

const COLORS = ["#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#3B82F6", "#F97316", "#EC4899", "#06B6D4", "#84CC16", "#6366F1", "#14B8A6", "#94a3b8"];

const ICONS = ["🏠", "🚗", "🍕", "🛒", "👕", "💊", "📚", "🎬", "✈️", "💪", "🐾", "💡", "📱", "🎮", "🍺", "☕", "💰", "📈", "🎁", "🏥", "🏋️", "🌳", "🎵", "🔧", "💼", "🏦", "🧾", "💳", "🎓", "🍔"];

const emptyForm = { name: "", icon: "🏷️", color: "#8B5CF6", type: "EXPENSE" };

export function CategorieClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditCategory(null);
    setForm(emptyForm);
    setShowDialog(true);
  }

  function openEdit(c: Category) {
    setEditCategory(c);
    setForm({ name: c.name, icon: c.icon, color: c.color, type: c.type });
    setShowDialog(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editCategory ? `/api/categories/${editCategory.id}` : "/api/categories";
    const method = editCategory ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(editCategory ? "Categoria aggiornata!" : "Categoria aggiunta!");
      setShowDialog(false);
      load();
    } else {
      toast.error("Errore durante il salvataggio");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa categoria? Le transazioni collegate perderanno la categoria.")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Categoria eliminata"); load(); }
    else toast.error("Errore durante l'eliminazione");
  }

  const expenses = categories.filter((c) => c.type === "EXPENSE");
  const incomes = categories.filter((c) => c.type === "INCOME");

  function CategoryList({ items, label }: { items: Category[]; label: string }) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{label}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-2xl">
            Nessuna categoria
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card shadow-sm group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: c.color + "25" }}
                >
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-muted-foreground">{c.type === "EXPENSE" ? "Uscita" : "Entrata"}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => openEdit(c)}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorie</h1>
          <p className="text-sm text-muted-foreground mt-1">{categories.length} categorie totali</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={openAdd}>
          <Plus size={16} />Nuova categoria
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-8">
          <CategoryList items={expenses} label="Uscite" />
          <CategoryList items={incomes} label="Entrate" />
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editCategory ? "Modifica categoria" : "Nuova categoria"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="es. Alimentari"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-xl" required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Uscita</SelectItem>
                  <SelectItem value="INCOME">Entrata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Icona</Label>
              <div className="grid grid-cols-10 gap-1.5 p-3 border border-border rounded-xl max-h-32 overflow-y-auto">
                {ICONS.map((icon) => (
                  <button
                    key={icon} type="button"
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all ${form.icon === icon ? "bg-primary/15 ring-2 ring-primary/40" : "hover:bg-muted"}`}
                    onClick={() => setForm({ ...form, icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Oppure inserisci un emoji:</span>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="rounded-xl w-20 text-center text-lg"
                  maxLength={4}
                />
              </div>
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
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDialog(false)}>
                Annulla
              </Button>
              <Button type="submit" className="flex-1 rounded-xl" disabled={saving}>
                {saving ? "Salvataggio..." : editCategory ? "Salva" : "Aggiungi"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
