import { createFileRoute } from '@tanstack/react-router';
import { LedgerApp } from '@/components/ledger-app';
export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Ledgerly — Your personal expense tracker' },
    { name: 'description', content: 'Track spending, budgets, savings, investments, and recurring bills privately on your device with Ledgerly.' },
    { property: 'og:title', content: 'Ledgerly — Your personal expense tracker' },
    { property: 'og:description', content: 'A calmer, private way to manage your money.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ]}),
  component: LedgerApp,
});
