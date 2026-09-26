import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGame } from '@/src/state/GameContext';
import { colors, radii, spacing } from '@/src/theme';

export function PlayScreen() {
  const { puppyPoints, clickPower, addPuppyPoints } = useGame();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Puppy Clicker 2.0 migration</Text>
        <Text style={styles.title}>Play</Text>
        <Text style={styles.subtitle}>One shared React Native screen for Android, iOS, and web.</Text>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Puppy Points</Text>
        <Text style={styles.statValue}>{puppyPoints.toLocaleString()}</Text>
        <Text style={styles.statMeta}>+{clickPower} per tap</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pet the puppy"
        onPress={addPuppyPoints}
        style={({ pressed }) => [styles.puppyButton, pressed && styles.puppyButtonPressed]}
      >
        <Text style={styles.puppy}>🐶</Text>
        <Text style={styles.tapLabel}>Pet the puppy</Text>
      </Pressable>

      <Text style={styles.note}>
        Part 1 proves the shared game-state and navigation shell. Existing progression, saves,
        casino, PupEye, notifications, authentication, and economy migrate in later parts.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.lg,
  },
  header: { gap: spacing.xs },
  eyebrow: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: { color: colors.text, fontSize: 34, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  statValue: { color: colors.text, fontSize: 44, fontWeight: '900', marginTop: spacing.xs },
  statMeta: { color: colors.success, fontSize: 14, fontWeight: '700' },
  puppyButton: {
    minHeight: 210,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.primary,
    borderWidth: 2,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  puppyButtonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  puppy: { fontSize: 96 },
  tapLabel: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  note: { color: colors.textMuted, lineHeight: 20, fontSize: 13 },
});
