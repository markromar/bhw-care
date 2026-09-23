import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { MFA_STATUS_LABEL_KEYS, summarizeMfa, type MfaSummary } from '@/domain/mfaStatus';
import type { Language } from '@/i18n';
import { signOut } from '@/lib/auth';
import { setLanguagePreference } from '@/lib/language';
import { fetchMfaState, type MfaState } from '@/lib/mfa';
import { cancelMfaEnrollment, startMfaEnrollment, verifyMfaEnrollment } from '@/lib/mfaEnroll';
import { useSessionStore } from '@/state/sessionStore';
import { BhwButton } from '@/ui/BhwButton';
import { BhwCard } from '@/ui/BhwCard';
import { BhwScreen } from '@/ui/BhwScreen';

type EnrollState =
  | { step: 'idle' }
  | { step: 'scanning'; factorId: string; qrCodeSvg: string; secret: string }
  | { step: 'verifying'; factorId: string; qrCodeSvg: string; secret: string };

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const userId = useSessionStore((state) => state.userId);
  const context = useSessionStore((state) => state.context);
  const role = context !== null && context.status === 'ready' ? context.role : null;

  const [notSaved, setNotSaved] = useState(false);
  const [mfa, setMfa] = useState<MfaState | null | 'loading'>('loading');
  const [enroll, setEnroll] = useState<EnrollState>({ step: 'idle' });
  const [code, setCode] = useState('');
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshMfa() {
    setMfa(await fetchMfaState());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refreshMfa is async; setMfa only runs after fetchMfaState() resolves, not synchronously here.
    void refreshMfa();
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

  async function handleStartEnroll() {
    setEnrollError(null);
    setBusy(true);
    const result = await startMfaEnrollment();
    setBusy(false);
    if (!result.ok) {
      setEnrollError(result.error);
      return;
    }
    setEnroll({
      step: 'scanning',
      factorId: result.factorId,
      qrCodeSvg: result.qrCodeSvg,
      secret: result.secret,
    });
  }

  async function handleVerify() {
    if (enroll.step === 'idle') {
      return;
    }
    setEnrollError(null);
    setBusy(true);
    const result = await verifyMfaEnrollment(enroll.factorId, code.trim());
    setBusy(false);
    if (!result.ok) {
      setEnrollError(result.error);
      return;
    }
    setEnroll({ step: 'idle' });
    setCode('');
    await refreshMfa();
  }

  async function handleCancel() {
    if (enroll.step === 'idle') {
      return;
    }
    await cancelMfaEnrollment(enroll.factorId);
    setEnroll({ step: 'idle' });
    setCode('');
    setEnrollError(null);
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
  const canEnroll =
    summary !== null &&
    (summary.statusKey === 'off' || summary.statusKey === 'enrollment_required') &&
    enroll.step === 'idle';

  return (
    <BhwScreen centered={false}>
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

        {canEnroll ? (
          <View className="mt-2">
            <BhwButton
              label={t('security.setUp')}
              onPress={() => void handleStartEnroll()}
              loading={busy}
            />
          </View>
        ) : null}

        {enroll.step === 'scanning' || enroll.step === 'verifying' ? (
          <View className="mt-3 gap-3">
            <Text className="text-sm text-slate-700">{t('security.scanQr')}</Text>
            <View className="items-center rounded-xl border border-slate-200 bg-white p-3">
              <SvgXml xml={enroll.qrCodeSvg} width={200} height={200} />
            </View>
            <Text className="text-xs text-slate-500">{t('security.orEnterSecret')}</Text>
            <Text selectable className="text-sm font-mono text-slate-800">
              {enroll.secret}
            </Text>

            <Text className="text-base font-medium text-slate-700">{t('security.enterCode')}</Text>
            <TextInput
              accessibilityLabel={t('security.enterCode')}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-center text-lg tracking-widest text-slate-900"
            />

            {enrollError ? <Text className="text-sm text-red-700">{enrollError}</Text> : null}

            <View className="flex-row gap-3">
              <View className="flex-1">
                <BhwButton
                  label={t('security.verify')}
                  onPress={() => void handleVerify()}
                  loading={busy}
                  disabled={code.trim().length !== 6}
                />
              </View>
              <View className="flex-1">
                <BhwButton
                  variant="secondary"
                  label={t('common.cancel')}
                  onPress={() => void handleCancel()}
                />
              </View>
            </View>
          </View>
        ) : null}
      </BhwCard>

      <BhwButton variant="secondary" label={t('auth.signOut')} onPress={() => void signOut()} />
    </BhwScreen>
  );
}
