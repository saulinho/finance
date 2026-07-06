import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, TabBarHeight } from '@/constants/theme';
import { getPaidByCategory, getPaidBySubcategory, type CategorySpend } from '@/db/comparison';
import { useTheme } from '@/hooks/use-theme';
import { addMonths, currentMonth, formatMonthBR } from '@/lib/month';
import { formatBRL } from '@/lib/money';

const ACTIVE_COLOR = '#208AEF';

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
  // The category the user drilled into; null means we're showing categories.
  const [selected, setSelected] = useState<CategorySpend | null>(null);
  const [paidBySubcategory, setPaidBySubcategory] = useState<CategorySpend[]>([]);

  const reload = useCallback(() => {
    getPaidByCategory(db, month).then(setPaidByCategory);
  }, [db, month]);

  useFocusEffect(reload);

  // Load the drilled-in category's subcategory breakdown; also refreshes when
  // the month changes while drilled in.
  useEffect(() => {
    if (!selected) {
      setPaidBySubcategory([]);
      return;
    }
    let cancelled = false;
    getPaidBySubcategory(db, month, selected.id).then((rows) => {
      if (!cancelled) setPaidBySubcategory(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [db, month, selected]);

  const empty = selected ? paidBySubcategory.length === 0 : paidByCategory.length === 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          {selected && (
            <Pressable
              onPress={() => setSelected(null)}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="smallBold" style={{ color: ACTIVE_COLOR }}>
                ‹ Categorias
              </ThemedText>
            </Pressable>
          )}
          <ThemedText type="subtitle">{selected ? selected.name : 'Gráfico'}</ThemedText>
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
          {selected ? (
            <BarChart title={`Gasto em ${selected.name}`} data={paidBySubcategory} />
          ) : (
            <BarChart title="Gasto por categoria" data={paidByCategory} onBarPress={setSelected} />
          )}

          {empty && (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              {selected
                ? `Sem subcategorias com lançamentos em ${selected.name} neste mês.`
                : `Sem lançamentos em ${formatMonthBR(month)}. Baixe contas a pagar neste mês para ver o gráfico.`}
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// Horizontal bar chart of paid payables (contas baixadas), stacked top-to-bottom
// and already sorted highest-to-lowest by the query. When `onBarPress` is given,
// each bar becomes tappable to drill into its breakdown.
function BarChart({
  title,
  data,
  onBarPress,
}: {
  title: string;
  data: CategorySpend[];
  onBarPress?: (item: CategorySpend) => void;
}) {
  const theme = useTheme();
  const max = data.reduce((m, d) => Math.max(m, d.total), 0);

  if (data.length === 0 || max <= 0) return null;

  return (
    <ThemedView type="backgroundElement" style={styles.chartCard}>
      <ThemedText type="smallBold">{title}</ThemedText>

      <View style={styles.chartRows}>
        {data.map((d, i) => {
          const color = CHART_PALETTE[i % CHART_PALETTE.length];
          const key = d.id === null ? 'none' : String(d.id);
          const row = (
            <View style={styles.barRow}>
              <View style={styles.barRowHeader}>
                <ThemedText type="small" numberOfLines={1} style={styles.barName}>
                  {d.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatBRL(d.total)}
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
          return onBarPress ? (
            <Pressable
              key={key}
              onPress={() => onBarPress(d)}
              style={({ pressed }) => pressed && styles.pressed}>
              {row}
            </Pressable>
          ) : (
            <View key={key}>{row}</View>
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
