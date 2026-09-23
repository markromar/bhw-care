import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { inviteKapitan } from '@/lib/inviteKapitan';
import { BhwButton } from '@/ui/BhwButton';
import { BhwScreen } from '@/ui/BhwScreen';
import { BhwTextField } from '@/ui/BhwTextField';

// TEMPORARY minimal screen for testing invite-kapitan end to end, including real email
// delivery. Barangay is fixed to the seeded demo barangay for now; a proper picker
// comes with the full Kapitan-invitation UI later in Day 2.
const DEMO_BARANGAY_ID_PLACEHOLDER = '9e3a6517-9f50-4b64-9ec5-98042cad9ffe';

export default function InviteKapitanScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleInvite() {
    setBusy(true);
    setResult(null);
    const outcome = await inviteKapitan(email.trim(), DEMO_BARANGAY_ID_PLACEHOLDER);
    setBusy(false);
    setResult(
      outcome.ok
        ? `Success. Invitation id: ${outcome.invitationId}`
        : `Failed (${outcome.status}): ${outcome.error}`,
    );
  }

  return (
    <BhwScreen centered={false}>
      <Text accessibilityRole="header" className="text-2xl font-bold text-slate-900">
        Invite Kapitan (test)
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
      <BhwButton
        label="Send invitation"
        onPress={() => void handleInvite()}
        loading={busy}
        disabled={email.trim() === ''}
      />
      {result ? <Text className="text-sm text-slate-800">{result}</Text> : null}
    </BhwScreen>
  );
}
