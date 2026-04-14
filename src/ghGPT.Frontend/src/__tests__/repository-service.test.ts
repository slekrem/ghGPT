import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/api-client', () => ({
  api: {
    get: vi.fn().mockResolvedValue(undefined),
    post: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    patch: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

const storage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { for (const key of Object.keys(storage)) delete storage[key]; },
});

import { api } from '../services/api-client';
import { repositoryService } from '../services/repository-service';

const mockApi = api as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; patch: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };

describe('repositoryService — URL construction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('getAll calls GET /repos', async () => {
    await repositoryService.getAll();
    expect(mockApi.get).toHaveBeenCalledWith('/repos');
  });

  it('getStatus calls GET /repos/{id}/status', async () => {
    await repositoryService.getStatus('repo-1');
    expect(mockApi.get).toHaveBeenCalledWith('/repos/repo-1/status');
  });

  it('setActive calls PUT /repos/active/{id}', async () => {
    await repositoryService.setActive('repo-1');
    expect(mockApi.put).toHaveBeenCalledWith('/repos/active/repo-1');
  });

  it('remove calls DELETE /repos/{id}', async () => {
    await repositoryService.remove('repo-1');
    expect(mockApi.delete).toHaveBeenCalledWith('/repos/repo-1');
  });

  it('stageFile encodes file path in URL', async () => {
    await repositoryService.stageFile('repo-1', 'src/my file.ts');
    expect(mockApi.post).toHaveBeenCalledWith(
      '/repos/repo-1/stage?file=src%2Fmy%20file.ts',
    );
  });

  it('getDiff encodes file path and passes staged flag', async () => {
    await repositoryService.getDiff('repo-1', 'src/app.ts', true);
    expect(mockApi.get).toHaveBeenCalledWith(
      '/repos/repo-1/diff?file=src%2Fapp.ts&staged=true',
    );
  });

  it('deleteBranch encodes branch name in URL', async () => {
    await repositoryService.deleteBranch('repo-1', 'origin/feature/x');
    expect(mockApi.delete).toHaveBeenCalledWith(
      '/repos/repo-1/branches/origin%2Ffeature%2Fx',
    );
  });

  it('getCommits builds correct query params', async () => {
    await repositoryService.getCommits('repo-1', 'main', 0, 50);
    expect(mockApi.get).toHaveBeenCalledWith(
      expect.stringContaining('/repos/repo-1/commits?'),
    );
    const url = mockApi.get.mock.calls[0][0] as string;
    expect(url).toContain('skip=0');
    expect(url).toContain('take=50');
    expect(url).toContain('branch=main');
  });

  it('getCommits omits branch param when not provided', async () => {
    await repositoryService.getCommits('repo-1');
    const url = mockApi.get.mock.calls[0][0] as string;
    expect(url).not.toContain('branch=');
  });

  it('commit posts message and description', async () => {
    await repositoryService.commit('repo-1', 'feat: test', 'description text');
    expect(mockApi.post).toHaveBeenCalledWith(
      '/repos/repo-1/commit',
      { message: 'feat: test', description: 'description text' },
    );
  });

  it('checkoutBranch uses PUT with strategy defaulting to Normal', async () => {
    await repositoryService.checkoutBranch('repo-1', 'feature/x');
    expect(mockApi.put).toHaveBeenCalledWith(
      '/repos/repo-1/branches/checkout',
      { name: 'feature/x', strategy: 'Normal', stashMessage: undefined },
    );
  });

  it('pushStash sends null for empty message and paths', async () => {
    await repositoryService.pushStash('repo-1');
    expect(mockApi.post).toHaveBeenCalledWith(
      '/repos/repo-1/stash',
      { message: null, paths: null },
    );
  });
});

describe('repositoryService — localStorage', () => {
  beforeEach(() => localStorage.clear());

  it('saveActiveId persists id in localStorage', () => {
    repositoryService.saveActiveId('repo-42');
    expect(localStorage.getItem('ghgpt:activeRepoId')).toBe('repo-42');
  });

  it('loadActiveId returns null when nothing saved', () => {
    expect(repositoryService.loadActiveId()).toBeNull();
  });

  it('loadActiveId returns previously saved id', () => {
    repositoryService.saveActiveId('repo-7');
    expect(repositoryService.loadActiveId()).toBe('repo-7');
  });

  it('saveActiveId overwrites previous value', () => {
    repositoryService.saveActiveId('repo-1');
    repositoryService.saveActiveId('repo-2');
    expect(repositoryService.loadActiveId()).toBe('repo-2');
  });
});
