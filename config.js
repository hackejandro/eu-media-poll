// One-time migration: discard pre-Think-Tank numeric Brussels codes cached in this browser.
try {
  const key = 'euobserver_think_tank_code';
  const legacy = localStorage.getItem(key) || '';
  if (/^[A-Z-]+-\d{5}$/i.test(legacy) || /^\s*[A-Z]+\s+\d{5}\s*$/i.test(legacy)) {
    localStorage.removeItem(key);
  }
} catch (_) {}

window.THINK_TANK_CONFIG = {
  // Paste the deployed Google Apps Script Web App URL here.
  // Leave blank to run the frontend in demo mode.
  apiUrl: 'https://script.google.com/a/macros/euobserver.com/s/AKfycbx0vorCrGzUkUdxJDI4Hpw4Z6GGanYLwmlCKq335w8ysWrFG7S18d_DZs54fHNgE86j/exec',
  siteUrl: 'https://hackejandro.github.io/eu-media-poll/',
  timeZone: 'Europe/Brussels'
};
