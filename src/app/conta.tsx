import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { listCategories, listSubcategories } from '@/db/categories';
import { createPayable, deletePayable, getPayable, updatePayable } from '@/db/payables';
import type { Category, Subcategory } from '@/db/types';
import { formatDateBR, fromISODate, toISODate } from '@/lib/date';
import { formatBRL, parseBRLToCents } from '@/lib/money';
import { useTheme } from '@/hooks/use-theme';

export default function PayableFormScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;

  const [supplier, setSupplier] = useState('');
  const [amountText, setAmountText] = useState('');
  const [dueDate, setDueDate] = useState(() => toISODate(new Date()));
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  // Load categories + the existing payable (when editing).
  useEffect(() => {
    listCategories(db).then(setCategories);
    if (editingId !== null) {
      getPayable(db, editingId).then((p) => {
        if (!p) return;
        setSupplier(p.supplier);
        setAmountText(formatBRL(p.amount_cents));
        setDueDate(p.due_date);
        setCategoryId(p.category_id);
        setSubcategoryId(p.subcategory_id);
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

  async function handleSave() {
    if (!supplier.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do fornecedor.');
      return;
    }
    if (amountCents <= 0) {
      Alert.alert('Campo obrigatório', 'Informe um valor válido.');
      return;
    }

    const input = {
      supplier,
      amount_cents: amountCents,
      due_date: dueDate,
      category_id: categoryId,
      subcategory_id: subcategoryId,
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Fornecedor">
          <TextInput
            value={supplier}
            onChangeText={setSupplier}
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
              <ThemedText>{formatDateBR(dueDate)}</ThemedText>
            </ThemedView>
          </Pressable>
          {showPicker && (
            <DateTimePicker
              value={fromISODate(dueDate)}
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

        <SelectField
          label="Categoria"
          value={categoryId}
          options={categories}
          onSelect={(value) => {
            setCategoryId(value);
            setSubcategoryId(null);
          }}
        />

        <SelectField
          label="Subcategoria"
          value={subcategoryId}
          options={subcategories}
          onSelect={setSubcategoryId}
          disabled={categoryId === null}
          placeholder={categoryId === null ? 'Escolha uma categoria primeiro' : 'Selecionar'}
        />

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
          <ThemedText style={styles.saveButtonText}>Salvar</ThemedText>
        </Pressable>

        {editingId !== null && (
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
            <ThemedText type="link" style={styles.deleteButtonText}>
              Excluir conta
            </ThemedText>
          </Pressable>
        )}
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
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  deleteButtonText: {
    color: '#e5484d',
  },
  pressed: {
    opacity: 0.8,
  },
});
