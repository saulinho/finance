import type { SQLiteDatabase } from 'expo-sqlite';

export type Budget = {
  id: number;
  description: string;
  amount_cents: number;
  category_id: number | null;
  subcategory_id: number | null;
  created_at: string;
};

export type BudgetWithNames = Budget & {
  category_name: string | null;
  subcategory_name: string | null;
};

export type BudgetInput = {
  description: string;
  amount_cents: number;
  category_id: number | null;
  subcategory_id: number | null;
};

const SELECT_WITH_NAMES = `
  SELECT
    b.*,
    c.name AS category_name,
    s.name AS subcategory_name
  FROM budgets b
  LEFT JOIN categories c ON c.id = b.category_id
  LEFT JOIN subcategories s ON s.id = b.subcategory_id
`;

export function listBudgets(db: SQLiteDatabase) {
  return db.getAllAsync<BudgetWithNames>(
    `${SELECT_WITH_NAMES} ORDER BY c.name COLLATE NOCASE, b.id`
  );
}

export function getBudget(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Budget>('SELECT * FROM budgets WHERE id = ?', id);
}

export async function createBudget(db: SQLiteDatabase, input: BudgetInput) {
  const result = await db.runAsync(
    `INSERT INTO budgets
       (description, amount_cents, category_id, subcategory_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    input.description.trim(),
    input.amount_cents,
    input.category_id,
    input.subcategory_id,
    new Date().toISOString()
  );
  return result.lastInsertRowId;
}

export function updateBudget(db: SQLiteDatabase, id: number, input: BudgetInput) {
  return db.runAsync(
    `UPDATE budgets SET
       description = ?, amount_cents = ?, category_id = ?, subcategory_id = ?
     WHERE id = ?`,
    input.description.trim(),
    input.amount_cents,
    input.category_id,
    input.subcategory_id,
    id
  );
}

export function deleteBudget(db: SQLiteDatabase, id: number) {
  return db.runAsync('DELETE FROM budgets WHERE id = ?', id);
}
