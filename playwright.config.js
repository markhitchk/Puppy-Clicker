import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    launchOptions: process.env.PUPPY_CHROMIUM_PATH
      ? {
          executablePath: process.env.PUPPY_CHROMIUM_PATH,
          args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--single-process",
            "--no-zygote",
          ],
        }
      : {},
  },
  webServer: {
    command: "npm run dev -- --port 4173 --host 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
