import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import { repositoryService, type StashEntry } from '../services/repository-service';

@customElement('stashes-view')
export class StashesView extends AppElement {
  @property() repoId = '';

  @state() private stashes: StashEntry[] = [];
  @state() private loading = false;
  @state() private error = '';

  updated(changed: Map<string, unknown>) {
    if (changed.has('repoId') && this.repoId) this.load();
  }

  private async load() {
    this.loading = true;
    this.error = '';
    try {
      this.stashes = await repositoryService.getStashes(this.repoId);
    } catch (err) {
      this.error = (err as Error).message;
    } finally {
      this.loading = false;
    }
  }

  private async pop(index: number) {
    this.error = '';
    try {
      await repositoryService.popStash(this.repoId, index);
      await this.load();
      this.dispatchEvent(new CustomEvent('stash-popped', { bubbles: true, composed: true }));
    } catch (err) {
      this.error = (err as Error).message;
    }
  }

  private async drop(index: number) {
    if (!confirm(`Stash #${index} wirklich verwerfen?`)) return;
    this.error = '';
    try {
      await repositoryService.dropStash(this.repoId, index);
      await this.load();
    } catch (err) {
      this.error = (err as Error).message;
    }
  }

  private formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  render() {
    return html`
      <div class="flex flex-col h-full overflow-hidden">
        <div class="px-4 py-[0.85rem] border-b border-cat-border flex items-center justify-between shrink-0 bg-cat-surface">
          <span class="text-[0.95rem] font-bold text-[#eef1ff]">Stashes</span>
          <button data-testid="refresh-btn"
            class="px-2.5 py-0.5 text-[0.75rem] border border-cat-muted rounded bg-transparent text-cat-subtext cursor-pointer hover:bg-cat-overlay hover:text-cat-text disabled:opacity-45 disabled:cursor-not-allowed"
            @click=${() => this.load()} ?disabled=${this.loading}>
            ↻ Aktualisieren
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          ${this.loading
            ? html`<div class="p-8 text-center text-cat-subtle text-[0.88rem]">Lade Stashes…</div>`
            : this.error
            ? html`<div class="p-8 text-center text-cat-red text-[0.88rem]">${this.error}</div>`
            : this.stashes.length === 0
            ? html`
              <div class="flex flex-col items-center justify-center h-full gap-3 text-cat-subtle text-[0.9rem]">
                <span class="text-[2.5rem]">📦</span>
                <span>Keine Stashes vorhanden</span>
              </div>`
            : this.stashes.map(s => html`
              <div data-testid="stash-entry"
                class="px-4 py-3 border-b border-[rgba(49,50,68,0.8)] flex items-start gap-3 hover:bg-[#25273a]">
                <div class="flex-1 overflow-hidden">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-mono text-[0.78rem] text-cat-peach shrink-0">stash@{${s.index}}</span>
                    <span class="text-[0.85rem] text-[#eef1ff] truncate">${s.message}</span>
                  </div>
                  <div class="text-[0.74rem] text-cat-subtle">
                    ${s.branch} · ${this.formatDate(s.createdAt)}
                  </div>
                </div>
                <div class="flex gap-1.5 shrink-0">
                  <button data-testid="stash-pop-btn"
                    class="px-2.5 py-0.5 text-[0.75rem] border border-cat-blue rounded bg-transparent text-cat-blue cursor-pointer hover:bg-[rgba(137,180,250,0.15)] whitespace-nowrap"
                    @click=${() => this.pop(s.index)}>
                    ↩ Pop
                  </button>
                  <button data-testid="stash-drop-btn"
                    class="px-2.5 py-0.5 text-[0.75rem] border border-cat-muted rounded bg-transparent text-cat-red cursor-pointer hover:bg-cat-overlay"
                    @click=${() => this.drop(s.index)}>
                    ✕
                  </button>
                </div>
              </div>
            `)}
        </div>
      </div>
    `;
  }
}
