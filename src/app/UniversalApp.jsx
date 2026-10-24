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
import { logo } from "../game.js";
import { DEFAULT_PREFS, sanitizePrefs, palette } from "./preferences.js";
import { useAccount } from "./useAccount.js";
import { Play, Care } from "./PlayCare.jsx";
import Shop from "./Shop.jsx";
import Roster from "./Roster.jsx";
import { Rewards, Gacha } from "./Rewards.jsx";
import Settings from "./Settings.jsx";
import Prestige from "./Prestige.jsx";
import Casino from "./Casino.jsx";
import Onboarding from "./Onboarding.jsx";
import { parseSchedule, monthKey } from "../parity.js";
import { CODE_SALT, redeem } from "../redeem.js";
import { appendMessage, markHistoryRead, normalizeHistory, unreadCount } from "./inbox.js";
import catalog from "../data/redeem-codes.json";
const NAV = [
  ["play", "🐾", "Play"],
  ["care", "💖", "Care"],
  ["puppies", "🐶", "Roster"],
  ["shop", "🛍️", "Shop"],
  ["rewards", "🎁", "Rewards"],
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
    [contentHeight, setContentHeight] = useState(0),
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
    if (route === "play") return <Play {...props} height={contentHeight || Math.max(400, height - 150)} />;
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
  // The five destinations mirror Kotlin's bottom NavigationBar.
  // Secondary screens (including Settings and notifications) open from the header.
  const nav = (
    <View accessibilityLabel="Game navigation" style={{
      flexDirection: expanded ? "column" : "row",
      backgroundColor: colors.panel,
      borderTopWidth: expanded ? 0 : 1,
      borderRightWidth: expanded ? 1 : 0,
      borderColor: colors.edge,
      paddingHorizontal: expanded ? 8 : 6,
      paddingVertical: 5,
      width: expanded ? 100 : "100%",
    }}>
      {NAV.map(([id, emoji, label]) => (
        <Pressable key={id} accessibilityRole="button" accessibilityLabel={label}
          accessibilityState={{ selected: route === id }}
          onPress={() => go(id)}
          style={{ flex: expanded ? undefined : 1, minHeight: expanded ? 70 : 62,
            alignItems: "center", justifyContent: "center", gap: 3 }}>
          <View style={{ minWidth: expanded ? 70 : 62, height: 36,
            paddingHorizontal: 12, borderRadius: 28,
            alignItems: "center", justifyContent: "center",
            backgroundColor: route === id ? (colors.dark ? "#494358" : "#E0D7F1") : "transparent" }}>
            <Text style={{ fontSize: 23 }}>{emoji}</Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: route === id ? "700" : "500",
            color: route === id ? colors.text : colors.sub }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
  const header = (
    <View style={{ height: 68, flexDirection: "row", alignItems: "center",
      paddingHorizontal: 14, gap: 11, backgroundColor: colors.panel,
      borderBottomWidth: 1, borderBottomColor: colors.edge }}>
      <Image source={platform.asset(logo)} accessibilityLabel="Puppy Clicker logo"
        resizeMode="contain" style={{ width: 34, height: 40 }} />
      <Text accessibilityRole="header" numberOfLines={1}
        style={{ flex: 1, color: colors.text, fontSize: 21, fontWeight: "800" }}>
        Puppy Clicker
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Notification history"
        onPress={() => go("inbox")} style={{ height: 45, width: 45,
          borderRadius: 26, borderWidth: 1, borderColor: colors.text,
          alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 25 }}>🔔</Text>
        {unread > 0 && <View style={{ position: "absolute", top: 3, right: 3,
          width: 10, height: 10, borderRadius: 5, backgroundColor: "#F3A4AE" }} />}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Settings"
        onPress={() => go("settings")} style={{ height: 45, width: 45,
          borderRadius: 26, borderWidth: 1, borderColor: colors.text,
          alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 25 }}>⚙️</Text>
      </Pressable>
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
              <Onboarding account={account} />
            </ScrollView>
          ) : (
            <>
              {header}
              <ScrollView
                ref={scroll}
                key={route}
                style={{ flex: 1 }}
                onLayout={(e) => {
                  const measured = Math.round(e.nativeEvent.layout.height);
                  setContentHeight((previous) => previous === measured ? previous : measured);
                }}
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
