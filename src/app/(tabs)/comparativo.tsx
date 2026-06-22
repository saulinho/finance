import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, TabBarHeight } from '@/constants/theme';
import { getMonthComparison, type MonthComparison } from '@/db/comparison';
import { useTheme } from '@/hooks/use-theme';
import { addMonths, currentMonth, formatMonthBR } from '@/lib/month';
import { formatBRL } from '@/lib/money';

const OVER_COLOR = '#e5484d';

export default function ComparativoScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => currentMonth());
  const [data, setData] = useState<MonthComparison>({
    categories: [],
    totalBudget: 0,
    totalSpent: 0,
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const reload = useCallback(() => {
    getMonthComparison(db, month).then(setData);
  }, [db, month]);

  useFocusEffect(reload);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Comparativo</ThemedText>
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
          <CompareCard
            title="Total do mês"
            budget={data.totalBudget}
            spent={data.totalSpent}
            emphasis
          />

          {data.categories.map((cat) => {
            const catKey = cat.id === null ? 'none' : String(cat.id);
            const isOpen = expanded === catKey;
            return (
              <View key={catKey}>
                <Pressable
                  onPress={() => setExpanded(isOpen ? null : catKey)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <CompareCard
                    title={`${isOpen ? '▾' : '▸'}  ${cat.name}`}
                    budget={cat.budget}
                    spent={cat.spent}
                  />
                </Pressable>
                {isOpen &&
                  cat.subcategories.map((sub) => (
                    <View key={sub.id === null ? 'none' : String(sub.id)} style={styles.subWrap}>
                      <CompareCard title={sub.name} budget={sub.budget} spent={sub.spent} small />
                    </View>
                  ))}
              </View>
            );
          })}

          {data.categories.length === 0 && (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Sem dados para {formatMonthBR(month)}. Cadastre previsões no Orçamento e contas a
              pagar com vencimento neste mês.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function CompareCard({
  title,
  budget,
  spent,
  emphasis,
  small,
}: {
  title: string;
  budget: number;
  spent: number;
  emphasis?: boolean;
  small?: boolean;
}) {
  const theme = useTheme();
  const over = spent > budget;
  const pct = budget > 0 ? Math.min(spent / budget, 1) : spent > 0 ? 1 : 0;
  const fillColor = over ? OVER_COLOR : '#208AEF';

  return (
    <ThemedView
      type={emphasis ? 'backgroundSelected' : 'backgroundElement'}
      style={[styles.card, small && styles.cardSmall]}>
      <View style={styles.cardRow}>
        <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText type="smallBold" style={over ? { color: OVER_COLOR } : undefined}>
          {formatBRL(spent)}
          <ThemedText type="small" themeColor="textSecondary">
            {'  / '}
            {formatBRL(budget)}
          </ThemedText>
        </ThemedText>
      </View>

      <View style={[styles.barTrack, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: fillColor }]} />
      </View>

      {over && (
        <ThemedText type="small" style={{ color: OVER_COLOR }}>
          Estourou {formatBRL(spent - budget)}
        </ThemedText>
      )}
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
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  cardSmall: {
    paddingVertical: Spacing.two,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardTitle: {
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
  subWrap: {
    paddingLeft: Spacing.three,
    marginTop: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
  pressed: {
    opacity: 0.7,
  },
});
