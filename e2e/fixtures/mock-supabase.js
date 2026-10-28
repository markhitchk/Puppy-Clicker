// Browser-only Playwright fixture, never included in a Vite production build.
// Uses an isolated fake website account; it cannot reach the real Supabase backend.
const testUser = {
  id: "e2e-puppy-clicker-user",
  email: "tester@example.invalid",
  user_metadata: { full_name: "Test Player" },
};
const recordKey = "puppy_test_web_save_v1";
let signedOut = new URLSearchParams(window.location.search).has("signedout");
const record = () => {
  try { return JSON.parse(window.localStorage.getItem(recordKey) || "null"); }
  catch { return null; }
};
export const client = {
  auth: {
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async getSession() {
      return { data: { session: signedOut ? null : { user: testUser } }, error: null };
    },
    async signInWithOAuth() {
      return { data: null, error: null };
    },
    async signOut() {
      signedOut = true;
      return { error: null };
    },
  },
  from(table) {
    if (table !== "puppy_web_saves") throw new Error("Unsupported test table");
    return {
      select() { return this; },
      eq() { return this; },
      async maybeSingle() { return { data: record(), error: null }; },
    };
  },
  async rpc(method, args) {
    if (method !== "puppy_web_save_commit") throw new Error("Unsupported test RPC");
    const old = record();
    const revision = Number(old?.revision || 0);
    if (revision !== args.p_expected_revision)
      return { data: null, error: new Error("WEB_SAVE_CONFLICT") };
    const next = revision + 1;
    window.localStorage.setItem(recordKey, JSON.stringify({
      revision: next,
      save_data: args.p_save_data,
    }));
    return { data: next, error: null };
  },
};
