import { useLedger } from '@/store/ledger';
import { firebase } from '@/lib/firebase';

// Financial data fields mirrored to the signed-in user's Firestore document.
const KEYS = ['onboarded', 'walkthroughSeen', 'theme', 'entries', 'goals', 'holdings', 'recurring', 'rules', 'budgets', 'monthlyIncome', 'dailyCap', 'globalCap', 'rollover', 'customCategories', 'hiddenCategories', 'categoryIcons', 'rates', 'notifications', 'otherAssets', 'borrowedBalance', 'borrows', 'loans', 'assets'] as const;

type Snapshot = Record<string, unknown>;
const pick = (): Snapshot => {
  const s = useLedger.getState() as unknown as Snapshot;
  const out: Snapshot = {};
  for (const k of KEYS) out[k] = s[k];
  const p = useLedger.getState().profile;
  if (p) out['profile'] = { name: p.name, email: p.email, currency: p.currency };
  return JSON.parse(JSON.stringify(out)); // strip undefined for Firestore
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
    const { profile: _p, ...rest } = data;
    useLedger.getState().set({ ...(rest as object), profile: { name: cloudProfile.name || email.split('@')[0] || 'You', email, currency: cloudProfile.currency || 'USD', pinHash: local.profile?.pinHash ?? '' }, session: true });
  } else {
    // First login: upload whatever is on this device.
    useLedger.getState().set({ profile: { name: local.profile?.name && local.profile.name !== 'Guest' ? local.profile.name : email.split('@')[0] || 'You', email, currency: local.profile?.currency || 'USD', pinHash: local.profile?.pinHash ?? '' }, session: true });
    await setDoc(ref, { ...pick(), updatedAt: Date.now() });
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsub = useLedger.subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      setDoc(ref, { ...pick(), updatedAt: Date.now() }).catch(e => onError(e instanceof Error ? e.message : 'Could not save to the cloud'));
    }, 800);
  });
  return () => { clearTimeout(timer); unsub(); };
}
