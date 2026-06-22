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

/** Formats an ISO date string 'YYYY-MM-DD' as 'DD/MM/YYYY'. */
export function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}
