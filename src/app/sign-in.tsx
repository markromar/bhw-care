import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { completeSignInAfterMfa, signIn } from '@/lib/auth';
import { verifySignInChallenge } from '@/lib/mfaChallenge';
import { BhwButton } from '@/ui/BhwButton';
import { BhwScreen } from '@/ui/BhwScreen';
import { BhwTextField } from '@/ui/BhwTextField';

type Step = { kind: 'password' } | { kind: 'mfa'; factorId: string };

export default function SignInScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>({ kind: 'password' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const missingPasswordInput = email.trim() === '' || password === '';
  const missingCodeInput = code.trim().length !== 6;

  async function handleSignIn() {
    setBusy(true);
    setFailed(false);
    try {
      const result = await signIn(email.trim(), password);
      if (!result.ok) {
        if ('mfaRequired' in result) {
          setStep({ kind: 'mfa', factorId: result.factorId });
        } else {
          setFailed(true);
        }
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCode() {
    if (step.kind !== 'mfa') {
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const verified = await verifySignInChallenge(step.factorId, code.trim());
      if (!verified.ok) {
        setFailed(true);
        return;
      }
      const result = await completeSignInAfterMfa();
      if (!result.ok) {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (step.kind === 'mfa') {
    return (
      <BhwScreen>
        <Text accessibilityRole="header" className="text-3xl font-bold text-slate-900">
          {t('auth.mfaTitle')}
        </Text>
        <Text className="text-base text-slate-700">{t('security.enterCode')}</Text>
        <BhwTextField
          label={t('security.enterCode')}
          keyboardType="number-pad"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect={false}
          value={code}
          onChangeText={setCode}
        />
        {failed ? (
          <Text accessibilityLiveRegion="polite" className="text-base text-red-700">
            {t('auth.mfaFailed')}
          </Text>
        ) : null}
        <BhwButton
          label={busy ? t('auth.signingIn') : t('security.verify')}
          onPress={() => void handleVerifyCode()}
          disabled={missingCodeInput}
          loading={busy}
        />
      </BhwScreen>
    );
  }

  return (
    <BhwScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-slate-900">
        {t('app.name')}
      </Text>

      <BhwTextField
        label={t('auth.email')}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <BhwTextField
        label={t('auth.password')}
        autoCapitalize="none"
        autoComplete="password"
        autoCorrect={false}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {failed ? (
        <Text accessibilityLiveRegion="polite" className="text-base text-red-700">
          {t('auth.signInFailed')}
        </Text>
      ) : null}

      <BhwButton
        label={busy ? t('auth.signingIn') : t('auth.signIn')}
        onPress={() => void handleSignIn()}
        disabled={missingPasswordInput}
        loading={busy}
      />
    </BhwScreen>
  );
}
