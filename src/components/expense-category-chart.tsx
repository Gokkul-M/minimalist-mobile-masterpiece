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

type Granularity = 'hour' | 'day' | 'week' | 'month' | 'year';
type ChartRow = { timestamp: number; label: string } & Record<string, string | number>;

const LEVELS: { key: Granularity; label: string; noun: string }[] = [
  { key: 'hour', label: 'Hourly', noun: 'hours' },
  { key: 'day', label: 'Daily', noun: 'days' },
  { key: 'week', label: 'Weekly', noun: 'weeks' },
  { key: 'month', label: 'Monthly', noun: 'months' },
  { key: 'year', label: 'Yearly', noun: 'years' },
];

function entryDate(entry: Entry) {
  return new Date(`${entry.date}T${entry.time || '12:00'}:00`);
}

function floorDate(date: Date, level: Granularity) {
  const result = new Date(date);
  result.setSeconds(0, 0);
  if (level !== 'hour') result.setHours(0);
  if (level === 'week') {
    const day = result.getDay();
    result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  }
  if (level === 'month') result.setDate(1);
  if (level === 'year') result.setMonth(0, 1);
  return result;
}

function addUnit(date: Date, level: Granularity) {
  const next = new Date(date);
  if (level === 'hour') next.setHours(next.getHours() + 1);
  if (level === 'day') next.setDate(next.getDate() + 1);
  if (level === 'week') next.setDate(next.getDate() + 7);
  if (level === 'month') next.setMonth(next.getMonth() + 1);
  if (level === 'year') next.setFullYear(next.getFullYear() + 1);
  return next;
}

function bucketLabel(date: Date, level: Granularity, spansDays: boolean) {
  if (level === 'hour') return new Intl.DateTimeFormat('en', spansDays ? { month: 'short', day: 'numeric', hour: 'numeric' } : { hour: 'numeric' }).format(date);
  if (level === 'day') return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
  if (level === 'week') return `Wk ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)}`;
  if (level === 'month') return new Intl.DateTimeFormat('en', { month: 'short', year: '2-digit' }).format(date);
  return String(date.getFullYear());
}

export function ExpenseCategoryChart({ entries, categories, currency = 'USD' }: { entries: Entry[]; categories: string[]; currency?: string | undefined }) {
  const [selected, setSelected] = useState<string[]>(categories);
  const [levelIndex, setLevelIndex] = useState(1);
  const chartRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef(levelIndex);
  const knownCategories = useRef(new Set(categories));
  const level = LEVELS[levelIndex]?.key ?? 'day';

  const data = useMemo<ChartRow[]>(() => {
    if (!entries.length) return [];
    const entryDates = entries.map(entryDate).sort((a, b) => a.getTime() - b.getTime());
    let start = floorDate(entryDates[0] ?? new Date(), level);
    let end = floorDate(entryDates[entryDates.length - 1] ?? new Date(), level);
    if (level === 'hour') {
      start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23);
    }
    const rows = new Map<number, ChartRow>();
    const spansDays = start.toDateString() !== end.toDateString();
    let cursor = start;
    let guard = 0;
    while (cursor <= end && guard < 10000) {
      const timestamp = cursor.getTime();
      const row: ChartRow = { timestamp, label: bucketLabel(cursor, level, spansDays) };
      categories.forEach(category => { row[category] = 0; });
      rows.set(timestamp, row);
      cursor = addUnit(cursor, level);
      guard += 1;
    }
    entries.forEach(entry => {
      const timestamp = floorDate(entryDate(entry), level).getTime();
      const row = rows.get(timestamp);
      if (row) row[entry.category] = Number(row[entry.category] ?? 0) + entry.amount;
    });
    return [...rows.values()];
  }, [categories, entries, level]);

  useEffect(() => {
    const additions = categories.filter(category => !knownCategories.current.has(category));
    knownCategories.current = new Set(categories);
    setSelected(current => [...current.filter(category => categories.includes(category)), ...additions]);
  }, [categories]);

  const zoom = (direction: 'in' | 'out') => {
    setLevelIndex(current => {
      const next = Math.max(0, Math.min(LEVELS.length - 1, current + (direction === 'in' ? -1 : 1)));
      levelRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      if (Math.abs(delta) < 8) return;
      const next = Math.max(0, Math.min(LEVELS.length - 1, levelRef.current + (delta < 0 ? -1 : 1)));
      if (next !== levelRef.current) {
        levelRef.current = next;
        setLevelIndex(next);
      }
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  const toggle = (category: string, checked: boolean) => setSelected(current => checked ? [...current, category] : current.filter(item => item !== category));
  const currentLevel = LEVELS[levelIndex] ?? LEVELS[1];
  const zoomInLevel = LEVELS[levelIndex - 1];
  const zoomOutLevel = LEVELS[levelIndex + 1];
  const periodLabel = entries.length ? (() => {
    const ordered = entries.map(entryDate).sort((a, b) => a.getTime() - b.getTime());
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    if (!first || !last) return '';
    const formatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: first.getFullYear() === last.getFullYear() ? undefined : 'numeric' });
    return first.toDateString() === last.toDateString() ? formatter.format(first) : `${formatter.format(first)} – ${formatter.format(last)}`;
  })() : '';

  return <section className="panel p-4 sm:p-5 mt-8 mb-8" aria-label="Expense categories chart">
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="text-lg font-semibold">All categories</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{periodLabel || 'Compare spending over time'}</p>
      </div>
      <div className="flex items-center gap-1.5 max-w-full">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="pill min-w-0 px-3" aria-label="Choose expense categories">
              <span className="max-w-24 truncate">{selected.length === categories.length ? 'All categories' : `${selected.length} selected`}</span><ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-h-80 rounded-xl p-2 bg-white text-foreground border border-black/5 shadow-lg">
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
        <Button variant="secondary" size="icon" className="h-9 w-9 shrink-0" aria-label={`Zoom out${zoomOutLevel ? ` to ${zoomOutLevel.noun}` : ''}`} title={zoomOutLevel ? `Show ${zoomOutLevel.noun}` : 'Maximum zoom out'} disabled={!zoomOutLevel || !data.length} onClick={() => zoom('out')}><Minus /></Button>
        <Button variant="secondary" size="icon" className="h-9 w-9 shrink-0" aria-label={`Zoom in${zoomInLevel ? ` to ${zoomInLevel.noun}` : ''}`} title={zoomInLevel ? `Show ${zoomInLevel.noun}` : 'Maximum zoom in'} disabled={!zoomInLevel || !data.length} onClick={() => zoom('in')}><Plus /></Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Reset to days" title="Reset to daily view" disabled={levelIndex === 1} onClick={() => { levelRef.current = 1; setLevelIndex(1); }}><RotateCcw /></Button>
      </div>
    </div>
    <div className="flex items-center justify-between gap-3 mb-3">
      <span className="pill bg-secondary px-3 py-1.5 text-xs font-medium">{currentLevel?.label} view</span>
      <span className="text-[11px] text-muted-foreground text-right">− {zoomOutLevel ? zoomOutLevel.noun : 'years'} · + {zoomInLevel ? zoomInLevel.noun : 'hours'}</span>
    </div>
    {data.length && selected.length ? <>
      <div ref={chartRef} className="h-72 w-full min-w-0 touch-none rounded-2xl bg-secondary/40 pt-3" role="img" aria-label={`${currentLevel?.label} expense lines for ${selected.join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 6" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} width={54} domain={[0, 'auto']} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickFormatter={value => Intl.NumberFormat('en', { notation: 'compact' }).format(Number(value))} />
            <Tooltip cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '3 4' }} formatter={(value, name) => [money(Number(value), currency), String(name)]} labelFormatter={label => `${currentLevel?.label} · ${String(label)}`} contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, color: 'var(--foreground)', boxShadow: '0 12px 30px color-mix(in oklch, var(--foreground) 12%, transparent)' }} />
            {categories.filter(category => selected.includes(category)).map((category, index) => <Line key={category} type="monotone" dataKey={category} name={category} stroke={LINE_COLORS[categories.indexOf(category) % LINE_COLORS.length]} strokeWidth={1.6} dot={data.length <= 2 ? { r: 2.5, strokeWidth: 0 } : false} activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--card)' }} connectNulls isAnimationActive={false} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={index >= LINE_COLORS.length ? `${5 + index % 3} ${3 + index % 2}` : undefined} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hidden mt-3 pb-0.5" aria-label="Visible category legend">
        {categories.filter(category => selected.includes(category)).map(category => <span key={category} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground whitespace-nowrap"><span className="h-1.5 w-5 rounded-full" style={{ backgroundColor: LINE_COLORS[categories.indexOf(category) % LINE_COLORS.length] }} />{category}</span>)}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Scroll to move between hours, days, weeks, months and years · Tap a point for details</p>
    </> : <div className="h-56 grid place-items-center text-center px-6"><div><p className="font-medium">{data.length ? 'No categories selected' : 'No expenses in this period'}</p><p className="text-sm text-muted-foreground mt-1">{data.length ? 'Choose categories from the menu to compare them.' : 'Your category lines will appear after you add an expense.'}</p></div></div>}
  </section>;
}