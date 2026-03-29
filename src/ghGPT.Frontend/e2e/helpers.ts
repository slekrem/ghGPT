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

export function createTempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghgpt-test-'));
  execSync('git init', { cwd: dir });
  execSync('git config user.email "test@ghgpt.test"', { cwd: dir });
  execSync('git config user.name "ghGPT Test"', { cwd: dir });
  fs.writeFileSync(path.join(dir, 'README.md'), '# Test Repo\n');
  fs.writeFileSync(path.join(dir, 'main.ts'), 'console.log("hello");\n');
  execSync('git add .', { cwd: dir });
  execSync('git commit -m "initial commit"', { cwd: dir });
  return dir;
}

export function modifyFile(repoDir: string, filename: string, content: string) {
  fs.writeFileSync(path.join(repoDir, filename), content);
}

export function removeTempRepo(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
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
