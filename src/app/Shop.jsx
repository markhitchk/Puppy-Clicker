import React, { useState } from "react";
import { View } from "react-native";
import { Heading, Wallet, Card, Txt, Row, Button, Tabs, Field } from "./ui.jsx";
import {
  UPGRADES,
  RARITIES,
  cost,
  boneCost,
  ticketCost,
  purchase,
  ticketShopCost,
  buyUpgradeTicket,
  accessoryPrices,
  buyAccessory,
} from "../game.js";
export default function Shop({ account, notify }) {
  const { game: g, mutate, locked } = account,
    [tab, setTab] = useState("upgrades");
  return (
    <>
      <Heading
        title="Puppy Shop"
        subtitle="Active upgrades, rare tickets, Pup Coins and Puppy Codes."
      />
      <Wallet game={g} />
      <Tabs
        items={[
          ["upgrades", "🍪 Upgrades"],
          ["tickets", "🎟️ Tickets"],
          ["coins", "🪙 Pup Coins"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "tickets" && (
        <Card title="🎟️ Upgrade Tickets">
          <Row>
            {RARITIES.map((r) => (
              <Txt key={r} size={12}>
                {r} · {g.ticketInventory[r]}
              </Txt>
            ))}
          </Row>
        </Card>
      )}
      {tab !== "coins" ? (
        UPGRADES.filter((u) => (tab === "tickets" ? u.rarity : !u.rarity)).map(
          (u) => (
            <Card key={u.id}>
              <Row style={{ justifyContent: "space-between" }}>
                <Txt bold size={17}>
                  {u.emoji} {u.name}
                </Txt>
                <Txt muted size={12}>
                  Lv. {g.upgrades[u.id]}
                </Txt>
              </Row>
              <Txt muted size={12}>
                {u.description}
              </Txt>
              <Button
                primary
                disabled={
                  locked ||
                  g.treats < cost(g, u) ||
                  g.bones < boneCost(u) ||
                  (u.rarity && g.ticketInventory[u.rarity] < ticketCost(g, u))
                }
                onPress={() => {
                  if (mutate((next) => purchase(next, u)))
                    notify(u.name + " upgraded!");
                }}
              >
                {cost(g, u)} 🍪 + {boneCost(u)} 🦴
                {u.rarity ? ` + ${ticketCost(g, u)} ${u.rarity} 🎟️` : ""}
              </Button>
            </Card>
          ),
        )
      ) : (
        <>
          <Card title="🪙 Pup Coin Shop">
            <Txt muted>Buy Upgrade Tickets and accessories with Pup Coins.</Txt>
            <Txt bold>{g.pupCoins} Pup Coins</Txt>
          </Card>
          <Card title="Upgrade Tickets">
            {RARITIES.map((r) => (
              <Row key={r} style={{ justifyContent: "space-between" }}>
                <Txt size={12}>{r}</Txt>
                <Button
                  disabled={
                    locked ||
                    g.pupCoins < ticketShopCost(r, g.ticketShopPurchases[r])
                  }
                  onPress={() => mutate((next) => buyUpgradeTicket(next, r))}
                >
                  {ticketShopCost(r, g.ticketShopPurchases[r])} 🪙
                </Button>
              </Row>
            ))}
          </Card>
          <Card title="🎀 Accessories">
            {["None", ...Object.keys(accessoryPrices)].map((name) => (
              <Row key={name} style={{ justifyContent: "space-between" }}>
                <Txt>{name}</Txt>
                <Button
                  disabled={
                    locked ||
                    (!g.ownedAccessories.includes(name) &&
                      g.pupCoins < accessoryPrices[name])
                  }
                  onPress={() =>
                    mutate((next) => {
                      if (!buyAccessory(next, name)) return false;
                      next.accessory = name;
                    })
                  }
                >
                  {g.accessory === name
                    ? "Equipped"
                    : g.ownedAccessories.includes(name)
                      ? "Equip"
                      : `${accessoryPrices[name]} 🪙`}
                </Button>
              </Row>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
