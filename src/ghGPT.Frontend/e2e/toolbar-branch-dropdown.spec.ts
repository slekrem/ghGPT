import { execSync } from 'child_process';
import { test, expect } from '@playwright/test';
import {
  createTempRepo,
  createTempRepoWithRemote,
  modifyFile,
  removeTempRepo,
  importRepo,
  setActiveRepo,
  deleteRepo,
} from './helpers';

let repoDir = '';
let repoId = '';

function checkoutDefaultBranch(dir: string) {
  try { execSync('git checkout master', { cwd: dir, stdio: 'pipe' }); }
  catch { execSync('git checkout main', { cwd: dir, stdio: 'pipe' }); }
}

test.beforeAll(async () => {
  repoDir = createTempRepo();
  execSync('git checkout -b feature/dropdown-test', { cwd: repoDir });
  checkoutDefaultBranch(repoDir);

  const repo = await importRepo(repoDir);
  repoId = repo.id;
  await setActiveRepo(repoId);
});

test.afterAll(async () => {
  await deleteRepo(repoId);
  removeTempRepo(repoDir);
});

async function gotoApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
}

// --- Dropdown öffnen / schließen ---

test('toolbar branch button opens dropdown', async ({ page }) => {
  await gotoApp(page);
  await page.locator('[data-testid="toolbar-branch"]').click();
  await expect(page.locator('[data-testid="branch-dropdown"]')).toBeVisible();
});

test('dropdown shows current branch with checkmark', async ({ page }) => {
  await gotoApp(page);
  await page.locator('[data-testid="toolbar-branch"]').click();
  const activeItem = page.locator('[data-testid="branch-dropdown-item"][data-active]');
  await expect(activeItem).toBeVisible();
  await expect(activeItem.locator('[data-testid="branch-check"]')).toContainText('✓');
});

test('dropdown shows local branches', async ({ page }) => {
  await gotoApp(page);
  await page.locator('[data-testid="toolbar-branch"]').click();
  await expect(page.locator('[data-testid="branch-dropdown-item"]').filter({ hasText: /master|main/ })).toBeVisible();
  await expect(page.locator('[data-testid="branch-dropdown-item"]').filter({ hasText: 'feature/dropdown-test' })).toBeVisible();
});

test('dropdown shows local branches section title', async ({ page }) => {
  await gotoApp(page);
  await page.locator('[data-testid="toolbar-branch"]').click();
  await expect(page.locator('[data-testid="branch-dropdown-section"]').filter({ hasText: /Lokale/i })).toBeVisible();
});

test('dropdown closes on second click of toolbar button', async ({ page }) => {
  await gotoApp(page);
  await page.locator('[data-testid="toolbar-branch"]').click();
  await expect(page.locator('[data-testid="branch-dropdown"]')).toBeVisible();
  await page.locator('[data-testid="toolbar-branch"]').click();
  await expect(page.locator('[data-testid="branch-dropdown"]')).not.toBeVisible();
});

test('dropdown closes on click outside', async ({ page }) => {
  await gotoApp(page);
  await page.locator('[data-testid="toolbar-branch"]').click();
  await expect(page.locator('[data-testid="branch-dropdown"]')).toBeVisible();
  await page.locator('[data-testid="sidebar"]').click();
  await expect(page.locator('[data-testid="branch-dropdown"]')).not.toBeVisible();
});

test('dropdown has "Branch verwalten" footer link', async ({ page }) => {
  await gotoApp(page);
  await page.locator('[data-testid="toolbar-branch"]').click();
  await expect(page.locator('[data-testid="branch-dropdown-footer"]')).toBeVisible();
  await expect(page.locator('[data-testid="branch-dropdown-footer"]')).toContainText('Branch verwalten');
});

test('"Branch verwalten" navigates to branches view', async ({ page }) => {
  await gotoApp(page);
  await page.locator('[data-testid="toolbar-branch"]').click();
  await page.locator('[data-testid="branch-dropdown-footer"]').click();
  await page.locator('branches-view').waitFor();
  await expect(page.locator('branches-view')).toBeVisible();
  await expect(page.locator('[data-testid="branch-dropdown"]')).not.toBeVisible();
});

// --- Checkout ---

test('clicking a non-active branch checks it out', async ({ page }) => {
  await gotoApp(page);
  await page.locator('[data-testid="toolbar-branch"]').click();

  const featureItem = page.locator('[data-testid="branch-dropdown-item"]:not([data-active])').filter({ hasText: 'feature/dropdown-test' });
  await featureItem.click();

  await expect(page.locator('[data-testid="toolbar-branch"]')).toContainText('feature/dropdown-test', { timeout: 5000 });
  await expect(page.locator('[data-testid="branch-dropdown"]')).not.toBeVisible();

  checkoutDefaultBranch(repoDir);
});

test('toolbar branch name updates after checkout', async ({ page }) => {
  await gotoApp(page);

  // checkout via dropdown zu feature-branch
  await page.locator('[data-testid="toolbar-branch"]').click();
  await page.locator('[data-testid="branch-dropdown-item"]:not([data-active])').filter({ hasText: 'feature/dropdown-test' }).click();
  await expect(page.locator('[data-testid="toolbar-branch"]')).toContainText('feature/dropdown-test', { timeout: 5000 });

  // checkout via dropdown zurück zu master/main
  await page.locator('[data-testid="toolbar-branch"]').click();
  await page.locator('[data-testid="branch-dropdown-item"]:not([data-active])').filter({ hasText: /master|main/ }).click();
  await expect(page.locator('[data-testid="toolbar-branch"]')).toContainText(/master|main/, { timeout: 5000 });
});

test('shows alert when checking out with uncommitted changes', async ({ page }) => {
  modifyFile(repoDir, 'dirty.txt', 'uncommitted\n');

  await gotoApp(page);
  await page.locator('[data-testid="toolbar-branch"]').click();

  let alertMessage = '';
  page.on('dialog', async (dialog) => {
    alertMessage = dialog.message();
    await dialog.accept();
  });

  await page.locator('[data-testid="branch-dropdown-item"]:not([data-active])').filter({ hasText: 'feature/dropdown-test' }).click();
  await page.waitForEvent('dialog', { timeout: 5000 });
  expect(alertMessage).toMatch(/uncommitted|Änderungen/i);

  execSync('git checkout -- .', { cwd: repoDir });
  const fs = await import('fs');
  const path = await import('path');
  fs.rmSync(path.join(repoDir, 'dirty.txt'), { force: true });
});

// --- Remote Branches ---

let remoteLocalDir = '';
let remoteDir = '';
let remoteRepoId = '';

test.beforeAll(async () => {
  ({ localDir: remoteLocalDir, remoteDir } = createTempRepoWithRemote());
  const repo = await importRepo(remoteLocalDir);
  remoteRepoId = repo.id;
});

test.afterAll(async () => {
  await deleteRepo(remoteRepoId);
  removeTempRepo(remoteLocalDir);
  removeTempRepo(remoteDir);
});

async function gotoAppRemote(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), remoteRepoId);
  await setActiveRepo(remoteRepoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
}

test('dropdown shows remote branches section', async ({ page }) => {
  await gotoAppRemote(page);
  await page.locator('[data-testid="toolbar-branch"]').click();
  await expect(page.locator('[data-testid="branch-dropdown-section"]').filter({ hasText: /Remote/i })).toBeVisible();
});

test('dropdown shows remote branch with cloud icon', async ({ page }) => {
  await gotoAppRemote(page);
  await page.locator('[data-testid="toolbar-branch"]').click();
  await expect(page.locator('[data-testid="branch-dropdown-item"]').filter({ hasText: /☁.*origin\/feature\/remote-branch/ })).toBeVisible();
});

test('checkout remote branch from dropdown creates local tracking branch', async ({ page }) => {
  await gotoAppRemote(page);
  await page.locator('[data-testid="toolbar-branch"]').click();

  await page.locator('[data-testid="branch-dropdown-item"]').filter({ hasText: /origin\/feature\/remote-branch/ }).click();

  await expect(page.locator('[data-testid="toolbar-branch"]')).toContainText('feature/remote-branch', { timeout: 5000 });

  try { execSync('git checkout master', { cwd: remoteLocalDir, stdio: 'pipe' }); }
  catch { execSync('git checkout main', { cwd: remoteLocalDir, stdio: 'pipe' }); }
  execSync('git branch -D feature/remote-branch', { cwd: remoteLocalDir, stdio: 'pipe' });
});
