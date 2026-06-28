import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import type { PayableWithNames } from '@/db/types';
import { formatDateBR } from '@/lib/date';
import { formatBRL } from '@/lib/money';

type Props = {
  payable: PayableWithNames;
  onPress: () => void;
};

export function PayableRow({ payable, onPress }: Props) {
  const uncategorized = payable.category_id === null || payable.subcategory_id === null;
  const categoria = [payable.category_name, payable.subcategory_name]
    .filter(Boolean)
    .join(' › ');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type="backgroundElement"
        style={[styles.container, uncategorized && styles.uncategorized]}>
        <View style={styles.body}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {payable.supplier}
          </ThemedText>
          {uncategorized ? (
            <ThemedText type="small" style={styles.uncategorizedText}>
              Não categorizada
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {categoria}
            </ThemedText>
          )}
          {payable.source === 'notification' && (
            <ThemedText type="small" themeColor="textSecondary">
              ⚡ via notificação
            </ThemedText>
          )}
          {!!payable.due_date && (
            <ThemedText type="small" themeColor="textSecondary">
              Pago em {formatDateBR(payable.due_date)}
            </ThemedText>
          )}
        </View>

        <ThemedText type="smallBold">{formatBRL(payable.amount_cents)}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  uncategorized: {
    borderWidth: 1,
    borderColor: '#e5484d',
  },
  uncategorizedText: {
    color: '#e5484d',
    fontWeight: '700',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
