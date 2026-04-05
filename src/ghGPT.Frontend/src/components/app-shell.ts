import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repositoryService, type RepositoryInfo, type GitOperationProgressEvent, type AccountInfo } from '../services/repository-service';
import { onHubEvent, offHubEvent, onHubStateChange, offHubStateChange, getHubState, type HubConnectionStatus } from '../services/hub-client';
import { startHub } from '../services/hub-client';
import './sidebar';
import './toolbar';
import './git-operation-overlay';
import './repo-dialog';
import './changes-view';
import './history-view';
import './branches-view';
import './pull-requests-view';
import './settings-view';
import './chat-panel';

type View = 'changes' | 'history' | 'branches' | 'pull-requests' | 'settings';

@customElement('app-shell')
export class AppShell extends LitElement {
  static styles = css`
    :host {
      display: flex;
      height: 100vh;
      width: 100vw;
      font-family: var(--bs-font-sans-serif, system-ui, sans-serif);
    }

    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: #1a1b26;
      overflow: hidden;
    }

    .content {
      flex: 1;
      overflow: hidden;
      color: #cdd6f4;
      display: flex;
      flex-direction: column;
    }

    .content.padded {
      padding: 1rem;
      overflow: auto;
    }

    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #6c7086;
      gap: 0.75rem;
    }

    .placeholder-icon { font-size: 2.5rem; }

    .placeholder-btn {
      padding: 0.4rem 1.25rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: transparent;
      color: #cdd6f4;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .placeholder-btn:hover { background-color: #313244; }
  `;

  @state() private activeView: View = 'changes';
  @state() private repos: RepositoryInfo[] = [];
  @state() private activeRepoId: string | null = null;
  @state() private showDialog = false;
  @state() private historyRefreshKey = 0;
  @state() private changesRefreshKey = 0;
  @state() private branchesRefreshKey = 0;
  @state() private gitOperation: 'fetch' | 'pull' | 'push' | null = null;
  @state() private gitOperationLines: string[] = [];
  @state() private gitOperationError = '';
  @state() private gitOperationStatus = '';
  @state() private account: AccountInfo | null = null;
  @state() private hubState: HubConnectionStatus = 'disconnected';
  @state() private showChat = false;

  private _onHubStateChange = (state: HubConnectionStatus) => { this.hubState = state; };

  async connectedCallback() {
    super.connectedCallback();
    onHubStateChange(this._onHubStateChange);
    startHub()
      .then(() => { this.hubState = getHubState(); })
      .catch(err => console.warn('SignalR connection failed:', err));
    onHubEvent<GitOperationProgressEvent>('git-operation-progress', this._onGitOperationProgress);
    onHubEvent<{ repoId: string }>('status-changed', this._onStatusChanged);
    onHubEvent<{ repoId: string }>('branch-changed', this._onHubBranchChanged);
    await this._loadRepos();
    await this._loadAccount();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    offHubStateChange(this._onHubStateChange);
    offHubEvent<GitOperationProgressEvent>('git-operation-progress', this._onGitOperationProgress);
    offHubEvent('status-changed', this._onStatusChanged);
    offHubEvent('branch-changed', this._onHubBranchChanged);
  }

  private async _loadAccount() {
    try {
      this.account = await repositoryService.getAccount();
    } catch {
      this.account = null;
    }
  }

  private async _loadRepos() {
    this.repos = await repositoryService.getAll();
    const savedId = repositoryService.loadActiveId();
    if (savedId && this.repos.some(r => r.id === savedId)) {
      await this._activateRepo(savedId);
    } else if (this.repos.length > 0) {
      await this._activateRepo(this.repos[0].id);
    }
  }

  private async _activateRepo(id: string) {
    this.activeRepoId = id;
    repositoryService.saveActiveId(id);
    await repositoryService.setActive(id).catch(() => {});
    this.branchesRefreshKey++;
  }

  private async _removeRepo(id: string) {
    await repositoryService.remove(id);
    this.repos = this.repos.filter(r => r.id !== id);
    if (this.activeRepoId === id) {
      if (this.repos.length > 0) {
        await this._activateRepo(this.repos[0].id);
      } else {
        this.activeRepoId = null;
        localStorage.removeItem('ghgpt:activeRepoId');
      }
    }
  }

  private get _activeRepo(): RepositoryInfo | undefined {
    return this.repos.find(r => r.id === this.activeRepoId);
  }

  private _onStatusChanged = (event: { repoId: string }) => {
    if (event.repoId !== this.activeRepoId) return;
    this.changesRefreshKey++;
  };

  private _onHubBranchChanged = (event: { repoId: string }) => {
    if (event.repoId !== this.activeRepoId) return;
    this.branchesRefreshKey++;
    this.historyRefreshKey++;
    this.changesRefreshKey++;
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
  };

  private _closeGitOverlay() {
    if (this.gitOperationStatus === 'progress' || this.gitOperationStatus === 'started') return;
    this.gitOperation = null;
    this.gitOperationLines = [];
    this.gitOperationError = '';
    this.gitOperationStatus = '';
  }

  private async _runGitOperation(operation: 'fetch' | 'pull' | 'push') {
    if (!this.activeRepoId || this.gitOperation) return;
    this.gitOperation = operation;
    this.gitOperationLines = [];
    this.gitOperationError = '';
    this.gitOperationStatus = 'started';
    try {
      if (operation === 'fetch') {
        await repositoryService.fetch(this.activeRepoId);
      } else if (operation === 'pull') {
        await repositoryService.pull(this.activeRepoId);
      } else {
        await repositoryService.push(this.activeRepoId);
      }
      this.repos = await repositoryService.getAll();
      this.branchesRefreshKey++;
      this.changesRefreshKey++;
      if (operation !== 'fetch') this.historyRefreshKey++;
      this.gitOperationStatus = 'completed';
      this._closeGitOverlay();
    } catch (err) {
      this.gitOperationError = (err as Error).message;
      this.gitOperationStatus = 'error';
      if (!this.gitOperationLines.includes(this.gitOperationError)) {
        this.gitOperationLines = [...this.gitOperationLines, this.gitOperationError];
      }
    }
  }

  // --- Event handlers from child components ---

  private _onActivateRepo = (e: Event) => this._activateRepo((e as CustomEvent<string>).detail);
  private _onRemoveRepo = (e: Event) => this._removeRepo((e as CustomEvent<string>).detail);
  private _onAddRepo = () => { this.showDialog = true; };
  private _onNavigate = (e: Event) => { this.activeView = (e as CustomEvent<View>).detail; };

  private _onRepoAdded = async (e: Event) => {
    const repo = (e as CustomEvent<RepositoryInfo>).detail;
    this.repos = [...this.repos, repo];
    await this._activateRepo(repo.id);
  };

  private _onGitOperation = (e: Event) => {
    this._runGitOperation((e as CustomEvent<'fetch' | 'pull' | 'push'>).detail);
  };

  private _onToggleChat = () => { this.showChat = !this.showChat; };

  private _onBranchSwitched = async () => {
    this.repos = await repositoryService.getAll();
  };

  private _onAccountChanged = (e: Event) => {
    this.account = (e as CustomEvent<AccountInfo | null>).detail;
  };

  private _onCommitCreated = () => { this.historyRefreshKey++; };

  private _onBranchChanged = async () => {
    this.repos = await repositoryService.getAll();
    this.branchesRefreshKey++;
  };

  render() {
    return html`
      <app-sidebar
        .repos=${this.repos}
        .activeRepoId=${this.activeRepoId}
        .activeView=${this.activeView}
        .account=${this.account}
        .hubState=${this.hubState}
        @activate-repo=${this._onActivateRepo}
        @remove-repo=${this._onRemoveRepo}
        @add-repo=${this._onAddRepo}
        @navigate=${this._onNavigate}>
      </app-sidebar>

      <main class="main">
        <app-toolbar
          .activeRepo=${this._activeRepo}
          .gitOperation=${this.gitOperation}
          .showChat=${this.showChat}
          .branchesRefreshKey=${this.branchesRefreshKey}
          @git-operation=${this._onGitOperation}
          @toggle-chat=${this._onToggleChat}
          @branch-switched=${this._onBranchSwitched}
          @navigate=${this._onNavigate}>
        </app-toolbar>

        <div class="content ${this.activeView !== 'changes' && this.activeView !== 'branches' && this.activeView !== 'pull-requests' ? 'padded' : ''}"
          style="${this.activeView === 'settings' ? 'overflow:auto' : ''}">
          ${this._activeRepo || this.activeView === 'settings' ? this._renderView() : html`
            <div class="placeholder">
              <span class="placeholder-icon">📂</span>
              <span>Kein Repository geöffnet</span>
              <button class="placeholder-btn" @click=${() => this.showDialog = true}>
                Repository hinzufügen
              </button>
            </div>
          `}
        </div>
      </main>

      ${this.showDialog ? html`
        <repo-dialog
          @close=${() => this.showDialog = false}
          @repo-added=${this._onRepoAdded}>
        </repo-dialog>
      ` : ''}

      ${this.gitOperation ? html`
        <git-operation-overlay
          .operation=${this.gitOperation}
          .lines=${this.gitOperationLines}
          .error=${this.gitOperationError}
          .status=${this.gitOperationStatus}
          @close=${this._closeGitOverlay}>
        </git-operation-overlay>
      ` : ''}

      ${this.showChat ? html`
        <chat-panel
          .repoId=${this.activeRepoId ?? ''}
          .branch=${this._activeRepo?.currentBranch ?? ''}
          .activeView=${this.activeView}
          @close=${() => this.showChat = false}>
        </chat-panel>
      ` : ''}
    `;
  }

  private _renderView() {
    switch (this.activeView) {
      case 'changes':
        return html`<changes-view .repoId=${this.activeRepoId ?? ''} .refreshKey=${this.changesRefreshKey} @commit-created=${this._onCommitCreated}></changes-view>`;
      case 'history':
        return html`<history-view .repoId=${this.activeRepoId ?? ''} .branch=${this._activeRepo?.currentBranch ?? ''} .refreshKey=${this.historyRefreshKey}></history-view>`;
      case 'branches':
        return html`<branches-view .repoId=${this.activeRepoId ?? ''} .refreshKey=${this.historyRefreshKey} @branch-changed=${this._onBranchChanged}></branches-view>`;
      case 'pull-requests':
        return html`<pull-requests-view .repoId=${this.activeRepoId ?? ''}></pull-requests-view>`;
      case 'settings':
        return html`<settings-view @account-changed=${this._onAccountChanged}></settings-view>`;
    }
  }
}
