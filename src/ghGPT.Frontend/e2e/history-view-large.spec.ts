import { execSync } from 'child_process';
import { test, expect } from '@playwright/test';
import { createTempRepo, modifyFile, removeTempRepo, importRepo, setActiveRepo, deleteRepo } from './helpers';

let repoDir = '';
let repoId = '';

test.beforeAll(async () => {
  test.setTimeout(120_000);
  repoDir = createTempRepo();

  for (let i = 1; i <= 105; i++) {
    modifyFile(repoDir, 'README.md', `# Repo\n\nCommit ${i}\n`);
    execSync('git add README.md', { cwd: repoDir });
    execSync(`git commit -m "perf: commit ${i}"`, { cwd: repoDir });
  }

  const repo = await importRepo(repoDir);
  repoId = repo.id;
  await setActiveRepo(repoId);
});

test.afterAll(async () => {
  await deleteRepo(repoId);
  removeTempRepo(repoDir);
});

test('loads additional commit pages while keeping the rendered DOM small', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();

  await page.locator('.nav-item').filter({ hasText: 'History' }).first().click();
  const historyView = page.locator('history-view');
  await historyView.waitFor();

  await expect(historyView).toContainText('perf: commit 105');
  await expect(historyView.locator('.footer-hint')).toContainText('Weitere Commits', { timeout: 5000 });

  const initialRenderedCount = await historyView.locator('.list-entry').count();
  expect(initialRenderedCount).toBeLessThan(40);

  const listScroll = historyView.locator('.list-scroll');
  await listScroll.evaluate((element: HTMLElement) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect(historyView.locator('.footer-hint')).toContainText('106 Commits geladen', { timeout: 5000 });
  await expect(historyView).toContainText('perf: commit 1', { timeout: 5000 });

  const renderedCountAfterPaging = await historyView.locator('.list-entry').count();
  expect(renderedCountAfterPaging).toBeLessThan(50);
});
