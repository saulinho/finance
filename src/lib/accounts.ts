import type { AccountType } from '@/db/types';

/** Human-readable (pt-BR) label for each account type. */
export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  checking: 'Conta corrente',
  card: 'Cartão',
};
