import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getShellKind } from '@/domain/roles';
import { signOut } from '@/lib/auth';
import { useSessionStore } from '@/state/sessionStore';

// TEMPORARY role home. It shows which role and layout the signed-in user resolved to.
// Real role dashboards replace this later.
export default function RoleHomePlaceholder() {
  const { t } = useTranslation();
  const context = useSessionStore((state) => state.context);
  const selectRole = useSessionStore((state) => state.selectRole);

  let body: React.ReactNode;

  if (context === null || context.status === 'no_role') {
    body = <Text className="text-base text-slate-800">{t('auth.noRole')}</Text>;
  } else if (context.status === 'invalid_scope') {
    body = <Text className="text-base text-slate-800">{t('auth.invalidScope')}</Text>;
  } else if (context.status === 'needs_role_selection') {
    body = (
      <View className="gap-3">
        <Text className="text-base text-slate-800">{t('auth.chooseRole')}</Text>
        {context.roles.map((role) => (
          <Pressable
            key={role}
            accessibilityRole="button"
            onPress={() => selectRole(role)}
            className="min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-6 active:bg-emerald-700">
            <Text className="text-base font-semibold text-white">{t(`roles.${role}`)}</Text>
          </Pressable>
        ))}
      </View>
    );
  } else {
    const layoutKey =
      getShellKind(context.role) === 'drawer' ? 'home.layoutDrawer' : 'home.layoutBottomTabs';
    body = (
      <View className="gap-2">
        <Text className="text-base text-slate-800">
          {t('home.roleLabel')}: {t(`roles.${context.role}`)}
        </Text>
        <Text className="text-base text-slate-800">
          {t('home.layoutLabel')}: {t(layoutKey)}
        </Text>
        <Text className="mt-2 text-sm text-slate-500">{t('home.placeholderNote')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center gap-6 px-6">
        <Text accessibilityRole="header" className="text-3xl font-bold text-slate-900">
          {t('app.name')}
        </Text>
        {body}
        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          className="min-h-12 items-center justify-center rounded-xl border border-slate-300 px-6 active:bg-slate-100">
          <Text className="text-base font-semibold text-slate-800">{t('auth.signOut')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
