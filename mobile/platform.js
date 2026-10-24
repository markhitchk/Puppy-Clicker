import { createCallbackHandler } from "../src/nativeAuth.js";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";
import { Vibration } from "react-native";
// Supabase PKCE needs secure random bytes and SHA-256 on Hermes.
if (!globalThis.crypto)
  globalThis.crypto = {
    getRandomValues: Crypto.getRandomValues,
    subtle: {
      digest: (_algorithm, data) =>
        Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data),
    },
  };
import { assets } from "./assets.js";
import { transparentAssets } from "./transparent-assets.js";
WebBrowser.maybeCompleteAuthSession();
const client = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
    "https://damcmyqusdxucwozkoeh.supabase.co",
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_id7zKwH7BPmmohc7T3RZmA_DTjMaFVU",
  {
    auth: {
      storage: AsyncStorage,
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
const redirectTo = Linking.createURL("auth/callback");
const handleCallback = createCallbackHandler(redirectTo, (code) =>
  client.auth.exchangeCodeForSession(code),
);
export const platform = {
  client,
  asset: (path) => transparentAssets[path] || assets[path] || assets["/assets/v1/v1_classic.png"],
  loadPrefs: async () => {
    try {
      return JSON.parse(
        (await AsyncStorage.getItem("puppy_ui_preferences")) || "{}",
      );
    } catch {
      return {};
    }
  },
  savePrefs: (prefs) =>
    AsyncStorage.setItem("puppy_ui_preferences", JSON.stringify(prefs)),
  loadInbox: async (key) => {
    try { return JSON.parse((await AsyncStorage.getItem("puppy_inbox_v1:" + key)) || "[]"); }
    catch { return []; }
  },
  saveInbox: (key, items) => AsyncStorage.setItem("puppy_inbox_v1:" + key, JSON.stringify(items)),
  loadSchedule: async (month) => {
    try { return JSON.parse((await AsyncStorage.getItem("puppy_schedule_v1:" + month)) || "null"); }
    catch { return null; }
  },
  saveSchedule: (month, schedule) => AsyncStorage.setItem("puppy_schedule_v1:" + month, JSON.stringify(schedule)),
  haptic: () => Vibration.vibrate(12),
  sha256: (text) =>
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text),
  onAuthError: (callback) => {
    let active = true;
    const handle = (url) => {
      if (url)
        void handleCallback(url).catch((error) => {
          if (active) callback(error.message);
        });
    };
    const sub = Linking.addEventListener("url", (event) => handle(event.url));
    void Linking.getInitialURL()
      .then(handle)
      .catch((error) => {
        if (active) callback(error.message);
      });
    const state = AppState.addEventListener("change", (value) => {
      if (value === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
    return () => {
      active = false;
      sub.remove();
      state.remove();
    };
  },
  login: async () => {
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === "success" && !(await handleCallback(result.url)))
      throw new Error("Missing OAuth callback code");
  },
};
