import { Ionicons } from '@expo/vector-icons';
import {
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ACTIVE_COLOR = '#208AEF';

type TabDef = {
  name: string;
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const TABS: TabDef[] = [
  { name: 'contas', href: '/', label: 'Transações', icon: 'receipt-outline', iconActive: 'receipt' },
  {
    name: 'grafico',
    href: '/grafico',
    label: 'Gráfico',
    icon: 'pie-chart-outline',
    iconActive: 'pie-chart',
  },
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
    name: 'config',
    href: '/config',
    label: 'Config',
    icon: 'settings-outline',
    iconActive: 'settings',
  },
];

export default function TabsLayout() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <TabBar>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href as never} asChild>
              <TabButton tab={tab} />
            </TabTrigger>
          ))}
        </TabBar>
      </TabList>
    </Tabs>
  );
}

/** Bottom bar container; receives layout props from <TabList asChild>. */
function TabBar({ children, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <ThemedView
      {...props}
      type="backgroundElement"
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, Spacing.two), borderTopColor: theme.backgroundSelected },
      ]}>
      {children}
    </ThemedView>
  );
}

/** A single tab: distinct icon + always-visible label. */
function TabButton({ tab, isFocused, ...props }: { tab: TabDef } & TabTriggerSlotProps) {
  const theme = useTheme();
  const color = isFocused ? ACTIVE_COLOR : theme.textSecondary;
  return (
    <Pressable {...props} style={styles.tab}>
      <Ionicons name={isFocused ? tab.iconActive : tab.icon} size={22} color={color} />
      <ThemedText type="small" style={[styles.label, { color }]} numberOfLines={1}>
        {tab.label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.one,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
});
