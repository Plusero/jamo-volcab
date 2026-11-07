import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone-13', use: { ...devices['iPhone 13'] } },
  ],
  use: {
    baseURL: 'http://localhost:4173/dutch-vocab/',
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/dutch-vocab/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
