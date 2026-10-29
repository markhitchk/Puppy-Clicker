import test from "node:test";
import assert from "node:assert/strict";
import {
  ANDROID_BANNER_COOLDOWN_MS,
  ANDROID_BANNER_LAST_SEEN,
  ANDROID_BANNER_PERMANENTLY_DISMISSED,
  getConfiguredAndroidUrl,
  isAndroidPhone,
  shouldShowAndroidBanner,
} from "../src/androidBannerPolicy.js";

const storage = () => {
  const data = new Map();
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
};

test("Android phone detection does not catch desktop or tablets without mobile hints",()=>{
  assert.equal(isAndroidPhone("Mozilla/5.0 (Linux; Android 16; SM-A176U1) AppleWebKit Mobile Safari"),true);
  assert.equal(isAndroidPhone("Mozilla/5.0 (Linux; Android 14; Pixel C) Safari"),false);
  assert.equal(isAndroidPhone("Mozilla/5.0 (Windows NT 10.0) Chrome"),false);
  assert.equal(isAndroidPhone("Android tablet",true),true);
});

test("Android suggestion cools down for three days",()=>{
  const s=storage(), now=1_800_000_000_000;
  assert.equal(shouldShowAndroidBanner(s,now),true);
  s.setItem(ANDROID_BANNER_LAST_SEEN,now);
  assert.equal(shouldShowAndroidBanner(s,now + 3600000),false);
  assert.equal(shouldShowAndroidBanner(s,now + ANDROID_BANNER_COOLDOWN_MS),true);
  s.setItem(ANDROID_BANNER_PERMANENTLY_DISMISSED,"1");
  assert.equal(shouldShowAndroidBanner(s,now + ANDROID_BANNER_COOLDOWN_MS*2),false);
});

test("download URLs must be HTTPS",()=>{
  assert.equal(getConfiguredAndroidUrl("javascript:alert(1)"),"");
  assert.equal(getConfiguredAndroidUrl("http://example.com/game.apk"),"");
  assert.equal(getConfiguredAndroidUrl("https://play.google.com/store/apps/details?id=foo"),"https://play.google.com/store/apps/details?id=foo");
});
