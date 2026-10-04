import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; Ledgerly/1.0)' };

async function chartPrice(symbol: string): Promise<{ price: number; currency: string } | null> {
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`, { headers: UA });
  if (!res.ok) return null;
  const json = await res.json() as { chart?: { result?: { meta?: { regularMarketPrice?: number; currency?: string } }[] } };
  const meta = json.chart?.result?.[0]?.meta;
  return meta?.regularMarketPrice ? { price: meta.regularMarketPrice, currency: meta.currency || 'USD' } : null;
}

/** Latest market prices for ticker symbols, converted into the user's currency. */
export const getQuotes = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({ symbols: z.array(z.string().min(1).max(32)).max(50), currency: z.string().length(3) }).parse(d))
  .handler(async ({ data }) => {
    const fx = new Map<string, number>();
    const out: Record<string, { price: number; currency: string; native: number; nativeCurrency: string } | null> = {};
    await Promise.all([...new Set(data.symbols.map(s => s.toUpperCase()))].map(async (sym) => {
      try {
        const q = await chartPrice(sym);
        if (!q) { out[sym] = null; return; }
        // Yahoo quotes some London stocks in pence.
        let native = q.price; let cur = q.currency;
        if (cur === 'GBp') { native = native / 100; cur = 'GBP'; }
        let rate = 1;
        if (cur !== data.currency) {
          const key = `${cur}${data.currency}`;
          if (!fx.has(key)) fx.set(key, (await chartPrice(`${key}=X`))?.price ?? NaN);
          rate = fx.get(key)!;
        }
        out[sym] = Number.isFinite(rate) ? { price: native * rate, currency: data.currency, native, nativeCurrency: cur } : null;
      } catch { out[sym] = null; }
    }));
    return { quotes: out, at: new Date().toISOString() };
  });

/** Ticker lookup by company / coin / fund name. */
export const searchSymbols = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({ q: z.string().min(1).max(60) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(data.q)}&quotesCount=6&newsCount=0`, { headers: UA });
      if (!res.ok) return [];
      const json = await res.json() as { quotes?: { symbol?: string; shortname?: string; longname?: string; exchDisp?: string; quoteType?: string }[] };
      return (json.quotes ?? []).filter(q => q.symbol).map(q => ({ symbol: q.symbol!, name: q.longname || q.shortname || q.symbol!, exchange: q.exchDisp ?? '', type: q.quoteType ?? '' }));
    } catch { return []; }
  });
