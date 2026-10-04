export async function registerOffline() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const host = location.hostname;
  const blocked = !import.meta.env.PROD || window !== window.top || /^(id-preview--|preview--)/.test(host) || host === 'lovableproject.com' || host.endsWith('.lovableproject.com') || host === 'lovableproject-dev.com' || host.endsWith('.lovableproject-dev.com') || host === 'beta.lovable.dev' || host.endsWith('.beta.lovable.dev') || new URLSearchParams(location.search).get('sw') === 'off';
  if (blocked) { const registrations = await navigator.serviceWorker.getRegistrations(); await Promise.all(registrations.filter(r => r.active?.scriptURL.endsWith('/sw.js')).map(r => r.unregister())); return; }
  await navigator.serviceWorker.register('/sw.js');
}
