import type { SQLiteDatabase } from 'expo-sqlite';

export type NotificationSource = {
  package: string;
  label: string;
};

export function listNotificationSources(db: SQLiteDatabase) {
  return db.getAllAsync<NotificationSource>(
    'SELECT * FROM notification_sources ORDER BY label COLLATE NOCASE'
  );
}

export function addNotificationSource(db: SQLiteDatabase, pkg: string, label: string) {
  return db.runAsync(
    'INSERT OR REPLACE INTO notification_sources (package, label) VALUES (?, ?)',
    pkg,
    label
  );
}

export function removeNotificationSource(db: SQLiteDatabase, pkg: string) {
  return db.runAsync('DELETE FROM notification_sources WHERE package = ?', pkg);
}
