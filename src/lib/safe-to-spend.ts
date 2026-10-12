import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import type { Entry } from '@/store/ledger';

export type SafeDay = { date: string; allowance: number; spent: number };

/**
 * Daily allowance = what's left of the month's limit divided by the days left
 * in the month (including today). Savings and investments count as money set
 * aside, and every day's spending — including today's — comes straight off
 * the remaining pool, so tomorrow's allowance recalculates from what is left.
 */
export function safeToSpendHistory(entries: Entry[], base: number, today = new Date()): SafeDay[] {
  const start = startOfMonth(today);
  const totalDays = getDaysInMonth(today);
  const spentByDay = new Map<string, number>();
  for (const e of entries) {
    if (e.type === 'expense' || e.type === 'saving' || e.type === 'investment') spentByDay.set(e.date, (spentByDay.get(e.date) || 0) + e.amount);
  }
  const days: SafeDay[] = [];
  let spentBefore = 0;
  let dayIndex = 0;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const date = format(d, 'yyyy-MM-dd');
    const spent = spentByDay.get(date) || 0;
    const daysLeft = totalDays - dayIndex;
    const allowance = daysLeft > 0 ? Math.max(0, (base - spentBefore) / daysLeft) : 0;
    days.push({ date, allowance, spent });
    spentBefore += spent;
    dayIndex++;
  }
  return days;
}
