import { useState } from 'react';
import { addMonths, differenceInCalendarDays, format } from 'date-fns';
import { toast } from 'sonner';
import { CalendarClock, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money, useLedger, type Loan } from '@/store/ledger';

const uid = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);

function Stat({ label, value, tone }: { label: string; value: string; tone?: string | undefined }) {
  return <div className="panel p-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p><p className={`text-xl font-semibold mt-1 ${tone ?? ''}`}>{value}</p></div>;
}

/* ---------------- Borrows ---------------- */
export function BorrowsPage() {
  const s = useLedger(); const currency = s.profile?.currency || 'USD';
  const [person, setPerson] = useState(''); const [amount, setAmount] = useState(''); const [due, setDue] = useState(format(addMonths(new Date(), 1), 'yyyy-MM'));
  const [pay, setPay] = useState<Record<string, string>>({});
  const open = s.borrows.filter(b => b.repaid < b.amount);
  const owed = open.reduce((a, b) => a + b.amount - b.repaid, 0);
  const thisMonth = format(new Date(), 'yyyy-MM');
  const dueNow = open.filter(b => b.dueMonth <= thisMonth).reduce((a, b) => a + b.amount - b.repaid, 0);

  const add = () => {
    const n = Number(amount); if (!person.trim() || !(n > 0) || !due) return toast.error('Enter who, how much and the repay month');
    s.set({ borrows: [{ id: uid(), person: person.trim(), amount: n, repaid: 0, borrowedOn: today(), dueMonth: due }, ...s.borrows] });
    setPerson(''); setAmount(''); toast.success('Borrow added');
  };
  const repay = (id: string) => {
    const b = s.borrows.find(x => x.id === id); if (!b) return;
    const n = Math.min(Number(pay[id] || b.amount - b.repaid), b.amount - b.repaid); if (!(n > 0)) return;
    s.set({ borrows: s.borrows.map(x => x.id === id ? { ...x, repaid: x.repaid + n } : x) });
    s.addEntry({ title: `Repaid ${b.person}`, amount: n, type: 'transfer', category: 'Other', date: today(), note: 'Borrow repayment' });
    setPay({ ...pay, [id]: '' }); toast.success('Repayment recorded');
  };

  // group by repay month
  const months = [...new Set(open.map(b => b.dueMonth))].sort();

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold">Borrows</h1><p className="text-muted-foreground">Money you borrowed and the month you'll repay it.</p></div>
    <div className="grid grid-cols-2 gap-3"><Stat label="Total owed" value={money(owed, currency)} /><Stat label="Due this month" value={money(dueNow, currency)} tone={dueNow ? 'text-destructive' : ''} /></div>
    <div className="panel p-5 space-y-3">
      <h2 className="font-semibold">Add a borrow</h2>
      <input className="field" placeholder="Borrowed from (name)" value={person} onChange={e => setPerson(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input className="field" inputMode="decimal" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
        <input className="field" type="month" aria-label="Repay month" value={due} onChange={e => setDue(e.target.value)} />
      </div>
      <Button className="pill w-full" onClick={add}>Add borrow</Button>
    </div>
    {!open.length && <p className="text-center text-muted-foreground text-sm py-6">No open borrows. You're all clear.</p>}
    {months.map(m => {
      const label = format(new Date(`${m}-01T12:00:00`), 'MMMM yyyy'); const late = m < thisMonth;
      return <section key={m} className="space-y-2">
        <h3 className={`text-sm font-semibold flex items-center gap-2 ${late ? 'text-destructive' : ''}`}><CalendarClock size={15} /> Repay in {label}{late && ' · overdue'}{m === thisMonth && ' · this month'}</h3>
        {open.filter(b => b.dueMonth === m).map(b => {
          const left = b.amount - b.repaid;
          return <div key={b.id} className="panel p-4 space-y-3">
            <div className="flex justify-between gap-2"><div><p className="font-semibold">{b.person}</p><p className="text-xs text-muted-foreground">Borrowed {format(new Date(`${b.borrowedOn}T12:00:00`), 'MMM d, yyyy')} · {money(b.amount, currency)}</p></div><p className="font-semibold">{money(left, currency)}</p></div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-positive" style={{ width: `${(b.repaid / b.amount) * 100}%` }} /></div>
            <div className="flex gap-2">
              <input className="field" inputMode="decimal" placeholder={`Repay ${left.toFixed(2)}`} value={pay[b.id] ?? ''} onChange={e => setPay({ ...pay, [b.id]: e.target.value })} />
              <Button className="pill" onClick={() => repay(b.id)}><Check size={16} /> Repay</Button>
              <Button variant="ghost" size="icon" className="pill shrink-0" aria-label="Delete" onClick={() => s.set({ borrows: s.borrows.filter(x => x.id !== b.id) })}><Trash2 size={16} /></Button>
            </div>
          </div>;
        })}
      </section>;
    })}
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
function nextEmi(day: number) {
  const now = new Date(); const d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28));
  if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setMonth(d.getMonth() + 1);
  return d;
}

export function LoansPage() {
  const s = useLedger(); const currency = s.profile?.currency || 'USD';
  const [f, setF] = useState({ name: '', principal: '', rate: '', emi: '', emiDay: '5', startDate: today(), paidEmis: '0' });
  const [extra, setExtra] = useState<Record<string, number>>({});
  const active = s.loans.filter(l => loanMath(l).balance > 0.5);
  const outstanding = active.reduce((a, l) => a + loanMath(l).balance, 0);
  const monthlyEmi = active.reduce((a, l) => a + l.emi, 0);

  const add = () => {
    const l: Loan = { id: uid(), name: f.name.trim(), principal: +f.principal, rate: +f.rate, emi: +f.emi, emiDay: Math.min(31, Math.max(1, +f.emiDay)), startDate: f.startDate, paidEmis: Math.max(0, +f.paidEmis) };
    if (!l.name || !(l.principal > 0) || !(l.emi > 0) || l.rate < 0) return toast.error('Fill in loan name, amount, rate and EMI');
    if (loanMath(l).n === Infinity) return toast.error('EMI is too low to cover the interest');
    s.set({ loans: [l, ...s.loans] }); setF({ ...f, name: '', principal: '', rate: '', emi: '', paidEmis: '0' }); toast.success('Loan added');
  };
  const payEmi = (l: Loan) => {
    s.set({ loans: s.loans.map(x => x.id === l.id ? { ...x, paidEmis: x.paidEmis + 1 } : x) });
    s.addEntry({ title: `${l.name} EMI`, amount: l.emi, type: 'expense', category: 'Bills', date: today(), note: 'Loan EMI' });
    toast.success('EMI recorded');
  };

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold">Loans</h1><p className="text-muted-foreground">EMI dates, remaining balance and how to finish sooner.</p></div>
    <div className="grid grid-cols-2 gap-3"><Stat label="Outstanding" value={money(outstanding, currency)} /><Stat label="Monthly EMIs" value={money(monthlyEmi, currency)} /></div>
    <div className="panel p-5 space-y-3">
      <h2 className="font-semibold">Add a loan</h2>
      <input className="field" placeholder="Loan name (e.g. Car loan)" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <input className="field" inputMode="decimal" placeholder="Loan amount" value={f.principal} onChange={e => setF({ ...f, principal: e.target.value })} />
        <input className="field" inputMode="decimal" placeholder="Interest % / year" value={f.rate} onChange={e => setF({ ...f, rate: e.target.value })} />
        <input className="field" inputMode="decimal" placeholder="Monthly EMI" value={f.emi} onChange={e => setF({ ...f, emi: e.target.value })} />
        <input className="field" inputMode="numeric" aria-label="EMI day of month" placeholder="EMI day (1-31)" value={f.emiDay} onChange={e => setF({ ...f, emiDay: e.target.value })} />
        <input className="field" type="date" aria-label="Start date" value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} />
        <input className="field" inputMode="numeric" aria-label="EMIs already paid" placeholder="EMIs already paid" value={f.paidEmis} onChange={e => setF({ ...f, paidEmis: e.target.value })} />
      </div>
      <Button className="pill w-full" onClick={add}>Add loan</Button>
    </div>
    {!s.loans.length && <p className="text-center text-muted-foreground text-sm py-6">No loans yet.</p>}
    {s.loans.map(l => {
      const x = extra[l.id] ?? Math.round(l.emi * 0.1); const m = loanMath(l, x); const next = nextEmi(l.emiDay);
      const days = differenceInCalendarDays(next, new Date()); const done = m.balance <= 0.5;
      const paidPct = Math.min(100, (1 - m.balance / l.principal) * 100);
      return <div key={l.id} className="panel p-5 space-y-4">
        <div className="flex justify-between gap-2">
          <div><p className="font-semibold">{l.name}</p><p className="text-xs text-muted-foreground">{l.rate}% · {money(l.emi, currency)}/month · {l.paidEmis} EMIs paid</p></div>
          <Button variant="ghost" size="icon" className="pill" aria-label="Delete loan" onClick={() => s.set({ loans: s.loans.filter(y => y.id !== l.id) })}><Trash2 size={16} /></Button>
        </div>
        {done ? <p className="text-positive font-semibold">Loan fully repaid 🎉</p> : <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-muted-foreground text-xs">Balance left</p><p className="font-semibold">{money(m.balance, currency)}</p></div>
            <div><p className="text-muted-foreground text-xs">Next EMI</p><p className={`font-semibold ${days <= 3 ? 'text-destructive' : ''}`}>{format(next, 'MMM d')} · {days === 0 ? 'today' : `in ${days}d`}</p></div>
            <div><p className="text-muted-foreground text-xs">EMIs left</p><p className="font-semibold">{m.n}</p></div>
            <div><p className="text-muted-foreground text-xs">Last EMI</p><p className="font-semibold">{format(addMonths(next, m.n - 1), 'MMM yyyy')}</p></div>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-positive" style={{ width: `${paidPct}%` }} /></div>
          <div className="rounded-2xl bg-secondary p-4 space-y-2">
            <p className="font-semibold text-sm">Finish it earlier</p>
            <label className="text-xs text-muted-foreground flex justify-between"><span>Pay extra each month</span><b className="text-foreground">{money(x, currency)}</b></label>
            <input type="range" min={0} max={Math.max(l.emi, 1)} step={Math.max(1, Math.round(l.emi / 50))} value={x} onChange={e => setExtra({ ...extra, [l.id]: +e.target.value })} className="w-full accent-[var(--primary)]" />
            {x > 0 ? <p className="text-sm">Pay <b>{money(l.emi + x, currency)}</b> monthly to close in <b>{m.n2} months</b> ({format(addMonths(next, m.n2 - 1), 'MMM yyyy')}) — <b className="text-positive">{m.n - m.n2} months sooner</b>, saving about <b className="text-positive">{money(m.saved, currency)}</b> in interest.</p>
              : <p className="text-sm text-muted-foreground">Move the slider to see how extra payments shorten the loan.</p>}
            <p className="text-xs text-muted-foreground">Tip: put bonuses or windfalls toward the balance as a part-prepayment — check your lender's prepayment charges first.</p>
          </div>
          <Button className="pill w-full" onClick={() => payEmi(l)}><Check size={16} /> Mark this EMI paid</Button>
        </>}
      </div>;
    })}
  </div>;
}
