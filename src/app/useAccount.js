import {puppyReadFrom} from "../dbSchemaLayout.js";
import { applyMutation, closeAccount } from "../accountLifecycle.js";
import { recover } from "../blackjack.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { freshGame, sanitizeGame } from "../game.js";
import { advanceCare, rollDay, settleAchievements } from "../parity.js";
const copy = (x) => JSON.parse(JSON.stringify(x));
export function useAccount(platform) {
  const client = platform.client;
  const [game, setGame] = useState(freshGame),
    [user, setUser] = useState(null),
    [busy, setBusy] = useState(!!client),
    [dirty, setDirty] = useState(false),
    [conflict, setConflict] = useState(false),
    [message, setMessage] = useState("Checking account…"),
    [revision, setRevision] = useState(0),
    [closing, setClosing] = useState(false);
  const ref = useRef({
    game,
    user: null,
    busy: !!client,
    dirty: false,
    conflict: false,
    revision: 0,
    edits: 0,
    sessionVersion: 0,
    saving: false,
    closing: false,
    active: AppState.currentState !== "background",
  });
  const commit = useCallback((g) => {
    ref.current.game = g;
    setGame(g);
  }, []);
  const load = useCallback(async () => {
    const r = ref.current,
      account = r.user?.id,
      version = ++r.sessionVersion;
    if (!client || !account) return;
    r.busy = true;
    setBusy(true);
    setMessage("Loading cloud save…");
    try {
      const { data, error } = await puppyReadFrom(client, "puppy_web_saves", {
        useGrouped: import.meta.env.VITE_PUPPY_GROUPED_DB_READS === "true",
      })
        .select("save_data,revision")
        .eq("auth_user_id", account)
        .maybeSingle();
      if (
        ref.current.user?.id !== account ||
        ref.current.sessionVersion !== version
      )
        return false;
      if (error) throw error;
      const g = sanitizeGame(data?.save_data?.game);
      advanceCare(g, Date.now(), true);
      rollDay(g);
      recover(g);
      settleAchievements(g);
      commit(g);
      r.revision = Number(data?.revision || 0);
      setRevision(r.revision);
      r.dirty = true;
      setDirty(true);
      r.edits = 0;
      r.conflict = false;
      setConflict(false);
      r.busy = false;
      setBusy(false);
      setMessage("Cloud save loaded");
      return true;
    } catch (error) {
      if (
        ref.current.user?.id !== account ||
        ref.current.sessionVersion !== version
      )
        return false;
      setMessage(
        "Cloud load failed: " + error.message + " · retry before playing",
      );
      return false;
    }
  }, [client, commit]);
  const save = useCallback(async () => {
    const r = ref.current;
    if (!client || !r.user || !r.dirty || r.busy || r.conflict || r.saving)
      return false;
    const account = r.user.id,
      edits = r.edits,
      version = r.sessionVersion;
    r.saving = true;
    setMessage("Saving…");
    try {
      const snapshot = copy(r.game);
      const { data, error } = await client.rpc("puppy_web_save_commit", {
        p_expected_revision: r.revision,
        p_save_data: {
          format: "puppy-clicker-web-save",
          schemaVersion: 1,
          game: snapshot,
        },
      });
      if (r.user?.id !== account || r.sessionVersion !== version) return false;
      if (error) throw error;
      r.revision = Number(data);
      setRevision(r.revision);
      if (r.edits === edits) {
        r.dirty = false;
        setDirty(false);
      }
      setMessage("Cloud synced · revision " + data);
      return true;
    } catch (error) {
      if (r.user?.id !== account || r.sessionVersion !== version) return false;
      if (String(error.message).includes("WEB_SAVE_CONFLICT")) {
        r.conflict = true;
        setConflict(true);
      }
      setMessage("Save failed: " + error.message);
      return false;
    } finally {
      r.saving = false;
    }
  }, [client]);
  useEffect(() => {
    let active = true;
    const session = (s) => {
      if (!active) return;
      const u = s?.user || null,
        r = ref.current;
      if (r.initialized && r.user?.id === u?.id) return;
      r.initialized = true;
      r.sessionVersion++;
      r.user = u;
      setUser(u);
      r.revision = 0;
      setRevision(0);
      r.edits = 0;
      r.dirty = false;
      setDirty(false);
      r.conflict = false;
      setConflict(false);
      commit(freshGame());
      if (u) {
        r.busy = true;
        setBusy(true);
        void load();
      } else {
        r.busy = false;
        setBusy(false);
        setMessage("Sign in with Discord to play and save on the website");
      }
    };
    if (!client) {
      session(null);
      return;
    }
    // Defer DB work out of Supabase's synchronous auth callback.
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, s) => {
      queueMicrotask(() => session(s));
    });
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) {
          if (error) {
            setMessage(error.message);
            ref.current.busy = false;
            setBusy(false);
          } else session(data.session);
        }
      })
      .catch((error) => {
        if (active) {
          setMessage(error.message);
          ref.current.busy = false;
          setBusy(false);
        }
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client, load, commit]);
  const mutate = useCallback(
    (fn, options) => {
      const r = ref.current;
      if (r.busy || r.conflict || r.closing || !r.user) return false;
      const next = applyMutation(r.game, fn, options);
      if (!next) return false;
      commit(next);
      r.edits++;
      if (r.user) {
        r.dirty = true;
        setDirty(true);
      }
      return true;
    },
    [commit],
  );
  useEffect(() => {
    const id = setInterval(() => {
      void save();
    }, 8000);
    const sub = AppState.addEventListener("change", (state) => {
      ref.current.active = state === "active";
      if (state !== "active") void save();
      else mutate(() => {}, { offline: true });
    });
    const stop = platform.onHidden?.(() => void save());
    return () => {
      clearInterval(id);
      sub.remove();
      stop?.();
    };
  }, [save, mutate, platform]);
  useEffect(() => {
    const id = setInterval(() => {
      const g = ref.current.game;
      if (
        ref.current.active &&
        (Date.now() - g.careUpdatedAtMs >= 120000 ||
          g.dailyDay !==
            Math.floor(
              Date.UTC(
                new Date().getFullYear(),
                new Date().getMonth(),
                new Date().getDate(),
              ) / 86400000,
            ))
      )
        mutate(() => {});
    }, 1000);
    return () => clearInterval(id);
  }, [mutate]);
  useEffect(
    () =>
      platform.onAuthError?.((error) =>
        setMessage("Discord sign-in failed: " + error),
      ),
    [platform],
  );
  const login = async () => {
    try {
      await platform.login();
    } catch (error) {
      setMessage("Discord sign-in failed: " + error.message);
    }
  };
  const logout = async () => {
    setClosing(true);
    try {
      return await closeAccount(ref.current, save, () => client.auth.signOut());
    } catch (error) {
      setMessage(error.message);
      return false;
    } finally {
      setClosing(false);
    }
  };
  return {
    game,
    user,
    busy,
    dirty,
    conflict,
    message,
    revision,
    mutate,
    save,
    load,
    login,
    logout,
    locked: busy || conflict || closing || !user,
  };
}
