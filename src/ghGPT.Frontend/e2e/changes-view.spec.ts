import { execSync } from 'child_process';
import { test, expect } from '@playwright/test';
import { createTempRepo, modifyFile, removeTempRepo, importRepo, setActiveRepo, deleteRepo } from './helpers';

let repoDir = '';
let repoId = '';

// Second repo for switching test
let repoDir2 = '';
let repoId2 = '';

test.beforeAll(async () => {
  repoDir = createTempRepo();
  modifyFile(repoDir, 'README.md', '# Test Repo\n\nZeile drei\nZeile vier\nZeile fünf\nZeile sechs\nZeile sieben\n');
  execSync('git add README.md', { cwd: repoDir });
  execSync('git commit -m "add multi-line readme"', { cwd: repoDir });
  const repo = await importRepo(repoDir);
  repoId = repo.id;

  repoDir2 = createTempRepo();
  const repo2 = await importRepo(repoDir2);
  repoId2 = repo2.id;

  await setActiveRepo(repoId);
});

test.afterAll(async () => {
  await deleteRepo(repoId);
  removeTempRepo(repoDir);
  await deleteRepo(repoId2);
  removeTempRepo(repoDir2);
});

let modCounter = 0;

test.beforeEach(async ({ page }) => {
  modCounter++;
  await fetch(`http://localhost:5000/api/repos/${repoId}/unstage-all`, { method: 'POST' });
  modifyFile(repoDir, 'README.md',
    `# Test Repo\n\nZeile drei\nZeile vier\nZeile fünf GEÄNDERT ${modCounter}\nZeile sechs\nZeile sieben\n`);

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

test('diff shows line numbers for both removed and added lines', async ({ page }) => {
  const changesView = page.locator('changes-view');
  await changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first().click();
  await expect(changesView.locator('.diff-content')).toBeVisible({ timeout: 5000 });

  const removedLine = changesView.locator('.diff-line.removed');
  await expect(removedLine).toHaveCount(1);

  // Both number columns of the removed line must be non-empty
  const nums = removedLine.locator('.diff-line-num');
  const oldNum = await nums.nth(0).textContent();
  const newNum = await nums.nth(1).textContent();
  expect(oldNum?.trim()).not.toBe('');
  expect(newNum?.trim()).toBe(''); // new-side is blank for removed lines
});

test('commit button is disabled when nothing is staged', async ({ page }) => {
  const changesView = page.locator('changes-view');
  const commitBtn = changesView.locator('.commit-btn');
  await expect(commitBtn).toBeDisabled();
});

test('commit button is disabled when message is empty', async ({ page }) => {
  const changesView = page.locator('changes-view');

  // Stage the file
  await changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first().locator('.action-btn').click();
  await changesView.locator('.section-header').filter({ hasText: 'Staged (1)' }).waitFor({ timeout: 5000 });

  // Button still disabled — no message entered
  const commitBtn = changesView.locator('.commit-btn');
  await expect(commitBtn).toBeDisabled();
});

test('commit creates a new commit and clears staged files', async ({ page }) => {
  const changesView = page.locator('changes-view');

  // Stage the file
  await changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first().locator('.action-btn').click();
  await changesView.locator('.section-header').filter({ hasText: 'Staged (1)' }).waitFor({ timeout: 5000 });

  // Enter commit message
  await changesView.locator('.commit-input[type="text"]').fill('test: commit from e2e');

  // Commit
  await changesView.locator('.commit-btn').click();

  // After commit: staged section is empty, form is cleared
  await expect(changesView.locator('.section-header').filter({ hasText: 'Staged (0)' })).toBeVisible({ timeout: 5000 });
  await expect(changesView.locator('.commit-input[type="text"]')).toHaveValue('');
});

test('clears diff when switching to a different repository', async ({ page }) => {
  const changesView = page.locator('changes-view');

  // Open diff for README.md in repo 1
  await changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first().click();
  await expect(changesView.locator('.diff-content')).toBeVisible({ timeout: 5000 });

  // Switch to repo 2 (no changes) via sidebar click
  await page.locator('.repo-item').filter({ hasText: /ghgpt-test/ }).last().click();

  // Diff panel must no longer show the old diff content
  await expect(changesView.locator('.diff-content')).not.toBeVisible({ timeout: 3000 });
  await expect(changesView.locator('.diff-placeholder')).toBeVisible();
});
