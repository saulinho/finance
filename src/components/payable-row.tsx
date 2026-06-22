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
  onTogglePaid: () => void;
};

export function PayableRow({ payable, onPress, onTogglePaid }: Props) {
  const isPaid = payable.paid === 1;
  const categoria = [payable.category_name, payable.subcategory_name]
    .filter(Boolean)
    .join(' › ');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.container}>
        <Pressable onPress={onTogglePaid} hitSlop={8} style={styles.checkWrapper}>
          <ThemedView
            type={isPaid ? 'backgroundSelected' : 'background'}
            style={styles.check}>
            <ThemedText themeColor={isPaid ? 'text' : 'textSecondary'}>
              {isPaid ? '✓' : ''}
            </ThemedText>
          </ThemedView>
        </Pressable>

        <View style={styles.body}>
          <ThemedText type="smallBold" style={isPaid && styles.paidText} numberOfLines={1}>
            {payable.supplier}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Vence {formatDateBR(payable.due_date)}
            {categoria ? `  ·  ${categoria}` : ''}
          </ThemedText>
          {payable.source === 'notification' && (
            <ThemedText type="small" themeColor="textSecondary">
              ⚡ via notificação
            </ThemedText>
          )}
        </View>

        <ThemedText type="smallBold" style={isPaid && styles.paidText}>
          {formatBRL(payable.amount_cents)}
        </ThemedText>
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
  checkWrapper: {
    justifyContent: 'center',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  paidText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.7,
  },
});
