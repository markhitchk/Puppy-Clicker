export const ANDROID_BANNER_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
export const ANDROID_BANNER_LAST_SEEN = "puppy_android_install_last_seen_v1";
export const ANDROID_BANNER_PERMANENTLY_DISMISSED = "puppy_android_install_no_thanks_v1";

// UA is presentation-only. Never use this heuristic as an authorization check.
export function isAndroidPhone(userAgent = "", mobileHint = false) {
  return /Android/i.test(userAgent) && (/Mobile/i.test(userAgent) || mobileHint === true);
}

export function shouldShowAndroidBanner(storage, now = Date.now()) {
  try {
    if (storage.getItem(ANDROID_BANNER_PERMANENTLY_DISMISSED) === "1") return false;
    const previous = Number(storage.getItem(ANDROID_BANNER_LAST_SEEN));
    return !Number.isFinite(previous) || previous <= 0 || now - previous >= ANDROID_BANNER_COOLDOWN_MS;
  } catch {
    return true; // Private mode / unavailable storage should not crash the site.
  }
}

export function getConfiguredAndroidUrl(raw) {
  try {
    const url = new URL(String(raw || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}
