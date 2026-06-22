import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddFab } from '@/components/add-fab';
import { NotificationPermissionBanner } from '@/components/notification-permission-banner';
import { PayableRow } from '@/components/payable-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, TabBarHeight } from '@/constants/theme';
import { listPayables } from '@/db/payables';
import type { PayableWithNames } from '@/db/types';
import { formatBRL } from '@/lib/money';
import { onPendingDrained } from '@/notifications/pending';

export default function PayablesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [payables, setPayables] = useState<PayableWithNames[]>([]);

  const reload = useCallback(() => {
    listPayables(db).then(setPayables);
  }, [db]);

  useFocusEffect(reload);

  // Refresh when background-captured notifications are imported.
  useEffect(() => onPendingDrained(reload), [reload]);

  const pendingTotal = payables
    .filter((p) => p.paid === 0)
    .reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle">Contas a pagar</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatBRL(pendingTotal)} em aberto
            </ThemedText>
          </View>
        </View>

        <View style={styles.banner}>
          <NotificationPermissionBanner />
        </View>

        <FlatList
          data={payables}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + TabBarHeight + Spacing.six },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          renderItem={({ item }) => (
            <PayableRow payable={item} onPress={() => router.push(`/conta?id=${item.id}`)} />
          )}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Nenhuma conta cadastrada. Toque em ＋ para adicionar.
            </ThemedText>
          }
        />
      </SafeAreaView>

      <AddFab onPress={() => router.push('/conta')} accessibilityLabel="Nova conta" />
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
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  banner: {
    paddingHorizontal: Spacing.four,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});
