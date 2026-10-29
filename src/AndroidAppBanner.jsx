import React, {useEffect, useState} from "react";
import {client} from "./supabase.js";
import {verifyPuppySession} from "./native/web/puppyOAuth.js";
import {
  ANDROID_BANNER_LAST_SEEN,
  ANDROID_BANNER_PERMANENTLY_DISMISSED,
  getConfiguredAndroidUrl,
  isAndroidPhone,
  shouldShowAndroidBanner,
} from "./androidBannerPolicy.js";
import "./AndroidAppBanner.css";

const androidUrl = getConfiguredAndroidUrl(\n  import.meta.env.VITE_ANDROID_APP_URL ||\n  "https://play.google.com/store/apps/details?id=com.harleytg.puppyclicker"\n);

export default function AndroidAppBanner() {
  const [visible, setVisible] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !isAndroidPhone(
      navigator.userAgent,
      navigator.userAgentData?.mobile === true,
    )) return;
    if (window.location.pathname === "/auth/discord/callback") return;
    if (!shouldShowAndroidBanner(window.localStorage)) return;
    setVisible(true);
    try { window.localStorage.setItem(ANDROID_BANNER_LAST_SEEN, String(Date.now())); } catch {}
  }, []);

  useEffect(() => {
    if (!visible || !client) return;
    let alive = true;
    const check = async () => {
      try {
        await verifyPuppySession(client);
        if (alive) setSignedIn(true);
      } catch {
        if (alive) setSignedIn(false);
      }
    };
    void check();
    const {data} = client.auth.onAuthStateChange(() => {
      // Do not perform awaited auth calls synchronously in the auth listener.
      setTimeout(() => { if (alive) void check(); }, 0);
    });
    return () => { alive = false; data?.subscription?.unsubscribe(); };
  }, [visible]);

  const close = (permanently = false) => {
    try {
      if (permanently) {
        window.localStorage.setItem(ANDROID_BANNER_PERMANENTLY_DISMISSED, "1");
      }
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <aside className="puppy-android-banner" aria-label="Official Puppy Clicker Android app">
      <div className="puppy-android-banner-icon" aria-hidden="true">🐶</div>
      <div className="puppy-android-banner-body">
        <strong>You're on Android!</strong>
        <p>{signedIn
          ? "Enjoy Puppy Clicker on Android with your existing Pup Account."
          : "Download the official Puppy Clicker app for a better experience."}</p>
        <div className="puppy-android-banner-actions">
          {androidUrl
            ? <a className="puppy-android-banner-download" href={androidUrl} target="_blank" rel="noopener noreferrer">Get the Android app</a>
            : <span className="puppy-android-banner-unavailable">Android download link coming soon</span>}
          <button type="button" onClick={() => close(false)}>Not now</button>
          <button type="button" onClick={() => close(true)}>Don't show again</button>
        </div>
      </div>
      <button type="button" className="puppy-android-banner-close" aria-label="Dismiss Android app suggestion" onClick={() => close(false)}>×</button>
    </aside>
  );
}
