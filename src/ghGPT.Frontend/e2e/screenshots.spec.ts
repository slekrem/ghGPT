import { test } from '@playwright/test';
import { execSync } from 'child_process';
import { createTempRepo, modifyFile, removeTempRepo, importRepo, setActiveRepo, deleteRepo } from './helpers';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'e2e', 'screenshots');

let repoDir = '';
let repoId = '';

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  repoDir = createTempRepo();

  // Create a multi-line file and commit it, then modify a line in the middle
  // so the hunk starts at line > 1 — this validates correct line numbering
  const multiLine =
    '# Test Repo\n\nZeile drei\nZeile vier\nZeile fünf\nZeile sechs\nZeile sieben\n';
  modifyFile(repoDir, 'README.md', multiLine);
  execSync('git add README.md', { cwd: repoDir });
  execSync('git commit -m "add multi-line readme"', { cwd: repoDir });

  // Now modify only line 5 (unstaged)
  modifyFile(repoDir, 'README.md',
    '# Test Repo\n\nZeile drei\nZeile vier\nZeile fünf GEÄNDERT\nZeile sechs\nZeile sieben\n');

  const repo = await importRepo(repoDir);
  repoId = repo.id;
  await setActiveRepo(repoId);
});

test.afterAll(async () => {
  await deleteRepo(repoId);
  removeTempRepo(repoDir);
});

test('01 - App startet ohne aktives Repo', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  // Reload after clear so app starts fresh without active repo
  await page.reload();
  await page.locator('app-shell').waitFor();
  // Wait briefly for repos to load and check if placeholder shows
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-no-repo.png'), fullPage: true });
});

test('02 - Sidebar mit Repositories', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-sidebar-with-repos.png'), fullPage: true });
});

test('03 - Repo-Dialog: Clone Tab', async ({ page }) => {
  await page.goto('/');
  await page.locator('app-shell').waitFor();
  await page.locator('.add-btn').first().click();
  await page.locator('repo-dialog').waitFor({ state: 'attached' });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-dialog-clone.png'), fullPage: true });
});

test('04 - Repo-Dialog: Import Tab', async ({ page }) => {
  await page.goto('/');
  await page.locator('app-shell').waitFor();
  await page.locator('.add-btn').first().click();
  await page.locator('repo-dialog').waitFor({ state: 'attached' });
  await page.locator('repo-dialog').locator('button', { hasText: 'Importieren' }).first().click();
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-dialog-import.png'), fullPage: true });
});

test('05 - Repo-Dialog: Erstellen Tab', async ({ page }) => {
  await page.goto('/');
  await page.locator('app-shell').waitFor();
  await page.locator('.add-btn').first().click();
  await page.locator('repo-dialog').waitFor({ state: 'attached' });
  await page.locator('repo-dialog').locator('button', { hasText: 'Erstellen' }).first().click();
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-dialog-create.png'), fullPage: true });
});

test('06 - Changes View: Unstaged Änderungen', async ({ page }) => {
  await fetch(`http://localhost:5000/api/repos/${repoId}/unstage-all`, { method: 'POST' });
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();
  await page.locator('changes-view').waitFor();
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-changes-unstaged.png'), fullPage: true });
});

test('07 - Changes View: Diff einer Datei', async ({ page }) => {
  await fetch(`http://localhost:5000/api/repos/${repoId}/unstage-all`, { method: 'POST' });
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();
  await page.locator('changes-view').waitFor();
  await page.locator('changes-view').locator('.file-entry').filter({ hasText: 'README.md' }).first().click();
  await page.locator('changes-view').locator('.diff-content').waitFor({ timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-changes-diff.png'), fullPage: true });
});

test('08 - Changes View: Datei gestaget', async ({ page }) => {
  await fetch(`http://localhost:5000/api/repos/${repoId}/unstage-all`, { method: 'POST' });
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();
  await page.locator('changes-view').waitFor();
  await page.locator('changes-view').locator('.file-entry').filter({ hasText: 'README.md' }).first().locator('.action-btn').click();
  await page.locator('changes-view').locator('.section-header').filter({ hasText: 'Staged (1)' }).waitFor({ timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-changes-staged.png'), fullPage: true });
});

test('09 - Changes View: Commit-Formular', async ({ page }) => {
  await fetch(`http://localhost:5000/api/repos/${repoId}/unstage-all`, { method: 'POST' });
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();
  await page.locator('changes-view').waitFor();
  await page.locator('changes-view').locator('.file-entry').filter({ hasText: 'README.md' }).first().locator('.action-btn').click();
  await page.locator('changes-view').locator('.section-header').filter({ hasText: 'Staged (1)' }).waitFor({ timeout: 5000 });
  await page.locator('changes-view').locator('.commit-input[type="text"]').fill('feat: neue Funktion');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-commit-form.png'), fullPage: true });
});
