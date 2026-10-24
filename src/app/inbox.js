// Shared Android/web inbox model. Notification history is device-local, never a cloud reward authority.
export const MAX_INBOX_ITEMS = 50;
const MAX_TEXT_LENGTH = 400;
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export function normalizeHistory(input, now = Date.now()) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  return input
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: typeof item.id === "string" || Number.isSafeInteger(item.id)
        ? String(item.id).slice(0, 100)
        : "",
      text: typeof item.text === "string" ? item.text.trim().slice(0, MAX_TEXT_LENGTH) : "",
      createdAt: Number(item.createdAt),
      read: item.read === true,
    }))
    .filter((item) => {
      if (!item.id || !item.text || !Number.isSafeInteger(item.createdAt) ||
          item.createdAt > now + 60000 || item.createdAt < now - MAX_AGE_MS ||
          seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_INBOX_ITEMS);
}
export function appendMessage(history, text, now = Date.now(), id) {
  const message = String(text || "").trim().slice(0, MAX_TEXT_LENGTH);
  if (!message) return normalizeHistory(history, now);
  const entryId = id || `${now}-${Math.random().toString(36).slice(2, 10)}`;
  return normalizeHistory([{ id: entryId, text: message, createdAt: now, read: false },
    ...normalizeHistory(history, now)], now);
}
export function markHistoryRead(history) {
  return history.map((item) => ({ ...item, read: true }));
}
export function unreadCount(history) {
  return history.filter((item) => !item.read).length;
}
