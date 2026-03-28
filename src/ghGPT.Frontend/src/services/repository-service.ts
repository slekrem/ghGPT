import { api } from './api-client';

export interface RepositoryInfo {
  id: string;
  name: string;
  localPath: string;
  remoteUrl: string | null;
  currentBranch: string;
}

export const repositoryService = {
  getAll: () => api.get<RepositoryInfo[]>('/repos'),
  create: (localPath: string, name: string) =>
    api.post<RepositoryInfo>('/repos/create', { localPath, name }),
  import: (localPath: string) =>
    api.post<RepositoryInfo>('/repos/import', { localPath }),
  clone: (remoteUrl: string, localPath: string) =>
    api.post<RepositoryInfo>('/repos/clone', { remoteUrl, localPath }),
};
