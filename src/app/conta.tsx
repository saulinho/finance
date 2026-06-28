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
import { formatDateBR, fromISODate, toISODate } from '@/lib/date';
import { formatBRL, parseBRLToCents } from '@/lib/money';

export default function PayableFormScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [supplier, setSupplier] = useState('');
  // Whether the user manually edited the supplier — once true we stop
  // auto-filling it from the selected subcategory.
  const [supplierTouched, setSupplierTouched] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [dueDate, setDueDate] = useState(''); // '' = no payment date yet
  const [paid, setPaid] = useState(false);
  const [source, setSource] = useState<PayableSource>('manual');

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
        setPaid(p.paid === 1);
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

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ id: a.id, name: `${a.name} · ${ACCOUNT_TYPE_LABEL[a.type]}` })),
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

  function togglePaid() {
    const next = !paid;
    setPaid(next);
    // Marking as paid fills today's date (still editable); unmarking clears it
    // along with the account it was paid from.
    if (next) {
      if (!dueDate) setDueDate(toISODate(new Date()));
    } else {
      setDueDate('');
      setAccountId(null);
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
    if (paid && accountId === null) {
      Alert.alert('Campo obrigatório', 'Informe a conta ou cartão usado no pagamento.');
      return;
    }

    const input = {
      supplier,
      amount_cents: amountCents,
      due_date: dueDate,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      account_id: paid ? accountId : null,
      paid,
    };

    if (editingId !== null) {
      await updatePayable(db, editingId, input);
    } else {
      await createPayable(db, input);
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

        <Pressable
          onPress={togglePaid}
          style={({ pressed }) => [styles.paidRow, pressed && styles.pressed]}>
          <ThemedView type={paid ? 'backgroundSelected' : 'backgroundElement'} style={styles.check}>
            <ThemedText themeColor={paid ? 'text' : 'textSecondary'}>{paid ? '✓' : ''}</ThemedText>
          </ThemedView>
          <ThemedText type="smallBold">Pago</ThemedText>
        </Pressable>

        <Field label="Data de pagamento">
          <Pressable onPress={() => setShowPicker(true)}>
            <ThemedView type="backgroundElement" style={styles.input}>
              <ThemedText themeColor={dueDate ? 'text' : 'textSecondary'}>
                {dueDate ? formatDateBR(dueDate) : 'Selecionar (opcional)'}
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

        {paid && (
          <SelectField
            label="Pago com"
            value={accountId}
            options={accountOptions}
            onSelect={setAccountId}
            allowClear={false}
            placeholder={
              accountOptions.length === 0 ? 'Cadastre uma conta na aba Carteira' : 'Selecionar'
            }
          />
        )}

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
          <ThemedText style={styles.saveButtonText}>Salvar</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
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
  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
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
