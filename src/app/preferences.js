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
};
export function sanitizePrefs(input) {
  return {
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
