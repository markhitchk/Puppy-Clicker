// A callback can arrive via a cold start, Linking event, or the warm browser
// promise. All paths share one PKCE exchange and only consume the configured URL.
export function createCallbackHandler(redirectTo, exchange) {
  const expected = new URL(redirectTo),
    pending = new Map(),
    done = new Set();
  return async (url) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }
    if (
      parsed.protocol !== expected.protocol ||
      parsed.host !== expected.host ||
      parsed.pathname !== expected.pathname
    )
      return false;
    const error =
      parsed.searchParams.get("error_description") ||
      parsed.searchParams.get("error");
    if (error) throw new Error(error);
    const code = parsed.searchParams.get("code");
    if (!code) return false;
    if (done.has(code)) return true;
    if (pending.has(code)) return pending.get(code);
    const promise = (async () => {
      const { error } = await exchange(code);
      if (error) throw error;
      done.add(code);
      if (done.size > 50) done.delete(done.values().next().value);
      return true;
    })();
    pending.set(code, promise);
    try {
      return await promise;
    } finally {
      pending.delete(code);
    }
  };
}
