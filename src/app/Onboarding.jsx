import React from "react";
import { View, Image, Linking } from "react-native";
import { Heading, Txt, Card, Button, Row, Field, Toggle, Tabs, Puppy, useUi } from "./ui.jsx";
import { ONBOARDING_STEPS, validBirthday, nextOnboardingStep } from "./onboarding.js";

// Six steps mirror Kotlin's launch flow. React preview intentionally cannot import
// PupEye-protected saves or claim Android notification permissions until native parity.
export default function Onboarding({ account }) {
  const { prefs, setPrefs, platform, colors } = useUi();
  const step = prefs.setupStep;
  const change = (key, value) => setPrefs((p) => ({ ...p, [key]: value }));
  const move = (delta) => change("setupStep", nextOnboardingStep(step, delta));
  const canContinue = (step !== 1 || !!account.user) && (step !== 2 || validBirthday(prefs.birthdayMonth, prefs.birthdayDay));
  const birthdayInput = (key, max) => (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 2);
    const number = digits ? Number(digits) : 0;
    change(key, Math.max(0, Math.min(max, number)));
  };
  return (
    <View style={{ gap: 14, width: "100%" }}>
      <Image source={platform.asset("/assets/logos/puppy_clicker.png")}
        resizeMode="contain" style={{ width: "100%", height: 100 }} />
      <Txt muted size={12}>SETUP {step + 1} OF {ONBOARDING_STEPS.length}</Txt>
      <View style={{ height: 5, backgroundColor: colors.edge, borderRadius: 5 }}>
        <View style={{ height: 5, width: `${((step + 1) / 6) * 100}%`,
          backgroundColor: colors.accent, borderRadius: 5 }} />
      </View>
      <Heading title={ONBOARDING_STEPS[step]} subtitle="Set up Puppy Clicker before you start playing." />
      {step === 0 && (
        <>
          <Puppy id="classic" size={170} />
          <Card>
            <Txt bold size={17}>Welcome to Puppy Clicker! 🐾</Txt>
            <Txt>Tap, care for your puppy, collect new puppies, and enjoy mini-games.</Txt>
            <Txt muted size={12}>This website runs React Native Web. Original Android PupEye saves
              are never imported, overwritten, or reset by browser gameplay.</Txt>
          </Card>
        </>
      )}
      {step === 1 && (
        <>
          <Card>
            <Txt bold>Puppy Clicker Website Account</Txt>
            <Txt muted size={12}>Sign in with Discord to use this website. No guest gameplay or unsaved local progress is enabled.</Txt>
            {account.user ? (
              <Txt>✓ Signed in · {account.user.user_metadata?.full_name || account.user.email || "Discord account"}</Txt>
            ) : (
              <Button onPress={() => void account.login()} primary>Sign in with Discord</Button>
            )}
            {!account.user && <Txt muted size={12}>Sign-in is required to continue setup.</Txt>}
          </Card>
          <Card>
            <Txt bold>Android account migration</Txt>
            <Txt muted size={12}>This browser login uses a separate website cloud save. Protected Android Pup Account and PupEye saves are not imported or overwritten.</Txt>
          </Card>
        </>
      )}
      {step === 2 && (
        <Card>
          <Txt bold>Appearance</Txt>
          <Txt muted size={12}>Choose a theme and screen density. More controls are in Settings.</Txt>
          <Tabs items={[["SYSTEM", "System"], ["LIGHT", "Light"], ["DARK", "Dark"]]}
            value={prefs.theme} onChange={(value) => change("theme", value)} />
          <Tabs items={[["COMPACT", "Compact"], ["DEFAULT", "Default"], ["LARGE", "Large"]]}
            value={prefs.scale} onChange={(value) => change("scale", value)} />
          <Txt bold>Birthday (optional)</Txt>
          <Txt muted size={12}>Enter month and day, or leave both blank to skip. February 29 is supported.</Txt>
          <Row style={{ flexWrap: "nowrap" }}>
            <View style={{ flex: 1 }}>
              <Field label="Month (1–12)" value={prefs.birthdayMonth ? String(prefs.birthdayMonth) : ""}
                keyboardType="number-pad" onChangeText={birthdayInput("birthdayMonth", 12)} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Day (1–31)" value={prefs.birthdayDay ? String(prefs.birthdayDay) : ""}
                keyboardType="number-pad" onChangeText={birthdayInput("birthdayDay", 31)} />
            </View>
          </Row>
          {!canContinue && <Txt size={12}>Please enter a valid month and day, or clear both fields.</Txt>}
          <Button onPress={() => setPrefs((p) => ({ ...p, birthdayMonth: 0, birthdayDay: 0 }))}>
            Skip birthday
          </Button>
          <Txt muted size={11}>This saves your preference only. Birthday event rewards are not
            implemented in the preview yet.</Txt>
        </Card>
      )}
      {step === 3 && (
        <Card>
          <Txt bold>Permissions & Privacy</Txt>
          <Txt>React progress is stored in a separate Supabase save.
            Your installed Kotlin progress and PupEye account protection remain unchanged.</Txt>
          <Txt muted size={12}>The preview does not transfer verified accounts, connect Puppy Exchange
            trades, or enable privileged admin functionality.</Txt>
          <Button onPress={() => void Linking.openURL(
            "https://github.com/markhitchk/pup-clinker/blob/main/assets/legal/privacy-policy.md"
          )}>Read privacy policy</Button>
          <Toggle title="I have reviewed how the preview handles my data"
            value={prefs.privacyReviewed}
            onValueChange={(value) => change("privacyReviewed", value)} />
        </Card>
      )}
      {step === 4 && (
        <Card>
          <Txt bold>Notification preferences 🔔</Txt>
          <Txt muted size={12}>Choose which notices you want when native scheduling becomes available.
            These toggles do not request Android notification permission or enable system alerts yet.</Txt>
          <Toggle title="Daily rewards" value={prefs.dailyRewardNotifications}
            onValueChange={(x) => change("dailyRewardNotifications", x)} />
          <Toggle title="Game events" value={prefs.gameEventNotifications}
            onValueChange={(x) => change("gameEventNotifications", x)} />
          <Toggle title="App updates" value={prefs.updateNotifications}
            onValueChange={(x) => change("updateNotifications", x)} />
          <Txt muted size={11}>Current gameplay notices appear in the saved in-app inbox.</Txt>
        </Card>
      )}
      {step === 5 && (
        <Card>
          <Txt bold size={18}>Ready to play! 🎉</Txt>
          <Txt>Player: {account.user?.user_metadata?.full_name || account.user?.email || "Sign-in required"}</Txt>
          <Txt>Save: {account.user ? "Website cloud save (separate from Android)" : "Sign-in required"}</Txt>
          <Txt>Birthday: {prefs.birthdayMonth
            ? `${prefs.birthdayMonth}/${prefs.birthdayDay}` : "Skipped"}</Txt>
          <Txt muted size={12}>You can adjust profile, appearance, and notification choices in Settings.
            Full verified Kotlin progression transfer is still pending.</Txt>
          <Button onPress={() => change("setupStep", 2)}>Review setup</Button>
        </Card>
      )}
      <Row style={{ justifyContent: "space-between" }}>
        {step > 0 && step < 5 && (
          <Button onPress={() => move(-1)}>‹ Back</Button>
        )}
        {step < 5 ? (
          <Button primary disabled={!canContinue || (step === 3 && !prefs.privacyReviewed)}
            onPress={() => move(1)}>{step === 4 ? "Ready to Play ›" : "Continue ›"}</Button>
        ) : (
          <Button primary disabled={!account.user} onPress={() => setPrefs((p) => ({ ...p, setupComplete: true }))}>
            Start Playing 🐾
          </Button>
        )}
      </Row>
    </View>
  );
}
