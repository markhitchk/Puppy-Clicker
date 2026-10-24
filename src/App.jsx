import React from "react";
import UniversalApp from "./app/UniversalApp.jsx";
import { client } from "./supabase.js";
import "./styles.css";
const platform = {
  client,
  asset: (path) => ({ uri: path }),
  loadPrefs: async () => {
    try {
      return JSON.parse(localStorage.getItem("puppy_ui_preferences") || "{}");
    } catch {
      return {};
    }
  },
  savePrefs: async (prefs) => {
    try {
      localStorage.setItem("puppy_ui_preferences", JSON.stringify(prefs));
    } catch {}
  },
  loadInbox: async (key) => {
    try { return JSON.parse(localStorage.getItem("puppy_inbox_v1:" + key) || "[]"); }
    catch { return []; }
  },
  saveInbox: async (key, items) => {
    try { localStorage.setItem("puppy_inbox_v1:" + key, JSON.stringify(items)); }
    catch {}
  },
  loadSchedule: async (month) => {
    try { return JSON.parse(localStorage.getItem("puppy_schedule_v1:" + month) || "null"); }
    catch { return null; }
  },
  saveSchedule: async (month, schedule) => {
    try { localStorage.setItem("puppy_schedule_v1:" + month, JSON.stringify(schedule)); }
    catch {}
  },
  login: async () => {
    const { error } = await client.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: location.origin + location.pathname },
    });
    if (error) throw error;
  },
  haptic: () => {},
  sha256: async (text) =>
    Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
      ),
    )
      .map((x) => x.toString(16).padStart(2, "0"))
      .join(""),
  onHidden: (callback) => {
    const f = () => {
      if (document.visibilityState === "hidden") callback();
    };
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  },
};
export default function App() {
  return <UniversalApp platform={platform} />;
}
