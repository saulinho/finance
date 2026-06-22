import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { listBudgets, type BudgetWithNames } from '@/db/budgets';
import { addMonths, currentMonth, formatMonthBR } from '@/lib/month';
import { formatBRL } from '@/lib/money';

export default function BudgetScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [month, setMonth] = useState(() => currentMonth());
  const [budgets, setBudgets] = useState<BudgetWithNames[]>([]);

  const reload = useCallback(() => {
    listBudgets(db, month).then(setBudgets);
  }, [db, month]);

  useFocusEffect(reload);

  const total = budgets.reduce((sum, b) => sum + b.amount_cents, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Orçamento</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatBRL(total)} previstos
          </ThemedText>
        </View>

        <View style={styles.monthNav}>
          <MonthArrow label="‹" onPress={() => setMonth((m) => addMonths(m, -1))} />
          <ThemedText type="smallBold">{formatMonthBR(month)}</ThemedText>
          <MonthArrow label="›" onPress={() => setMonth((m) => addMonths(m, 1))} />
        </View>

        <FlatList
          data={budgets}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          renderItem={({ item }) => {
            const categoria = [item.category_name, item.subcategory_name]
              .filter(Boolean)
              .join(' › ');
            const title = item.description || categoria || 'Sem categoria';
            // Only show the category as a second line when it isn't already the title.
            const showCategoria = !!categoria && !!item.description;
            return (
              <Pressable
                onPress={() => router.push(`/orcamento-form?id=${item.id}`)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.row}>
                  <View style={styles.rowBody}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {title}
                    </ThemedText>
                    {showCategoria && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {categoria}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText type="smallBold">{formatBRL(item.amount_cents)}</ThemedText>
                </ThemedView>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Nenhuma previsão para {formatMonthBR(month)}. Toque em ＋ para incluir.
            </ThemedText>
          }
        />
      </SafeAreaView>

      <Pressable
        onPress={() => router.push(`/orcamento-form?month=${month}`)}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
        <ThemedText style={styles.fabIcon}>＋</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function MonthArrow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.arrow}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </Pressable>
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.three,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#208AEF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  fabIcon: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 32,
  },
  pressed: {
    opacity: 0.7,
  },
});
