import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getApiBaseUrl(): string {
  const raw = readFileSync(resolve(__dirname, '../ghGPT.Api/Properties/launchSettings.json'), 'utf-8')
    .replace(/^\uFEFF/, '');
  const settings = JSON.parse(
    raw
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
