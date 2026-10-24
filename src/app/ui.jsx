import { ROSTER } from "../game.js";
import React, { createContext, useContext, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  Animated,
  TextInput,
  Switch,
  Platform,
} from "react-native";
export const Ui = createContext(null);
export const useUi = () => useContext(Ui);
export function Txt({ children, muted, bold, size = 14, style, ...rest }) {
  const { colors } = useUi();
  return (
    <Text
      {...rest}
      style={[
        {
          color: muted ? colors.sub : colors.text,
          fontSize: size,
          fontWeight: bold ? "800" : "400",
          lineHeight: size * 1.45,
          flexShrink: 1,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Row({ children, style }) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Card({ children, title, style }) {
  const { colors } = useUi();
  return (
    <View
      style={[
        {
          backgroundColor: colors.panel,
          borderColor: colors.edge,
          borderWidth: 1,
          borderRadius: 20,
          padding: 14,
          gap: 10,
        },
        style,
      ]}
    >
      {!!title && (
        <Txt bold size={17}>
          {title}
        </Txt>
      )}
      {children}
    </View>
  );
}
export function Button({
  children,
  onPress,
  disabled = false,
  primary = false,
  selected = false,
  style,
  label,
  testID,
  content,
}) {
  const { colors, prefs } = useUi();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      aria-selected={selected}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: primary
            ? colors.accent
            : selected
              ? colors.tint
              : "transparent",
          borderWidth: 1,
          borderColor: primary || selected ? colors.accent : colors.edge,
          borderRadius: 18,
          paddingVertical: 11,
          paddingHorizontal: 15,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed && prefs.animations ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {content || (
        <Txt
          bold
          size={13}
          style={{
            color: primary
              ? colors.onAccent
              : selected
                ? colors.accent
                : colors.text,
            textAlign: "center",
          }}
        >
          {children}
        </Txt>
      )}
    </Pressable>
  );
}
export function Heading({ title, subtitle }) {
  return (
    <View style={{ gap: 1, paddingRight: 40 }}>
      <Txt bold size={28} accessibilityRole="header">
        {title}
      </Txt>
      {!!subtitle && <Txt muted>{subtitle}</Txt>}
    </View>
  );
}
export function Meter({ label, value, max = 100, caption }) {
  const { colors } = useUi();
  return (
    <View style={{ gap: 5 }}>
      <Row style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
        <Txt bold size={12}>
          {label}
        </Txt>
        <Txt bold size={12}>
          {caption ?? `${Math.floor(value)}%`}
        </Txt>
      </Row>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{
          min: 0,
          max,
          now: Math.min(max, Math.max(0, value)),
        }}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(max, Math.max(0, value))}
        style={{
          height: 6,
          backgroundColor: colors.raised,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`,
            height: "100%",
            backgroundColor: colors.accent,
            borderRadius: 8,
          }}
        />
      </View>
    </View>
  );
}
export function Puppy({
  id,
  accessory = "None",
  size = 150,
  onPress,
  disabled,
}) {
  const { platform, prefs } = useUi();
  const scale = useRef(new Animated.Value(1)).current;
  const image = (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image
        accessibilityLabel={id}
        source={platform.asset(
          ROSTER.find((p) => p.id === id)?.image || "/assets/v1/v1_classic.png",
        )}
        resizeMode="contain"
        style={{ width: "100%", height: "100%" }}
      />
      {accessory !== "None" && (
        <Text
          style={{
            position: "absolute",
            top: accessory === "Crown" ? 0 : "58%",
            left: accessory === "Bow" ? "60%" : "40%",
            fontSize: size * 0.2,
          }}
        >
          {accessory === "Crown" ? "👑" : accessory === "Bow" ? "🎀" : "🔺"}
        </Text>
      )}
    </View>
  );
  if (!onPress) return image;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tap puppy to earn Treats"
      disabled={disabled}
      onPress={() => {
        onPress();
        if (prefs.animations && !prefs.reducedMotion) {
          scale.setValue(0.92);
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: Platform.OS !== "web",
            friction: 3,
            tension: 90,
          }).start();
        }
      }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{image}</Animated.View>
    </Pressable>
  );
}
export function Wallet({ game }) {
  const { prefs } = useUi();
  return (
    <Card style={{ paddingHorizontal: 4, paddingVertical: 10 }}>
      <Row style={{ gap: 0, flexWrap: "nowrap" }}>
        {[
          ["🍪", "Treats", game.treats],
          ["🦴", "Bones", game.bones],
          ["🪙", "Pup Coins", game.pupCoins],
          ["🐾", "Casino Chips", game.casinoChips],
        ].map(([icon, label, n]) => (
          <View key={label} style={{ flex: 1, alignItems: "center", gap: 0 }}>
            <Text style={{ fontSize: 23 }}>{icon}</Text>
            <Txt bold size={16}>
              {prefs.compactNumbers && n >= 10000
                ? Intl.NumberFormat("en", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(n)
                : String(n)}
            </Txt>
            <Txt muted size={10}>
              {label}
            </Txt>
          </View>
        ))}
      </Row>
    </Card>
  );
}
export function Field({ label, value, onChangeText, ...rest }) {
  const { colors } = useUi();
  return (
    <View style={{ gap: 6, flexShrink: 1 }}>
      <Txt bold size={12}>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.sub}
        style={{
          backgroundColor: colors.raised,
          borderColor: colors.edge,
          borderWidth: 1,
          borderRadius: 12,
          color: colors.text,
          padding: 12,
          minHeight: 44,
        }}
        {...rest}
      />
    </View>
  );
}
export function Toggle({ title, description, value, onValueChange }) {
  const { colors } = useUi();
  return (
    <Row
      style={{
        flexWrap: "nowrap",
        justifyContent: "space-between",
        minHeight: 50,
      }}
    >
      <View style={{ flex: 1 }}>
        <Txt bold>{title}</Txt>
        {description && (
          <Txt muted size={12}>
            {description}
          </Txt>
        )}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.edge }}
      />
    </Row>
  );
}
export function Tabs({ items, value, onChange }) {
  return (
    <Row style={{ gap: 6 }}>
      {items.map(([id, label]) => (
        <Button
          key={id}
          selected={id === value}
          onPress={() => onChange(id)}
          style={{ flexGrow: 1, paddingHorizontal: 10 }}
        >
          {label}
        </Button>
      ))}
    </Row>
  );
}
