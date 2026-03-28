import { test, expect } from '@playwright/test';
import { createTempRepo, modifyFile, removeTempRepo, importRepo, setActiveRepo } from './helpers';

let repoDir = '';
let repoId = '';

test.beforeAll(async () => {
  repoDir = createTempRepo();
  modifyFile(repoDir, 'README.md', '# Test Repo\n\nGeänderte Zeile\n');
  const repo = await importRepo(repoDir);
  repoId = repo.id;
  await setActiveRepo(repoId);
});

test.afterAll(() => {
  removeTempRepo(repoDir);
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  // Click on "Änderungen" nav item
  const navItems = page.locator('.nav-item');
  await navItems.filter({ hasText: 'Änderungen' }).first().click();
  await page.locator('changes-view').waitFor();
});

test('shows modified file in unstaged section', async ({ page }) => {
  const changesView = page.locator('changes-view');
  await expect(changesView.locator('.file-entry')).not.toHaveCount(0);

  const fileEntry = changesView.locator('.file-entry').filter({ hasText: 'README.md' });
  await expect(fileEntry).toBeVisible();
});

test('shows diff when clicking a modified file', async ({ page }) => {
  const changesView = page.locator('changes-view');
  const fileEntry = changesView.locator('.file-entry').filter({ hasText: 'README.md' });
  await fileEntry.first().click();

  const diffContent = changesView.locator('.diff-content');
  await expect(diffContent).toBeVisible({ timeout: 5000 });

  const addedLine = changesView.locator('.diff-line.added');
  await expect(addedLine).not.toHaveCount(0);
});

test('stages a file via ↑ button', async ({ page }) => {
  const changesView = page.locator('changes-view');
  const unstagedEntry = changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first();
  const stageBtn = unstagedEntry.locator('.action-btn');
  await stageBtn.click();

  // File should appear in staged section (first section-header = "Staged")
  const stagedSection = changesView.locator('.section').first();
  await expect(stagedSection.locator('.file-entry').filter({ hasText: 'README.md' })).toBeVisible({ timeout: 5000 });
});

test('unstages a file via ↓ button', async ({ page }) => {
  const changesView = page.locator('changes-view');

  // First stage the file
  const unstagedEntry = changesView.locator('.section').last().locator('.file-entry').filter({ hasText: 'README.md' });
  if (await unstagedEntry.count() > 0) {
    await unstagedEntry.first().locator('.action-btn').click();
  }

  // Now unstage it
  const stagedSection = changesView.locator('.section').first();
  const stagedEntry = stagedSection.locator('.file-entry').filter({ hasText: 'README.md' });
  await expect(stagedEntry).toBeVisible({ timeout: 5000 });
  await stagedEntry.first().locator('.action-btn').click();

  // Should be back in unstaged
  const unstagedSection = changesView.locator('.section').last();
  await expect(unstagedSection.locator('.file-entry').filter({ hasText: 'README.md' })).toBeVisible({ timeout: 5000 });
});
