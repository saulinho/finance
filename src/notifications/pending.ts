import * as FileSystem from 'expo-file-system/legacy';
import type { SQLiteDatabase } from 'expo-sqlite';

import { insertCaptured } from '@/db/captured';
import { createPayable } from '@/db/payables';

import { parseNotification } from './parser';
import type { NotificationData } from './service';

// Must match PENDING_FILE in the native ExpoNotificationListenerService.
const PENDING_FILE = `${FileSystem.documentDirectory}pending_notifications.jsonl`;

let draining = false;

type Listener = () => void;
const listeners = new Set<Listener>();

/** Subscribe to be notified when a drain imported one or more notifications. */
export function onPendingDrained(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Imports notifications the native listener service persisted to disk (which
 * happens even when the app was closed), turning each into a pending payable and
 * a diagnostics record. Safe to call repeatedly; runs are serialized.
 */
export async function drainPending(db: SQLiteDatabase): Promise<number> {
  if (draining) return 0;
  draining = true;
  let total = 0;
  try {
    // Loop to also pick up notifications written while we were processing.
    for (;;) {
      const info = await FileSystem.getInfoAsync(PENDING_FILE);
      if (!info.exists || info.size === 0) break;

      const content = await FileSystem.readAsStringAsync(PENDING_FILE);
      // Truncate now; lines read here are processed below.
      await FileSystem.writeAsStringAsync(PENDING_FILE, '');

      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length === 0) break;

      for (const line of lines) {
        let raw: Partial<NotificationData>;
        try {
          raw = JSON.parse(line);
        } catch {
          continue;
        }
        const data: NotificationData = {
          packageName: raw.packageName ?? '',
          id: raw.id ?? 0,
          title: raw.title ?? '',
          text: raw.text ?? '',
          bigText: raw.bigText ?? '',
          subText: raw.subText ?? '',
          summaryText: raw.summaryText ?? '',
          postTime: raw.postTime ?? Date.now(),
          key: raw.key ?? '',
          appName: raw.appName ?? '',
          appIconPath: raw.appIconPath ?? '',
        };

        const result = parseNotification(data);
        await insertCaptured(db, {
          package: data.packageName,
          title: data.title,
          text: data.text,
          big_text: data.bigText,
          post_time: data.postTime,
          result: result.ok ? 'conta criada' : `ignorada: ${result.reason}`,
        });
        if (result.ok) {
          await createPayable(db, result.payable);
        }
        total += 1;
      }
    }
  } catch {
    // Swallow: best-effort import; native keeps appending for the next run.
  } finally {
    draining = false;
  }
  if (total > 0) listeners.forEach((l) => l());
  return total;
}
