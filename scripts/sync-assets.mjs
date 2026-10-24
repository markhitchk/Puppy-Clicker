// Import exact bytes from an existing checkout of the Kotlin reference repository.
// Usage: node scripts/sync-assets.mjs /path/to/pup-clinker
import { readFile, writeFile, mkdir, cp, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const source = process.argv[2];
if (!source) throw new Error("Pass the Kotlin repository checkout path");
const root = process.cwd(),
  out = path.join(root, "public/assets");
await mkdir(out, { recursive: true });
for (const folder of [
  "v1",
  "v2",
  "test",
  "discord_rewards",
  "logos",
  "cursors",
  "legal",
  "rewards",
])
  await cp(path.join(source, "assets", folder), path.join(out, folder), {
    recursive: true,
  });
for (const file of ["pup_coin.png", "redeem-codes.json"])
  await cp(path.join(source, "assets", file), path.join(out, file));
await mkdir(path.join(out, "casino"), { recursive: true });
for (const file of await readdir(
  path.join(source, "App/app/src/main/res/drawable"),
))
  if (
    /^puppy_.*(blackjack|gacha|lucky_wheel|plinko|roulette|slots).*\.png$/.test(
      file,
    )
  )
    await cp(
      path.join(source, "App/app/src/main/res/drawable", file),
      path.join(out, "casino", file),
    );
const puppies = [];
for (const group of (await readdir(path.join(source, "assets"))).filter(
  (x) =>
    ["v1", "v2", "test", "discord_rewards"].includes(x) ||
    /^v[3-9][0-9]*$/.test(x),
)) {
  const manifest = JSON.parse(
    await readFile(path.join(source, "assets", group, "manifest.json"), "utf8"),
  );
  await cp(path.join(source, "assets", group), path.join(out, group), {
    recursive: true,
  });
  for (const item of Array.isArray(manifest)
    ? manifest
    : manifest.puppies || []) {
    const id =
      group === "v1" ? item.asset_id.replace(/^v1_/, "") : item.asset_id;
    puppies.push({
      id,
      name: item.name,
      number:
        group === "test"
          ? 1000 + (item.number || 0)
          : group === "discord_rewards"
            ? 999
            : item.number,
      group,
      redeemOnly:
        group === "v1"
          ? !["classic", "golden", "poodle", "spotty"].includes(id)
          : (item.redeem_only ?? !item.free),
      image: `/assets/${group}/${item.file || item.filename}`,
    });
  }
}
puppies.sort(
  (a, b) =>
    ["v1", "v2", "discord_rewards", "test"].indexOf(a.group) -
      ["v1", "v2", "discord_rewards", "test"].indexOf(b.group) ||
    a.number - b.number,
);
await mkdir(path.join(root, "src/data"), { recursive: true });
await writeFile(
  path.join(root, "src/data/roster.js"),
  "// Generated from the Kotlin roster manifests. Run scripts/sync-assets.mjs to update.\nexport default " +
    JSON.stringify(puppies, null, 2) +
    ";\n",
);
await cp(
  path.join(out, "redeem-codes.json"),
  path.join(root, "src/data/redeem-codes.json"),
);
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    // Derived transparent variants are generated at build time, never source artwork.
    if (entry.isDirectory() && entry.name !== "transparent") await walk(file);
    else if (/\.(png|svg)$/.test(file)) files.push(file);
  }
}
await walk(out);
await writeFile(
  path.join(root, "mobile/assets.js"),
  "// Original Kotlin artwork, statically bundled by Metro.\nexport const assets={\n" +
    files
      .map(
        (file) =>
          JSON.stringify("/assets/" + path.relative(out, file)) +
          ":require(" +
          JSON.stringify("../" + path.relative(root, file)) +
          ")",
      )
      .join(",\n") +
    "\n};\n",
);
await mkdir(path.join(root, "docs/parity"), { recursive: true });
await writeFile(
  path.join(root, "docs/parity/asset-manifest.json"),
  JSON.stringify(
    {
      sourceCommit: execFileSync("git", ["-C", source, "rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      assets: await Promise.all(
        files.map(async (file) => ({
          path: path.relative(out, file),
          sha256: createHash("sha256")
            .update(await readFile(file))
            .digest("hex"),
        })),
      ),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Synced ${puppies.length} puppies and ${files.length} original image assets.`,
);
