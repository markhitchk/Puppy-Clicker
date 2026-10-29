import {isIP} from "node:net";

const cache = new Map();
const MAX_CACHE_ENTRIES = 500;
const UNKNOWN = Object.freeze({
  status: "unknown", vpn: null, proxy: null, tor: null, hosting: null,
  anonymous: null, riskScore: null, confidence: null, provider: "proxycheck-v3",
});

export function getClientIp(headers, trustedVercel = false) {
  // These forwarded headers are authoritative ONLY on a trusted Vercel deployment.
  // Never accept a browser-supplied body.ip or query parameter for an IP decision.
  if (!trustedVercel) return null;
  const raw = headers["x-vercel-forwarded-for"] ?? headers["x-forwarded-for"] ?? headers["x-real-ip"];
  const candidate = String(Array.isArray(raw) ? raw[0] : raw ?? "").split(",")[0].trim();
  return isIP(candidate) && isPublicIp(candidate) ? candidate : null;
}

function isPublicIp(ip) {
  const version = isIP(ip);
  if (version === 4) {
    const [a,b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    return true;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1" || lower.startsWith("fe8") ||
        lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb") ||
        lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("ff")) return false;
    if (lower.startsWith("::ffff:")) return isPublicIp(lower.slice(7));
    return true;
  }
  return false;
}

const tri = (value) => typeof value === "boolean" ? value : null;
const numeric = (value) => Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
export function parseProxycheckV3(response, ip) {
  if (!response || !["ok","warning"].includes(response.status)) return {...UNKNOWN};
  const entry = response[ip];
  if (!entry || typeof entry !== "object" || !entry.detections) return {...UNKNOWN};
  const d = entry.detections;
  const vpn = tri(d.vpn);
  const proxy = tri(d.proxy);
  const tor = tri(d.tor);
  const hosting = tri(d.hosting);
  const anonymous = tri(d.anonymous);
  const flags = [vpn, proxy, tor, hosting, anonymous];
  const anyDetected = flags.some(flag => flag === true);
  const anyKnown = flags.some(flag => flag !== null);
  const status = !anyKnown ? "unknown" : anyDetected ? "detected" : "not_detected";
  return {
    status, vpn, proxy, tor, hosting, anonymous,
    riskScore: numeric(d.risk) ?? numeric(d.risk_score) ?? numeric(entry.risk),
    confidence: numeric(d.confidence),
    provider: "proxycheck-v3",
  };
}

export async function detectNetworkRisk(ip, {key, fetcher = fetch, now = Date.now()} = {}) {
  if (!ip || !isIP(ip) || !isPublicIp(ip)) return {...UNKNOWN};
  const cached = cache.get(ip);
  if (cached && cached.expiresAt > now) return {...cached.value};
  const url = new URL("https://proxycheck.io/v3/" + encodeURIComponent(ip));
  // proxycheck.io supports free keyless requests (100/day per server IP).\n  // A registered FREE API key raises the quota to 1,000/day.\n  if (typeof key === "string" && key.trim()) url.searchParams.set("key", key.trim());
  url.searchParams.set("tag", "0"); // Do not store extra provider-side query history.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2200);
  let value = {...UNKNOWN};
  try {
    const response = await fetcher(url.toString(), {
      method: "GET", signal: controller.signal,
      headers: {Accept: "application/json"},
    });
    if (response.ok) value = parseProxycheckV3(await response.json(), ip);
  } catch {
    // Provider outage/timeouts must never become a false VPN conviction.
  } finally { clearTimeout(timeout); }
  const lifetime = value.status === "detected" ? 120000 : value.status === "not_detected" ? 600000 : 30000;
  if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
  cache.set(ip, {value, expiresAt: now + lifetime});
  return value;
}
