// Synchronize only browser-safe modules from the real React Native app.
// Production builds use committed snapshots; this task only runs manually or in CI.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const upstream = "markhitchk/pup-clinker";
const ref = process.env.PUPPY_NATIVE_SOURCE_REF || "main";
if (!/^[a-zA-Z0-9._/-]{1,128}$/.test(ref) || ref.includes(".."))
  throw new Error("Invalid PUPPY_NATIVE_SOURCE_REF");

const dest = resolve(dirname(fileURLToPath(import.meta.url)), "../src/mobile/engine");
const allowed = [
  ["balancedProgression.js", ["export const MAX_PLAYER_LEVEL", "export const addBoundedXp"]],
  ["playV6.js", ["export function v6WalletFormat", "export function v6PlaySizing"]],
];
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "Puppy-Clicker-web-mobile-source-sync",
  ...(process.env.GH_TOKEN ? { Authorization: "Bearer " + process.env.GH_TOKEN } : {}),
};
const meta = await fetch(
  "https://api.github.com/repos/" + upstream + "/commits/" + encodeURIComponent(ref),
  { headers },
);
if (!meta.ok) throw new Error("Source commit lookup: HTTP " + meta.status);
const commit = (await meta.json()).sha;
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("Invalid upstream SHA");

const sources = await Promise.all(allowed.map(async ([name, required]) => {
  const path = "Mobile/src/engine/" + name;
  const response = await fetch(
    "https://raw.githubusercontent.com/" + upstream + "/" + commit + "/" + path,
  );
  if (!response.ok) throw new Error("Source " + name + ": HTTP " + response.status);
  const content = await response.text();
  if (content.length < 100 || content.length > 100_000 || !required.every(k => content.includes(k)))
    throw new Error("Unexpected source contract for " + name);
  return { name, path, content };
}));

await mkdir(dest, { recursive: true });
for (const { name, content } of sources)
  await writeFile(resolve(dest, name), content);
await writeFile(resolve(dest, "SOURCE.json"), JSON.stringify({
  upstream,
  commit,
  sourceRoot: "Mobile/src/engine",
  files: sources.map(({ path }) => path),
}, null, 2) + "\n");
console.log("Synchronized " + sources.length + " mobile modules from " + commit);
