import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, TabBarHeight } from '@/constants/theme';
import { clearCaptured, listCaptured, type CapturedNotification } from '@/db/captured';
import {
  addNotificationSource,
  listNotificationSources,
  removeNotificationSource,
} from '@/db/notification-sources';
import { KNOWN_BANKS } from '@/notifications/banks';
import {
  isListenerAvailable,
  isPermissionGranted,
  openSettings,
  setAllowedPackages,
} from '@/notifications/service';

export default function ConfigScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [granted, setGranted] = useState(() => isPermissionGranted());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [captured, setCaptured] = useState<CapturedNotification[]>([]);

  // Re-check the system permission when returning to the app from settings.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setGranted(isPermissionGranted());
    });
    return () => sub.remove();
  }, []);

  const reload = useCallback(() => {
    listNotificationSources(db).then((rows) => {
      const set = new Set(rows.map((r) => r.package));
      setSelected(set);
      setAllowedPackages([...set]);
    });
    listCaptured(db).then(setCaptured);
  }, [db]);

  useFocusEffect(reload);

  async function toggle(pkg: string, label: string) {
    if (selected.has(pkg)) {
      await removeNotificationSource(db, pkg);
    } else {
      await addNotificationSource(db, pkg, label);
    }
    reload();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + TabBarHeight + Spacing.four },
          ]}>
          <ThemedText type="subtitle">Configurações</ThemedText>

          {!isListenerAvailable && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText type="smallBold">Captura por notificação indisponível</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Este recurso só funciona em um dev build do Android (não no Expo Go).
                As contas continuam funcionando normalmente no modo manual.
              </ThemedText>
            </ThemedView>
          )}

          {isListenerAvailable && (
            <>
              <ThemedView type="backgroundElement" style={styles.notice}>
                <ThemedText type="smallBold">
                  Acesso a notificações: {granted ? 'concedido ✓' : 'não concedido'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Para capturar lançamentos automaticamente, conceda ao app o acesso às
                  notificações do sistema.
                </ThemedText>
                {!granted && (
                  <Pressable
                    onPress={openSettings}
                    style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
                    <ThemedText style={styles.buttonText}>Abrir configurações</ThemedText>
                  </Pressable>
                )}
              </ThemedView>

              <View>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                  Instituições monitoradas
                </ThemedText>
                {KNOWN_BANKS.map((bank) => {
                  const on = selected.has(bank.package);
                  return (
                    <Pressable
                      key={bank.package}
                      onPress={() => toggle(bank.package, bank.label)}
                      style={({ pressed }) => pressed && styles.pressed}>
                      <ThemedView type="backgroundElement" style={styles.bankRow}>
                        <View>
                          <ThemedText type="smallBold">{bank.label}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {bank.package}
                          </ThemedText>
                        </View>
                        <ThemedView
                          type={on ? 'backgroundSelected' : 'background'}
                          style={styles.check}>
                          <ThemedText themeColor={on ? 'text' : 'textSecondary'}>
                            {on ? '✓' : ''}
                          </ThemedText>
                        </ThemedView>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </View>

              <View>
                <View style={styles.diagHeader}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Diagnóstico (últimas capturas)
                  </ThemedText>
                  {captured.length > 0 && (
                    <Pressable
                      onPress={async () => {
                        await clearCaptured(db);
                        reload();
                      }}
                      hitSlop={6}
                      style={({ pressed }) => pressed && styles.pressed}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Limpar
                      </ThemedText>
                    </Pressable>
                  )}
                </View>

                {captured.length === 0 && (
                  <ThemedView type="backgroundElement" style={styles.notice}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Nenhuma notificação capturada ainda. Mantenha o app aberto, marque os
                      bancos acima e gere uma notificação (ex.: um pagamento) para testar.
                    </ThemedText>
                  </ThemedView>
                )}

                {captured.map((c) => (
                  <ThemedView key={c.id} type="backgroundElement" style={styles.diagRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {c.package}
                    </ThemedText>
                    {!!c.title && <ThemedText type="smallBold">{c.title}</ThemedText>}
                    {!!(c.big_text || c.text) && (
                      <ThemedText type="small">{c.big_text || c.text}</ThemedText>
                    )}
                    <ThemedText type="small" themeColor="textSecondary">
                      → {c.result}
                    </ThemedText>
                  </ThemedView>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  notice: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  sectionLabel: {
    marginBottom: Spacing.two,
  },
  diagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  diagRow: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
    gap: 2,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
