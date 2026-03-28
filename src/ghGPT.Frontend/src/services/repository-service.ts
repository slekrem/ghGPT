import { api } from './api-client';

export interface RepositoryInfo {
  id: string;
  name: string;
  localPath: string;
  remoteUrl: string | null;
  currentBranch: string;
}

export const repositoryService = {
  getAll: () => api.get<RepositoryInfo[]>('/api/repos'),
  create: (localPath: string, name: string) =>
    api.post<RepositoryInfo>('/api/repos/create', { localPath, name }),
  import: (localPath: string) =>
    api.post<RepositoryInfo>('/api/repos/import', { localPath }),
  clone: (remoteUrl: string, localPath: string) =>
    api.post<RepositoryInfo>('/api/repos/clone', { remoteUrl, localPath }),
};
