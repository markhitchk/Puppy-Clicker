import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Image,
  Animated,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
} from "react-native";
import {
  Heading,
  Txt,
  Card,
  Button,
  Row,
  Tabs,
  Field,
  Wallet,
  useUi,
} from "./ui.jsx";
import { convertTreatsToChips, casinoSpend, casinoPayout } from "../game.js";
import {
  SCRATCHERS,
  SLOTS,
  PLINKO_MULTIPLIERS,
  WHEEL_PRIZES,
  slotsOutcome,
  scratcherOutcome,
  rouletteOutcome,
  plinkoOutcome,
  wheelOutcome,
} from "../casinoV7.js";
import * as blackjack from "../blackjack.js";
const games = [
  ["scratch", "🎟️ Pup Scratchers", "Match symbols and win Chips"],
  ["slots", "🎰 Puppy Slots", "Three reels · puppy-themed symbols"],
  ["roulette", "🎡 Pup Roulette", "European single-zero wheel"],
  ["plinko", "🔵 Pup Plinko", "8 rows · 9 payout pockets"],
  ["wheel", "🐾 Lucky Pup Wheel", "Spin the original puppy wheel"],
  ["blackjack", "♠️ Puppy Blackjack", "Hit, stand, double and split"],
];
export default function Casino({ account, notify }) {
  const { game: g, mutate, locked } = account,
    { platform, prefs } = useUi(),
    [screen, setScreen] = useState("hub"),
    [wager, setWager] = useState(20),
    [convert, setConvert] = useState("100"),
    [bet, setBet] = useState("RED"),
    [number, setNumber] = useState("0"),
    [animating, setAnimating] = useState(false),
    [revealed, setRevealed] = useState(false);
  const round = g.lastCasinoResult?.game === screen ? g.lastCasinoResult : null;
  const rotation = useRef(new Animated.Value(0)).current,
    ball = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const animation = useRef(null);
  useEffect(() => () => animation.current?.stop(), []);
  const choose = (id) => {
    if (animating) return;
    setScreen(id);
    setRevealed(false);
    setWager(20);
  };
  const play = () => {
    if (animating) return;
    let result;
    const ok = mutate((next) => {
      if (!casinoSpend(next, wager)) return false;
      if (screen === "slots")
        result = slotsOutcome(
          wager,
          Array.from({ length: 3 }, () => Math.floor(Math.random() * 100)),
        );
      if (screen === "scratch")
        result = scratcherOutcome(wager, Math.floor(Math.random() * 100));
      if (screen === "roulette")
        result = rouletteOutcome(
          wager,
          bet === "STRAIGHT" ? { type: bet, number: +number } : bet,
          Math.floor(Math.random() * 37),
        );
      if (screen === "plinko")
        result = plinkoOutcome(
          wager,
          Array.from({ length: 8 }, () => Math.random() < 0.5),
        );
      if (screen === "wheel")
        result = wheelOutcome(wager, Math.floor(Math.random() * 100), false);
      casinoPayout(next, result.payout);
      next.lastCasinoResult = { ...result, game: screen, wager };
    });
    if (!ok) {
      notify("Not enough Casino Chips.");
      return;
    }
    setRevealed(screen !== "scratch");
    if (prefs.animations && !prefs.reducedMotion && screen !== "scratch") {
      setAnimating(true);
      rotation.setValue(0);
      ball.setValue({ x: 0, y: 0 });
      const duration =
        screen === "plinko" ? 1100 : screen === "slots" ? 700 : 1200;
      if (screen === "plinko") {
        let x = 0;
        animation.current = Animated.sequence(
          result.pathRight.map((right, i) => {
            x += right ? 12 : -12;
            return Animated.timing(ball, {
              toValue: { x, y: (i + 1) * 19 },
              duration: duration / 8,
              useNativeDriver: Platform.OS !== "web",
            });
          }),
        );
      } else
        animation.current = Animated.timing(rotation, {
          toValue:
            1080 +
            (result.number ??
              result.binIndex ??
              Math.floor(Math.random() * 360)) *
              8,
          duration,
          useNativeDriver: Platform.OS !== "web",
        });
      animation.current.start(() => setAnimating(false));
    }
  };
  const amount = +convert;
  if (screen === "hub")
    return (
      <>
        <Heading
          title="Puppy Casino"
          subtitle="Play with earned Casino Chips."
        />
        <Wallet game={g} />
        <Card>
          <Txt muted size={12}>
            Casino Chips are fictional game currency. No purchases, cash-out or
            real-world prizes.
          </Txt>
          <Field
            label="Treats to convert"
            keyboardType="numeric"
            value={convert}
            onChangeText={setConvert}
          />
          <Txt muted>10 Treats → 1 Casino Chip · one-way conversion</Txt>
          <Button
            primary
            disabled={
              locked ||
              !Number.isSafeInteger(amount) ||
              amount <= 0 ||
              amount % 10 !== 0 ||
              g.treats < amount
            }
            onPress={() => mutate((next) => convertTreatsToChips(next, amount))}
          >
            Convert {amount / 10 || 0} Chips
          </Button>
        </Card>
        {games.map(([id, title, description]) => (
          <Card key={id}>
            <Txt bold size={18}>
              {title}
            </Txt>
            <Txt muted size={12}>
              {description}
            </Txt>
            <Button label={"Open " + title} onPress={() => choose(id)}>
              Play
            </Button>
          </Card>
        ))}
      </>
    );
  if (screen === "blackjack")
    return <Blackjack account={account} onBack={() => choose("hub")} />;
  const disc =
    screen === "wheel"
      ? "puppy_lucky_wheel_disc.png"
      : screen === "roulette"
        ? "puppy_roulette_rotor.png"
        : null;
  return (
    <>
      <Row>
        <Button disabled={animating} onPress={() => choose("hub")}>
          ‹ Casino
        </Button>
        <Txt bold>{g.casinoChips} 🐾 Chips</Txt>
      </Row>
      <Heading title={games.find((x) => x[0] === screen)[1]} />
      <Card>
        <Txt bold>Chip wager</Txt>
        <Tabs
          items={
            screen === "scratch"
              ? SCRATCHERS.map((c) => [
                  c.wager,
                  `${c.emoji} ${c.name} · ${c.wager}`,
                ])
              : [20, 100, 500, 2500].map((n) => [n, String(n)])
          }
          value={wager}
          onChange={setWager}
        />
      </Card>
      {screen === "slots" && (
        <View style={{ alignItems: "center" }}>
          <Image
            source={platform.asset("/assets/casino/puppy_slots_machine.png")}
            resizeMode="contain"
            style={{ width: "100%", height: 245 }}
          />
          <Row style={{ marginTop: -142, marginBottom: 85, gap: 7 }}>
            {(round?.symbols || ["🐾", "🦴", "🐶"]).map((symbol, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: "#FFFBF0",
                  borderRadius: 9,
                  padding: 8,
                  minWidth: 50,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 27 }}>
                  {animating ? "🐾" : symbol}
                </Text>
              </View>
            ))}
          </Row>
        </View>
      )}
      {disc && (
        <View
          style={{
            height: 270,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.Image
            source={platform.asset("/assets/casino/" + disc)}
            resizeMode="contain"
            style={{
              height: 260,
              width: 260,
              transform: [
                {
                  rotate: rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            }}
          />
          <Text
            style={{
              position: "absolute",
              top: 0,
              fontSize: 30,
              color: "#DC8139",
            }}
          >
            ▼
          </Text>
        </View>
      )}
      {screen === "wheel" && (
        <Card>
          <Txt bold>Prize table</Txt>
          <Txt muted size={12}>
            {WHEEL_PRIZES.map(
              (x) => `${x.emoji} ${x.id.replaceAll("_", " ")} · ${x.weight}%`,
            ).join("\n")}
          </Txt>
          <Txt muted size={11}>
            Puppy reward slices return the wager until verified unlock
            settlement is available.
          </Txt>
        </Card>
      )}
      {screen === "roulette" && (
        <>
          <Tabs
            items={[
              "RED",
              "BLACK",
              "ODD",
              "EVEN",
              "LOW",
              "HIGH",
              "STRAIGHT",
            ].map((x) => [x, x])}
            value={bet}
            onChange={setBet}
          />
          {bet === "STRAIGHT" && (
            <Field
              label="Straight number (0–36)"
              keyboardType="numeric"
              value={number}
              onChangeText={setNumber}
            />
          )}
        </>
      )}
      {screen === "plinko" && (
        <View
          style={{
            height: 225,
            backgroundColor: "#173B47",
            borderRadius: 20,
            alignItems: "center",
            paddingTop: 15,
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 8 }, (_, row) => (
            <Row
              key={row}
              style={{ height: 19, gap: 20, justifyContent: "center" }}
            >
              {Array.from({ length: row + 2 }, (_, i) => (
                <View
                  key={i}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 4,
                    backgroundColor: "#DDEAF0",
                  }}
                />
              ))}
            </Row>
          ))}
          <Animated.View
            style={{
              position: "absolute",
              top: 8,
              transform: ball.getTranslateTransform(),
            }}
          >
            <Text style={{ fontSize: 18 }}>🔵</Text>
          </Animated.View>
          <Row style={{ gap: 0, width: "100%", marginTop: 10 }}>
            {PLINKO_MULTIPLIERS.map((n, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor:
                    round?.binIndex === i ? "#E7BD59" : "#286177",
                  borderWidth: 1,
                  borderColor: "#173B47",
                  paddingVertical: 7,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 9, color: "#FFFFFF" }}>
                  {n / 100}×
                </Text>
              </View>
            ))}
          </Row>
        </View>
      )}
      {screen === "scratch" && round && (
        <Card title={SCRATCHERS.find((c) => c.wager === round.wager)?.name}>
          <Row style={{ justifyContent: "center" }}>
            {round.symbols.map((x, i) => (
              <View
                key={i}
                style={{
                  padding: 16,
                  backgroundColor: "#FFF1C9",
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 30 }}>{x}</Text>
              </View>
            ))}
          </Row>
          {!revealed && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reveal scratch card"
              onPress={() => setRevealed(true)}
              style={{
                position: "absolute",
                top: 45,
                bottom: 10,
                left: 12,
                right: 12,
                borderRadius: 16,
                backgroundColor: "#80929A",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Txt bold>🐾 Tap to scratch & reveal</Txt>
            </Pressable>
          )}
        </Card>
      )}
      {round && (revealed || screen !== "scratch") && !animating && (
        <Card>
          <Txt bold>
            {round.number !== undefined
              ? `${round.number} · ${round.color} · `
              : ""}
            {round.prize?.replaceAll("_", " ") ||
              round.winKind ||
              "Drop complete"}{" "}
            · {round.payout ? `+${round.payout} Chips` : "No win"}
          </Txt>
        </Card>
      )}
      <Button
        primary
        disabled={
          locked ||
          animating ||
          g.casinoChips < wager ||
          (screen === "roulette" &&
            bet === "STRAIGHT" &&
            (!/^\d+$/.test(number) || +number > 36))
        }
        onPress={play}
      >
        {animating
          ? "Playing…"
          : screen === "scratch"
            ? "New scratch card"
            : screen === "plinko"
              ? "Drop ball"
              : "Spin"}{" "}
        · {wager} Chips
      </Button>
    </>
  );
}
function Cards({ cards, hidden = false, compact = false }) {
  return (
    <Row style={{ gap: 3, justifyContent: "center" }}>
      {cards.map((id, i) => (
        <View
          key={i}
          style={{
            width: compact ? 26 : 32,
            height: compact ? 34 : 47,
            borderRadius: 5,
            backgroundColor: "#FFFBF0",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#D4CFC5",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: id >= 13 && id < 39 ? "#C5323D" : "#15252B",
            }}
          >
            {blackjack.label(id)}
          </Text>
        </View>
      ))}
      {hidden && (
        <View
          style={{
            width: compact ? 26 : 32,
            height: compact ? 34 : 47,
            borderRadius: 5,
            backgroundColor: "#2878C1",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text>🐾</Text>
        </View>
      )}
    </Row>
  );
}
function Blackjack({ account, onBack }) {
  const { game: g, mutate, locked } = account,
    { platform } = useUi(),
    [wager, setWager] = useState(20),
    { width } = useWindowDimensions(),
    state = g.blackjackRound?.state,
    active = state && !state.complete,
    result = state?.complete ? blackjack.outcome(state) : null;
  const tableWidth = Math.min(width - 32, 360),
    tableHeight = (tableWidth * 1402) / 1122;
  return (
    <>
      <Row>
        <Button onPress={onBack}>‹ Casino</Button>
        <Txt bold>{g.casinoChips} 🐾 Chips</Txt>
      </Row>
      <Heading
        title="Puppy Blackjack"
        subtitle="Dealer stands on soft 17 · Blackjack pays 3:2 · up to 3 hands."
      />
      <Tabs
        items={[20, 100, 500, 2500].map((n) => [n, String(n)])}
        value={wager}
        onChange={setWager}
      />
      <View
        style={{ alignSelf: "center", width: tableWidth, height: tableHeight }}
      >
        <Image
          source={platform.asset("/assets/casino/puppy_blackjack_table.png")}
          resizeMode="contain"
          style={{ position: "absolute", width: "100%", height: "100%" }}
        />
        <View
          style={{
            position: "absolute",
            top: "27%",
            left: "24%",
            right: "30%",
            gap: 2,
            alignItems: "center",
          }}
        >
          <Cards
            cards={
              state
                ? active
                  ? state.dealerCards.slice(0, 1)
                  : state.dealerCards
                : []
            }
            hidden={!state || active}
          />
          <Text style={{ color: "white", fontWeight: "800", fontSize: 11 }}>
            {state
              ? active
                ? "?"
                : blackjack.value(state.dealerCards).total
              : "DEALER"}
          </Text>
        </View>
        <View
          style={{
            position: "absolute",
            top: "60%",
            left: "16%",
            right: "16%",
            gap: 5,
          }}
        >
          {state ? (
            state.hands.map((h, i) => (
              <View
                key={i}
                style={{
                  borderWidth: state.activeHandIndex === i ? 1 : 0,
                  borderColor: "#FFF1A6",
                  borderRadius: 5,
                }}
              >
                <Cards cards={h.cards} compact={state.hands.length > 1} />
                <Text
                  style={{
                    color: "#FFFFFF",
                    textAlign: "center",
                    fontSize: 10,
                  }}
                >
                  Hand {i + 1} · {blackjack.value(h.cards).total} · {h.wager}{" "}
                  Chips {result?.hands[i]?.result || ""}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: "white", textAlign: "center" }}>
              Deal a hand to begin
            </Text>
          )}
        </View>
      </View>
      {result && (
        <Card>
          <Txt bold>Hand complete · {result.payout} Chips returned</Txt>
        </Card>
      )}
      <Row style={{ gap: 6 }}>
        <Button
          primary
          disabled={locked || active || g.casinoChips < wager}
          onPress={() => mutate((next) => blackjack.start(next, wager))}
        >
          Deal · {wager}
        </Button>
        {["hit", "stand", "double", "split"].map((action) => (
          <Button
            key={action}
            disabled={
              locked ||
              !blackjack.can(state, action) ||
              (["double", "split"].includes(action) &&
                g.casinoChips <
                  (state?.hands[state.activeHandIndex]?.wager || 0))
            }
            onPress={() => mutate((next) => blackjack.command(next, action))}
          >
            {action[0].toUpperCase() + action.slice(1)}
          </Button>
        ))}
      </Row>
      <Txt muted size={11}>
        Your dealt hand stays in your React cloud save when you navigate away.
        Save before switching devices.
      </Txt>
    </>
  );
}
