import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Language } from '@/i18n';
import { signOut } from '@/lib/auth';
import { setLanguagePreference } from '@/lib/language';
import { useSessionStore } from '@/state/sessionStore';
import { BhwButton } from '@/ui/BhwButton';
import { BhwScreen } from '@/ui/BhwScreen';

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
    <BhwScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-slate-900">
        {t('nav.profile')}
      </Text>

      <View className="gap-3">
        <Text className="text-base font-medium text-slate-700">{t('settings.language')}</Text>
        <View className="flex-row gap-3">
          {options.map((option) => {
            const selected = i18n.language === option.language;
            return (
              <View key={option.language} className="flex-1">
                <BhwButton
                  label={option.label}
                  variant={selected ? 'primary' : 'secondary'}
                  selected={selected}
                  onPress={() => void chooseLanguage(option.language)}
                />
              </View>
            );
          })}
        </View>
        {notSaved ? (
          <Text accessibilityLiveRegion="polite" className="text-sm text-slate-500">
            {t('sync.savedOnDevice')}
          </Text>
        ) : null}
      </View>

      <BhwButton variant="secondary" label={t('auth.signOut')} onPress={() => void signOut()} />
    </BhwScreen>
  );
}
