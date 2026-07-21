import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { listAccounts } from '@/db/accounts';
import { listCategories, listSubcategories } from '@/db/categories';
import { createPayable, deletePayable, getPayable, updatePayable } from '@/db/payables';
import type { Account, Category, PayableSource, Subcategory } from '@/db/types';
import { ACCOUNT_TYPE_LABEL } from '@/lib/accounts';
import { useTheme } from '@/hooks/use-theme';
import { addMonthsToISODate, formatDateBR, fromISODate, toISODate } from '@/lib/date';
import { currentMonth, formatMonthBR } from '@/lib/month';
import { formatBRL, parseBRLToCents, splitInstallments } from '@/lib/money';

export default function PayableFormScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const { id, month, account } = useLocalSearchParams<{
    id?: string;
    month?: string;
    account?: string;
  }>();
  const editingId = id ? Number(id) : null;

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  // Defaults to the wallet the form was opened from (the one being viewed).
  const [accountId, setAccountId] = useState<number | null>(() =>
    account ? Number(account) : null
  );
  const [supplier, setSupplier] = useState('');
  // Whether the user manually edited the supplier — once true we stop
  // auto-filling it from the selected subcategory.
  const [supplierTouched, setSupplierTouched] = useState(false);
  const [amountText, setAmountText] = useState('');
  // Data de pagamento — always set; the month the entry is filed under. Defaults
  // to the month the form was opened from (today when that's the current month).
  const [dueDate, setDueDate] = useState(() =>
    editingId !== null ? '' : defaultDueDate(month)
  );
  const [source, setSource] = useState<PayableSource>('manual');
  // Number of monthly installments to spread this transaction across, starting
  // at `dueDate`. 1 = single entry (the default). Always resets to 1 when
  // editing — existing installments aren't tracked as a group.
  const [installments, setInstallments] = useState(1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  // Load categories + accounts + the existing payable (when editing).
  useEffect(() => {
    listCategories(db).then(setCategories);
    listAccounts(db).then(setAccounts);
    if (editingId !== null) {
      getPayable(db, editingId).then((p) => {
        if (!p) return;
        setCategoryId(p.category_id);
        setSubcategoryId(p.subcategory_id);
        setAccountId(p.account_id);
        setSupplier(p.supplier);
        setSupplierTouched(true); // keep the saved supplier intact
        setAmountText(formatBRL(p.amount_cents));
        setDueDate(p.due_date ?? '');
        setSource(p.source);
      });
    }
  }, [db, editingId]);

  // Refresh subcategories whenever the selected category changes.
  useEffect(() => {
    let cancelled = false;
    const load =
      categoryId === null ? Promise.resolve<Subcategory[]>([]) : listSubcategories(db, categoryId);
    load.then((subs) => {
      if (!cancelled) setSubcategories(subs);
    });
    return () => {
      cancelled = true;
    };
  }, [db, categoryId]);

  const amountCents = useMemo(() => parseBRLToCents(amountText), [amountText]);

  const installmentAmounts = useMemo(
    () => splitInstallments(amountCents, installments),
    [amountCents, installments]
  );

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        id: a.id,
        // Descrição - Número - Cartão/Conta Corrente (the número is dropped when empty).
        name: [a.name, a.identifier, ACCOUNT_TYPE_LABEL[a.type]].filter(Boolean).join(' - '),
      })),
    [accounts]
  );

  function handleCategoryChange(value: number | null) {
    setCategoryId(value);
    setSubcategoryId(null);
    if (!supplierTouched) setSupplier('');
  }

  function handleSubcategoryChange(value: number | null) {
    setSubcategoryId(value);
    // Auto-fill the supplier with the subcategory name unless edited by hand.
    if (!supplierTouched) {
      const sub = subcategories.find((s) => s.id === value);
      setSupplier(sub?.name ?? '');
    }
  }

  // New payables and notification-sourced ones must be categorized; the latter
  // arrive without a category and need the user to classify them on review.
  const categoryRequired = editingId === null || source === 'notification';

  async function handleSave() {
    if (categoryRequired && categoryId === null) {
      Alert.alert('Campo obrigatório', 'Selecione a categoria.');
      return;
    }
    if (categoryRequired && subcategoryId === null) {
      Alert.alert('Campo obrigatório', 'Selecione a subcategoria.');
      return;
    }
    if (!supplier.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do fornecedor.');
      return;
    }
    if (amountCents <= 0) {
      Alert.alert('Campo obrigatório', 'Informe um valor válido.');
      return;
    }
    if (!dueDate) {
      Alert.alert('Campo obrigatório', 'Informe a data de pagamento.');
      return;
    }
    if (accountId === null) {
      Alert.alert('Campo obrigatório', 'Selecione a carteira.');
      return;
    }

    const baseSupplier = supplier.trim();
    const count = installments;
    const amounts = splitInstallments(amountCents, count);

    // Fields shared by every installment; supplier/amount/due_date vary per part.
    const commonInput = {
      category_id: categoryId,
      subcategory_id: subcategoryId,
      account_id: accountId,
      paid: true,
    };
    // The i-th installment (0-based): total split N ways, spread across the N
    // months following `dueDate`, with a "(i/N)" suffix when there's more than one.
    const parcelInput = (i: number) => ({
      ...commonInput,
      supplier: count > 1 ? `${baseSupplier} (${i + 1}/${count})` : baseSupplier,
      amount_cents: amounts[i],
      due_date: addMonthsToISODate(dueDate, i),
    });

    if (editingId !== null) {
      // Reshape the edited entry into the first installment, then append the
      // remaining ones to the following months.
      await updatePayable(db, editingId, parcelInput(0));
      for (let i = 1; i < count; i++) {
        await createPayable(db, parcelInput(i));
      }
    } else {
      for (let i = 0; i < count; i++) {
        await createPayable(db, parcelInput(i));
      }
    }
    router.back();
  }

  function handleDelete() {
    if (editingId === null) return;
    Alert.alert('Excluir conta', 'Tem certeza que deseja excluir esta conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deletePayable(db, editingId);
          router.back();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      {editingId !== null && (
        <Stack.Screen
          options={{
            headerRight: () => (
              <Pressable
                onPress={handleDelete}
                hitSlop={8}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText style={styles.deleteButtonText}>Excluir</ThemedText>
              </Pressable>
            ),
          }}
        />
      )}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SelectField
          label="Categoria"
          value={categoryId}
          options={categories}
          onSelect={handleCategoryChange}
        />

        <SelectField
          label="Subcategoria"
          value={subcategoryId}
          options={subcategories}
          onSelect={handleSubcategoryChange}
          disabled={categoryId === null}
          placeholder={categoryId === null ? 'Escolha uma categoria primeiro' : 'Selecionar'}
        />

        <Field label="Fornecedor">
          <TextInput
            value={supplier}
            onChangeText={(text) => {
              setSupplier(text);
              setSupplierTouched(true);
            }}
            placeholder="Nome do fornecedor"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        </Field>

        <Field label="Valor">
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder="R$ 0,00"
            keyboardType="numeric"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        </Field>

        <Field label="Data de pagamento">
          <Pressable onPress={() => setShowPicker(true)}>
            <ThemedView type="backgroundElement" style={styles.input}>
              <ThemedText themeColor={dueDate ? 'text' : 'textSecondary'}>
                {dueDate ? formatDateBR(dueDate) : 'Selecionar'}
              </ThemedText>
            </ThemedView>
          </Pressable>
          {showPicker && (
            <DateTimePicker
              value={dueDate ? fromISODate(dueDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(event, selected) => {
                setShowPicker(Platform.OS === 'ios');
                if (event.type === 'set' && selected) {
                  setDueDate(toISODate(selected));
                }
              }}
            />
          )}
        </Field>

        <Field label="Parcelas">
          <View style={styles.stepper}>
            <Pressable
              onPress={() => setInstallments((n) => Math.max(1, n - 1))}
              disabled={installments <= 1}
              hitSlop={8}
              style={({ pressed }) => [
                styles.stepperButton,
                { backgroundColor: theme.backgroundElement },
                installments <= 1 && styles.stepperButtonDisabled,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="default" style={styles.stepperSign}>
                −
              </ThemedText>
            </Pressable>
            <ThemedText type="default" style={styles.stepperValue}>
              {installments}x
            </ThemedText>
            <Pressable
              onPress={() => setInstallments((n) => Math.min(99, n + 1))}
              disabled={installments >= 99}
              hitSlop={8}
              style={({ pressed }) => [
                styles.stepperButton,
                { backgroundColor: theme.backgroundElement },
                installments >= 99 && styles.stepperButtonDisabled,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="default" style={styles.stepperSign}>
                +
              </ThemedText>
            </Pressable>
          </View>
          {installments > 1 && amountCents > 0 && dueDate && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.installmentHint}>
              {installmentAmounts[0] === installmentAmounts[installments - 1]
                ? `${installments}x de ${formatBRL(installmentAmounts[0])}`
                : `1ª de ${formatBRL(installmentAmounts[0])}, demais de ${formatBRL(
                    installmentAmounts[installments - 1]
                  )}`}{' '}
              · a partir de {formatMonthBR(dueDate.slice(0, 7))}
            </ThemedText>
          )}
        </Field>

        <SelectField
          label="Carteira"
          value={accountId}
          options={accountOptions}
          onSelect={setAccountId}
          allowClear={false}
          placeholder={
            accountOptions.length === 0 ? 'Cadastre uma carteira na aba Carteira' : 'Selecionar'
          }
        />

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
          <ThemedText style={styles.saveButtonText}>Salvar</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

// Default vencimento for a new payable: today when opened from the current
// month (or with no month), otherwise the first day of the chosen month.
function defaultDueDate(month?: string): string {
  if (!month || month === currentMonth()) return toISODate(new Date());
  return `${month}-01`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldLabel}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  fieldLabel: {
    marginBottom: Spacing.one,
  },
  input: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperSign: {
    fontSize: 22,
    lineHeight: 26,
  },
  stepperValue: {
    minWidth: 44,
    textAlign: 'center',
    fontSize: 16,
  },
  installmentHint: {
    marginTop: Spacing.two,
  },
  saveButton: {
    marginTop: Spacing.three,
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  deleteButtonText: {
    color: '#e5484d',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
