import { defineConfig } from '@playwright/test'

const preview = 'http://127.0.0.1:4173'
const connected = 'http://127.0.0.1:4174'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    browserName: 'chromium',
    locale: 'en-US',
    colorScheme: 'light',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
  },
  projects: [
    { name: 'preview', testIgnore: 'connected.spec.ts', use: { baseURL: preview } },
    { name: 'connected', testMatch: 'connected.spec.ts', use: { baseURL: connected } },
  ],
  webServer: [
    {
      command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
      url: preview,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
      url: connected,
      env: {
        VITE_WAYPOST_LIVE_SEED: JSON.stringify({
          propertyId: 42,
          propertyName: 'Waypost Pilot',
          roomTypeId: 9,
          roomType: 'Standard King',
          nightlyMinor: 185000,
        }),
      },
    },
  ],
})
