import React, { useRef, useState } from "react";
import { View, Text, Image, PanResponder } from "react-native";
import { Txt, useUi } from "./ui.jsx";
import {
  SCRATCH_COLUMNS, SCRATCH_ROWS, SCRATCH_REVEAL_THRESHOLD,
  markScratchCells, scratchCoverage,
} from "../scratch.js";

// Shared Android + web scratch surface. The saved outcome is immutable until
// this stage reaches the native 68% reveal threshold.
export default function ScratchCard({ round, onReveal }) {
  const { colors, platform } = useUi();
  const [scratched, setScratched] = useState(() => new Set());
  const cellRef = useRef(new Set());
  const boundsRef = useRef({ width: 0, height: 0 });
  const priorRef = useRef(null);
  const revealedRef = useRef(false);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  const mark = (event) => {
    if (revealedRef.current) return;
    const { locationX: x, locationY: y } = event.nativeEvent;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const now = Date.now();
    const point = { x, y, at: now };
    const previous = priorRef.current || point;
    const result = markScratchCells(
      cellRef.current, previous, point, boundsRef.current,
      now - previous.at,
    );
    priorRef.current = point;
    if (result.size === cellRef.current.size) return;
    cellRef.current = result;
    setScratched(result);
    if (scratchCoverage(result) >= SCRATCH_REVEAL_THRESHOLD) {
      revealedRef.current = true;
      onRevealRef.current();
    }
  };

  // Keep a stable responder over the *entire* coating so a swipe does not
  // accidentally activate the next wager button or scroll the casino page.
  const markRef = useRef(mark);
  markRef.current = mark;
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => markRef.current(event),
    onPanResponderMove: (event) => markRef.current(event),
    onPanResponderRelease: () => { priorRef.current = null; },
    onPanResponderTerminate: () => { priorRef.current = null; },
  })).current;

  const progress = Math.floor(scratchCoverage(scratched) * 100);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <Image
          source={platform.asset("/assets/pup_coin.png")}
          resizeMode="contain"
          style={{ width: 44, height: 44 }}
        />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt bold>Scratch Token</Txt>
          <Txt muted size={12}>
            Drag over the silver coating to reveal the three symbols.
          </Txt>
        </View>
      </View>
      <View
        testID="scratch-surface"
        accessibilityRole="adjustable"
        accessibilityLabel={`Scratch card, ${progress}% uncovered`}
        accessibilityHint="Swipe a finger over the card to scratch. Screen reader users can activate to reveal."
        accessibilityActions={[{ name: "activate", label: "Reveal scratch card" }]}
        onAccessibilityAction={() => {
          if (!revealedRef.current) {
            revealedRef.current = true;
            onRevealRef.current();
          }
        }}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          boundsRef.current = { width, height };
        }}
        {...responder.panHandlers}
        style={{
          height: 132, width: "100%", borderRadius: 14,
          overflow: "hidden", backgroundColor: "#FFF1C9",
          borderWidth: 2, borderColor: "#D1A858",
          justifyContent: "center",
        }}
      >
        <View
          pointerEvents="none"
          style={{ flexDirection: "row", justifyContent: "space-evenly", alignItems: "center" }}
        >
          {round.symbols.map((symbol, index) => (
            <Text key={index} style={{ fontSize: 35 }}>{symbol}</Text>
          ))}
        </View>
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {Array.from({ length: SCRATCH_ROWS }, (_, row) => (
            <View key={row} style={{ flex: 1, flexDirection: "row" }}>
              {Array.from({ length: SCRATCH_COLUMNS }, (_, col) => (
                <View
                  key={col}
                  style={{
                    flex: 1,
                    backgroundColor: scratched.has(row * SCRATCH_COLUMNS + col)
                      ? "transparent" : "#8599A1",
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <Txt muted size={12} style={{ textAlign: "center" }}>
        🐾 Scratch {progress}% · Reveal at 68%
      </Txt>
    </View>
  );
}
