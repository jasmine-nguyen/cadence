import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, ScreenScroll, Text, Button, TextField } from '@/components';
import { BrandMark, AppleGlyph, GoogleGlyph } from '@/components/icons';
import { useStore } from '@/state/store';
import { colors, radius as radii, screenPadding, spacing } from '@/theme';

/** Login / Sign-up — email primary, social + 2FA low-emphasis. Handles error. */
export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setAuth } = useStore();

  const [email, setEmail] = useState('jasmine@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onContinue = () => {
    // Soft validation → inline invalid-credentials error, else 2FA.
    if (!email.trim() || password.length < 6) {
      setError('Incorrect email or password. Try again.');
      return;
    }
    setError(null);
    setLoading(true);
    setAuth((a) => ({ ...a, email, needs2fa: true }));
    setTimeout(() => {
      setLoading(false);
      router.push('/login/verify');
    }, 500);
  };

  return (
    <Screen>
      <ScreenScroll contentContainerStyle={styles.scroll}>
        <View style={styles.brand}>
          <BrandMark size={66} />
          <Text variant="h1Large" style={styles.wordmark}>
            Cadence
          </Text>
          <Text variant="body" color="textSecondary" center style={styles.tagline}>
            Your running coach, one step at a time.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@email.com"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError(null);
            }}
            secure
            placeholder="••••••••"
            error={error ?? undefined}
          />
          <Pressable style={styles.forgot} hitSlop={8}>
            <Text variant="meta" weight="500" color="accentCyan">
              Forgot password?
            </Text>
          </Pressable>
          <Button label="Continue" onPress={onContinue} loading={loading} style={styles.cta} />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text variant="meta" color="textMuted">
            or
          </Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.social}>
          <SocialButton label="Apple" glyph={<AppleGlyph />} />
          <SocialButton label="Google" glyph={<GoogleGlyph />} />
        </View>
      </ScreenScroll>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Text variant="bodySmall" color="textSecondary">
          New here?{' '}
        </Text>
        <Pressable hitSlop={8} onPress={() => router.push('/onboarding')}>
          <Text variant="bodySmall" weight="600" color="accentCyan">
            Create account
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

/** Quiet outline social button — intentionally low-emphasis. */
function SocialButton({ label, glyph }: { label: string; glyph: React.ReactNode }) {
  return (
    <Pressable style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}>
      {glyph}
      <Text variant="bodySmall" weight="500" color="textSecondary">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 90,
  },
  brand: { alignItems: 'center' },
  wordmark: { marginTop: 22 },
  tagline: { marginTop: 10 },
  form: { marginTop: 44, gap: 14 },
  forgot: { alignSelf: 'flex-end' },
  cta: { marginTop: 4 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 26,
  },
  divider: { flex: 1, height: 1, backgroundColor: colors.stroke },
  social: { flexDirection: 'row', gap: 12, marginTop: 20 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.input,
    paddingVertical: 13,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  pressed: { opacity: 0.8 },
});
