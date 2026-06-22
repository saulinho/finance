import type { SQLiteDatabase } from 'expo-sqlite';

import type { Payable, PayableInput, PayableWithNames } from './types';

const SELECT_WITH_NAMES = `
  SELECT
    p.*,
    c.name AS category_name,
    s.name AS subcategory_name
  FROM payables p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN subcategories s ON s.id = p.subcategory_id
`;

export function listPayables(db: SQLiteDatabase) {
  return db.getAllAsync<PayableWithNames>(
    `${SELECT_WITH_NAMES} ORDER BY p.paid ASC, p.due_date ASC`
  );
}

export function getPayable(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Payable>('SELECT * FROM payables WHERE id = ?', id);
}

export async function createPayable(db: SQLiteDatabase, input: PayableInput) {
  const result = await db.runAsync(
    `INSERT INTO payables
       (supplier, amount_cents, due_date, category_id, subcategory_id, source, paid, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.supplier.trim(),
    input.amount_cents,
    input.due_date,
    input.category_id,
    input.subcategory_id,
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
       category_id = ?, subcategory_id = ?, paid = ?
     WHERE id = ?`,
    input.supplier.trim(),
    input.amount_cents,
    input.due_date,
    input.category_id,
    input.subcategory_id,
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
