import { createServerFn } from '@tanstack/react-start';

// The Firebase web API key is a public identifier (safe for browsers); it is kept in
// project secrets only so it can be rotated without code changes.
export const getFirebaseWebKey = createServerFn({ method: 'GET' }).handler(async () => {
  return { apiKey: (process.env['GOOGLE_API_KEY'] ?? '').trim() };
});
