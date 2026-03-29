import { execSync } from 'child_process';
import { test, expect } from '@playwright/test';
import { createTempRepo, modifyFile, removeTempRepo, importRepo, setActiveRepo, deleteRepo } from './helpers';

let repoDir = '';
let repoId = '';

test.beforeAll(async () => {
  repoDir = createTempRepo();

  modifyFile(repoDir, 'README.md', '# Repo\n\nErster Stand\n');
  execSync('git add README.md', { cwd: repoDir });
  execSync('git commit -m "feat: first history commit"', { cwd: repoDir });

  modifyFile(repoDir, 'README.md', '# Repo\n\nZweiter Stand\n');
  execSync('git add README.md', { cwd: repoDir });
  execSync('git commit -m "feat: second history commit"', { cwd: repoDir });

  const repo = await importRepo(repoDir);
  repoId = repo.id;
  await setActiveRepo(repoId);
});

test.afterAll(async () => {
  await deleteRepo(repoId);
  removeTempRepo(repoDir);
});

test('shows commit history and commit detail diff', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();

  await page.locator('.nav-item').filter({ hasText: 'History' }).first().click();
  const historyView = page.locator('history-view');
  await historyView.waitFor();

  await expect(historyView).toContainText('master');
  await expect(historyView).toContainText('feat: second history commit');

  await historyView.locator('.list-entry').filter({ hasText: 'feat: second history commit' }).first().click();
  await expect(historyView.locator('.detail-title')).toContainText('feat: second history commit');
  await expect(historyView.locator('.file-item').filter({ hasText: 'README.md' })).toBeVisible();
  await expect(historyView.locator('.diff-panel')).toContainText('+Zweiter Stand');
});
