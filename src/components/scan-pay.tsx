import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { toast } from 'sonner';
import { ArrowLeft, Check, ImageUp, QrCode, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { categories, money, useLedger } from '@/store/ledger';

type Payee = { raw: string; pa: string; pn: string; params: URLSearchParams };
type Step = 'scan' | 'amount' | 'category' | 'confirm';

function parseQr(text: string): Payee | null {
  const t = text.trim();
  if (!/^upi:\/\/pay/i.test(t)) return null;
  const params = new URLSearchParams(t.slice(t.indexOf('?') + 1));
  const pa = params.get('pa');
  if (!pa) return null;
  return { raw: t, pa, pn: params.get('pn') || pa, params };
}

export function ScanPay({ onClose }: { onClose: () => void }) {
  const s = useLedger();
  const currency = s.profile?.currency || 'USD';
  const allCats = [...categories.filter(c => c !== 'Salary'), ...s.customCategories];
  const [step, setStep] = useState<Step>('scan');
  const [payee, setPayee] = useState<Payee | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Shopping');
  const [camError, setCamError] = useState('');
  const [manual, setManual] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const awaiting = useRef(false);

  const accept = (text: string) => {
    const p = parseQr(text);
    if (!p) { toast.error('This QR code is not a payment code'); return false; }
    setPayee(p);
    const am = p.params.get('am');
    if (am) setAmount(am);
    setStep('amount');
    return true;
  };

  useEffect(() => {
    if (step !== 'scan') return;
    let stream: MediaStream | null = null; let raf = 0; let stopped = false;
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const tick = () => {
      if (stopped) return;
      const v = videoRef.current;
      if (v && ctx && v.readyState >= 2 && v.videoWidth) {
        canvas.width = v.videoWidth; canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (code?.data && parseQr(code.data)) { accept(code.data); return; }
      }
      raf = requestAnimationFrame(tick);
    };
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
        raf = requestAnimationFrame(tick);
      } catch { setCamError('Camera unavailable. Upload a QR image or paste the payment link.'); }
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); };
  }, [step]);

  useEffect(() => {
    const onReturn = () => { if (document.visibilityState === 'visible' && awaiting.current) { awaiting.current = false; setStep('confirm'); } };
    document.addEventListener('visibilitychange', onReturn);
    return () => document.removeEventListener('visibilitychange', onReturn);
  }, []);

  const fromImage = async (file?: File) => {
    if (!file) return;
    const img = new Image(); img.src = URL.createObjectURL(file);
    await img.decode().catch(() => {});
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d'); if (!ctx || !c.width) { toast.error('Could not read image'); return; }
    ctx.drawImage(img, 0, 0);
    const code = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
    if (!code) toast.error('No QR code found in image'); else accept(code.data);
  };

  const pay = () => {
    if (!payee) return;
    const p = new URLSearchParams(payee.params);
    p.set('am', Number(amount).toFixed(2));
    if (!p.get('cu')) p.set('cu', 'INR');
    if (!p.get('tn')) p.set('tn', category);
    awaiting.current = true;
    window.location.href = `upi://pay?${p.toString()}`;
    // If no app opened (desktop), still ask after a moment
    setTimeout(() => { if (awaiting.current && document.visibilityState === 'visible') { awaiting.current = false; setStep('confirm'); } }, 2500);
  };

  const finish = (ok: boolean) => {
    if (ok && payee) {
      s.addEntry({ title: payee.pn, amount: Number(amount), type: 'expense', category, date: new Date().toISOString().slice(0, 10), note: `QR payment · ${payee.pa}` });
      toast.success('Payment added to transactions');
    } else toast('Payment not recorded');
    onClose();
  };

  const valid = Number(amount) > 0;
  const back = () => step === 'scan' ? onClose() : setStep(step === 'category' ? 'amount' : 'scan');

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col" role="dialog" aria-label="Scan and pay">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <Button variant="ghost" size="icon" className="pill" aria-label="Back" onClick={back}><ArrowLeft size={19} /></Button>
        <h1 className="text-lg font-semibold">{step === 'scan' ? 'Scan to pay' : step === 'amount' ? 'Enter amount' : 'Choose category'}</h1>
        <Button variant="ghost" size="icon" className="pill" aria-label="Close" onClick={onClose}><X size={19} /></Button>
      </header>

      {step === 'scan' && (
        <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col items-center gap-5 max-w-md w-full mx-auto">
          <div className="relative w-full aspect-square rounded-[30px] overflow-hidden bg-foreground">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-10 rounded-[24px] border-2 border-background/80" />
            {camError && <p className="absolute inset-0 grid place-items-center p-8 text-center text-sm text-background">{camError}</p>}
          </div>
          <p className="text-sm text-muted-foreground text-center">Point your camera at a payment QR code</p>
          <label className="w-full">
            <span className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-full border bg-card text-sm font-medium cursor-pointer"><ImageUp size={17} /> Upload QR image</span>
            <input type="file" accept="image/*" className="sr-only" onChange={e => fromImage(e.target.files?.[0])} />
          </label>
          <div className="flex w-full gap-2">
            <input className="field" placeholder="Or paste upi://pay link" value={manual} onChange={e => setManual(e.target.value)} />
            <Button className="pill" onClick={() => accept(manual)}>Go</Button>
          </div>
        </div>
      )}

      {step === 'amount' && payee && (
        <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col items-center gap-4 max-w-md w-full mx-auto">
          <span className="w-16 h-16 rounded-full bg-secondary grid place-items-center text-2xl font-semibold mt-4">{payee.pn[0]?.toUpperCase()}</span>
          <div className="text-center"><p className="font-semibold">{payee.pn}</p><p className="text-xs text-muted-foreground">{payee.pa}</p></div>
          <input autoFocus inputMode="decimal" aria-label="Amount" placeholder="0" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} className="text-5xl font-semibold text-center bg-transparent outline-none w-full my-6" />
          <Button className="pill w-full mt-auto" disabled={!valid} onClick={() => setStep('category')}>Continue</Button>
        </div>
      )}

      {step === 'category' && payee && (
        <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-4 max-w-md w-full mx-auto">
          <p className="text-center text-muted-foreground text-sm">Paying <b className="text-foreground">{money(Number(amount), currency)}</b> to {payee.pn}</p>
          <div className="grid grid-cols-2 gap-2">
            {allCats.map(c => (
              <Button key={c} variant={category === c ? 'default' : 'secondary'} className="pill" onClick={() => setCategory(c)}>{c}</Button>
            ))}
          </div>
          <Button className="pill w-full mt-auto" onClick={pay}><QrCode size={17} /> Pay with UPI app</Button>
        </div>
      )}

      {step === 'confirm' && payee && (
        <div className="fixed inset-0 z-[70] bg-foreground/50 grid place-items-center px-5">
          <div className="bg-card rounded-[30px] p-6 w-full max-w-sm text-center space-y-4">
            <h2 className="text-xl font-semibold">Was the payment successful?</h2>
            <p className="text-sm text-muted-foreground">{money(Number(amount), currency)} to {payee.pn} · {category}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" className="pill" onClick={() => finish(false)}><X size={17} /> Failed</Button>
              <Button className="pill" onClick={() => finish(true)}><Check size={17} /> Success</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
