import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  define: { global: "globalThis" },
  resolve: {
    alias: [{ find: /^react-native$/, replacement: "react-native-web" }],
  },
  server: { host: true },
});
