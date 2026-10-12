import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { money, useLedger } from '@/store/ledger';

export function SavingsContributions({ goalId }: { goalId: string }) {
  const s = useLedger();
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const entries = s.entries.filter(entry => entry.type === 'saving' && entry.goalId === goalId)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!entries.length) return null;

  return <div className="mt-5" aria-label="Savings contributions">
    <h4 className="text-xs font-medium text-muted-foreground mb-2">Contributions</h4>
    {entries.map(entry => <div key={entry.id} className="border-t py-3">
      {editing === entry.id ? <form className="space-y-3" onSubmit={event => {
        event.preventDefault();
        const value = Number(amount);
        const current = useLedger.getState();
        const original = current.entries.find(item => item.id === entry.id);
        const goal = current.goals.find(item => item.id === goalId);
        if (!original || !goal || !Number.isFinite(value) || value <= 0 || !date) return;
        const saved = goal.saved + value - original.amount;
        if (saved < 0) { toast.error('This change would make the saved total negative.'); return; }
        current.set({
          entries: current.entries.map(item => item.id === entry.id ? { ...item, amount: value, date } : item),
          goals: current.goals.map(item => item.id === goalId ? { ...item, saved } : item),
        });
        setEditing(null);
        toast.success('Contribution updated');
      }}>
        <label className="block text-xs text-muted-foreground">Amount<Input className="mt-1" aria-label="Contribution amount" type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required /></label>
        <label className="block text-xs text-muted-foreground">Date<Input className="mt-1" aria-label="Contribution date" type="date" value={date} onChange={event => setDate(event.target.value)} required /></label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={() => setEditing(null)}><X size={16} />Cancel</Button>
          <Button type="submit"><Check size={16} />Save</Button>
        </div>
      </form> : <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0"><p className="text-sm font-medium tabular-nums">{money(entry.amount, s.profile?.currency)}</p><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${entry.date}T12:00:00`))}</p></div>
        <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Edit contribution ${entry.date}`} title="Edit contribution" onClick={() => { setEditing(entry.id); setAmount(String(entry.amount)); setDate(entry.date); }}><Pencil size={16} /></Button>
      </div>}
    </div>)}
  </div>;
}