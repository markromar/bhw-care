import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signOut } from '@/lib/auth';

// TEMPORARY profile placeholder. The shared Profile & Settings module replaces it.
export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const languageLabel =
    i18n.language === 'tl' ? t('settings.languageTagalog') : t('settings.languageEnglish');

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center gap-6 px-6">
        <Text accessibilityRole="header" className="text-3xl font-bold text-slate-900">
          {t('nav.profile')}
        </Text>
        <Text className="text-base text-slate-800">
          {t('settings.language')}: {languageLabel}
        </Text>
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
