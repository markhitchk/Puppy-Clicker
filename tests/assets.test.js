import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { ROSTER } from "../src/game.js";
const require = createRequire(import.meta.url);
test("all bundled original images match the pinned Kotlin SHA256 manifest", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../docs/parity/asset-manifest.json", import.meta.url),
    ),
  );
  for (const asset of manifest.assets) {
    const data = readFileSync(
      new URL("../public/assets/" + asset.path, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(data).digest("hex"),
      asset.sha256,
      asset.path,
    );
  }
  assert.equal(manifest.assets.length, 68);
});
test("every roster portrait has a static native bundle entry and a web file", () => {
  const native = readFileSync(
    new URL("../mobile/assets.js", import.meta.url),
    "utf8",
  );
  for (const p of ROSTER) {
    assert.ok(native.includes(JSON.stringify(p.image)), p.id);
    assert.ok(
      readFileSync(new URL("../public" + p.image, import.meta.url)).length > 0,
      p.id,
    );
  }
});
test("preview APK embeds release JS and cannot replace the protected Kotlin app", () => {
  const config = require("../mobile/app.config.cjs").expo,
    profiles = JSON.parse(
      readFileSync(new URL("../mobile/eas.json", import.meta.url)),
    ).build;
  assert.equal(
    config.android.package,
    "com.harleytg.puppyclicker.reactpreview",
  );
  assert.equal(profiles.preview.developmentClient, false);
  assert.equal(profiles.preview.android.buildType, "apk");
  assert.equal(profiles.production.env.APP_VARIANT, "production");
});
test('preview uses a distinct OAuth deep-link scheme',()=>{
  assert.equal(require('../mobile/app.config.cjs').expo.scheme,'puppyclicker-reactpreview');
});
