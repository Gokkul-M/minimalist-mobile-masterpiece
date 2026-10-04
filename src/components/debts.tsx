import { useState, type ReactNode } from 'react';
import { addMonths, differenceInCalendarDays, format } from 'date-fns';
import { toast } from 'sonner';
import { CalendarClock, CalendarPlus, Check, ChevronDown, History, Pencil, Trash2, Undo2, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money, useLedger, type Borrow, type Loan, type Payment } from '@/store/ledger';

const uid = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const fmtDay = (d: string) => format(new Date(`${d}T12:00:00`), 'MMM d, yyyy');

function Stat({ label, value, tone }: { label: string; value: string; tone?: string | undefined }) {
  return <div className="panel p-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p><p className={`text-xl font-semibold mt-1 ${tone ?? ''}`}>{value}</p></div>;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-[60] bg-foreground/40 flex items-end sm:items-center justify-center" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="bg-card rounded-t-[30px] sm:rounded-[30px] w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{title}</h2><Button variant="ghost" size="icon" className="pill" aria-label="Close" onClick={onClose}><X size={18} /></Button></div>
      {children}
    </div>
  </div>;
}

function HistoryList({ items, currency }: { items: Payment[]; currency: string }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">No payments yet.</p>;
  return <ul className="space-y-1">{[...items].reverse().map((p, i) => <li key={i} className="flex justify-between text-sm"><span className="text-muted-foreground">{fmtDay(p.date)}{p.note ? ` · ${p.note}` : ''}</span><b>{money(p.amount, currency)}</b></li>)}</ul>;
}

/* ---------------- Borrows ---------------- */
type BorrowForm = { person: string; amount: string; due: string; borrowedOn: string; note: string };
const emptyBorrow = (): BorrowForm => ({ person: '', amount: '', due: format(addMonths(new Date(), 1), 'yyyy-MM'), borrowedOn: today(), note: '' });

export function BorrowsPage() {
  const s = useLedger(); const currency = s.profile?.currency || 'USD';
  const [form, setForm] = useState<BorrowForm | null>(null); const [editId, setEditId] = useState<string | null>(null);
  const [repayFor, setRepayFor] = useState<Borrow | null>(null); const [repayAmt, setRepayAmt] = useState(''); const [repayDate, setRepayDate] = useState(today());
  const [openHist, setOpenHist] = useState<string | null>(null); const [showSettled, setShowSettled] = useState(false);
  const open = s.borrows.filter(b => b.repaid < b.amount); const settled = s.borrows.filter(b => b.repaid >= b.amount);
  const owed = open.reduce((a, b) => a + b.amount - b.repaid, 0);
  const thisMonth = format(new Date(), 'yyyy-MM');
  const dueNow = open.filter(b => b.dueMonth <= thisMonth).reduce((a, b) => a + b.amount - b.repaid, 0);
  const update = (id: string, patch: Partial<Borrow>) => s.set({ borrows: s.borrows.map(x => x.id === id ? { ...x, ...patch } : x) });

  const save = () => {
    if (!form) return; const n = Number(form.amount);
    if (!form.person.trim() || !(n > 0) || !form.due) { toast.error('Enter who, how much and the repay month'); return; }
    if (editId) { const cur = s.borrows.find(b => b.id === editId); if (cur && n < cur.repaid) { toast.error('Amount is less than what you already repaid'); return; } update(editId, { person: form.person.trim(), amount: n, dueMonth: form.due, borrowedOn: form.borrowedOn, note: form.note.trim() || undefined }); toast.success('Borrow updated'); }
    else { s.set({ borrows: [{ id: uid(), person: form.person.trim(), amount: n, repaid: 0, borrowedOn: form.borrowedOn, dueMonth: form.due, note: form.note.trim() || undefined, history: [] }, ...s.borrows] }); toast.success('Borrow added'); }
    setForm(null); setEditId(null);
  };
  const repay = () => {
    const b = repayFor; if (!b) return; const left = b.amount - b.repaid;
    const n = Math.min(Number(repayAmt || left), left); if (!(n > 0)) { toast.error('Enter an amount'); return; }
    update(b.id, { repaid: b.repaid + n, history: [...(b.history ?? []), { date: repayDate, amount: n }] });
    s.addEntry({ title: `Repaid ${b.person}`, amount: n, type: 'transfer', category: 'Other', date: repayDate, note: 'Borrow repayment' });
    toast.success(n >= left ? `${b.person} fully repaid` : 'Repayment recorded'); setRepayFor(null); setRepayAmt('');
  };
  const undo = (b: Borrow) => {
    const last = b.history?.at(-1); if (!last) return;
    update(b.id, { repaid: Math.max(0, b.repaid - last.amount), history: b.history?.slice(0, -1) }); toast('Last repayment undone');
  };
  const months = [...new Set(open.map(b => b.dueMonth))].sort();

  const card = (b: Borrow) => {
    const left = b.amount - b.repaid;
    return <div key={b.id} className="panel p-4 space-y-3">
      <div className="flex justify-between gap-2"><div className="min-w-0"><p className="font-semibold truncate">{b.person}</p><p className="text-xs text-muted-foreground">Borrowed {fmtDay(b.borrowedOn)} · {money(b.amount, currency)}</p>{b.note && <p className="text-xs text-muted-foreground mt-1">{b.note}</p>}</div><p className="font-semibold shrink-0">{left > 0 ? money(left, currency) : 'Settled'}</p></div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-positive" style={{ width: `${Math.min(100, (b.repaid / b.amount) * 100)}%` }} /></div>
      <div className="flex flex-wrap gap-2">
        {left > 0 && <Button className="pill" onClick={() => { setRepayFor(b); setRepayAmt(''); setRepayDate(today()); }}><Check size={16} /> Repay</Button>}
        {left > 0 && <Button variant="secondary" className="pill" onClick={() => { update(b.id, { dueMonth: format(addMonths(new Date(`${b.dueMonth}-01T12:00:00`), 1), 'yyyy-MM') }); toast('Moved to next month'); }}><CalendarPlus size={16} /> +1 month</Button>}
        <Button variant="ghost" size="icon" className="pill" aria-label="Edit" onClick={() => { setEditId(b.id); setForm({ person: b.person, amount: String(b.amount), due: b.dueMonth, borrowedOn: b.borrowedOn, note: b.note ?? '' }); }}><Pencil size={16} /></Button>
        <Button variant="ghost" size="icon" className="pill" aria-label="Payment history" onClick={() => setOpenHist(openHist === b.id ? null : b.id)}><History size={16} /></Button>
        <Button variant="ghost" size="icon" className="pill" aria-label="Delete" onClick={() => { if (confirm(`Delete borrow from ${b.person}?`)) s.set({ borrows: s.borrows.filter(x => x.id !== b.id) }); }}><Trash2 size={16} /></Button>
      </div>
      {openHist === b.id && <div className="rounded-2xl bg-secondary p-3 space-y-2"><div className="flex justify-between items-center"><p className="text-sm font-semibold">Repayments</p>{!!b.history?.length && <Button variant="ghost" size="sm" className="pill" onClick={() => undo(b)}><Undo2 size={14} /> Undo last</Button>}</div><HistoryList items={b.history ?? []} currency={currency} /></div>}
    </div>;
  };

  return <div className="space-y-6">
    <div className="flex items-end justify-between gap-3"><div><h1 className="text-3xl font-semibold">Borrows</h1><p className="text-muted-foreground">Money you borrowed and the month you'll repay it.</p></div><Button className="pill shrink-0" onClick={() => { setEditId(null); setForm(emptyBorrow()); }}>+ Add</Button></div>
    <div className="grid grid-cols-2 gap-3"><Stat label="Total owed" value={money(owed, currency)} /><Stat label="Due this month" value={money(dueNow, currency)} tone={dueNow ? 'text-destructive' : ''} /></div>
    {!open.length && <p className="text-center text-muted-foreground text-sm py-6">No open borrows. You're all clear.</p>}
    {months.map(m => {
      const label = format(new Date(`${m}-01T12:00:00`), 'MMMM yyyy'); const late = m < thisMonth;
      return <section key={m} className="space-y-2">
        <h3 className={`text-sm font-semibold flex items-center gap-2 ${late ? 'text-destructive' : ''}`}><CalendarClock size={15} /> Repay in {label}{late && ' · overdue'}{m === thisMonth && ' · this month'}</h3>
        {open.filter(b => b.dueMonth === m).map(card)}
      </section>;
    })}
    {!!settled.length && <section className="space-y-2"><button type="button" className="text-sm font-semibold flex items-center gap-1 text-muted-foreground" onClick={() => setShowSettled(!showSettled)}><ChevronDown size={15} className={showSettled ? 'rotate-180' : ''} /> Settled ({settled.length})</button>{showSettled && settled.map(card)}</section>}

    {form && <Sheet title={editId ? 'Edit borrow' : 'Add a borrow'} onClose={() => { setForm(null); setEditId(null); }}>
      <input className="field" placeholder="Borrowed from (name)" value={form.person} onChange={e => setForm({ ...form, person: e.target.value })} />
      <input className="field" inputMode="decimal" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
      <label className="text-xs text-muted-foreground block">Borrowed on<input className="field mt-1" type="date" value={form.borrowedOn} onChange={e => setForm({ ...form, borrowedOn: e.target.value })} /></label>
      <label className="text-xs text-muted-foreground block">Repay month<input className="field mt-1" type="month" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} /></label>
      <input className="field" placeholder="Note (optional)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
      <Button className="pill w-full" onClick={save}>{editId ? 'Save changes' : 'Add borrow'}</Button>
    </Sheet>}
    {repayFor && <Sheet title={`Repay ${repayFor.person}`} onClose={() => setRepayFor(null)}>
      <p className="text-sm text-muted-foreground">{money(repayFor.amount - repayFor.repaid, currency)} left</p>
      <input className="field" inputMode="decimal" autoFocus placeholder={`Amount (default ${(repayFor.amount - repayFor.repaid).toFixed(2)})`} value={repayAmt} onChange={e => setRepayAmt(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">{[0.25, 0.5, 1].map(f => <Button key={f} variant="secondary" className="pill" onClick={() => setRepayAmt(((repayFor.amount - repayFor.repaid) * f).toFixed(2))}>{f === 1 ? 'Full' : `${f * 100}%`}</Button>)}</div>
      <input className="field" type="date" aria-label="Payment date" value={repayDate} onChange={e => setRepayDate(e.target.value)} />
      <Button className="pill w-full" onClick={repay}><Check size={16} /> Record repayment</Button>
    </Sheet>}
  </div>;
}

/* ---------------- Loans ---------------- */
export function loanMath(l: Loan, extra = 0) {
  const r = l.rate / 1200; const k = l.paidEmis;
  const balance = Math.max(0, r ? l.principal * (1 + r) ** k - l.emi * (((1 + r) ** k - 1) / r) : l.principal - l.emi * k);
  const months = (pay: number) => { if (balance <= 0) return 0; if (!r) return Math.ceil(balance / pay); const x = 1 - (balance * r) / pay; return x <= 0 ? Infinity : Math.ceil(-Math.log(x) / Math.log(1 + r)); };
  const n = months(l.emi); const n2 = months(l.emi + extra);
  const interestLeft = n === Infinity ? Infinity : n * l.emi - balance;
  const interestLeft2 = n2 === Infinity ? Infinity : n2 * (l.emi + extra) - balance;
  return { balance, n, n2, saved: Math.max(0, interestLeft - interestLeft2), interestLeft };
}
/** Standard EMI for principal p, annual rate, n months. */
export const calcEmi = (p: number, rate: number, n: number) => { const r = rate / 1200; return !n ? 0 : r ? (p * r * (1 + r) ** n) / ((1 + r) ** n - 1) : p / n; };
function nextEmi(day: number) {
  const now = new Date(); const d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28));
  if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setMonth(d.getMonth() + 1);
  return d;
}

type LoanForm = { name: string; lender: string; principal: string; rate: string; emi: string; tenure: string; emiDay: string; startDate: string; paidEmis: string };
const emptyLoan = (): LoanForm => ({ name: '', lender: '', principal: '', rate: '', emi: '', tenure: '', emiDay: '5', startDate: today(), paidEmis: '0' });

export function LoansPage() {
  const s = useLedger(); const currency = s.profile?.currency || 'USD';
  const [form, setForm] = useState<LoanForm | null>(null); const [editId, setEditId] = useState<string | null>(null);
  const [extra, setExtra] = useState<Record<string, number>>({});
  const [prepayFor, setPrepayFor] = useState<Loan | null>(null); const [prepayAmt, setPrepayAmt] = useState(''); const [prepayMode, setPrepayMode] = useState<'tenure' | 'emi'>('tenure');
  const [openHist, setOpenHist] = useState<string | null>(null);
  const active = s.loans.filter(l => loanMath(l).balance > 0.5);
  const outstanding = active.reduce((a, l) => a + loanMath(l).balance, 0);
  const monthlyEmi = active.reduce((a, l) => a + l.emi, 0);
  const update = (id: string, patch: Partial<Loan>) => s.set({ loans: s.loans.map(x => x.id === id ? { ...x, ...patch } : x) });
  const suggestedEmi = form && +form.principal > 0 && +form.tenure > 0 ? calcEmi(+form.principal, +form.rate || 0, +form.tenure) : 0;

  const save = () => {
    if (!form) return;
    const emi = +form.emi || Math.round(suggestedEmi * 100) / 100;
    const base = { name: form.name.trim(), lender: form.lender.trim() || undefined, principal: +form.principal, rate: +form.rate || 0, emi, emiDay: Math.min(31, Math.max(1, Math.round(+form.emiDay) || 1)), startDate: form.startDate, paidEmis: Math.max(0, Math.round(+form.paidEmis) || 0) };
    if (!base.name || !(base.principal > 0) || !(base.emi > 0) || base.rate < 0) { toast.error('Fill in name, amount, rate and EMI (or tenure)'); return; }
    if (loanMath({ ...base, id: 'x' }).n === Infinity) { toast.error('EMI is too low to cover the interest'); return; }
    if (editId) { update(editId, base); toast.success('Loan updated'); }
    else { s.set({ loans: [{ ...base, id: uid(), history: [] }, ...s.loans] }); toast.success('Loan added'); }
    setForm(null); setEditId(null);
  };
  const payEmi = (l: Loan) => {
    update(l.id, { paidEmis: l.paidEmis + 1, history: [...(l.history ?? []), { date: today(), amount: l.emi, note: 'EMI' }] });
    s.addEntry({ title: `${l.name} EMI`, amount: l.emi, type: 'expense', category: 'Bills', date: today(), note: 'Loan EMI' });
    toast.success('EMI recorded');
  };
  const undoEmi = (l: Loan) => {
    const last = l.history?.at(-1);
    if (!last || last.note !== 'EMI' || l.paidEmis < 1) { toast.error('Only the last EMI can be undone'); return; }
    update(l.id, { paidEmis: l.paidEmis - 1, history: l.history?.slice(0, -1) }); toast('Last EMI undone');
  };
  const prepay = () => {
    const l = prepayFor; if (!l) return; const { balance, n } = loanMath(l); const amt = Math.min(Number(prepayAmt), balance);
    if (!(amt > 0)) { toast.error('Enter an amount'); return; }
    const newBal = balance - amt;
    // Re-base the loan on the reduced balance: either keep EMI (shorter tenure) or keep tenure (lower EMI).
    const emi = prepayMode === 'emi' && newBal > 0 ? Math.round(calcEmi(newBal, l.rate, n) * 100) / 100 : l.emi;
    update(l.id, { principal: newBal, paidEmis: 0, emi, startDate: today(), history: [...(l.history ?? []), { date: today(), amount: amt, note: 'Part-prepayment' }] });
    s.addEntry({ title: `${l.name} prepayment`, amount: amt, type: 'expense', category: 'Bills', date: today(), note: 'Loan prepayment' });
    toast.success(newBal <= 0.5 ? 'Loan closed 🎉' : prepayMode === 'emi' ? `New EMI ${money(emi, currency)}` : 'Tenure reduced'); setPrepayFor(null); setPrepayAmt('');
  };

  return <div className="space-y-6">
    <div className="flex items-end justify-between gap-3"><div><h1 className="text-3xl font-semibold">Loans</h1><p className="text-muted-foreground">EMI dates, remaining balance and how to finish sooner.</p></div><Button className="pill shrink-0" onClick={() => { setEditId(null); setForm(emptyLoan()); }}>+ Add</Button></div>
    <div className="grid grid-cols-2 gap-3"><Stat label="Outstanding" value={money(outstanding, currency)} /><Stat label="Monthly EMIs" value={money(monthlyEmi, currency)} /></div>
    {!s.loans.length && <p className="text-center text-muted-foreground text-sm py-6">No loans yet. Tap + Add to track one.</p>}
    {s.loans.map(l => {
      const x = extra[l.id] ?? Math.round(l.emi * 0.1); const m = loanMath(l, x); const next = nextEmi(l.emiDay);
      const days = differenceInCalendarDays(next, new Date()); const done = m.balance <= 0.5;
      const paidPct = Math.min(100, (1 - m.balance / l.principal) * 100);
      return <div key={l.id} className="panel p-5 space-y-4">
        <div className="flex justify-between gap-2">
          <div className="min-w-0"><p className="font-semibold truncate">{l.name}</p><p className="text-xs text-muted-foreground">{l.lender ? `${l.lender} · ` : ''}{l.rate}% · {money(l.emi, currency)}/month · {l.paidEmis} EMIs paid</p></div>
          <div className="flex shrink-0">
            <Button variant="ghost" size="icon" className="pill" aria-label="Edit loan" onClick={() => { setEditId(l.id); setForm({ name: l.name, lender: l.lender ?? '', principal: String(l.principal), rate: String(l.rate), emi: String(l.emi), tenure: '', emiDay: String(l.emiDay), startDate: l.startDate, paidEmis: String(l.paidEmis) }); }}><Pencil size={16} /></Button>
            <Button variant="ghost" size="icon" className="pill" aria-label="Payment history" onClick={() => setOpenHist(openHist === l.id ? null : l.id)}><History size={16} /></Button>
            <Button variant="ghost" size="icon" className="pill" aria-label="Delete loan" onClick={() => { if (confirm(`Delete ${l.name}?`)) s.set({ loans: s.loans.filter(y => y.id !== l.id) }); }}><Trash2 size={16} /></Button>
          </div>
        </div>
        {openHist === l.id && <div className="rounded-2xl bg-secondary p-3 space-y-2"><div className="flex justify-between items-center"><p className="text-sm font-semibold">Payments</p>{l.history?.at(-1)?.note === 'EMI' && <Button variant="ghost" size="sm" className="pill" onClick={() => undoEmi(l)}><Undo2 size={14} /> Undo last EMI</Button>}</div><HistoryList items={l.history ?? []} currency={currency} /></div>}
        {done ? <p className="text-positive font-semibold">Loan fully repaid 🎉</p> : <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-muted-foreground text-xs">Balance left</p><p className="font-semibold">{money(m.balance, currency)}</p></div>
            <div><p className="text-muted-foreground text-xs">Next EMI</p><p className={`font-semibold ${days <= 3 ? 'text-destructive' : ''}`}>{format(next, 'MMM d')} · {days === 0 ? 'today' : `in ${days}d`}</p></div>
            <div><p className="text-muted-foreground text-xs">EMIs left</p><p className="font-semibold">{m.n}</p></div>
            <div><p className="text-muted-foreground text-xs">Last EMI</p><p className="font-semibold">{format(addMonths(next, m.n - 1), 'MMM yyyy')}</p></div>
            <div className="col-span-2"><p className="text-muted-foreground text-xs">Interest still to pay</p><p className="font-semibold">{money(m.interestLeft, currency)}</p></div>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-positive" style={{ width: `${paidPct}%` }} /></div>
          <div className="rounded-2xl bg-secondary p-4 space-y-2">
            <p className="font-semibold text-sm">Finish it earlier</p>
            <label className="text-xs text-muted-foreground flex justify-between"><span>Pay extra each month</span><b className="text-foreground">{money(x, currency)}</b></label>
            <input type="range" min={0} max={Math.max(l.emi, 1)} step={Math.max(1, Math.round(l.emi / 50))} value={x} onChange={e => setExtra({ ...extra, [l.id]: +e.target.value })} className="w-full accent-[var(--primary)]" />
            {x > 0 ? <p className="text-sm">Pay <b>{money(l.emi + x, currency)}</b> monthly to close in <b>{m.n2} months</b> ({format(addMonths(next, m.n2 - 1), 'MMM yyyy')}) — <b className="text-positive">{m.n - m.n2} months sooner</b>, saving about <b className="text-positive">{money(m.saved, currency)}</b> in interest.</p>
              : <p className="text-sm text-muted-foreground">Move the slider to see how extra payments shorten the loan.</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button className="pill" onClick={() => payEmi(l)}><Check size={16} /> EMI paid</Button>
            <Button variant="secondary" className="pill" onClick={() => { setPrepayFor(l); setPrepayAmt(''); setPrepayMode('tenure'); }}><Zap size={16} /> Prepay</Button>
          </div>
        </>}
      </div>;
    })}

    {form && <Sheet title={editId ? 'Edit loan' : 'Add a loan'} onClose={() => { setForm(null); setEditId(null); }}>
      <input className="field" placeholder="Loan name (e.g. Car loan)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <input className="field" placeholder="Lender (optional)" value={form.lender} onChange={e => setForm({ ...form, lender: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <input className="field" inputMode="decimal" placeholder="Loan amount" value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })} />
        <input className="field" inputMode="decimal" placeholder="Interest % / year" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} />
        <input className="field" inputMode="numeric" placeholder="Tenure (months)" value={form.tenure} onChange={e => setForm({ ...form, tenure: e.target.value })} />
        <input className="field" inputMode="decimal" placeholder={suggestedEmi ? `EMI ≈ ${suggestedEmi.toFixed(0)}` : 'Monthly EMI'} value={form.emi} onChange={e => setForm({ ...form, emi: e.target.value })} />
      </div>
      {!!suggestedEmi && !form.emi && <p className="text-xs text-muted-foreground">EMI will be calculated as {money(suggestedEmi, currency)} from amount, rate and tenure.</p>}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">EMI day<input className="field mt-1" inputMode="numeric" value={form.emiDay} onChange={e => setForm({ ...form, emiDay: e.target.value })} /></label>
        <label className="text-xs text-muted-foreground">EMIs paid<input className="field mt-1" inputMode="numeric" value={form.paidEmis} onChange={e => setForm({ ...form, paidEmis: e.target.value })} /></label>
      </div>
      <label className="text-xs text-muted-foreground block">Start date<input className="field mt-1" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></label>
      <Button className="pill w-full" onClick={save}>{editId ? 'Save changes' : 'Add loan'}</Button>
    </Sheet>}
    {prepayFor && (() => { const { balance, n } = loanMath(prepayFor); const amt = Math.min(Number(prepayAmt) || 0, balance); const nb = balance - amt;
      const after = { ...prepayFor, principal: nb, paidEmis: 0, emi: prepayMode === 'emi' && nb > 0 ? calcEmi(nb, prepayFor.rate, n) : prepayFor.emi }; const am = loanMath(after);
      return <Sheet title={`Prepay ${prepayFor.name}`} onClose={() => setPrepayFor(null)}>
        <p className="text-sm text-muted-foreground">Balance {money(balance, currency)} · {n} EMIs left</p>
        <input className="field" inputMode="decimal" autoFocus placeholder="Lump-sum amount" value={prepayAmt} onChange={e => setPrepayAmt(e.target.value)} />
        <div className="grid grid-cols-2 gap-2"><Button variant={prepayMode === 'tenure' ? 'default' : 'secondary'} className="pill" onClick={() => setPrepayMode('tenure')}>Reduce tenure</Button><Button variant={prepayMode === 'emi' ? 'default' : 'secondary'} className="pill" onClick={() => setPrepayMode('emi')}>Reduce EMI</Button></div>
        {amt > 0 && <p className="text-sm">{nb <= 0.5 ? 'This closes the loan.' : prepayMode === 'tenure' ? <>EMIs left drop from <b>{n}</b> to <b>{am.n}</b>, saving about <b className="text-positive">{money(Math.max(0, loanMath(prepayFor).interestLeft - am.interestLeft), currency)}</b> interest.</> : <>EMI drops to <b>{money(after.emi, currency)}</b> for the remaining {n} months.</>}</p>}
        <p className="text-xs text-muted-foreground">Reducing tenure usually saves more interest. Check your lender's prepayment charges.</p>
        <Button className="pill w-full" onClick={prepay}>Record prepayment</Button>
      </Sheet>; })()}
  </div>;
}
