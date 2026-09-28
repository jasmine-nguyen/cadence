import React, { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text, Button, BackButton, CodeInput } from '@/components';
import { Lock } from '@/components/icons';
import { useStore } from '@/state/store';
import { colors, spacing } from '@/theme';

const CODE_LENGTH = 6;

/** Login · 2-step verification. */
export default function Verify() {
  const router = useRouter();
  const { auth } = useStore();

  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(24);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const onVerify = () => {
    setVerifying(true);
    setTimeout(() => router.replace('/(tabs)'), 500);
  };

  const mmss = `0:${String(countdown).padStart(2, '0')}`;
  const email = auth.email || 'jasmine@gmail.com';

  return (
    <Screen>
      {/* Lifts the Verify button above the number pad instead of under it. */}
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <View style={styles.header}>
          <BackButton />
        </View>

        <View style={styles.body}>
          <View style={styles.lockTile}>
            <Lock size={28} color={colors.accentCyan} strokeWidth={1.9} />
          </View>
          <Text variant="h1" center style={styles.title}>
            Verify it's you
          </Text>
          <Text variant="body" color="textSecondary" center>
            We sent a 6-digit code to
          </Text>
          <Text variant="body" weight="600" center>
            {email}
          </Text>

          <View style={styles.codeWrap}>
            <CodeInput length={CODE_LENGTH} value={code} onChange={setCode} />
          </View>

          <Text variant="bodySmall" color="textMuted" center style={styles.resend}>
            Resend code in{' '}
            {countdown > 0 ? (
              <Text variant="bodySmall" color="textSecondary">
                {mmss}
              </Text>
            ) : (
              <Text variant="bodySmall" weight="600" color="accentCyan">
                Resend now
              </Text>
            )}
          </Text>
        </View>

        <View style={styles.footer}>
          {/* No backend to send a code yet, so Verify works with any (or no) code. */}
          <Button label="Verify" onPress={onVerify} loading={verifying} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: 26, paddingTop: 14 },
  body: { flex: 1, paddingHorizontal: 32, paddingTop: 44, alignItems: 'center' },
  lockTile: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.cardInset,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { marginBottom: 10 },
  codeWrap: { marginTop: 36 },
  resend: { marginTop: 26 },
  footer: {
    paddingHorizontal: 32,
    paddingTop: spacing.md,
    paddingBottom: 12,
  },
});
