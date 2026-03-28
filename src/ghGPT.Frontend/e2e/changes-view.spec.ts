import { test, expect } from '@playwright/test';
import { createTempRepo, modifyFile, removeTempRepo, importRepo, setActiveRepo, deleteRepo } from './helpers';

let repoDir = '';
let repoId = '';

test.beforeAll(async () => {
  repoDir = createTempRepo();
  modifyFile(repoDir, 'README.md', '# Test Repo\n\nGeänderte Zeile\n');
  const repo = await importRepo(repoDir);
  repoId = repo.id;
  await setActiveRepo(repoId);
});

test.afterAll(async () => {
  await deleteRepo(repoId);
  removeTempRepo(repoDir);
});

test.beforeEach(async ({ page }) => {
  // Ensure the file is unstaged before each test
  await fetch(`http://localhost:5000/api/repos/${repoId}/unstage-all`, { method: 'POST' });

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();
  await page.locator('changes-view').waitFor();
});

test('shows modified file in unstaged section', async ({ page }) => {
  const changesView = page.locator('changes-view');
  const fileEntry = changesView.locator('.file-entry').filter({ hasText: 'README.md' });
  await expect(fileEntry).toBeVisible();
  await expect(changesView.locator('.section-header').filter({ hasText: 'Änderungen' })).toBeVisible();
});

test('shows diff when clicking a modified file', async ({ page }) => {
  const changesView = page.locator('changes-view');
  const fileEntry = changesView.locator('.file-entry').filter({ hasText: 'README.md' });
  await fileEntry.first().click();

  await expect(changesView.locator('.diff-content')).toBeVisible({ timeout: 5000 });
  await expect(changesView.locator('.diff-line.added')).not.toHaveCount(0);
});

test('stages a file via ↑ button', async ({ page }) => {
  const changesView = page.locator('changes-view');
  const unstagedEntry = changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first();
  await unstagedEntry.locator('.action-btn').click();

  const stagedHeader = changesView.locator('.section-header').filter({ hasText: 'Staged' });
  const stagedEntry = stagedHeader.locator('..').locator('.file-entry').filter({ hasText: 'README.md' });
  await expect(stagedEntry).toBeVisible({ timeout: 5000 });
});

test('unstages a file via ↓ button', async ({ page }) => {
  const changesView = page.locator('changes-view');

  // Stage first
  await changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first().locator('.action-btn').click();

  // Verify staged
  const stagedHeader = changesView.locator('.section-header').filter({ hasText: 'Staged' });
  const stagedEntry = stagedHeader.locator('..').locator('.file-entry').filter({ hasText: 'README.md' });
  await expect(stagedEntry).toBeVisible({ timeout: 5000 });

  // Unstage
  await stagedEntry.first().locator('.action-btn').click();

  // Verify back in unstaged
  const unstagedHeader = changesView.locator('.section-header').filter({ hasText: 'Änderungen' });
  const unstagedEntry = unstagedHeader.locator('..').locator('.file-entry').filter({ hasText: 'README.md' });
  await expect(unstagedEntry).toBeVisible({ timeout: 5000 });
});
