import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ command }) => ({
  plugins: [react()],
  define: { global: "globalThis" },
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: "react-native-web" },
      // Isolated in-memory auth fixture is available only to the Playwright dev server.
      ...(command === "serve" && process.env.PUPPY_E2E_FIXTURE === "1"
        ? [{ find: /^\.\/supabase\.js$/, replacement: fileURLToPath(new URL("./e2e/fixtures/mock-supabase.js", import.meta.url)) }]
        : []),
    ],
  },
  server: { host: true },
}));
