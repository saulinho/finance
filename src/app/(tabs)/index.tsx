import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddFab } from '@/components/add-fab';
import { NotificationPermissionBanner } from '@/components/notification-permission-banner';
import { PayableRow } from '@/components/payable-row';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, TabBarHeight } from '@/constants/theme';
import { listAccounts } from '@/db/accounts';
import {
  countUnassignedPayables,
  listPayablesByMonthAndAccount,
  listUnassignedPayables,
} from '@/db/payables';
import type { Account, PayableWithNames } from '@/db/types';
import { ACCOUNT_TYPE_LABEL } from '@/lib/accounts';
import { addMonths, currentMonth, formatMonthBR } from '@/lib/month';
import { formatBRL } from '@/lib/money';
import { onPendingDrained } from '@/notifications/pending';

// Sentinel wallet id for the "A revisar" bucket (entries without a wallet).
const REVIEW = -1;

export default function PayablesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => currentMonth());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [payables, setPayables] = useState<PayableWithNames[]>([]);

  // Load the wallets + the count of unassigned entries. Keep the current
  // selection if it's still valid, otherwise fall back to the first wallet (or
  // the review bucket when there are no wallets yet but there is something to
  // review) so the list always has one selected.
  const loadAccounts = useCallback(() => {
    Promise.all([listAccounts(db), countUnassignedPayables(db)]).then(([rows, review]) => {
      setAccounts(rows);
      setReviewCount(review);
      setAccountId((cur) => {
        const stillValid =
          cur === REVIEW ? review > 0 : cur !== null && rows.some((r) => r.id === cur);
        return stillValid ? cur : (rows[0]?.id ?? (review > 0 ? REVIEW : null));
      });
    });
  }, [db]);

  useFocusEffect(loadAccounts);

  const reload = useCallback(() => {
    if (accountId === null) {
      setPayables([]);
      return;
    }
    const load =
      accountId === REVIEW
        ? listUnassignedPayables(db)
        : listPayablesByMonthAndAccount(db, month, accountId);
    load.then(setPayables);
  }, [db, month, accountId]);

  useFocusEffect(reload);

  // Refresh when background-captured notifications are imported.
  useEffect(() => onPendingDrained(reload), [reload]);

  const accountOptions = useMemo(() => {
    const opts = accounts.map((a) => ({
      id: a.id,
      name: `${a.name} · ${ACCOUNT_TYPE_LABEL[a.type]}`,
    }));
    if (reviewCount > 0) opts.push({ id: REVIEW, name: `A revisar (${reviewCount})` });
    return opts;
  }, [accounts, reviewCount]);

  const isReview = accountId === REVIEW;
  const total = payables.reduce((sum, p) => sum + p.amount_cents, 0);
  const hasAccounts = accounts.length > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Contas a pagar</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatBRL(total)} {isReview ? 'a revisar' : 'no mês'}
          </ThemedText>
        </View>

        <View style={styles.walletSelect}>
          <SelectField
            label="Carteira"
            value={accountId}
            options={accountOptions}
            onSelect={setAccountId}
            allowClear={false}
            placeholder={hasAccounts ? 'Selecionar' : 'Cadastre uma carteira na aba Carteira'}
          />
        </View>

        {!isReview && (
          <View style={styles.monthNav}>
            <MonthArrow label="‹" onPress={() => setMonth((m) => addMonths(m, -1))} />
            <ThemedText type="smallBold">{formatMonthBR(month)}</ThemedText>
            <MonthArrow label="›" onPress={() => setMonth((m) => addMonths(m, 1))} />
          </View>
        )}

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
              {!hasAccounts
                ? 'Cadastre uma carteira na aba Carteira para começar.'
                : isReview
                  ? 'Nenhum lançamento a revisar.'
                  : `Nenhum lançamento em ${formatMonthBR(month)}. Toque em ＋ para adicionar.`}
            </ThemedText>
          }
        />
      </SafeAreaView>

      {hasAccounts && !isReview && (
        <AddFab
          onPress={() => router.push(`/conta?month=${month}&account=${accountId}`)}
          accessibilityLabel="Nova conta"
        />
      )}
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
  walletSelect: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
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
  pressed: {
    opacity: 0.7,
  },
});
