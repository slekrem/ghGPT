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

export interface BranchInfo {
  name: string;
  isRemote: boolean;
  isHead: boolean;
  aheadBy: number;
  behindBy: number;
  trackingBranch: string | null;
}

export interface GitOperationProgressEvent {
  repoId: string;
  operation: string;
  status: string;
  message: string;
}

export interface AccountInfo {
  login: string;
  name: string;
  avatarUrl: string;
}

export interface PullRequestListItem {
  number: number;
  title: string;
  state: string;
  authorLogin: string;
  authorAvatarUrl: string;
  headBranch: string;
  baseBranch: string;
  isDraft: boolean;
  mergeableState: string | null;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface PullRequestReview {
  reviewerLogin: string;
  reviewerAvatarUrl: string;
  state: string;
  submittedAt: string;
}

export interface PullRequestFile {
  fileName: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface PullRequestDetail {
  number: number;
  title: string;
  state: string;
  authorLogin: string;
  authorAvatarUrl: string;
  headBranch: string;
  baseBranch: string;
  isDraft: boolean;
  body: string;
  labels: string[];
  reviews: PullRequestReview[];
  files: PullRequestFile[];
  ciPassing: boolean;
  ciHasCombinedStatus: boolean;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscussionItem {
  number: number;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  authorLogin: string;
  categoryName: string;
}

export interface IssueLabel {
  name: string;
  color: string;
}

export interface IssueListItem {
  number: number;
  title: string;
  state: string;
  authorLogin: string;
  labels: IssueLabel[];
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface IssueDetail {
  number: number;
  title: string;
  state: string;
  authorLogin: string;
  labels: IssueLabel[];
  assignees: string[];
  body: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface ReleaseListItem {
  tagName: string;
  name: string;
  publishedAt: string;
  isDraft: boolean;
  isPrerelease: boolean;
  isLatest: boolean;
}

export interface ReleaseDetail {
  tagName: string;
  name: string;
  body: string | null;
  publishedAt: string;
  isDraft: boolean;
  isPrerelease: boolean;
  url: string;
  authorLogin: string;
}

export interface StageLinesRequest {
  filePath: string;
  patch: string;
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
  remove: (id: string) => api.delete<void>(`/repos/${id}`),

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
  getCombinedDiff: (id: string, file: string) =>
    api.get<string>(`/repos/${id}/combined-diff?file=${encodeURIComponent(file)}`),
  stageFile: (id: string, file: string) =>
    api.post<void>(`/repos/${id}/stage?file=${encodeURIComponent(file)}`),
  unstageFile: (id: string, file: string) =>
    api.post<void>(`/repos/${id}/unstage?file=${encodeURIComponent(file)}`),
  stageLines: (id: string, req: StageLinesRequest) =>
    api.post<void>(`/repos/${id}/stage-lines`, req),
  unstageLines: (id: string, req: StageLinesRequest) =>
    api.post<void>(`/repos/${id}/unstage-lines`, req),
  stageAll: (id: string) => api.post<void>(`/repos/${id}/stage-all`),
  unstageAll: (id: string) => api.post<void>(`/repos/${id}/unstage-all`),
  commit: (id: string, message: string, description?: string) =>
    api.post<void>(`/repos/${id}/commit`, { message, description }),
  fetch: (id: string) => api.post<void>(`/repos/${id}/fetch`),
  pull: (id: string) => api.post<void>(`/repos/${id}/pull`),
  push: (id: string) => api.post<void>(`/repos/${id}/push`),

  getBranches: (id: string) =>
    api.get<BranchInfo[]>(`/repos/${id}/branches`),
  checkoutBranch: (id: string, name: string, strategy: 'Normal' | 'Carry' | 'Stash' | 'Discard' = 'Normal', stashMessage?: string) =>
    api.put<void>(`/repos/${id}/branches/checkout`, { name, strategy, stashMessage }),
  createBranch: (id: string, name: string, startPoint?: string) =>
    api.post<BranchInfo>(`/repos/${id}/branches`, { name, startPoint }),
  deleteBranch: (id: string, name: string) =>
    api.delete<void>(`/repos/${id}/branches/${encodeURIComponent(name)}`),

  getPullRequests: (id: string, state: 'open' | 'closed' | 'all' = 'open') =>
    api.get<PullRequestListItem[]>(`/repos/${id}/pull-requests?state=${state}`),
  getPullRequestDetail: (id: string, number: number) =>
    api.get<PullRequestDetail>(`/repos/${id}/pull-requests/${number}`),
  createPullRequest: (id: string, title: string, body: string, headBranch: string, baseBranch: string, draft = false) =>
    api.post<PullRequestDetail>(`/repos/${id}/pull-requests`, { title, body, headBranch, baseBranch, draft }),
  editPullRequest: (id: string, number: number, title?: string, body?: string) =>
    api.patch<void>(`/repos/${id}/pull-requests/${number}`, { title, body }),
  closePullRequest: (id: string, number: number) =>
    api.patch<void>(`/repos/${id}/pull-requests/${number}/close`, {}),
  reopenPullRequest: (id: string, number: number) =>
    api.patch<void>(`/repos/${id}/pull-requests/${number}/reopen`, {}),
  mergePullRequest: (id: string, number: number, method: 'merge' | 'squash' | 'rebase' = 'merge', commitTitle?: string, commitBody?: string) =>
    api.post<void>(`/repos/${id}/pull-requests/${number}/merge`, { method, commitTitle, commitBody }),

  getDiscussions: (id: string, limit = 30) =>
    api.get<DiscussionItem[]>(`/repos/${id}/discussions?limit=${limit}`),
  createDiscussion: (id: string, title: string, body: string, category?: string) =>
    api.post<DiscussionItem>(`/repos/${id}/discussions`, { title, body, category }),

  getReleases: (id: string, limit = 30) =>
    api.get<ReleaseListItem[]>(`/repos/${id}/releases?limit=${limit}`),
  getLatestRelease: (id: string) =>
    api.get<ReleaseDetail>(`/repos/${id}/releases/latest`),
  getReleaseByTag: (id: string, tag: string) =>
    api.get<ReleaseDetail>(`/repos/${id}/releases/${encodeURIComponent(tag)}`),

  getIssues: (id: string, state: 'open' | 'closed' | 'all' = 'open') =>
    api.get<IssueListItem[]>(`/repos/${id}/issues?state=${state}`),
  getIssueDetail: (id: string, number: number) =>
    api.get<IssueDetail>(`/repos/${id}/issues/${number}`),
  createIssue: (id: string, title: string, body: string, labels?: string[]) =>
    api.post<IssueListItem>(`/repos/${id}/issues`, { title, body, labels }),
  addIssueComment: (id: string, number: number, body: string) =>
    api.post<void>(`/repos/${id}/issues/${number}/comments`, { body }),

  saveActiveId: (id: string) => localStorage.setItem(ACTIVE_REPO_KEY, id),
  loadActiveId: () => localStorage.getItem(ACTIVE_REPO_KEY),

  getAccount: () => api.get<AccountInfo>('/account'),
};
