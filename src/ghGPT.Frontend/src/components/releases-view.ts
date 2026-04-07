import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import {
  repositoryService,
  type ReleaseListItem,
  type ReleaseDetail,
} from '../services/repository-service';

@customElement('releases-view')
export class ReleasesView extends AppElement {
  @property() repoId = '';

  @state() private releases: ReleaseListItem[] = [];
  @state() private selectedRelease: ReleaseDetail | null = null;
  @state() private selectedTag: string | null = null;
  @state() private loading = false;
  @state() private loadingDetail = false;
  @state() private error: string | null = null;
  @state() private detailError: string | null = null;

  connectedCallback() {
    super.connectedCallback();
    if (this.repoId) this.loadReleases();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('repoId') && this.repoId) {
      this.releases = [];
      this.selectedRelease = null;
      this.selectedTag = null;
      this.error = null;
      this.loadReleases();
    }
  }

  private async loadReleases() {
    const requestedRepoId = this.repoId;
    this.loading = true;
    this.error = null;
    try {
      const result = await repositoryService.getReleases(requestedRepoId);
      if (this.repoId !== requestedRepoId) return;
      this.releases = result;
    } catch (e: unknown) {
      if (this.repoId !== requestedRepoId) return;
      this.error = e instanceof Error ? e.message : 'Fehler beim Laden der Releases.';
    } finally {
      if (this.repoId === requestedRepoId) this.loading = false;
    }
  }

  private async selectRelease(tag: string) {
    const requestedRepoId = this.repoId;
    this.selectedTag = tag;
    this.selectedRelease = null;
    this.detailError = null;
    this.loadingDetail = true;
    try {
      const result = await repositoryService.getReleaseByTag(requestedRepoId, tag);
      if (this.repoId !== requestedRepoId || this.selectedTag !== tag) return;
      this.selectedRelease = result;
    } catch (e: unknown) {
      if (this.repoId !== requestedRepoId || this.selectedTag !== tag) return;
      this.detailError = e instanceof Error ? e.message : 'Fehler beim Laden des Release-Details.';
    } finally {
      if (this.repoId === requestedRepoId && this.selectedTag === tag) this.loadingDetail = false;
    }
  }

  private renderBadges(isDraft: boolean, isPrerelease: boolean, isLatest: boolean) {
    return html`
      ${isLatest ? html`<span data-testid="latest-badge" class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(166,227,161,0.15)] text-cat-green border border-[rgba(166,227,161,0.3)]">Latest</span>` : ''}
      ${isDraft ? html`<span data-testid="draft-badge" class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(166,173,200,0.15)] text-cat-subtext border border-[rgba(166,173,200,0.3)]">Draft</span>` : ''}
      ${isPrerelease ? html`<span data-testid="prerelease-badge" class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(250,179,135,0.15)] text-cat-peach border border-[rgba(250,179,135,0.3)]">Pre-release</span>` : ''}
    `;
  }

  private formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  render() {
    return html`
      <div data-testid="releases-list-panel" class="w-[380px] min-w-[380px] flex flex-col border-r border-cat-border bg-cat-surface overflow-hidden">
        <div class="px-4 py-[0.85rem] border-b border-cat-border flex items-center justify-between shrink-0 bg-cat-surface">
          <span class="text-[0.95rem] font-bold text-[#eef1ff]">Releases</span>
          <button data-testid="refresh-btn"
            class="px-2.5 py-0.5 text-[0.75rem] border border-cat-muted rounded bg-transparent text-cat-subtext cursor-pointer hover:bg-cat-overlay hover:text-cat-text disabled:opacity-45 disabled:cursor-not-allowed"
            @click=${() => this.loadReleases()} ?disabled=${this.loading}>
            ↻ Aktualisieren
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          ${this.loading
            ? html`<div class="p-8 text-center text-cat-subtle text-[0.88rem]">Lade Releases...</div>`
            : this.error
            ? html`<div data-testid="list-error" class="p-8 text-center text-cat-red text-[0.88rem]">${this.error}</div>`
            : this.releases.length === 0
            ? html`<div class="p-8 text-center text-cat-subtle text-[0.88rem]">Keine Releases gefunden.</div>`
            : this.releases.map(r => html`
              <div data-testid="release-item" ?data-latest=${r.isLatest}
                class="px-4 py-[0.85rem] border-b border-[rgba(49,50,68,0.8)] cursor-pointer flex flex-col gap-[0.35rem] hover:bg-[#25273a] ${this.selectedTag === r.tagName ? 'bg-cat-overlay' : ''} ${r.isLatest ? 'border-l-2 border-l-cat-green' : ''}"
                @click=${() => this.selectRelease(r.tagName)}>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-[0.82rem] text-cat-blue font-semibold">${r.tagName}</span>
                  ${r.name && r.name !== r.tagName ? html`<span class="text-[0.82rem] text-[#eef1ff] truncate flex-1">${r.name}</span>` : ''}
                </div>
                <div class="flex flex-wrap items-center gap-[0.4rem] text-[0.74rem] text-[#8f96b3]">
                  ${this.renderBadges(r.isDraft, r.isPrerelease, r.isLatest)}
                  <span>${this.formatDate(r.publishedAt)}</span>
                </div>
              </div>
            `)}
        </div>
      </div>

      <div data-testid="releases-detail-panel" class="flex-1 flex flex-col overflow-hidden min-w-0">
        ${this.selectedTag === null
          ? html`
            <div class="flex-1 flex flex-col items-center justify-center gap-3 text-cat-subtle text-[0.9rem]">
              <span class="text-[2.5rem]">🚀</span>
              <span>Release auswählen</span>
            </div>
          `
          : this.loadingDetail
          ? html`<div class="p-8 text-center text-cat-subtle text-[0.88rem]">Lade Details...</div>`
          : this.detailError
          ? html`<div data-testid="detail-error" class="p-8 text-center text-cat-red text-[0.88rem]">${this.detailError}</div>`
          : this.selectedRelease
          ? html`
            <div data-testid="release-detail-header" class="px-4 py-[0.9rem] border-b border-cat-border bg-cat-surface shrink-0">
              <div class="flex items-start justify-between gap-4 mb-2">
                <div class="flex-1">
                  <div class="font-mono text-cat-blue text-[0.9rem] font-semibold mb-0.5">${this.selectedRelease.tagName}</div>
                  ${this.selectedRelease.name && this.selectedRelease.name !== this.selectedRelease.tagName
                    ? html`<div class="text-[1rem] font-bold text-[#eef1ff] leading-[1.4]">${this.selectedRelease.name}</div>`
                    : ''}
                </div>
                <button
                  class="px-3 py-1 text-[0.78rem] border border-cat-border rounded-md bg-transparent text-cat-blue cursor-pointer whitespace-nowrap shrink-0 hover:bg-[rgba(137,180,250,0.1)] hover:border-cat-blue"
                  @click=${() => window.open(this.selectedRelease!.url, '_blank')}>
                  Auf GitHub ↗
                </button>
              </div>
              <div class="flex flex-wrap items-center gap-2 text-[0.78rem] text-cat-subtext">
                ${this.renderBadges(this.selectedRelease.isDraft, this.selectedRelease.isPrerelease, false)}
                <span>${this.selectedRelease.authorLogin}</span>
                <span>·</span>
                <span>${this.formatDate(this.selectedRelease.publishedAt)}</span>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4">
              ${this.selectedRelease.body ? html`
                <div>
                  <div class="text-[0.8rem] font-bold text-cat-subtext uppercase tracking-[0.07em] mb-2">Changelog</div>
                  <pre data-testid="release-body" class="text-[0.85rem] text-cat-text leading-[1.6] whitespace-pre-wrap font-[inherit] bg-cat-base px-3 py-3 rounded-md border border-cat-border m-0">${this.selectedRelease.body}</pre>
                </div>
              ` : html`
                <div class="text-cat-subtle text-[0.88rem] italic">Kein Changelog vorhanden.</div>
              `}
            </div>
          `
          : ''
        }
      </div>
    `;
  }
}
