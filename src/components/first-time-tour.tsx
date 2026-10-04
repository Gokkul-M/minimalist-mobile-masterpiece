import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, QrCode, Sparkles, WalletCards, X } from 'lucide-react';
import { useState, type LucideIcon } from 'react';
import { Button } from '@/components/ui/button';

const steps: { icon: LucideIcon; eyebrow: string; title: string; description: string; points: string[] }[] = [
  {
    icon: WalletCards,
    eyebrow: 'YOUR HOME',
    title: 'See your money at a glance',
    description: 'Your balance, net worth, safe-to-spend amount, and recent activity all meet on Home.',
    points: ['Swipe the stacked money cards', 'Use Add Income or Add Expense', 'Tap any summary to explore it'],
  },
  {
    icon: BarChart3,
    eyebrow: 'PLAN & TRACK',
    title: 'Every part has its place',
    description: 'Track budgets, savings, investments, assets, loans, borrows, and repeating payments in their own pages.',
    points: ['Charts show progress over time', 'Upcoming dates keep repayments visible', 'Your records update the main totals'],
  },
  {
    icon: QrCode,
    eyebrow: 'QUICK PAYMENT',
    title: 'Scan, pay, and record',
    description: 'Use the large QR button in the phone navigation to scan a UPI payment code.',
    points: ['Enter the amount and category', 'Continue in your installed payment app', 'Confirm success to save the transaction'],
  },
  {
    icon: Sparkles,
    eyebrow: 'READY TO GO',
    title: 'Ledgerly works around you',
    description: 'Search, reminders, insights, and theme controls help you stay organised without clutter.',
    points: ['Your records stay available in Ledgerly', 'Turn on reminders from Settings', 'Open More to reach every money page'],
  },
];

export function FirstTimeTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  if (!current) return null;
  const Icon = current.icon;

  return <motion.div className="fixed inset-0 z-[90] bg-foreground/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.section role="dialog" aria-modal="true" aria-labelledby="tour-title" className="w-full max-w-md bg-card text-card-foreground rounded-t-[30px] sm:rounded-[30px] overflow-hidden shadow-2xl" initial={{ y: 48, scale: .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 48, scale: .98 }} transition={{ type: 'spring', stiffness: 330, damping: 30 }}>
      <div className="hero-surface px-6 pt-6 pb-10">
        <div className="flex items-center justify-between">
          <span className="w-12 h-12 rounded-full glass grid place-items-center"><Icon size={22}/></span>
          <Button variant="ghost" size="icon" className="pill text-hero-foreground hover:bg-hero-foreground/15" aria-label="Skip introduction" onClick={onComplete}><X size={19}/></Button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: .22 }} className="mt-8">
            <p className="text-xs font-semibold opacity-65">{current.eyebrow}</p>
            <h2 id="tour-title" className="text-3xl font-semibold mt-2 leading-tight">{current.title}</h2>
            <p className="text-sm opacity-75 mt-3 leading-relaxed">{current.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="px-6 pt-6 pb-7">
        <AnimatePresence mode="wait">
          <motion.ul key={step} className="space-y-4 min-h-36" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .2 }}>
            {current.points.map((point, index) => <li key={point} className="flex items-center gap-3 text-sm"><span className="w-7 h-7 shrink-0 rounded-full bg-secondary text-primary grid place-items-center text-xs font-semibold">{index + 1}</span><span>{point}</span></li>)}
          </motion.ul>
        </AnimatePresence>
        <div className="flex gap-1.5 my-5" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all duration-300 ${index === step ? 'w-8 bg-primary' : 'w-3 bg-secondary'}`}/>)}</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="pill text-muted-foreground" onClick={onComplete}>Skip</Button>
          <Button className="pill flex-1" onClick={() => step === steps.length - 1 ? onComplete() : setStep(step + 1)}>{step === steps.length - 1 ? 'Start using Ledgerly' : 'Next'}</Button>
        </div>
      </div>
    </motion.section>
  </motion.div>;
}