import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { getShellKind } from '@/domain/roles';
import { signOut } from '@/lib/auth';
import { useSessionStore } from '@/state/sessionStore';
import { BhwButton } from '@/ui/BhwButton';
import { BhwCard } from '@/ui/BhwCard';
import { BhwScreen } from '@/ui/BhwScreen';

// TEMPORARY role home. It shows which role and layout the signed-in user resolved to.
// Real role dashboards replace this later.
export default function RoleHomePlaceholder() {
  const { t } = useTranslation();
  const context = useSessionStore((state) => state.context);
  const selectRole = useSessionStore((state) => state.selectRole);

  let body: ReactNode;

  if (context === null || context.status === 'no_role') {
    body = <Text className="text-base text-slate-800">{t('auth.noRole')}</Text>;
  } else if (context.status === 'invalid_scope') {
    body = <Text className="text-base text-slate-800">{t('auth.invalidScope')}</Text>;
  } else if (context.status === 'needs_role_selection') {
    body = (
      <View className="gap-3">
        <Text className="text-base text-slate-800">{t('auth.chooseRole')}</Text>
        {context.roles.map((role) => (
          <BhwButton key={role} label={t(`roles.${role}`)} onPress={() => selectRole(role)} />
        ))}
      </View>
    );
  } else {
    const layoutKey =
      getShellKind(context.role) === 'drawer' ? 'home.layoutDrawer' : 'home.layoutBottomTabs';
    body = (
      <BhwCard>
        <Text className="text-base text-slate-800">
          {t('home.roleLabel')}: {t(`roles.${context.role}`)}
        </Text>
        <Text className="text-base text-slate-800">
          {t('home.layoutLabel')}: {t(layoutKey)}
        </Text>
        <Text className="mt-2 text-sm text-slate-500">{t('home.placeholderNote')}</Text>
      </BhwCard>
    );
  }

  return (
    <BhwScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-slate-900">
        {t('app.name')}
      </Text>
      {body}
      <BhwButton variant="secondary" label={t('auth.signOut')} onPress={() => void signOut()} />
    </BhwScreen>
  );
}
