import { execSync } from 'child_process';
import { test, expect } from '@playwright/test';
import { createTempRepo, modifyFile, removeTempRepo, importRepo, setActiveRepo, deleteRepo, unstageAll } from './helpers';

let repoDir = '';
let repoId = '';

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
  await unstageAll(repoId);
  modifyFile(repoDir, 'README.md',
    `# Test Repo\n\nZeile drei\nZeile vier\nZeile fünf GEÄNDERT ${modCounter}\nZeile sechs\nZeile sieben\n`);

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();
  await page.locator('changes-view').waitFor();
});

test('shows modified file in file list', async ({ page }) => {
  const changesView = page.locator('changes-view');
  await expect(changesView.locator('.file-entry').filter({ hasText: 'README.md' })).toBeVisible();
  await expect(changesView.locator('.list-header').filter({ hasText: 'Änderungen' })).toBeVisible();
});

test('shows diff when clicking a modified file', async ({ page }) => {
  const changesView = page.locator('changes-view');
  await changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first().click();
  await expect(changesView.locator('.diff-content')).toBeVisible({ timeout: 5000 });
  await expect(changesView.locator('.diff-line.added')).not.toHaveCount(0);
});

test('shows diff when clicking a new untracked file', async ({ page }) => {
  const fileName = `new-file-${modCounter}.txt`;
  modifyFile(repoDir, fileName, `new file content ${modCounter}\n`);

  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();

  const changesView = page.locator('changes-view');
  await changesView.waitFor();
  await expect(changesView.locator('.file-entry').filter({ hasText: fileName })).toBeVisible({ timeout: 5000 });

  await changesView.locator('.file-entry').filter({ hasText: fileName }).first().click();
  await expect(changesView.locator('.diff-content')).toBeVisible({ timeout: 5000 });
  await expect(changesView.locator('.diff-line.added')).not.toHaveCount(0);
  await expect(changesView.locator('.diff-line-content').filter({ hasText: `+new file content ${modCounter}` })).toBeVisible();
});

test('stages a file via checkbox', async ({ page }) => {
  const changesView = page.locator('changes-view');
  const entry = changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first();
  const checkbox = entry.locator('input[type="checkbox"]');

  await expect(checkbox).not.toBeChecked();
  await checkbox.click();
  await expect(checkbox).toBeChecked({ timeout: 5000 });
  await expect(changesView.locator('.commit-btn')).toContainText('Commit (1');
});

test('unstages a file via checkbox', async ({ page }) => {
  const changesView = page.locator('changes-view');
  const entry = changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first();
  const checkbox = entry.locator('input[type="checkbox"]');
  const commitButton = changesView.locator('.commit-btn');

  await checkbox.click();
  await expect(checkbox).toBeChecked({ timeout: 5000 });
  await expect(commitButton).toContainText('Commit (1', { timeout: 5000 });

  await checkbox.click();
  await expect(checkbox).not.toBeChecked({ timeout: 5000 });
  await expect(commitButton).toContainText('Commit (0', { timeout: 5000 });
});

test('diff shows line numbers for both removed and added lines', async ({ page }) => {
  const changesView = page.locator('changes-view');
  await changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first().click();
  await expect(changesView.locator('.diff-content')).toBeVisible({ timeout: 5000 });

  const removedLine = changesView.locator('.diff-line.removed');
  await expect(removedLine).toHaveCount(1);

  const nums = removedLine.locator('.diff-line-num');
  const oldNum = await nums.nth(0).textContent();
  const newNum = await nums.nth(1).textContent();
  expect(oldNum?.trim()).not.toBe('');
  expect(newNum?.trim()).toBe('');
});

test('commit button is disabled when nothing is staged', async ({ page }) => {
  const changesView = page.locator('changes-view');
  await expect(changesView.locator('.commit-btn')).toBeDisabled();
});

test('commit button is disabled when message is empty', async ({ page }) => {
  const changesView = page.locator('changes-view');
  const entry = changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first();
  await entry.locator('input[type="checkbox"]').click();
  await expect(changesView.locator('.commit-btn')).toContainText('Commit (1');
  await expect(changesView.locator('.commit-btn')).toBeDisabled();
});

test('commit creates a new commit and clears staged files', async ({ page }) => {
  const changesView = page.locator('changes-view');

  await changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first()
    .locator('input[type="checkbox"]').click();
  await expect(changesView.locator('.commit-btn')).toContainText('Commit (1');

  await changesView.locator('.commit-input[type="text"]').fill('test: commit from e2e');
  await changesView.locator('.commit-btn').click();

  await expect(changesView.locator('.commit-btn')).toContainText('Commit (0', { timeout: 5000 });
  await expect(changesView.locator('.commit-input[type="text"]')).toHaveValue('');
});

test('commit appears in history after creating it', async ({ page }) => {
  const changesView = page.locator('changes-view');
  const commitTitle = `test: history commit ${modCounter}`;

  await changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first()
    .locator('input[type="checkbox"]').click();
  await expect(changesView.locator('.commit-btn')).toContainText('Commit (1');

  await changesView.locator('.commit-input[type="text"]').fill(commitTitle);
  await changesView.locator('.commit-btn').click();
  await expect(changesView.locator('.commit-btn')).toContainText('Commit (0', { timeout: 5000 });

  await page.locator('.nav-item').filter({ hasText: 'History' }).first().click();
  const historyView = page.locator('history-view');
  await historyView.waitFor();
  await expect(historyView).toContainText(commitTitle, { timeout: 5000 });
});

test('commit works when only deleted files are staged', async ({ page }) => {
  const changesView = page.locator('changes-view');
  const { execSync: exec } = await import('child_process');
  exec(`del /f "${repoDir}\\main.ts"`, { shell: 'cmd.exe' });

  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();
  await page.locator('changes-view').waitFor();

  await changesView.locator('.file-entry').filter({ hasText: 'main.ts' }).first()
    .locator('input[type="checkbox"]').click();
  await expect(changesView.locator('.commit-btn')).toContainText('Commit (1', { timeout: 5000 });

  await changesView.locator('.commit-input[type="text"]').fill('chore: remove main.ts');
  await expect(changesView.locator('.commit-btn')).not.toBeDisabled();
  await changesView.locator('.commit-btn').click();
  await expect(changesView.locator('.commit-btn')).toContainText('Commit (0', { timeout: 5000 });
});

test('diff stays visible after toggling checkbox', async ({ page }) => {
  const changesView = page.locator('changes-view');

  await changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first().click();
  await expect(changesView.locator('.diff-content')).toBeVisible({ timeout: 5000 });

  await changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first()
    .locator('input[type="checkbox"]').click();
  await expect(changesView.locator('.diff-content')).toBeVisible({ timeout: 5000 });

  await changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first()
    .locator('input[type="checkbox"]').click();
  await expect(changesView.locator('.diff-content')).toBeVisible({ timeout: 5000 });
});

test('clears diff when switching to a different repository', async ({ page }) => {
  const changesView = page.locator('changes-view');

  await changesView.locator('.file-entry').filter({ hasText: 'README.md' }).first().click();
  await expect(changesView.locator('.diff-content')).toBeVisible({ timeout: 5000 });

  await page.locator('.repo-item').filter({ hasText: /ghgpt-test/ }).last().click();

  await expect(changesView.locator('.diff-content')).not.toBeVisible({ timeout: 3000 });
  await expect(changesView.locator('.diff-placeholder')).toBeVisible();
});

test.describe('partial staging', () => {
  test.beforeAll(async () => {
    modifyFile(repoDir, 'partial.txt', 'Zeile A\nZeile B\nZeile C\n');
    execSync('git add partial.txt', { cwd: repoDir });
    execSync('git commit -m "add partial.txt"', { cwd: repoDir });
  });

  test.beforeEach(async ({ page }) => {
    // outer beforeEach already navigated; modify partial.txt and reload
    modifyFile(repoDir, 'partial.txt', 'Zeile A\nZeile NEU_1\nZeile B\nZeile NEU_2\nZeile C\n');
    await page.reload();
    await page.locator('app-shell').waitFor();
    await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();
    await page.locator('changes-view').waitFor();
    await page.locator('changes-view .file-entry').filter({ hasText: 'partial.txt' }).first().click();
    await expect(page.locator('changes-view .diff-content')).toBeVisible({ timeout: 5000 });
  });

  test('checking one line stages it and keeps other line checkboxes visible', async ({ page }) => {
    const changesView = page.locator('changes-view');
    const lineChecks = changesView.locator('.diff-line.added .diff-line-check input');

    await expect(lineChecks).toHaveCount(2);
    await expect(lineChecks.nth(0)).not.toBeChecked();
    await expect(lineChecks.nth(1)).not.toBeChecked();

    await lineChecks.nth(0).click();

    await expect(changesView.locator('.diff-content')).toBeVisible({ timeout: 5000 });
    await expect(lineChecks).toHaveCount(2);
    await expect(lineChecks.nth(0)).toBeChecked();
    await expect(lineChecks.nth(1)).not.toBeChecked();
    await expect(changesView.locator('.commit-btn')).toContainText('Commit (1', { timeout: 5000 });
  });

  test('checking a second line after the first succeeds without losing the diff', async ({ page }) => {
    const changesView = page.locator('changes-view');
    const lineChecks = changesView.locator('.diff-line.added .diff-line-check input');

    await lineChecks.nth(0).click();
    await expect(lineChecks.nth(0)).toBeChecked({ timeout: 5000 });

    await lineChecks.nth(1).click();

    await expect(changesView.locator('.diff-content')).toBeVisible({ timeout: 5000 });
    await expect(lineChecks).toHaveCount(2);
    await expect(lineChecks.nth(0)).toBeChecked();
    await expect(lineChecks.nth(1)).toBeChecked();
  });

  test('unchecking a staged line unstages only that line in the same diff view', async ({ page }) => {
    const changesView = page.locator('changes-view');
    const lineChecks = changesView.locator('.diff-line.added .diff-line-check input');

    await lineChecks.nth(0).click();
    await lineChecks.nth(1).click();
    await expect(lineChecks.nth(0)).toBeChecked({ timeout: 5000 });
    await expect(lineChecks.nth(1)).toBeChecked({ timeout: 5000 });

    await lineChecks.nth(0).click();

    await expect(changesView.locator('.diff-content')).toBeVisible({ timeout: 5000 });
    await expect(lineChecks).toHaveCount(2);
    await expect(lineChecks.nth(0)).not.toBeChecked();
    await expect(lineChecks.nth(1)).toBeChecked();
  });

  test('context lines have no checkbox', async ({ page }) => {
    const changesView = page.locator('changes-view');
    const contextLine = changesView.locator('.diff-line:not(.added):not(.removed)').first();

    await expect(contextLine.locator('.diff-line-check input')).toHaveCount(0);
  });
});
