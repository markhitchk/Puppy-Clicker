// React Native translation of PuppyRevampedCareScreen in Kotlin's
// PuppyMainScreensRevamp.kt, including its responsive compact metrics.
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Puppy, useUi } from "./ui.jsx";
import { wellness, mood, careTapBonus, care } from "../game.js";
import { addXp } from "../parity.js";

const kScale = (prefs) => prefs.scale === "COMPACT" ? .94 : prefs.scale === "LARGE" ? 1.08 : 1;
const bold = (colors, size, weight = "800") => ({
  color: colors.text, fontSize: size, fontWeight: weight, includeFontPadding: false,
});
function CareMeter({ label, value, colors, k }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 3 * k }}>
      <Text numberOfLines={1} style={{ ...bold(colors, 12), width: 92 * k }}>{label}</Text>
      <View accessibilityRole="progressbar" accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: value }}
        style={{ flex: 1, height: 5 * k, borderRadius: 10,
          overflow: "hidden", backgroundColor: colors.dark ? "#464452" : "#D2C9D8" }}>
        <View style={{ height: "100%", width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundColor: colors.accent }} />
      </View>
      <View style={{ width: 8 * k }} />
      <Text style={{ ...bold(colors, 12, "900"), width: 38 * k }}>
        {value}%
      </Text>
    </View>
  );
}
function CareAction({ icon, name, detail, enabled, onPress, colors, k }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name}
      accessibilityState={{ disabled: !enabled }} disabled={!enabled} onPress={onPress}
      style={({ pressed }) => ({
        flex: 1, minWidth: 0, minHeight: 72 * k, borderRadius: 18 * k,
        backgroundColor: enabled ? colors.panel : colors.raised,
        borderWidth: 1, borderColor: colors.edge,
        paddingHorizontal: 6 * k, paddingVertical: 5 * k,
        alignItems: "center", justifyContent: "center",
        opacity: pressed ? 0.8 : !enabled ? 0.6 : 1,
      })}>
      <Text style={{ fontSize: 21 }}>{icon}</Text>
      <Text numberOfLines={1} style={{ ...bold(colors, 14, "900"), textAlign: "center" }}>{name}</Text>
      <Text numberOfLines={1} style={{ fontSize: 10, color: colors.sub, textAlign: "center" }}>{detail}</Text>
    </Pressable>
  );
}
export default function KotlinCareScreen({ account, notify, height }) {
  const { game: g, mutate, locked } = account;
  const { colors, prefs } = useUi();
  const k = kScale(prefs);
  const compact = height / k < 700;
  const tiny = height / k < 590;
  const spacer = (tiny ? 5 : 8) * k;
  const portrait = (tiny ? 66 : compact ? 78 : 92) * k;
  const action = (kind) => {
    const success = mutate((next) => {
      if (!care(next, kind)) return false;
      addXp(next, "CARE_ACTION");
    });
    if (success) notify("Puppy care complete");
  };
  const bonus = careTapBonus(g);
  const tired = g.energy <= 10;
  const subtitle = compact ? "Care is separate for each puppy."
    : "Care for your active puppy. Every puppy keeps its own needs and bond.";
  const note = tired
    ? "😴 Too tired to earn Treats on Play. Rest above 10% energy."
    : bonus >= 2
      ? "✨ Thriving care bonus: +2 Treats on every normal puppy tap."
      : bonus === 1
        ? "✨ Healthy care bonus: +1 Treat on every normal puppy tap."
        : "Keep wellness at 70%+ to unlock a Treat bonus on Play.";
  const actions = [
    ["🍖", "Feed", "-20 🍪", g.treats >= 20 && g.fullness < 100, "feed"],
    ["🎾", "Play", "-1 🦴 · -12 ⚡",
      g.bones >= 1 && g.energy >= 12 && (g.happiness < 100 || g.bond < 100), "play"],
    ["🫧", "Clean", "-10 🍪", g.treats >= 10 && g.cleanliness < 100, "wash"],
    ["🌙", "Rest", "Free · +30 ⚡", g.energy < 100, "rest"],
    ["🤗", "Cuddle", "Free · +Happy / Bond",
      g.happiness < 100 || g.bond < 100, "cuddle"],
  ];
  const button = ([icon, name, detail, enabled, kind]) => (
    <CareAction key={kind} icon={icon} name={name} detail={detail}
      enabled={enabled && !locked} onPress={() => action(kind)} colors={colors} k={k}/>
  );
  return (
    <View testID="kotlin-revamped-care"
      style={{ flex: 1, width: "100%", paddingHorizontal: 14 * k,
        paddingVertical: (tiny ? 2 : 4) * k, gap: spacer }}>
      <View>
        <Text accessibilityRole="header" style={{ ...bold(colors, 28, "900"), lineHeight: 37 }}>
          Pup Care
        </Text>
        <Text style={{ color: colors.sub, fontSize: 14, lineHeight: 21 }}>{subtitle}</Text>
      </View>
      <View testID="kotlin-care-puppy-card" style={{
        borderRadius: 18 * k, borderWidth: 1, borderColor: colors.edge,
        backgroundColor: colors.dark ? "#122C36" : "#D8F4FF",
        paddingHorizontal: 12 * k, paddingVertical: (tiny ? 7 : 9) * k,
        flexDirection: "row", alignItems: "center", gap: 10 * k,
      }}>
        <Puppy id={g.puppyStyle} accessory={g.accessory} size={portrait} />
        <View style={{ flex: 1 }}>
          <Text style={{ ...bold(colors, 16, "900") }}>{g.puppyName}</Text>
          <Text style={{ fontSize: 12, color: colors.sub }}>
            {mood(g)} · Wellness {wellness(g)}% · Bond {g.bond}%
          </Text>
        </View>
      </View>
      <View testID="kotlin-care-meter-card" style={{
        borderRadius: 18 * k, borderWidth: 1, borderColor: colors.edge,
        backgroundColor: colors.panel,
        paddingHorizontal: 11 * k, paddingVertical: (tiny ? 6 : 8) * k,
      }}>
        <CareMeter label="💖 Happiness" value={g.happiness} colors={colors} k={k}/>
        <CareMeter label="🍖 Fullness" value={g.fullness} colors={colors} k={k}/>
        <CareMeter label="⚡ Energy" value={g.energy} colors={colors} k={k}/>
        <CareMeter label="🫧 Cleanliness" value={g.cleanliness} colors={colors} k={k}/>
        <CareMeter label="🤝 Bond" value={g.bond} colors={colors} k={k}/>
        <View style={{ height: 1, backgroundColor: colors.edge, marginVertical: 5 * k }}/>
        <Text style={{ fontSize: 12, color: tired ? colors.error : colors.sub,
          fontWeight: "700" }}>{note}</Text>
      </View>
      <Text style={{ ...bold(colors, 14, "900") }}>Care actions</Text>
      <View testID="kotlin-care-actions" style={{ gap: 6 * k }}>
        <View style={{ flexDirection: "row", gap: 6 * k }}>
          {actions.slice(0, 3).map(button)}
        </View>
        <View style={{ flexDirection: "row", gap: 6 * k }}>
          {actions.slice(3, 5).map(button)}
        </View>
      </View>
    </View>
  );
}
