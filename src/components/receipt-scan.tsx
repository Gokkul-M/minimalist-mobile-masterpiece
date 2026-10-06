import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Camera, ImageUp, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { allCategories, useLedger, type PayMethod } from '@/store/ledger';

type Draft = { title: string; amount: string; category: string; method: PayMethod; date: string };

/** Pull amount, payee, date and payment method out of OCR text from a UPI screenshot or receipt. */
function parseReceipt(text: string, cats: string[]): Omit<Draft, 'category'> & { category: string } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const num = (s: string) => Number(s.replace(/,/g, ''));
  let amount = 0;
  const keyed = text.match(/(?:₹|rs\.?|inr|total|amount|paid|grand total)\s*:?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (keyed?.[1]) amount = num(keyed[1]);
  if (!amount) {
    const all = [...text.matchAll(/(?<![\d/:-])(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d{1,6}\.\d{1,2}|\d{1,6})(?![\d/:-])/g)].map(m => num(m[1] ?? '0')).filter(n => n > 0 && n < 1e7 && !(n >= 1900 && n <= 2100));
    amount = all.length ? Math.max(...all) : 0;
  }
  const payee = text.match(/(?:paid to|to|sent to|merchant)\s*:?\s*([A-Za-z][A-Za-z .&'-]{2,40})/i)?.[1]?.trim();
  const title = payee || lines.find(l => /[a-z]{3,}/i.test(l) && !/google|pay|upi|success|completed/i.test(l)) || 'Receipt';
  const upi = /upi|gpay|google pay|phonepe|paytm|bhim|@ok|@ybl|@paytm/i.test(text);
  const card = /visa|mastercard|card|rupay/i.test(text) && !upi;
  const low = text.toLowerCase();
  const guess = cats.find(c => low.includes(c.toLowerCase())) ?? (/restaurant|cafe|coffee|food|swiggy|zomato/i.test(text) ? 'Food & Drink' : /mart|grocery|supermarket|bigbasket|blinkit/i.test(text) ? 'Groceries' : /fuel|petrol|uber|ola|metro/i.test(text) ? 'Transport' : cats.includes('Other') ? 'Other' : cats[0] ?? 'Other');
  let date = format(new Date(), 'yyyy-MM-dd');
  const d = text.match(/(\d{1,2})[\s/-]([A-Za-z]{3,9}|\d{1,2})[\s/-,]+(\d{2,4})/);
  if (d) { const parsed = new Date(`${d[1]} ${d[2]} ${d[3]?.length === 2 ? `20${d[3]}` : d[3]}`); if (!isNaN(parsed.getTime()) && parsed <= new Date()) date = format(parsed, 'yyyy-MM-dd'); }
  return { title: title.slice(0, 60), amount: amount ? String(amount) : '', category: cats.includes(guess) ? guess : cats[0] ?? 'Other', method: card ? 'Card' : upi ? 'UPI' : 'Cash', date };
}

export function ReceiptScan({ onClose }: { onClose: () => void }) {
  const s = useLedger(); const cats = allCategories(s);
  const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null); const [draft, setDraft] = useState<Draft | null>(null);

  const read = async (file: File) => {
    setPreview(URL.createObjectURL(file)); setBusy(true); setProgress(0); setDraft(null);
    try {
      const { recognize } = await import('tesseract.js');
      const { data } = await recognize(file, 'eng', { logger: m => { if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100)); } });
      const parsed = parseReceipt(data.text, cats);
      setDraft(parsed);
      if (!parsed.amount) toast('Could not find the amount — please type it in');
    } catch { toast.error('Could not read this image'); setDraft({ title: '', amount: '', category: cats[0] ?? 'Other', method: 'UPI', date: format(new Date(), 'yyyy-MM-dd') }); }
    finally { setBusy(false); }
  };

  const save = () => {
    if (!draft) return; const v = Number(draft.amount);
    if (!draft.title.trim() || !(v > 0)) { toast.error('Enter a title and amount'); return; }
    s.addEntry({ title: draft.title.trim(), amount: v, type: 'expense', category: draft.category, date: draft.date, method: draft.method, note: 'Scanned receipt' });
    toast.success('Added to transactions'); onClose();
  };

  return <div className="fixed inset-0 z-[70] bg-background overflow-y-auto" role="dialog" aria-modal="true" aria-label="Scan a receipt">
    <div className="max-w-md mx-auto p-5 pb-32 space-y-4">
      <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground font-semibold">SCAN</p><h2 className="text-2xl font-semibold">Receipt or UPI screenshot</h2></div><Button variant="ghost" size="icon" className="pill shrink-0" aria-label="Close" onClick={onClose}><X /></Button></div>
      <p className="text-sm text-muted-foreground">Upload a GPay / PhonePe / Paytm screenshot or take a photo of a bill. We'll read the amount and add it as an expense.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="pill h-11 bg-foreground text-background flex items-center justify-center gap-2 text-sm font-medium cursor-pointer"><Camera size={16} /> Take photo<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) void read(f); e.target.value = ''; }} /></label>
        <label className="pill h-11 bg-secondary flex items-center justify-center gap-2 text-sm font-medium cursor-pointer"><ImageUp size={16} /> Upload image<input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) void read(f); e.target.value = ''; }} /></label>
      </div>
      {preview && <img src={preview} alt="Uploaded receipt" className="w-full max-h-72 object-contain rounded-3xl bg-secondary" />}
      {busy && <div className="panel p-4 flex items-center gap-3 text-sm"><Loader2 className="animate-spin" size={18} /> Reading… {progress}%</div>}
      {draft && <div className="panel p-5 space-y-3">
        <h3 className="font-semibold">Check the details</h3>
        <input className="field w-full" placeholder="Paid to / title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="field min-w-0" inputMode="decimal" placeholder="Amount" value={draft.amount} onChange={e => setDraft({ ...draft, amount: e.target.value })} />
          <input className="field min-w-0" type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} />
        </div>
        <select className="field w-full" aria-label="Category" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{cats.map(c => <option key={c}>{c}</option>)}</select>
        <div className="grid grid-cols-3 gap-2">{(['UPI', 'Cash', 'Card'] as PayMethod[]).map(m => <Button key={m} type="button" variant={draft.method === m ? 'default' : 'secondary'} className="pill h-11" onClick={() => setDraft({ ...draft, method: m })}>{m}</Button>)}</div>
        <Button className="pill w-full h-11" onClick={save}>Add to transactions</Button>
      </div>}
    </div>
  </div>;
}
