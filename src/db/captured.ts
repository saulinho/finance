import type { SQLiteDatabase } from 'expo-sqlite';

export type CapturedNotification = {
  id: number;
  package: string;
  title: string | null;
  text: string | null;
  big_text: string | null;
  post_time: number | null;
  result: string;
  created_at: string;
};

export type CapturedInput = {
  package: string;
  title?: string;
  text?: string;
  big_text?: string;
  post_time?: number;
  result: string;
};

export async function insertCaptured(db: SQLiteDatabase, input: CapturedInput) {
  await db.runAsync(
    `INSERT INTO captured_notifications
       (package, title, text, big_text, post_time, result, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.package,
    input.title ?? null,
    input.text ?? null,
    input.big_text ?? null,
    input.post_time ?? null,
    input.result,
    new Date().toISOString()
  );
  // Keep only the most recent 50 rows.
  await db.runAsync(
    `DELETE FROM captured_notifications
     WHERE id NOT IN (SELECT id FROM captured_notifications ORDER BY id DESC LIMIT 50)`
  );
}

export function listCaptured(db: SQLiteDatabase, limit = 20) {
  return db.getAllAsync<CapturedNotification>(
    'SELECT * FROM captured_notifications ORDER BY id DESC LIMIT ?',
    limit
  );
}

export function clearCaptured(db: SQLiteDatabase) {
  return db.runAsync('DELETE FROM captured_notifications');
}
