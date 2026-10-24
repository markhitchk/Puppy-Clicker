import React, { useState } from "react";
import { View, Text, Image } from "react-native";
import { Heading, Txt, Card, Button, Row, Meter, Puppy, useUi } from "./ui.jsx";
import { claimDailyReward, startPark, claimPark, level } from "../game.js";
import {
  epochDay,
  dailyGoals,
  goalProgress,
  claimGoal,
  pullGacha,
} from "../parity.js";
export function Rewards({ account, schedule, clock, notify, go }) {
  const { game: g, mutate, locked } = account,
    date = new Date(clock),
    today = epochDay(date),
    goals = dailyGoals(date, schedule),
    claimed = g.lastDailyClaimDay === today;
  const gift =
    150 +
    (g.lastDailyClaimDay === today - 1 ? Math.min(365, g.dailyStreak + 1) : 1) *
      25 +
    level(g) * 10;
  return (
    <>
      <Heading
        title="Rewards"
        subtitle="Daily goals, adventures and permanent progression."
      />
      <Card>
        <Row style={{ flexWrap: "nowrap" }}>
          <Text style={{ fontSize: 42 }}>🔥</Text>
          <View style={{ flex: 1, gap: 8 }}>
            <Txt bold size={22}>
              {g.dailyStreak} day streak
            </Txt>
            <Txt muted size={12}>
              Keep going! Consistent care unlocks bigger rewards.
            </Txt>
            <Row>
              {Array.from({ length: 7 }, (_, i) => (
                <Txt key={i} bold>
                  {i < Math.min(7, g.dailyStreak) ? "☑" : "○"}
                </Txt>
              ))}
            </Row>
          </View>
        </Row>
      </Card>
      {!claimed ? (
        <Card>
          <Txt bold>🎁 Daily Puppy Gift</Txt>
          <Txt muted>{gift} Treats + 2 Bones + 3 Pup Coins</Txt>
          <Button
            primary
            label="Claim Daily Puppy Gift"
            disabled={locked}
            onPress={() => {
              if (mutate((next) => claimDailyReward(next, today)))
                notify("Daily Puppy Gift claimed");
            }}
          >
            Claim
          </Button>
        </Card>
      ) : (
        <Txt bold>🎁 Daily Puppy Gift · Claimed</Txt>
      )}
      <Row style={{ justifyContent: "space-between" }}>
        <Txt bold size={21}>
          Today’s goals
        </Txt>
        <Txt muted size={11}>
          {schedule?.month || "Monthly"} · {schedule ? "Cached" : "Fallback"}
        </Txt>
      </Row>
      {goals
        .filter((x) => !g.claimedDailyTasks.includes(x.id))
        .map((goal) => {
          const p = goalProgress(g, goal);
          return (
            <Card key={goal.id}>
              <Row style={{ justifyContent: "space-between" }}>
                <Txt bold>
                  {goal.emoji} {goal.title}
                </Txt>
                <Txt bold size={12}>
                  {Math.min(p, goal.target)}/{goal.target}
                </Txt>
              </Row>
              <Txt muted size={12}>
                {goal.description}
              </Txt>
              <Meter
                label={goal.title + " progress"}
                value={p}
                max={goal.target}
                caption={`${goal.rewardTreats} 🍪 + 1 🦴 + 1 🪙`}
              />
              <Button
                label={"Claim " + goal.title}
                primary
                disabled={locked || p < goal.target}
                onPress={() => {
                  if (
                    mutate((next) => claimGoal(next, goal.id, date, schedule))
                  )
                    notify(`${goal.title} reward claimed`);
                }}
              >
                {p >= goal.target ? "Claim" : "In progress"}
              </Button>
            </Card>
          );
        })}
      {goals
        .filter((x) => g.claimedDailyTasks.includes(x.id))
        .map((goal) => (
          <Card key={goal.id}>
            <Txt bold>
              {goal.emoji} {goal.title} · Claimed
            </Txt>
            <Txt muted size={12}>
              {goal.rewardTreats} Treats + 1 Bone + 1 Pup Coin
            </Txt>
          </Card>
        ))}
      <Card title="🌳 Park Adventure">
        <Txt muted size={12}>
          Send your puppy exploring for 60 seconds. Costs 20 energy.
        </Txt>
        <Button
          disabled={
            locked ||
            (g.parkActive && clock < g.parkReadyAtMs) ||
            (!g.parkActive && g.energy < 20)
          }
          onPress={() =>
            mutate((next) =>
              g.parkActive ? claimPark(next, clock) : startPark(next, clock),
            )
          }
        >
          {g.parkActive
            ? clock < g.parkReadyAtMs
              ? `Exploring · ${Math.ceil((g.parkReadyAtMs - clock) / 1000)}s`
              : "Claim park reward"
            : "Start adventure"}
        </Button>
      </Card>
      {[
        ["gacha", "🫧 Puppy Gacha", "Capsule machine · new eligible puppies"],
        ["casino", "🎰 Puppy Casino", "Casino Chip wagers · six games"],
        ["prestige", "⭐ Prestige", "Permanent skills and progression"],
      ].map(([id, title, subtitle]) => (
        <Card key={id}>
          <Row style={{ flexWrap: "nowrap" }}>
            <View style={{ flex: 1 }}>
              <Txt bold>{title}</Txt>
              <Txt muted size={12}>
                {subtitle}
              </Txt>
            </View>
            <Button label={"Open " + title.slice(3)} onPress={() => go(id)}>
              Open
            </Button>
          </Row>
        </Card>
      ))}
    </>
  );
}
export function Gacha({ account, notify, go }) {
  const { platform } = useUi(),
    { game: g, mutate, locked } = account,
    [result, setResult] = useState(null),
    [opening, setOpening] = useState(false);
  const pull = (payment) => {
    let found;
    const success = mutate((next) => {
      found = pullGacha(next, payment, Math.floor(Math.random() * 100000));
      return found.success;
    });
    if (success) {
      setResult(found);
      setOpening(true);
    } else notify("Not enough Treats or Common Tickets.");
  };
  return (
    <>
      <Heading
        title="Puppy Gacha"
        subtitle="Earned Treats or Common Tickets · reward-only puppies excluded."
      />
      <Card>
        <Txt bold>
          🍪 {g.treats} Treats · 🎟️ {g.ticketInventory.COMMON} Common Tickets
        </Txt>
      </Card>
      <Image
        source={platform.asset("/assets/casino/puppy_gacha_machine.png")}
        style={{ width: "100%", height: 300 }}
        resizeMode="contain"
      />
      {opening && result ? (
        <Card title="Your capsule is ready!">
          <Button primary onPress={() => setOpening(false)}>
            Open capsule 🫧
          </Button>
        </Card>
      ) : result ? (
        <Card title={result.isNewUnlock ? "New puppy!" : "Puppy collected"}>
          <Puppy id={result.puppyId} size={150} />
          <Txt bold>{result.puppyId}</Txt>
          <Button onPress={() => go("puppies")}>Open Puppy Roster</Button>
          <Button onPress={() => setResult(null)}>Another capsule</Button>
        </Card>
      ) : (
        <Row>
          <Button
            primary
            disabled={locked || g.treats < 2500}
            onPress={() => pull("TREATS")}
          >
            2,500 Treats
          </Button>
          <Button
            disabled={locked || g.ticketInventory.COMMON < 1}
            onPress={() => pull("COMMON_TICKET")}
          >
            1 Common Ticket
          </Button>
        </Row>
      )}
    </>
  );
}
