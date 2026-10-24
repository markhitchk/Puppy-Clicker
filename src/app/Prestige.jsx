import React, { useState } from "react";
import { Txt, Heading, Card, Button, Row, Meter } from "./ui.jsx";
import {
  prestigePointsAvailable,
  prestige,
  buyPrestigeSkill,
  skillCost,
} from "../game.js";
export default function Prestige({ account, notify }) {
  const { game: g, mutate, locked } = account,
    [confirm, setConfirm] = useState(false),
    points = prestigePointsAvailable(g);
  return (
    <>
      <Heading
        title="Prestige"
        subtitle="Permanent progression and skill points."
      />
      <Card title="⭐ Prestige Center">
        <Txt bold>
          {g.prestigeCount} prestiges · {g.skillPoints} Skill Points
        </Txt>
        <Txt muted>
          {points
            ? `Prestige for +${points} Skill Points.`
            : `${Math.max(0, 50000 - g.lifetimeTreats)} more lifetime Treats needed.`}
        </Txt>
        <Meter
          label="Prestige progress"
          value={g.lifetimeTreats}
          max={50000}
          caption={`${Math.min(g.lifetimeTreats, 50000)} / 50,000`}
        />
        <Button
          primary
          disabled={locked || points < 1}
          onPress={() => setConfirm(true)}
        >
          Prestige {points ? `+${points} SP` : "locked"}
        </Button>
        {confirm && (
          <>
            <Txt>
              Reset current Treats, Bones, upgrades, tickets and run stats? Your
              puppy collection, Pup Coins, Chips, bond, settings and permanent
              skills stay.
            </Txt>
            <Row>
              <Button onPress={() => setConfirm(false)}>Cancel</Button>
              <Button
                primary
                disabled={locked}
                onPress={() => {
                  if (mutate((next) => prestige(next)))
                    notify("Prestige complete!");
                  setConfirm(false);
                }}
              >
                Confirm prestige
              </Button>
            </Row>
          </>
        )}
      </Card>
      <Card title="🌟 Permanent Skills">
        {[
          ["TAP_TRAINING", "Tap Training", "Extra tap power per CLICK upgrade"],
          [
            "AUTO_TRAINING",
            "Active Training",
            "Extra bonus per ACTIVE upgrade",
          ],
          ["SMART_SHOPPER", "Smart Shopper", "5% lower Treat costs per level"],
          [
            "TICKET_SENSE",
            "Ticket Sense",
            "Reduced matching ticket requirements",
          ],
        ].map(([id, title, desc]) => (
          <Card key={id}>
            <Txt bold>
              {title} · {g.prestigeSkills[id]}/5
            </Txt>
            <Txt muted size={12}>
              {desc}
            </Txt>
            <Button
              disabled={
                locked ||
                g.prestigeSkills[id] >= 5 ||
                g.skillPoints < skillCost(g, id)
              }
              onPress={() => mutate((next) => buyPrestigeSkill(next, id))}
            >
              {g.prestigeSkills[id] >= 5 ? "MAX" : `${skillCost(g, id)} SP`}
            </Button>
          </Card>
        ))}
      </Card>
    </>
  );
}
