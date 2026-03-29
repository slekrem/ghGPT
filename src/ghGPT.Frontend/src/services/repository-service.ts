import { api } from './api-client';

export interface RepositoryInfo {
  id: string;
  name: string;
  localPath: string;
  remoteUrl: string | null;
  currentBranch: string;
}

const ACTIVE_REPO_KEY = 'ghgpt:activeRepoId';

export interface FileStatusEntry {
  filePath: string;
  status: string;
  isStaged: boolean;
}

export interface RepositoryStatusResult {
  staged: FileStatusEntry[];
  unstaged: FileStatusEntry[];
}

export interface CommitHistoryEntry {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
}

export interface CommitListItem {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
}

export interface CommitListResult {
  branch: string;
  commits: CommitListItem[];
  hasMore: boolean;
}

export interface CommitFileChange {
  path: string;
  oldPath?: string | null;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
}

export interface CommitDetail {
  sha: string;
  shortSha: string;
  message: string;
  fullMessage: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  files: CommitFileChange[];
}

export const repositoryService = {
  getAll: () => api.get<RepositoryInfo[]>('/repos'),
  getActive: () => api.get<RepositoryInfo | null>('/repos/active'),
  setActive: (id: string) => api.put<void>('/repos/active/' + id),
  create: (localPath: string, name: string) =>
    api.post<RepositoryInfo>('/repos/create', { localPath, name }),
  import: (localPath: string) =>
    api.post<RepositoryInfo>('/repos/import', { localPath }),
  clone: (remoteUrl: string, localPath: string) =>
    api.post<RepositoryInfo>('/repos/clone', { remoteUrl, localPath }),

  getStatus: (id: string) =>
    api.get<RepositoryStatusResult>(`/repos/${id}/status`),
  getCommits: (id: string, branch?: string, skip = 0, take = 100) => {
    const params = new URLSearchParams({
      skip: String(skip),
      take: String(take),
    });
    if (branch) params.set('branch', branch);
    return api.get<CommitListResult>(`/repos/${id}/commits?${params.toString()}`);
  },
  getCommitDetail: (id: string, sha: string) =>
    api.get<CommitDetail>(`/repos/${id}/commits/${encodeURIComponent(sha)}`),
  getHistory: (id: string, limit = 50) =>
    api.get<CommitHistoryEntry[]>(`/repos/${id}/history?limit=${limit}`),
  getDiff: (id: string, file: string, staged: boolean) =>
    api.get<string>(`/repos/${id}/diff?file=${encodeURIComponent(file)}&staged=${staged}`),
  stageFile: (id: string, file: string) =>
    api.post<void>(`/repos/${id}/stage?file=${encodeURIComponent(file)}`),
  unstageFile: (id: string, file: string) =>
    api.post<void>(`/repos/${id}/unstage?file=${encodeURIComponent(file)}`),
  stageAll: (id: string) => api.post<void>(`/repos/${id}/stage-all`),
  unstageAll: (id: string) => api.post<void>(`/repos/${id}/unstage-all`),
  commit: (id: string, message: string, description?: string) =>
    api.post<void>(`/repos/${id}/commit`, { message, description }),

  saveActiveId: (id: string) => localStorage.setItem(ACTIVE_REPO_KEY, id),
  loadActiveId: () => localStorage.getItem(ACTIVE_REPO_KEY),
};
