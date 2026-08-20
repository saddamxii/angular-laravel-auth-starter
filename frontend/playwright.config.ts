import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4200';
const integrationRun = process.env.PLAYWRIGHT_INTEGRATION === 'true';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]] : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(integrationRun ? { ignoreHTTPSErrors: true } : {}),
      },
    },
    { name: 'mobile', use: { ...devices['iPhone 15'] } },
  ],
  webServer: integrationRun ? undefined : {
    command: 'npm start -- --host 127.0.0.1 --port 4200',
    url: 'http://127.0.0.1:4200/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
