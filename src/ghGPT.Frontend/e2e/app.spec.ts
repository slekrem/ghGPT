import { test, expect } from '@playwright/test';

test.describe('App Shell', () => {
  test('loads and shows sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('app-shell')).toBeAttached();
  });

  test('repo dialog opens on + button click', async ({ page }) => {
    await page.goto('/');
    await page.locator('app-shell').waitFor();

    const addBtn = page.locator('.add-btn');
    await expect(addBtn).toBeVisible();
    await addBtn.first().click();
    await expect(page.locator('repo-dialog')).toBeAttached();
  });

  test('repo dialog closes on Abbrechen click', async ({ page }) => {
    await page.goto('/');
    await page.locator('app-shell').waitFor();

    await page.locator('.add-btn').first().click();
    await expect(page.locator('repo-dialog')).toBeAttached();

    await page.locator('repo-dialog').locator('button', { hasText: 'Abbrechen' }).click();
    await expect(page.locator('repo-dialog')).not.toBeAttached();
  });
});
