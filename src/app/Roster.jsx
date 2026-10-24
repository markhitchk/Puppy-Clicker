import React, { useState } from "react";
import { View, Image } from "react-native";
import {
  Heading,
  Txt,
  Card,
  Button,
  Row,
  Field,
  Tabs,
  Puppy,
  useUi,
} from "./ui.jsx";
import { ROSTER, switchPuppy } from "../game.js";
import {
  queryRoster,
  toggleFavorite,
  renamePuppy,
  bondMilestone,
} from "../parity.js";
export default function Roster({ account, notify }) {
  const { game: g, mutate, locked } = account,
    { platform } = useUi(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("ALL"),
    [category, setCategory] = useState(""),
    [favorite, setFavorite] = useState(false),
    [sort, setSort] = useState("UNLOCKED_FIRST"),
    [detail, setDetail] = useState(null),
    [name, setName] = useState(g.puppyName);
  const puppies = queryRoster(g, {
    search,
    status,
    category,
    favoritesOnly: favorite,
    sort,
  });
  return (
    <>
      <Heading
        title="Puppy Roster"
        subtitle={`${g.unlockedPuppies.length} / ${ROSTER.length} unlocked · every puppy keeps its own care.`}
      />
      <Card>
        <Txt bold>Current puppy · {g.puppyName}</Txt>
        <Field
          label="Puppy nickname"
          value={name}
          onChangeText={setName}
          maxLength={18}
        />
        <Button
          disabled={locked || !name.trim()}
          onPress={() => {
            if (mutate((next) => renamePuppy(next, name)))
              notify("Puppy renamed");
          }}
        >
          Save nickname
        </Button>
      </Card>
      <Field label="Search puppies" value={search} onChangeText={setSearch} />
      <Tabs
        items={["ALL", "UNLOCKED", "LOCKED"].map((x) => [x, x])}
        value={status}
        onChange={setStatus}
      />
      <Tabs
        items={[
          ["", "All"],
          ["v1", "V1"],
          ["v2", "V2"],
          ["discord_rewards", "Discord"],
        ]}
        value={category}
        onChange={setCategory}
      />
      <Row>
        <Button selected={favorite} onPress={() => setFavorite(!favorite)}>
          ★ Favorites
        </Button>
        <Button
          onPress={() =>
            setSort(sort === "NAME_ASC" ? "UNLOCKED_FIRST" : "NAME_ASC")
          }
        >
          {sort === "NAME_ASC" ? "Sort: Name" : "Sort: Unlocked first"}
        </Button>
      </Row>
      <Row style={{ alignItems: "stretch", gap: 8 }}>
        {puppies.map((p) => {
          const unlocked = g.unlockedPuppies.includes(p.id);
          return (
            <Card
              key={p.id}
              style={{ width: "47%", flexGrow: 1, maxWidth: 260, padding: 10 }}
            >
              <Image
                source={platform.asset(p.image)}
                resizeMode="contain"
                style={{
                  width: "100%",
                  height: 125,
                  opacity: unlocked ? 1 : 0.35,
                }}
              />
              <Txt bold>{p.name}</Txt>
              <Txt muted size={11}>
                {p.group.toUpperCase()} · #{p.number}
              </Txt>
              <Button
                label={"Favorite " + p.name}
                disabled={locked}
                onPress={() => mutate((next) => toggleFavorite(next, p.id))}
              >
                {g.favoritePuppies.includes(p.id) ? "★ Favorite" : "☆ Favorite"}
              </Button>
              <Button
                primary={unlocked}
                label={unlocked ? "Use " + p.name : "Unlock info " + p.name}
                disabled={locked || g.puppyStyle === p.id}
                onPress={() => {
                  if (unlocked) {
                    mutate((next) => switchPuppy(next, p.id));
                    setName(g.puppyNames?.[p.id] || p.name.split(" / ")[0]);
                  } else setDetail(p);
                }}
              >
                {g.puppyStyle === p.id
                  ? "✓ Active"
                  : unlocked
                    ? "Use puppy"
                    : "🔒 How to unlock"}
              </Button>
            </Card>
          );
        })}
      </Row>
      {!puppies.length && <Txt muted>No puppies match these filters.</Txt>}
      {detail && (
        <Card title={detail.name}>
          <Puppy id={detail.id} size={150} />
          <Txt>
            {detail.id === "v2_discord_pup"
              ? "Awarded for a verified Discord Pup Members role."
              : detail.id.includes("dev_pup")
                ? "Awarded for a verified Developer role."
                : detail.redeemOnly
                  ? "Unlock through its Puppy Code or special event reward."
                  : "Available from the Puppy Gacha."}
          </Txt>
          <Txt muted>
            Role rewards require server verification; signing in alone does not
            grant a role.
          </Txt>
          <Button onPress={() => setDetail(null)}>Close details</Button>
        </Card>
      )}
    </>
  );
}
