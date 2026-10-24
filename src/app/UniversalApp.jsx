import React, { useEffect, useState, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Text,
  Image,
  useColorScheme,
  useWindowDimensions,
  AppState,
  BackHandler,
  Platform,
  AccessibilityInfo,
} from "react-native";
import { Ui, Txt, Card, Button, Heading, Row, Puppy, Field } from "./ui.jsx";
import { DEFAULT_PREFS, sanitizePrefs, palette } from "./preferences.js";
import { useAccount } from "./useAccount.js";
import { Play, Care } from "./PlayCare.jsx";
import Shop from "./Shop.jsx";
import Roster from "./Roster.jsx";
import { Rewards, Gacha } from "./Rewards.jsx";
import Settings from "./Settings.jsx";
import Prestige from "./Prestige.jsx";
import Casino from "./Casino.jsx";
import { parseSchedule, monthKey } from "../parity.js";
import { CODE_SALT, redeem } from "../redeem.js";
import { appendMessage, markHistoryRead, normalizeHistory, unreadCount } from "./inbox.js";
import catalog from "../data/redeem-codes.json";
const NAV = [
  ["play", "🐾", "Play"],
  ["care", "💖", "Care"],
  ["shop", "🛍️", "Shop"],
  ["prestige", "⭐", "Prestige"],
  ["settings", "⚙️", "Settings"],
];
export default function UniversalApp({ platform }) {
  const account = useAccount(platform),
    { width, height } = useWindowDimensions(),
    system = useColorScheme(),
    [prefs, setPrefs] = useState(DEFAULT_PREFS),
    [ready, setReady] = useState(false),
    [route, setRoute] = useState("play"),
    [toast, setToast] = useState(""),
    [history, setHistory] = useState([]),
    [inboxLoadedKey, setInboxLoadedKey] = useState(null),
    [clock, setClock] = useState(Date.now()),
    [schedule, setSchedule] = useState(null),
    [codeOpen, setCodeOpen] = useState(false),
    [code, setCode] = useState(""),
    [checking, setChecking] = useState(false);
  const Container = platform.Container || View;
  const inboxKey = account.user?.id || "guest";
  const unread = unreadCount(history);
  const scroll = useRef(null),
    colors = palette(prefs, system),
    expanded = width >= 840;
  useEffect(() => {
    let active = true;
    platform
      .loadPrefs()
      .then((p) => {
        if (active) {
          setPrefs(sanitizePrefs(p));
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [platform]);
  useEffect(() => {
    if (ready) void platform.savePrefs(prefs).catch(() => {});
  }, [prefs, ready, platform]);
  useEffect(() => {
    let active = true;
    setInboxLoadedKey(null);
    void platform.loadInbox(inboxKey).then((stored) => {
      if (!active) return;
      setHistory(normalizeHistory(stored));
      setInboxLoadedKey(inboxKey);
    }).catch(() => {
      if (!active) return;
      setHistory([]);
      setInboxLoadedKey(inboxKey);
    });
    return () => { active = false; };
  }, [platform, inboxKey]);
  useEffect(() => {
    if (inboxLoadedKey !== inboxKey) return;
    void platform.saveInbox(inboxKey, history).catch(() => {});
  }, [platform, inboxKey, inboxLoadedKey, history]);
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (codeOpen) {
        setCodeOpen(false);
        return true;
      }
      if (route !== "play") {
        setRoute("play");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [route, codeOpen]);
  useEffect(() => {
    let active = true;
    let loadedMonth = null;
    const controller = new AbortController();
    const refresh = async () => {
      const month = monthKey(new Date());
      if (loadedMonth !== month) {
        loadedMonth = month;
        if (active) setSchedule(null);
        try {
          const cached = parseSchedule(await platform.loadSchedule(month), month);
          if (active && loadedMonth === month && cached) setSchedule(cached);
        } catch {}
      }
      try {
        const response = await fetch(
          `https://raw.githubusercontent.com/markhitchk/pup-clinker/main/assets/rewards/${month}.json`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = await response.text();
        if (data.length > 524288) return;
        const raw = JSON.parse(data);
        const parsed = parseSchedule(raw, month);
        if (active && loadedMonth === month && parsed) {
          setSchedule(parsed);
          void platform.saveSchedule(month, raw).catch(() => {});
        }
      } catch {}
    };
    void refresh();
    const id = setInterval(refresh, 15 * 60 * 1000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(id);
    };
  }, [platform]);
  const go = (next) => {
    setRoute(next);
    setCodeOpen(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const notify = (text) => {
    setToast(text);
    if (inboxLoadedKey === inboxKey)
      setHistory((items) => appendMessage(items, text));
  };
  const context = { platform, colors, prefs, setPrefs };
  const content = () => {
    const props = { account, notify, go, schedule, clock };
    if (route === "play") return <Play {...props} height={height} />;
    if (route === "care")
      return (
        <>
          <Row>
            <Button selected>💖 Care</Button>
            <Button onPress={() => go("rewards")}>🎁 Rewards</Button>
          </Row>
          <Care {...props} />
        </>
      );
    if (route === "shop")
      return (
        <>
          <Shop {...props} />
          <Button onPress={() => setCodeOpen(true)}>🎫 Redeem Code</Button>
        </>
      );
    if (route === "prestige") return <Prestige {...props} />;
    if (route === "settings") return <Settings {...props} />;
    if (route === "puppies") return <Roster {...props} />;
    if (route === "rewards") return <Rewards {...props} />;
    if (route === "casino") return <Casino {...props} />;
    if (route === "gacha") return <Gacha {...props} />;
    if (route === "inbox")
      return (
        <>
          <Heading
            title="Notifications"
            subtitle="Saved gameplay messages on this device."
          />
          {inboxLoadedKey !== inboxKey ? (
            <Txt muted>Loading messages…</Txt>
          ) : history.length ? (
            <>
              <Row>
                <Button onPress={() => setHistory((items) => markHistoryRead(items))}>
                  Mark all read
                </Button>
                <Button onPress={() => setHistory([])}>Clear history</Button>
              </Row>
              {history.map((item) => (
                <Card key={item.id}>
                  <Txt bold={!item.read}>{item.text}</Txt>
                  <Txt muted size={11}>
                    {new Date(item.createdAt).toLocaleString()}
                    {!item.read ? " · New" : ""}
                  </Txt>
                </Card>
              ))}
            </>
          ) : (
            <Txt muted>No messages yet.</Txt>
          )}
        </>
      );
  };
  const nav = (
    <View
      accessibilityLabel="Game navigation"
      style={{
        flexDirection: expanded ? "column" : "row",
        backgroundColor: colors.panel,
        borderTopWidth: expanded ? 0 : 1,
        borderRightWidth: expanded ? 1 : 0,
        borderColor: colors.edge,
        padding: expanded ? 10 : 6,
        gap: 4,
        width: expanded ? 96 : "100%",
      }}
    >
      {NAV.map(([id, emoji, label]) => (
        <Pressable
          key={id}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: route === id }}
          onPress={() => go(id)}
          style={{
            flex: expanded ? undefined : 1,
            minHeight: expanded ? 68 : 60,
            padding: 5,
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            borderRadius: 18,
            backgroundColor: route === id ? colors.tint : "transparent",
          }}
        >
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: route === id ? "800" : "500",
              color: route === id ? colors.accent : colors.sub,
            }}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
  return (
    <Ui.Provider value={context}>
      <Container
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          flexDirection: expanded ? "row" : "column",
          minHeight: 0,
        }}
      >
        {expanded && nav}
        <View style={{ flex: 1, minHeight: 0 }}>
          {!ready ? (
            <View style={{ padding: 24 }}>
              <Txt>Loading Puppy Clicker…</Txt>
            </View>
          ) : !prefs.setupComplete ? (
            <ScrollView
              contentContainerStyle={{
                padding: 24,
                gap: 18,
                maxWidth: 520,
                width: "100%",
                alignSelf: "center",
              }}
            >
              <Image
                source={platform.asset("/assets/logos/puppy_clicker.png")}
                resizeMode="contain"
                style={{ width: "100%", height: 120 }}
              />
              <Heading
                title="Welcome to Puppy Clicker"
                subtitle="Tap, care, collect and grow with your puppy."
              />
              <Puppy id="classic" size={185} />
              <Card>
                <Txt>
                  Earn Treats by tapping, keep each puppy happy and healthy, and
                  unlock upgrades and rewards.
                </Txt>
                <Txt muted size={12}>
                  Play as a guest to try the game. Connect Discord in Settings
                  to save your React progress.
                </Txt>
              </Card>
              <Button
                primary
                onPress={() => setPrefs((p) => ({ ...p, setupComplete: true }))}
              >
                Start playing
              </Button>
            </ScrollView>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notification history"
                onPress={() => go("inbox")}
                style={{
                  position: "absolute",
                  right: 16,
                  top: 12,
                  zIndex: 3,
                  padding: 8,
                }}
              >
                <Text style={{ fontSize: 20 }}>🔔{unread ? ` ${unread}` : ""}</Text>
              </Pressable>
              <ScrollView
                ref={scroll}
                key={route}
                style={{ flex: 1 }}
                contentContainerStyle={{
                  flexGrow: 1,
                  maxWidth: expanded ? 760 : 640,
                  width: "100%",
                  alignSelf: "center",
                  paddingHorizontal: prefs.scale === "LARGE" ? 18 : 14,
                  paddingTop: 8,
                  paddingBottom: 14,
                  gap: prefs.scale === "COMPACT" ? 8 : 12,
                }}
              >
                {!NAV.some((x) => x[0] === route) && (
                  <Button
                    label="Back to Settings"
                    onPress={() => go("settings")}
                    style={{ alignSelf: "flex-start" }}
                  >
                    ‹ Back
                  </Button>
                )}
                {account.conflict && (
                  <Card>
                    <Txt bold>Cloud changed on another device.</Txt>
                    <Txt muted>
                      Reloading cloud discards this session’s unsaved changes.
                    </Txt>
                    <Button onPress={() => void account.load()}>
                      Discard local changes and reload cloud
                    </Button>
                  </Card>
                )}
                {account.busy && <Txt muted>{account.message}</Txt>}
                {content()}
                {codeOpen && (
                  <Card title="🎫 Redeem Puppy Code">
                    <Field
                      label="Puppy Code"
                      value={code}
                      onChangeText={setCode}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Txt muted size={11}>
                      Codes match exactly, including spaces and capitalization.
                    </Txt>
                    <Row>
                      <Button
                        disabled={checking || account.locked || !code}
                        primary
                        onPress={async () => {
                          setChecking(true);
                          try {
                            const hash = await platform.sha256(
                              CODE_SALT + code,
                            );
                            let result;
                            const ok = account.mutate((next) => {
                              result = redeem(next, hash, catalog);
                              return result.success;
                            });
                            notify(result?.message || "Cloud is not ready.");
                            if (ok) {
                              setCode("");
                              setCodeOpen(false);
                            }
                          } catch (error) {
                            notify(error.message);
                          } finally {
                            setChecking(false);
                          }
                        }}
                      >
                        {checking ? "Checking…" : "Redeem"}
                      </Button>
                      <Button onPress={() => setCodeOpen(false)}>Close</Button>
                    </Row>
                  </Card>
                )}
              </ScrollView>
            </>
          )}
        </View>
        {!expanded && prefs.setupComplete && nav}
        {!!toast && (
          <Pressable
            accessibilityRole="alert"
            onPress={() => setToast("")}
            style={{
              position: "absolute",
              bottom: expanded ? 20 : 85,
              left: 16,
              right: 16,
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <View
              style={{
                backgroundColor: colors.text,
                padding: 12,
                borderRadius: 14,
                maxWidth: 500,
              }}
            >
              <Text
                style={{ color: colors.bg, fontWeight: "600", fontSize: 13 }}
              >
                {toast}
              </Text>
            </View>
          </Pressable>
        )}
      </Container>
    </Ui.Provider>
  );
}
