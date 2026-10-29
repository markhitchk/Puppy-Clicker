// Browser-supplied data is limited to a random tab UUID and a pathname.
// A Pup Account identity must always be derived from a verified server token.
export const isBrowserSessionId = value =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const safeWebsitePath = value => {
  if (typeof value !== "string" || value.length > 500) return "/";
  const path = value.split(/[?#]/, 1)[0];
  return path.length <= 160 && /^\/[A-Za-z0-9/_-]*$/.test(path) ? path : "/";
};
