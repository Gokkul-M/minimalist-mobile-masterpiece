import { useLedger } from '@/store/ledger';
import { firebase } from '@/lib/firebase';

// Financial data fields mirrored to the signed-in user's Firestore document.
const KEYS = ['onboarded', 'walkthroughSeen', 'theme', 'entries', 'goals', 'holdings', 'recurring', 'rules', 'budgets', 'monthlyIncome', 'dailyCap', 'globalCap', 'rollover', 'customCategories', 'hiddenCategories', 'categoryIcons', 'rates', 'notifications', 'otherAssets', 'borrowedBalance', 'borrows', 'loans', 'assets'] as const;
const LIST_KEYS = ['entries', 'goals', 'holdings', 'recurring', 'rules', 'customCategories', 'hiddenCategories', 'borrows', 'loans', 'assets'];

type Snapshot = Record<string, unknown>;
const pick = (): Snapshot => {
  const s = useLedger.getState() as unknown as Snapshot;
  const out: Snapshot = {};
  for (const k of KEYS) out[k] = s[k];
  // Receipt images can push the document past Firestore's 1 MB limit, which makes every save fail.
  out['entries'] = (s['entries'] as { receipt?: string }[]).map(({ receipt: _r, ...e }) => e);
  const p = useLedger.getState().profile;
  if (p) out['profile'] = { name: p.name, email: p.email, currency: p.currency };
  return JSON.parse(JSON.stringify(out)); // strip undefined for Firestore
};

/** Merge cloud data with local: missing or empty cloud lists never wipe local records. */
const merge = (cloud: Snapshot): Snapshot => {
  const local = useLedger.getState() as unknown as Snapshot;
  const out: Snapshot = {};
  for (const k of KEYS) {
    const c = cloud[k];
    if (c === undefined || c === null) continue;
    if (LIST_KEYS.includes(k) && Array.isArray(c)) {
      const l = (local[k] as unknown[]) ?? [];
      if (k === 'customCategories' || k === 'hiddenCategories') { out[k] = [...new Set([...l, ...c])]; continue; }
      const map = new Map<string, unknown>();
      for (const item of l) map.set((item as { id: string }).id, item);
      for (const item of c) { const prev = map.get((item as { id: string }).id) as Snapshot | undefined; map.set((item as { id: string }).id, prev ? { ...prev, ...(item as Snapshot) } : item); }
      out[k] = [...map.values()];
      continue;
    }
    if (k === 'budgets' || k === 'categoryIcons' || k === 'rates') { out[k] = { ...(local[k] as object), ...(c as object) }; continue; }
    out[k] = c;
  }
  return out;
};

/** Load the user's cloud copy (or upload local data on first login), then keep pushing changes. */
export async function startSync(uid: string, email: string, onError: (msg: string) => void) {
  const { db } = await firebase();
  const { doc, getDoc, setDoc } = await import('firebase/firestore');
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const local = useLedger.getState();
  if (snap.exists()) {
    const data = snap.data() as Snapshot;
    const cloudProfile = (data['profile'] ?? {}) as { name?: string; currency?: string };
    useLedger.getState().set({ ...(merge(data) as object), profile: { name: cloudProfile.name || email.split('@')[0] || 'You', email, currency: cloudProfile.currency || 'USD', pinHash: local.profile?.pinHash ?? '' }, session: true });
  } else {
    useLedger.getState().set({ profile: { name: local.profile?.name && local.profile.name !== 'Guest' ? local.profile.name : email.split('@')[0] || 'You', email, currency: local.profile?.currency || 'USD', pinHash: local.profile?.pinHash ?? '' }, session: true });
  }
  const push = () => setDoc(ref, { ...pick(), updatedAt: Date.now() }).catch(e => onError(e instanceof Error ? e.message : 'Could not save to the cloud'));
  await push();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsub = useLedger.subscribe(() => { clearTimeout(timer); timer = setTimeout(push, 800); });
  const flush = () => { if (document.visibilityState === 'hidden') { clearTimeout(timer); void push(); } };
  document.addEventListener('visibilitychange', flush);
  return () => { clearTimeout(timer); unsub(); document.removeEventListener('visibilitychange', flush); };
}
