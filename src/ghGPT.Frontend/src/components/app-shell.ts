import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repositoryService, type RepositoryInfo } from '../services/repository-service';
import { startHub } from '../services/hub-client';
import './repo-dialog';
import './changes-view';
import './history-view';
import './branches-view';

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
    }

    .repo-branch {
      font-size: 0.7rem;
      color: #6c7086;
      margin-left: auto;
      flex-shrink: 0;
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
    }

    .sidebar-footer:hover { color: #cdd6f4; }

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

  async connectedCallback() {
    super.connectedCallback();
    startHub().catch(err => console.warn('SignalR connection failed:', err));
    await this.loadRepos();
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
  };

  render() {
    return html`
      <aside class="sidebar">
        <div class="sidebar-header">
          <span>⚡</span>
          <span>ghGPT</span>
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
              <span class="repo-branch">${repo.currentBranch}</span>
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

        <div class="sidebar-footer">
          <span>👤</span>
          <span>Kein Account verbunden</span>
        </div>
      </aside>

      <main class="main">
        <div class="toolbar">
          <button class="toolbar-branch">
            🌿 ${this.activeRepo?.currentBranch ?? '–'} ▾
          </button>
          <div class="toolbar-spacer"></div>
          <button class="toolbar-btn" ?disabled=${!this.activeRepo}>↓ Fetch</button>
          <button class="toolbar-btn" ?disabled=${!this.activeRepo}>↓ Pull</button>
          <button class="toolbar-btn" ?disabled=${!this.activeRepo}>↑ Push</button>
        </div>

        <div class="content ${this.activeView !== 'changes' && this.activeView !== 'branches' ? 'padded' : ''}">
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
    `;
  }

  private renderView() {
    switch (this.activeView) {
      case 'changes':
        return html`<changes-view .repoId=${this.activeRepoId ?? ''} @commit-created=${this.onCommitCreated}></changes-view>`;
      case 'history':
        return html`<history-view .repoId=${this.activeRepoId ?? ''} .branch=${this.activeRepo?.currentBranch ?? ''} .refreshKey=${this.historyRefreshKey}></history-view>`;
      case 'branches':
        return html`<branches-view .repoId=${this.activeRepoId ?? ''} @branch-changed=${this.onBranchChanged}></branches-view>`;
      case 'pull-requests':
        return html`<div class="placeholder"><span class="placeholder-icon">🔀</span><span>Keine Pull Requests</span></div>`;
    }
  }
}
