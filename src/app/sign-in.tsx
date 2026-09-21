import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { signIn } from '@/lib/auth';
import { BhwButton } from '@/ui/BhwButton';
import { BhwScreen } from '@/ui/BhwScreen';
import { BhwTextField } from '@/ui/BhwTextField';

export default function SignInScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const missingInput = email.trim() === '' || password === '';

  async function handleSignIn() {
    setBusy(true);
    setFailed(false);
    try {
      const result = await signIn(email.trim(), password);
      if (!result.ok) {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
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
        onPress={handleSignIn}
        disabled={missingInput}
        loading={busy}
      />
    </BhwScreen>
  );
}
