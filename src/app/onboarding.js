// Kotlin PuppyOnboardingStep order, mirrored without importing protected Kotlin saves.
export const ONBOARDING_STEPS = [
  "Welcome", "Player Setup", "Personalize", "Privacy", "Notifications", "Ready to Play",
];
export function birthdayMaxDay(month) {
  if (![1,2,3,4,5,6,7,8,9,10,11,12].includes(month)) return 0;
  if (month === 2) return 29;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}
export function validBirthday(month, day) {
  return (month === 0 && day === 0) ||
    (Number.isInteger(month) && Number.isInteger(day) &&
      day >= 1 && day <= birthdayMaxDay(month));
}
export function nextOnboardingStep(step, direction = 1) {
  return Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, Math.trunc(step || 0) + direction));
}
