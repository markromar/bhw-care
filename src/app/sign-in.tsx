import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signIn } from '@/lib/auth';

export default function SignInScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const canSubmit = !busy && email.trim() !== '' && password !== '';

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
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center gap-4 px-6">
        <Text accessibilityRole="header" className="text-3xl font-bold text-slate-900">
          {t('app.name')}
        </Text>

        <View className="gap-2">
          <Text className="text-base font-medium text-slate-700">{t('auth.email')}</Text>
          <TextInput
            accessibilityLabel={t('auth.email')}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900"
          />
        </View>

        <View className="gap-2">
          <Text className="text-base font-medium text-slate-700">{t('auth.password')}</Text>
          <TextInput
            accessibilityLabel={t('auth.password')}
            autoCapitalize="none"
            autoComplete="password"
            autoCorrect={false}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900"
          />
        </View>

        {failed ? (
          <Text accessibilityLiveRegion="polite" className="text-base text-red-700">
            {t('auth.signInFailed')}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={handleSignIn}
          className={`min-h-12 items-center justify-center rounded-xl px-6 ${
            canSubmit ? 'bg-emerald-600 active:bg-emerald-700' : 'bg-slate-300'
          }`}>
          <Text className="text-base font-semibold text-white">
            {busy ? t('auth.signingIn') : t('auth.signIn')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
