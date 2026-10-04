import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { getFirebaseWebKey } from '@/lib/firebase-config.functions';

const baseConfig = {
  authDomain: 'expense-tracker-568d0.firebaseapp.com',
  projectId: 'expense-tracker-568d0',
  storageBucket: 'expense-tracker-568d0.firebasestorage.app',
  messagingSenderId: '308241480280',
  appId: '1:308241480280:web:9c172c0d0cbd19882b682d',
};

let ready: Promise<{ app: FirebaseApp; auth: Auth; db: Firestore }> | null = null;

/** Browser-only lazy Firebase init. */
export function firebase() {
  if (!ready) {
    ready = (async () => {
      const [{ initializeApp, getApps }, { getAuth }, { getFirestore }, { apiKey }] = await Promise.all([
        import('firebase/app'), import('firebase/auth'), import('firebase/firestore'), getFirebaseWebKey(),
      ]);
      if (!apiKey) throw new Error('Firebase API key is missing');
      const app = getApps()[0] ?? initializeApp({ ...baseConfig, apiKey });
      return { app, auth: getAuth(app), db: getFirestore(app) };
    })().catch(e => { ready = null; throw e; });
  }
  return ready;
}

export function authMessage(e: unknown) {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/email-already-in-use': 'An account with this email already exists. Log in instead.',
    'auth/weak-password': 'Use a stronger password (at least 8 characters).',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/network-request-failed': 'No internet connection. Ledgerly needs to be online.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/operation-not-allowed': 'Email sign-in is not enabled in Firebase yet.',
    'auth/configuration-not-found': 'Email sign-in is not set up in Firebase yet (Authentication > Sign-in method > Email/Password).',
  };
  return map[code] ?? (e instanceof Error ? e.message : 'Something went wrong.');
}
