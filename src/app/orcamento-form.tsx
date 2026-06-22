import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { createBudget, deleteBudget, getBudget, updateBudget } from '@/db/budgets';
import { listCategories, listSubcategories } from '@/db/categories';
import type { Category, Subcategory } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { currentMonth, formatMonthBR } from '@/lib/month';
import { formatBRL, parseBRLToCents } from '@/lib/money';

export default function BudgetFormScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string; month?: string }>();
  const editingId = params.id ? Number(params.id) : null;

  const [month, setMonth] = useState(() => params.month ?? currentMonth());
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  useEffect(() => {
    listCategories(db).then(setCategories);
    if (editingId !== null) {
      getBudget(db, editingId).then((b) => {
        if (!b) return;
        setMonth(b.month);
        setDescription(b.description);
        setAmountText(formatBRL(b.amount_cents));
        setCategoryId(b.category_id);
        setSubcategoryId(b.subcategory_id);
      });
    }
  }, [db, editingId]);

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
    if (amountCents <= 0) {
      Alert.alert('Campo obrigatório', 'Informe um valor válido.');
      return;
    }
    const input = {
      month,
      description,
      amount_cents: amountCents,
      category_id: categoryId,
      subcategory_id: subcategoryId,
    };
    if (editingId !== null) {
      await updateBudget(db, editingId, input);
    } else {
      await createBudget(db, input);
    }
    router.back();
  }

  function handleDelete() {
    if (editingId === null) return;
    Alert.alert('Excluir previsão', 'Tem certeza que deseja excluir esta previsão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteBudget(db, editingId);
          router.back();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedView type="backgroundElement" style={styles.monthBadge}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Mês
          </ThemedText>
          <ThemedText type="smallBold">{formatMonthBR(month)}</ThemedText>
        </ThemedView>

        <Field label="Descrição (opcional)">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ex.: Aluguel"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        </Field>

        <Field label="Valor previsto">
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder="R$ 0,00"
            keyboardType="numeric"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
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
              Excluir previsão
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
  monthBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
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
