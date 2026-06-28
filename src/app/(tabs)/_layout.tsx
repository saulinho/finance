import { Ionicons } from '@expo/vector-icons';
import {
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ACTIVE_COLOR = '#208AEF';
const MENU_WIDTH = 280;

type TabDef = {
  name: string;
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const TABS: TabDef[] = [
  { name: 'contas', href: '/', label: 'Contas', icon: 'receipt-outline', iconActive: 'receipt' },
  {
    name: 'orcamento',
    href: '/orcamento',
    label: 'Orçamento',
    icon: 'wallet-outline',
    iconActive: 'wallet',
  },
  {
    name: 'comparativo',
    href: '/comparativo',
    label: 'Comparativo',
    icon: 'bar-chart-outline',
    iconActive: 'bar-chart',
  },
  {
    name: 'categorias',
    href: '/categorias',
    label: 'Categorias',
    icon: 'pricetags-outline',
    iconActive: 'pricetags',
  },
  {
    name: 'carteira',
    href: '/carteira',
    label: 'Carteira',
    icon: 'card-outline',
    iconActive: 'card',
  },
  {
    name: 'config',
    href: '/config',
    label: 'Config',
    icon: 'settings-outline',
    iconActive: 'settings',
  },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Tabs>
      {/* Top app bar with the hamburger that opens the side menu. */}
      <ThemedView
        type="backgroundElement"
        style={[
          styles.topBar,
          { paddingTop: insets.top, borderBottomColor: theme.backgroundSelected },
        ]}>
        <Pressable
          onPress={() => setOpen(true)}
          hitSlop={8}
          accessibilityLabel="Abrir menu"
          accessibilityRole="button"
          style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
          <Ionicons name="menu" size={26} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.brand}>Finanças</ThemedText>
      </ThemedView>

      <TabSlot style={styles.slot} />

      {/* The TabList stays mounted (off-screen when closed) so the navigator
          keeps its routes; it slides in as the menu when the hamburger opens. */}
      <TabList asChild>
        <SideMenu open={open} onClose={() => setOpen(false)} insetTop={insets.top}>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href as never} asChild>
              <MenuItem tab={tab} onSelect={() => setOpen(false)} />
            </TabTrigger>
          ))}
        </SideMenu>
      </TabList>
    </Tabs>
  );
}

/** Full-screen overlay (backdrop + left panel) holding the navigation items. */
function SideMenu({
  open,
  onClose,
  insetTop,
  children,
  ...props
}: {
  open: boolean;
  onClose: () => void;
  insetTop: number;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const [translateX] = useState(() => new Animated.Value(-MENU_WIDTH));
  const [backdrop] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: open ? 0 : -MENU_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
    Animated.timing(backdrop, {
      toValue: open ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [open, translateX, backdrop]);

  return (
    <View {...props} pointerEvents={open ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.menuPanel,
          {
            paddingTop: insetTop + Spacing.three,
            backgroundColor: theme.backgroundElement,
            borderRightColor: theme.backgroundSelected,
            transform: [{ translateX }],
          },
        ]}>
        {children}
      </Animated.View>
    </View>
  );
}

/** A single navigation row inside the side menu. */
function MenuItem({
  tab,
  isFocused,
  onSelect,
  onPress,
  ...props
}: { tab: TabDef; onSelect: () => void } & TabTriggerSlotProps) {
  const theme = useTheme();
  const color = isFocused ? ACTIVE_COLOR : theme.text;
  return (
    <Pressable
      {...props}
      onPress={(e) => {
        onPress?.(e);
        onSelect();
      }}
      style={({ pressed }) => [
        styles.menuItem,
        isFocused && { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <Ionicons name={isFocused ? tab.iconActive : tab.icon} size={22} color={color} />
      <ThemedText style={[styles.menuLabel, { color }]}>{tab.label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: MENU_WIDTH,
    paddingHorizontal: Spacing.two,
    gap: Spacing.one,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});
