import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import {
  repositoryService,
  type PullRequestListItem,
  type PullRequestDetail,
} from '../services/repository-service';
import { renderStateBadge, renderAvatar } from '../utils/render-helpers';

@customElement('pull-requests-view')
export class PullRequestsView extends AppElement {
  @property() repoId = '';
  @property() accountLogin = '';

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
  @state() private showReviewForm = false;
  @state() private reviewBody = '';
  @state() private reviewBusy = false;
  @state() private reviewError: string | null = null;
  @state() private reviewSuccess = false;
  @state() private showCommentForm = false;
  @state() private commentBody = '';
  @state() private commentBusy = false;
  @state() private commentError: string | null = null;
  @state() private commentSuccess = false;

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
    this.showReviewForm = false;
    this.reviewBody = '';
    this.reviewError = null;
    this.reviewSuccess = false;
    this.showCommentForm = false;
    this.commentBody = '';
    this.commentError = null;
    this.commentSuccess = false;
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

  private async _doReview(event: 'approve' | 'request_changes' | 'comment') {
    if (!this.selectedNumber) return;
    if (event !== 'approve' && !this.reviewBody.trim()) {
      this.reviewError = 'Bitte gib einen Review-Kommentar ein.';
      return;
    }
    this.reviewBusy = true;
    this.reviewError = null;
    this.reviewSuccess = false;
    try {
      await repositoryService.createPullRequestReview(
        this.repoId, this.selectedNumber, event, this.reviewBody.trim() || undefined);
      this.reviewBody = '';
      this.showReviewForm = false;
      this.reviewSuccess = true;
      await this.selectPr(this.selectedNumber);
    } catch (e: unknown) {
      this.reviewError = e instanceof Error ? e.message : 'Fehler beim Erstellen des Reviews.';
    } finally {
      this.reviewBusy = false;
    }
  }

  private async _doAddComment() {
    if (!this.commentBody.trim() || !this.selectedNumber) return;
    this.commentBusy = true;
    this.commentError = null;
    this.commentSuccess = false;
    try {
      await repositoryService.addPullRequestComment(this.repoId, this.selectedNumber, this.commentBody.trim());
      this.commentBody = '';
      this.commentSuccess = true;
      setTimeout(() => { this.showCommentForm = false; this.commentSuccess = false; }, 2000);
    } catch (e: unknown) {
      this.commentError = e instanceof Error ? e.message : 'Fehler beim Kommentieren.';
    } finally {
      this.commentBusy = false;
    }
  }

  private renderFileStatusColor(status: string) {
    if (status === 'added') return 'text-cat-green';
    if (status === 'removed') return 'text-cat-red';
    if (status === 'renamed') return 'text-cat-blue';
    return 'text-cat-peach';
  }

  private renderFileStatusChar(status: string) {
    if (status === 'added') return 'A';
    if (status === 'removed') return 'D';
    if (status === 'renamed') return 'R';
    return 'M';
  }

  private renderReviewStateColor(state: string) {
    if (state === 'APPROVED') return 'text-cat-green';
    if (state === 'CHANGES_REQUESTED') return 'text-cat-red';
    return 'text-cat-subtext';
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
      <div class="flex gap-1.5 shrink-0 flex-wrap items-center">
        ${isOpen ? html`
          <button class="px-3 py-1 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-text cursor-pointer whitespace-nowrap hover:bg-cat-overlay disabled:opacity-45 disabled:cursor-not-allowed"
            ?disabled=${busy} @click=${this._openEditForm}>Bearbeiten</button>
          <div class="relative">
            <button class="px-3 py-1 text-[0.78rem] border border-cat-green rounded-md bg-transparent text-cat-green cursor-pointer whitespace-nowrap hover:bg-[rgba(166,227,161,0.1)] disabled:opacity-45 disabled:cursor-not-allowed"
              ?disabled=${busy}
              @click=${() => this.showMergeDropdown = !this.showMergeDropdown}>
              ⇝ Mergen ▾
            </button>
            ${this.showMergeDropdown ? html`
              <div class="absolute top-[calc(100%+4px)] right-0 bg-cat-surface border border-cat-muted rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-[200] min-w-[160px] overflow-hidden">
                <div class="px-3 py-2 text-[0.82rem] text-cat-text cursor-pointer whitespace-nowrap hover:bg-cat-overlay" @click=${() => this._doMerge('merge')}>Merge commit</div>
                <div class="px-3 py-2 text-[0.82rem] text-cat-text cursor-pointer whitespace-nowrap hover:bg-cat-overlay" @click=${() => this._doMerge('squash')}>Squash and merge</div>
                <div class="px-3 py-2 text-[0.82rem] text-cat-text cursor-pointer whitespace-nowrap hover:bg-cat-overlay" @click=${() => this._doMerge('rebase')}>Rebase and merge</div>
              </div>
            ` : ''}
          </div>
          <button class="px-3 py-1 text-[0.78rem] border border-cat-red rounded-md bg-transparent text-cat-red cursor-pointer whitespace-nowrap hover:bg-[rgba(243,139,168,0.1)] disabled:opacity-45 disabled:cursor-not-allowed"
            ?disabled=${busy} @click=${this._doClose}>Schließen</button>
        ` : ''}
        ${isClosed ? html`
          <button class="px-3 py-1 text-[0.78rem] border border-cat-green rounded-md bg-transparent text-cat-green cursor-pointer whitespace-nowrap hover:bg-[rgba(166,227,161,0.1)] disabled:opacity-45 disabled:cursor-not-allowed"
            ?disabled=${busy} @click=${this._doReopen}>Wiedereröffnen</button>
        ` : ''}
        ${isMerged ? '' : ''}
        <button class="px-3 py-1 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-text cursor-pointer whitespace-nowrap hover:bg-cat-overlay"
          @click=${() => { this.showCommentForm = !this.showCommentForm; this.commentError = null; this.commentSuccess = false; }}>
          💬 Kommentar
        </button>
        <button class="px-3 py-1 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-blue cursor-pointer whitespace-nowrap shrink-0 hover:bg-[rgba(137,180,250,0.1)] hover:border-cat-blue"
          @click=${() => window.open(pr.htmlUrl, '_blank')}>
          Auf GitHub ↗
        </button>
      </div>
    `;
  }

  render() {
    return html`
      <div class="w-[380px] min-w-[380px] flex flex-col border-r border-cat-border bg-cat-surface overflow-hidden">
        <div class="px-4 py-[0.85rem] border-b border-cat-border flex flex-col gap-2 shrink-0 bg-cat-surface">
          <div class="flex items-center justify-between">
            <span class="text-[0.95rem] font-bold text-[#eef1ff]">Pull Requests</span>
            <button class="px-2.5 py-0.5 text-[0.75rem] border border-cat-green rounded bg-transparent text-cat-green cursor-pointer hover:bg-[rgba(166,227,161,0.1)]"
              @click=${() => { this.showCreateForm = true; this.selectedNumber = null; this.selectedPr = null; this.actionError = null; }}>
              + Neu
            </button>
          </div>
          <div class="flex gap-1.5 items-center">
            <button class="px-2.5 py-0.5 text-[0.75rem] border border-cat-muted rounded bg-transparent text-cat-subtext cursor-pointer transition-all hover:bg-cat-overlay hover:text-cat-text ${this.stateFilter === 'open' ? 'bg-cat-blue border-cat-blue !text-[#11111b] font-semibold' : ''}"
              @click=${() => this.setFilter('open')}>Open</button>
            <button class="px-2.5 py-0.5 text-[0.75rem] border border-cat-muted rounded bg-transparent text-cat-subtext cursor-pointer transition-all hover:bg-cat-overlay hover:text-cat-text ${this.stateFilter === 'closed' ? 'bg-cat-blue border-cat-blue !text-[#11111b] font-semibold' : ''}"
              @click=${() => this.setFilter('closed')}>Closed</button>
            <button class="px-2.5 py-0.5 text-[0.75rem] border border-cat-muted rounded bg-transparent text-cat-subtext cursor-pointer transition-all hover:bg-cat-overlay hover:text-cat-text ${this.stateFilter === 'all' ? 'bg-cat-blue border-cat-blue !text-[#11111b] font-semibold' : ''}"
              @click=${() => this.setFilter('all')}>All</button>
            <button class="ml-auto px-2.5 py-0.5 text-[0.75rem] border border-cat-muted rounded bg-transparent text-cat-subtext cursor-pointer hover:bg-cat-overlay hover:text-cat-text disabled:opacity-45 disabled:cursor-not-allowed"
              @click=${() => this.loadPrs()} ?disabled=${this.loading}>
              ↻ Aktualisieren
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          ${this.loading
            ? html`<div class="p-8 text-center text-cat-subtle text-[0.88rem]">Lade Pull Requests...</div>`
            : this.error
            ? html`<div class="p-8 text-center text-cat-red text-[0.88rem]">${this.error}</div>`
            : this.prs.length === 0
            ? html`<div class="p-8 text-center text-cat-subtle text-[0.88rem]">Keine Pull Requests gefunden.</div>`
            : this.prs.map(pr => html`
              <div class="px-4 py-[0.85rem] border-b border-[rgba(49,50,68,0.8)] cursor-pointer flex flex-col gap-[0.35rem] hover:bg-[#25273a] ${this.selectedNumber === pr.number ? 'bg-cat-overlay' : ''}"
                @click=${() => this.selectPr(pr.number)}>
                <div class="flex items-start gap-2">
                  <span class="text-[0.75rem] text-[#8f96b3] whitespace-nowrap shrink-0 mt-[0.1rem]">#${pr.number}</span>
                  <span class="text-[0.87rem] font-semibold text-[#eef1ff] leading-[1.3] flex-1 min-w-0 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">${pr.title}</span>
                </div>
                <div class="flex flex-wrap items-center gap-[0.4rem] text-[0.74rem] text-[#8f96b3]">
                  ${renderStateBadge(pr.state, pr.isDraft)}
                  <div class="flex items-center gap-1">
                    ${renderAvatar(pr.authorAvatarUrl, pr.authorLogin)}
                    <span>${pr.authorLogin}</span>
                  </div>
                  <span class="font-mono text-[0.72rem] text-cat-blue">${pr.headBranch} → ${pr.baseBranch}</span>
                  ${pr.labels.map(l => html`<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(137,180,250,0.15)] text-cat-blue border border-[rgba(137,180,250,0.3)]">${l}</span>`)}
                </div>
              </div>
            `)}
        </div>
      </div>

      <div class="flex-1 flex flex-col overflow-hidden min-w-0">
        ${this.showCreateForm ? html`
          <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-[0.85rem]">
            <div class="text-[0.95rem] font-bold text-[#eef1ff] mb-1">Neuer Pull Request</div>

            <div>
              <label class="block text-[0.78rem] text-cat-subtext mb-1">Titel *</label>
              <input class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border focus:outline-none focus:border-cat-blue"
                type="text" .value=${this.createTitle}
                @input=${(e: Event) => this.createTitle = (e.target as HTMLInputElement).value}
                placeholder="PR-Titel" />
            </div>

            <div class="flex gap-3">
              <div class="flex-1">
                <label class="block text-[0.78rem] text-cat-subtext mb-1">Head-Branch *</label>
                <input class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border focus:outline-none focus:border-cat-blue"
                  type="text" .value=${this.createHead}
                  @input=${(e: Event) => this.createHead = (e.target as HTMLInputElement).value}
                  placeholder="feature/mein-feature" />
              </div>
              <div class="flex-1">
                <label class="block text-[0.78rem] text-cat-subtext mb-1">Base-Branch *</label>
                <input class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border focus:outline-none focus:border-cat-blue"
                  type="text" .value=${this.createBase}
                  @input=${(e: Event) => this.createBase = (e.target as HTMLInputElement).value}
                  placeholder="main" />
              </div>
            </div>

            <div>
              <label class="block text-[0.78rem] text-cat-subtext mb-1">Beschreibung</label>
              <textarea class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border min-h-[120px] resize-y leading-[1.5] focus:outline-none focus:border-cat-blue"
                .value=${this.createBody}
                @input=${(e: Event) => this.createBody = (e.target as HTMLTextAreaElement).value}
                placeholder="Beschreibung des Pull Requests..."></textarea>
            </div>

            <label class="flex items-center gap-2 text-[0.85rem] text-cat-subtext cursor-pointer">
              <input type="checkbox" .checked=${this.createDraft}
                @change=${(e: Event) => this.createDraft = (e.target as HTMLInputElement).checked} />
              Als Draft erstellen
            </label>

            ${this.actionError ? html`<div class="text-cat-red text-[0.8rem] px-4 py-2 bg-[rgba(243,139,168,0.08)] rounded">${this.actionError}</div>` : ''}

            <div class="flex gap-2 justify-end mt-1">
              <button class="px-3 py-1 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-text cursor-pointer whitespace-nowrap hover:bg-cat-overlay"
                @click=${() => { this.showCreateForm = false; this.actionError = null; }}>
                Abbrechen
              </button>
              <button class="px-3 py-1 text-[0.78rem] border border-cat-blue rounded-md bg-transparent text-cat-blue cursor-pointer whitespace-nowrap hover:bg-[rgba(137,180,250,0.1)] disabled:opacity-45 disabled:cursor-not-allowed"
                ?disabled=${this.actionBusy} @click=${this._doCreate}>
                ${this.actionBusy ? 'Erstelle...' : 'Pull Request erstellen'}
              </button>
            </div>
          </div>
        ` : this.selectedNumber === null
          ? html`
            <div class="flex-1 flex flex-col items-center justify-center gap-3 text-cat-subtle text-[0.9rem]">
              <span class="text-[2.5rem]">🔀</span>
              <span>Pull Request auswählen</span>
            </div>
          `
          : this.loadingDetail
          ? html`<div class="p-8 text-center text-cat-subtle text-[0.88rem]">Lade Details...</div>`
          : this.detailError
          ? html`<div class="p-8 text-center text-cat-red text-[0.88rem]">${this.detailError}</div>`
          : this.selectedPr
          ? html`
            <div class="px-4 py-[0.9rem] border-b border-cat-border bg-cat-surface shrink-0">
              <div class="flex items-start justify-between gap-4 mb-2">
                <div class="text-[1rem] font-bold text-[#eef1ff] leading-[1.4] flex-1">#${this.selectedPr.number} ${this.selectedPr.title}</div>
                ${this._renderDetailActions(this.selectedPr)}
              </div>
              <div class="flex flex-wrap items-center gap-2 text-[0.78rem] text-cat-subtext">
                ${renderStateBadge(this.selectedPr.state, this.selectedPr.isDraft)}
                <div class="flex items-center gap-1">
                  ${renderAvatar(this.selectedPr.authorAvatarUrl, this.selectedPr.authorLogin)}
                  <span>${this.selectedPr.authorLogin}</span>
                </div>
                <span class="font-mono text-[0.78rem] text-cat-blue">${this.selectedPr.headBranch} → ${this.selectedPr.baseBranch}</span>
                ${this.selectedPr.labels.map(l => html`<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(137,180,250,0.15)] text-cat-blue border border-[rgba(137,180,250,0.3)]">${l}</span>`)}
                ${this.selectedPr.ciHasCombinedStatus ? html`
                  <div class="flex items-center gap-1.5 text-[0.78rem]">
                    <div class="w-2 h-2 rounded-full shrink-0 ${this.selectedPr.ciPassing ? 'bg-cat-green' : 'bg-cat-red'}"></div>
                    <span>CI ${this.selectedPr.ciPassing ? 'bestanden' : 'fehlgeschlagen'}</span>
                  </div>
                ` : ''}
              </div>
              ${this.actionError ? html`<div class="text-cat-red text-[0.8rem] px-4 py-2 bg-[rgba(243,139,168,0.08)] rounded mt-2">${this.actionError}</div>` : ''}
            </div>

            ${this.showEditForm ? html`
              <div class="px-4 py-4 flex flex-col gap-3 border-b border-cat-border bg-cat-base">
                <input class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border focus:outline-none focus:border-cat-blue"
                  type="text" .value=${this.editTitle}
                  @input=${(e: Event) => this.editTitle = (e.target as HTMLInputElement).value}
                  placeholder="Titel" />
                <textarea class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border min-h-[100px] resize-y leading-[1.5] focus:outline-none focus:border-cat-blue"
                  .value=${this.editBody}
                  @input=${(e: Event) => this.editBody = (e.target as HTMLTextAreaElement).value}
                  placeholder="Beschreibung"></textarea>
                <div class="flex gap-2 justify-end">
                  <button class="px-3 py-1 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-text cursor-pointer whitespace-nowrap hover:bg-cat-overlay"
                    @click=${() => this.showEditForm = false}>Abbrechen</button>
                  <button class="px-3 py-1 text-[0.78rem] border border-cat-blue rounded-md bg-transparent text-cat-blue cursor-pointer whitespace-nowrap hover:bg-[rgba(137,180,250,0.1)] disabled:opacity-45 disabled:cursor-not-allowed"
                    ?disabled=${this.actionBusy} @click=${this._doEdit}>
                    ${this.actionBusy ? 'Speichere...' : 'Speichern'}
                  </button>
                </div>
              </div>
            ` : ''}

            ${this.showCommentForm ? html`
              <div class="px-4 py-4 flex flex-col gap-3 border-b border-cat-border bg-cat-base">
                <div class="text-[0.8rem] font-bold text-cat-subtext uppercase tracking-[0.07em]">Kommentar hinzufügen</div>
                <textarea class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border min-h-[80px] resize-y leading-[1.5] focus:outline-none focus:border-cat-blue"
                  .value=${this.commentBody}
                  @input=${(e: Event) => this.commentBody = (e.target as HTMLTextAreaElement).value}
                  placeholder="Kommentar..."></textarea>
                ${this.commentError ? html`<div class="text-cat-red text-[0.8rem]">${this.commentError}</div>` : ''}
                ${this.commentSuccess ? html`<div class="text-cat-green text-[0.8rem]">Kommentar erfolgreich gesendet.</div>` : ''}
                <div class="flex gap-2 justify-end">
                  <button class="px-3 py-1 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-text cursor-pointer whitespace-nowrap hover:bg-cat-overlay"
                    @click=${() => { this.showCommentForm = false; this.commentBody = ''; this.commentError = null; }}>
                    Abbrechen
                  </button>
                  <button class="px-3 py-1 text-[0.78rem] border border-cat-blue rounded-md bg-transparent text-cat-blue cursor-pointer whitespace-nowrap hover:bg-[rgba(137,180,250,0.1)] disabled:opacity-45 disabled:cursor-not-allowed"
                    ?disabled=${this.commentBusy || !this.commentBody.trim()} @click=${this._doAddComment}>
                    ${this.commentBusy ? 'Sende...' : 'Kommentieren'}
                  </button>
                </div>
              </div>
            ` : ''}

            <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
              ${this.selectedPr.body ? html`
                <div>
                  <div class="text-[0.8rem] font-bold text-cat-subtext uppercase tracking-[0.07em] mb-2">Beschreibung</div>
                  <pre class="text-[0.85rem] text-cat-text leading-[1.6] whitespace-pre-wrap font-[inherit] bg-cat-base px-3 py-3 rounded-md border border-cat-border m-0">${this.selectedPr.body}</pre>
                </div>
              ` : ''}

              ${this.selectedPr.files.length > 0 ? html`
                <div>
                  <div class="text-[0.8rem] font-bold text-cat-subtext uppercase tracking-[0.07em] mb-2">Geänderte Dateien (${this.selectedPr.files.length})</div>
                  <div class="flex flex-col gap-1">
                    ${this.selectedPr.files.map(f => html`
                      <div class="flex items-center gap-2.5 px-2.5 py-1.5 bg-cat-base rounded text-[0.8rem]">
                        <span class="text-[0.7rem] font-bold w-[18px] text-center shrink-0 ${this.renderFileStatusColor(f.status)}">
                          ${this.renderFileStatusChar(f.status)}
                        </span>
                        <span class="flex-1 text-cat-text min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono">${f.fileName}</span>
                        <span class="text-[0.72rem] text-[#8f96b3] whitespace-nowrap shrink-0">
                          <span class="text-cat-green">+${f.additions}</span>
                          <span> / </span>
                          <span class="text-cat-red">-${f.deletions}</span>
                        </span>
                      </div>
                    `)}
                  </div>
                </div>
              ` : ''}

              ${this.selectedPr.reviews.length > 0 ? html`
                <div>
                  <div class="text-[0.8rem] font-bold text-cat-subtext uppercase tracking-[0.07em] mb-2">Reviews (${this.selectedPr.reviews.length})</div>
                  <div class="flex flex-col gap-1.5">
                    ${this.selectedPr.reviews.map(r => html`
                      <div class="flex items-center gap-2.5 px-2.5 py-1.5 bg-cat-base rounded text-[0.8rem]">
                        ${renderAvatar(r.reviewerAvatarUrl, r.reviewerLogin, 'medium')}
                        <span class="text-cat-text font-semibold">${r.reviewerLogin}</span>
                        <span class="${this.renderReviewStateColor(r.state)}">
                          ${this.renderReviewStateLabel(r.state)}
                        </span>
                      </div>
                    `)}
                  </div>
                </div>
              ` : ''}

              ${this.selectedPr.state.toLowerCase() === 'open' && (!this.accountLogin || this.selectedPr.authorLogin !== this.accountLogin) ? html`
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="text-[0.8rem] font-bold text-cat-subtext uppercase tracking-[0.07em]">Review erstellen</div>
                    ${!this.showReviewForm ? html`
                      <button class="px-2.5 py-0.5 text-[0.75rem] border border-cat-muted rounded bg-transparent text-cat-subtext cursor-pointer hover:bg-cat-overlay hover:text-cat-text"
                        @click=${() => { this.showReviewForm = true; this.reviewError = null; this.reviewSuccess = false; }}>
                        + Review
                      </button>
                    ` : ''}
                  </div>

                  ${this.reviewSuccess ? html`
                    <div class="text-cat-green text-[0.8rem] px-3 py-2 bg-[rgba(166,227,161,0.08)] rounded border border-[rgba(166,227,161,0.2)]">
                      Review erfolgreich abgeschickt.
                    </div>
                  ` : ''}

                  ${this.showReviewForm ? html`
                    <div class="flex flex-col gap-2.5 p-3 bg-cat-base rounded-lg border border-cat-border">
                      <textarea
                        class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border min-h-[80px] resize-y leading-[1.5] focus:outline-none focus:border-cat-blue"
                        .value=${this.reviewBody}
                        @input=${(e: Event) => this.reviewBody = (e.target as HTMLTextAreaElement).value}
                        placeholder="Review-Kommentar (optional bei Approve, Pflicht bei anderen)..."></textarea>

                      ${this.reviewError ? html`
                        <div class="text-cat-red text-[0.8rem] px-3 py-1.5 bg-[rgba(243,139,168,0.08)] rounded">${this.reviewError}</div>
                      ` : ''}

                      <div class="flex gap-2 flex-wrap">
                        <button
                          class="flex-1 px-3 py-1.5 text-[0.78rem] border border-cat-green rounded-md bg-transparent text-cat-green cursor-pointer hover:bg-[rgba(166,227,161,0.1)] disabled:opacity-45 disabled:cursor-not-allowed"
                          ?disabled=${this.reviewBusy}
                          @click=${() => this._doReview('approve')}>
                          ${this.reviewBusy ? '…' : '✓ Approve'}
                        </button>
                        <button
                          class="flex-1 px-3 py-1.5 text-[0.78rem] border border-cat-red rounded-md bg-transparent text-cat-red cursor-pointer hover:bg-[rgba(243,139,168,0.1)] disabled:opacity-45 disabled:cursor-not-allowed"
                          ?disabled=${this.reviewBusy}
                          @click=${() => this._doReview('request_changes')}>
                          ${this.reviewBusy ? '…' : '✗ Request Changes'}
                        </button>
                        <button
                          class="flex-1 px-3 py-1.5 text-[0.78rem] border border-cat-blue rounded-md bg-transparent text-cat-blue cursor-pointer hover:bg-[rgba(137,180,250,0.1)] disabled:opacity-45 disabled:cursor-not-allowed"
                          ?disabled=${this.reviewBusy}
                          @click=${() => this._doReview('comment')}>
                          ${this.reviewBusy ? '…' : '💬 Comment'}
                        </button>
                        <button
                          class="px-3 py-1.5 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-subtext cursor-pointer hover:bg-cat-overlay disabled:opacity-45 disabled:cursor-not-allowed"
                          ?disabled=${this.reviewBusy}
                          @click=${() => { this.showReviewForm = false; this.reviewError = null; }}>
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ` : ''}
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
