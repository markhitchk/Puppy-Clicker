const optionalPublicEnv = {
  discordClientId: process.env.EXPO_PUBLIC_DISCORD_CLIENT_ID ?? '',
  discordGuildId: process.env.EXPO_PUBLIC_DISCORD_GUILD_ID ?? '',
  discordDeveloperRoleId: process.env.EXPO_PUBLIC_DISCORD_ROLE_DEVELOPER_ID ?? '',
  discordAdminRoleId: process.env.EXPO_PUBLIC_DISCORD_ROLE_ADMIN_ID ?? '',
  discordPupMembersRoleId: process.env.EXPO_PUBLIC_DISCORD_ROLE_PUP_MEMBERS_ID ?? '',
  discordGuestRoleId: process.env.EXPO_PUBLIC_DISCORD_ROLE_GUEST_ID ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
} as const;

export const publicEnv = optionalPublicEnv;
