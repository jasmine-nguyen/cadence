import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, ScreenScroll, Text, Button, BackButton, SegmentedProgress } from '@/components';
import { screenPadding, spacing } from '@/theme';

interface OnboardingChromeProps {
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onContinue: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}

/**
 * Shared onboarding chrome: back chevron + 3-segment progress bar, overline,
 * title/subtitle, scrollable body, and a fixed bottom primary CTA.
 */
export function OnboardingChrome({
  step,
  title,
  subtitle,
  ctaLabel,
  onContinue,
  onBack,
  children,
}: OnboardingChromeProps) {
  const insets = useSafeAreaInsets();

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton onPress={onBack} />
        <SegmentedProgress total={3} filled={step} style={styles.progress} />
      </View>

      <ScreenScroll
        contentContainerStyle={[styles.body, { paddingBottom: 120 }]}
      >
        <Text variant="overline" color="textMuted">{`Step ${step} of 3`}</Text>
        <Text variant="h1" style={styles.title}>
          {title}
        </Text>
        <Text variant="body" color="textSecondary">
          {subtitle}
        </Text>
        <View style={styles.content}>{children}</View>
      </ScreenScroll>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button label={ctaLabel} onPress={onContinue} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: screenPadding.form,
    paddingTop: 14,
    paddingBottom: 2,
  },
  progress: { flex: 1 },
  body: {
    paddingHorizontal: screenPadding.form,
    paddingTop: spacing.xxl,
  },
  title: { marginTop: 10, marginBottom: 6 },
  content: { marginTop: spacing.xxl },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: screenPadding.form,
    paddingTop: 12,
  },
});
