// One-time migration: discard old numeric Brussels identities cached in this browser.
try {
  const key = 'euobserver_think_tank_code';
  const legacy = localStorage.getItem(key) || '';
  if (/\d/.test(legacy) || !/^[A-Za-z]+\s+[A-Za-z]+$/.test(legacy.trim())) localStorage.removeItem(key);
} catch (_) {}

window.THINK_TANK_CONFIG = {
  // Public Supabase project values. The publishable key is designed for browser apps.
  supabaseUrl: 'https://czvyukhxfdvjgljgxrke.supabase.co',
  supabasePublishableKey: 'sb_publishable_PnnP9MVCQOFJ3mSGJgDgeA_q9QxuE5y',
  siteUrl: 'https://hackejandro.github.io/eu-media-poll/',
  timeZone: 'Europe/Brussels'
};
