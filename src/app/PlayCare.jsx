import React from "react";
import { View, Text } from "react-native";
import {
  Heading,
  Wallet,
  Puppy,
  Txt,
  Button,
  Card,
  Row,
  Meter,
  useUi,
} from "./ui.jsx";
import { wellness, mood, careTapBonus, tap, care } from "../game.js";
import { nextGoal, goalProgress, addXp } from "../parity.js";
export function Play({ account, schedule, clock, notify, height }) {
  const { game: g, mutate, locked } = account,
    { colors, platform, prefs } = useUi(),
    goal = nextGoal(g, new Date(clock), schedule);
  const hit = () => {
    if (g.energy <= 10) {
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
  const portrait = height < 590 ? 122 : height < 700 ? 150 : 185;
  return (
    <View style={{ flex: 1, gap: 8, minHeight: 430 }}>
      <Heading
        title="Play"
        subtitle="Tap, earn treats, and have fun with your puppy!"
      />
      <Wallet game={g} />
      <View
        style={{
          flex: 1,
          minHeight: 260,
          backgroundColor: colors.tint,
          borderColor: colors.accent + "29",
          borderWidth: 1,
          borderRadius: 22,
          paddingHorizontal: 12,
          paddingVertical: 12,
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
        }}
      >
        <Puppy
          id={g.puppyStyle}
          accessory={g.accessory}
          size={portrait}
          onPress={hit}
          disabled={locked}
        />
        <Txt
          muted
          bold
          size={11}
          style={{
            textAlign: "center",
            color: g.energy <= 10 ? colors.error : colors.sub,
          }}
        >
          {g.energy <= 10
            ? `⚡ Energy ${g.energy}% · Rest in Pup Care to keep playing`
            : `⚡ Energy ${g.energy}% · Care bonus +${careTapBonus(g)} 🍪/tap`}
        </Txt>
        <Button
          primary
          disabled={locked}
          onPress={hit}
          style={{ width: "100%", marginTop: 3, borderRadius: 18 }}
        >
          {g.energy <= 10
            ? `😴 ${g.puppyName} is tired · Care needed`
            : `🐾 Tap ${g.puppyName}  +${g.clickPower + careTapBonus(g)}`}
        </Button>
      </View>
      <Card style={{ borderRadius: 14, padding: 10 }}>
        <Row style={{ flexWrap: "nowrap" }}>
          <Text style={{ fontSize: 22 }}>🎁</Text>
          <View testID="next-reward" style={{ flex: 1, gap: 5 }}>
            <Row
              style={{ justifyContent: "space-between", flexWrap: "nowrap" }}
            >
              <Txt bold size={12}>
                {goal ? `Next Reward · ${goal.title}` : "Today complete"}
              </Txt>
              <Txt bold size={11}>
                {goal
                  ? `${Math.min(goal.target, goalProgress(g, goal))}/${goal.target}`
                  : "✓"}
              </Txt>
            </Row>
            <Meter
              label="Next reward progress"
              value={goal ? goalProgress(g, goal) : 1}
              max={goal?.target || 1}
              caption=""
            />
          </View>
          <Txt bold size={11}>
            {goal ? `${goal.rewardTreats} 🍪` : "All claimed"}
          </Txt>
        </Row>
      </Card>
    </View>
  );
}
export function Care({ account, notify }) {
  const { game: g, mutate, locked } = account;
  const action = (kind) => {
    if (
      mutate((next) => {
        if (!care(next, kind)) return false;
        addXp(next, "CARE_ACTION");
      })
    )
      notify("Puppy care complete");
  };
  const actions = [
    ["feed", "🍖", "Feed", "-20 🍪", g.treats >= 20 && g.fullness < 100],
    [
      "play",
      "🎾",
      "Play",
      "-1 🦴 · -12 ⚡",
      g.bones >= 1 && g.energy >= 12 && (g.happiness < 100 || g.bond < 100),
    ],
    ["wash", "🫧", "Clean", "-10 🍪", g.treats >= 10 && g.cleanliness < 100],
    ["rest", "🌙", "Rest", "Free · +30 ⚡", g.energy < 100],
    [
      "cuddle",
      "🤗",
      "Cuddle",
      "Free · +Happy / Bond",
      g.happiness < 100 || g.bond < 100,
    ],
  ];
  return (
    <>
      <Heading title="Pup Care" subtitle="Care is separate for each puppy." />
      <Card>
        <Row style={{ flexWrap: "nowrap" }}>
          <Puppy id={g.puppyStyle} accessory={g.accessory} size={78} />
          <View style={{ flex: 1 }}>
            <Txt bold size={17}>
              {g.puppyName}
            </Txt>
            <Txt muted size={12}>
              {mood(g)} · Wellness {wellness(g)}% · Bond {g.bond}%
            </Txt>
          </View>
        </Row>
      </Card>
      <Card>
        {[
          ["💖 Happiness", "happiness"],
          ["🍖 Fullness", "fullness"],
          ["⚡ Energy", "energy"],
          ["🫧 Cleanliness", "cleanliness"],
          ["🤝 Bond", "bond"],
        ].map(([label, key]) => (
          <Meter key={key} label={label} value={g[key]} />
        ))}
        <Txt muted bold size={12}>
          {g.energy <= 10
            ? "😴 Too tired to earn Treats on Play. Rest above 10% energy."
            : careTapBonus(g) >= 2
              ? "✨ Thriving care bonus: +2 Treats on every normal puppy tap."
              : careTapBonus(g) === 1
                ? "✨ Healthy care bonus: +1 Treat on every normal puppy tap."
                : "Keep wellness at 70%+ to unlock a Treat bonus on Play."}
        </Txt>
      </Card>
      <Txt bold>Care actions</Txt>
      <Row style={{ gap: 6 }}>
        {actions.map(([kind, emoji, title, subtitle, enabled]) => (
          <Button
            key={kind}
            onPress={() => action(kind)}
            disabled={locked || !enabled}
            style={{
              width: kind === "rest" || kind === "cuddle" ? "48%" : "31%",
              flexGrow: 1,
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ fontSize: 21 }}>{emoji}</Text>
            {"\n"}
            {title}
            {"\n"}
            <Text style={{ fontWeight: "400", fontSize: 10 }}>{subtitle}</Text>
          </Button>
        ))}
      </Row>
    </>
  );
}
