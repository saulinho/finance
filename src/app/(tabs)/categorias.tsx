import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import {
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  listCategories,
  listSubcategories,
  updateCategory,
  updateSubcategory,
} from '@/db/categories';
import type { Category, Subcategory } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

type Prompt = {
  title: string;
  initial: string;
  onSubmit: (value: string) => Promise<void> | void;
};

export default function CategoriesScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subsByCategory, setSubsByCategory] = useState<Record<number, Subcategory[]>>({});
  const [expanded, setExpanded] = useState<number | null>(null);

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const reload = useCallback(() => {
    listCategories(db).then(setCategories);
  }, [db]);

  useFocusEffect(reload);

  const loadSubs = useCallback(
    async (categoryId: number) => {
      const subs = await listSubcategories(db, categoryId);
      setSubsByCategory((prev) => ({ ...prev, [categoryId]: subs }));
    },
    [db]
  );

  function toggleExpand(categoryId: number) {
    const next = expanded === categoryId ? null : categoryId;
    setExpanded(next);
    if (next !== null) loadSubs(next);
  }

  function openPrompt(p: Prompt) {
    setPromptValue(p.initial);
    setPrompt(p);
  }

  async function submitPrompt() {
    const value = promptValue.trim();
    if (!value || !prompt) {
      setPrompt(null);
      return;
    }
    await prompt.onSubmit(value);
    setPrompt(null);
  }

  function confirmDelete(message: string, onConfirm: () => Promise<void>) {
    Alert.alert('Excluir', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => onConfirm() },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Categorias</ThemedText>
          <Pressable
            onPress={() =>
              openPrompt({
                title: 'Nova categoria',
                initial: '',
                onSubmit: async (name) => {
                  await createCategory(db, name);
                  reload();
                },
              })
            }
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="link" themeColor="text">
              ＋ Nova
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.listContent}>
          {categories.map((cat) => {
            const isOpen = expanded === cat.id;
            const subs = subsByCategory[cat.id] ?? [];
            return (
              <ThemedView key={cat.id} type="backgroundElement" style={styles.card}>
                <View style={styles.cardHeader}>
                  <Pressable
                    onPress={() => toggleExpand(cat.id)}
                    style={({ pressed }) => [styles.cardTitle, pressed && styles.pressed]}>
                    <ThemedText type="smallBold">
                      {isOpen ? '▾' : '▸'}  {cat.name}
                    </ThemedText>
                  </Pressable>
                  <View style={styles.actions}>
                    <Action
                      label="Editar"
                      onPress={() =>
                        openPrompt({
                          title: 'Editar categoria',
                          initial: cat.name,
                          onSubmit: async (name) => {
                            await updateCategory(db, cat.id, name);
                            reload();
                          },
                        })
                      }
                    />
                    <Action
                      label="Excluir"
                      destructive
                      onPress={() =>
                        confirmDelete(
                          `Excluir "${cat.name}" e suas subcategorias?`,
                          async () => {
                            await deleteCategory(db, cat.id);
                            reload();
                          }
                        )
                      }
                    />
                  </View>
                </View>

                {isOpen && (
                  <View style={styles.subList}>
                    {subs.map((sub) => (
                      <View key={sub.id} style={styles.subRow}>
                        <ThemedText type="small" themeColor="textSecondary">
                          • {sub.name}
                        </ThemedText>
                        <View style={styles.actions}>
                          <Action
                            label="Editar"
                            onPress={() =>
                              openPrompt({
                                title: 'Editar subcategoria',
                                initial: sub.name,
                                onSubmit: async (name) => {
                                  await updateSubcategory(db, sub.id, name);
                                  loadSubs(cat.id);
                                },
                              })
                            }
                          />
                          <Action
                            label="Excluir"
                            destructive
                            onPress={() =>
                              confirmDelete(`Excluir "${sub.name}"?`, async () => {
                                await deleteSubcategory(db, sub.id);
                                loadSubs(cat.id);
                              })
                            }
                          />
                        </View>
                      </View>
                    ))}
                    <Pressable
                      onPress={() =>
                        openPrompt({
                          title: 'Nova subcategoria',
                          initial: '',
                          onSubmit: async (name) => {
                            await createSubcategory(db, cat.id, name);
                            loadSubs(cat.id);
                          },
                        })
                      }
                      style={({ pressed }) => pressed && styles.pressed}>
                      <ThemedText type="small" themeColor="text" style={styles.addSub}>
                        ＋ Adicionar subcategoria
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </ThemedView>
            );
          })}
          {categories.length === 0 && (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Nenhuma categoria. Toque em ＋ Nova para criar.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={prompt !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPrompt(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPrompt(null)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <ThemedView type="background" style={styles.promptSheet}>
              <ThemedText type="smallBold" style={styles.promptTitle}>
                {prompt?.title}
              </ThemedText>
              <TextInput
                value={promptValue}
                onChangeText={setPromptValue}
                autoFocus
                placeholder="Nome"
                placeholderTextColor={theme.textSecondary}
                onSubmitEditing={submitPrompt}
                style={[
                  styles.promptInput,
                  { color: theme.text, backgroundColor: theme.backgroundElement },
                ]}
              />
              <View style={styles.promptActions}>
                <Pressable onPress={() => setPrompt(null)} style={styles.promptButton}>
                  <ThemedText themeColor="textSecondary">Cancelar</ThemedText>
                </Pressable>
                <Pressable onPress={submitPrompt} style={styles.promptButton}>
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

function Action({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedText type="small" themeColor={destructive ? undefined : 'textSecondary'}
        style={destructive ? styles.destructive : undefined}>
        {label}
      </ThemedText>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  subList: {
    marginTop: Spacing.two,
    gap: Spacing.two,
    paddingLeft: Spacing.two,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addSub: {
    marginTop: Spacing.one,
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
  promptSheet: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  promptTitle: {},
  promptInput: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
  promptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.four,
  },
  promptButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
});
