import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import type { NavItem, NavItemKey } from '@/domain/navigation';

// Placeholder icons from the Expo template until BHW Care icons are chosen.
const TAB_ICONS: Record<NavItemKey, number> = {
  home: require('@/assets/images/tabIcons/home.png'),
  profile: require('@/assets/images/tabIcons/explore.png'),
};

type Props = {
  items: readonly NavItem[];
};

export function BottomTabsShell({ items }: Props) {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      {items.map((item) => (
        <NativeTabs.Trigger key={item.key} name={item.routeName}>
          <NativeTabs.Trigger.Label>{t(item.labelKey)}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={TAB_ICONS[item.key]} renderingMode="template" />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
