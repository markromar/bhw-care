import { Drawer } from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import type { NavItem } from '@/domain/navigation';

type Props = {
  items: readonly NavItem[];
};

export function DrawerShell({ items }: Props) {
  const { t } = useTranslation();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer>
        {items.map((item) => (
          <Drawer.Screen
            key={item.key}
            name={item.routeName}
            options={{ drawerLabel: t(item.labelKey), title: t(item.labelKey) }}
          />
        ))}
      </Drawer>
    </GestureHandlerRootView>
  );
}
