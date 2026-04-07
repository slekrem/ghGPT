import { test, expect } from '@playwright/test';
import { createTempRepo, removeTempRepo, importRepo, setActiveRepo, deleteRepo, API } from './helpers';

let repoDir = '';
let repoId = '';

const MOCK_RELEASES = [
  {
    tagName: 'v2.0.0',
    name: 'Version 2.0 – Major Release',
    publishedAt: '2024-03-01T10:00:00Z',
    isDraft: false,
    isPrerelease: false,
    isLatest: true,
  },
  {
    tagName: 'v1.5.0-beta.1',
    name: 'Beta Release',
    publishedAt: '2024-02-15T08:00:00Z',
    isDraft: false,
    isPrerelease: true,
    isLatest: false,
  },
  {
    tagName: 'v1.4.0',
    name: 'Version 1.4',
    publishedAt: '2024-01-10T12:00:00Z',
    isDraft: false,
    isPrerelease: false,
    isLatest: false,
  },
];

const MOCK_DETAIL_V2 = {
  tagName: 'v2.0.0',
  name: 'Version 2.0 – Major Release',
  body: '## What\'s Changed\n- New feature A\n- Bugfix for issue #42\n- Performance improvements',
  publishedAt: '2024-03-01T10:00:00Z',
  isDraft: false,
  isPrerelease: false,
  url: 'https://github.com/owner/repo/releases/tag/v2.0.0',
  authorLogin: 'alice',
};

const MOCK_DETAIL_BETA = {
  tagName: 'v1.5.0-beta.1',
  name: 'Beta Release',
  body: 'Pre-release testing version.',
  publishedAt: '2024-02-15T08:00:00Z',
  isDraft: false,
  isPrerelease: true,
  url: 'https://github.com/owner/repo/releases/tag/v1.5.0-beta.1',
  authorLogin: 'bob',
};

test.beforeAll(async () => {
  repoDir = createTempRepo();
  const repo = await importRepo(repoDir);
  repoId = repo.id;
  await setActiveRepo(repoId);
});

test.afterAll(async () => {
  await deleteRepo(repoId);
  removeTempRepo(repoDir);
});

async function gotoReleasesView(page: import('@playwright/test').Page) {
  await page.route(`${API}/repos/${repoId}/releases?limit=30`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RELEASES) })
  );

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('[data-testid="nav-item"]').filter({ hasText: 'Releases' }).first().click();
  await page.locator('[data-testid="releases-list-panel"]').waitFor();
}

test('zeigt Releases-Liste an', async ({ page }) => {
  await gotoReleasesView(page);

  const items = page.locator('[data-testid="release-item"]');
  await expect(items).toHaveCount(3);
  await expect(items.first()).toContainText('v2.0.0');
  await expect(items.nth(1)).toContainText('v1.5.0-beta.1');
  await expect(items.nth(2)).toContainText('v1.4.0');
});

test('Latest-Release ist markiert', async ({ page }) => {
  await gotoReleasesView(page);

  const latestItem = page.locator('[data-testid="release-item"][data-latest]');
  await expect(latestItem).toHaveCount(1);
  await expect(latestItem).toContainText('v2.0.0');
  await expect(latestItem.locator('[data-testid="latest-badge"]')).toBeVisible();
});

test('Prerelease-Badge korrekt angezeigt', async ({ page }) => {
  await gotoReleasesView(page);

  const betaItem = page.locator('[data-testid="release-item"]').nth(1);
  await expect(betaItem.locator('[data-testid="prerelease-badge"]')).toBeVisible();
});

test('Detail zeigt Changelog-Body beim Klick an', async ({ page }) => {
  await page.route(`${API}/repos/${repoId}/releases?limit=30`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RELEASES) })
  );
  await page.route(`${API}/repos/${repoId}/releases/v2.0.0`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DETAIL_V2) })
  );

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('[data-testid="nav-item"]').filter({ hasText: 'Releases' }).first().click();
  await page.locator('[data-testid="releases-list-panel"]').waitFor();

  await page.locator('[data-testid="release-item"]').first().click();
  await page.locator('[data-testid="release-detail-header"]').waitFor();

  await expect(page.locator('[data-testid="release-detail-header"]')).toContainText('v2.0.0');
  await expect(page.locator('[data-testid="release-detail-header"]')).toContainText('alice');
  await expect(page.locator('[data-testid="release-body"]')).toContainText("What's Changed");
  await expect(page.locator('[data-testid="release-body"]')).toContainText('New feature A');
});

test('Pre-release Detail zeigt Badge an', async ({ page }) => {
  await page.route(`${API}/repos/${repoId}/releases?limit=30`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RELEASES) })
  );
  await page.route(`${API}/repos/${repoId}/releases/v1.5.0-beta.1`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DETAIL_BETA) })
  );

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('[data-testid="nav-item"]').filter({ hasText: 'Releases' }).first().click();
  await page.locator('[data-testid="releases-list-panel"]').waitFor();

  await page.locator('[data-testid="release-item"]').nth(1).click();
  await page.locator('[data-testid="release-detail-header"]').waitFor();

  await expect(page.locator('[data-testid="release-detail-header"]').locator('[data-testid="prerelease-badge"]')).toBeVisible();
});

test('zeigt Fehlermeldung wenn API nicht erreichbar', async ({ page }) => {
  await page.route(`${API}/repos/${repoId}/releases?limit=30`, route =>
    route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Kein GitHub-Remote konfiguriert.' }) })
  );

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('[data-testid="nav-item"]').filter({ hasText: 'Releases' }).first().click();
  await page.locator('[data-testid="releases-list-panel"]').waitFor();

  await expect(page.locator('[data-testid="list-error"]')).toBeVisible();
});
