import { differenceInCalendarDays, format } from 'date-fns';
import { toast } from 'sonner';
import { useLedger, money, monthEntries } from '@/store/ledger';
import { loanMath } from '@/components/debts';

type Reminder = { key: string; title: string; body: string };

function nextEmi(day: number) {
  const now = new Date(); const d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28));
  if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setMonth(d.getMonth() + 1);
  return d;
}

export function collectReminders(): Reminder[] {
  const s = useLedger.getState(); const cur = s.profile?.currency || 'USD'; const today = new Date(); const out: Reminder[] = [];
  for (const l of s.loans) {
    if (loanMath(l).balance <= 0.5) continue;
    const d = nextEmi(l.emiDay); const days = differenceInCalendarDays(d, today);
    if (days <= 3) out.push({ key: `emi-${l.id}-${format(d, 'yyyy-MM')}`, title: `${l.name} EMI ${days === 0 ? 'due today' : `in ${days} day${days > 1 ? 's' : ''}`}`, body: `${money(l.emi, cur)} on ${format(d, 'MMM d')}` });
  }
  const month = format(today, 'yyyy-MM');
  for (const b of s.borrows) {
    if (b.repaid >= b.amount || b.dueMonth > month) continue;
    out.push({ key: `borrow-${b.id}-${month}`, title: b.dueMonth < month ? `Overdue: repay ${b.person}` : `Repay ${b.person} this month`, body: `${money(b.amount - b.repaid, cur)} left to repay` });
  }
  for (const r of s.recurring) {
    if (!r.active || r.type !== 'expense') continue;
    const days = differenceInCalendarDays(new Date(`${r.nextDue}T12:00:00`), today);
    if (days >= 0 && days <= 2) out.push({ key: `rec-${r.id}-${r.nextDue}`, title: `${r.title} ${days === 0 ? 'due today' : `due in ${days} day${days > 1 ? 's' : ''}`}`, body: money(r.amount, cur) });
  }
  const spent = monthEntries(s.entries).filter(e => e.type === 'expense');
  for (const [cat, limit] of Object.entries(s.budgets)) {
    if (!limit) continue;
    const used = spent.filter(e => e.category === cat).reduce((a, e) => a + e.amount, 0); const pct = used / limit;
    if (pct >= 0.8) out.push({ key: `budget-${cat}-${month}-${pct >= 1 ? 100 : 80}`, title: pct >= 1 ? `${cat} budget exceeded` : `${cat} budget ${Math.round(pct * 100)}% used`, body: `${money(used, cur)} of ${money(limit, cur)}` });
  }
  if (s.globalCap) {
    const used = spent.reduce((a, e) => a + e.amount, 0); const pct = used / s.globalCap;
    if (pct >= 0.8) out.push({ key: `budget-all-${month}-${pct >= 1 ? 100 : 80}`, title: pct >= 1 ? 'Monthly budget exceeded' : `Monthly budget ${Math.round(pct * 100)}% used`, body: `${money(used, cur)} of ${money(s.globalCap, cur)}` });
  }
  return out;
}

const SEEN = 'ledgerly-reminders-seen';
export function runReminders() {
  if (!useLedger.getState().notifications) return;
  let seen: string[] = [];
  try { seen = JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch { /* ignore */ }
  const fresh = collectReminders().filter(r => !seen.includes(r.key));
  for (const r of fresh) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(r.title, { body: r.body, icon: '/icon-192.png', tag: r.key }); } catch { toast(r.title, { description: r.body }); }
    } else toast(r.title, { description: r.body });
  }
  if (fresh.length) localStorage.setItem(SEEN, JSON.stringify([...seen, ...fresh.map(r => r.key)].slice(-300)));
}

export async function enableDeviceNotifications(): Promise<string> {
  if (!('Notification' in window)) return 'This browser does not support notifications.';
  if (window.top !== window.self) return 'Open the app in its own tab (or the published app) to allow notifications.';
  const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  return p === 'granted' ? 'ok' : 'Notifications are blocked. Allow them in your browser site settings.';
}
