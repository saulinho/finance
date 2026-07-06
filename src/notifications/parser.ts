import type { Account, PayableInput } from '@/db/types';
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
export function parseNotification(data: NotificationData, accounts: Account[] = []): ParseResult {
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

  // Drop the amount before wallet matching so its digits (e.g. "1234" in
  // "R$ 1234,56") can't be mistaken for a card's last 4 digits.
  const account_id = matchAccountId(fullText.replace(match[0], ' '), accounts);

  return {
    ok: true,
    payable: {
      supplier,
      amount_cents,
      // Notification payables come in open and uncategorized for review. Their
      // due date (the month they're filed under) defaults to the notification's
      // own date; the user can adjust it when tapping the entry.
      due_date: toISODate(new Date(data.postTime)),
      category_id: null,
      subcategory_id: null,
      account_id,
      source: 'notification',
    },
  };
}

/**
 * Routes a notification to a wallet by matching its saved identifier (card's
 * last 4 digits or account number) against the standalone digit sequences in
 * the text. Returns the account id only when exactly one wallet matches — no
 * match or an ambiguous match leaves the payable in the "A revisar" bucket.
 */
function matchAccountId(text: string, accounts: Account[]): number | null {
  const runs = new Set(text.match(/\d+/g) ?? []);
  if (runs.size === 0) return null;

  const matches = accounts.filter((a) => {
    const digits = a.identifier.replace(/\D/g, '');
    return digits.length >= 3 && runs.has(digits);
  });
  return matches.length === 1 ? matches[0].id : null;
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
