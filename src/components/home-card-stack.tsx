import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { money } from '@/store/ledger';

type HomeCardStackProps = {
  name: string;
  currency: string;
  spent: number;
  saved: number;
  investments: number;
  netWorth: number;
};

export function HomeCardStack({ name, currency, spent, saved, investments, netWorth }: HomeCardStackProps) {
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  const lastStep = useRef(0);
  const cards = [
    { label: 'LEDGERLY · YOUR MONEY', value: money(netWorth, currency), detail: 'NET WORTH' },
    { label: 'MONTHLY SPENDING', value: money(spent, currency), detail: 'This month' },
    { label: 'SAVINGS', value: money(saved, currency), detail: 'Across your goals' },
    { label: 'INVESTMENTS', value: money(investments, currency), detail: 'Portfolio value' },
  ];

  function rotate(direction: number) {
    if (Date.now() - lastStep.current < 360) return;
    lastStep.current = Date.now();
    setActive(current => (current + direction + cards.length) % cards.length);
  }

  return <div
    className="relative mx-auto mt-9 h-[164px] max-w-[380px] select-none touch-none"
    role="region"
    aria-label="Your money cards"
    tabIndex={0}
    onWheel={event => {
      event.preventDefault();
      if (Math.abs(event.deltaY) > 4) rotate(event.deltaY > 0 ? 1 : -1);
    }}
    onTouchStart={event => { touchStart.current = event.touches[0]?.clientY ?? null; }}
    onTouchEnd={event => {
      const end = event.changedTouches[0]?.clientY;
      if (touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 25) rotate(end < touchStart.current ? 1 : -1);
      touchStart.current = null;
    }}
    onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        rotate(event.key === 'ArrowDown' ? 1 : -1);
      }
    }}
  >
    {cards.map(({ label, value, detail }, index) => {
      const position = (index - active + cards.length) % cards.length;
      return <motion.div
        key={label}
        className="home-card glass absolute inset-x-0 top-8 h-32 rounded-[30px] p-4 flex flex-col justify-between"
        style={{ zIndex: cards.length - position }}
        initial={false}
        animate={{ y: -position * 10, scale: 1 - position * .045, opacity: 1 - position * .16 }}
        transition={{ type: 'spring', stiffness: 260, damping: 29 }}
        aria-hidden={position !== 0}
      >
        <div className="flex justify-between items-center gap-3"><span className="text-xs opacity-70">{label}</span><span className="text-lg font-bold italic opacity-70">L.</span></div>
        <div className="flex justify-between items-end gap-3"><span className="text-xl font-semibold truncate" title={value}>{value}</span><span className="text-xs opacity-70 text-right shrink-0">{detail}</span></div>
        {index === 0 && <div className="text-[10px] opacity-70 truncate">{name} · Cash + savings + investments + assets − borrowing</div>}
      </motion.div>;
    })}
  </div>;
}