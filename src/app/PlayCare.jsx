import React from "react";
import { View, Text } from "react-native";
import { Heading, Wallet, Puppy, Txt, Button, Card, Row, Meter, useUi } from "./ui.jsx";
import { wellness, mood, careTapBonus, care } from "../game.js";
import { addXp } from "../parity.js";
export { default as Play } from "./KotlinPlayScreen.jsx";
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
