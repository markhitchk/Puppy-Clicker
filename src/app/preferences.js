import { validBirthday } from "./onboarding.js";
export const DEFAULT_PREFS = {
  theme: "SYSTEM",
  accent: "#00B8F0",
  scale: "COMPACT",
  animations: true,
  reducedMotion: false,
  highContrast: false,
  haptics: true,
  compactNumbers: true,
  setupComplete: false,
  setupStep: 0,
  setupMethod: "LOCAL",
  playerDisplayName: "Puppy Player",
  birthdayMonth: 0,
  birthdayDay: 0,
  privacyReviewed: false,
  dailyRewardNotifications: true,
  gameEventNotifications: true,
  updateNotifications: true,
};
export function sanitizePrefs(input) {
  const safe = {
    ...DEFAULT_PREFS,
    ...Object.fromEntries(
      Object.entries(input || {}).filter(
        ([key, value]) =>
          typeof value === typeof DEFAULT_PREFS[key] &&
          (["theme", "scale"].includes(key)
            ? (key === "theme"
                ? ["LIGHT", "DARK", "SYSTEM"]
                : ["COMPACT", "DEFAULT", "LARGE"]
              ).includes(value)
            : key === "accent"
              ? /^#[0-9a-f]{6}$/i.test(value)
              : key in DEFAULT_PREFS),
      ),
    ),
  };
  if (!Number.isInteger(safe.setupStep) || safe.setupStep < 0 || safe.setupStep > 5)
    safe.setupStep = 0;
  if (!["LOCAL", "DISCORD"].includes(safe.setupMethod))
    safe.setupMethod = "LOCAL";
  safe.playerDisplayName = safe.playerDisplayName.trim().slice(0, 24) || "Puppy Player";
  if (!validBirthday(safe.birthdayMonth, safe.birthdayDay)) {
    safe.birthdayMonth = 0;
    safe.birthdayDay = 0;
  }
  return safe;
}
export function palette(prefs, system) {
  const dark =
      prefs.theme === "DARK" || (prefs.theme === "SYSTEM" && system === "dark"),
    accent = prefs.accent;
  return {
    dark,
    accent,
    onAccent:
      parseInt(accent.slice(1, 3), 16) * 0.299 +
        parseInt(accent.slice(3, 5), 16) * 0.587 +
        parseInt(accent.slice(5, 7), 16) * 0.114 >
      155
        ? "#071014"
        : "#FFFFFF",
    bg: dark ? "#0C0F12" : "#FFFBFF",
    panel: dark ? "#151A1F" : "#FFFFFF",
    raised: dark ? "#1C232A" : "#F1F3F5",
    text: dark ? "#F2F5F7" : "#171A1D",
    sub: dark ? "#B8C1C8" : "#555C62",
    edge: prefs.highContrast
      ? dark
        ? "#747E87"
        : "#8B9399"
      : dark
        ? "#313941"
        : "#D7DCE0",
    tint: dark ? `${accent}18` : `${accent}10`,
    error: dark ? "#FFB4AB" : "#BA1A1A",
  };
}
