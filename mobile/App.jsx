import React from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import UniversalApp from "../src/app/UniversalApp.jsx";
import { useUi } from "../src/app/ui.jsx";
import { platform } from "./platform.js";
function Container({ children, style }) {
  const { colors } = useUi();
  return (
    <SafeAreaView style={style}>
      <StatusBar style={colors.dark ? "light" : "dark"} />
      {children}
    </SafeAreaView>
  );
}
const nativePlatform = { ...platform, Container };
export default function App() {
  return (
    <SafeAreaProvider>
      <UniversalApp platform={nativePlatform} />
    </SafeAreaProvider>
  );
}
