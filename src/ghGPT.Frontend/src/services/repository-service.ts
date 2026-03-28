import { api } from './api-client';

export interface RepositoryInfo {
  id: string;
  name: string;
  localPath: string;
  remoteUrl: string | null;
  currentBranch: string;
}

const ACTIVE_REPO_KEY = 'ghgpt:activeRepoId';

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

  saveActiveId: (id: string) => localStorage.setItem(ACTIVE_REPO_KEY, id),
  loadActiveId: () => localStorage.getItem(ACTIVE_REPO_KEY),
};
