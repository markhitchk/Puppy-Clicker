import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decodePng, encodePng, makeLegacyBackgroundTransparent } from "../scripts/prepare-puppy-art.mjs";

test("removes only border-connected dark matte, preserving dark puppy details", () => {
  const width = 5, height = 5;
  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    // Opaque black matte, surrounded by bright outline around a dark interior.
    const inside = i % width >= 1 && i % width <= 3 &&
      Math.floor(i / width) >= 1 && Math.floor(i / width) <= 3;
    pixels[o] = pixels[o + 1] = pixels[o + 2] = inside ? 255 : 0;
    pixels[o + 3] = 255;
  }
  // Nose / eye represented by dark, enclosed center pixel.
  pixels[(2 * width + 2) * 4] = 0;
  pixels[(2 * width + 2) * 4 + 1] = 0;
  pixels[(2 * width + 2) * 4 + 2] = 0;
  const cleaned = decodePng(makeLegacyBackgroundTransparent(encodePng({ width, height, pixels })));
  assert.equal(cleaned.pixels[3], 0, "outer black matte becomes transparent");
  assert.equal(cleaned.pixels[(2 * width + 2) * 4 + 3], 255, "enclosed dark art remains opaque");
  assert.equal(cleaned.pixels[(1 * width + 1) * 4 + 3], 255, "bright puppy outline remains opaque");
});

test("preserves original PNGs that already contain transparency", () => {
  const pixels = Buffer.from([0, 0, 0, 0, 20, 20, 20, 255]);
  const png = encodePng({ width: 2, height: 1, pixels });
  assert.deepEqual(makeLegacyBackgroundTransparent(png), png);
});

test("transforms real original Kotlin puppy PNG without changing canvas size", async () => {
  const original = await readFile(new URL("../public/assets/v1/v1_classic.png", import.meta.url));
  const before = decodePng(original);
  const after = decodePng(makeLegacyBackgroundTransparent(original));
  assert.equal(after.width, before.width);
  assert.equal(after.height, before.height);
  assert.equal(after.pixels.length, before.pixels.length);
  assert.ok(after.hasTransparency, "legacy black matte must not remain opaque");
});
