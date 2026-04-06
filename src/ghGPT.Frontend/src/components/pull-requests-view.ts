import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import {
  repositoryService,
  type PullRequestListItem,
  type PullRequestDetail,
} from '../services/repository-service';

@customElement('pull-requests-view')
export class PullRequestsView extends AppElement {
  static styles = css`
    :host {
      display: flex;
      height: 100%;
      overflow: hidden;
      background: #181825;
      color: #cdd6f4;
      border: 1px solid #313244;
      border-radius: 10px;
    }

    .list-panel {
      width: 380px;
      min-width: 380px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #313244;
      background: #1e1e2e;
      overflow: hidden;
    }

    .panel-header {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #313244;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex-shrink: 0;
      background: #1e1e2e;
    }

    .panel-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .panel-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #eef1ff;
    }

    .create-btn {
      padding: 0.2rem 0.65rem;
      font-size: 0.75rem;
      border: 1px solid #45475a;
      border-radius: 4px;
      background: transparent;
      color: #a6e3a1;
      border-color: #a6e3a1;
      cursor: pointer;
    }

    .create-btn:hover {
      background: rgba(166, 227, 161, 0.1);
    }

    .filter-row {
      display: flex;
      gap: 0.4rem;
      align-items: center;
    }

    .filter-btn {
      padding: 0.2rem 0.65rem;
      font-size: 0.75rem;
      border: 1px solid #45475a;
      border-radius: 4px;
      background: transparent;
      color: #a6adc8;
      cursor: pointer;
      transition: all 0.15s;
    }

    .filter-btn:hover {
      background: #313244;
      color: #cdd6f4;
    }

    .filter-btn.active {
      background: #89b4fa;
      border-color: #89b4fa;
      color: #11111b;
      font-weight: 600;
    }

    .refresh-btn {
      margin-left: auto;
      padding: 0.2rem 0.6rem;
      font-size: 0.75rem;
      border: 1px solid #45475a;
      border-radius: 4px;
      background: transparent;
      color: #a6adc8;
      cursor: pointer;
    }

    .refresh-btn:hover {
      background: #313244;
      color: #cdd6f4;
    }

    .list-scroll {
      flex: 1;
      overflow-y: auto;
    }

    .pr-entry {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid rgba(49, 50, 68, 0.8);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .pr-entry:hover { background: #25273a; }
    .pr-entry.selected { background: #313244; }

    .pr-entry-top {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .pr-number {
      font-size: 0.75rem;
      color: #8f96b3;
      white-space: nowrap;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .pr-title {
      font-size: 0.87rem;
      font-weight: 600;
      color: #eef1ff;
      line-height: 1.3;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .pr-entry-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.74rem;
      color: #8f96b3;
    }

    .pr-branch {
      font-family: monospace;
      font-size: 0.72rem;
      color: #89b4fa;
    }

    .pr-author {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .avatar-small {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-fallback-small {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: linear-gradient(135deg, #89b4fa, #fab387);
      color: #11111b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.55rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .badge {
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 600;
    }

    .badge-open {
      background: rgba(166, 227, 161, 0.15);
      color: #a6e3a1;
      border: 1px solid rgba(166, 227, 161, 0.3);
    }

    .badge-closed {
      background: rgba(243, 139, 168, 0.15);
      color: #f38ba8;
      border: 1px solid rgba(243, 139, 168, 0.3);
    }

    .badge-merged {
      background: rgba(203, 166, 247, 0.15);
      color: #cba6f7;
      border: 1px solid rgba(203, 166, 247, 0.3);
    }

    .badge-draft {
      background: rgba(166, 173, 200, 0.15);
      color: #a6adc8;
      border: 1px solid rgba(166, 173, 200, 0.3);
    }

    .badge-label {
      background: rgba(137, 180, 250, 0.15);
      color: #89b4fa;
      border: 1px solid rgba(137, 180, 250, 0.3);
    }

    .detail-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    .detail-header {
      padding: 0.9rem 1rem;
      border-bottom: 1px solid #313244;
      background: #1e1e2e;
      flex-shrink: 0;
    }

    .detail-header-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .detail-title {
      font-size: 1rem;
      font-weight: 700;
      color: #eef1ff;
      line-height: 1.4;
      flex: 1;
    }

    .detail-actions {
      display: flex;
      gap: 0.4rem;
      flex-shrink: 0;
      flex-wrap: wrap;
      align-items: center;
    }

    .action-btn {
      padding: 0.3rem 0.75rem;
      font-size: 0.78rem;
      border: 1px solid #45475a;
      border-radius: 6px;
      background: transparent;
      color: #cdd6f4;
      cursor: pointer;
      white-space: nowrap;
    }

    .action-btn:hover { background: #313244; }
    .action-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .action-btn.danger {
      color: #f38ba8;
      border-color: #f38ba8;
    }

    .action-btn.danger:hover { background: rgba(243, 139, 168, 0.1); }

    .action-btn.success {
      color: #a6e3a1;
      border-color: #a6e3a1;
    }

    .action-btn.success:hover { background: rgba(166, 227, 161, 0.1); }

    .action-btn.primary {
      color: #89b4fa;
      border-color: #89b4fa;
    }

    .action-btn.primary:hover { background: rgba(137, 180, 250, 0.1); }

    .merge-wrapper { position: relative; }

    .merge-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      z-index: 200;
      min-width: 160px;
      overflow: hidden;
    }

    .merge-option {
      padding: 0.5rem 0.85rem;
      font-size: 0.82rem;
      color: #cdd6f4;
      cursor: pointer;
      white-space: nowrap;
    }

    .merge-option:hover { background: #313244; }

    .open-github-btn {
      padding: 0.3rem 0.75rem;
      font-size: 0.78rem;
      border: 1px solid #45475a;
      border-radius: 6px;
      background: transparent;
      color: #89b4fa;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .open-github-btn:hover {
      background: rgba(137, 180, 250, 0.1);
      border-color: #89b4fa;
    }

    .detail-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.78rem;
      color: #a6adc8;
    }

    .branch-flow {
      font-family: monospace;
      font-size: 0.78rem;
      color: #89b4fa;
    }

    .detail-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .section-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: #a6adc8;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      margin-bottom: 0.5rem;
    }

    .pr-body {
      font-size: 0.85rem;
      color: #cdd6f4;
      line-height: 1.6;
      white-space: pre-wrap;
      font-family: inherit;
      background: #181825;
      padding: 0.75rem;
      border-radius: 6px;
      border: 1px solid #313244;
      margin: 0;
    }

    .ci-indicator {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.78rem;
    }

    .ci-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .ci-dot.passing { background: #a6e3a1; }
    .ci-dot.failing { background: #f38ba8; }

    .files-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .file-entry {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.4rem 0.6rem;
      background: #181825;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .file-status {
      font-size: 0.7rem;
      font-weight: 700;
      width: 18px;
      text-align: center;
      flex-shrink: 0;
    }

    .file-status-added { color: #a6e3a1; }
    .file-status-removed { color: #f38ba8; }
    .file-status-modified { color: #fab387; }
    .file-status-renamed { color: #89b4fa; }

    .file-name {
      flex: 1;
      color: #cdd6f4;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: monospace;
    }

    .file-stats { font-size: 0.72rem; color: #8f96b3; white-space: nowrap; flex-shrink: 0; }
    .file-stat-add { color: #a6e3a1; }
    .file-stat-del { color: #f38ba8; }

    .reviews-list { display: flex; flex-direction: column; gap: 0.4rem; }

    .review-entry {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.4rem 0.6rem;
      background: #181825;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .review-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }

    .review-avatar-fallback {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #89b4fa, #fab387);
      color: #11111b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .review-login { color: #cdd6f4; font-weight: 600; }
    .review-state-approved { color: #a6e3a1; }
    .review-state-changes { color: #f38ba8; }
    .review-state-commented { color: #a6adc8; }

    /* Edit form */
    .edit-form {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      border-bottom: 1px solid #313244;
      background: #181825;
    }

    .edit-form input, .edit-form textarea {
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 6px;
      color: #cdd6f4;
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
      font-family: inherit;
      width: 100%;
      box-sizing: border-box;
    }

    .edit-form textarea {
      min-height: 100px;
      resize: vertical;
      line-height: 1.5;
    }

    .edit-form input:focus, .edit-form textarea:focus {
      outline: none;
      border-color: #89b4fa;
    }

    .edit-form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }

    /* Create form */
    .create-form {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .create-form-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #eef1ff;
      margin-bottom: 0.25rem;
    }

    .form-label {
      font-size: 0.78rem;
      color: #a6adc8;
      margin-bottom: 0.25rem;
      display: block;
    }

    .create-form input, .create-form textarea {
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 6px;
      color: #cdd6f4;
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
      font-family: inherit;
      width: 100%;
      box-sizing: border-box;
    }

    .create-form textarea {
      min-height: 120px;
      resize: vertical;
      line-height: 1.5;
    }

    .create-form input:focus, .create-form textarea:focus {
      outline: none;
      border-color: #89b4fa;
    }

    .form-row { display: flex; gap: 0.75rem; }
    .form-row > div { flex: 1; }

    .form-check {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #a6adc8;
      cursor: pointer;
    }

    .create-form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.25rem; }

    .placeholder-detail {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      color: #6c7086;
      font-size: 0.9rem;
    }

    .placeholder-icon { font-size: 2.5rem; }

    .loading, .error-msg, .empty-msg {
      padding: 2rem 1rem;
      text-align: center;
      color: #6c7086;
      font-size: 0.88rem;
    }

    .error-msg { color: #f38ba8; }
    .action-error { color: #f38ba8; font-size: 0.8rem; padding: 0.5rem 1rem; background: rgba(243,139,168,0.08); border-radius: 4px; }
  `;

  @property() repoId = '';

  @state() private prs: PullRequestListItem[] = [];
  @state() private selectedPr: PullRequestDetail | null = null;
  @state() private selectedNumber: number | null = null;
  @state() private stateFilter: 'open' | 'closed' | 'all' = 'open';
  @state() private loading = false;
  @state() private loadingDetail = false;
  @state() private error: string | null = null;
  @state() private detailError: string | null = null;
  @state() private actionBusy = false;
  @state() private actionError: string | null = null;
  @state() private showMergeDropdown = false;
  @state() private showEditForm = false;
  @state() private showCreateForm = false;
  @state() private editTitle = '';
  @state() private editBody = '';
  @state() private createTitle = '';
  @state() private createBody = '';
  @state() private createHead = '';
  @state() private createBase = '';
  @state() private createDraft = false;

  connectedCallback() {
    super.connectedCallback();
    if (this.repoId) this.loadPrs();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('repoId') && this.repoId) {
      this.prs = [];
      this.selectedPr = null;
      this.selectedNumber = null;
      this.error = null;
      this.showCreateForm = false;
      this.loadPrs();
    }
  }

  private async loadPrs() {
    const requestedRepoId = this.repoId;
    this.loading = true;
    this.error = null;
    try {
      const result = await repositoryService.getPullRequests(requestedRepoId, this.stateFilter);
      if (this.repoId !== requestedRepoId) return;
      this.prs = result;
    } catch (e: unknown) {
      if (this.repoId !== requestedRepoId) return;
      this.error = e instanceof Error ? e.message : 'Fehler beim Laden der Pull Requests.';
    } finally {
      if (this.repoId === requestedRepoId) this.loading = false;
    }
  }

  private async selectPr(number: number) {
    const requestedRepoId = this.repoId;
    this.selectedNumber = number;
    this.selectedPr = null;
    this.detailError = null;
    this.actionError = null;
    this.showEditForm = false;
    this.showMergeDropdown = false;
    this.showCreateForm = false;
    this.loadingDetail = true;
    try {
      const result = await repositoryService.getPullRequestDetail(requestedRepoId, number);
      if (this.repoId !== requestedRepoId || this.selectedNumber !== number) return;
      this.selectedPr = result;
    } catch (e: unknown) {
      if (this.repoId !== requestedRepoId || this.selectedNumber !== number) return;
      this.detailError = e instanceof Error ? e.message : 'Fehler beim Laden des PR-Details.';
    } finally {
      if (this.repoId === requestedRepoId && this.selectedNumber === number) this.loadingDetail = false;
    }
  }

  private async setFilter(filter: 'open' | 'closed' | 'all') {
    if (this.stateFilter === filter) return;
    this.stateFilter = filter;
    this.selectedPr = null;
    this.selectedNumber = null;
    await this.loadPrs();
  }

  private async _doClose() {
    if (!this.selectedNumber) return;
    this.actionBusy = true;
    this.actionError = null;
    try {
      await repositoryService.closePullRequest(this.repoId, this.selectedNumber);
      await this.selectPr(this.selectedNumber);
      await this.loadPrs();
    } catch (e: unknown) {
      this.actionError = e instanceof Error ? e.message : 'Fehler beim Schließen.';
    } finally {
      this.actionBusy = false;
    }
  }

  private async _doReopen() {
    if (!this.selectedNumber) return;
    this.actionBusy = true;
    this.actionError = null;
    try {
      await repositoryService.reopenPullRequest(this.repoId, this.selectedNumber);
      await this.selectPr(this.selectedNumber);
      await this.loadPrs();
    } catch (e: unknown) {
      this.actionError = e instanceof Error ? e.message : 'Fehler beim Wiedereröffnen.';
    } finally {
      this.actionBusy = false;
    }
  }

  private async _doMerge(method: 'merge' | 'squash' | 'rebase') {
    if (!this.selectedNumber) return;
    this.showMergeDropdown = false;
    this.actionBusy = true;
    this.actionError = null;
    try {
      await repositoryService.mergePullRequest(this.repoId, this.selectedNumber, method);
      await this.selectPr(this.selectedNumber);
      await this.loadPrs();
    } catch (e: unknown) {
      this.actionError = e instanceof Error ? e.message : 'Fehler beim Mergen.';
    } finally {
      this.actionBusy = false;
    }
  }

  private _openEditForm() {
    if (!this.selectedPr) return;
    this.editTitle = this.selectedPr.title;
    this.editBody = this.selectedPr.body;
    this.showEditForm = true;
  }

  private async _doEdit() {
    if (!this.selectedNumber) return;
    this.actionBusy = true;
    this.actionError = null;
    try {
      await repositoryService.editPullRequest(this.repoId, this.selectedNumber, this.editTitle || undefined, this.editBody || undefined);
      this.showEditForm = false;
      await this.selectPr(this.selectedNumber);
    } catch (e: unknown) {
      this.actionError = e instanceof Error ? e.message : 'Fehler beim Bearbeiten.';
    } finally {
      this.actionBusy = false;
    }
  }

  private async _doCreate() {
    if (!this.createTitle || !this.createHead || !this.createBase) {
      this.actionError = 'Titel, Head-Branch und Base-Branch sind Pflichtfelder.';
      return;
    }
    this.actionBusy = true;
    this.actionError = null;
    try {
      const pr = await repositoryService.createPullRequest(
        this.repoId, this.createTitle, this.createBody,
        this.createHead, this.createBase, this.createDraft);
      this.showCreateForm = false;
      this.createTitle = '';
      this.createBody = '';
      this.createHead = '';
      this.createBase = '';
      this.createDraft = false;
      await this.loadPrs();
      await this.selectPr(pr.number);
    } catch (e: unknown) {
      this.actionError = e instanceof Error ? e.message : 'Fehler beim Erstellen.';
    } finally {
      this.actionBusy = false;
    }
  }

  private renderStateBadge(state: string, isDraft: boolean) {
    if (isDraft) return html`<span class="badge badge-draft">Draft</span>`;
    const s = state.toLowerCase();
    if (s === 'merged') return html`<span class="badge badge-merged">Merged</span>`;
    if (s === 'closed') return html`<span class="badge badge-closed">Closed</span>`;
    return html`<span class="badge badge-open">Open</span>`;
  }

  private renderAvatar(avatarUrl: string, login: string, size: 'small' | 'medium' = 'small') {
    if (size === 'small') {
      return avatarUrl
        ? html`<img class="avatar-small" src=${avatarUrl} alt=${login} />`
        : html`<div class="avatar-fallback-small">${login.charAt(0).toUpperCase()}</div>`;
    }
    return avatarUrl
      ? html`<img class="review-avatar" src=${avatarUrl} alt=${login} />`
      : html`<div class="review-avatar-fallback">${login.charAt(0).toUpperCase()}</div>`;
  }

  private renderFileStatusClass(status: string) {
    if (status === 'added') return 'file-status-added';
    if (status === 'removed') return 'file-status-removed';
    if (status === 'renamed') return 'file-status-renamed';
    return 'file-status-modified';
  }

  private renderFileStatusChar(status: string) {
    if (status === 'added') return 'A';
    if (status === 'removed') return 'D';
    if (status === 'renamed') return 'R';
    return 'M';
  }

  private renderReviewStateClass(state: string) {
    if (state === 'APPROVED') return 'review-state-approved';
    if (state === 'CHANGES_REQUESTED') return 'review-state-changes';
    return 'review-state-commented';
  }

  private renderReviewStateLabel(state: string) {
    if (state === 'APPROVED') return 'Approved';
    if (state === 'CHANGES_REQUESTED') return 'Changes requested';
    return 'Commented';
  }

  private _renderDetailActions(pr: PullRequestDetail) {
    const busy = this.actionBusy;
    const state = pr.state.toLowerCase();
    const isOpen = state === 'open';
    const isClosed = state === 'closed';
    const isMerged = state === 'merged';

    return html`
      <div class="detail-actions">
        ${isOpen ? html`
          <button class="action-btn" ?disabled=${busy} @click=${this._openEditForm}>Bearbeiten</button>
          <div class="merge-wrapper">
            <button class="action-btn success" ?disabled=${busy}
              @click=${() => this.showMergeDropdown = !this.showMergeDropdown}>
              ⇝ Mergen ▾
            </button>
            ${this.showMergeDropdown ? html`
              <div class="merge-dropdown">
                <div class="merge-option" @click=${() => this._doMerge('merge')}>Merge commit</div>
                <div class="merge-option" @click=${() => this._doMerge('squash')}>Squash and merge</div>
                <div class="merge-option" @click=${() => this._doMerge('rebase')}>Rebase and merge</div>
              </div>
            ` : ''}
          </div>
          <button class="action-btn danger" ?disabled=${busy} @click=${this._doClose}>Schließen</button>
        ` : ''}
        ${isClosed ? html`
          <button class="action-btn success" ?disabled=${busy} @click=${this._doReopen}>Wiedereröffnen</button>
        ` : ''}
        ${isMerged ? '' : ''}
        <button class="open-github-btn"
          @click=${() => window.open(pr.htmlUrl, '_blank')}>
          Auf GitHub ↗
        </button>
      </div>
    `;
  }

  render() {
    return html`
      <div class="list-panel">
        <div class="panel-header">
          <div class="panel-title-row">
            <span class="panel-title">Pull Requests</span>
            <button class="create-btn" @click=${() => { this.showCreateForm = true; this.selectedNumber = null; this.selectedPr = null; this.actionError = null; }}>
              + Neu
            </button>
          </div>
          <div class="filter-row">
            <button class="filter-btn ${this.stateFilter === 'open' ? 'active' : ''}"
              @click=${() => this.setFilter('open')}>Open</button>
            <button class="filter-btn ${this.stateFilter === 'closed' ? 'active' : ''}"
              @click=${() => this.setFilter('closed')}>Closed</button>
            <button class="filter-btn ${this.stateFilter === 'all' ? 'active' : ''}"
              @click=${() => this.setFilter('all')}>All</button>
            <button class="refresh-btn" @click=${() => this.loadPrs()} ?disabled=${this.loading}>
              ↻ Aktualisieren
            </button>
          </div>
        </div>

        <div class="list-scroll">
          ${this.loading
            ? html`<div class="loading">Lade Pull Requests...</div>`
            : this.error
            ? html`<div class="error-msg">${this.error}</div>`
            : this.prs.length === 0
            ? html`<div class="empty-msg">Keine Pull Requests gefunden.</div>`
            : this.prs.map(pr => html`
              <div class="pr-entry ${this.selectedNumber === pr.number ? 'selected' : ''}"
                @click=${() => this.selectPr(pr.number)}>
                <div class="pr-entry-top">
                  <span class="pr-number">#${pr.number}</span>
                  <span class="pr-title">${pr.title}</span>
                </div>
                <div class="pr-entry-meta">
                  ${this.renderStateBadge(pr.state, pr.isDraft)}
                  <div class="pr-author">
                    ${this.renderAvatar(pr.authorAvatarUrl, pr.authorLogin)}
                    <span>${pr.authorLogin}</span>
                  </div>
                  <span class="pr-branch">${pr.headBranch} → ${pr.baseBranch}</span>
                  ${pr.labels.map(l => html`<span class="badge badge-label">${l}</span>`)}
                </div>
              </div>
            `)}
        </div>
      </div>

      <div class="detail-panel">
        ${this.showCreateForm ? html`
          <div class="create-form">
            <div class="create-form-title">Neuer Pull Request</div>

            <div>
              <label class="form-label">Titel *</label>
              <input type="text" .value=${this.createTitle}
                @input=${(e: Event) => this.createTitle = (e.target as HTMLInputElement).value}
                placeholder="PR-Titel" />
            </div>

            <div class="form-row">
              <div>
                <label class="form-label">Head-Branch *</label>
                <input type="text" .value=${this.createHead}
                  @input=${(e: Event) => this.createHead = (e.target as HTMLInputElement).value}
                  placeholder="feature/mein-feature" />
              </div>
              <div>
                <label class="form-label">Base-Branch *</label>
                <input type="text" .value=${this.createBase}
                  @input=${(e: Event) => this.createBase = (e.target as HTMLInputElement).value}
                  placeholder="main" />
              </div>
            </div>

            <div>
              <label class="form-label">Beschreibung</label>
              <textarea .value=${this.createBody}
                @input=${(e: Event) => this.createBody = (e.target as HTMLTextAreaElement).value}
                placeholder="Beschreibung des Pull Requests..."></textarea>
            </div>

            <label class="form-check">
              <input type="checkbox" .checked=${this.createDraft}
                @change=${(e: Event) => this.createDraft = (e.target as HTMLInputElement).checked} />
              Als Draft erstellen
            </label>

            ${this.actionError ? html`<div class="action-error">${this.actionError}</div>` : ''}

            <div class="create-form-actions">
              <button class="action-btn" @click=${() => { this.showCreateForm = false; this.actionError = null; }}>
                Abbrechen
              </button>
              <button class="action-btn primary" ?disabled=${this.actionBusy} @click=${this._doCreate}>
                ${this.actionBusy ? 'Erstelle...' : 'Pull Request erstellen'}
              </button>
            </div>
          </div>
        ` : this.selectedNumber === null
          ? html`
            <div class="placeholder-detail">
              <span class="placeholder-icon">🔀</span>
              <span>Pull Request auswählen</span>
            </div>
          `
          : this.loadingDetail
          ? html`<div class="loading">Lade Details...</div>`
          : this.detailError
          ? html`<div class="error-msg">${this.detailError}</div>`
          : this.selectedPr
          ? html`
            <div class="detail-header">
              <div class="detail-header-top">
                <div class="detail-title">#${this.selectedPr.number} ${this.selectedPr.title}</div>
                ${this._renderDetailActions(this.selectedPr)}
              </div>
              <div class="detail-meta">
                ${this.renderStateBadge(this.selectedPr.state, this.selectedPr.isDraft)}
                <div class="pr-author">
                  ${this.renderAvatar(this.selectedPr.authorAvatarUrl, this.selectedPr.authorLogin)}
                  <span>${this.selectedPr.authorLogin}</span>
                </div>
                <span class="branch-flow">${this.selectedPr.headBranch} → ${this.selectedPr.baseBranch}</span>
                ${this.selectedPr.labels.map(l => html`<span class="badge badge-label">${l}</span>`)}
                ${this.selectedPr.ciHasCombinedStatus ? html`
                  <div class="ci-indicator">
                    <div class="ci-dot ${this.selectedPr.ciPassing ? 'passing' : 'failing'}"></div>
                    <span>CI ${this.selectedPr.ciPassing ? 'bestanden' : 'fehlgeschlagen'}</span>
                  </div>
                ` : ''}
              </div>
              ${this.actionError ? html`<div class="action-error" style="margin-top:0.5rem">${this.actionError}</div>` : ''}
            </div>

            ${this.showEditForm ? html`
              <div class="edit-form">
                <input type="text" .value=${this.editTitle}
                  @input=${(e: Event) => this.editTitle = (e.target as HTMLInputElement).value}
                  placeholder="Titel" />
                <textarea .value=${this.editBody}
                  @input=${(e: Event) => this.editBody = (e.target as HTMLTextAreaElement).value}
                  placeholder="Beschreibung"></textarea>
                <div class="edit-form-actions">
                  <button class="action-btn" @click=${() => this.showEditForm = false}>Abbrechen</button>
                  <button class="action-btn primary" ?disabled=${this.actionBusy} @click=${this._doEdit}>
                    ${this.actionBusy ? 'Speichere...' : 'Speichern'}
                  </button>
                </div>
              </div>
            ` : ''}

            <div class="detail-scroll">
              ${this.selectedPr.body ? html`
                <div>
                  <div class="section-title">Beschreibung</div>
                  <pre class="pr-body">${this.selectedPr.body}</pre>
                </div>
              ` : ''}

              ${this.selectedPr.files.length > 0 ? html`
                <div>
                  <div class="section-title">Geänderte Dateien (${this.selectedPr.files.length})</div>
                  <div class="files-list">
                    ${this.selectedPr.files.map(f => html`
                      <div class="file-entry">
                        <span class="file-status ${this.renderFileStatusClass(f.status)}">
                          ${this.renderFileStatusChar(f.status)}
                        </span>
                        <span class="file-name">${f.fileName}</span>
                        <span class="file-stats">
                          <span class="file-stat-add">+${f.additions}</span>
                          <span> / </span>
                          <span class="file-stat-del">-${f.deletions}</span>
                        </span>
                      </div>
                    `)}
                  </div>
                </div>
              ` : ''}

              ${this.selectedPr.reviews.length > 0 ? html`
                <div>
                  <div class="section-title">Reviews (${this.selectedPr.reviews.length})</div>
                  <div class="reviews-list">
                    ${this.selectedPr.reviews.map(r => html`
                      <div class="review-entry">
                        ${this.renderAvatar(r.reviewerAvatarUrl, r.reviewerLogin, 'medium')}
                        <span class="review-login">${r.reviewerLogin}</span>
                        <span class="${this.renderReviewStateClass(r.state)}">
                          ${this.renderReviewStateLabel(r.state)}
                        </span>
                      </div>
                    `)}
                  </div>
                </div>
              ` : ''}
            </div>
          `
          : ''
        }
      </div>
    `;
  }
}
