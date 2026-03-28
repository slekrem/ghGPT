import { test, expect } from '@playwright/test';

test('app-shell renders sidebar and toolbar', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('app-shell')).toBeAttached();
  await expect(page.getByText('ghGPT')).toBeVisible();
  await expect(page.getByText('Änderungen')).toBeVisible();
  await expect(page.getByText('History')).toBeVisible();
  await expect(page.getByText('Branches')).toBeVisible();
  await expect(page.getByText('Pull Requests')).toBeVisible();
});

test('navigation switches active view', async ({ page }) => {
  await page.goto('/');

  await page.getByText('History').click();
  await expect(page.locator('.placeholder').filter({ hasText: 'geöffnet' })).toBeVisible();
});
