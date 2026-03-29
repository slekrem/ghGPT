import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function getApiBaseUrl(): string {
  const settings = JSON.parse(
    readFileSync(resolve(__dirname, '../ghGPT.Api/Properties/launchSettings.json'), 'utf-8')
  );
  const url: string = settings.profiles.http.applicationUrl;
  return url.split(';')[0];
}

const BASE_URL = getApiBaseUrl();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'dotnet run --project ../ghGPT.Api',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
