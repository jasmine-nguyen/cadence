import React, { useState } from 'react';
import { View, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, ScreenScroll, Toggle, Slider, GradientTile } from '@/components';
import { Bell, Clock, Shoe, Ruler, Pause, RefreshCw, ChevronRight } from '@/components/icons';
import { TabHeader } from '@/features/TabHeader';
import { PausePlanSheet } from '@/features/PausePlanSheet';
import { useStore } from '@/state/store';
import { colors, radius as radii, screenPadding } from '@/theme';

/** Settings — reminders · shoe threshold · pause · connections. */
export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, setSettings, pausePlan } = useStore();
  const [pauseOpen, setPauseOpen] = useState(false);

  const signOut = () =>
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => router.replace('/login') },
    ]);

  return (
    <View style={styles.root}>
      <TabHeader title="Settings" />

      <ScreenScroll contentContainerStyle={[styles.body, { paddingBottom: 100 + insets.bottom }]}>
        {/* Account */}
        <Pressable style={styles.account}>
          <GradientTile size={46} radius={23}>
            <Text variant="cardTitle" weight="700" color="onAccent">
              J
            </Text>
          </GradientTile>
          <View style={styles.accountText}>
            <Text variant="cardTitle" weight="600">
              Jasmine
            </Text>
            <Text variant="meta" color="textSecondary">
              jasmine@gmail.com
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>

        {/* Reminders */}
        <Group label="Reminders">
          <Row icon={<Bell size={20} color={colors.textSecondary} strokeWidth={1.8} />} label="Daily reminder" divider>
            <Toggle
              value={settings.dailyReminder}
              onValueChange={(v) => setSettings((s) => ({ ...s, dailyReminder: v }))}
            />
          </Row>
          <Row icon={<Clock size={20} color={colors.textSecondary} strokeWidth={1.8} />} label="Reminder time">
            <Text variant="body" weight="500" color="textSecondary">
              {settings.reminderTime}
            </Text>
          </Row>
        </Group>

        {/* Training */}
        <Group label="Training">
          <View style={[styles.row, styles.divider]}>
            <View style={styles.sliderHead}>
              <View style={styles.rowLeft}>
                <Shoe size={20} color={colors.textSecondary} strokeWidth={1.7} />
                <Text variant="body" weight="500">
                  Shoe replacement
                </Text>
              </View>
              <Text variant="bodySmall" weight="600" color="accentCyan">
                {settings.shoeThresholdKm} km
              </Text>
            </View>
            <Slider
              value={settings.shoeThresholdKm}
              min={300}
              max={800}
              step={10}
              onChange={(v) => setSettings((s) => ({ ...s, shoeThresholdKm: v }))}
            />
          </View>
          <Row
            icon={<Ruler size={20} color={colors.textSecondary} strokeWidth={1.8} />}
            label="Units"
            onPress={() => setSettings((s) => ({ ...s, units: s.units === 'km' ? 'mi' : 'km' }))}
          >
            <Text variant="body" weight="500" color="textSecondary">
              {settings.units === 'km' ? 'Kilometres' : 'Miles'}
            </Text>
          </Row>
        </Group>

        {/* Plan */}
        <Group label="Plan">
          <Row
            icon={<Pause size={20} color={colors.gold} fill={colors.gold} strokeWidth={0} />}
            label="Pause plan"
            onPress={() => setPauseOpen(true)}
            divider
          >
            <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.2} />
          </Row>
          <Row icon={<RefreshCw size={20} color={colors.accentGreen} strokeWidth={1.8} />} label="COROS · connected">
            <View style={styles.statusDot} />
          </Row>
        </Group>

        <Pressable style={styles.signOut} onPress={signOut}>
          <Text variant="body" weight="600" color="red">
            Sign out
          </Text>
        </Pressable>
      </ScreenScroll>

      <PausePlanSheet
        visible={pauseOpen}
        onDismiss={() => setPauseOpen(false)}
        onConfirm={() => {
          setPauseOpen(false);
          pausePlan();
        }}
      />
    </View>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text variant="overline" color="textMuted" style={styles.groupLabel}>
        {label}
      </Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  children,
  onPress,
  divider,
}: {
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
  onPress?: () => void;
  divider?: boolean;
}) {
  const Container = onPress ? Pressable : View;
  return (
    <Container onPress={onPress} style={[styles.row, styles.rowFlex, divider && styles.divider]}>
      <View style={styles.rowLeft}>
        {icon}
        <Text variant="body" weight="500">
          {label}
        </Text>
      </View>
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: screenPadding.content, paddingTop: 16, gap: 20 },
  account: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  accountText: { flex: 1 },
  group: { gap: 8 },
  groupLabel: { letterSpacing: 0.4, marginHorizontal: 4 },
  groupCard: { backgroundColor: colors.card, borderRadius: radii.card, overflow: 'hidden' },
  row: { paddingVertical: 15, paddingHorizontal: 16 },
  rowFlex: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.stroke },
  sliderHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accentGreen },
  signOut: { alignItems: 'center', paddingVertical: 6 },
});
