import { format, subMonths } from 'date-fns';
import type { Entry, Goal, Holding, Recurring } from '@/store/ledger';
import type { TrendPoint } from '@/components/finance-trend';

export const monthKey = (date: Date) => format(date, 'yyyy-MM');
export const sixMonths = (now = new Date()) => Array.from({ length: 6 }, (_, i) => monthKey(subMonths(now, 5 - i)));

export function expenseTrend(entries: Entry[], now = new Date()): TrendPoint[] {
  return sixMonths(now).map(key => ({ label: format(new Date(`${key}-01T12:00:00`), 'MMM'), value: entries.filter(e => e.type === 'expense' && e.date.startsWith(key)).reduce((sum, e) => sum + e.amount, 0) }));
}

export function recurringTrend(schedules: Recurring[], now = new Date()): TrendPoint[] {
  const active = schedules.filter(r => r.active);
  if (!active.length) return [];
  const months = Array.from({ length: 6 }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() + i, 1)));
  const amounts = new Map(months.map(key => [key, { received: 0, paid: 0 }]));
  for (const item of active) {
    const next = new Date(`${item.nextDue}T12:00:00`);
    const end = new Date(now.getFullYear(), now.getMonth() + 6, 1);
    let count = 0;
    while (next < end && count < 100) {
      const month = amounts.get(monthKey(next));
      if (month) month[item.type === 'income' ? 'received' : 'paid'] += item.amount;
      if (item.frequency === 'weekly') next.setDate(next.getDate() + 7);
      else next.setMonth(next.getMonth() + 1);
      count++;
    }
  }
  return months.map(key => ({ label: format(new Date(`${key}-01T12:00:00`), 'MMM'), value: amounts.get(key)?.received ?? 0, comparison: amounts.get(key)?.paid ?? 0 }));
}

export function savingsTrend(goals: Goal[], entries: Entry[]): TrendPoint[] {
  const linked = entries.filter(e => e.type === 'saving' && goals.some(g => g.id === e.goalId));
  const saved = goals.reduce((sum, g) => sum + g.saved, 0);
  const opening = Math.max(0, saved - linked.reduce((sum, e) => sum + e.amount, 0));
  const dates = [...new Set(linked.map(e => e.date))].sort();
  if (dates.length === 0) return saved > 0 ? [{ label: 'Opening', value: 0 }, { label: 'Current', value: saved }] : [];
  return [{ label: 'Opening', value: opening }, ...dates.map(date => ({ label: format(new Date(`${date}T12:00:00`), 'MMM d'), value: opening + linked.filter(e => e.date <= date).reduce((sum, e) => sum + e.amount, 0) }))];
}

export function investmentTrend(holdings: Holding[], now = new Date()): TrendPoint[] {
  if (!holdings.length) return [];
  const dates = [...new Set([...holdings.map(h => h.date), ...holdings.flatMap(h => h.valuations?.map(v => v.date) ?? []), format(now, 'yyyy-MM-dd')])].sort();
  return dates.map(date => {
    const active = holdings.filter(h => h.date <= date);
    const comparison = active.reduce((sum, h) => sum + h.qty * h.buyPrice, 0);
    const value = active.reduce((sum, h) => {
      const latest = [...(h.valuations ?? [])].filter(v => v.date <= date).sort((a, b) => b.date.localeCompare(a.date))[0];
      return sum + (latest?.value ?? (date < format(now, 'yyyy-MM-dd') ? h.qty * h.buyPrice : h.currentValue));
    }, 0);
    return { label: format(new Date(`${date}T12:00:00`), 'MMM d'), value, comparison };
  });
}
