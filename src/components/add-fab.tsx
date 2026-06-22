import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';

import { Spacing, TabBarHeight } from '@/constants/theme';

/**
 * Floating "add" button, pinned above the custom bottom tab bar (accounts for
 * the bottom safe-area inset so it isn't cramped against the navbar).
 */
export function AddFab({
  onPress,
  accessibilityLabel = 'Adicionar',
}: {
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.fab,
        { bottom: insets.bottom + TabBarHeight + Spacing.three },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={styles.icon}>＋</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#208AEF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  icon: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 32,
  },
  pressed: {
    opacity: 0.8,
  },
});
