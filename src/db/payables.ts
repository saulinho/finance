import type { SQLiteDatabase } from 'expo-sqlite';

import type { Payable, PayableInput, PayableWithNames } from './types';

const SELECT_WITH_NAMES = `
  SELECT
    p.*,
    c.name AS category_name,
    s.name AS subcategory_name,
    a.name AS account_name
  FROM payables p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN subcategories s ON s.id = p.subcategory_id
  LEFT JOIN accounts a ON a.id = p.account_id
`;

/**
 * Entries paid from a given wallet whose payment date falls in the 'YYYY-MM'
 * month, newest first (payment date, then id, both descending).
 */
export function listPayablesByMonthAndAccount(
  db: SQLiteDatabase,
  month: string,
  accountId: number
) {
  return db.getAllAsync<PayableWithNames>(
    `${SELECT_WITH_NAMES}
     WHERE substr(p.due_date, 1, 7) = ? AND p.account_id = ?
     ORDER BY p.due_date DESC, p.id DESC`,
    month,
    accountId
  );
}

/**
 * Every wallet-assigned entry whose payment date falls in the 'YYYY-MM' month,
 * across all wallets (the "Todas" option), newest first. Excludes the unassigned
 * "A revisar" bucket, which has its own selector option.
 */
export function listPayablesByMonth(db: SQLiteDatabase, month: string) {
  return db.getAllAsync<PayableWithNames>(
    `${SELECT_WITH_NAMES}
     WHERE substr(p.due_date, 1, 7) = ? AND p.account_id IS NOT NULL
     ORDER BY p.due_date DESC, p.id DESC`,
    month
  );
}

/**
 * Entries with no wallet assigned yet (notification captures, older rows) —
 * the "A revisar" bucket. Spans every month, newest first, so they can't get
 * lost behind the month navigation.
 */
export function listUnassignedPayables(db: SQLiteDatabase) {
  return db.getAllAsync<PayableWithNames>(
    `${SELECT_WITH_NAMES}
     WHERE p.account_id IS NULL
     ORDER BY p.due_date DESC, p.id DESC`
  );
}

/** How many entries still lack a wallet (drives the "A revisar" selector option). */
export async function countUnassignedPayables(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM payables WHERE account_id IS NULL'
  );
  return row?.count ?? 0;
}

export function getPayable(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Payable>('SELECT * FROM payables WHERE id = ?', id);
}

export async function createPayable(db: SQLiteDatabase, input: PayableInput) {
  const result = await db.runAsync(
    `INSERT INTO payables
       (supplier, amount_cents, due_date, category_id, subcategory_id, account_id, source, paid, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.supplier.trim(),
    input.amount_cents,
    input.due_date,
    input.category_id,
    input.subcategory_id,
    input.account_id ?? null,
    input.source ?? 'manual',
    input.paid ? 1 : 0,
    new Date().toISOString()
  );
  return result.lastInsertRowId;
}

export function updatePayable(db: SQLiteDatabase, id: number, input: PayableInput) {
  return db.runAsync(
    `UPDATE payables SET
       supplier = ?, amount_cents = ?, due_date = ?,
       category_id = ?, subcategory_id = ?, account_id = ?, paid = ?
     WHERE id = ?`,
    input.supplier.trim(),
    input.amount_cents,
    input.due_date,
    input.category_id,
    input.subcategory_id,
    input.account_id ?? null,
    input.paid ? 1 : 0,
    id
  );
}

export function setPaid(db: SQLiteDatabase, id: number, paid: boolean) {
  return db.runAsync('UPDATE payables SET paid = ? WHERE id = ?', paid ? 1 : 0, id);
}

export function deletePayable(db: SQLiteDatabase, id: number) {
  return db.runAsync('DELETE FROM payables WHERE id = ?', id);
}
