import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Language } from '@/i18n';
import { signOut } from '@/lib/auth';
import { setLanguagePreference } from '@/lib/language';
import { useSessionStore } from '@/state/sessionStore';

// TEMPORARY profile placeholder. The shared Profile & Settings module grows from it.
export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const userId = useSessionStore((state) => state.userId);
  const [notSaved, setNotSaved] = useState(false);

  const options: { language: Language; label: string }[] = [
    { language: 'en', label: t('settings.languageEnglish') },
    { language: 'tl', label: t('settings.languageTagalog') },
  ];

  async function chooseLanguage(language: Language) {
    setNotSaved(false);
    if (userId === null) {
      return;
    }
    const saved = await setLanguagePreference(userId, language);
    setNotSaved(!saved);
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center gap-6 px-6">
        <Text accessibilityRole="header" className="text-3xl font-bold text-slate-900">
          {t('nav.profile')}
        </Text>

        <View className="gap-3">
          <Text className="text-base font-medium text-slate-700">{t('settings.language')}</Text>
          <View className="flex-row gap-3">
            {options.map((option) => {
              const selected = i18n.language === option.language;
              return (
                <Pressable
                  key={option.language}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => void chooseLanguage(option.language)}
                  className={`min-h-12 flex-1 items-center justify-center rounded-xl border px-4 ${
                    selected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                  }`}>
                  <Text
                    className={`text-base font-semibold ${
                      selected ? 'text-white' : 'text-slate-800'
                    }`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {notSaved ? (
            <Text accessibilityLiveRegion="polite" className="text-sm text-slate-500">
              {t('sync.savedOnDevice')}
            </Text>
          ) : null}
        </View>

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
