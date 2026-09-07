const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit'
});

export function brusselsDay(now = new Date()): string {
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function shiftDay(day: string, amount: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, date! + amount, 12)).toISOString().slice(0, 10);
}
