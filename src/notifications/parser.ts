import type { PayableInput } from '@/db/types';
import { toISODate } from '@/lib/date';
import { parseBRLToCents } from '@/lib/money';

import type { NotificationData } from './service';

const AMOUNT_RE = /R\$\s?([\d.]{1,12},\d{2})/;

// Words that indicate an incoming credit (not a bill to pay) -> skip.
const CREDIT_KEYWORDS = [
  'recebeu',
  'recebido',
  'recebida',
  'crédito',
  'credito',
  'entrada',
  'depósito',
  'deposito',
  'estorno',
  'reembolso',
  'devolvido',
  'devolução',
  'devolucao',
];

// Words that confirm an outgoing payment/expense.
const DEBIT_KEYWORDS = [
  'compra',
  'pagamento',
  'pagou',
  'débito',
  'debito',
  'enviou',
  'enviado',
  'enviada',
  'pix enviado',
  'fatura',
  'boleto',
  'cobrança',
  'cobranca',
  'saque',
  'gastou',
  'aprovada',
];

export type ParseResult =
  | { ok: true; payable: PayableInput }
  | { ok: false; reason: string };

/**
 * Heuristic parser for Brazilian bank notifications. Extracts the BRL amount,
 * skips clear credits (income), and derives a supplier/description. The result
 * is created as a pending entry (no category) for the user to review.
 *
 * NOTE: notification wording varies a lot per bank — calibrate the regexes/
 * keywords against real samples.
 */
export function parseNotification(data: NotificationData): ParseResult {
  const fullText = [data.title, data.text, data.bigText, data.subText]
    .filter(Boolean)
    .join(' ')
    .trim();
  const lower = fullText.toLowerCase();

  const match = fullText.match(AMOUNT_RE);
  if (!match) return { ok: false, reason: 'sem valor' };

  const amount_cents = parseBRLToCents(match[1]);
  if (amount_cents <= 0) return { ok: false, reason: 'valor inválido' };

  const isCredit = CREDIT_KEYWORDS.some((k) => lower.includes(k));
  const isDebit = DEBIT_KEYWORDS.some((k) => lower.includes(k));
  if (isCredit && !isDebit) return { ok: false, reason: 'crédito (entrada)' };

  const supplier = extractSupplier(fullText) ?? data.appName ?? 'Lançamento';
  const due_date = toISODate(new Date(data.postTime || Date.now()));

  return {
    ok: true,
    payable: {
      supplier,
      amount_cents,
      due_date,
      category_id: null,
      subcategory_id: null,
      source: 'notification',
    },
  };
}

function extractSupplier(text: string): string | null {
  const patterns = [
    /\bem\s+([A-Z0-9][\w .&*-]{2,40})/,
    /\bpara\s+([A-Z0-9][\w .&*-]{2,40})/,
    /\bno\s+([A-Z0-9][\w .&*-]{2,40})/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].trim().replace(/[.,;:]+$/, '');
  }
  return null;
}
