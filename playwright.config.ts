import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx next dev --port 3100 --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      CIVICLENS_ALLOW_DEMO_MODE: 'true',
      CIVICLENS_DATA_DIR: '.civiclens-data/e2e',
      CIVICLENS_SESSION_SECRET: 'e2e-test-session-secret-32-chars-min!!',
      CIVICLENS_ADMIN_EMAILS: 'admin@civiclens.local',
      NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3100',
    },
  },
});
