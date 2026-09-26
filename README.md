# Puppy Clicker

Puppy Clicker is being migrated from the existing Kotlin/Jetpack Compose Android codebase to a shared **React Native + Expo** application for Android, iOS, and web.

## Current migration branch

`migration/react-native-part-1`

Part 1 establishes the shared application shell, navigation, initial clicker state, roster data model, public runtime configuration, legal documents, and build configuration.

## Toolchain

- Expo SDK 57
- React Native 0.86
- React 19.2
- Expo Router
- TypeScript
- EAS Build profiles for development, preview, and production

The Android application ID remains `com.harleytg.puppyclicker`. The iOS bundle identifier uses the same identifier.

## Run locally

```bash
npm install
npm run doctor
npm run typecheck
npm run android
# or:
npm run ios
npm run web
```

Use `.env.example` as the template for public client configuration. Never place Supabase service-role keys, Discord bot tokens, webhooks, signing passwords, or other privileged secrets in `EXPO_PUBLIC_*` variables.

## Migration rules

1. The existing `markhitchk/pup-clinker` repository remains the reference implementation until feature parity is verified.
2. Existing puppy art and game assets are migrated unchanged; they are not re-rendered during the port.
3. Shared business logic belongs in TypeScript modules, not duplicated Android/iOS implementations.
4. Native code is reserved for capabilities that genuinely require platform APIs.
5. Each migration part is reviewable independently.

See [docs/react-native-migration.md](docs/react-native-migration.md) for the complete staged plan.
