import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import {
  repositoryService,
  type DiscussionItem,
} from '../services/repository-service';

@customElement('discussions-view')
export class DiscussionsView extends AppElement {
  @property() repoId = '';

  @state() private discussions: DiscussionItem[] = [];
  @state() private selected: DiscussionItem | null = null;
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private actionBusy = false;
  @state() private actionError: string | null = null;
  @state() private showCreateForm = false;
  @state() private createTitle = '';
  @state() private createBody = '';
  @state() private createCategory = 'General';

  connectedCallback() {
    super.connectedCallback();
    if (this.repoId) this.loadDiscussions();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('repoId') && this.repoId) {
      this.discussions = [];
      this.selected = null;
      this.error = null;
      this.showCreateForm = false;
      this.loadDiscussions();
    }
  }

  private async loadDiscussions() {
    const requestedRepoId = this.repoId;
    this.loading = true;
    this.error = null;
    try {
      const result = await repositoryService.getDiscussions(requestedRepoId);
      if (this.repoId !== requestedRepoId) return;
      this.discussions = result;
    } catch (e: unknown) {
      if (this.repoId !== requestedRepoId) return;
      this.error = e instanceof Error ? e.message : 'Fehler beim Laden der Discussions.';
    } finally {
      if (this.repoId === requestedRepoId) this.loading = false;
    }
  }

  private async _doCreate() {
    if (!this.createTitle) {
      this.actionError = 'Titel ist ein Pflichtfeld.';
      return;
    }
    this.actionBusy = true;
    this.actionError = null;
    try {
      const discussion = await repositoryService.createDiscussion(
        this.repoId, this.createTitle, this.createBody, this.createCategory || 'General');
      this.showCreateForm = false;
      this.createTitle = '';
      this.createBody = '';
      this.createCategory = 'General';
      await this.loadDiscussions();
      this.selected = discussion;
    } catch (e: unknown) {
      this.actionError = e instanceof Error ? e.message : 'Fehler beim Erstellen.';
    } finally {
      this.actionBusy = false;
    }
  }

  private formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  render() {
    return html`
      <div data-testid="discussions-list-panel" class="w-[380px] min-w-[380px] flex flex-col border-r border-cat-border bg-cat-surface overflow-hidden">
        <div class="px-4 py-[0.85rem] border-b border-cat-border flex items-center justify-between shrink-0 bg-cat-surface">
          <span class="text-[0.95rem] font-bold text-[#eef1ff]">Discussions</span>
          <div class="flex gap-1.5">
            <button data-testid="new-discussion-btn"
              class="px-2.5 py-0.5 text-[0.75rem] border border-cat-green rounded bg-transparent text-cat-green cursor-pointer hover:bg-[rgba(166,227,161,0.1)]"
              @click=${() => { this.showCreateForm = true; this.selected = null; this.actionError = null; }}>
              + Neu
            </button>
            <button data-testid="refresh-btn"
              class="px-2.5 py-0.5 text-[0.75rem] border border-cat-muted rounded bg-transparent text-cat-subtext cursor-pointer hover:bg-cat-overlay hover:text-cat-text disabled:opacity-45 disabled:cursor-not-allowed"
              @click=${() => this.loadDiscussions()} ?disabled=${this.loading}>
              ↻
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          ${this.loading
            ? html`<div class="p-8 text-center text-cat-subtle text-[0.88rem]">Lade Discussions...</div>`
            : this.error
            ? html`<div data-testid="list-error" class="p-8 text-center text-cat-red text-[0.88rem]">${this.error}</div>`
            : this.discussions.length === 0
            ? html`<div class="p-8 text-center text-cat-subtle text-[0.88rem]">Keine Discussions gefunden.</div>`
            : this.discussions.map(d => html`
              <div data-testid="discussion-item"
                class="px-4 py-[0.85rem] border-b border-[rgba(49,50,68,0.8)] cursor-pointer flex flex-col gap-[0.35rem] hover:bg-[#25273a] ${this.selected?.number === d.number ? 'bg-cat-overlay' : ''}"
                @click=${() => { this.selected = d; this.showCreateForm = false; this.actionError = null; }}>
                <div class="flex items-start gap-2">
                  <span class="text-[0.75rem] text-[#8f96b3] whitespace-nowrap shrink-0 mt-[0.1rem]">#${d.number}</span>
                  <span class="text-[0.87rem] font-semibold text-[#eef1ff] leading-[1.3] flex-1 min-w-0 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">${d.title}</span>
                </div>
                <div class="flex flex-wrap items-center gap-[0.4rem] text-[0.74rem] text-[#8f96b3]">
                  ${d.categoryName ? html`<span data-testid="category-badge" class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(203,166,247,0.15)] text-[#cba6f7] border border-[rgba(203,166,247,0.3)]">${d.categoryName}</span>` : ''}
                  <span>${d.authorLogin}</span>
                  <span>·</span>
                  <span>${this.formatDate(d.createdAt)}</span>
                </div>
              </div>
            `)}
        </div>
      </div>

      <div data-testid="discussions-detail-panel" class="flex-1 flex flex-col overflow-hidden min-w-0">
        ${this.showCreateForm ? html`
          <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-[0.85rem]">
            <div class="text-[0.95rem] font-bold text-[#eef1ff] mb-1">Neue Discussion</div>

            <div>
              <label class="block text-[0.78rem] text-cat-subtext mb-1">Titel *</label>
              <input data-testid="create-title-input"
                class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border focus:outline-none focus:border-cat-blue"
                type="text" .value=${this.createTitle}
                @input=${(e: Event) => this.createTitle = (e.target as HTMLInputElement).value}
                placeholder="Discussion-Titel" />
            </div>

            <div>
              <label class="block text-[0.78rem] text-cat-subtext mb-1">Kategorie</label>
              <input data-testid="create-category-input"
                class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border focus:outline-none focus:border-cat-blue"
                type="text" .value=${this.createCategory}
                @input=${(e: Event) => this.createCategory = (e.target as HTMLInputElement).value}
                placeholder="General" />
            </div>

            <div>
              <label class="block text-[0.78rem] text-cat-subtext mb-1">Inhalt</label>
              <textarea data-testid="create-body-input"
                class="bg-cat-surface border border-cat-muted rounded-md text-cat-text text-[0.875rem] px-3 py-2 font-[inherit] w-full box-border min-h-[140px] resize-y leading-[1.5] focus:outline-none focus:border-cat-blue"
                .value=${this.createBody}
                @input=${(e: Event) => this.createBody = (e.target as HTMLTextAreaElement).value}
                placeholder="Was möchtest du diskutieren?"></textarea>
            </div>

            ${this.actionError ? html`<div data-testid="create-error" class="text-cat-red text-[0.8rem] px-4 py-2 bg-[rgba(243,139,168,0.08)] rounded">${this.actionError}</div>` : ''}

            <div class="flex gap-2 justify-end mt-1">
              <button class="px-3 py-1 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-text cursor-pointer whitespace-nowrap hover:bg-cat-overlay"
                @click=${() => { this.showCreateForm = false; this.actionError = null; }}>
                Abbrechen
              </button>
              <button data-testid="create-discussion-btn"
                class="px-3 py-1 text-[0.78rem] border border-cat-blue rounded-md bg-transparent text-cat-blue cursor-pointer whitespace-nowrap hover:bg-[rgba(137,180,250,0.1)] disabled:opacity-45 disabled:cursor-not-allowed"
                ?disabled=${this.actionBusy} @click=${this._doCreate}>
                ${this.actionBusy ? 'Erstelle...' : 'Discussion erstellen'}
              </button>
            </div>
          </div>
        ` : this.selected === null
          ? html`
            <div class="flex-1 flex flex-col items-center justify-center gap-3 text-cat-subtle text-[0.9rem]">
              <span class="text-[2.5rem]">💬</span>
              <span>Discussion auswählen</span>
            </div>
          `
          : html`
            <div data-testid="discussion-detail-header" class="px-4 py-[0.9rem] border-b border-cat-border bg-cat-surface shrink-0">
              <div class="flex items-start justify-between gap-4 mb-2">
                <div class="flex-1">
                  <div class="text-[1rem] font-bold text-[#eef1ff] leading-[1.4]">#${this.selected.number} ${this.selected.title}</div>
                </div>
                <button
                  class="px-3 py-1 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-blue cursor-pointer whitespace-nowrap shrink-0 hover:bg-[rgba(137,180,250,0.1)] hover:border-cat-blue"
                  @click=${() => window.open(this.selected!.url, '_blank')}>
                  Auf GitHub ↗
                </button>
              </div>
              <div class="flex flex-wrap items-center gap-2 text-[0.78rem] text-cat-subtext">
                ${this.selected.categoryName ? html`<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(203,166,247,0.15)] text-[#cba6f7] border border-[rgba(203,166,247,0.3)]">${this.selected.categoryName}</span>` : ''}
                <span>${this.selected.authorLogin}</span>
                <span>·</span>
                <span>${this.formatDate(this.selected.createdAt)}</span>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4">
              ${this.selected.body ? html`
                <pre data-testid="discussion-body" class="text-[0.85rem] text-cat-text leading-[1.6] whitespace-pre-wrap font-[inherit] bg-cat-base px-3 py-3 rounded-md border border-cat-border m-0">${this.selected.body}</pre>
              ` : html`
                <div class="text-cat-subtle text-[0.88rem] italic">Kein Inhalt vorhanden.</div>
              `}
            </div>
          `
        }
      </div>
    `;
  }
}
