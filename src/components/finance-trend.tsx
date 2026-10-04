import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money } from '@/store/ledger';

export type TrendPoint = { label: string; value: number; comparison?: number };

export function FinanceTrend({ title, points, currency = 'USD', primaryLabel, comparisonLabel, emptyText }: { title: string; points: TrendPoint[]; currency?: string; primaryLabel: string; comparisonLabel?: string; emptyText: string }) {
  const hasActivity = points.some(point => point.value !== 0 || (point.comparison ?? 0) !== 0);
  return <section className="mt-6" aria-label={title}>
    <h2 className="text-lg font-semibold mb-4">{title}</h2>
    {hasActivity ? <div className="h-56 w-full min-w-0" role="img" aria-label={`${title}: ${points.map(p => `${p.label} ${primaryLabel} ${money(p.value, currency)}${comparisonLabel ? `, ${comparisonLabel} ${money(p.comparison ?? 0, currency)}` : ''}`).join('; ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickFormatter={n => Intl.NumberFormat('en', { notation: 'compact' }).format(Number(n))} />
          <Tooltip formatter={(v, name) => [money(Number(v), currency), name]} contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: 8, color: 'var(--foreground)' }} />
          {comparisonLabel && <Line type="monotone" dataKey="comparison" name={comparisonLabel} stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />}
          <Line type="monotone" dataKey="value" name={primaryLabel} stroke="var(--primary)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div> : <p className="text-sm text-muted-foreground py-8">{emptyText}</p>}
    {hasActivity && <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="w-3 h-0.5 bg-primary" />{primaryLabel}</span>{comparisonLabel && <span className="flex items-center gap-2"><span className="w-3 h-0.5 bg-muted-foreground" />{comparisonLabel}</span>}</div>}
  </section>;
}
