import { Platform } from 'react-native';

import type { NotificationData } from 'expo-android-notification-listener-service';

type Subscription = { remove(): void };

type NativeModule = {
  isNotificationPermissionGranted(): boolean;
  openNotificationListenerSettings(): void;
  setAllowedPackages(packages: string[]): void;
  addListener(
    event: 'onNotificationReceived',
    cb: (data: NotificationData) => void
  ): Subscription;
};

// Defensive load: requiring this native module throws in Expo Go (it has no
// native side). Wrapping it keeps Phase 1 testable in Expo Go; capture only
// activates in an Android dev build where the module is present.
let native: NativeModule | null = null;
try {
  if (Platform.OS === 'android') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    native = require('expo-android-notification-listener-service').default as NativeModule;
  }
} catch {
  native = null;
}

export const isListenerAvailable = native != null;

export function isPermissionGranted(): boolean {
  try {
    return native?.isNotificationPermissionGranted() ?? false;
  } catch {
    return false;
  }
}

export function openSettings(): void {
  native?.openNotificationListenerSettings();
}

export function setAllowedPackages(packages: string[]): void {
  native?.setAllowedPackages(packages);
}

export function subscribe(cb: (data: NotificationData) => void): Subscription {
  if (!native) return { remove() {} };
  return native.addListener('onNotificationReceived', cb);
}

export type { NotificationData };
