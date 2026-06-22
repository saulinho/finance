import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { migrateDb } from '@/db/schema';
import { NotificationCapture } from '@/notifications/notification-capture';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <SQLiteProvider databaseName="finance.db" onInit={migrateDb}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <NotificationCapture />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="conta"
            options={{ presentation: 'modal', title: 'Conta a pagar' }}
          />
          <Stack.Screen
            name="orcamento-form"
            options={{ presentation: 'modal', title: 'Orçamento' }}
          />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
