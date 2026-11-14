// Image URLs are loaded by the browser, never fetched by the server.
// Reject internal hosts and non-HTTPS schemes before storing a public avatar link.
export function normalizeAvatarUrl(value) {
 if (typeof value !== "string" || !value.trim() || value.length > 2048) return null;
 try {
  const url = new URL(value.trim());
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !host.includes(".") || /^[\d.]+$/.test(host) || host.startsWith("[") ||
      host === "localhost" || host.endsWith(".localhost") ||
      host.endsWith(".local") || host.endsWith(".internal") ||
      host.endsWith(".test")) return null;
  // These are hosting-site pages, not image bytes; <img> cannot display them.
  // Other HTTPS hosts remain extension-agnostic (e.g. signed CDN image links).
  if (["imgur.com", "www.imgur.com", "m.imgur.com",
       "imgbb.com", "www.imgbb.com", "ibb.co", "www.ibb.co",
       "postimg.cc", "www.postimg.cc"].includes(host)) return null;
  if (host === "i.imgur.com" && !/\\.(png|jpe?g|webp|gif|avif)$/i.test(url.pathname)) return null;
  return url.href;
 } catch { return null; }
}
