import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const _settings = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../ghGPT.Api/Properties/launchSettings.json'), 'utf-8')
    .replace(/^\uFEFF/, '')
);
const _baseUrl: string = _settings.profiles.http.applicationUrl.split(';')[0];
export const API = `${_baseUrl}/api`;

function configureTestRepo(dir: string) {
  execSync('git config user.email "test@ghgpt.test"', { cwd: dir });
  execSync('git config user.name "ghGPT Test"', { cwd: dir });
  execSync('git config core.autocrlf false', { cwd: dir });
}

function createSeedRepo(prefix = 'ghgpt-seed-'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  execSync('git init', { cwd: dir });
  configureTestRepo(dir);
  fs.writeFileSync(path.join(dir, 'README.md'), '# Test Repo\n');
  fs.writeFileSync(path.join(dir, 'main.ts'), 'console.log("hello");\n');
  execSync('git add .', { cwd: dir });
  execSync('git commit -m "initial commit"', { cwd: dir });
  return dir;
}

export function createTempRepo(): string {
  return createSeedRepo('ghgpt-test-');
}

function cloneTestRepo(remoteDir: string, prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  execSync(`git -c core.autocrlf=false clone "${remoteDir}" .`, { cwd: dir });
  configureTestRepo(dir);
  return dir;
}

export function modifyFile(repoDir: string, filename: string, content: string) {
  fs.writeFileSync(path.join(repoDir, filename), content);
}

export function removeTempRepo(dir: string) {
  if (!fs.existsSync(dir)) return;

  for (const file of fs.readdirSync(dir, { recursive: true })) {
    const fullPath = path.join(dir, String(file));
    if (fs.existsSync(fullPath)) {
      try {
        fs.chmodSync(fullPath, 0o666);
      } catch {
        // Ignore transient cleanup issues; rmSync retry handles the rest.
      }
    }
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      return;
    } catch (error) {
      lastError = error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150);
    }
  }

  throw lastError;
}

export async function importRepo(localPath: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`${API}/repos/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ localPath }),
  });
  if (!res.ok) throw new Error(`Import failed: ${await res.text()}`);
  return res.json();
}

export async function setActiveRepo(id: string) {
  await fetch(`${API}/repos/active/${id}`, { method: 'PUT' });
}

export async function deleteRepo(id: string) {
  await fetch(`${API}/repos/${id}`, { method: 'DELETE' });
}

export async function unstageAll(id: string) {
  await fetch(`${API}/repos/${id}/unstage-all`, { method: 'POST' });
}

export function createTempRepoWithRemote(): { localDir: string; remoteDir: string } {
  const remoteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghgpt-remote-'));
  execSync('git init --bare', { cwd: remoteDir });

  const seedDir = createSeedRepo();
  execSync(`git remote add origin "${remoteDir}"`, { cwd: seedDir });
  execSync('git push origin HEAD', { cwd: seedDir });

  const localDir = cloneTestRepo(remoteDir, 'ghgpt-test-');

  execSync('git checkout -b feature/remote-branch', { cwd: localDir });
  fs.writeFileSync(path.join(localDir, 'feature.ts'), 'export const x = 1;\n');
  execSync('git add feature.ts', { cwd: localDir });
  execSync('git commit -m "feat: remote feature"', { cwd: localDir });
  execSync('git push origin feature/remote-branch', { cwd: localDir });

  try { execSync('git checkout master', { cwd: localDir, stdio: 'pipe' }); }
  catch { execSync('git checkout main', { cwd: localDir, stdio: 'pipe' }); }
  execSync('git branch -D feature/remote-branch', { cwd: localDir, stdio: 'pipe' });
  removeTempRepo(seedDir);

  return { localDir, remoteDir };
}

export function createTempRepoWithRemotePeer(): { localDir: string; remoteDir: string; peerDir: string; defaultBranch: string } {
  const remoteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghgpt-remote-'));
  execSync('git init --bare', { cwd: remoteDir });

  const seedDir = createSeedRepo();
  execSync(`git remote add origin "${remoteDir}"`, { cwd: seedDir });
  execSync('git push origin HEAD', { cwd: seedDir });

  const defaultBranch = execSync('git branch --show-current', { cwd: seedDir, encoding: 'utf-8' }).trim() || 'master';

  const localDir = cloneTestRepo(remoteDir, 'ghgpt-test-');

  const peerDir = cloneTestRepo(remoteDir, 'ghgpt-peer-');

  removeTempRepo(seedDir);

  return { localDir, remoteDir, peerDir, defaultBranch };
}
