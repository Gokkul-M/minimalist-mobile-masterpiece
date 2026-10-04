import { useState } from 'react';
import { money } from '@/store/ledger';

type HomeCardStackProps = {
  name: string;
  currency: string;
  spent: number;
  saved: number;
  investments: number;
  upcoming: number;
};

export function HomeCardStack({ name, currency, spent, saved, investments, upcoming }: HomeCardStackProps) {
  const [active, setActive] = useState(0);
  const cards = [
    { label: 'MONTHLY SPENDING', value: money(spent, currency), detail: 'This month' },
    { label: 'SAVINGS', value: money(saved, currency), detail: 'Across your goals' },
    { label: 'INVESTMENTS', value: money(investments, currency), detail: 'Portfolio value' },
    { label: 'UPCOMING BILLS', value: String(upcoming), detail: upcoming === 1 ? 'Scheduled payment' : 'Scheduled payments' },
  ];

  return <div className="relative mx-auto mt-9 max-w-[380px]">
    <div aria-hidden="true" className="glass absolute left-6 right-6 top-0 h-32 rounded-[30px] opacity-30" />
    <div aria-hidden="true" className="glass absolute left-3 right-3 top-3 h-32 rounded-[30px] opacity-55" />
    <div
    className="home-card-scroll scrollbar-hidden relative h-[184px] overflow-y-auto overscroll-contain scroll-smooth snap-y snap-mandatory px-1 pt-6 pb-5"
    role="region"
    aria-label="Your money cards"
    tabIndex={0}
    onScroll={event => {
      const target = event.currentTarget;
      setActive(Math.min(cards.length, Math.max(0, Math.round(target.scrollTop / 140))));
    }}
  >
    <div className={`home-card glass snap-start rounded-[30px] p-4 flex flex-col justify-between ${active === 0 ? 'home-card-active' : ''}`}>
      <div className="flex justify-between items-center gap-3"><span className="text-xs opacity-70">LEDGERLY · YOUR MONEY</span><span className="text-lg font-bold italic opacity-70">L.</span></div>
      <div className="flex justify-between items-end gap-3"><span className="text-sm font-medium truncate">{name}</span><span className="text-xs opacity-70 shrink-0">•••• 2026</span></div>
    </div>
    {cards.map(({ label, value, detail }, index) => <div key={label} className={`home-card glass snap-start rounded-[30px] p-4 flex flex-col justify-between ${active === index + 1 ? 'home-card-active' : ''}`}>
      <div className="flex justify-between items-center gap-3"><span className="text-xs opacity-70">{label}</span><span className="text-lg font-bold italic opacity-70">L.</span></div>
      <div className="flex justify-between items-end gap-3"><span className="text-xl font-semibold truncate">{value}</span><span className="text-xs opacity-70 text-right shrink-0">{detail}</span></div>
    </div>)}
    </div>
  </div>;
}