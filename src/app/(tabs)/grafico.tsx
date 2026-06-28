import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, TabBarHeight } from '@/constants/theme';
import { getPaidByCategory, type CategorySpend } from '@/db/comparison';
import { useTheme } from '@/hooks/use-theme';
import { addMonths, currentMonth, formatMonthBR } from '@/lib/month';
import { formatBRLCompact } from '@/lib/money';

// Distinct palette for the per-category chart. Categories beyond the palette
// length cycle back to the start.
const CHART_PALETTE = [
  '#208AEF',
  '#30A46C',
  '#F76808',
  '#8E4EC6',
  '#12A594',
  '#E93D82',
  '#F5D90A',
  '#646A78',
];

export default function GraficoScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => currentMonth());
  const [paidByCategory, setPaidByCategory] = useState<CategorySpend[]>([]);

  const reload = useCallback(() => {
    getPaidByCategory(db, month).then(setPaidByCategory);
  }, [db, month]);

  useFocusEffect(reload);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Gráfico</ThemedText>
        </View>

        <View style={styles.monthNav}>
          <Arrow label="‹" onPress={() => setMonth((m) => addMonths(m, -1))} />
          <ThemedText type="smallBold">{formatMonthBR(month)}</ThemedText>
          <Arrow label="›" onPress={() => setMonth((m) => addMonths(m, 1))} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + TabBarHeight + Spacing.four },
          ]}>
          <PaidByCategoryChart data={paidByCategory} />

          {paidByCategory.length === 0 && (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Sem lançamentos em {formatMonthBR(month)}. Baixe contas a pagar neste mês para ver o
              gráfico.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// Horizontal bar chart of the month's paid payables (contas baixadas) per
// category, stacked top-to-bottom and already sorted highest-to-lowest by
// `getPaidByCategory`.
function PaidByCategoryChart({ data }: { data: CategorySpend[] }) {
  const theme = useTheme();
  const max = data.reduce((m, d) => Math.max(m, d.total), 0);

  if (data.length === 0 || max <= 0) return null;

  return (
    <ThemedView type="backgroundElement" style={styles.chartCard}>
      <ThemedText type="smallBold">Gasto por categoria</ThemedText>

      <View style={styles.chartRows}>
        {data.map((d, i) => {
          const color = CHART_PALETTE[i % CHART_PALETTE.length];
          const key = d.id === null ? 'none' : String(d.id);
          return (
            <View key={key} style={styles.barRow}>
              <View style={styles.barRowHeader}>
                <ThemedText type="small" numberOfLines={1} style={styles.barName}>
                  {d.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatBRLCompact(d.total)}
                </ThemedText>
              </View>
              <View style={[styles.barTrack, { backgroundColor: theme.backgroundSelected }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(d.total / max) * 100}%`, backgroundColor: color },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </ThemedView>
  );
}

function Arrow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.arrow}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
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
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  chartCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  chartRows: {
    gap: Spacing.two,
  },
  barRow: {
    gap: Spacing.one,
  },
  barRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  barName: {
    flex: 1,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
  pressed: {
    opacity: 0.7,
  },
});
