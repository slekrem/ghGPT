import type { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  repositoryService,
  type RepositoryInfo,
  type GitOperationProgressEvent,
  type AccountInfo,
} from './repository-service';
import {
  onHubEvent,
  offHubEvent,
  onHubStateChange,
  offHubStateChange,
  getHubState,
  startHub,
  type HubConnectionStatus,
} from './hub-client';

export class AppStateController implements ReactiveController {
  private readonly _host: ReactiveControllerHost;

  repos: RepositoryInfo[] = [];
  activeRepoId: string | null = null;
  account: AccountInfo | null = null;
  hubState: HubConnectionStatus = 'disconnected';
  gitOperation: 'fetch' | 'pull' | 'push' | null = null;
  gitOperationLines: string[] = [];
  gitOperationError = '';
  gitOperationStatus = '';

  // Callbacks so the host can react to side effects
  onStatusChanged?: () => void;
  onBranchChanged?: () => void;
  onGitOperationCompleted?: (operation: 'fetch' | 'pull' | 'push') => void;

  constructor(host: ReactiveControllerHost) {
    this._host = host;
    host.addController(this);
  }

  async hostConnected() {
    onHubStateChange(this._onHubStateChange);
    startHub()
      .then(() => {
        this.hubState = getHubState();
        this._host.requestUpdate();
      })
      .catch(err => console.warn('SignalR connection failed:', err));
    onHubEvent<GitOperationProgressEvent>('git-operation-progress', this._onGitOperationProgress);
    onHubEvent<{ repoId: string }>('status-changed', this._onStatusChanged);
    onHubEvent<{ repoId: string }>('branch-changed', this._onHubBranchChanged);
    await this._loadRepos();
    await this._loadAccount();
  }

  hostDisconnected() {
    offHubStateChange(this._onHubStateChange);
    offHubEvent<GitOperationProgressEvent>('git-operation-progress', this._onGitOperationProgress);
    offHubEvent('status-changed', this._onStatusChanged);
    offHubEvent('branch-changed', this._onHubBranchChanged);
  }

  get activeRepo(): RepositoryInfo | undefined {
    return this.repos.find(r => r.id === this.activeRepoId);
  }

  async activateRepo(id: string) {
    this.activeRepoId = id;
    repositoryService.saveActiveId(id);
    await repositoryService.setActive(id).catch(() => {});
    this._host.requestUpdate();
  }

  async removeRepo(id: string) {
    await repositoryService.remove(id);
    this.repos = this.repos.filter(r => r.id !== id);
    if (this.activeRepoId === id) {
      if (this.repos.length > 0) {
        await this.activateRepo(this.repos[0].id);
      } else {
        this.activeRepoId = null;
        localStorage.removeItem('ghgpt:activeRepoId');
        this._host.requestUpdate();
      }
    } else {
      this._host.requestUpdate();
    }
  }

  async refreshRepos() {
    this.repos = await repositoryService.getAll();
    this._host.requestUpdate();
  }

  closeGitOverlay() {
    if (this.gitOperationStatus === 'progress' || this.gitOperationStatus === 'started') return;
    this.gitOperation = null;
    this.gitOperationLines = [];
    this.gitOperationError = '';
    this.gitOperationStatus = '';
    this._host.requestUpdate();
  }

  async runGitOperation(operation: 'fetch' | 'pull' | 'push') {
    if (!this.activeRepoId || this.gitOperation) return;
    this.gitOperation = operation;
    this.gitOperationLines = [];
    this.gitOperationError = '';
    this.gitOperationStatus = 'started';
    this._host.requestUpdate();
    try {
      if (operation === 'fetch') {
        await repositoryService.fetch(this.activeRepoId);
      } else if (operation === 'pull') {
        await repositoryService.pull(this.activeRepoId);
      } else {
        await repositoryService.push(this.activeRepoId);
      }
      this.repos = await repositoryService.getAll();
      this.gitOperationStatus = 'completed';
      this.onGitOperationCompleted?.(operation);
      this._host.requestUpdate();
      this.closeGitOverlay();
    } catch (err) {
      this.gitOperationError = (err as Error).message;
      this.gitOperationStatus = 'error';
      if (!this.gitOperationLines.includes(this.gitOperationError)) {
        this.gitOperationLines = [...this.gitOperationLines, this.gitOperationError];
      }
      this._host.requestUpdate();
    }
  }

  private _onHubStateChange = (state: HubConnectionStatus) => {
    this.hubState = state;
    this._host.requestUpdate();
  };

  private _onStatusChanged = (event: { repoId: string }) => {
    if (event.repoId !== this.activeRepoId) return;
    this.onStatusChanged?.();
  };

  private _onHubBranchChanged = (event: { repoId: string }) => {
    if (event.repoId !== this.activeRepoId) return;
    this.onBranchChanged?.();
  };

  private _onGitOperationProgress = (event: GitOperationProgressEvent) => {
    if (!this.activeRepoId || event.repoId !== this.activeRepoId || event.operation !== this.gitOperation) return;
    this.gitOperationStatus = event.status;
    if (event.message) {
      this.gitOperationLines = [...this.gitOperationLines, event.message];
    }
    if (event.status === 'error') {
      this.gitOperationError = event.message;
    }
    this._host.requestUpdate();
  };

  private async _loadAccount() {
    try {
      this.account = await repositoryService.getAccount();
    } catch {
      this.account = null;
    }
    this._host.requestUpdate();
  }

  private async _loadRepos() {
    this.repos = await repositoryService.getAll();
    const savedId = repositoryService.loadActiveId();
    if (savedId && this.repos.some(r => r.id === savedId)) {
      await this.activateRepo(savedId);
    } else if (this.repos.length > 0) {
      await this.activateRepo(this.repos[0].id);
    }
    this._host.requestUpdate();
  }
}
