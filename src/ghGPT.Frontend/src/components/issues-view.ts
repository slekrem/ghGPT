import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import {
  repositoryService,
  type IssueListItem,
  type IssueDetail,
} from '../services/repository-service';

@customElement('issues-view')
export class IssuesView extends AppElement {
  @property() repoId = '';

  @state() private issues: IssueListItem[] = [];
  @state() private selectedIssue: IssueDetail | null = null;
  @state() private selectedNumber: number | null = null;
  @state() private stateFilter: 'open' | 'closed' | 'all' = 'open';
  @state() private loading = false;
  @state() private loadingDetail = false;
  @state() private error: string | null = null;
  @state() private detailError: string | null = null;
  @state() private actionBusy = false;
  @state() private actionError: string | null = null;
  @state() private showCreateForm = false;
  @state() private showCommentForm = false;
  @state() private createTitle = '';
  @state() private createBody = '';
  @state() private createLabels = '';
  @state() private commentBody = '';

  connectedCallback() {
    super.connectedCallback();
    if (this.repoId) this.loadIssues();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('repoId') && this.repoId) {
      this.issues = [];
      this.selectedIssue = null;
      this.selectedNumber = null;
      this.error = null;
      this.showCreateForm = false;
      this.showCommentForm = false;
      this.loadIssues();
    }
  }

  private async loadIssues() {
    const requestedRepoId = this.repoId;
    this.loading = true;
    this.error = null;
    try {
      const result = await repositoryService.getIssues(requestedRepoId, this.stateFilter);
      if (this.repoId !== requestedRepoId) return;
      this.issues = result;
    } catch (e: unknown) {
      if (this.repoId !== requestedRepoId) return;
      this.error = e instanceof Error ? e.message : 'Fehler beim Laden der Issues.';
    } finally {
      if (this.repoId === requestedRepoId) this.loading = false;
    }
  }

  private async selectIssue(number: number) {
    const requestedRepoId = this.repoId;
    this.selectedNumber = number;
    this.selectedIssue = null;
    this.detailError = null;
    this.actionError = null;
    this.showCommentForm = false;
    this.showCreateForm = false;
    this.loadingDetail = true;
    try {
      const result = await repositoryService.getIssueDetail(requestedRepoId, number);
      if (this.repoId !== requestedRepoId || this.selectedNumber !== number) return;
      this.selectedIssue = result;
    } catch (e: unknown) {
      if (this.repoId !== requestedRepoId || this.selectedNumber !== number) return;
      this.detailError = e instanceof Error ? e.message : 'Fehler beim Laden des Issue-Details.';
    } finally {
      if (this.repoId === requestedRepoId && this.selectedNumber === number) this.loadingDetail = false;
    }
  }

  private async setFilter(filter: 'open' | 'closed' | 'all') {
    if (this.stateFilter === filter) return;
    this.stateFilter = filter;
    this.selectedIssue = null;
    this.selectedNumber = null;
    await this.loadIssues();
  }

  private async _doCreate() {
    if (!this.createTitle) {
      this.actionError = 'Titel ist ein Pflichtfeld.';
      return;
    }
    this.actionBusy = true;
    this.actionError = null;
    try {
      const labels = this.createLabels
        ? this.createLabels.split(',').map(l => l.trim()).filter(Boolean)
        : undefined;
      const issue = await repositoryService.createIssue(
        this.repoId, this.createTitle, this.createBody, labels);
      this.showCreateForm = false;
      this.createTitle = '';
      this.createBody = '';
      this.createLabels = '';
      await this.loadIssues();
      await this.selectIssue(issue.number);
    } catch (e: unknown) {
      this.actionError = e instanceof Error ? e.message : 'Fehler beim Erstellen.';
    } finally {
      this.actionBusy = false;
    }
  }

  private async _doAddComment() {
    if (!this.commentBody || !this.selectedNumber) return;
    this.actionBusy = true;
    this.actionError = null;
    try {
      await repositoryService.addIssueComment(this.repoId, this.selectedNumber, this.commentBody);
      this.commentBody = '';
      this.showCommentForm = false;
    } catch (e: unknown) {
      this.actionError = e instanceof Error ? e.message : 'Fehler beim Kommentieren.';
    } finally {
      this.actionBusy = false;
    }
  }

  private renderStateBadge(state: string) {
    const s = state.toLowerCase();
    if (s === 'closed') return html`<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(243,139,168,0.15)] text-cat-red border border-[rgba(243,139,168,0.3)]">Closed</span>`;
    return html`<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(166,227,161,0.15)] text-cat-green border border-[rgba(166,227,161,0.3)]">Open</span>`;
  }

  private renderLabel(name: string, color: string) {
    const hex = color.startsWith('#') ? color : `#${color}`;
    return html`<span
      class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold border"
      style="background:${hex}22;color:${hex};border-color:${hex}55">${name}</span>`;
  }

  render() {
    return html`
      <div data-testid="issues-list-panel" class="w-[380px] min-w-[380px] flex flex-col border-r border-cat-border bg-cat-surface overflow-hidden">
        <div class="px-4 py-[0.85rem] border-b border-cat-border flex flex-col gap-2 shrink-0 bg-cat-surface">
          <div class="flex items-center justify-between">
            <span class="text-[0.95rem] font-bold text-[#eef1ff]">Issues</span>
            <button data-testid="new-issue-btn"
              class="px-2.5 py-0.5 text-[0.75rem] border border-cat-green rounded bg-transparent text-cat-green cursor-pointer hover:bg-[rgba(166,227,161,0.1)]"
              @click=${() => { this.showCreateForm = true; this.selectedNumber = null; this.selectedIssue = null; this.actionError = null; }}>
              + Neu
            </button>
          </div>
          <div class="flex gap-1.5 items-center">
            <button data-testid="filter-open"
              class="px-2.5 py-0.5 text-[0.75rem] border border-cat-muted rounded bg-transparent text-cat-subtext cursor-pointer transition-all hover:bg-cat-overlay hover:text-cat-text ${this.stateFilter === 'open' ? 'bg-cat-blue border-cat-blue !text-[#11111b] font-semibold' : ''}"
              @click=${() => this.setFilter('open')}>Open</button>
            <button data-testid="filter-closed"
              class="px-2.5 py-0.5 text-[0.75rem] border border-cat-muted rounded bg-transparent text-cat-subtext cursor-pointer transition-all hover:bg-cat-overlay hover:text-cat-text ${this.stateFilter === 'closed' ? 'bg-cat-blue border-cat-blue !text-[#11111b] font-semibold' : ''}"
              @click=${() => this.setFilter('closed')}>Closed</button>
            <button data-testid="filter-all"
              class="px-2.5 py-0.5 text-[0.75rem] border border-cat-muted rounded bg-transparent text-cat-subtext cursor-pointer transition-all hover:bg-cat-overlay hover:text-cat-text ${this.stateFilter === 'all' ? 'bg-cat-blue border-cat-blue !text-[#11111b] font-semibold' : ''}"
              @click=${() => this.setFilter('all')}>All</button>
            <button data-testid="refresh-btn"
              class="ml-auto px-2.5 py-0.5 text-[0.75rem] border border-cat-muted rounded bg-transparent text-cat-subtext cursor-pointer hover:bg-cat-overlay hover:text-cat-text disabled:opacity-45 disabled:cursor-not-allowed"
              @click=${() => this.loadIssues()} ?disabled=${this.loading}>
              ↻ Aktualisieren
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          ${this.loading
            ? html`<div class="p-8 text-center text-cat-subtle text-[0.88rem]">Lade Issues...</div>`
            : this.error
            ? html`<div data-testid="list-error" class="p-8 text-center text-cat-red text-[0.88rem]">${this.error}</div>`
            : this.issues.length === 0
            ? html`<div class="p-8 text-center text-cat-subtle text-[0.88rem]">Keine Issues gefunden.</div>`
            : this.issues.map(issue => html`
              <div data-testid="issue-item"
                class="px-4 py-[0.85rem] border-b border-[rgba(49,50,68,0.8)] cursor-pointer flex flex-col gap-[0.35rem] hover:bg-[#25273a] ${this.selectedNumber === issue.number ? 'bg-cat-overlay' : ''}"
                @click=${() => this.selectIssue(issue.number)}>
                <div class="flex items-start gap-2">
                  <span class="text-[0.75rem] text-[#8f96b3] whitespace-nowrap shrink-0 mt-[0.1rem]">#${issue.number}</span>
                  <span class="text-[0.87rem] font-semibold text-[#eef1ff] leading-[1.3] flex-1 min-w-0 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">${issue.title}</span>
                </div>
                <div class="flex flex-wrap items-center gap-[0.4rem] text-[0.74rem] text-[#8f96b3]">
                  ${this.renderStateBadge(issue.state)}
                  <span>${issue.authorLogin}</span>
                  ${issue.labels.map(l => this.renderLabel(l.name, l.color))}
                </div>
              </div>
            `)}
        </div>
      </div>

      <div data-testid="issues-detail-panel" class="flex-1 flex flex-col overflow-hidden min-w-0">
        ${this.showCreateForm ? html`
          <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-[0.85rem]">
            <div class="text-[0.95rem] font-bold text-[#eef1ff] mb-1">Neues Issue</div>

            <div>
              <label class="block text-[0.78rem] text-cat-subtext mb-1">Titel *</label>
              <input data-testid="create-title-input"
                class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border focus:outline-none focus:border-cat-blue"
                type="text" .value=${this.createTitle}
                @input=${(e: Event) => this.createTitle = (e.target as HTMLInputElement).value}
                placeholder="Issue-Titel" />
            </div>

            <div>
              <label class="block text-[0.78rem] text-cat-subtext mb-1">Beschreibung</label>
              <textarea data-testid="create-body-input"
                class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border min-h-[120px] resize-y leading-[1.5] focus:outline-none focus:border-cat-blue"
                .value=${this.createBody}
                @input=${(e: Event) => this.createBody = (e.target as HTMLTextAreaElement).value}
                placeholder="Beschreibung des Issues..."></textarea>
            </div>

            <div>
              <label class="block text-[0.78rem] text-cat-subtext mb-1">Labels (kommasepariert)</label>
              <input data-testid="create-labels-input"
                class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border focus:outline-none focus:border-cat-blue"
                type="text" .value=${this.createLabels}
                @input=${(e: Event) => this.createLabels = (e.target as HTMLInputElement).value}
                placeholder="bug, enhancement" />
            </div>

            ${this.actionError ? html`<div data-testid="create-error" class="text-cat-red text-[0.8rem] px-4 py-2 bg-[rgba(243,139,168,0.08)] rounded">${this.actionError}</div>` : ''}

            <div class="flex gap-2 justify-end mt-1">
              <button class="px-3 py-1 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-text cursor-pointer whitespace-nowrap hover:bg-cat-overlay"
                @click=${() => { this.showCreateForm = false; this.actionError = null; }}>
                Abbrechen
              </button>
              <button data-testid="create-issue-btn"
                class="px-3 py-1 text-[0.78rem] border border-cat-blue rounded-md bg-transparent text-cat-blue cursor-pointer whitespace-nowrap hover:bg-[rgba(137,180,250,0.1)] disabled:opacity-45 disabled:cursor-not-allowed"
                ?disabled=${this.actionBusy} @click=${this._doCreate}>
                ${this.actionBusy ? 'Erstelle...' : 'Issue erstellen'}
              </button>
            </div>
          </div>
        ` : this.selectedNumber === null
          ? html`
            <div class="flex-1 flex flex-col items-center justify-center gap-3 text-cat-subtle text-[0.9rem]">
              <span class="text-[2.5rem]">🐛</span>
              <span>Issue auswählen</span>
            </div>
          `
          : this.loadingDetail
          ? html`<div class="p-8 text-center text-cat-subtle text-[0.88rem]">Lade Details...</div>`
          : this.detailError
          ? html`<div data-testid="detail-error" class="p-8 text-center text-cat-red text-[0.88rem]">${this.detailError}</div>`
          : this.selectedIssue
          ? html`
            <div data-testid="issue-detail-header" class="px-4 py-[0.9rem] border-b border-cat-border bg-cat-surface shrink-0">
              <div class="flex items-start justify-between gap-4 mb-2">
                <div class="text-[1rem] font-bold text-[#eef1ff] leading-[1.4] flex-1">#${this.selectedIssue.number} ${this.selectedIssue.title}</div>
                <div class="flex gap-1.5 shrink-0 items-center">
                  <button data-testid="add-comment-btn"
                    class="px-3 py-1 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-text cursor-pointer whitespace-nowrap hover:bg-cat-overlay"
                    @click=${() => { this.showCommentForm = !this.showCommentForm; this.actionError = null; }}>
                    💬 Kommentar
                  </button>
                  <button
                    class="px-3 py-1 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-blue cursor-pointer whitespace-nowrap shrink-0 hover:bg-[rgba(137,180,250,0.1)] hover:border-cat-blue"
                    @click=${() => window.open(this.selectedIssue!.url, '_blank')}>
                    Auf GitHub ↗
                  </button>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2 text-[0.78rem] text-cat-subtext">
                ${this.renderStateBadge(this.selectedIssue.state)}
                <span>${this.selectedIssue.authorLogin}</span>
                ${this.selectedIssue.assignees.length > 0 ? html`
                  <span class="text-cat-subtle">→</span>
                  ${this.selectedIssue.assignees.map(a => html`<span class="text-cat-subtext">${a}</span>`)}
                ` : ''}
                ${this.selectedIssue.labels.map(l => this.renderLabel(l.name, l.color))}
              </div>
              ${this.actionError ? html`<div class="text-cat-red text-[0.8rem] px-4 py-2 bg-[rgba(243,139,168,0.08)] rounded mt-2">${this.actionError}</div>` : ''}
            </div>

            ${this.showCommentForm ? html`
              <div class="px-4 py-4 flex flex-col gap-3 border-b border-cat-border bg-cat-base">
                <div class="text-[0.8rem] font-bold text-cat-subtext uppercase tracking-[0.07em]">Kommentar hinzufügen</div>
                <textarea data-testid="comment-body-input"
                  class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border min-h-[80px] resize-y leading-[1.5] focus:outline-none focus:border-cat-blue"
                  .value=${this.commentBody}
                  @input=${(e: Event) => this.commentBody = (e.target as HTMLTextAreaElement).value}
                  placeholder="Kommentar..."></textarea>
                <div class="flex gap-2 justify-end">
                  <button class="px-3 py-1 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-text cursor-pointer whitespace-nowrap hover:bg-cat-overlay"
                    @click=${() => { this.showCommentForm = false; this.commentBody = ''; this.actionError = null; }}>
                    Abbrechen
                  </button>
                  <button data-testid="submit-comment-btn"
                    class="px-3 py-1 text-[0.78rem] border border-cat-blue rounded-md bg-transparent text-cat-blue cursor-pointer whitespace-nowrap hover:bg-[rgba(137,180,250,0.1)] disabled:opacity-45 disabled:cursor-not-allowed"
                    ?disabled=${this.actionBusy || !this.commentBody} @click=${this._doAddComment}>
                    ${this.actionBusy ? 'Sende...' : 'Kommentieren'}
                  </button>
                </div>
              </div>
            ` : ''}

            <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
              ${this.selectedIssue.body ? html`
                <div>
                  <div class="text-[0.8rem] font-bold text-cat-subtext uppercase tracking-[0.07em] mb-2">Beschreibung</div>
                  <pre class="text-[0.85rem] text-cat-text leading-[1.6] whitespace-pre-wrap font-[inherit] bg-cat-base px-3 py-3 rounded-md border border-cat-border m-0">${this.selectedIssue.body}</pre>
                </div>
              ` : html`
                <div class="text-cat-subtle text-[0.88rem] italic">Keine Beschreibung vorhanden.</div>
              `}
            </div>
          `
          : ''
        }
      </div>
    `;
  }
}
