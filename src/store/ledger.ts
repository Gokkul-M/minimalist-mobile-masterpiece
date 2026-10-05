import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EntryType = 'expense' | 'income' | 'transfer' | 'saving' | 'investment';
export type Entry = { id: string; title: string; amount: number; type: EntryType; category: string; date: string; time?: string | undefined; note?: string; tags?: string[]; location?: string; goalId?: string; splitWith?: string; receipt?: string };
export type Goal = { id: string; name: string; target: number; saved: number; deadline: string };
export type Holding = { id: string; name: string; kind: string; qty: number; buyPrice: number; currentValue: number; date: string; valuations?: { date: string; value: number }[]; symbol?: string | undefined; priceCurrency?: string | undefined; lastPrice?: number | undefined; priceAt?: string | undefined; rate?: number | undefined };
export type Recurring = { id: string; title: string; amount: number; type: 'income' | 'expense'; category: string; nextDue: string; frequency: 'once' | 'weekly' | 'monthly'; active: boolean };
export type Rule = { id: string; title: string; threshold: number; category: string; active: boolean };
export type Payment = { date: string; amount: number; note?: string | undefined };
export type Borrow = { id: string; person: string; amount: number; repaid: number; borrowedOn: string; dueMonth: string; note?: string | undefined; history?: Payment[] | undefined };
export type Asset = { id: string; name: string; kind: string; value: number; purchaseValue?: number | undefined; date: string; note?: string | undefined; valuations?: { date: string; value: number }[] | undefined };
export type Loan = { id: string; name: string; principal: number; rate: number; emi: number; emiDay: number; startDate: string; paidEmis: number; lender?: string | undefined; history?: Payment[] | undefined };
export type Profile = { name: string; email: string; passwordHash?: string; currency: string; pinHash?: string };
export const categories = ['Food & Drink', 'Groceries', 'Shopping', 'Transport', 'Bills', 'Health', 'Entertainment', 'Travel', 'Salary', 'Other'];
type State = {
  profile: Profile | null; session: boolean; onboarded: boolean; walkthroughSeen: boolean; theme: 'light' | 'dark'; entries: Entry[]; goals: Goal[]; holdings: Holding[]; recurring: Recurring[]; rules: Rule[]; budgets: Record<string, number>; monthlyIncome: number; dailyCap: number; globalCap: number; rollover: boolean; customCategories: string[]; hiddenCategories: string[]; rates: Record<string, number>; notifications: boolean; otherAssets: number; borrowedBalance: number; borrows: Borrow[]; loans: Loan[]; assets: Asset[];
  set: (patch: Partial<Omit<State, 'set' | 'addEntry' | 'updateEntry' | 'removeEntry' | 'processRecurring' | 'loadDemo' | 'reset'>>) => void;
  addEntry: (entry: Omit<Entry, 'id'>) => void; updateEntry: (id: string, entry: Partial<Entry>) => void; removeEntry: (id: string) => void; processRecurring: () => void; loadDemo: () => void; reset: () => void;
};
const initial = { profile: null, session: false, onboarded: false, walkthroughSeen: false, theme: 'light' as const, entries: [] as Entry[], goals: [] as Goal[], holdings: [] as Holding[], recurring: [] as Recurring[], rules: [] as Rule[], budgets: {} as Record<string, number>, monthlyIncome: 0, dailyCap: 0, globalCap: 0, rollover: false, customCategories: [] as string[], hiddenCategories: [] as string[], rates: { EUR: .92, GBP: .79, INR: 83 } as Record<string, number>, notifications: true, otherAssets: 0, borrowedBalance: 0, borrows: [] as Borrow[], loans: [] as Loan[], assets: [] as Asset[] };
const id = () => crypto.randomUUID();
export const useLedger = create<State>()(persist((set, get) => ({
  ...initial,
  set: (patch) => set(patch),
  addEntry: (entry) => set((s) => ({ entries: [{ ...entry, id: id() }, ...s.entries] })),
  updateEntry: (entryId, patch) => set((s) => ({ entries: s.entries.map(e => e.id === entryId ? { ...e, ...patch } : e) })),
  removeEntry: (entryId) => set((s) => ({ entries: s.entries.filter(e => e.id !== entryId) })),
  processRecurring: () => {
    const now = new Date(); const created: Entry[] = [];
    const updated = get().recurring.map(item => {
      if (!item.active) return item;
      const next = new Date(`${item.nextDue}T12:00:00`);
      let count = 0;
      while (next <= now && count < 36) {
        created.push({ id: id(), title: item.title, amount: item.amount, type: item.type, category: item.category, date: next.toISOString().slice(0,10), note: `Recurring payment · ${item.id}` });
        if (item.frequency === 'weekly') next.setDate(next.getDate() + 7); else next.setMonth(next.getMonth() + 1);
        count++;
        if (item.frequency === 'once') return { ...item, active: false };
      }
      return { ...item, nextDue: next.toISOString().slice(0,10) };
    });
    if (created.length) set(s => ({ entries: [...created, ...s.entries], recurring: updated }));
  },
  loadDemo: () => {
    const today = new Date(); const day = (offset: number) => { const d = new Date(today); d.setDate(d.getDate() - offset); return d.toISOString().slice(0,10); };
    set({ onboarded: true, monthlyIncome: 5200, globalCap: 2800, dailyCap: 120, budgets: { 'Food & Drink': 450, Groceries: 600, Shopping: 400, Transport: 300 }, goals: [{ id: id(), name: 'Summer in Italy', target: 5000, saved: 1850, deadline: day(-180) }], holdings: [{ id: id(), name: 'Index fund', kind: 'Stocks', qty: 12, buyPrice: 210, currentValue: 2980, date: day(80) }], recurring: [{ id: id(), title: 'Rent', amount: 1200, type: 'expense', category: 'Bills', nextDue: day(-8), frequency: 'monthly', active: true }], entries: [
      { id: id(), title: 'Monthly salary', amount: 5200, type: 'income', category: 'Salary', date: day(12) },
      { id: id(), title: 'Freelance project', amount: 850, type: 'income', category: 'Salary', date: day(4) },
      { id: id(), title: 'Whole Foods Market', amount: 86.42, type: 'expense', category: 'Groceries', date: day(0) },
      { id: id(), title: 'Blue Bottle Coffee', amount: 6.50, type: 'expense', category: 'Food & Drink', date: day(0) },
      { id: id(), title: 'Nike Store', amount: 124, type: 'expense', category: 'Shopping', date: day(1) },
      { id: id(), title: 'Uber ride', amount: 18.75, type: 'expense', category: 'Transport', date: day(2) },
      { id: id(), title: 'Rent', amount: 1200, type: 'expense', category: 'Bills', date: day(4) },
      { id: id(), title: 'Netflix', amount: 15.99, type: 'expense', category: 'Entertainment', date: day(6) },
      { id: id(), title: 'Sweetgreen', amount: 17.80, type: 'expense', category: 'Food & Drink', date: day(7) },
      { id: id(), title: 'Trader Joe’s', amount: 62.30, type: 'expense', category: 'Groceries', date: day(8) },
      { id: id(), title: 'Monthly salary', amount: 5200, type: 'income', category: 'Salary', date: day(43) },
      { id: id(), title: 'Rent', amount: 1200, type: 'expense', category: 'Bills', date: day(35) },
    ] });
  },
  reset: () => set(initial),
}), { name: 'ledgerly-device-v1' }));
export const money = (n: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n || 0);
export const monthEntries = (entries: Entry[], date = new Date()) => entries.filter(e => { const d = new Date(`${e.date}T12:00:00`); return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear(); });
export const total = (entries: Entry[], type: EntryType) => entries.filter(e => e.type === type).reduce((sum, e) => sum + e.amount, 0);
export const netWorth = (entries: Entry[], goals: Goal[], holdings: Holding[], otherAssets = 0, borrowedBalance = 0, assets: Asset[] = []) =>
  total(entries, 'income') - total(entries, 'expense') - total(entries, 'saving') - total(entries, 'investment')
  + goals.reduce((sum, goal) => sum + goal.saved, 0)
  + holdings.reduce((sum, holding) => sum + holding.currentValue, 0)
  + otherAssets + assets.reduce((sum, a) => sum + a.value, 0) - borrowedBalance;

export const allCategories = (s: { customCategories: string[]; hiddenCategories?: string[] }) => [...categories.filter(c => !(s.hiddenCategories ?? []).includes(c)), ...s.customCategories.filter(c => !categories.includes(c) || !(s.hiddenCategories ?? []).includes(c))].filter((c, i, a) => a.indexOf(c) === i);
export function removeCategory(name: string) {
  const s = useLedger.getState();
  s.set({ customCategories: s.customCategories.filter(c => c !== name), hiddenCategories: categories.includes(name) ? [...new Set([...s.hiddenCategories, name])] : s.hiddenCategories });
}
export function renameCategory(from: string, to: string) {
  const s = useLedger.getState();
  const budgets = { ...s.budgets }; if (from in budgets) { budgets[to] = budgets[from] ?? 0; delete budgets[from]; }
  s.set({
    customCategories: [...s.customCategories.filter(c => c !== from && c !== to), to],
    hiddenCategories: [...new Set([...s.hiddenCategories.filter(c => c !== to), ...(categories.includes(from) ? [from] : [])])],
    entries: s.entries.map(e => e.category === from ? { ...e, category: to } : e),
    recurring: s.recurring.map(r => r.category === from ? { ...r, category: to } : r),
    rules: s.rules.map(r => r.category === from ? { ...r, category: to } : r),
    budgets,
  });
}
