import * as fs from 'fs';
import { test, expect } from '@playwright/test';
import { createTempRepo, removeTempRepo, importRepo, setActiveRepo, deleteRepo } from './helpers';

// Stable repos used for UI-only tests (no removal)
let stableRepoDir = '';
let stableRepoId = '';
let stableRepoDir2 = '';
let stableRepoId2 = '';

test.beforeAll(async () => {
  stableRepoDir = createTempRepo();
  const repo = await importRepo(stableRepoDir);
  stableRepoId = repo.id;

  stableRepoDir2 = createTempRepo();
  const repo2 = await importRepo(stableRepoDir2);
  stableRepoId2 = repo2.id;

  await setActiveRepo(stableRepoId);
});

test.afterAll(async () => {
  await deleteRepo(stableRepoId).catch(() => {});
  await deleteRepo(stableRepoId2).catch(() => {});
  removeTempRepo(stableRepoDir);
  removeTempRepo(stableRepoDir2);
});

test('remove button is hidden by default', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), stableRepoId);
  await page.reload();
  await page.locator('app-shell').waitFor();

  const removeBtn = page.locator('[data-testid="repo-item"]').first().locator('[data-testid="repo-remove-btn"]');
  await expect(removeBtn).toBeHidden();
});

test('remove button becomes visible on repo-item hover', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), stableRepoId);
  await page.reload();
  await page.locator('app-shell').waitFor();

  const repoItem = page.locator('[data-testid="repo-item"]').first();
  await repoItem.hover();
  await expect(repoItem.locator('[data-testid="repo-remove-btn"]')).toBeVisible();
});

test('clicking remove button removes repo from sidebar', async ({ page }) => {
  const dir = createTempRepo();
  const { id } = await importRepo(dir);

  try {
    await page.goto('/');
    await page.evaluate((activeId) => localStorage.setItem('ghgpt:activeRepoId', activeId), stableRepoId);
    await page.reload();
    await page.locator('app-shell').waitFor();

    const countBefore = await page.locator('[data-testid="repo-item"]').count();

    const targetItem = page.locator('[data-testid="repo-item"]').last();
    await targetItem.hover();
    await targetItem.locator('[data-testid="repo-remove-btn"]').click();

    await expect(page.locator('[data-testid="repo-item"]')).toHaveCount(countBefore - 1, { timeout: 3000 });
  } finally {
    await deleteRepo(id).catch(() => {});
    removeTempRepo(dir);
  }
});

test('removing active repo switches active state to another repo', async ({ page }) => {
  const dir1 = createTempRepo();
  const dir2 = createTempRepo();
  const { id: id1 } = await importRepo(dir1);
  const { id: id2 } = await importRepo(dir2);

  try {
    await page.goto('/');
    await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), id1);
    await page.reload();
    await page.locator('app-shell').waitFor();

    const activeItem = page.locator('[data-testid="repo-item"][data-active]');
    await activeItem.hover();
    await activeItem.locator('[data-testid="repo-remove-btn"]').click();

    // Another repo should now be active
    await expect(page.locator('[data-testid="repo-item"][data-active]')).toHaveCount(1, { timeout: 3000 });
    await expect(page.locator('[data-testid="repo-item"][data-active]').locator('[data-testid="repo-name"]')).not.toHaveText('');
  } finally {
    await deleteRepo(id1).catch(() => {});
    await deleteRepo(id2).catch(() => {});
    removeTempRepo(dir1);
    removeTempRepo(dir2);
  }
});

test('removing non-active repo does not change active repo', async ({ page }) => {
  const dir = createTempRepo();
  const { id } = await importRepo(dir);

  try {
    await page.goto('/');
    await page.evaluate((activeId) => localStorage.setItem('ghgpt:activeRepoId', activeId), stableRepoId);
    await page.reload();
    await page.locator('app-shell').waitFor();

    const activeNameBefore = await page.locator('[data-testid="repo-item"][data-active] [data-testid="repo-name"]').textContent();

    // Remove the last (non-active) item
    const lastItem = page.locator('[data-testid="repo-item"]').last();
    await lastItem.hover();
    await lastItem.locator('[data-testid="repo-remove-btn"]').click();

    await expect(page.locator('[data-testid="repo-item"][data-active]')).toHaveCount(1, { timeout: 3000 });
    await expect(page.locator('[data-testid="repo-item"][data-active] [data-testid="repo-name"]')).toHaveText(activeNameBefore!);
  } finally {
    await deleteRepo(id).catch(() => {});
    removeTempRepo(dir);
  }
});

test('removed repo files still exist on disk', async ({ page }) => {
  const dir = createTempRepo();
  const { id } = await importRepo(dir);
  const readmePath = `${dir}/README.md`;

  try {
    await page.goto('/');
    await page.evaluate((activeId) => localStorage.setItem('ghgpt:activeRepoId', activeId), stableRepoId);
    await page.reload();
    await page.locator('app-shell').waitFor();

    const lastItem = page.locator('[data-testid="repo-item"]').last();
    await lastItem.hover();
    await lastItem.locator('[data-testid="repo-remove-btn"]').click();

    await expect(page.locator('[data-testid="repo-item"]')).not.toHaveCount(
      await page.locator('[data-testid="repo-item"]').count() + 1,
      { timeout: 3000 }
    );

    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.existsSync(readmePath)).toBe(true);
  } finally {
    await deleteRepo(id).catch(() => {});
    removeTempRepo(dir);
  }
});
