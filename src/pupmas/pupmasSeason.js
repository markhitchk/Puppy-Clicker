// Front-end Pupmas presentation dates only. Reward eligibility must be checked by the server.
const numericDay = date => date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

export const PUPMAS_YEAR = 2026;
export const PUPMAS_REWARDS = Object.freeze([
  '5,000 Puppy Coins', 'Puppy Treat Bundle', 'Candy Cane Cursor', 'Winter Care Bundle', 'Santa Hat Accessory',
  'Pup Coin Boost', 'Cozy Puppy Blanket', 'Treat Bundle', 'Snowflake Nameplate', '15,000 Puppy Coins',
  'Holiday Care Bundle', '25,000 Puppy Coins', 'Winter Click Effect', 'Special Treat Bundle', 'Christmas Collar',
  'Pup Coin Boost', 'Festive Puppy Bowl', 'Holiday Avatar Frame', 'Snowflake Token Bundle', 'Winter Puppy Bed',
  'Treat Bundle', 'Festive Profile Badge', 'Holiday Puppy Accessory', 'Christmas Puppy Cosmetic', 'Legendary Pupmas Gift Box'
]);

export function pupmasPhase(date = new Date()) {
  const day = numericDay(date);
  if (day < 20261201) return 'upcoming';
  if (day <= 20261225) return 'calendar';
  if (day <= 20261231) return 'catchup';
  return 'ended';
}

export function pupmasVisualsActive(date = new Date()) {
  const day = numericDay(date);
  return day >= 20261127 && day <= 20270105;
}

export function pupmasDayStatus(day, date = new Date()) {
  if (!Number.isInteger(day) || day < 1 || day > 25) return 'invalid';
  const today = numericDay(date);
  const target = 20261200 + day;
  return today < target ? 'locked' : today === target ? 'today' : 'past';
}
