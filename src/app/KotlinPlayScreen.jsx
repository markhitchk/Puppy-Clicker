// Direct React Native translation of the generated Kotlin UI contract:
// pup-clinker/App/app/src/main/java/.../PuppyMainScreensRevamp.kt
// Kotlin build pipeline: seasonal.gradle.kts -> patch_roster_navigation.py
// -> patch_main_ui_revamp.py -> patch_compact_viewport.py.
// Keep measurements and spacing in sync with the original Compose screen.
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Puppy, useUi } from "./ui.jsx";
import { careTapBonus, tap } from "../game.js";
import { nextGoal, goalProgress, addXp } from "../parity.js";

const rgba = (hex, opacity) => {
  const code = String(hex).replace("#", "");
  const red = parseInt(code.slice(0, 2), 16) || 0;
  const green = parseInt(code.slice(2, 4), 16) || 0;
  const blue = parseInt(code.slice(4, 6), 16) || 0;
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};
const sourceScale = (prefs) =>
  prefs.scale === "COMPACT" ? 0.94 : prefs.scale === "LARGE" ? 1.08 : 1;
const headline = (colors, sp) => ({
  fontSize: sp,
  color: colors.text,
  fontWeight: "900",
  includeFontPadding: false,
});

function KotlinWalletCard({ game, colors, k }) {
  // Kotlin PuppyWalletCard uses unabridged Long.toString(), not compact notation.
  // Values remain associated with their own currency column when large.
  const stats = [
    ["🍪", "Treats", game.treats],
    ["🦴", "Bones", game.bones],
    ["🪙", "Pup Coins", game.pupCoins],
    ["🐾", "Casino Chips", game.casinoChips],
  ];
  return (
    <View testID="kotlin-wallet" style={{
      borderRadius: 20 * k, backgroundColor: colors.panel,
      borderColor: colors.edge, borderWidth: 1,
      paddingVertical: 12 * k, paddingHorizontal: 8 * k,
    }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {stats.map(([emoji, label, count]) => (
          <View key={label} style={{ flex: 1, minWidth: 0, alignItems: "center" }}>
            <Text style={{ fontSize: 23, textAlign: "center", includeFontPadding: false }}>{emoji}</Text>
            <Text style={{
              ...headline(colors, 16), lineHeight: 22, width: "100%",
              textAlign: "center", flexShrink: 1,
            }}>{String(count ?? 0)}</Text>
            <Text style={{
              fontSize: 12, lineHeight: 17, color: colors.sub, textAlign: "center",
            }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function KotlinRewardStrip({ game, colors, k, goal }) {
  const max = goal?.target || 1;
  const progress = goal ? Math.min(max, goalProgress(game, goal)) : max;
  const amount = goal ? `${goal.rewardTreats} 🍪` : "All claimed";
  return (
    <View testID="kotlin-next-reward" style={{
      backgroundColor: colors.dark ? "#242831" : "#ECE5F2",
      borderColor: colors.edge, borderWidth: 1,
      borderRadius: 14 * k, paddingHorizontal: 11 * k,
      paddingVertical: 8 * k,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 * k }}>
        <Text style={{ fontSize: 22 }}>🎁</Text>
        <View testID="next-reward" style={{ flex: 1, minWidth: 0, gap: 5 * k }}>
          <View style={{
            flexDirection: "row", alignItems: "center",
            justifyContent: "space-between", gap: 8 * k,
          }}>
            <Text numberOfLines={1} style={{
              ...headline(colors, 14), flex: 1,
            }}>{goal ? `Next Reward · ${goal.title}` : "Today complete"}</Text>
            <Text style={{ ...headline(colors, 12) }}>
              {goal ? `${progress}/${max}` : "✓"}
            </Text>
          </View>
          <View accessibilityRole="progressbar"
            accessibilityLabel="Next reward progress"
            accessibilityValue={{ min: 0, max, now: progress }}
            style={{ height: 5 * k, borderRadius: 4, backgroundColor: colors.dark ? "#464452" : "#D2C9D8", overflow: "hidden" }}>
            <View style={{ width: `${Math.max(0, 100 * progress / max)}%`,
              height: "100%", backgroundColor: colors.accent }} />
          </View>
        </View>
        <Text style={{ ...headline(colors, 12), flexShrink: 0 }}>
          {amount}
        </Text>
      </View>
    </View>
  );
}

export default function KotlinPlayScreen({ account, schedule, clock, notify, height }) {
  const { game: g, mutate, locked } = account;
  const { colors, prefs, platform } = useUi();
  const k = sourceScale(prefs);
  // Source: BoxWithConstraints(Modifier.fillMaxSize()), maxHeight in Compose dp.
  const availableDp = height / k;
  const tiny = availableDp < 590;
  const compact = availableDp < 700;
  const portrait = (tiny ? 122 : compact ? 150 : 185) * k;
  const spacer = (tiny ? 5 : 8) * k;
  const goal = nextGoal(g, new Date(clock), schedule);
  const exhausted = g.energy <= 10;
  const hit = () => {
    if (exhausted) {
      notify(`${g.puppyName} is tired. Rest in Pup Care to keep playing.`);
      return;
    }
    let found;
    const ok = mutate((next) => {
      found = tap(next);
      addXp(next, "MANUAL_TAP");
    });
    if (ok && prefs.haptics) platform.haptic();
    if (found) notify(`🎟️ ${found} Upgrade Ticket found!`);
  };
  const bonus = careTapBonus(g);
  const title = exhausted
    ? `😴 ${g.puppyName} is tired · Care needed`
    : `🐾 Tap ${g.puppyName}  +${g.clickPower + bonus}`;
  const energyLabel = exhausted
    ? `⚡ Energy ${g.energy}% · Rest in Pup Care to keep playing`
    : `⚡ Energy ${g.energy}% · Care bonus +${bonus} 🍪/tap`;
  return (
    <View testID="kotlin-revamped-play" style={{
      flex: 1, minHeight: 430 * k, width: "100%",
      paddingHorizontal: 14 * k,
      paddingTop: (tiny ? 2 : 4) * k,
      paddingBottom: 0,
    }}>
      <View style={{ width: "100%" }}>
        <Text accessibilityRole="header" style={{ ...headline(colors, 28), lineHeight: 37 }}>
          Play
        </Text>
        <Text style={{ color: colors.sub, fontSize: 14, lineHeight: 21 }}>
          {compact ? "Tap your puppy and earn treats." : "Tap, earn treats, and have fun with your puppy!"}
        </Text>
      </View>
      <View style={{ height: spacer }} />
      <KotlinWalletCard game={g} colors={colors} k={k} />
      <View style={{ height: spacer }} />
      <View testID="kotlin-puppy-surface" style={{
        flex: 1, minHeight: 260 * k,
        borderRadius: 22 * k, borderWidth: 1,
        backgroundColor: rgba(colors.accent, colors.dark ? 0.065 : 0.065),
        borderColor: rgba(colors.accent, 0.16),
        paddingHorizontal: 12 * k,
        paddingVertical: 8 * k,
        justifyContent: "center", alignItems: "center",
      }}>
        <Puppy
          id={g.puppyStyle}
          accessory={g.accessory}
          size={portrait}
          onPress={hit}
          disabled={locked}
        />
        <View style={{ height: 4 * k }} />
        <Text style={{
          color: exhausted ? colors.error : colors.sub,
          fontWeight: "700", fontSize: 12, lineHeight: 18,
          textAlign: "center",
        }}>{energyLabel}</Text>
        <View style={{ height: 4 * k }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ disabled: locked }}
          testID="kotlin-tap-button"
          onPress={hit}
          disabled={locked}
          style={({ pressed }) => ({
            backgroundColor: colors.accent,
            width: "100%", height: (tiny ? 44 : 50) * k,
            borderRadius: 18 * k,
            justifyContent: "center", alignItems: "center",
            opacity: locked ? 0.5 : pressed ? 0.85 : 1,
          })}
        >
          <Text style={{
            color: colors.onAccent, fontWeight: "900",
            fontSize: 16, textAlign: "center",
          }}>{title}</Text>
        </Pressable>
      </View>
      <View style={{ height: spacer }} />
      <KotlinRewardStrip game={g} colors={colors} k={k} goal={goal} />
    </View>
  );
}
