import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SelectOption = { id: number; name: string };

type Props = {
  label: string;
  value: number | null;
  options: SelectOption[];
  onSelect: (id: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** When true, shows a "Nenhuma" option that clears the selection. */
  allowClear?: boolean;
};

export function SelectField({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Selecionar',
  disabled,
  allowClear = true,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <View>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView
          type="backgroundElement"
          style={[styles.field, disabled && styles.fieldDisabled]}>
          <ThemedText themeColor={selected ? 'text' : 'textSecondary'}>
            {selected ? selected.name : placeholder}
          </ThemedText>
        </ThemedView>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheetWrapper} onPress={(e) => e.stopPropagation()}>
            <ThemedView type="background" style={styles.sheet}>
              <ThemedText type="smallBold" style={styles.sheetTitle}>
                {label}
              </ThemedText>
              <ScrollView style={styles.list}>
                {allowClear && (
                  <Row
                    name="Nenhuma"
                    selected={value === null}
                    onPress={() => {
                      onSelect(null);
                      setOpen(false);
                    }}
                  />
                )}
                {options.map((o) => (
                  <Row
                    key={o.id}
                    name={o.name}
                    selected={o.id === value}
                    onPress={() => {
                      onSelect(o.id);
                      setOpen(false);
                    }}
                  />
                ))}
                {options.length === 0 && (
                  <ThemedText themeColor="textSecondary" style={styles.empty}>
                    Nenhuma opção cadastrada.
                  </ThemedText>
                )}
              </ScrollView>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );

  function Row({
    name,
    selected,
    onPress,
  }: {
    name: string;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView
          type={selected ? 'backgroundSelected' : 'background'}
          style={styles.row}>
          <ThemedText themeColor={selected ? 'text' : 'textSecondary'}>{name}</ThemedText>
          {selected && <ThemedText style={{ color: theme.text }}>✓</ThemedText>}
        </ThemedView>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  label: {
    marginBottom: Spacing.one,
  },
  field: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheetWrapper: {
    maxHeight: '70%',
  },
  sheet: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
  },
  sheetTitle: {
    marginBottom: Spacing.two,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  empty: {
    padding: Spacing.three,
  },
});
