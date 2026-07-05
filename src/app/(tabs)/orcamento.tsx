import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddFab } from '@/components/add-fab';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, TabBarHeight } from '@/constants/theme';
import { listBudgets, type BudgetWithNames } from '@/db/budgets';
import { formatBRL } from '@/lib/money';

type BudgetSection = {
  key: string;
  title: string;
  subtotal: number;
  data: BudgetWithNames[];
};

// Groups the budgets by category, mirroring the Comparativo screen.
// `listBudgets` already orders by category name, so insertion order keeps the
// sections sorted and the rows within each section in their original order.
function groupByCategory(budgets: BudgetWithNames[]): BudgetSection[] {
  const sections = new Map<string, BudgetSection>();
  for (const b of budgets) {
    const k = b.category_id === null ? 'none' : String(b.category_id);
    let section = sections.get(k);
    if (!section) {
      section = { key: k, title: b.category_name ?? 'Sem categoria', subtotal: 0, data: [] };
      sections.set(k, section);
    }
    section.subtotal += b.amount_cents;
    section.data.push(b);
  }
  return [...sections.values()];
}

export default function BudgetScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [budgets, setBudgets] = useState<BudgetWithNames[]>([]);

  const reload = useCallback(() => {
    listBudgets(db).then(setBudgets);
  }, [db]);

  useFocusEffect(reload);

  const total = budgets.reduce((sum, b) => sum + b.amount_cents, 0);
  const sections = groupByCategory(budgets);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Orçamento</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatBRL(total)} previstos
          </ThemedText>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + TabBarHeight + Spacing.six },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary" numberOfLines={1}>
                {section.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatBRL(section.subtotal)}
              </ThemedText>
            </View>
          )}
          renderItem={({ item }) => {
            // The category is already the section header, so the row leads with
            // the description and only falls back to the subcategory.
            const title = item.description || item.subcategory_name || 'Sem subcategoria';
            const showSubcategoria = !!item.subcategory_name && !!item.description;
            return (
              <Pressable
                onPress={() => router.push(`/orcamento-form?id=${item.id}`)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.row}>
                  <View style={styles.rowBody}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {title}
                    </ThemedText>
                    {showSubcategoria && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.subcategory_name}
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
              Nenhuma previsão cadastrada. Toque em ＋ para incluir.
            </ThemedText>
          }
        />
      </SafeAreaView>

      <AddFab
        onPress={() => router.push('/orcamento-form')}
        accessibilityLabel="Nova previsão"
      />
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
  listContent: {
    paddingHorizontal: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
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
  pressed: {
    opacity: 0.7,
  },
});
