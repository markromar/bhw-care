import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { MFA_STATUS_LABEL_KEYS, summarizeMfa, type MfaSummary } from '@/domain/mfaStatus';
import type { Language } from '@/i18n';
import { signOut } from '@/lib/auth';
import { setLanguagePreference } from '@/lib/language';
import { fetchMfaState, type MfaState } from '@/lib/mfa';
import { useSessionStore } from '@/state/sessionStore';
import { BhwButton } from '@/ui/BhwButton';
import { BhwCard } from '@/ui/BhwCard';
import { BhwScreen } from '@/ui/BhwScreen';

// TEMPORARY profile page. The shared Profile & Settings module grows from it.
export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const userId = useSessionStore((state) => state.userId);
  const context = useSessionStore((state) => state.context);
  const role = context !== null && context.status === 'ready' ? context.role : null;

  const [notSaved, setNotSaved] = useState(false);
  const [mfa, setMfa] = useState<MfaState | null | 'loading'>('loading');

  useEffect(() => {
    let cancelled = false;
    void fetchMfaState().then((state) => {
      if (!cancelled) {
        setMfa(state);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  let mfaLabel = t('common.loading');
  let summary: MfaSummary | null = null;
  if (mfa !== 'loading') {
    if (mfa === null || role === null) {
      mfaLabel = t('security.statusUnknown');
    } else {
      summary = summarizeMfa({ role, enrolled: mfa.enrolled, currentLevel: mfa.currentLevel });
      mfaLabel = t(MFA_STATUS_LABEL_KEYS[summary.statusKey]);
    }
  }
  const showSetupNote =
    summary !== null &&
    (summary.statusKey === 'off' || summary.statusKey === 'enrollment_required');

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

      <BhwCard>
        <Text className="text-base font-medium text-slate-700">{t('security.title')}</Text>
        <Text className="text-base text-slate-900">
          {t('security.twoFactor')}: {mfaLabel}
        </Text>
        {summary !== null && summary.required ? (
          <Text className="text-sm text-slate-500">{t('security.required')}</Text>
        ) : null}
        {showSetupNote ? (
          <Text className="text-sm text-slate-500">{t('security.setupLater')}</Text>
        ) : null}
      </BhwCard>

      <BhwButton variant="secondary" label={t('auth.signOut')} onPress={() => void signOut()} />
    </BhwScreen>
  );
}
