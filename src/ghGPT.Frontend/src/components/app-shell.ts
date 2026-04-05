import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { RepositoryInfo, AccountInfo } from '../services/repository-service';
import { AppStateController } from '../services/app-state';
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

  private readonly _appState = new AppStateController(this);

  @state() private activeView: View = 'changes';
  @state() private showDialog = false;
  @state() private historyRefreshKey = 0;
  @state() private changesRefreshKey = 0;
  @state() private branchesRefreshKey = 0;
  @state() private showChat = false;

  constructor() {
    super();
    this._appState.onStatusChanged = () => { this.changesRefreshKey++; };
    this._appState.onBranchChanged = () => {
      this.branchesRefreshKey++;
      this.historyRefreshKey++;
      this.changesRefreshKey++;
    };
    this._appState.onGitOperationCompleted = (operation) => {
      this.branchesRefreshKey++;
      this.changesRefreshKey++;
      if (operation !== 'fetch') this.historyRefreshKey++;
    };
  }

  // --- Event handlers from child components ---

  private _onActivateRepo = (e: Event) => this._appState.activateRepo((e as CustomEvent<string>).detail);
  private _onRemoveRepo = (e: Event) => this._appState.removeRepo((e as CustomEvent<string>).detail);
  private _onAddRepo = () => { this.showDialog = true; };
  private _onNavigate = (e: Event) => { this.activeView = (e as CustomEvent<View>).detail; };

  private _onRepoAdded = async (e: Event) => {
    const repo = (e as CustomEvent<RepositoryInfo>).detail;
    this._appState.repos = [...this._appState.repos, repo];
    await this._appState.activateRepo(repo.id);
  };

  private _onGitOperation = (e: Event) => {
    this._appState.runGitOperation((e as CustomEvent<'fetch' | 'pull' | 'push'>).detail);
  };

  private _onToggleChat = () => { this.showChat = !this.showChat; };

  private _onBranchSwitched = async () => {
    await this._appState.refreshRepos();
  };

  private _onAccountChanged = (e: Event) => {
    this._appState.account = (e as CustomEvent<AccountInfo | null>).detail;
    this.requestUpdate();
  };

  private _onCommitCreated = () => { this.historyRefreshKey++; };

  private _onBranchChanged = async () => {
    await this._appState.refreshRepos();
    this.branchesRefreshKey++;
  };

  render() {
    const s = this._appState;
    return html`
      <app-sidebar
        .repos=${s.repos}
        .activeRepoId=${s.activeRepoId}
        .activeView=${this.activeView}
        .account=${s.account}
        .hubState=${s.hubState}
        @activate-repo=${this._onActivateRepo}
        @remove-repo=${this._onRemoveRepo}
        @add-repo=${this._onAddRepo}
        @navigate=${this._onNavigate}>
      </app-sidebar>

      <main class="main">
        <app-toolbar
          .activeRepo=${s.activeRepo}
          .gitOperation=${s.gitOperation}
          .showChat=${this.showChat}
          .branchesRefreshKey=${this.branchesRefreshKey}
          @git-operation=${this._onGitOperation}
          @toggle-chat=${this._onToggleChat}
          @branch-switched=${this._onBranchSwitched}
          @navigate=${this._onNavigate}>
        </app-toolbar>

        <div class="content ${this.activeView !== 'changes' && this.activeView !== 'branches' && this.activeView !== 'pull-requests' ? 'padded' : ''}"
          style="${this.activeView === 'settings' ? 'overflow:auto' : ''}">
          ${s.activeRepo || this.activeView === 'settings' ? this._renderView() : html`
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

      ${s.gitOperation ? html`
        <git-operation-overlay
          .operation=${s.gitOperation}
          .lines=${s.gitOperationLines}
          .error=${s.gitOperationError}
          .status=${s.gitOperationStatus}
          @close=${() => s.closeGitOverlay()}>
        </git-operation-overlay>
      ` : ''}

      ${this.showChat ? html`
        <chat-panel
          .repoId=${s.activeRepoId ?? ''}
          .branch=${s.activeRepo?.currentBranch ?? ''}
          .activeView=${this.activeView}
          @close=${() => this.showChat = false}>
        </chat-panel>
      ` : ''}
    `;
  }

  private _renderView() {
    const s = this._appState;
    switch (this.activeView) {
      case 'changes':
        return html`<changes-view .repoId=${s.activeRepoId ?? ''} .refreshKey=${this.changesRefreshKey} @commit-created=${this._onCommitCreated}></changes-view>`;
      case 'history':
        return html`<history-view .repoId=${s.activeRepoId ?? ''} .branch=${s.activeRepo?.currentBranch ?? ''} .refreshKey=${this.historyRefreshKey}></history-view>`;
      case 'branches':
        return html`<branches-view .repoId=${s.activeRepoId ?? ''} .refreshKey=${this.historyRefreshKey} @branch-changed=${this._onBranchChanged}></branches-view>`;
      case 'pull-requests':
        return html`<pull-requests-view .repoId=${s.activeRepoId ?? ''}></pull-requests-view>`;
      case 'settings':
        return html`<settings-view @account-changed=${this._onAccountChanged}></settings-view>`;
    }
  }
}
