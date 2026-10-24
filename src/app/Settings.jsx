import React, { useState } from "react";
import { View, Image, Linking } from "react-native";
import {
  Txt,
  Card,
  Button,
  Row,
  Heading,
  Field,
  Tabs,
  Toggle,
  Wallet,
  Puppy,
  Meter,
  useUi,
} from "./ui.jsx";
import { ROSTER, level } from "../game.js";
import { ACHIEVEMENTS, playerLevel, bondMilestone } from "../parity.js";
export default function Settings({ account, go, notify }) {
  const {
      game: g,
      user,
      message,
      revision,
      dirty,
      save,
      load,
      login,
      logout,
      locked,
    } = account,
    { prefs, setPrefs, colors, platform } = useUi(),
    [section, setSection] = useState(""),
    [search, setSearch] = useState("");
  const change = (key, value) => setPrefs((p) => ({ ...p, [key]: value }));
  const entries = [
    ["profile", "👤", "Profile", "Puppy, progress and achievements"],
    ["discord", "◉", "Discord", "Account and cloud save"],
    [
      "appearance",
      "🎨",
      "Appearance",
      "Theme, accent color, scale, contrast and motion",
    ],
    ["notifications", "🔔", "Notifications", "Saved notification inbox"],
    ["privacy", "🛡️", "Privacy & Data", "Cloud save and PupEye"],
    ["puppies", "🐶", "Puppy Roster", "Change, rename and favorite puppies"],
    ["rewards", "🎁", "Rewards", "Daily goals, adventures and gifts"],
    ["casino", "🎰", "Puppy Casino", "Six Casino Chip games"],
    ["about", "ℹ️", "About", "Puppy Clicker · Harley’s Studios"],
  ];
  return (
    <>
      <Heading title="Settings" subtitle="Make Puppy Clicker your own." />
      <Card>
        <Row style={{ flexWrap: "nowrap" }}>
          <Puppy id={g.puppyStyle} accessory={g.accessory} size={64} />
          <View style={{ flex: 1 }}>
            <Txt bold size={20}>
              {user?.user_metadata?.full_name || "Puppy Player"}
            </Txt>
            <Txt muted size={12}>
              Level {level(g)} · {g.puppyName}
            </Txt>
            <Txt muted size={11}>
              {user
                ? "☁️ " + (dirty ? "Save pending" : "Cloud connected")
                : "Guest · sign in to save progress"}
            </Txt>
          </View>
        </Row>
      </Card>
      <Field label="Search settings" value={search} onChangeText={setSearch} />
      {entries
        .filter((x) =>
          (x[2] + " " + x[3]).toLowerCase().includes(search.toLowerCase()),
        )
        .map(([id, emoji, title, description]) => (
          <Card key={id}>
            <Button
              label={title}
              onPress={() =>
                ["puppies", "rewards", "casino"].includes(id)
                  ? go(id)
                  : setSection(section === id ? "" : id)
              }
              style={{ borderWidth: 0, padding: 0, alignItems: "stretch" }}
              content={
                <TextRow
                  emoji={emoji}
                  title={title}
                  description={description}
                />
              }
            />
            {section === id && (
              <>
                {id === "profile" && (
                  <>
                    <Txt bold>Progress</Txt>
                    <Wallet game={g} />
                    <Txt>
                      Current level: {level(g)} · Lifetime Treats:{" "}
                      {g.lifetimeTreats}
                    </Txt>
                    <Txt>
                      Player XP: {g.playerXp} · XP level: {playerLevel(g)}
                    </Txt>
                    <Txt>
                      {g.puppyName} · {bondMilestone(g.bond)} · Bond {g.bond}%
                    </Txt>
                    <Txt bold>Achievements</Txt>
                    {ACHIEVEMENTS.map((a) => (
                      <View key={a.id} style={{ gap: 5 }}>
                        <Txt size={12}>
                          {a.emoji} {a.title} ·{" "}
                          {g.achievementRewarded.includes(a.id)
                            ? "✓ +50 XP settled"
                            : `${Math.min(a.target, a.progress(g))}/${a.target}`}
                        </Txt>
                        <Meter
                          label={a.title}
                          max={a.target}
                          value={a.progress(g)}
                          caption=""
                        />
                      </View>
                    ))}
                  </>
                )}
                {id === "discord" && (
                  <>
                    <Txt>
                      {user
                        ? `Signed in as ${user.user_metadata?.full_name || user.email || "Discord Player"}`
                        : "Passwordless Discord sign-in"}
                    </Txt>
                    <Button
                      primary
                      onPress={
                        user
                          ? async () => {
                              if (!(await logout()))
                                notify(
                                  "Save did not complete. Retry before signing out.",
                                );
                            }
                          : login
                      }
                    >
                      {user ? "Sign out" : "Connect with Discord"}
                    </Button>
                    <Txt muted size={12}>
                      {message}
                    </Txt>
                    <Txt muted size={11}>
                      Revision {revision} · React cloud progress is shared
                      between this Android app and web.
                    </Txt>
                    <Row>
                      <Button
                        disabled={!user || locked || !dirty}
                        onPress={() => void save()}
                      >
                        Save now
                      </Button>
                      <Button
                        disabled={!user}
                        onPress={() => {
                          if (dirty)
                            notify(
                              "Save pending changes before reloading cloud.",
                            );
                          else void load();
                        }}
                      >
                        Retry cloud load
                      </Button>
                    </Row>
                  </>
                )}
                {id === "appearance" && (
                  <>
                    <Txt bold>Theme</Txt>
                    <Tabs
                      items={["LIGHT", "DARK", "SYSTEM"].map((x) => [x, x])}
                      value={prefs.theme}
                      onChange={(x) => change("theme", x)}
                    />
                    <Txt bold>Accent color</Txt>
                    <Row>
                      {[
                        "#00B8F0",
                        "#8E72E8",
                        "#2E8B64",
                        "#D54A7B",
                        "#9C6A00",
                      ].map((hex) => (
                        <Button
                          key={hex}
                          selected={hex === prefs.accent}
                          label={"Accent " + hex}
                          onPress={() => change("accent", hex)}
                          style={{ backgroundColor: hex, minWidth: 44 }}
                        >
                          {hex === prefs.accent ? "✓" : " "}
                        </Button>
                      ))}
                    </Row>
                    <Txt bold>UI scale</Txt>
                    <Tabs
                      items={["COMPACT", "DEFAULT", "LARGE"].map((x) => [x, x])}
                      value={prefs.scale}
                      onChange={(x) => change("scale", x)}
                    />
                    <Toggle
                      title="Animations"
                      value={prefs.animations}
                      onValueChange={(x) => change("animations", x)}
                    />
                    <Toggle
                      title="Reduced motion"
                      value={prefs.reducedMotion}
                      onValueChange={(x) => change("reducedMotion", x)}
                    />
                    <Toggle
                      title="High contrast"
                      value={prefs.highContrast}
                      onValueChange={(x) => change("highContrast", x)}
                    />
                    <Toggle
                      title="Haptic feedback"
                      value={prefs.haptics}
                      onValueChange={(x) => change("haptics", x)}
                    />
                    <Toggle
                      title="Compact numbers"
                      value={prefs.compactNumbers}
                      onValueChange={(x) => change("compactNumbers", x)}
                    />
                  </>
                )}
                {id === "notifications" && (
                  <>
                    <Txt muted>
                      Gameplay messages are saved locally per account on this
                      device. Android push notifications and native reward
                      announcements are still being migrated.
                    </Txt>
                    <Button onPress={() => go("inbox")}>
                      Open notification history
                    </Button>
                  </>
                )}
                {id === "privacy" && (
                  <>
                    <Txt muted>
                      Discord authenticates your React cloud save. This release
                      does not import, overwrite, or reset your protected Kotlin
                      progress. PupEye account transfer is still pending.
                    </Txt>
                    <Button
                      onPress={() =>
                        Linking.openURL(
                          "https://github.com/markhitchk/pup-clinker/blob/main/assets/legal/privacy-policy.md",
                        )
                      }
                    >
                      Privacy policy
                    </Button>
                  </>
                )}
                {id === "about" && (
                  <>
                    <Image
                      source={platform.asset("/assets/logos/puppy_clicker.png")}
                      resizeMode="contain"
                      style={{ width: "100%", height: 100 }}
                    />
                    <Txt bold>Puppy Clicker · Harley’s Studios</Txt>
                    <Txt muted>
                      Shared React Native interface for Android and web. Based
                      on the original Kotlin launcher and artwork.
                    </Txt>
                    <Button
                      onPress={() =>
                        Linking.openURL(
                          "https://github.com/markhitchk/Puppy-Clicker",
                        )
                      }
                    >
                      Source and release notes
                    </Button>
                  </>
                )}
              </>
            )}
          </Card>
        ))}
    </>
  );
}
function TextRow({ emoji, title, description }) {
  return (
    <Row style={{ flexWrap: "nowrap" }}>
      <Txt size={24}>{emoji}</Txt>
      <View style={{ flex: 1 }}>
        <Txt bold>{title}</Txt>
        <Txt muted size={11}>
          {description}
        </Txt>
      </View>
      <Txt muted>⌄</Txt>
    </Row>
  );
}
