import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Minus, Plus, RotateCcw } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { money, type Entry } from '@/store/ledger';

const LINE_COLORS = [
  'var(--primary)',
  'var(--positive)',
  'var(--warning)',
  'var(--destructive)',
  'var(--muted-foreground)',
];

type ChartRow = { date: string; label: string } & Record<string, string | number>;

function labelFor(date: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

export function ExpenseCategoryChart({ entries, categories, currency = 'USD' }: { entries: Entry[]; categories: string[]; currency?: string | undefined }) {
  const [selected, setSelected] = useState<string[]>(categories);
  const [range, setRange] = useState({ start: 0, end: 1 });
  const chartRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef(range);
  const knownCategories = useRef(new Set(categories));

  const data = useMemo<ChartRow[]>(() => {
    const dates = [...new Set(entries.map(entry => entry.date))].sort();
    return dates.map(date => {
      const row: ChartRow = { date, label: labelFor(date) };
      categories.forEach(category => { row[category] = 0; });
      entries.filter(entry => entry.date === date).forEach(entry => {
        row[entry.category] = Number(row[entry.category] ?? 0) + entry.amount;
      });
      return row;
    });
  }, [categories, entries]);

  useEffect(() => {
    const additions = categories.filter(category => !knownCategories.current.has(category));
    knownCategories.current = new Set(categories);
    setSelected(current => [...current.filter(category => categories.includes(category)), ...additions]);
  }, [categories]);

  useEffect(() => {
    const next = { start: 0, end: Math.max(1, data.length - 1) };
    rangeRef.current = next;
    setRange(next);
  }, [data.length]);

  const setZoom = (next: { start: number; end: number }) => {
    rangeRef.current = next;
    setRange(next);
  };

  const zoom = (direction: 'in' | 'out', anchor = 0.5) => {
    if (data.length < 3) return;
    const current = rangeRef.current;
    const width = current.end - current.start + 1;
    const nextWidth = Math.max(2, Math.min(data.length, Math.round(width * (direction === 'in' ? 0.72 : 1.38))));
    const anchorIndex = current.start + (width - 1) * anchor;
    let start = Math.round(anchorIndex - (nextWidth - 1) * anchor);
    start = Math.max(0, Math.min(data.length - nextWidth, start));
    setZoom({ start, end: start + nextWidth - 1 });
  };

  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const anchor = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      zoom(delta < 0 ? 'in' : 'out', anchor);
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  });

  const visibleData = data.slice(range.start, range.end + 1);
  const atFullRange = range.start === 0 && range.end >= data.length - 1;
  const toggle = (category: string, checked: boolean) => setSelected(current => checked ? [...current, category] : current.filter(item => item !== category));

  return <section className="panel p-4 sm:p-5 mt-8 mb-8" aria-label="Expense categories chart">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
      <div>
        <h2 className="text-lg font-semibold">All categories</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Compare spending over time</p>
      </div>
      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="pill min-w-0 px-3" aria-label="Choose expense categories">
              <span className="max-w-24 truncate">{selected.length === categories.length ? 'All categories' : `${selected.length} selected`}</span><ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-h-80 rounded-xl p-2">
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              Categories
              <span className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setSelected(categories)}>All</Button>
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setSelected([])}>Clear</Button>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {categories.map((category, index) => <DropdownMenuCheckboxItem
              key={category}
              checked={selected.includes(category)}
              onCheckedChange={checked => toggle(category, checked === true)}
              onSelect={event => event.preventDefault()}
              className="rounded-lg py-2.5"
            >
              <span className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }} />
              <span className="truncate">{category}</span>
            </DropdownMenuCheckboxItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="secondary" size="icon" className="h-9 w-9" aria-label="Zoom out" title="Zoom out" disabled={atFullRange || data.length < 3} onClick={() => zoom('out')}><Minus /></Button>
        <Button variant="secondary" size="icon" className="h-9 w-9" aria-label="Zoom in" title="Zoom in" disabled={data.length < 3 || range.end - range.start < 2} onClick={() => zoom('in')}><Plus /></Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Reset zoom" title="Reset zoom" disabled={atFullRange} onClick={() => setZoom({ start: 0, end: Math.max(1, data.length - 1) })}><RotateCcw /></Button>
      </div>
    </div>
    {data.length && selected.length ? <>
      <div ref={chartRef} className="h-72 w-full min-w-0 touch-pan-y" role="img" aria-label={`Expense lines for ${selected.join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} width={54} domain={[0, 'auto']} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickFormatter={value => Intl.NumberFormat('en', { notation: 'compact' }).format(Number(value))} />
            <Tooltip formatter={(value, name) => [money(Number(value), currency), String(name)]} labelFormatter={label => String(label)} contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: 8, color: 'var(--foreground)' }} />
            {categories.filter(category => selected.includes(category)).map((category, index) => <Line key={category} type="monotone" dataKey={category} name={category} stroke={LINE_COLORS[categories.indexOf(category) % LINE_COLORS.length]} strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} strokeDasharray={index >= LINE_COLORS.length ? `${4 + index % 3} ${2 + index % 2}` : undefined} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Scroll over the chart to zoom · Hover or tap a point for details</p>
    </> : <div className="h-56 grid place-items-center text-center px-6"><div><p className="font-medium">{data.length ? 'No categories selected' : 'No expenses in this period'}</p><p className="text-sm text-muted-foreground mt-1">{data.length ? 'Choose categories from the menu to compare them.' : 'Your category lines will appear after you add an expense.'}</p></div></div>}
  </section>;
}