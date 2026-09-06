// One-time migration: discard old numeric Brussels identities cached in this browser.
try {
  const key = 'euobserver_think_tank_code';
  const legacy = localStorage.getItem(key) || '';
  if (/\d/.test(legacy) || !/^[A-Za-z]+\s+[A-Za-z]+$/.test(legacy.trim())) localStorage.removeItem(key);
} catch (_) {}

window.THINK_TANK_CONFIG = {
  // Public Supabase project values. The anon key is designed to be used in browser apps.
  supabaseUrl: '',
  supabaseAnonKey: '',
  siteUrl: 'https://hackejandro.github.io/eu-media-poll/',
  timeZone: 'Europe/Brussels'
};
