import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Building2, Car, Coins, Gem, Landmark, Package, Pencil, Trash2, Wallet, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money, useLedger, type Asset } from '@/store/ledger';

const KINDS: { kind: string; icon: LucideIcon }[] = [
  { kind: 'Property', icon: Building2 }, { kind: 'Vehicle', icon: Car }, { kind: 'Bank / Cash', icon: Wallet },
  { kind: 'Gold / Jewellery', icon: Gem }, { kind: 'Retirement (PF/PPF/NPS)', icon: Landmark }, { kind: 'Collectibles', icon: Coins }, { kind: 'Other', icon: Package },
];
const iconFor = (k: string) => KINDS.find(x => x.kind === k)?.icon ?? Package;
const today = () => format(new Date(), 'yyyy-MM-dd');
type Form = { name: string; kind: string; value: string; purchase: string; date: string; note: string };
const empty = (): Form => ({ name: '', kind: 'Property', value: '', purchase: '', date: today(), note: '' });

export function AssetsPage() {
  const s = useLedger(); const currency = s.profile?.currency || 'USD';
  const [form, setForm] = useState<Form | null>(null); const [editId, setEditId] = useState<string | null>(null);
  const total = s.assets.reduce((a, x) => a + x.value, 0);
  const holdings = s.holdings.reduce((a, h) => a + h.currentValue, 0);
  const saved = s.goals.reduce((a, g) => a + g.saved, 0);
  const byKind = s.assets.reduce<Record<string, number>>((a, x) => { a[x.kind] = (a[x.kind] ?? 0) + x.value; return a; }, {});
  const grand = total + holdings + saved;

  const save = () => {
    if (!form) return; const v = Number(form.value);
    if (!form.name.trim() || !(v >= 0) || form.value === '') { toast.error('Enter a name and current value'); return; }
    const purchase = form.purchase ? Number(form.purchase) : undefined;
    if (editId) {
      s.set({ assets: s.assets.map(a => a.id === editId ? { ...a, name: form.name.trim(), kind: form.kind, value: v, purchaseValue: purchase, date: form.date, note: form.note.trim() || undefined, valuations: a.value !== v ? [...(a.valuations ?? []).filter(x => x.date !== today()), { date: today(), value: v }] : a.valuations } : a) });
      toast.success('Asset updated');
    } else {
      const a: Asset = { id: crypto.randomUUID(), name: form.name.trim(), kind: form.kind, value: v, purchaseValue: purchase, date: form.date, note: form.note.trim() || undefined, valuations: [{ date: today(), value: v }] };
      s.set({ assets: [a, ...s.assets] }); toast.success('Asset added');
    }
    setForm(null); setEditId(null);
  };

  return <div className="section-stack space-y-5">
    <div className="page-heading grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"><div className="min-w-0"><p className="text-xs uppercase font-semibold mb-1">YOUR FINANCES</p><h1 className="text-3xl font-semibold truncate">Assets</h1><p className="text-sm mt-1">Everything you own, in one place.</p></div><Button className="pill shrink-0" onClick={() => { setEditId(null); setForm(empty()); }}>+ Add</Button></div>
    <div className="hero-surface rounded-[28px] p-6">
      <p className="text-sm opacity-70">Total assets</p><p className="text-3xl sm:text-4xl font-semibold mt-1 tabular-nums break-all">{money(grand, currency)}</p>
      <div className="grid grid-cols-3 gap-2 mt-4 text-xs [&_p]:truncate [&>div]:min-w-0"><div><p className="opacity-60">Assets</p><p className="font-semibold text-sm">{money(total, currency)}</p></div><div><p className="opacity-60">Investments</p><p className="font-semibold text-sm">{money(holdings, currency)}</p></div><div><p className="opacity-60">Savings</p><p className="font-semibold text-sm">{money(saved, currency)}</p></div></div>
    </div>
    {!!total && <div className="panel p-5 space-y-2"><h2 className="font-semibold">By type</h2>{Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => <div key={k}><div className="flex justify-between text-sm"><span>{k}</span><b>{money(v, currency)} · {Math.round(v / total * 100)}%</b></div><div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-1"><div className="h-full bg-primary" style={{ width: `${v / total * 100}%` }} /></div></div>)}</div>}
    <div className="panel p-5">
      <h2 className="font-semibold mb-2">Your assets</h2>
      {s.assets.length ? s.assets.map(a => { const Icon = iconFor(a.kind); const change = a.purchaseValue !== undefined ? a.value - a.purchaseValue : null; return <div key={a.id} className="flex items-center gap-3 py-3 border-b last:border-0">
        <span className="w-11 h-11 rounded-full bg-secondary grid place-items-center shrink-0"><Icon size={18} /></span>
        <div className="flex-1 min-w-0"><p className="font-medium truncate">{a.name}</p><p className="text-xs text-muted-foreground">{a.kind}{a.note ? ` · ${a.note}` : ''}</p></div>
        <div className="text-right shrink-0"><p className="font-semibold">{money(a.value, currency)}</p>{change !== null && <p className={`text-xs ${change >= 0 ? 'text-positive' : 'text-destructive'}`}>{change >= 0 ? '+' : ''}{money(change, currency)}</p>}</div>
        <Button variant="ghost" size="icon" className="pill shrink-0" aria-label={`Edit ${a.name}`} onClick={() => { setEditId(a.id); setForm({ name: a.name, kind: a.kind, value: String(a.value), purchase: a.purchaseValue !== undefined ? String(a.purchaseValue) : '', date: a.date, note: a.note ?? '' }); }}><Pencil size={15} /></Button>
        <Button variant="ghost" size="icon" className="pill shrink-0" aria-label={`Delete ${a.name}`} onClick={() => { if (confirm(`Delete ${a.name}?`)) s.set({ assets: s.assets.filter(x => x.id !== a.id) }); }}><Trash2 size={15} /></Button>
      </div>; }) : <p className="text-sm text-muted-foreground text-center py-6">Add your home, car, bank balances, gold and more.</p>}
    </div>
    <p className="text-xs text-muted-foreground text-center">Asset values count toward the net worth on your home card.</p>

    {form && <div className="fixed inset-0 z-[60] bg-foreground/40 flex items-end sm:items-center justify-center" onMouseDown={e => { if (e.target === e.currentTarget) setForm(null); }}>
      <div className="bg-card rounded-t-[30px] sm:rounded-[30px] w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{editId ? 'Edit asset' : 'Add an asset'}</h2><Button variant="ghost" size="icon" className="pill" aria-label="Close" onClick={() => setForm(null)}><X size={18} /></Button></div>
        <input className="field" placeholder="Name (e.g. Apartment, Honda City)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <select className="field" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })} aria-label="Type">{KINDS.map(k => <option key={k.kind}>{k.kind}</option>)}</select>
        <div className="grid grid-cols-2 gap-2"><input className="field" inputMode="decimal" placeholder="Current value" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /><input className="field" inputMode="decimal" placeholder="Bought for (optional)" value={form.purchase} onChange={e => setForm({ ...form, purchase: e.target.value })} /></div>
        <label className="text-xs text-muted-foreground block">Acquired on<input className="field mt-1" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
        <input className="field" placeholder="Note (optional)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
        <Button className="pill w-full" onClick={save}>{editId ? 'Save changes' : 'Add asset'}</Button>
      </div>
    </div>}
  </div>;
}
