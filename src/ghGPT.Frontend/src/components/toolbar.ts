import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repositoryService, type RepositoryInfo, type BranchInfo } from '../services/repository-service';

@customElement('app-toolbar')
export class AppToolbar extends LitElement {
  static styles = css`
    :host {
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
    .toolbar-branch:disabled { opacity: 0.45; cursor: not-allowed; }

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

    .branch-dropdown-ahead { color: #a6e3a1; }
    .branch-dropdown-behind { color: #f38ba8; }

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

    .toolbar-btn.active {
      background: #89b4fa22;
      border-color: #89b4fa;
      color: #89b4fa;
    }
  `;

  @property({ attribute: false }) activeRepo: RepositoryInfo | undefined = undefined;
  @property({ attribute: false }) gitOperation: 'fetch' | 'pull' | 'push' | null = null;
  @property({ type: Boolean }) showChat = false;
  @property({ type: Number }) branchesRefreshKey = 0;

  @state() private branches: BranchInfo[] = [];
  @state() private showBranchDropdown = false;

  private _onDocClick = (e: MouseEvent) => {
    const path = e.composedPath();
    const wrapper = this.shadowRoot?.querySelector('.branch-dropdown-wrapper');
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
    if (branch.aheadBy > 0) parts.push(html`<span class="branch-dropdown-ahead">↑${branch.aheadBy}</span>`);
    if (branch.behindBy > 0) parts.push(html`<span class="branch-dropdown-behind">↓${branch.behindBy}</span>`);
    return parts.length > 0
      ? html`<span class="branch-dropdown-ahead-behind">${parts}</span>`
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
    return html`
      <div class="branch-dropdown-wrapper">
        <button class="toolbar-branch" ?disabled=${!this.activeRepo}
          @click=${() => this.showBranchDropdown ? this._closeDropdown() : this._openDropdown()}>
          🌿 ${this.activeRepo?.currentBranch ?? '–'} ▾
        </button>
        ${this.showBranchDropdown ? html`
          <div class="branch-dropdown">
            ${this.branches.filter(b => !b.isRemote).length > 0 ? html`
              <div class="branch-dropdown-section">Lokale Branches</div>
              ${this.branches.filter(b => !b.isRemote).map(b => html`
                <div class="branch-dropdown-item ${b.isHead ? 'active' : ''}"
                  @click=${() => !b.isHead && this._checkoutBranch(b.name)}>
                  <span class="check">${b.isHead ? '✓' : ' '}</span>
                  <span class="branch-dropdown-name">${b.name}</span>
                  ${this._renderAheadBehind(b)}
                </div>
              `)}
            ` : ''}
            ${this.branches.filter(b => b.isRemote).length > 0 ? html`
              <div class="branch-dropdown-separator"></div>
              <div class="branch-dropdown-section">Remote Branches</div>
              ${this.branches.filter(b => b.isRemote).map(b => html`
                <div class="branch-dropdown-item"
                  @click=${() => this._checkoutBranch(b.name)}>
                  <span class="check"> </span>
                  <span>☁ ${b.name}</span>
                </div>
              `)}
            ` : ''}
            <div class="branch-dropdown-footer"
              @click=${() => { this._closeDropdown(); this._emit('navigate', 'branches'); }}>
              ⚙ Branch verwalten…
            </div>
          </div>
        ` : ''}
      </div>

      <div class="toolbar-spacer"></div>

      <button class="toolbar-btn"
        ?disabled=${!this.activeRepo || !!this.gitOperation}
        @click=${() => this._emit('git-operation', 'fetch')}>↓ Fetch</button>
      <button class="toolbar-btn"
        ?disabled=${!this.activeRepo || !!this.gitOperation}
        @click=${() => this._emit('git-operation', 'pull')}>${this._renderPullLabel()}</button>
      <button class="toolbar-btn"
        ?disabled=${!this.activeRepo || !!this.gitOperation}
        @click=${() => this._emit('git-operation', 'push')}>${this._renderPushLabel()}</button>
      <button class="toolbar-btn ${this.showChat ? 'active' : ''}"
        @click=${() => this._emit('toggle-chat')}
        title="KI-Assistent">✦</button>
    `;
  }
}
