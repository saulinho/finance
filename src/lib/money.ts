/** Formats an integer amount in cents as Brazilian currency, e.g. 123456 -> "R$ 1.234,56". */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Compact currency for tight spaces like chart labels, e.g. 123456 -> "R$ 1,2 mil",
 * 1234567890 -> "R$ 12,3 mi". Drops the cents for values below a thousand reais.
 */
export function formatBRLCompact(cents: number): string {
  const reais = cents / 100;
  if (reais >= 1_000_000) return `R$ ${(reais / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (reais >= 1_000) return `R$ ${(reais / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return `R$ ${Math.round(reais).toLocaleString('pt-BR')}`;
}

/**
 * Parses free-form user input into integer cents. Accepts "1.234,56", "1234,56",
 * "1234.56" and "1234". Returns 0 when nothing numeric is found.
 */
export function parseBRLToCents(text: string): number {
  if (!text) return 0;

  let cleaned = text.replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const decimalSep = lastComma > lastDot ? ',' : lastDot > -1 ? '.' : '';

  if (decimalSep) {
    const [intPart, fracPartRaw = ''] = cleaned.split(
      new RegExp(`\\${decimalSep}(?=[^${decimalSep}]*$)`)
    );
    const intDigits = intPart.replace(/[.,]/g, '');
    const fracDigits = (fracPartRaw.replace(/[.,]/g, '') + '00').slice(0, 2);
    return Number(intDigits) * 100 + Number(fracDigits);
  }

  const digits = cleaned.replace(/[.,]/g, '');
  return Number(digits) * 100;
}
