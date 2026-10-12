import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { requireEnv } from './src/config/env';

dotenv.config({ quiet: true });

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
      baseURL: requireEnv('BASE_URL'),
      testIdAttribute: 'data-test',
      trace: 'on-first-retry',
  },
  projects: [
      {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
      },
  ],
});