import type { SQLiteDatabase } from 'expo-sqlite';

import type { Account, AccountInput } from './types';

export function listAccounts(db: SQLiteDatabase) {
  return db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY name COLLATE NOCASE');
}

export async function createAccount(db: SQLiteDatabase, input: AccountInput) {
  const result = await db.runAsync(
    'INSERT INTO accounts (name, type, created_at) VALUES (?, ?, ?)',
    input.name.trim(),
    input.type,
    new Date().toISOString()
  );
  return result.lastInsertRowId;
}

export function updateAccount(db: SQLiteDatabase, id: number, input: AccountInput) {
  return db.runAsync(
    'UPDATE accounts SET name = ?, type = ? WHERE id = ?',
    input.name.trim(),
    input.type,
    id
  );
}

export function deleteAccount(db: SQLiteDatabase, id: number) {
  // ON DELETE SET NULL keeps paid payables; they just lose the account link.
  return db.runAsync('DELETE FROM accounts WHERE id = ?', id);
}
