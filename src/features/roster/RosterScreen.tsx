import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import discordManifest from '@/assets/discord_rewards/manifest.json';
import v1Manifest from '@/assets/v1/manifest.json';
import v2Manifest from '@/assets/v2/manifest.json';
import { colors, radii, spacing } from '@/src/theme';

type PuppyManifestEntry = {
  number?: number;
  name: string;
  asset_id: string;
  file: string;
  unlock_source?: string;
  description?: string;
};

const v1 = v1Manifest as PuppyManifestEntry[];
const v2 = (v2Manifest as { puppies: PuppyManifestEntry[] }).puppies;
const discord = (discordManifest as { puppies: PuppyManifestEntry[] }).puppies;

const puppies = [
  ...v1.map((item) => ({ ...item, group: 'V1' })),
  ...v2.map((item) => ({ ...item, group: 'V2' })),
  ...discord.map((item) => ({ ...item, group: 'Discord Rewards' })),
];

export function RosterScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={puppies}
        keyExtractor={(item) => `${item.group}:${item.asset_id}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Puppy Roster</Text>
            <Text style={styles.subtitle}>
              {puppies.length} migrated roster records are already driven from the original repository manifests.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.group}>{item.group}</Text>
            </View>
            <Text style={styles.assetId}>{item.asset_id}</Text>
            <Text style={styles.unlock}>{item.unlock_source ?? 'Existing roster unlock rules'}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm },
  header: { gap: spacing.xs, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 32, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  name: { color: colors.text, fontWeight: '800', fontSize: 17, flex: 1 },
  group: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  assetId: { color: colors.textMuted, fontFamily: 'monospace', fontSize: 12 },
  unlock: { color: colors.textMuted, fontSize: 13 },
});
