import { test, expect } from '@playwright/test';
import { createTempRepo, removeTempRepo, importRepo, setActiveRepo, deleteRepo, API } from './helpers';

let repoDir = '';
let repoId = '';

const MOCK_ISSUES_OPEN = [
  {
    number: 42,
    title: 'Fix the login bug',
    state: 'open',
    authorLogin: 'alice',
    labels: [{ name: 'bug', color: 'ee0701' }],
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-11T09:00:00Z',
    url: 'https://github.com/owner/repo/issues/42',
  },
  {
    number: 7,
    title: 'Add dark mode support',
    state: 'open',
    authorLogin: 'bob',
    labels: [{ name: 'enhancement', color: '84b6eb' }],
    createdAt: '2024-01-05T08:00:00Z',
    updatedAt: '2024-01-06T12:00:00Z',
    url: 'https://github.com/owner/repo/issues/7',
  },
];

const MOCK_ISSUE_DETAIL = {
  number: 42,
  title: 'Fix the login bug',
  state: 'open',
  authorLogin: 'alice',
  labels: [{ name: 'bug', color: 'ee0701' }],
  assignees: ['charlie'],
  body: 'Steps to reproduce:\n1. Go to login page\n2. Enter wrong credentials',
  createdAt: '2024-01-10T10:00:00Z',
  updatedAt: '2024-01-11T09:00:00Z',
  url: 'https://github.com/owner/repo/issues/42',
};

const MOCK_ISSUES_CLOSED = [
  {
    number: 3,
    title: 'Old resolved issue',
    state: 'closed',
    authorLogin: 'dave',
    labels: [],
    createdAt: '2023-12-01T10:00:00Z',
    updatedAt: '2023-12-15T14:00:00Z',
    url: 'https://github.com/owner/repo/issues/3',
  },
];

const MOCK_CREATED_ISSUE = {
  number: 99,
  title: 'New test issue',
  state: 'open',
  authorLogin: 'testuser',
  labels: [],
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  url: 'https://github.com/owner/repo/issues/99',
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

async function gotoIssuesView(page: import('@playwright/test').Page) {
  // Mock API: open issues list
  await page.route(`${API}/repos/${repoId}/issues?state=open`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ISSUES_OPEN) })
  );

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('[data-testid="nav-item"]').filter({ hasText: 'Issues' }).first().click();
  await page.locator('[data-testid="issues-list-panel"]').waitFor();
}

test('zeigt Issues-Liste an', async ({ page }) => {
  await gotoIssuesView(page);

  const items = page.locator('[data-testid="issue-item"]');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText('#42');
  await expect(items.first()).toContainText('Fix the login bug');
  await expect(items.nth(1)).toContainText('#7');
  await expect(items.nth(1)).toContainText('Add dark mode support');
});

test('zeigt Issue-Detail beim Klick an', async ({ page }) => {
  await page.route(`${API}/repos/${repoId}/issues?state=open`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ISSUES_OPEN) })
  );
  await page.route(`${API}/repos/${repoId}/issues/42`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ISSUE_DETAIL) })
  );

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('[data-testid="nav-item"]').filter({ hasText: 'Issues' }).first().click();
  await page.locator('[data-testid="issues-list-panel"]').waitFor();

  await page.locator('[data-testid="issue-item"]').first().click();
  await page.locator('[data-testid="issue-detail-header"]').waitFor();

  await expect(page.locator('[data-testid="issue-detail-header"]')).toContainText('#42');
  await expect(page.locator('[data-testid="issue-detail-header"]')).toContainText('Fix the login bug');
  await expect(page.locator('[data-testid="issue-detail-header"]')).toContainText('alice');
  await expect(page.locator('[data-testid="issues-detail-panel"]')).toContainText('Steps to reproduce');
});

test('State-Filter wechselt zwischen open/closed/all', async ({ page }) => {
  await page.route(`${API}/repos/${repoId}/issues?state=open`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ISSUES_OPEN) })
  );
  await page.route(`${API}/repos/${repoId}/issues?state=closed`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ISSUES_CLOSED) })
  );
  await page.route(`${API}/repos/${repoId}/issues?state=all`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([...MOCK_ISSUES_OPEN, ...MOCK_ISSUES_CLOSED]) })
  );

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('[data-testid="nav-item"]').filter({ hasText: 'Issues' }).first().click();
  await page.locator('[data-testid="issues-list-panel"]').waitFor();

  // Open-Filter ist aktiv → 2 Issues
  await expect(page.locator('[data-testid="issue-item"]')).toHaveCount(2);

  // Auf Closed wechseln → 1 Issue
  await page.locator('[data-testid="filter-closed"]').click();
  await expect(page.locator('[data-testid="issue-item"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="issue-item"]').first()).toContainText('Old resolved issue');

  // Auf All wechseln → 3 Issues
  await page.locator('[data-testid="filter-all"]').click();
  await expect(page.locator('[data-testid="issue-item"]')).toHaveCount(3);

  // Zurück auf Open → 2 Issues
  await page.locator('[data-testid="filter-open"]').click();
  await expect(page.locator('[data-testid="issue-item"]')).toHaveCount(2);
});

test('Neues Issue erstellen', async ({ page }) => {
  let createdBody: unknown;
  await page.route(`${API}/repos/${repoId}/issues?state=open`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ISSUES_OPEN) })
  );
  await page.route(`${API}/repos/${repoId}/issues`, async route => {
    if (route.request().method() === 'POST') {
      createdBody = route.request().postDataJSON();
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CREATED_ISSUE) });
    } else {
      route.continue();
    }
  });
  await page.route(`${API}/repos/${repoId}/issues/99`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...MOCK_CREATED_ISSUE, body: null, assignees: [] }) })
  );

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('[data-testid="nav-item"]').filter({ hasText: 'Issues' }).first().click();
  await page.locator('[data-testid="issues-list-panel"]').waitFor();

  await page.locator('[data-testid="new-issue-btn"]').click();
  await page.locator('[data-testid="create-title-input"]').fill('New test issue');
  await page.locator('[data-testid="create-body-input"]').fill('This is a test issue body.');

  await page.locator('[data-testid="create-issue-btn"]').click();
  await page.locator('[data-testid="issue-detail-header"]').waitFor();

  expect((createdBody as { title: string }).title).toBe('New test issue');
  await expect(page.locator('[data-testid="issue-detail-header"]')).toContainText('#99');
});

test('Kommentar-Formular öffnen und senden', async ({ page }) => {
  let commentBody: unknown;
  await page.route(`${API}/repos/${repoId}/issues?state=open`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ISSUES_OPEN) })
  );
  await page.route(`${API}/repos/${repoId}/issues/42`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ISSUE_DETAIL) })
  );
  await page.route(`${API}/repos/${repoId}/issues/42/comments`, async route => {
    commentBody = route.request().postDataJSON();
    route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('[data-testid="nav-item"]').filter({ hasText: 'Issues' }).first().click();
  await page.locator('[data-testid="issues-list-panel"]').waitFor();

  await page.locator('[data-testid="issue-item"]').first().click();
  await page.locator('[data-testid="issue-detail-header"]').waitFor();

  await page.locator('[data-testid="add-comment-btn"]').click();
  await page.locator('[data-testid="comment-body-input"]').fill('Great issue, I can reproduce it!');
  await page.locator('[data-testid="submit-comment-btn"]').click();

  // Formular schließt sich nach erfolgreichem Kommentar
  await expect(page.locator('[data-testid="comment-body-input"]')).not.toBeVisible();
  expect((commentBody as { body: string }).body).toBe('Great issue, I can reproduce it!');
});

test('zeigt Fehlermeldung wenn API nicht erreichbar', async ({ page }) => {
  await page.route(`${API}/repos/${repoId}/issues?state=open`, route =>
    route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Kein GitHub-Remote konfiguriert.' }) })
  );

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('[data-testid="nav-item"]').filter({ hasText: 'Issues' }).first().click();
  await page.locator('[data-testid="issues-list-panel"]').waitFor();

  await expect(page.locator('[data-testid="list-error"]')).toBeVisible();
});
