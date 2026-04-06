import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import { repositoryService, type RepositoryInfo, type BranchInfo } from '../services/repository-service';

@customElement('app-toolbar')
export class AppToolbar extends AppElement {
  @property({ attribute: false }) activeRepo: RepositoryInfo | undefined = undefined;
  @property({ attribute: false }) gitOperation: 'fetch' | 'pull' | 'push' | null = null;
  @property({ type: Boolean }) showChat = false;
  @property({ type: Number }) branchesRefreshKey = 0;

  @state() private branches: BranchInfo[] = [];
  @state() private showBranchDropdown = false;

  private _onDocClick = (e: MouseEvent) => {
    const path = e.composedPath();
    const wrapper = this.querySelector('.branch-dropdown-wrapper');
    if (wrapper && !path.includes(wrapper)) {
      this._closeDropdown();
    }
  };

  updated(changedProps: Map<string, unknown>) {
    if (changedProps.has('activeRepo') || changedProps.has('branchesRefreshKey')) {
      this._fetchBranches();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDocClick);
  }

  private async _fetchBranches() {
    if (!this.activeRepo) {
      this.branches = [];
      return;
    }
    this.branches = await repositoryService.getBranches(this.activeRepo.id).catch(() => []);
  }

  private async _openDropdown() {
    if (!this.activeRepo) return;
    this.branches = await repositoryService.getBranches(this.activeRepo.id).catch(() => []);
    this.showBranchDropdown = true;
    document.addEventListener('click', this._onDocClick);
  }

  private _closeDropdown() {
    this.showBranchDropdown = false;
    document.removeEventListener('click', this._onDocClick);
  }

  private async _checkoutBranch(branchName: string) {
    if (!this.activeRepo) return;
    this._closeDropdown();
    try {
      await repositoryService.checkoutBranch(this.activeRepo.id, branchName);
      this.branches = await repositoryService.getBranches(this.activeRepo.id);
      this.dispatchEvent(new CustomEvent('branch-switched', { bubbles: true, composed: true }));
    } catch (err) {
      alert((err as Error).message);
    }
  }

  private get _headBranch(): BranchInfo | undefined {
    return this.branches.find(b => b.isHead && !b.isRemote);
  }

  private _renderAheadBehind(branch: BranchInfo) {
    if (!branch.trackingBranch) return null;
    const parts = [];
    if (branch.aheadBy > 0) parts.push(html`<span data-testid="branch-dropdown-ahead" class="text-cat-green">↑${branch.aheadBy}</span>`);
    if (branch.behindBy > 0) parts.push(html`<span data-testid="branch-dropdown-behind" class="text-cat-red">↓${branch.behindBy}</span>`);
    return parts.length > 0
      ? html`<span class="inline-flex gap-[0.35rem] shrink-0 text-[0.72rem] text-cat-subtle">${parts}</span>`
      : null;
  }

  private _renderPullLabel() {
    const head = this._headBranch;
    return html`
      <span>↓ Pull</span>
      ${head?.trackingBranch && head.behindBy > 0 ? html`<span>↓${head.behindBy}</span>` : ''}
    `;
  }

  private _renderPushLabel() {
    const head = this._headBranch;
    return html`
      <span>↑ Push</span>
      ${head?.trackingBranch && head.aheadBy > 0 ? html`<span>↑${head.aheadBy}</span>` : ''}
    `;
  }

  private _emit(name: string, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  render() {
    const branchBtnBase = 'flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-cat-border bg-transparent text-cat-text text-sm cursor-pointer hover:bg-cat-overlay disabled:opacity-45 disabled:cursor-not-allowed';
    const toolbarBtnBase = 'px-3 py-1.5 rounded-md border border-cat-border bg-transparent text-cat-text text-sm cursor-pointer hover:bg-cat-overlay disabled:opacity-45 disabled:cursor-not-allowed';

    return html`
      <div class="branch-dropdown-wrapper relative">
        <button data-testid="toolbar-branch" class="${branchBtnBase}" ?disabled=${!this.activeRepo}
          @click=${() => this.showBranchDropdown ? this._closeDropdown() : this._openDropdown()}>
          <span data-testid="branch-icon">🌿</span> ${this.activeRepo?.currentBranch ?? '–'} ▾
        </button>
        ${this.showBranchDropdown ? html`
          <div data-testid="branch-dropdown" class="absolute top-[calc(100%+4px)] left-0 min-w-[220px] bg-cat-surface border border-cat-border rounded-lg shadow-2xl z-[200] overflow-hidden">
            ${this.branches.filter(b => !b.isRemote).length > 0 ? html`
              <div data-testid="branch-dropdown-section" class="px-3 pt-1 pb-0.5 text-[0.65rem] uppercase tracking-widest text-cat-subtle">Lokale Branches</div>
              ${this.branches.filter(b => !b.isRemote).map(b => html`
                <div data-testid="branch-dropdown-item" ?data-active=${b.isHead}
                  class="flex items-center gap-2 px-3 py-[0.45rem] text-sm cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis
                            ${b.isHead ? 'text-cat-blue bg-[rgba(137,180,250,0.07)]' : 'text-cat-text hover:bg-cat-overlay'}"
                  @click=${() => !b.isHead && this._checkoutBranch(b.name)}>
                  <span data-testid="branch-check" class="text-xs shrink-0">${b.isHead ? '✓' : ' '}</span>
                  <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">${b.name}</span>
                  ${this._renderAheadBehind(b)}
                </div>
              `)}
            ` : ''}
            ${this.branches.filter(b => b.isRemote).length > 0 ? html`
              <div class="h-px bg-cat-overlay my-1"></div>
              <div data-testid="branch-dropdown-section" class="px-3 pt-1 pb-0.5 text-[0.65rem] uppercase tracking-widest text-cat-subtle">Remote Branches</div>
              ${this.branches.filter(b => b.isRemote).map(b => html`
                <div data-testid="branch-dropdown-item" class="flex items-center gap-2 px-3 py-[0.45rem] text-sm text-cat-text cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis hover:bg-cat-overlay"
                  @click=${() => this._checkoutBranch(b.name)}>
                  <span class="text-xs shrink-0"> </span>
                  <span>☁ ${b.name}</span>
                </div>
              `)}
            ` : ''}
            <div data-testid="branch-dropdown-footer" class="flex items-center gap-1.5 px-3 py-[0.45rem] text-[0.8rem] text-cat-subtle cursor-pointer border-t border-cat-overlay hover:bg-cat-overlay hover:text-cat-text"
              @click=${() => { this._closeDropdown(); this._emit('navigate', 'branches'); }}>
              ⚙ Branch verwalten…
            </div>
          </div>
        ` : ''}
      </div>

      <div class="flex-1"></div>

      <button class="${toolbarBtnBase}"
        ?disabled=${!this.activeRepo || !!this.gitOperation}
        @click=${() => this._emit('git-operation', 'fetch')}>↓ Fetch</button>
      <button class="${toolbarBtnBase}"
        ?disabled=${!this.activeRepo || !!this.gitOperation}
        @click=${() => this._emit('git-operation', 'pull')}>${this._renderPullLabel()}</button>
      <button class="${toolbarBtnBase}"
        ?disabled=${!this.activeRepo || !!this.gitOperation}
        @click=${() => this._emit('git-operation', 'push')}>${this._renderPushLabel()}</button>
      <button class="${toolbarBtnBase} ${this.showChat ? 'bg-[rgba(137,180,250,0.13)] border-cat-blue text-cat-blue' : ''}"
        @click=${() => this._emit('toggle-chat')}
        title="KI-Assistent">✦</button>
    `;
  }
}
