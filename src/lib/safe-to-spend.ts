import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import type { Entry } from '@/store/ledger';

export type SafeDay = { date: string; allowance: number; spent: number };

/**
 * Daily allowance = monthly base ÷ days in month. Whatever is left unspent on a
 * day is carried in full into the next day's allowance. Overspending does NOT
 * reduce the next day — each day starts from the full base amount.
 */
export function safeToSpendHistory(entries: Entry[], base: number, today = new Date()): SafeDay[] {
  const start = startOfMonth(today);
  const perDay = base / getDaysInMonth(today);
  const out = new Map<string, number>();
  for (const e of entries) {
    if (e.type === 'expense' || e.type === 'saving' || e.type === 'investment') out.set(e.date, (out.get(e.date) || 0) + e.amount);
  }
  const days: SafeDay[] = [];
  let carry = 0;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const date = format(d, 'yyyy-MM-dd');
    const allowance = perDay + carry;
    const spent = out.get(date) || 0;
    days.push({ date, allowance, spent });
    carry = allowance - spent;
  }
  return days;
}
