import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repositoryService, type RepositoryInfo, type BranchInfo, type GitOperationProgressEvent, type AccountInfo } from '../services/repository-service';
import { onHubEvent, offHubEvent, onHubStateChange, getHubState, type HubConnectionStatus } from '../services/hub-client';
import { startHub } from '../services/hub-client';
import './repo-dialog';
import './changes-view';
import './history-view';
import './branches-view';
import './pull-requests-view';

type View = 'changes' | 'history' | 'branches' | 'pull-requests';

@customElement('app-shell')
export class AppShell extends LitElement {
  static styles = css`
    :host {
      display: flex;
      height: 100vh;
      width: 100vw;
      font-family: var(--bs-font-sans-serif, system-ui, sans-serif);
    }

    .sidebar {
      width: 240px;
      min-width: 240px;
      background-color: #1e1e2e;
      color: #cdd6f4;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #313244;
    }

    .sidebar-header {
      padding: 1rem;
      font-size: 1.1rem;
      font-weight: 600;
      border-bottom: 1px solid #313244;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .sidebar-section {
      padding: 0.5rem 0;
      flex: 1;
      overflow-y: auto;
    }

    .sidebar-section-title {
      padding: 0.25rem 1rem;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6c7086;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .add-btn {
      background: none;
      border: none;
      color: #6c7086;
      cursor: pointer;
      font-size: 1rem;
      padding: 0 0.25rem;
      line-height: 1;
    }

    .add-btn:hover { color: #cdd6f4; }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: #cdd6f4;
      transition: background-color 0.1s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-item:hover { background-color: #313244; }

    .nav-item.active {
      background-color: #45475a;
      color: #cba6f7;
    }

    .repo-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: #cdd6f4;
      transition: background-color 0.1s;
    }

    .repo-item:hover { background-color: #313244; }

    .repo-item.active {
      background-color: #45475a;
      color: #cba6f7;
    }

    .repo-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .repo-remove-btn {
      display: none;
      align-items: center;
      justify-content: center;
      margin-left: auto;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      border: none;
      background: none;
      color: #6c7086;
      cursor: pointer;
      font-size: 0.75rem;
      line-height: 1;
      border-radius: 3px;
      padding: 0;
    }

    .repo-item:hover .repo-remove-btn {
      display: flex;
    }

    .repo-remove-btn:hover {
      color: #f38ba8;
      background-color: #45475a;
    }

    .sidebar-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid #313244;
      font-size: 0.8rem;
      color: #6c7086;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      user-select: none;
    }

    .sidebar-footer:hover { color: #cdd6f4; }

    .account-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .account-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .account-badge {
      font-size: 0.65rem;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      background: #a6e3a133;
      color: #a6e3a1;
      flex-shrink: 0;
    }

    .account-badge.error {
      background: #f38ba833;
      color: #f38ba8;
    }

    .account-dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 12, 18, 0.72);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 500;
      padding: 1.5rem;
    }

    .account-dialog {
      width: min(480px, 100%);
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 12px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.45);
      overflow: hidden;
    }

    .account-dialog-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #313244;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .account-dialog-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #cdd6f4;
    }

    .account-dialog-close {
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: transparent;
      color: #cdd6f4;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .account-dialog-close:hover { background: #313244; }

    .account-dialog-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .account-connected {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 8px;
      background: #181825;
      border: 1px solid #313244;
    }

    .account-connected-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }

    .account-connected-info {
      flex: 1;
    }

    .account-connected-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: #cdd6f4;
    }

    .account-connected-login {
      font-size: 0.78rem;
      color: #6c7086;
    }

    .account-dialog-label {
      font-size: 0.8rem;
      color: #a6adc8;
      margin-bottom: 0.35rem;
    }

    .account-dialog-input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: #181825;
      color: #cdd6f4;
      font-size: 0.875rem;
      box-sizing: border-box;
      font-family: 'Cascadia Code', 'Consolas', monospace;
    }

    .account-dialog-input:focus {
      outline: none;
      border-color: #89b4fa;
    }

    .account-dialog-error {
      font-size: 0.8rem;
      color: #f38ba8;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      background: #f38ba811;
      border: 1px solid #f38ba844;
    }

    .account-dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .account-dialog-btn {
      padding: 0.4rem 1rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: transparent;
      color: #cdd6f4;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .account-dialog-btn:hover { background: #313244; }

    .account-dialog-btn.primary {
      background: #89b4fa22;
      border-color: #89b4fa;
      color: #89b4fa;
    }

    .account-dialog-btn.primary:hover { background: #89b4fa44; }

    .account-dialog-btn.danger {
      background: #f38ba811;
      border-color: #f38ba8;
      color: #f38ba8;
    }

    .account-dialog-btn.danger:hover { background: #f38ba833; }

    .account-dialog-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: #1a1b26;
      overflow: hidden;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background-color: #1e1e2e;
      border-bottom: 1px solid #313244;
    }

    .toolbar-branch {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: transparent;
      color: #cdd6f4;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .toolbar-branch:hover { background-color: #313244; }

    .branch-dropdown-wrapper {
      position: relative;
    }

    .branch-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      min-width: 220px;
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      z-index: 200;
      overflow: hidden;
    }

    .branch-dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.75rem;
      font-size: 0.875rem;
      color: #cdd6f4;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .branch-dropdown-item:hover { background-color: #313244; }

    .branch-dropdown-item.active {
      color: #89b4fa;
      background-color: #89b4fa11;
    }

    .branch-dropdown-item .check { font-size: 0.75rem; flex-shrink: 0; }

    .branch-dropdown-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .branch-dropdown-ahead-behind {
      display: inline-flex;
      gap: 0.35rem;
      flex-shrink: 0;
      font-size: 0.72rem;
      color: #6c7086;
    }

    .branch-dropdown-ahead {
      color: #a6e3a1;
    }

    .branch-dropdown-behind {
      color: #f38ba8;
    }

    .branch-dropdown-separator {
      height: 1px;
      background: #313244;
      margin: 0.25rem 0;
    }

    .branch-dropdown-section {
      padding: 0.25rem 0.75rem 0.1rem;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6c7086;
    }

    .branch-dropdown-footer {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.75rem;
      font-size: 0.8rem;
      color: #6c7086;
      cursor: pointer;
      border-top: 1px solid #313244;
    }

    .branch-dropdown-footer:hover { background-color: #313244; color: #cdd6f4; }

    .toolbar-spacer { flex: 1; }

    .toolbar-btn {
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: transparent;
      color: #cdd6f4;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .toolbar-btn:hover { background-color: #313244; }

    .toolbar-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .git-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 12, 18, 0.72);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 400;
      padding: 1.5rem;
    }

    .git-overlay-card {
      width: min(720px, 100%);
      max-height: min(70vh, 620px);
      display: flex;
      flex-direction: column;
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 12px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.45);
      overflow: hidden;
    }

    .git-overlay-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.9rem 1rem;
      border-bottom: 1px solid #313244;
    }

    .git-overlay-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #cdd6f4;
      text-transform: capitalize;
    }

    .git-overlay-status {
      font-size: 0.75rem;
      color: #6c7086;
    }

    .git-overlay-status.error {
      color: #f38ba8;
    }

    .git-overlay-close {
      padding: 0.25rem 0.7rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: transparent;
      color: #cdd6f4;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .git-overlay-close:hover {
      background: #313244;
    }

    .git-overlay-log {
      padding: 0.9rem 1rem 1rem;
      overflow: auto;
      font-family: 'Cascadia Code', 'Consolas', monospace;
      font-size: 0.78rem;
      line-height: 1.5;
      color: #a6adc8;
    }

    .git-overlay-line + .git-overlay-line {
      margin-top: 0.35rem;
    }

    .git-overlay-empty {
      color: #6c7086;
      font-style: italic;
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

    .hub-status {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-left: auto;
      flex-shrink: 0;
    }
    .hub-status--connected    { background: #a6e3a1; }
    .hub-status--reconnecting { background: #f9e2af; }
    .hub-status--disconnected { background: #f38ba8; }
  `;

  @state() private activeView: View = 'changes';
  @state() private repos: RepositoryInfo[] = [];
  @state() private activeRepoId: string | null = null;
  @state() private showDialog = false;
  @state() private historyRefreshKey = 0;
  @state() private changesRefreshKey = 0;
  @state() private showBranchDropdown = false;
  @state() private branches: BranchInfo[] = [];
  @state() private gitOperation: 'fetch' | 'pull' | 'push' | null = null;
  @state() private gitOperationLines: string[] = [];
  @state() private gitOperationError = '';
  @state() private gitOperationStatus = '';
  @state() private account: AccountInfo | null = null;
  @state() private showAccountDialog = false;
  @state() private patInput = '';
  @state() private accountError = '';
  @state() private accountLoading = false;
  @state() private hubState: HubConnectionStatus = 'disconnected';

  async connectedCallback() {
    super.connectedCallback();
    onHubStateChange(state => { this.hubState = state; });
    startHub()
      .then(() => { this.hubState = getHubState(); })
      .catch(err => console.warn('SignalR connection failed:', err));
    onHubEvent<GitOperationProgressEvent>('git-operation-progress', this.onGitOperationProgress);
    onHubEvent<{ repoId: string }>('status-changed', this.onStatusChanged);
    onHubEvent<{ repoId: string }>('branch-changed', this.onHubBranchChanged);
    await this.loadRepos();
    await this.loadAccount();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    offHubEvent<GitOperationProgressEvent>('git-operation-progress', this.onGitOperationProgress);
    offHubEvent('status-changed', this.onStatusChanged);
    offHubEvent('branch-changed', this.onHubBranchChanged);
  }

  private _onDocClick = (e: Event) => {
    if (!this.showBranchDropdown) return;
    const path = e.composedPath();
    const wrapper = this.shadowRoot?.querySelector('.branch-dropdown-wrapper');
    if (wrapper && !path.includes(wrapper)) {
      this.showBranchDropdown = false;
    }
  };

  private async loadAccount() {
    try {
      this.account = await repositoryService.getAccount();
    } catch {
      this.account = null;
    }
  }

  private async saveToken() {
    if (!this.patInput.trim()) return;
    this.accountLoading = true;
    this.accountError = '';
    try {
      this.account = await repositoryService.saveToken(this.patInput.trim());
      this.patInput = '';
      this.showAccountDialog = false;
    } catch (err) {
      this.accountError = (err as Error).message;
    } finally {
      this.accountLoading = false;
    }
  }

  private async removeAccount() {
    this.accountLoading = true;
    try {
      await repositoryService.removeAccount();
      this.account = null;
      this.patInput = '';
      this.accountError = '';
    } finally {
      this.accountLoading = false;
    }
  }

  private async loadRepos() {
    this.repos = await repositoryService.getAll();

    const savedId = repositoryService.loadActiveId();
    if (savedId && this.repos.some(r => r.id === savedId)) {
      await this.activateRepo(savedId);
    } else if (this.repos.length > 0) {
      await this.activateRepo(this.repos[0].id);
    }
  }

  private async activateRepo(id: string) {
    this.activeRepoId = id;
    repositoryService.saveActiveId(id);
    await repositoryService.setActive(id).catch(() => {});
    this.branches = await repositoryService.getBranches(id).catch(() => []);
  }

  private async removeRepo(id: string) {
    await repositoryService.remove(id);
    this.repos = this.repos.filter(r => r.id !== id);

    if (this.activeRepoId === id) {
      if (this.repos.length > 0) {
        await this.activateRepo(this.repos[0].id);
      } else {
        this.activeRepoId = null;
        this.branches = [];
        localStorage.removeItem('ghgpt:activeRepoId');
      }
    }
  }

  private get activeRepo(): RepositoryInfo | undefined {
    return this.repos.find(r => r.id === this.activeRepoId);
  }

  private async onRepoAdded(e: CustomEvent<RepositoryInfo>) {
    this.repos = [...this.repos, e.detail];
    await this.activateRepo(e.detail.id);
  }

  private onCommitCreated = () => {
    this.historyRefreshKey++;
  };

  private onBranchChanged = async () => {
    this.repos = await repositoryService.getAll();
    if (this.activeRepoId) {
      this.branches = await repositoryService.getBranches(this.activeRepoId);
    }
  };

  private onStatusChanged = (event: { repoId: string }) => {
    if (event.repoId !== this.activeRepoId) return;
    this.changesRefreshKey++;
  };

  private onHubBranchChanged = (event: { repoId: string }) => {
    if (event.repoId !== this.activeRepoId) return;
    this.onBranchChanged();
    this.historyRefreshKey++;
    this.changesRefreshKey++;
  };

  private onGitOperationProgress = (event: GitOperationProgressEvent) => {
    if (!this.activeRepoId || event.repoId !== this.activeRepoId || event.operation !== this.gitOperation) {
      return;
    }

    this.gitOperationStatus = event.status;
    if (event.message) {
      this.gitOperationLines = [...this.gitOperationLines, event.message];
    }
    if (event.status === 'error') {
      this.gitOperationError = event.message;
    }
  };

  private closeGitOverlay() {
    if (this.gitOperationStatus === 'progress' || this.gitOperationStatus === 'started') {
      return;
    }

    this.gitOperation = null;
    this.gitOperationLines = [];
    this.gitOperationError = '';
    this.gitOperationStatus = '';
  }

  private async runGitOperation(operation: 'fetch' | 'pull' | 'push') {
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
      this.branches = await repositoryService.getBranches(this.activeRepoId);
      this.changesRefreshKey++;
      if (operation !== 'fetch') {
        this.historyRefreshKey++;
      }
      this.gitOperationStatus = 'completed';
      this.closeGitOverlay();
    } catch (err) {
      this.gitOperationError = (err as Error).message;
      this.gitOperationStatus = 'error';
      if (!this.gitOperationLines.includes(this.gitOperationError)) {
        this.gitOperationLines = [...this.gitOperationLines, this.gitOperationError];
      }
    }
  }

  private async openBranchDropdown() {
    if (!this.activeRepoId) return;
    this.branches = await repositoryService.getBranches(this.activeRepoId);
    this.showBranchDropdown = true;
  }

  private async checkoutFromDropdown(branchName: string) {
    if (!this.activeRepoId) return;
    this.showBranchDropdown = false;
    try {
      await repositoryService.checkoutBranch(this.activeRepoId, branchName);
      this.repos = await repositoryService.getAll();
      this.branches = await repositoryService.getBranches(this.activeRepoId);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  private get headBranch(): BranchInfo | undefined {
    return this.branches.find(branch => branch.isHead && !branch.isRemote);
  }

  private renderAheadBehind(branch: BranchInfo) {
    if (!branch.trackingBranch) return null;

    const parts = [];
    if (branch.aheadBy > 0) {
      parts.push(html`<span class="branch-dropdown-ahead">↑${branch.aheadBy}</span>`);
    }
    if (branch.behindBy > 0) {
      parts.push(html`<span class="branch-dropdown-behind">↓${branch.behindBy}</span>`);
    }

    return parts.length > 0
      ? html`<span class="branch-dropdown-ahead-behind">${parts}</span>`
      : null;
  }

  private renderPullButtonLabel() {
    const headBranch = this.headBranch;
    const showBehindCount = !!headBranch?.trackingBranch && headBranch.behindBy > 0;

    return html`
      <span>↓ Pull</span>
      ${showBehindCount ? html` <span>↓${headBranch.behindBy}</span>` : ''}
    `;
  }

  private renderPushButtonLabel() {
    const headBranch = this.headBranch;
    const showAheadCount = !!headBranch?.trackingBranch && headBranch.aheadBy > 0;

    return html`
      <span>↑ Push</span>
      ${showAheadCount ? html` <span>↑${headBranch.aheadBy}</span>` : ''}
    `;
  }

  render() {
    return html`
      <aside class="sidebar" @click=${this._onDocClick}>
        <div class="sidebar-header">
          <span>⚡</span>
          <span>ghGPT</span>
          <span class="hub-status hub-status--${this.hubState}" title="${this.hubState}"></span>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-section-title">
            <span>Repositories</span>
            <button class="add-btn" title="Repository hinzufügen" @click=${() => this.showDialog = true}>＋</button>
          </div>

          ${this.repos.map(repo => html`
            <div class="repo-item ${repo.id === this.activeRepoId ? 'active' : ''}"
              @click=${() => this.activateRepo(repo.id)}>
              <span>📁</span>
              <span class="repo-name">${repo.name}</span>
              <button class="repo-remove-btn"
                title="Aus Tracking entfernen"
                @click=${(e: Event) => { e.stopPropagation(); this.removeRepo(repo.id); }}>
                ×
              </button>
            </div>
          `)}

          <div class="sidebar-section-title" style="margin-top:0.5rem">Workspace</div>
          <div class="nav-item ${this.activeView === 'changes' ? 'active' : ''}"
            @click=${() => this.activeView = 'changes'}>
            <span>✏️</span> Änderungen
          </div>
          <div class="nav-item ${this.activeView === 'history' ? 'active' : ''}"
            @click=${() => this.activeView = 'history'}>
            <span>🕐</span> History
          </div>

          <div class="sidebar-section-title" style="margin-top:0.5rem">Repository</div>
          <div class="nav-item ${this.activeView === 'branches' ? 'active' : ''}"
            @click=${() => this.activeView = 'branches'}>
            <span>🌿</span> Branches
          </div>
          <div class="nav-item ${this.activeView === 'pull-requests' ? 'active' : ''}"
            @click=${() => this.activeView = 'pull-requests'}>
            <span>🔀</span> Pull Requests
          </div>
        </div>

        <div class="sidebar-footer" @click=${() => { this.showAccountDialog = true; this.accountError = ''; }}>
          ${this.account
            ? html`
              <img class="account-avatar" src="${this.account.avatarUrl}" alt="${this.account.login}" />
              <span class="account-name">${this.account.name}</span>
              <span class="account-badge">✓</span>
            `
            : html`
              <span>👤</span>
              <span class="account-name">Nicht verbunden</span>
            `}
        </div>
      </aside>

      <main class="main" @click=${this._onDocClick}>
        <div class="toolbar">
          <div class="branch-dropdown-wrapper">
            <button class="toolbar-branch" ?disabled=${!this.activeRepo}
              @click=${() => this.showBranchDropdown ? this.showBranchDropdown = false : this.openBranchDropdown()}>
              🌿 ${this.activeRepo?.currentBranch ?? '–'} ▾
            </button>
            ${this.showBranchDropdown ? html`
              <div class="branch-dropdown">
                ${this.branches.filter(b => !b.isRemote).length > 0 ? html`
                  <div class="branch-dropdown-section">Lokale Branches</div>
                  ${this.branches.filter(b => !b.isRemote).map(b => html`
                    <div class="branch-dropdown-item ${b.isHead ? 'active' : ''}"
                      @click=${() => !b.isHead && this.checkoutFromDropdown(b.name)}>
                      <span class="check">${b.isHead ? '✓' : ' '}</span>
                      <span class="branch-dropdown-name">${b.name}</span>
                      ${this.renderAheadBehind(b)}
                    </div>
                  `)}
                ` : ''}
                ${this.branches.filter(b => b.isRemote).length > 0 ? html`
                  <div class="branch-dropdown-separator"></div>
                  <div class="branch-dropdown-section">Remote Branches</div>
                  ${this.branches.filter(b => b.isRemote).map(b => html`
                    <div class="branch-dropdown-item"
                      @click=${() => this.checkoutFromDropdown(b.name)}>
                      <span class="check"> </span>
                      <span>☁ ${b.name}</span>
                    </div>
                  `)}
                ` : ''}
                <div class="branch-dropdown-footer"
                  @click=${() => { this.showBranchDropdown = false; this.activeView = 'branches'; }}>
                  ⚙ Branch verwalten…
                </div>
              </div>
            ` : ''}
          </div>
          <div class="toolbar-spacer"></div>
          <button class="toolbar-btn" ?disabled=${!this.activeRepo || !!this.gitOperation} @click=${() => this.runGitOperation('fetch')}>↓ Fetch</button>
          <button class="toolbar-btn" ?disabled=${!this.activeRepo || !!this.gitOperation} @click=${() => this.runGitOperation('pull')}>${this.renderPullButtonLabel()}</button>
          <button class="toolbar-btn" ?disabled=${!this.activeRepo || !!this.gitOperation} @click=${() => this.runGitOperation('push')}>${this.renderPushButtonLabel()}</button>
        </div>

        <div class="content ${this.activeView !== 'changes' && this.activeView !== 'branches' && this.activeView !== 'pull-requests' ? 'padded' : ''}">
          ${this.activeRepo ? this.renderView() : html`
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
          @repo-added=${this.onRepoAdded}>
        </repo-dialog>
      ` : ''}

      ${this.showAccountDialog ? html`
        <div class="account-dialog-overlay" @click=${() => { this.showAccountDialog = false; this.accountError = ''; }}>
          <div class="account-dialog" @click=${(e: Event) => e.stopPropagation()}>
            <div class="account-dialog-header">
              <span class="account-dialog-title">GitHub Account</span>
              <button class="account-dialog-close" @click=${() => { this.showAccountDialog = false; this.accountError = ''; }}>✕</button>
            </div>
            <div class="account-dialog-body">
              ${this.account ? html`
                <div class="account-connected">
                  <img class="account-connected-avatar" src="${this.account.avatarUrl}" alt="${this.account.login}" />
                  <div class="account-connected-info">
                    <div class="account-connected-name">${this.account.name}</div>
                    <div class="account-connected-login">@${this.account.login}</div>
                  </div>
                </div>
                <div class="account-dialog-actions">
                  <button class="account-dialog-btn danger" ?disabled=${this.accountLoading} @click=${() => this.removeAccount()}>
                    Account trennen
                  </button>
                </div>
              ` : html`
                <div>
                  <div class="account-dialog-label">Personal Access Token (PAT)</div>
                  <input
                    class="account-dialog-input"
                    type="password"
                    placeholder="ghp_…"
                    .value=${this.patInput}
                    @input=${(e: Event) => { this.patInput = (e.target as HTMLInputElement).value; this.accountError = ''; }}
                    @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.saveToken()}
                  />
                </div>
                ${this.accountError ? html`<div class="account-dialog-error">${this.accountError}</div>` : ''}
                <div class="account-dialog-actions">
                  <button class="account-dialog-btn" @click=${() => { this.showAccountDialog = false; this.accountError = ''; }}>Abbrechen</button>
                  <button class="account-dialog-btn primary" ?disabled=${this.accountLoading || !this.patInput.trim()} @click=${() => this.saveToken()}>
                    ${this.accountLoading ? 'Verbinde…' : 'Verbinden'}
                  </button>
                </div>
              `}
            </div>
          </div>
        </div>
      ` : ''}

      ${this.gitOperation ? html`
        <div class="git-overlay">
          <div class="git-overlay-card">
            <div class="git-overlay-header">
              <div>
                <div class="git-overlay-title">${this.gitOperation}</div>
                <div class="git-overlay-status ${this.gitOperationError ? 'error' : ''}">
                  ${this.gitOperationError
                    ? this.gitOperationError
                    : this.gitOperationStatus === 'completed'
                      ? 'Abgeschlossen'
                      : 'Läuft…'}
                </div>
              </div>
              <button class="git-overlay-close" ?disabled=${this.gitOperationStatus === 'progress' || this.gitOperationStatus === 'started'} @click=${() => this.closeGitOverlay()}>
                Schließen
              </button>
            </div>
            <div class="git-overlay-log">
              ${this.gitOperationLines.length > 0
                ? this.gitOperationLines.map(line => html`<div class="git-overlay-line">${line}</div>`)
                : html`<div class="git-overlay-empty">Warte auf Git-Ausgabe…</div>`}
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }

  private renderView() {
    switch (this.activeView) {
      case 'changes':
        return html`<changes-view .repoId=${this.activeRepoId ?? ''} .refreshKey=${this.changesRefreshKey} @commit-created=${this.onCommitCreated}></changes-view>`;
      case 'history':
        return html`<history-view .repoId=${this.activeRepoId ?? ''} .branch=${this.activeRepo?.currentBranch ?? ''} .refreshKey=${this.historyRefreshKey}></history-view>`;
      case 'branches':
        return html`<branches-view .repoId=${this.activeRepoId ?? ''} .refreshKey=${this.historyRefreshKey} @branch-changed=${this.onBranchChanged}></branches-view>`;
      case 'pull-requests':
        return html`<pull-requests-view .repoId=${this.activeRepoId ?? ''}></pull-requests-view>`;
    }
  }
}
