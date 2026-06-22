/** Current month as 'YYYY-MM'. */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Shifts a 'YYYY-MM' month string by `delta` months (can be negative). */
export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Formats a 'YYYY-MM' month string as e.g. "Junho de 2026". */
export function formatMonthBR(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 1, 1);
  const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
