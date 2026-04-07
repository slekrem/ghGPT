import { test, expect } from '@playwright/test';
import { createTempRepo, removeTempRepo, importRepo, setActiveRepo, deleteRepo, API } from './helpers';

let repoDir = '';
let repoId = '';

const MOCK_DISCUSSIONS = [
  {
    number: 5,
    title: 'Wie soll die neue API aussehen?',
    body: 'Ich schlage vor, dass wir REST verwenden.\n\n## Vorteile\n- Einfach\n- Weit verbreitet',
    url: 'https://github.com/owner/repo/discussions/5',
    createdAt: '2024-03-10T09:00:00Z',
    authorLogin: 'alice',
    categoryName: 'Ideas',
  },
  {
    number: 3,
    title: 'Release-Strategie für v2.0',
    body: 'Wann planen wir den Release?',
    url: 'https://github.com/owner/repo/discussions/3',
    createdAt: '2024-02-20T14:00:00Z',
    authorLogin: 'bob',
    categoryName: 'General',
  },
];

const MOCK_CREATED = {
  number: 10,
  title: 'Neue Test-Discussion',
  body: 'Inhalt der Discussion.',
  url: 'https://github.com/owner/repo/discussions/10',
  createdAt: '2024-04-01T10:00:00Z',
  authorLogin: 'testuser',
  categoryName: 'General',
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

async function gotoDiscussionsView(page: import('@playwright/test').Page) {
  await page.route(`${API}/repos/${repoId}/discussions?limit=30`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DISCUSSIONS) })
  );
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('[data-testid="nav-item"]').filter({ hasText: 'Discussions' }).first().click();
  await page.locator('[data-testid="discussions-list-panel"]').waitFor();
}

test('zeigt Discussions-Liste an', async ({ page }) => {
  await gotoDiscussionsView(page);

  const items = page.locator('[data-testid="discussion-item"]');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText('#5');
  await expect(items.first()).toContainText('Wie soll die neue API aussehen?');
  await expect(items.nth(1)).toContainText('#3');
});

test('Kategorie-Badge korrekt angezeigt', async ({ page }) => {
  await gotoDiscussionsView(page);

  const badges = page.locator('[data-testid="category-badge"]');
  await expect(badges).toHaveCount(2);
  await expect(badges.first()).toContainText('Ideas');
  await expect(badges.nth(1)).toContainText('General');
});

test('Detail lädt beim Klick auf eine Discussion', async ({ page }) => {
  await gotoDiscussionsView(page);

  await page.locator('[data-testid="discussion-item"]').first().click();
  await page.locator('[data-testid="discussion-detail-header"]').waitFor();

  await expect(page.locator('[data-testid="discussion-detail-header"]')).toContainText('#5');
  await expect(page.locator('[data-testid="discussion-detail-header"]')).toContainText('alice');
  await expect(page.locator('[data-testid="discussion-body"]')).toContainText('REST verwenden');
});

test('Neue Discussion kann erstellt werden', async ({ page }) => {
  let requestBody: unknown;
  await page.route(`${API}/repos/${repoId}/discussions?limit=30`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DISCUSSIONS) })
  );
  await page.route(`${API}/repos/${repoId}/discussions`, async route => {
    if (route.request().method() === 'POST') {
      requestBody = route.request().postDataJSON();
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CREATED) });
    } else {
      route.continue();
    }
  });

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('[data-testid="nav-item"]').filter({ hasText: 'Discussions' }).first().click();
  await page.locator('[data-testid="discussions-list-panel"]').waitFor();

  await page.locator('[data-testid="new-discussion-btn"]').click();
  await page.locator('[data-testid="create-title-input"]').fill('Neue Test-Discussion');
  await page.locator('[data-testid="create-body-input"]').fill('Inhalt der Discussion.');
  await page.locator('[data-testid="create-discussion-btn"]').click();

  await page.locator('[data-testid="discussion-detail-header"]').waitFor();
  expect((requestBody as { title: string }).title).toBe('Neue Test-Discussion');
  await expect(page.locator('[data-testid="discussion-detail-header"]')).toContainText('#10');
});

test('zeigt Fehlermeldung wenn API nicht erreichbar', async ({ page }) => {
  await page.route(`${API}/repos/${repoId}/discussions?limit=30`, route =>
    route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Kein GitHub-Remote konfiguriert.' }) })
  );

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('[data-testid="nav-item"]').filter({ hasText: 'Discussions' }).first().click();
  await page.locator('[data-testid="discussions-list-panel"]').waitFor();

  await expect(page.locator('[data-testid="list-error"]')).toBeVisible();
});
