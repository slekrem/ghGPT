import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import { repositoryService, type StashEntry, type CommitFileChange } from '../services/repository-service';

@customElement('stashes-view')
export class StashesView extends AppElement {
  @property() repoId = '';
  @property({ type: Number }) refreshKey = 0;

  @state() private stashes: StashEntry[] = [];
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private selectedStash: StashEntry | null = null;
  @state() private stashFiles: CommitFileChange[] = [];
  @state() private loadingDiff = false;
  @state() private selectedFileIndex = 0;

  updated(changed: Map<string, unknown>) {
    if ((changed.has('repoId') || changed.has('refreshKey')) && this.repoId) this.load();
  }

  private async load() {
    this.loading = true;
    this.error = null;
    try {
      this.stashes = await repositoryService.getStashes(this.repoId);
      if (this.selectedStash !== null) {
        const still = this.stashes.find(s => s.index === this.selectedStash!.index);
        if (still) {
          await this.selectStash(still);
        } else {
          this.selectedStash = null;
          this.stashFiles = [];
        }
      }
    } catch (err) {
      this.error = (err as Error).message;
    } finally {
      this.loading = false;
    }
  }

  private async selectStash(stash: StashEntry) {
    this.selectedStash = stash;
    this.selectedFileIndex = 0;
    this.stashFiles = [];
    this.loadingDiff = true;
    try {
      this.stashFiles = await repositoryService.getStashDiff(this.repoId, stash.index);
    } catch (err) {
      this.error = (err as Error).message;
    } finally {
      this.loadingDiff = false;
    }
  }

  private async pop(index: number) {
    this.error = null;
    try {
      await repositoryService.popStash(this.repoId, index);
      if (this.selectedStash?.index === index) {
        this.selectedStash = null;
        this.stashFiles = [];
      }
      await this.load();
      this.dispatchEvent(new CustomEvent('stash-popped', { bubbles: true, composed: true }));
    } catch (err) {
      this.error = (err as Error).message;
    }
  }

  private async drop(index: number) {
    if (!confirm(`Stash #${index} wirklich verwerfen?`)) return;
    this.error = null;
    try {
      await repositoryService.dropStash(this.repoId, index);
      if (this.selectedStash?.index === index) {
        this.selectedStash = null;
        this.stashFiles = [];
      }
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

  private get selectedFile(): CommitFileChange | null {
    return this.stashFiles[this.selectedFileIndex] ?? null;
  }

  private renderPatch(patch: string) {
    if (!patch) {
      return html`<div class="h-full flex items-center justify-center p-4 text-cat-subtle">Kein Diff verfügbar</div>`;
    }

    const isMetadata = (line: string) =>
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('--- ') ||
      line.startsWith('+++ ') ||
      line.startsWith('\\ No newline');

    const raw = patch.split('\n');
    if (raw[raw.length - 1] === '') raw.pop();
    const lines = raw.filter(line => !isMetadata(line));
    let oldLineNum = 0;
    let newLineNum = 0;

    return lines.map(line => {
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldLineNum = parseInt(match[1]) - 1;
          newLineNum = parseInt(match[2]) - 1;
        }
        return html``;
      }

      let cls = '';
      let oldNum: number | '' = '';
      let newNum: number | '' = '';
      if (line.startsWith('+')) {
        cls = 'added';
        newLineNum++;
        newNum = newLineNum;
      } else if (line.startsWith('-')) {
        cls = 'removed';
        oldLineNum++;
        oldNum = oldLineNum;
      } else {
        oldLineNum++;
        newLineNum++;
        oldNum = oldLineNum;
        newNum = newLineNum;
      }

      return html`
        <div class="diff-line ${cls} flex px-3 leading-[1.5] whitespace-pre">
          <span class="w-8 shrink-0 text-cat-muted select-none text-right pr-2">${oldNum}</span>
          <span class="w-8 shrink-0 text-cat-muted select-none text-right pr-2">${newNum}</span>
          <span class="flex-1 min-w-0 overflow-hidden">${line}</span>
        </div>
      `;
    });
  }

  private renderFileStatus(status: string) {
    switch (status.toLowerCase()) {
      case 'added': return html`<span class="text-cat-green text-[0.7rem] font-bold">A</span>`;
      case 'deleted': return html`<span class="text-cat-red text-[0.7rem] font-bold">D</span>`;
      case 'renamed': return html`<span class="text-cat-yellow text-[0.7rem] font-bold">R</span>`;
      default: return html`<span class="text-cat-blue text-[0.7rem] font-bold">M</span>`;
    }
  }

  render() {
    return html`
        <!-- Stash list -->
        <section class="w-[300px] min-w-[300px] flex flex-col border-r border-cat-border bg-cat-surface overflow-hidden">
          <div class="px-4 py-[0.85rem] border-b border-cat-border flex items-center justify-between shrink-0">
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
              ? html`<div class="p-4 text-cat-red text-[0.88rem]">${this.error}</div>`
              : this.stashes.length === 0
              ? html`
                <div class="flex flex-col items-center justify-center h-full gap-3 text-cat-subtle text-[0.9rem]">
                  <span class="text-[2.5rem]">📦</span>
                  <span>Keine Stashes vorhanden</span>
                </div>`
              : this.stashes.map(s => html`
                <div data-testid="stash-entry"
                  class="px-4 py-3 border-b border-[rgba(49,50,68,0.8)] cursor-pointer
                    ${this.selectedStash?.index === s.index
                      ? 'bg-[#313244] text-[#cba6f7]'
                      : 'hover:bg-[#25273a] text-cat-text'}"
                  @click=${() => this.selectStash(s)}>
                  <div class="flex items-start gap-2">
                    <div class="flex-1 overflow-hidden">
                      <div class="flex items-center gap-2 mb-0.5">
                        <span class="font-mono text-[0.78rem] text-cat-peach shrink-0">stash@{${s.index}}</span>
                      </div>
                      <div class="text-[0.85rem] truncate">${s.message}</div>
                      <div class="text-[0.74rem] text-cat-subtle mt-0.5">
                        ${s.branch} · ${this.formatDate(s.createdAt)}
                      </div>
                    </div>
                    <div class="flex gap-1 shrink-0" @click=${(e: Event) => e.stopPropagation()}>
                      <button data-testid="stash-pop-btn"
                        class="px-2 py-0.5 text-[0.72rem] border border-cat-blue rounded bg-transparent text-cat-blue cursor-pointer hover:bg-[rgba(137,180,250,0.15)] whitespace-nowrap"
                        @click=${() => this.pop(s.index)}>
                        ↩ Pop
                      </button>
                      <button data-testid="stash-drop-btn"
                        class="px-2 py-0.5 text-[0.72rem] border border-cat-muted rounded bg-transparent text-cat-red cursor-pointer hover:bg-cat-overlay"
                        @click=${() => this.drop(s.index)}>
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              `)}
          </div>
        </section>

        <!-- Detail: file list + diff -->
        ${this.selectedStash ? html`
          <!-- File list -->
          <section class="w-[240px] min-w-[240px] flex flex-col border-r border-cat-border bg-cat-surface overflow-hidden">
            <div class="px-4 py-[0.85rem] border-b border-cat-border shrink-0">
              <div class="text-[0.75rem] text-[#8f96b3] uppercase tracking-widest">Dateien</div>
              <div class="text-[0.88rem] font-semibold text-[#eef1ff] mt-0.5 truncate">${this.selectedStash.message}</div>
            </div>
            <div class="flex-1 overflow-y-auto">
              ${this.loadingDiff
                ? html`<div class="p-6 text-center text-cat-subtle text-[0.88rem]">Lade Diff…</div>`
                : this.stashFiles.length === 0
                ? html`<div class="p-6 text-center text-cat-subtle text-[0.88rem]">Keine Änderungen</div>`
                : this.stashFiles.map((f, i) => html`
                  <div data-testid="stash-file-entry"
                    class="px-3 py-2 border-b border-[rgba(49,50,68,0.6)] cursor-pointer flex items-center gap-2
                      ${i === this.selectedFileIndex
                        ? 'bg-[#313244] text-[#cba6f7]'
                        : 'hover:bg-[#25273a] text-cat-text'}"
                    @click=${() => { this.selectedFileIndex = i; }}>
                    ${this.renderFileStatus(f.status)}
                    <span class="text-[0.8rem] truncate flex-1">${f.path.split('/').pop()}</span>
                    <span class="text-[0.7rem] text-cat-subtle shrink-0 font-mono">
                      <span class="text-cat-green">+${f.additions}</span>
                      <span class="text-cat-red ml-0.5">-${f.deletions}</span>
                    </span>
                  </div>
                `)}
            </div>
          </section>

          <!-- Diff panel -->
          <section class="flex-1 flex flex-col overflow-hidden">
            <div class="px-4 py-[0.85rem] border-b border-cat-border shrink-0 bg-cat-surface">
              ${this.selectedFile
                ? html`
                  <div class="text-[0.75rem] text-[#8f96b3] uppercase tracking-widest">Diff</div>
                  <div class="font-mono text-[0.82rem] text-[#eef1ff] mt-0.5 truncate">${this.selectedFile.path}</div>`
                : html`<div class="text-[0.85rem] text-cat-subtle">Keine Datei ausgewählt</div>`}
            </div>
            <div data-testid="diff-panel" class="flex-1 overflow-auto font-mono text-[0.78rem]">
              ${this.selectedFile
                ? this.renderPatch(this.selectedFile.patch)
                : html`<div class="h-full flex items-center justify-center text-cat-subtle">Datei auswählen</div>`}
            </div>
          </section>
        ` : html`
          <div class="flex-1 flex flex-col items-center justify-center gap-2 text-cat-subtle text-[0.9rem]">
            <span class="text-[2rem]">👆</span>
            <span>Stash auswählen um Details anzuzeigen</span>
          </div>
        `}
    `;
  }
}
