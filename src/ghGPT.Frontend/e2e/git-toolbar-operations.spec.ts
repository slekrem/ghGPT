import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '@playwright/test';
import {
  createTempRepoWithRemotePeer,
  deleteRepo,
  importRepo,
  removeTempRepo,
  setActiveRepo,
} from './helpers';

type Scenario = {
  localDir: string;
  remoteDir: string;
  peerDir: string;
  defaultBranch: string;
  repoId: string;
};

let scenario: Scenario | null = null;

async function createScenario(): Promise<Scenario> {
  const repos = createTempRepoWithRemotePeer();
  const repo = await importRepo(repos.localDir);
  await setActiveRepo(repo.id);

  return {
    ...repos,
    repoId: repo.id,
  };
}

async function cleanupScenario(current: Scenario | null) {
  if (!current) return;
  await deleteRepo(current.repoId);
  removeTempRepo(current.localDir);
  removeTempRepo(current.peerDir);
  removeTempRepo(current.remoteDir);
}

async function gotoRepo(page: import('@playwright/test').Page, current: Scenario) {
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('ghgpt:activeRepoId', id), current.repoId);
  await setActiveRepo(current.repoId);
  await page.reload();
  await page.locator('app-shell').waitFor();
}

function readLocalFile(current: Scenario, fileName: string): string {
  return fs.readFileSync(path.join(current.localDir, fileName), 'utf-8');
}

test.beforeEach(async () => {
  scenario = await createScenario();
});

test.afterEach(async () => {
  await cleanupScenario(scenario);
  scenario = null;
});

test('fetch updates behind indicator in branch dropdown and pull button', async ({ page }) => {
  const current = scenario!;

  fs.writeFileSync(path.join(current.peerDir, 'README.md'), '# Remote change from peer\n');
  execSync('git add README.md', { cwd: current.peerDir });
  execSync('git commit -m "peer change"', { cwd: current.peerDir });
  execSync(`git push origin ${current.defaultBranch}`, { cwd: current.peerDir });

  await gotoRepo(page, current);
  await page.getByRole('button', { name: /Fetch/i }).click();

  await expect.poll(() => {
    const status = execSync('git status --short --branch', { cwd: current.localDir, encoding: 'utf-8' });
    return status;
  }).toContain('behind 1');

  await expect(page.locator('.git-overlay')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Pull/i })).toContainText('↓1');
  await page.locator('.toolbar-branch').click();
  await expect(page.locator('.branch-dropdown-item.active .branch-dropdown-behind')).toContainText('↓1');
});

test('pull updates the working tree with remote changes', async ({ page }) => {
  const current = scenario!;

  fs.writeFileSync(path.join(current.peerDir, 'README.md'), '# Pulled from remote\n');
  execSync('git add README.md', { cwd: current.peerDir });
  execSync('git commit -m "peer pull change"', { cwd: current.peerDir });
  execSync(`git push origin ${current.defaultBranch}`, { cwd: current.peerDir });

  await gotoRepo(page, current);
  await page.getByRole('button', { name: /Pull/i }).click();

  await expect.poll(() => readLocalFile(current, 'README.md')).toContain('Pulled from remote');
  await page.locator('.toolbar-branch').click();
  await expect(page.locator('.branch-dropdown-item.active .branch-dropdown-behind')).toHaveCount(0);
});

test('push uploads a local commit to the remote', async ({ page }) => {
  const current = scenario!;

  fs.writeFileSync(path.join(current.localDir, 'README.md'), '# Local push change\n');
  execSync('git add README.md', { cwd: current.localDir });
  execSync('git commit -m "local push change"', { cwd: current.localDir });

  await gotoRepo(page, current);
  await expect(page.getByRole('button', { name: /Push/i })).toContainText('↑1');
  await page.getByRole('button', { name: /Push/i }).click();

  await expect.poll(() => {
    execSync('git fetch origin', { cwd: current.peerDir, stdio: 'pipe' });
    return execSync(`git log --format=%s -1 origin/${current.defaultBranch}`, { cwd: current.peerDir, encoding: 'utf-8' }).trim();
  }).toBe('local push change');
});

test('pull shows merge conflict error in overlay', async ({ page }) => {
  const current = scenario!;

  fs.writeFileSync(path.join(current.peerDir, 'README.md'), '# Remote conflict\n');
  execSync('git add README.md', { cwd: current.peerDir });
  execSync('git commit -m "remote conflict"', { cwd: current.peerDir });
  execSync(`git push origin ${current.defaultBranch}`, { cwd: current.peerDir });

  fs.writeFileSync(path.join(current.localDir, 'README.md'), '# Local conflict\n');
  execSync('git add README.md', { cwd: current.localDir });
  execSync('git commit -m "local conflict"', { cwd: current.localDir });

  await gotoRepo(page, current);
  await page.getByRole('button', { name: /Pull/i }).click();

  await expect(page.locator('.git-overlay')).toBeVisible();
  await expect(page.locator('.git-overlay-status.error')).toContainText(/Merge-Konflikt/i);
  await expect(page.locator('.git-overlay-log')).toContainText(/CONFLICT|Automatic merge failed/i);
});
