import { useCallback, useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Lightbulb, Pencil, RefreshCw, Search, Trash2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FinanceTrend } from '@/components/finance-trend';
import { investmentTrend } from '@/lib/finance-trends';
import { getQuotes, searchSymbols } from '@/lib/quotes.functions';
import { money, useLedger, type Holding } from '@/store/ledger';
import { loanMath } from '@/components/debts';

const KINDS = ['Stocks', 'Mutual funds', 'ETF', 'Crypto', 'FD / Bonds', 'Gold', 'Silver', 'Other'];
const METAL: Record<string, string> = { Gold: 'GOLD-G', Silver: 'SILVER-G' };
const isFixed = (k: string) => k === 'FD / Bonds';
/** Accrued value of a fixed deposit / bond, compounded quarterly from its start date. */
const fixedValue = (h: Holding) => { const yrs = Math.max(0, (Date.now() - new Date(h.date).getTime()) / (365.25 * 864e5)); return Math.round(h.qty * h.buyPrice * Math.pow(1 + (h.rate ?? 0) / 400, 4 * yrs) * 100) / 100; };
const todayKey = () => format(new Date(), 'yyyy-MM-dd');

/** Rule-based, educational suggestions derived from the user's own records. */
export function portfolioTips(): { title: string; body: string }[] {
  const s = useLedger.getState(); const cur = s.profile?.currency || 'USD'; const tips: { title: string; body: string }[] = [];
  const total = s.holdings.reduce((a, h) => a + h.currentValue, 0);
  const byKind = s.holdings.reduce<Record<string, number>>((a, h) => { a[h.kind] = (a[h.kind] ?? 0) + h.currentValue; return a; }, {});
  const monthlySpend = s.entries.filter(e => e.type === 'expense' && e.date >= format(new Date(Date.now() - 90 * 864e5), 'yyyy-MM-dd')).reduce((a, e) => a + e.amount, 0) / 3;
  const cash = s.goals.reduce((a, g) => a + g.saved, 0);
  if (!s.holdings.length) tips.push({ title: 'Start small and regular', body: 'A monthly SIP / automatic investment into a low-cost index fund builds wealth steadily through compounding.' });
  if (monthlySpend > 0 && cash < monthlySpend * 3) tips.push({ title: 'Build an emergency fund first', body: `Keep about ${money(monthlySpend * 6, cur)} (6 months of spending) in savings before taking more market risk. You have ${money(cash, cur)} saved.` });
  const top = s.holdings.slice().sort((a, b) => b.currentValue - a.currentValue)[0];
  if (top && total > 0 && top.currentValue / total > 0.4 && s.holdings.length > 1) tips.push({ title: 'Reduce concentration', body: `${top.name} is ${Math.round(top.currentValue / total * 100)}% of your portfolio. Spreading money across more holdings lowers the risk of one big drop.` });
  if (total > 0 && Object.keys(byKind).length === 1) tips.push({ title: 'Diversify across asset types', body: `Everything is in ${Object.keys(byKind)[0]}. Mixing equity, debt (FD/bonds) and a little gold smooths out swings.` });
  if (total > 0 && (byKind['Crypto'] ?? 0) / total > 0.15) tips.push({ title: 'Crypto share is high', body: `Crypto is ${Math.round((byKind['Crypto'] ?? 0) / total * 100)}% of your portfolio. Many planners keep high-volatility assets under 5–10%.` });
  const losers = s.holdings.filter(h => h.qty * h.buyPrice > 0 && h.currentValue / (h.qty * h.buyPrice) < 0.8);
  if (losers.length) tips.push({ title: 'Review losing positions', body: `${losers.map(h => h.name).join(', ')} ${losers.length > 1 ? 'are' : 'is'} down 20%+. Check whether the reason you bought still holds, rather than averaging down automatically.` });
  const costly = s.loans.filter(l => l.rate >= 12 && loanMath(l).balance > 0.5);
  if (costly.length) tips.push({ title: 'Pay off costly debt', body: `${costly.map(l => `${l.name} (${l.rate}%)`).join(', ')} costs more than most investments safely earn. Prepaying it is a guaranteed return.` });
  const manual = s.holdings.filter(h => !h.symbol && ['Stocks', 'ETF', 'Crypto', 'Mutual funds'].includes(h.kind));
  if (manual.length) tips.push({ title: 'Turn on live prices', body: `Add a ticker symbol to ${manual.map(h => h.name).join(', ')} so values update automatically.` });
  if (s.holdings.length) tips.push({ title: 'Rebalance once a year', body: 'Bring your mix back to your target split yearly. It makes you sell high and buy low by rule, not emotion.' });
  return tips.slice(0, 5);
}

export function InvestmentsPage() {
  const s = useLedger(); const currency = s.profile?.currency || 'USD';
  const [name, setName] = useState(''); const [kind, setKind] = useState('Stocks'); const [symbol, setSymbol] = useState('');
  const [rate, setRate] = useState(''); const [qty, setQty] = useState(''); const [buy, setBuy] = useState(''); const [value, setValue] = useState('');
  const [results, setResults] = useState<{ symbol: string; name: string; exchange: string }[]>([]);
  const [loading, setLoading] = useState(false); const [lastAt, setLastAt] = useState<string | null>(null);
  const invested = s.holdings.reduce((a, h) => a + h.qty * h.buyPrice, 0);
  const current = s.holdings.reduce((a, h) => a + h.currentValue, 0); const gain = current - invested;

  const refresh = useCallback(async (quiet = false) => {
    const day0 = todayKey();
    useLedger.getState().set({ holdings: useLedger.getState().holdings.map(h => { if (!isFixed(h.kind) || !h.rate) return h; const v = fixedValue(h); return { ...h, currentValue: v, priceAt: new Date().toISOString(), valuations: [...(h.valuations ?? []).filter(x => x.date !== day0), { date: day0, value: v }] }; }) });
    const hs = useLedger.getState().holdings.filter(h => h.symbol);
    if (!hs.length) return;
    setLoading(true);
    try {
      const { quotes, at } = await getQuotes({ data: { symbols: hs.map(h => h.symbol!), currency } });
      const day = todayKey(); let failed = 0;
      useLedger.getState().set({ holdings: useLedger.getState().holdings.map(h => {
        const q = h.symbol ? quotes[h.symbol.toUpperCase()] : undefined;
        if (!h.symbol) return h; if (!q) { failed++; return h; }
        const v = Math.round(q.price * h.qty * 100) / 100;
        return { ...h, currentValue: v, lastPrice: q.price, priceCurrency: q.nativeCurrency, priceAt: at, valuations: [...(h.valuations ?? []).filter(x => x.date !== day), { date: day, value: v }] };
      }) });
      setLastAt(at);
      if (!quiet) failed ? toast.error(`${failed} symbol${failed > 1 ? 's' : ''} could not be priced`) : toast.success('Prices updated');
    } catch { if (!quiet) toast.error('Could not reach the price service'); }
    finally { setLoading(false); }
  }, [currency]);

  useEffect(() => { void refresh(true); const t = setInterval(() => void refresh(true), 60000); return () => clearInterval(t); }, [refresh]);

  const lookup = async () => { if (!name.trim()) return; const r = await searchSymbols({ data: { q: name.trim(), kind } }); setResults(r); if (!r.length) toast('No matching ticker found'); };

  const add = async () => {
    const fixed = isFixed(kind); const q = fixed ? 1 : Number(qty), b = Number(buy);
    if (!name.trim() || !(q > 0) || !(b >= 0)) { toast.error(fixed ? 'Enter name and amount invested' : 'Enter name, quantity and buy price'); return; }
    const sym = fixed ? undefined : (METAL[kind] ?? (symbol.trim().toUpperCase() || undefined));
    const h: Holding = { id: crypto.randomUUID(), name: name.trim(), kind, qty: q, buyPrice: b, currentValue: Number(value) || q * b, date: todayKey(), symbol: sym, rate: fixed ? Number(rate) || 0 : undefined };
    s.set({ holdings: [...s.holdings, h] }); setName(''); setQty(''); setBuy(''); setValue(''); setSymbol(''); setRate(''); setResults([]);
    if (fixed) { void refresh(true); }
    toast.success('Holding added');
    if (h.symbol) await refresh();
  };
  const tips = portfolioTips();

  return <div className="section-stack space-y-5">
    <div className="page-heading"><p className="text-xs uppercase font-semibold mb-1">YOUR FINANCES</p><h1 className="text-3xl font-semibold">Investments</h1><p className="text-sm mt-1">Live prices for listed holdings, manual values for the rest.</p></div>
    <div className="hero-surface rounded-[28px] p-6">
      <div className="flex justify-between items-start"><p className="text-sm opacity-70">Portfolio value</p><Button variant="ghost" size="icon" className="pill text-hero-foreground hover:bg-hero-foreground/10" aria-label="Refresh prices" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></Button></div>
      <p className="text-4xl font-semibold mt-1">{money(current, currency)}</p>
      <p className="text-sm opacity-80 mt-3">Invested {money(invested, currency)} · <span className={gain >= 0 ? 'text-positive' : 'text-destructive'}>{gain >= 0 ? '+' : ''}{money(gain, currency)} ({invested ? (gain / invested * 100).toFixed(1) : 0}%)</span></p>
      {lastAt && <p className="text-xs opacity-60 mt-1">Live prices updated {formatDistanceToNow(new Date(lastAt), { addSuffix: true })} · refreshes every minute</p>}
    </div>
    <div className="panel p-5"><FinanceTrend title="Portfolio performance" points={investmentTrend(s.holdings)} currency={currency} primaryLabel="Current value" comparisonLabel="Amount invested" emptyText="Add a holding to see its performance." />
      <p className={`text-sm font-semibold mt-4 ${gain >= 0 ? 'text-positive' : 'text-destructive'}`}>{gain >= 0 ? 'Unrealized profit' : 'Unrealized loss'}: {gain >= 0 ? '+' : '−'}{money(Math.abs(gain), currency)}</p></div>

    <div className="panel p-5 space-y-3">
      <h2 className="font-semibold flex items-center gap-2"><Lightbulb size={17} className="text-warning" /> Ways to grow your assets</h2>
      {tips.map(t => <div key={t.title} className="rounded-2xl bg-secondary p-3"><p className="text-sm font-semibold">{t.title}</p><p className="text-sm text-muted-foreground mt-0.5">{t.body}</p></div>)}
      <p className="text-xs text-muted-foreground">General guidance based on your entries, not personalised financial advice.</p>
    </div>

    <div className="panel p-5">
      <h2 className="font-semibold mb-2">Holdings</h2>
      {s.holdings.length ? s.holdings.map(h => { const pl = h.currentValue - h.qty * h.buyPrice; return <div key={h.id} className="py-4 border-b last:border-0">
        <div className="flex justify-between gap-2"><div className="min-w-0"><p className="font-medium truncate">{h.name}{h.symbol && <span className="ml-2 text-xs rounded-full bg-secondary px-2 py-0.5">{h.symbol}</span>}</p><p className="text-xs text-muted-foreground">{h.kind} · {h.qty} @ {money(h.buyPrice, currency)}{h.lastPrice ? ` · now ${money(h.lastPrice, currency)}` : ''}</p>{(h.symbol || (isFixed(h.kind) && !!h.rate)) && <p className="text-[11px] text-positive flex items-center gap-1 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-positive" /> Live{h.priceAt ? ` · ${format(new Date(h.priceAt), 'HH:mm')}` : ''}</p>}</div>
          <div className="text-right shrink-0"><p className="font-semibold">{money(h.currentValue, currency)}</p><p className={`text-xs ${pl >= 0 ? 'text-positive' : 'text-destructive'}`}>{pl >= 0 ? '+' : ''}{money(pl, currency)}</p></div></div>
        <div className="flex gap-2 mt-3">
          {!h.symbol && !isFixed(h.kind) && <Button size="sm" variant="secondary" className="pill" onClick={() => { const n = prompt('Updated total value', String(h.currentValue)); if (n !== null && Number(n) >= 0) s.set({ holdings: s.holdings.map(x => x.id === h.id ? { ...x, currentValue: Number(n), valuations: [...(x.valuations ?? []).filter(v => v.date !== todayKey()), { date: todayKey(), value: Number(n) }] } : x) }); }}><Pencil size={14} /> Update value</Button>}
          {!isFixed(h.kind) && !METAL[h.kind] && <Button size="sm" variant="secondary" className="pill" onClick={() => { const sym = prompt('Ticker symbol for live price (e.g. AAPL, RELIANCE.NS, BTC-USD). Leave empty to remove.', h.symbol ?? ''); if (sym !== null) { s.set({ holdings: s.holdings.map(x => x.id === h.id ? { ...x, symbol: sym.trim().toUpperCase() || undefined } : x) }); void refresh(); } }}><TrendingUp size={14} /> {h.symbol ? 'Change symbol' : 'Live price'}</Button>}
          <Button size="sm" variant="ghost" className="pill" aria-label={`Delete ${h.name}`} onClick={() => s.set({ holdings: s.holdings.filter(x => x.id !== h.id) })}><Trash2 size={14} /></Button>
        </div></div>; }) : <p className="text-sm text-muted-foreground py-4 text-center">No holdings yet.</p>}
    </div>

    <div className="panel p-5 space-y-3">
      <h2 className="font-semibold">Add a holding</h2>
      <div className="relative"><input className="field w-full" style={{ paddingLeft: 44 }} placeholder="Name (e.g. Apple, Bitcoin)" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void lookup(); } }} /><button type="button" aria-label="Search ticker" onClick={() => void lookup()} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-full text-muted-foreground hover:bg-secondary"><Search size={16} /></button></div>
      {!!results.length && <div className="rounded-2xl border divide-y overflow-hidden">{results.map(r => <button key={r.symbol} type="button" className="w-full text-left px-4 py-2 text-sm hover:bg-secondary" onClick={() => { setSymbol(r.symbol); setName(r.name); setResults([]); }}><b>{r.symbol}</b> · {r.name} <span className="text-muted-foreground">{r.exchange}</span></button>)}</div>}
      <div className="grid grid-cols-2 gap-2">
        <select className="field min-w-0" value={kind} onChange={e => { setKind(e.target.value); setSymbol(METAL[e.target.value] ?? ''); setResults([]); }} aria-label="Type">{KINDS.map(k => <option key={k}>{k}</option>)}</select>
        {isFixed(kind) ? <input className="field min-w-0" inputMode="decimal" placeholder="Interest % / year" value={rate} onChange={e => setRate(e.target.value)} />
          : <input className="field min-w-0" placeholder="Ticker (optional)" value={symbol} readOnly={!!METAL[kind]} onChange={e => setSymbol(e.target.value)} />}
        {isFixed(kind) ? <input className="field min-w-0 col-span-2" inputMode="decimal" placeholder="Amount invested" value={buy} onChange={e => setBuy(e.target.value)} /> : <>
        <input className="field min-w-0" inputMode="decimal" placeholder={METAL[kind] ? 'Grams' : 'Quantity'} value={qty} onChange={e => setQty(e.target.value)} />
        <input className="field min-w-0" inputMode="decimal" placeholder={METAL[kind] ? 'Buy price / gram' : 'Buy price / unit'} value={buy} onChange={e => setBuy(e.target.value)} /></>}
      </div>
      {!symbol && !isFixed(kind) && <input className="field" inputMode="decimal" placeholder="Current total value (no ticker)" value={value} onChange={e => setValue(e.target.value)} />}
      <p className="text-xs text-muted-foreground">With a ticker, the value updates live from market prices (converted to {currency}). Stocks/ETFs: AAPL, RELIANCE.NS · Crypto: BTC-USD · Mutual funds: search by fund name · Gold & silver: live price per gram · FD / bonds: value grows daily at your interest rate.</p>
      <Button className="pill w-full" onClick={add}>Add holding</Button>
    </div>
  </div>;
}
