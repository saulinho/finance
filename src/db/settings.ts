import type { SQLiteDatabase } from 'expo-sqlite';

/** Reads a preference value, or null if unset. */
export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

/** Writes (or replaces) a preference value. */
export function setSetting(db: SQLiteDatabase, key: string, value: string) {
  return db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    key,
    value
  );
}
