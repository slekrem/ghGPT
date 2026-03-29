import { execSync } from 'child_process';
import { test, expect } from '@playwright/test';
import { createTempRepoWithRemote, removeTempRepo, importRepo, setActiveRepo, deleteRepo } from './helpers';

let localDir = '';
let remoteDir = '';
let repoId = '';

test.beforeAll(async () => {
  ({ localDir, remoteDir } = createTempRepoWithRemote());

  const repo = await importRepo(localDir);
  repoId = repo.id;
  await setActiveRepo(repoId);
});

test.afterAll(async () => {
  await deleteRepo(repoId);
  removeTempRepo(localDir);
  removeTempRepo(remoteDir);
});

async function gotoBranchesView(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Branches' }).first().click();
  await page.locator('branches-view').waitFor();
}

// --- Anzeige ---

test('shows remote branches section', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');
  await expect(view.locator('.section-title').filter({ hasText: /Remote Branches/i })).toBeVisible();
});

test('shows remote branch in list', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');
  await expect(view.locator('.branch-row').filter({ hasText: 'origin/feature/remote-branch' })).toBeVisible();
});

test('remote branch shows cloud icon', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');
  const remoteRow = view.locator('.branch-row').filter({ hasText: 'origin/feature/remote-branch' });
  await expect(remoteRow.locator('.branch-icon')).toContainText('☁');
});

// --- Checkout ---

test('remote branch has checkout button on hover', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');
  const remoteRow = view.locator('.branch-row').filter({ hasText: 'origin/feature/remote-branch' });
  await remoteRow.hover();
  await expect(remoteRow.locator('.action-btn', { hasText: 'Checkout' })).toBeVisible();
});

test('checkout of remote branch creates local tracking branch', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');

  const remoteRow = view.locator('.branch-row').filter({ hasText: 'origin/feature/remote-branch' });
  await remoteRow.hover();
  await remoteRow.locator('.action-btn', { hasText: 'Checkout' }).click();

  await expect(view.locator('.branch-row.head').filter({ hasText: 'feature/remote-branch' })).toBeVisible({ timeout: 5000 });
  await expect(view.locator('.branch-row.head .head-badge')).toBeVisible();

  // zurück zu master/main und lokalen Branch entfernen für folgende Tests
  try { execSync('git checkout master', { cwd: localDir, stdio: 'pipe' }); }
  catch { execSync('git checkout main', { cwd: localDir, stdio: 'pipe' }); }
  execSync('git branch -D feature/remote-branch', { cwd: localDir, stdio: 'pipe' });
});

test('toolbar shows local branch name after remote checkout', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');

  const remoteRow = view.locator('.branch-row').filter({ hasText: 'origin/feature/remote-branch' });
  await remoteRow.hover();
  await remoteRow.locator('.action-btn', { hasText: 'Checkout' }).click();

  await expect(view.locator('.branch-row.head').filter({ hasText: 'feature/remote-branch' })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.toolbar-branch')).toContainText('feature/remote-branch');

  try { execSync('git checkout master', { cwd: localDir, stdio: 'pipe' }); }
  catch { execSync('git checkout main', { cwd: localDir, stdio: 'pipe' }); }
});

test('checkout remote branch twice shows error', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');

  // ersten Checkout direkt per git, damit lokaler Branch schon existiert
  execSync('git checkout feature/remote-branch', { cwd: localDir, stdio: 'pipe' });
  try { execSync('git checkout master', { cwd: localDir, stdio: 'pipe' }); }
  catch { execSync('git checkout main', { cwd: localDir, stdio: 'pipe' }); }

  let alertMessage = '';
  page.on('dialog', async (dialog) => {
    alertMessage = dialog.message();
    await dialog.accept();
  });

  const remoteRow = view.locator('.branch-row').filter({ hasText: 'origin/feature/remote-branch' });
  await remoteRow.hover();
  await remoteRow.locator('.action-btn', { hasText: 'Checkout' }).click();

  await page.waitForEvent('dialog', { timeout: 5000 });
  expect(alertMessage).toMatch(/existiert bereits/i);
});

// --- Neuer Branch aus Remote-Branch ---

test('new branch dialog includes remote branches in base select', async ({ page }) => {
  await gotoBranchesView(page);

  await page.locator('branches-view .btn-primary').filter({ hasText: 'Neuer Branch' }).click();
  const dialog = page.locator('branches-view .dialog');
  await expect(dialog).toBeVisible();

  const options = await dialog.locator('select option').allTextContents();
  expect(options.some(o => o.includes('origin/'))).toBe(true);
});

test('creates local branch from remote branch as base', async ({ page }) => {
  await gotoBranchesView(page);

  await page.locator('branches-view .btn-primary').filter({ hasText: 'Neuer Branch' }).click();
  const dialog = page.locator('branches-view .dialog');

  await dialog.locator('input[type="text"]').fill('feature/from-remote');
  await dialog.locator('select').selectOption({ label: 'origin/feature/remote-branch' });
  await dialog.locator('.btn-primary').filter({ hasText: 'Erstellen' }).click();

  await expect(page.locator('branches-view .dialog')).not.toBeVisible({ timeout: 5000 });
  await expect(page.locator('branches-view .branch-row').filter({ hasText: 'feature/from-remote' })).toBeVisible();
  await expect(page.locator('branches-view .branch-row.head').filter({ hasText: 'feature/from-remote' })).toBeVisible();
});
