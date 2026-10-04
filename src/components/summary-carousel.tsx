import { ArrowDownLeft, ArrowUpRight, PiggyBank, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import { money } from '@/store/ledger';

type Summary = { label: string; value: number; detail: string; icon: LucideIcon };

export function SummaryCarousel({ balance, spent, savings, earned, investments, currency }: {
  balance: number; spent: number; savings: number; earned: number; investments: number; currency: string;
}) {
  const cards: Summary[] = [
    { label: 'Available balance', value: balance, detail: 'Your money, at a glance', icon: Wallet },
    { label: 'Monthly expenses', value: spent, detail: 'Spent this month', icon: ArrowUpRight },
    { label: 'Total savings', value: savings, detail: 'Saved toward your goals', icon: PiggyBank },
    { label: 'Monthly income', value: earned, detail: 'Received this month', icon: ArrowDownLeft },
    { label: 'Investments', value: investments, detail: 'Current portfolio value', icon: TrendingUp },
  ];
  return <div className="mx-auto mt-8 w-full max-w-[380px]" aria-label="Money summaries">
    <div className="relative h-[174px] select-none">
      <div className="absolute inset-x-6 top-0 h-[150px] rounded-2xl glass opacity-40" aria-hidden="true" />
      <div className="absolute inset-x-3 top-2 h-[150px] rounded-2xl glass opacity-65" aria-hidden="true" />
      <div className="absolute inset-x-0 top-4 h-[154px] overflow-y-auto overflow-x-hidden rounded-[20px] snap-y snap-mandatory touch-pan-y overscroll-y-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-foreground" tabIndex={0} role="region" aria-label="Money summaries, scroll vertically to see more">
        {cards.map(card => {
          const Icon = card.icon;
          const formatted = money(card.value, currency).split('.');
          return <div key={card.label} className="summary-slide glass flex h-[154px] shrink-0 snap-start snap-always flex-col justify-between rounded-[20px] p-5 text-left">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium uppercase opacity-75">LEDGERLY · {card.label}</span>
              <Icon size={19} className="shrink-0 opacity-80" aria-hidden="true" />
            </div>
            <div>
              <p className="truncate text-3xl font-semibold leading-tight sm:text-4xl" title={money(card.value, currency)}>{formatted[0]}<span className="currency-decimals">.{formatted[1] || '00'}</span></p>
              <p className="mt-1 text-xs opacity-70">{card.detail}</p>
            </div>
          </div>;
        })}
      </div>
    </div>
  </div>;
}