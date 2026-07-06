import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddFab } from '@/components/add-fab';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, TabBarHeight } from '@/constants/theme';
import { createAccount, deleteAccount, listAccounts, updateAccount } from '@/db/accounts';
import type { Account, AccountType } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { ACCOUNT_TYPE_LABEL } from '@/lib/accounts';

const TYPES: AccountType[] = ['checking', 'card'];

type Editing = { id: number | null; name: string; type: AccountType; identifier: string };

export default function WalletScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);

  const reload = useCallback(() => {
    listAccounts(db).then(setAccounts);
  }, [db]);

  useFocusEffect(reload);

  async function submit() {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) {
      setEditing(null);
      return;
    }
    const input = { name, type: editing.type, identifier: editing.identifier };
    if (editing.id === null) {
      await createAccount(db, input);
    } else {
      await updateAccount(db, editing.id, input);
    }
    setEditing(null);
    reload();
  }

  function confirmDelete(account: Account) {
    Alert.alert('Excluir', `Excluir "${account.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteAccount(db, account.id);
          reload();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.header}>
          <ThemedText type="small" themeColor="textSecondary">
            Contas correntes e cartões usados nos pagamentos
          </ThemedText>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + TabBarHeight + Spacing.four },
          ]}>
          {accounts.map((account) => (
            <ThemedView key={account.id} type="backgroundElement" style={styles.card}>
              <Pressable
                onPress={() =>
                  setEditing({
                    id: account.id,
                    name: account.name,
                    type: account.type,
                    identifier: account.identifier,
                  })
                }
                style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}>
                <ThemedText type="smallBold">{account.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {ACCOUNT_TYPE_LABEL[account.type]}
                  {account.identifier
                    ? ` · ${account.type === 'card' ? 'final' : 'nº'} ${account.identifier}`
                    : ''}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(account)}
                hitSlop={6}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="small" style={styles.destructive}>
                  Excluir
                </ThemedText>
              </Pressable>
            </ThemedView>
          ))}
          {accounts.length === 0 && (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Nenhuma conta ou cartão. Toque em ＋ para adicionar.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>

      <AddFab
        onPress={() => setEditing({ id: null, name: '', type: 'checking', identifier: '' })}
        accessibilityLabel="Nova conta ou cartão"
      />

      <Modal
        visible={editing !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(null)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <ThemedView type="background" style={styles.sheet}>
              <ThemedText type="smallBold">
                {editing?.id === null ? 'Nova conta ou cartão' : 'Editar'}
              </ThemedText>

              <TextInput
                value={editing?.name ?? ''}
                onChangeText={(name) => setEditing((e) => (e ? { ...e, name } : e))}
                autoFocus
                placeholder="Nome (ex.: Nubank)"
                placeholderTextColor={theme.textSecondary}
                onSubmitEditing={submit}
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.backgroundElement },
                ]}
              />

              <View style={styles.typeRow}>
                {TYPES.map((type) => {
                  const on = editing?.type === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setEditing((e) => (e ? { ...e, type } : e))}
                      style={({ pressed }) => [styles.typeOption, pressed && styles.pressed]}>
                      <ThemedView
                        type={on ? 'backgroundSelected' : 'backgroundElement'}
                        style={styles.typeChip}>
                        <ThemedText type="smallBold" themeColor={on ? 'text' : 'textSecondary'}>
                          {ACCOUNT_TYPE_LABEL[type]}
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={editing?.identifier ?? ''}
                onChangeText={(identifier) => setEditing((e) => (e ? { ...e, identifier } : e))}
                placeholder={
                  editing?.type === 'card' ? '4 últimos dígitos (opcional)' : 'Número da conta (opcional)'
                }
                placeholderTextColor={theme.textSecondary}
                keyboardType={editing?.type === 'card' ? 'number-pad' : 'default'}
                maxLength={editing?.type === 'card' ? 4 : 20}
                onSubmitEditing={submit}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />

              <View style={styles.actions}>
                <Pressable onPress={() => setEditing(null)} style={styles.actionButton}>
                  <ThemedText themeColor="textSecondary">Cancelar</ThemedText>
                </Pressable>
                <Pressable onPress={submit} style={styles.actionButton}>
                  <ThemedText themeColor="text" type="smallBold">
                    Salvar
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
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
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  cardMain: {
    flex: 1,
    gap: 2,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
  destructive: {
    color: '#e5484d',
  },
  pressed: {
    opacity: 0.6,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheet: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  typeOption: {
    flex: 1,
  },
  typeChip: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.four,
  },
  actionButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
});
