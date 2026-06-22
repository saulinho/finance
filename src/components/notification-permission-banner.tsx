import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { getSetting, setSetting } from '@/db/settings';
import { isListenerAvailable, isPermissionGranted, openSettings } from '@/notifications/service';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const DISMISS_KEY = 'notif_reminder_dismissed';

/**
 * Reminder shown on the home screen when notification access hasn't been
 * granted (Android dev build only). The user can dismiss it permanently with
 * "Não lembrar novamente" — the warning still lives on the Config screen.
 */
export function NotificationPermissionBanner() {
  const db = useSQLiteContext();
  const [granted, setGranted] = useState(() => isPermissionGranted());
  const [dismissed, setDismissed] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setGranted(isPermissionGranted());
    getSetting(db, DISMISS_KEY).then((value) => {
      setDismissed(value === '1');
      setLoaded(true);
    });
  }, [db]);

  useFocusEffect(refresh);

  // Re-check permission when returning from the system settings screen.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setGranted(isPermissionGranted());
    });
    return () => sub.remove();
  }, []);

  if (!isListenerAvailable || !loaded || granted || dismissed) return null;

  async function dontRemind() {
    await setSetting(db, DISMISS_KEY, '1');
    setDismissed(true);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.banner}>
      <ThemedText type="smallBold">Ative o acesso a notificações</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Sem essa permissão, os pagamentos dos seus bancos não viram lançamentos
        automaticamente.
      </ThemedText>
      <View style={styles.actions}>
        <Pressable
          onPress={openSettings}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <ThemedText style={styles.buttonText}>Conceder acesso</ThemedText>
        </Pressable>
        <Pressable
          onPress={dontRemind}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="small" themeColor="textSecondary">
            Não lembrar novamente
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  button: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
