import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
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
import './issues-view';
import './releases-view';
import './discussions-view';
import './settings-view';
import './chat-panel';
import './dirty-checkout-dialog';
import './stashes-view';

type View = 'changes' | 'history' | 'branches' | 'stashes' | 'pull-requests' | 'issues' | 'releases' | 'discussions' | 'settings';

@customElement('app-shell')
export class AppShell extends AppElement {
  private readonly _appState = new AppStateController(this);

  @state() private activeView: View = 'changes';
  @state() private showDialog = false;
  @state() private historyRefreshKey = 0;
  @state() private changesRefreshKey = 0;
  @state() private branchesRefreshKey = 0;
  @state() private stashesRefreshKey = 0;
  @state() private showChat = false;
  @state() private dirtyCheckoutRepoId = '';
  @state() private dirtyCheckoutBranch = '';

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

  private _onDirtyCheckoutRequested = (e: Event) => {
    const { repoId, branchName } = (e as CustomEvent<{ repoId: string; branchName: string }>).detail;
    this.dirtyCheckoutRepoId = repoId;
    this.dirtyCheckoutBranch = branchName;
  };

  private _onDirtyCheckoutComplete = async () => {
    this.dirtyCheckoutBranch = '';
    await this._appState.refreshRepos();
    this.branchesRefreshKey++;
  };

  private _onDirtyCheckoutCancelled = () => {
    this.dirtyCheckoutBranch = '';
  };

  render() {
    const s = this._appState;
    const isPadded = this.activeView !== 'changes' && this.activeView !== 'branches' && this.activeView !== 'stashes' && this.activeView !== 'pull-requests' && this.activeView !== 'issues' && this.activeView !== 'releases' && this.activeView !== 'discussions';
    const contentClass = `flex flex-col flex-1 overflow-hidden text-cat-text${isPadded ? ' p-4 overflow-auto' : ''}`;
    return html`
      <app-sidebar
        data-testid="sidebar"
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

      <main class="flex flex-col flex-1 bg-cat-base overflow-hidden">
        <app-toolbar
          .activeRepo=${s.activeRepo}
          .gitOperation=${s.gitOperation}
          .showChat=${this.showChat}
          .branchesRefreshKey=${this.branchesRefreshKey}
          @git-operation=${this._onGitOperation}
          @toggle-chat=${this._onToggleChat}
          @branch-switched=${this._onBranchSwitched}
          @dirty-checkout-requested=${this._onDirtyCheckoutRequested}
          @navigate=${this._onNavigate}>
        </app-toolbar>

        <div class="${contentClass}"
          style="${this.activeView === 'settings' ? 'overflow:auto' : ''}"
          @dirty-checkout-requested=${this._onDirtyCheckoutRequested}>
          ${s.activeRepo || this.activeView === 'settings' ? this._renderView() : html`
            <div class="flex flex-col items-center justify-center h-full text-cat-subtle gap-3">
              <span class="text-4xl">📂</span>
              <span>Kein Repository geöffnet</span>
              <button class="px-5 py-1.5 rounded-md border border-cat-border bg-transparent text-cat-text text-sm cursor-pointer hover:bg-cat-overlay" @click=${() => this.showDialog = true}>
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

      <dirty-checkout-dialog
        .repoId=${this.dirtyCheckoutRepoId}
        .branchName=${this.dirtyCheckoutBranch}
        @checkout-complete=${this._onDirtyCheckoutComplete}
        @cancelled=${this._onDirtyCheckoutCancelled}
        @navigate-to-changes=${() => { this.dirtyCheckoutBranch = ''; this.activeView = 'changes'; }}>
      </dirty-checkout-dialog>
    `;
  }

  private _renderView() {
    const s = this._appState;
    switch (this.activeView) {
      case 'changes':
        return html`<changes-view .repoId=${s.activeRepoId ?? ''} .refreshKey=${this.changesRefreshKey} @commit-created=${this._onCommitCreated} @stash-pushed=${() => this.stashesRefreshKey++}></changes-view>`;
      case 'history':
        return html`<history-view .repoId=${s.activeRepoId ?? ''} .branch=${s.activeRepo?.currentBranch ?? ''} .refreshKey=${this.historyRefreshKey}></history-view>`;
      case 'branches':
        return html`<branches-view .repoId=${s.activeRepoId ?? ''} .refreshKey=${this.historyRefreshKey} @branch-changed=${this._onBranchChanged} @navigate-to-changes=${() => this.activeView = 'changes'}></branches-view>`;
      case 'stashes':
        return html`<stashes-view .repoId=${s.activeRepoId ?? ''} .refreshKey=${this.stashesRefreshKey} @stash-popped=${() => this.changesRefreshKey++}></stashes-view>`;
      case 'pull-requests':
        return html`<pull-requests-view .repoId=${s.activeRepoId ?? ''} .accountLogin=${s.account?.login ?? ''}></pull-requests-view>`;
      case 'issues':
        return html`<issues-view .repoId=${s.activeRepoId ?? ''}></issues-view>`;
      case 'releases':
        return html`<releases-view .repoId=${s.activeRepoId ?? ''}></releases-view>`;
      case 'discussions':
        return html`<discussions-view .repoId=${s.activeRepoId ?? ''}></discussions-view>`;
      case 'settings':
        return html`<settings-view @account-changed=${this._onAccountChanged}></settings-view>`;
    }
  }
}
