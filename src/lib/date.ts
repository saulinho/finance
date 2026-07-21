/** Converts a Date to an ISO date string 'YYYY-MM-DD' in local time. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses an ISO date string 'YYYY-MM-DD' into a local Date (noon, to avoid DST edges). */
export function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0);
}

/**
 * Adds `delta` months to an ISO date 'YYYY-MM-DD', clamping the day to the
 * target month's last day so the result always lands in the intended month
 * (e.g. 31/01 + 1 mês → 28/02, never rolling over into March). Used to spread
 * installments across consecutive months.
 */
export function addMonthsToISODate(iso: string, delta: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const target = new Date(year, month - 1 + delta, 1, 12, 0, 0);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day ?? 1, lastDay));
  return toISODate(target);
}

/** Formats an ISO date string 'YYYY-MM-DD' as 'DD/MM/YYYY'. */
export function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}
