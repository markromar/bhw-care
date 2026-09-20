import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isValidRecordReference } from '@/domain/recordReference';
import { resolveRecordReference, type RecordAccessResult } from '@/lib/recordAccess';
import { usePendingRecordStore } from '@/state/pendingRecordStore';
import { useSessionStore } from '@/state/sessionStore';

// Deep-link target for QR codes: /r/<opaque reference>.
// Scanning never grants access. Signed-out users go to sign-in first; signed-in users
// are checked by the server-side resolver, which today always fails closed.
export default function RecordLinkScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ ref: string }>();
  const status = useSessionStore((state) => state.status);
  const setPending = usePendingRecordStore((state) => state.setPending);
  const clearPending = usePendingRecordStore((state) => state.clearPending);
  const [result, setResult] = useState<RecordAccessResult | null>(null);

  const validRef =
    typeof params.ref === 'string' && isValidRecordReference(params.ref) ? params.ref : null;

  useEffect(() => {
    if (validRef !== null && status === 'signed_out') {
      setPending(validRef);
    }
  }, [validRef, status, setPending]);

  useEffect(() => {
    let cancelled = false;

    if (validRef !== null && status === 'signed_in') {
      clearPending();
      resolveRecordReference(validRef)
        .then((next) => {
          if (!cancelled) {
            setResult(next);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResult({ status: 'denied' });
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [validRef, status, clearPending]);

  if (validRef !== null && status === 'signed_out') {
    return <Redirect href="/sign-in" />;
  }

  if (result !== null && result.status === 'allowed') {
    return <Redirect href={result.path as Href} />;
  }

  const waiting = validRef !== null && result === null;

  let message = t('record.notAvailable');
  if (waiting) {
    message = t('record.checking');
  } else if (result !== null && result.status === 'denied') {
    message = t('record.denied');
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center gap-6 px-6">
        {waiting ? <ActivityIndicator /> : null}
        <Text accessibilityLiveRegion="polite" className="text-center text-base text-slate-800">
          {message}
        </Text>
        {!waiting ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/')}
            className="min-h-12 items-center justify-center rounded-xl border border-slate-300 px-6 active:bg-slate-100">
            <Text className="text-base font-semibold text-slate-800">{t('common.back')}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
