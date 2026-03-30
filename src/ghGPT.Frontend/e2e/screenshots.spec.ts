import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { createTempRepo, createTempRepoWithRemote, modifyFile, removeTempRepo, importRepo, setActiveRepo, deleteRepo, unstageAll } from './helpers';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'e2e', 'screenshots');

let repoDir = '';
let repoId = '';

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  repoDir = createTempRepo();

  const multiLine =
    '# Test Repo\n\nZeile drei\nZeile vier\nZeile fünf\nZeile sechs\nZeile sieben\n';
  modifyFile(repoDir, 'README.md', multiLine);
  modifyFile(repoDir, 'partial-staging.txt', '// feature module\n');
  execSync('git add README.md partial-staging.txt', { cwd: repoDir });
  execSync('git commit -m "add multi-line readme and partial-staging.txt"', { cwd: repoDir });

  modifyFile(repoDir, 'README.md',
    '# Test Repo\n\nZeile drei\nZeile vier\nZeile fünf GEÄNDERT\nZeile sechs\nZeile sieben\n');
  modifyFile(repoDir, 'new-file.txt', 'new file content\n');
  fs.unlinkSync(path.join(repoDir, 'main.ts'));

  execSync('git branch feature/example', { cwd: repoDir });

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
  await page.reload();
  await page.locator('app-shell').waitFor();
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
  await unstageAll(repoId);
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();
  await page.locator('changes-view').waitFor();
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-changes-unstaged.png'), fullPage: true });
});

test('07 - Changes View: Diff einer Datei', async ({ page }) => {
  await unstageAll(repoId);
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

test('08 - Changes View: Datei gecheckt', async ({ page }) => {
  await unstageAll(repoId);
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();
  await page.locator('changes-view').waitFor();
  await page.locator('changes-view').locator('.file-entry').filter({ hasText: 'README.md' }).first()
    .locator('input[type="checkbox"]').click();
  await expect(page.locator('changes-view').locator('.commit-btn')).toContainText('Commit (1', { timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-changes-staged.png'), fullPage: true });
});

test('09 - Changes View: Commit-Formular mit gemischten Änderungen', async ({ page }) => {
  await unstageAll(repoId);
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();
  await page.locator('changes-view').waitFor();

  await page.locator('changes-view').locator('.list-header input[type="checkbox"]').click();
  await expect(page.locator('changes-view').locator('.commit-btn')).toContainText(/Commit \([1-9]/, { timeout: 5000 });

  await page.locator('changes-view').locator('.commit-input[type="text"]').fill('feat: neue Funktion');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-commit-form.png'), fullPage: true });
});

test('10 - Branches View: Branch-Übersicht', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Branches' }).first().click();
  await page.locator('branches-view').waitFor();
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-branches-overview.png'), fullPage: true });
});

test('11 - Branches View: Neuer Branch Dialog', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Branches' }).first().click();
  await page.locator('branches-view').waitFor();
  await page.locator('branches-view .btn-primary').filter({ hasText: 'Neuer Branch' }).click();
  await page.locator('branches-view .dialog').waitFor();
  await page.locator('branches-view .dialog input[type="text"]').fill('feature/mein-feature');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-branches-new-dialog.png'), fullPage: true });
});

test('12 - Branches View: Hover auf Branch-Zeile', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Branches' }).first().click();
  await page.locator('branches-view').waitFor();
  await page.locator('branches-view .branch-row:not(.head)').first().hover();
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-branches-row-hover.png'), fullPage: true });
});

// --- Remote Branches ---

let remoteLocalDir = '';
let remoteRepoDir = '';
let remoteRepoId = '';

test.beforeAll(async () => {
  ({ localDir: remoteLocalDir, remoteDir: remoteRepoDir } = createTempRepoWithRemote());
  const repo = await importRepo(remoteLocalDir);
  remoteRepoId = repo.id;
});

test.afterAll(async () => {
  await deleteRepo(remoteRepoId);
  removeTempRepo(remoteLocalDir);
  removeTempRepo(remoteRepoDir);
});

test('13 - Branches View: Übersicht mit Remote-Branches', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), remoteRepoId);
  await setActiveRepo(remoteRepoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Branches' }).first().click();
  await page.locator('branches-view').waitFor();
  await expect(page.locator('branches-view .section-title').filter({ hasText: /Remote/i })).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13-branches-remote-overview.png'), fullPage: true });
});

test('14 - Branches View: Neuer Branch Dialog mit Remote als Basis', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), remoteRepoId);
  await setActiveRepo(remoteRepoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Branches' }).first().click();
  await page.locator('branches-view').waitFor();
  await page.locator('branches-view .btn-primary').filter({ hasText: 'Neuer Branch' }).click();
  await page.locator('branches-view .dialog').waitFor();
  await page.locator('branches-view .dialog input[type="text"]').fill('feature/from-remote');
  await page.locator('branches-view .dialog select').selectOption({ label: 'origin/feature/remote-branch' });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14-branches-remote-new-dialog.png'), fullPage: true });
});

test('15 - Branches View: Hover auf Remote-Branch-Zeile', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), remoteRepoId);
  await setActiveRepo(remoteRepoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Branches' }).first().click();
  await page.locator('branches-view').waitFor();
  await page.locator('branches-view .branch-row').filter({ hasText: 'origin/feature/remote-branch' }).hover();
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15-branches-remote-row-hover.png'), fullPage: true });
});

// --- Partial Staging ---

test('16 - Changes View: Partial Staging - Zeilen selektiert', async ({ page }) => {
  await unstageAll(repoId);
  modifyFile(repoDir, 'partial-staging.txt',
    '// feature module\nexport function featureA() {}\nexport function featureB() {}\nexport function featureC() {}\n');

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await setActiveRepo(repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();
  await page.locator('changes-view').waitFor();

  await page.locator('changes-view .file-entry').filter({ hasText: 'partial-staging.txt' }).first().click();
  await page.locator('changes-view .diff-content').waitFor({ timeout: 5000 });

  await page.locator('changes-view .diff-line.added').nth(0).click();
  await page.locator('changes-view .diff-line.added').nth(1).click({ modifiers: ['Shift'] });
  await expect(page.locator('changes-view .stage-lines-btn')).toBeVisible({ timeout: 3000 });

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '16-partial-staging-lines-selected.png'), fullPage: true });
});

test('17 - Changes View: Partial Staging - Nach dem Stagen', async ({ page }) => {
  await unstageAll(repoId);
  modifyFile(repoDir, 'partial-staging.txt',
    '// feature module\nexport function featureA() {}\nexport function featureB() {}\nexport function featureC() {}\n');

  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await setActiveRepo(repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Änderungen' }).first().click();
  await page.locator('changes-view').waitFor();

  await page.locator('changes-view .file-entry').filter({ hasText: 'partial-staging.txt' }).first().click();
  await page.locator('changes-view .diff-content').waitFor({ timeout: 5000 });

  await page.locator('changes-view .diff-line.added').nth(0).click();
  await page.locator('changes-view .diff-line.added').nth(1).click({ modifiers: ['Shift'] });
  await page.locator('changes-view .stage-lines-btn').click();

  await expect(page.locator('changes-view .stage-lines-btn')).not.toBeVisible({ timeout: 5000 });
  await page.locator('changes-view .diff-content').waitFor({ timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '17-partial-staging-after-stage.png'), fullPage: true });
});
