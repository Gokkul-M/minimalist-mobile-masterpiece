import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLedger } from '@/store/ledger';
import { getAdvice } from '@/lib/advisor.functions';
import { safeToSpendHistory } from '@/lib/safe-to-spend';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function AiAdvisor() {
  const s = useLedger();
  const [concern, setConcern] = useState('');
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState('');
  const [error, setError] = useState('');

  const ask = async () => {
    if (concern.trim().length < 3) return;
    setLoading(true); setError(''); setAdvice('');
    const cur = s.profile?.currency || 'USD';
    const since = new Date(); since.setDate(since.getDate() - 90);
    const recent = s.entries.filter((e) => new Date(e.date) >= since);
    const byCat: Record<string, number> = {};
    for (const e of recent) if (e.type === 'expense') byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    const base = s.globalCap || s.monthlyIncome || 0;
    const history = safeToSpendHistory(s.entries, base).map((d) => `${d.date}: allowed ${d.allowance.toFixed(0)}, spent ${d.spent.toFixed(0)}`);
    const income = recent.filter((e) => e.type === 'income').reduce((a, e) => a + e.amount, 0);
    const summary = [
      `Currency: ${cur}`,
      `Monthly spending limit: ${s.globalCap || 'none'}; monthly income: ${s.monthlyIncome || 'unknown'}`,
      `Income last 90 days: ${income.toFixed(0)}`,
      `Expenses by category (last 90 days): ${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c} ${v.toFixed(0)}`).join(', ') || 'none'}`,
      `Category budgets: ${Object.entries(s.budgets).map(([c, v]) => `${c} ${v}`).join(', ') || 'none'}`,
      `Savings goals: ${s.goals.map((g) => `${g.name} ${g.saved}/${g.target}`).join(', ') || 'none'}`,
      `Safe-to-spend this month (unspent carries to next day):\n${history.join('\n') || 'no limit set'}`,
    ].join('\n');
    try {
      const r = await getAdvice({ data: { concern: concern.trim(), summary } });
      if (r.ok) setAdvice(r.text); else setError(r.error);
    } catch { setError('Could not get advice right now.'); }
    setLoading(false);
  };

  return (
    <div className="panel p-5 mb-5">
      <div className="flex items-center gap-2 mb-3"><Sparkles size={16} className="text-primary" /><h2 className="text-lg font-semibold">Ask the money coach</h2></div>
      <p className="text-sm text-muted-foreground mb-3">Describe a goal or worry — like “I want to save 5,000 this month” or “I overspend on food”.</p>
      <Textarea value={concern} onChange={(e) => setConcern(e.target.value)} maxLength={1000} placeholder="What would you like help with?" aria-label="Your spending goal or concern" />
      <Button className="pill mt-3 w-full sm:w-auto" disabled={loading || concern.trim().length < 3} onClick={ask}>{loading ? 'Thinking…' : 'Get suggestions'}</Button>
      {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3 mt-3">{error}</p>}
      {advice && <ul className="mt-4 space-y-2 text-sm">{advice.split('\n').map((l) => l.replace(/^\s*[-*•]\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean).map((l, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span><span>{l}</span></li>)}</ul>}
    </div>
  );
}
