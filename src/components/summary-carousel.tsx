import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, PiggyBank, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money } from '@/store/ledger';

type Summary = { label: string; value: number; detail: string; icon: LucideIcon };

export function SummaryCarousel({ balance, spent, savings, earned, investments, currency }: {
  balance: number; spent: number; savings: number; earned: number; investments: number; currency: string;
}) {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const reducedMotion = useReducedMotion();
  const cards: Summary[] = [
    { label: 'Available balance', value: balance, detail: 'Your money, at a glance', icon: Wallet },
    { label: 'Monthly expenses', value: spent, detail: 'Spent this month', icon: ArrowUpRight },
    { label: 'Total savings', value: savings, detail: 'Saved toward your goals', icon: PiggyBank },
    { label: 'Monthly income', value: earned, detail: 'Received this month', icon: ArrowDownLeft },
    { label: 'Investments', value: investments, detail: 'Current portfolio value', icon: TrendingUp },
  ];
  const change = (step: number) => {
    setDirection(step);
    setActive(current => (current + step + cards.length) % cards.length);
  };
  const current = cards[active];
  if (!current) return null;
  const Icon = current.icon;
  const formatted = money(current.value, currency).split('.');

  return <div className="mx-auto mt-8 w-full max-w-[380px]" aria-label="Money summaries">
    <div className="relative h-[170px] select-none">
      <div className="absolute inset-x-6 top-0 h-[150px] rounded-2xl glass opacity-40" aria-hidden="true" />
      <div className="absolute inset-x-3 top-2 h-[150px] rounded-2xl glass opacity-65" aria-hidden="true" />
      <div className="absolute inset-x-0 top-4 h-[154px] overflow-hidden rounded-2xl glass">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div key={active} custom={direction}
            initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? '-100%' : '100%', opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 290, damping: 32 }}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2}
            onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 45 || Math.abs(info.velocity.x) > 450) change(info.offset.x < 0 ? 1 : -1); }}
            className="absolute inset-0 flex cursor-grab touch-pan-y flex-col justify-between p-5 text-left active:cursor-grabbing"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium uppercase opacity-75">LEDGERLY · {current.label}</span>
              <Icon size={19} className="shrink-0 opacity-80" aria-hidden="true" />
            </div>
            <div>
              <p className="truncate text-3xl font-semibold leading-tight sm:text-4xl" title={money(current.value, currency)}>{formatted[0]}<span className="currency-decimals">.{formatted[1] || '00'}</span></p>
              <p className="mt-1 text-xs opacity-70">{current.detail}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
    <div className="mt-2 flex items-center justify-center gap-5">
      <Button type="button" variant="ghost" size="icon" className="pill text-hero-foreground hover:bg-hero-foreground/15 hover:text-hero-foreground" onClick={() => change(-1)} aria-label="Previous money summary" title="Previous money summary"><ChevronLeft size={18}/></Button>
      <div className="flex items-center gap-2" aria-label={`Summary ${active + 1} of ${cards.length}`}>
        {cards.map((card, index) => <Button key={card.label} type="button" variant="ghost" size="icon" className="h-8 w-8 pill p-0 hover:bg-hero-foreground/10" onClick={() => { setDirection(index > active ? 1 : -1); setActive(index); }} aria-label={`Show ${card.label}`} aria-current={active === index ? 'true' : undefined}><span className={`block h-1.5 rounded-full transition-all ${active === index ? 'w-5 bg-hero-foreground' : 'w-1.5 bg-hero-foreground/40'}`} /></Button>)}
      </div>
      <Button type="button" variant="ghost" size="icon" className="pill text-hero-foreground hover:bg-hero-foreground/15 hover:text-hero-foreground" onClick={() => change(1)} aria-label="Next money summary" title="Next money summary"><ChevronRight size={18}/></Button>
    </div>
  </div>;
}