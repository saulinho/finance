import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { listNotificationSources } from '@/db/notification-sources';

import { drainPending } from './pending';
import { isListenerAvailable, setAllowedPackages, subscribe } from './service';

/**
 * Headless component mounted at the app root (inside SQLiteProvider). It imports
 * notifications the native listener service persisted to disk — which works even
 * when the app was closed when the notification arrived (background capture).
 *
 * The native service writes every allowed notification to a file; here we drain
 * that file on launch, when a live event arrives, and whenever the app returns
 * to the foreground. No-op in Expo Go / iOS.
 */
export function NotificationCapture() {
  const db = useSQLiteContext();

  useEffect(() => {
    if (!isListenerAvailable) return;
    let active = true;
    let sub: { remove(): void } | undefined;

    (async () => {
      // Persist the package filter (also written to SharedPreferences natively)
      // so the background service knows which apps to capture.
      const sources = await listNotificationSources(db);
      if (!active) return;
      setAllowedPackages(sources.map((s) => s.package));

      // Import anything captured while the app was closed.
      await drainPending(db);

      // Live trigger: when a notification arrives with the app open, drain the
      // file (the native side has just appended it).
      sub = subscribe(() => {
        drainPending(db);
      });
    })();

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') drainPending(db);
    });

    return () => {
      active = false;
      sub?.remove();
      appStateSub.remove();
    };
  }, [db]);

  return null;
}
