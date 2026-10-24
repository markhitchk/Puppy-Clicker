import { test } from "node:test";
import assert from "node:assert/strict";
import { ONBOARDING_STEPS, birthdayMaxDay, validBirthday, nextOnboardingStep } from "../src/app/onboarding.js";
import { sanitizePrefs } from "../src/app/preferences.js";
test("onboarding mirrors all six Kotlin stages and keeps progress bounded", () => {
  assert.deepEqual(ONBOARDING_STEPS, ["Welcome", "Player Setup", "Personalize", "Privacy", "Notifications", "Ready to Play"]);
  assert.equal(nextOnboardingStep(5), 5);
  assert.equal(nextOnboardingStep(0,-1), 0);
  assert.equal(nextOnboardingStep(2), 3);
});
test("birthday validation matches Kotlin, including February 29", () => {
  assert.equal(birthdayMaxDay(2), 29);
  assert.equal(validBirthday(2,29), true);
  assert.equal(validBirthday(2,30), false);
  assert.equal(validBirthday(0,0), true);
  assert.equal(validBirthday(1,0), false);
  assert.equal(validBirthday(4,31), false);
});
test("malformed saved onboarding preferences cannot skip steps or store invalid birthdays", () => {
  const prefs = sanitizePrefs({ setupStep: 99, setupMethod: "IMPORT_SAVE", birthdayMonth: 2, birthdayDay: 31, playerDisplayName: "  Really long display name for a player   " });
  assert.equal(prefs.setupStep, 0);
  assert.equal(prefs.setupMethod, "LOCAL");
  assert.deepEqual([prefs.birthdayMonth,prefs.birthdayDay], [0,0]);
  assert.ok(prefs.playerDisplayName.length <= 24);
});
