import { advanceCare, rollDay, settleAchievements } from "./parity.js";
// The lifecycle mode is selected before decay, so resuming never consumes offline
// time using foreground rates. No caller-supplied function can run while closing.
export function applyMutation(
  before,
  fn,
  { now = Date.now(), offline = false } = {},
) {
  const next = JSON.parse(JSON.stringify(before));
  rollDay(next, new Date(now));
  advanceCare(next, now, offline);
  if (fn(next) === false) return null;
  settleAchievements(next);
  next.lastActiveAt = now;
  return next;
}
export async function closeAccount(state, save, signOut) {
  if (state.closing) return false;
  state.closing = true;
  try {
    if (state.dirty && !(await save())) return false;
    if (state.dirty) return false;
    const { error } = await signOut();
    if (error) throw error;
    return true;
  } finally {
    state.closing = false;
  }
}
