import {useEffect} from "react";
import {client} from "./supabase.js";

// Audit is intentionally off until the server provider, private table and
// privacy notice are configured. This is telemetry, never authorization.
export default function NetworkCheckReporter() {
  useEffect(() => {
    if (import.meta.env.VITE_NETWORK_CHECK_ENABLED !== "true") return;
    if (window.location.pathname === "/auth/discord/callback") return;
    let active = true;
    let lastToken = "";
    const send = async () => {
      const session = await client?.auth.getSession().catch(() => null);
      if (!active) return;
      const token = session?.data?.session?.access_token || "";
      if (lastToken === token && lastToken !== "") return;
      lastToken = token;
      try {
        const headers = {};
        if (token) headers.Authorization = "Bearer " + token;
        await fetch("/api/network-check", {
          method: "POST", headers, credentials: "same-origin",
          cache: "no-store", keepalive: true,
        });
      } catch { /* Telemetry must never interrupt gameplay. */ }
    };
    void send();
    const listener = client?.auth.onAuthStateChange((_event) => {
      setTimeout(() => { if (active) void send(); }, 0);
    });
    return () => { active = false; listener?.data?.subscription?.unsubscribe(); };
  }, []);
  return null;
}
