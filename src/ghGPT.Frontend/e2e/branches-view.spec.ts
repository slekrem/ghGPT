import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { createTempRepo, modifyFile, removeTempRepo, importRepo, setActiveRepo, deleteRepo } from './helpers';

let repoDir = '';
let repoId = '';

function checkoutDefaultBranch(dir: string) {
  try { execSync('git checkout master', { cwd: dir, stdio: 'pipe' }); }
  catch { execSync('git checkout main', { cwd: dir, stdio: 'pipe' }); }
}

test.beforeAll(async () => {
  repoDir = createTempRepo();

  execSync('git checkout -b develop', { cwd: repoDir });
  modifyFile(repoDir, 'feature.ts', 'export const x = 1;\n');
  execSync('git add feature.ts', { cwd: repoDir });
  execSync('git commit -m "feat: develop commit"', { cwd: repoDir });

  checkoutDefaultBranch(repoDir);

  const repo = await importRepo(repoDir);
  repoId = repo.id;
  await setActiveRepo(repoId);
});

test.afterAll(async () => {
  await deleteRepo(repoId);
  removeTempRepo(repoDir);
});

async function gotoBranchesView(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
  await page.locator('.nav-item').filter({ hasText: 'Branches' }).first().click();
  await page.locator('branches-view').waitFor();
}

// --- Toolbar ---

test('toolbar branch button navigates to branches view', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();

  await page.locator('.toolbar-branch').click();
  await page.locator('branches-view').waitFor();
  await expect(page.locator('branches-view')).toBeVisible();
});

test('toolbar branch button shows current branch name', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();

  await expect(page.locator('.toolbar-branch')).toContainText(/master|main/);
});

// --- Anzeige ---

test('shows branches section title in toolbar', async ({ page }) => {
  await gotoBranchesView(page);
  await expect(page.locator('branches-view .toolbar-title')).toContainText('Branches');
});

test('shows local branches', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');
  await expect(view.locator('.branch-row').filter({ hasText: /master|main/ })).toBeVisible();
  await expect(view.locator('.branch-row').filter({ hasText: 'develop' })).toBeVisible();
});

test('marks current branch with HEAD badge', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');
  const headRow = view.locator('.branch-row.head');
  await expect(headRow).toBeVisible();
  await expect(headRow.locator('.head-badge')).toBeVisible();
  await expect(headRow.locator('.head-badge')).toContainText('HEAD');
});

test('shows section title for local branches', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');
  await expect(view.locator('.section-title').filter({ hasText: /Lokale Branches/i })).toBeVisible();
});

// --- Neuer Branch Dialog ---

test('opens new branch dialog on button click', async ({ page }) => {
  await gotoBranchesView(page);
  await page.locator('branches-view .btn-primary').filter({ hasText: 'Neuer Branch' }).click();
  const dialog = page.locator('branches-view .dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.dialog-title')).toContainText('Neuen Branch erstellen');
});

test('closes dialog on Abbrechen click', async ({ page }) => {
  await gotoBranchesView(page);
  await page.locator('branches-view .btn-primary').filter({ hasText: 'Neuer Branch' }).click();
  await expect(page.locator('branches-view .dialog')).toBeVisible();
  await page.locator('branches-view .dialog .btn').filter({ hasText: 'Abbrechen' }).click();
  await expect(page.locator('branches-view .dialog')).not.toBeVisible();
});

test('shows validation error when creating branch with empty name', async ({ page }) => {
  await gotoBranchesView(page);
  await page.locator('branches-view .btn-primary').filter({ hasText: 'Neuer Branch' }).click();
  const dialog = page.locator('branches-view .dialog');
  await dialog.locator('.btn-primary').filter({ hasText: 'Erstellen' }).click();
  await expect(dialog.locator('.error-msg')).toBeVisible();
});

test('creates a new branch and shows it in the list', async ({ page }) => {
  await gotoBranchesView(page);
  const branchName = 'feature/e2e-create';

  await page.locator('branches-view .btn-primary').filter({ hasText: 'Neuer Branch' }).click();
  const dialog = page.locator('branches-view .dialog');
  await dialog.locator('input[type="text"]').fill(branchName);
  await dialog.locator('.btn-primary').filter({ hasText: 'Erstellen' }).click();

  await expect(page.locator('branches-view .dialog')).not.toBeVisible({ timeout: 5000 });
  await expect(page.locator('branches-view .branch-row').filter({ hasText: branchName })).toBeVisible();
});

test('new branch becomes HEAD after creation', async ({ page }) => {
  await gotoBranchesView(page);
  const branchName = 'feature/e2e-head-check';

  await page.locator('branches-view .btn-primary').filter({ hasText: 'Neuer Branch' }).click();
  const dialog = page.locator('branches-view .dialog');
  await dialog.locator('input[type="text"]').fill(branchName);
  await dialog.locator('.btn-primary').filter({ hasText: 'Erstellen' }).click();

  await expect(page.locator('branches-view .dialog')).not.toBeVisible({ timeout: 5000 });

  const newRow = page.locator('branches-view .branch-row').filter({ hasText: branchName });
  await expect(newRow.locator('.head-badge')).toBeVisible();

  checkoutDefaultBranch(repoDir);
});

test('dialog populates base-branch select with local branches', async ({ page }) => {
  await gotoBranchesView(page);
  await page.locator('branches-view .btn-primary').filter({ hasText: 'Neuer Branch' }).click();
  const select = page.locator('branches-view .dialog select');
  await expect(select).toBeVisible();
  const options = await select.locator('option').allTextContents();
  expect(options.length).toBeGreaterThan(0);
});

// --- Checkout ---

test('checkout button is visible on hover for non-HEAD local branches', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');

  const nonHeadRow = view.locator('.branch-row:not(.head)').filter({ hasText: 'develop' }).first();
  await nonHeadRow.hover();
  await expect(nonHeadRow.locator('.action-btn', { hasText: 'Checkout' })).toBeVisible();
});

test('checkout switches to target branch', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');

  const developRow = view.locator('.branch-row:not(.head)').filter({ hasText: 'develop' }).first();
  await developRow.hover();
  await developRow.locator('.action-btn', { hasText: 'Checkout' }).click();

  await expect(view.locator('.branch-row.head').filter({ hasText: 'develop' })).toBeVisible({ timeout: 5000 });
  await expect(view.locator('.branch-row.head').locator('.head-badge')).toBeVisible();

  checkoutDefaultBranch(repoDir);
});

test('shows alert when checking out with uncommitted changes', async ({ page }) => {
  modifyFile(repoDir, 'dirty.txt', 'uncommitted change\n');

  await gotoBranchesView(page);
  const view = page.locator('branches-view');

  let alertMessage = '';
  page.on('dialog', async (dialog) => {
    alertMessage = dialog.message();
    await dialog.accept();
  });

  const developRow = view.locator('.branch-row:not(.head)').filter({ hasText: 'develop' }).first();
  await developRow.hover();
  await developRow.locator('.action-btn', { hasText: 'Checkout' }).click();

  await page.waitForEvent('dialog', { timeout: 5000 });
  expect(alertMessage).toMatch(/uncommitted|changes|Änderungen/i);

  execSync('git checkout -- .', { cwd: repoDir });
  fs.rmSync(path.join(repoDir, 'dirty.txt'), { force: true });
});

// --- Branch löschen ---

test('delete button is visible on hover for non-HEAD branches', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');

  const nonHeadRow = view.locator('.branch-row:not(.head)').filter({ hasText: 'develop' }).first();
  await nonHeadRow.hover();
  await expect(nonHeadRow.locator('.action-btn.danger')).toBeVisible();
});

test('deletes a non-active branch', async ({ page }) => {
  execSync('git branch e2e-delete-me', { cwd: repoDir });

  await gotoBranchesView(page);
  const view = page.locator('branches-view');

  await expect(view.locator('.branch-row').filter({ hasText: 'e2e-delete-me' })).toBeVisible();

  page.on('dialog', (dialog) => dialog.accept());

  const row = view.locator('.branch-row:not(.head)').filter({ hasText: 'e2e-delete-me' }).first();
  await row.hover();
  await row.locator('.action-btn.danger').click();

  await expect(view.locator('.branch-row').filter({ hasText: 'e2e-delete-me' })).not.toBeVisible({ timeout: 5000 });
});

test('toolbar shows updated branch name after checkout', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');

  const developRow = view.locator('.branch-row:not(.head)').filter({ hasText: 'develop' }).first();
  await developRow.hover();
  await developRow.locator('.action-btn', { hasText: 'Checkout' }).click();

  await expect(view.locator('.branch-row.head').filter({ hasText: 'develop' })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.toolbar-branch')).toContainText('develop', { timeout: 5000 });

  checkoutDefaultBranch(repoDir);
});

test('active branch has no delete button', async ({ page }) => {
  await gotoBranchesView(page);
  const view = page.locator('branches-view');

  const headRow = view.locator('.branch-row.head').first();
  await headRow.hover();

  await expect(headRow.locator('.action-btn.danger')).not.toBeVisible();
});
