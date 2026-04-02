import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  repositoryService,
  type PullRequestListItem,
  type PullRequestDetail,
} from '../services/repository-service';

@customElement('pull-requests-view')
export class PullRequestsView extends LitElement {
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

    .panel-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #eef1ff;
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

    .pr-entry:hover {
      background: #25273a;
    }

    .pr-entry.selected {
      background: #313244;
    }

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
    .ci-dot.none { background: #6c7086; }

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

    .file-stats {
      font-size: 0.72rem;
      color: #8f96b3;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .file-stat-add { color: #a6e3a1; }
    .file-stat-del { color: #f38ba8; }

    .reviews-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .review-entry {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.4rem 0.6rem;
      background: #181825;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .review-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

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

    .placeholder-icon {
      font-size: 2.5rem;
    }

    .loading, .error-msg, .empty-msg {
      padding: 2rem 1rem;
      text-align: center;
      color: #6c7086;
      font-size: 0.88rem;
    }

    .error-msg { color: #f38ba8; }
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

  private renderStateBadge(state: string, isDraft: boolean) {
    if (isDraft) return html`<span class="badge badge-draft">Draft</span>`;
    if (state === 'merged') return html`<span class="badge badge-merged">Merged</span>`;
    if (state === 'closed') return html`<span class="badge badge-closed">Closed</span>`;
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

  render() {
    return html`
      <div class="list-panel">
        <div class="panel-header">
          <span class="panel-title">Pull Requests</span>
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
        ${this.selectedNumber === null
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
                <button class="open-github-btn"
                  @click=${() => window.open(this.selectedPr!.htmlUrl, '_blank')}>
                  Auf GitHub öffnen ↗
                </button>
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
            </div>

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
