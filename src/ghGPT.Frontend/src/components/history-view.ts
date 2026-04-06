import { html, nothing } from 'lit';
import { AppElement } from '../app-element';
import { customElement, property, query, state } from 'lit/decorators.js';
import {
  repositoryService,
  type CommitDetail,
  type CommitFileChange,
  type CommitListItem,
} from '../services/repository-service';

@customElement('history-view')
export class HistoryView extends AppElement {
  private static readonly PAGE_SIZE = 100;
  private static readonly ROW_HEIGHT = 88;
  private static readonly OVERSCAN = 6;

  @property() repoId = '';
  @property() branch = '';
  @property({ type: Number }) refreshKey = 0;
  @query('.list-scroll') private listScroll?: HTMLDivElement;

  @state() private entries: CommitListItem[] = [];
  @state() private branchName = '';
  @state() private hasMore = false;
  @state() private loadingList = false;
  @state() private loadingDetail = false;
  @state() private listError = '';
  @state() private detailError = '';
  @state() private selectedCommitSha = '';
  @state() private selectedCommit: CommitDetail | null = null;
  @state() private selectedFileIndex = 0;
  @state() private listScrollTop = 0;
  @state() private viewportHeight = 0;
  @state() private summaryContent = '';
  @state() private summaryStreaming = false;
  @state() private showSummary = false;
  @state() private copied = false;

  updated(changed: Map<string, unknown>) {
    if ((changed.has('repoId') || changed.has('branch') || changed.has('refreshKey')) && this.repoId) {
      this.loadInitialCommits();
    }
  }

  firstUpdated() {
    this.viewportHeight = this.listScroll?.clientHeight ?? 0;
  }

  private async loadInitialCommits() {
    this.entries = [];
    this.branchName = this.branch;
    this.hasMore = false;
    this.listError = '';
    this.detailError = '';
    this.selectedCommit = null;
    this.selectedCommitSha = '';
    this.selectedFileIndex = 0;
    this.summaryContent = '';
    this.showSummary = false;
    await this.loadMoreCommits(true);
    await this.updateComplete;
    if (this.listScroll) {
      this.listScroll.scrollTop = 0;
      this.viewportHeight = this.listScroll.clientHeight;
      this.listScrollTop = 0;
    }
  }

  private async startSummary() {
    if (this.summaryStreaming || this.entries.length === 0) return;
    this.summaryContent = '';
    this.summaryStreaming = true;
    this.showSummary = true;
    this.copied = false;

    try {
      const count = Math.min(this.entries.length, 20);
      const response = await fetch(
        `/api/repos/${encodeURIComponent(this.repoId)}/ai/summarize-history?count=${count}`,
        { method: 'POST' }
      );
      if (!response.ok || !response.body) throw new Error('Anfrage fehlgeschlagen');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('event: done')) return;
          if (line.startsWith('data: ')) {
            this.summaryContent += JSON.parse(line.slice(6)) as string;
          }
        }
      }
    } catch (err) {
      console.error('[CommitSummary] Stream-Fehler:', err);
      this.summaryContent += '\n\nFehler beim Laden der Zusammenfassung.';
    } finally {
      this.summaryStreaming = false;
    }
  }

  private async copySummary() {
    if (!this.summaryContent) return;
    await navigator.clipboard.writeText(this.summaryContent);
    this.copied = true;
    setTimeout(() => { this.copied = false; }, 2000);
  }

  private async loadMoreCommits(reset = false) {
    if (!this.repoId || this.loadingList || (!reset && !this.hasMore && this.entries.length > 0)) return;

    this.loadingList = true;
    try {
      const result = await repositoryService.getCommits(
        this.repoId,
        this.branch || undefined,
        reset ? 0 : this.entries.length,
        HistoryView.PAGE_SIZE
      );

      this.branchName = result.branch;
      this.hasMore = result.hasMore;
      this.entries = reset ? result.commits : [...this.entries, ...result.commits];
      this.listError = '';

      const selectedStillExists = this.entries.some(entry => entry.sha === this.selectedCommitSha);
      if (this.entries.length > 0 && (!this.selectedCommitSha || !selectedStillExists)) {
        await this.selectCommit(this.entries[0].sha);
      }
    } catch (e: unknown) {
      this.listError = e instanceof Error ? e.message : 'Fehler beim Laden der Commits';
    } finally {
      this.loadingList = false;
    }
  }

  private async selectCommit(sha: string) {
    this.selectedCommitSha = sha;
    this.selectedCommit = null;
    this.selectedFileIndex = 0;
    this.detailError = '';
    this.loadingDetail = true;

    try {
      this.selectedCommit = await repositoryService.getCommitDetail(this.repoId, sha);
    } catch (e: unknown) {
      this.detailError = e instanceof Error ? e.message : 'Fehler beim Laden der Commit-Details';
    } finally {
      this.loadingDetail = false;
    }
  }

  private onListScroll(e: Event) {
    const target = e.target as HTMLDivElement;
    this.listScrollTop = target.scrollTop;
    this.viewportHeight = target.clientHeight;

    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 400) {
      void this.loadMoreCommits();
    }
  }

  private get visibleRange() {
    const total = this.entries.length;
    const height = this.viewportHeight || this.listScroll?.clientHeight || 0;
    const start = Math.max(0, Math.floor(this.listScrollTop / HistoryView.ROW_HEIGHT) - HistoryView.OVERSCAN);
    const end = Math.min(
      total,
      Math.ceil((this.listScrollTop + height) / HistoryView.ROW_HEIGHT) + HistoryView.OVERSCAN
    );
    return { start, end };
  }

  private get selectedFile(): CommitFileChange | null {
    return this.selectedCommit?.files[this.selectedFileIndex] ?? null;
  }

  private formatDate(value: string) {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private initials(name: string) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('') || '?';
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

  render() {
    const { start, end } = this.visibleRange;
    const visibleEntries = this.entries.slice(start, end);
    const totalHeight = this.entries.length * HistoryView.ROW_HEIGHT;

    return html`
      <section class="w-[360px] min-w-[360px] flex flex-col border-r border-cat-border bg-cat-surface overflow-hidden relative">
        <div class="px-4 py-3 border-b border-cat-border flex flex-col gap-1 shrink-0 bg-cat-surface">
          <div class="text-[0.75rem] text-[#8f96b3] uppercase tracking-widest">History</div>
          <div class="text-[0.95rem] font-bold text-[#eef1ff]">${this.branchName || this.branch || 'Aktueller Branch'}</div>
          <button class="self-start bg-transparent border border-cat-muted rounded px-2 py-0.5 text-cat-subtext text-[0.72rem] cursor-pointer whitespace-nowrap hover:bg-cat-overlay hover:text-cat-text disabled:opacity-45 disabled:cursor-default"
            ?disabled=${this.entries.length === 0 || this.summaryStreaming}
            @click=${() => this.startSummary()}>
            ✦ ${this.summaryStreaming ? 'Zusammenfasse…' : 'Zusammenfassen'}
          </button>
        </div>

        ${this.showSummary ? html`
          <div class="absolute inset-0 bg-cat-surface z-10 flex flex-col border-r border-cat-border">
            <div class="px-4 py-2.5 border-b border-cat-border flex items-center justify-between shrink-0">
              <span class="text-[0.82rem] font-semibold text-cat-text">✦ Zusammenfassung</span>
              <div class="flex gap-1.5 items-center">
                ${this.summaryContent ? html`
                  <button class="bg-transparent border border-cat-muted rounded px-2 py-0.5 text-cat-subtext text-[0.72rem] cursor-pointer hover:bg-cat-overlay hover:text-cat-text"
                    @click=${() => this.copySummary()}>
                    ${this.copied ? '✓ Kopiert' : 'Kopieren'}
                  </button>
                ` : nothing}
                <button class="bg-none border-none text-cat-subtle cursor-pointer text-base px-1 py-0.5 rounded leading-none hover:text-cat-text hover:bg-cat-overlay"
                  @click=${() => { this.showSummary = false; }}>✕</button>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto p-4 text-[0.85rem] leading-[1.7] text-cat-text whitespace-pre-wrap">
              ${this.summaryStreaming && !this.summaryContent
                ? html`<span class="text-cat-subtle italic">Analysiere Commits…</span>`
                : this.summaryContent}
              ${this.summaryStreaming ? html`<span class="text-cat-subtle italic"> ▌</span>` : nothing}
            </div>
          </div>
        ` : nothing}

        ${this.listError
          ? html`<div class="h-full flex items-center justify-center p-4 text-cat-red text-center">${this.listError}</div>`
          : html`
              <div class="list-scroll flex-1 overflow-auto relative" @scroll=${this.onListScroll}>
                <div style="height:${totalHeight}px; position:relative">
                  ${visibleEntries.map((entry, index) => {
                    const absoluteIndex = start + index;
                    return html`
                      <div
                        class="absolute left-0 right-0 h-[88px] px-4 py-3 grid gap-3 border-b border-[rgba(49,50,68,0.8)] cursor-pointer box-border
                          ${this.selectedCommitSha === entry.sha ? 'bg-cat-overlay' : 'hover:bg-[#25273a]'}"
                        style="top:${absoluteIndex * HistoryView.ROW_HEIGHT}px; grid-template-columns: 34px 1fr"
                        @click=${() => this.selectCommit(entry.sha)}>
                        <div class="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-[#89b4fa] to-[#fab387] text-[#11111b] flex items-center justify-center text-[0.8rem] font-bold mt-0.5">
                          ${this.initials(entry.authorName)}
                        </div>
                        <div class="min-w-0 flex flex-col gap-1">
                          <div class="text-[0.87rem] font-semibold text-[#eef1ff] whitespace-nowrap overflow-hidden text-ellipsis">${entry.message}</div>
                          <div class="text-[0.74rem] text-[#8f96b3] whitespace-nowrap overflow-hidden text-ellipsis">${entry.authorName} · ${this.formatDate(entry.authorDate)}</div>
                          <div class="text-[0.74rem] text-[#8f96b3] whitespace-nowrap overflow-hidden text-ellipsis">${entry.shortSha}</div>
                        </div>
                      </div>
                    `;
                  })}
                </div>
              </div>
            `}

        <div class="px-3.5 py-2 border-t border-cat-border text-[0.72rem] text-[#8f96b3] shrink-0">
          ${this.loadingList ? 'Lade weitere Commits…' : this.hasMore ? 'Weitere Commits werden beim Scrollen geladen.' : `${this.entries.length} Commits geladen`}
        </div>
      </section>

      <section class="flex-1 flex flex-col overflow-hidden min-w-0">
        ${this.loadingDetail
          ? html`<div class="h-full flex items-center justify-center p-4 text-cat-subtle text-center">Commit-Details werden geladen…</div>`
          : this.detailError
            ? html`<div class="h-full flex items-center justify-center p-4 text-cat-red text-center">${this.detailError}</div>`
            : !this.selectedCommit
              ? html`<div class="h-full flex items-center justify-center p-4 text-cat-subtle text-center">Commit auswählen</div>`
              : html`
                  <div class="px-4 py-3.5 border-b border-cat-border bg-cat-surface flex flex-col gap-1.5 shrink-0">
                    <div class="text-base font-bold text-[#eef1ff] whitespace-pre-wrap">${this.selectedCommit.message}</div>
                    <div class="text-[0.78rem] text-cat-subtext">
                      ${this.selectedCommit.authorName} &lt;${this.selectedCommit.authorEmail}&gt; ·
                      ${this.formatDate(this.selectedCommit.authorDate)} · ${this.selectedCommit.shortSha}
                    </div>
                  </div>

                  <div class="flex-1 flex min-h-0 overflow-hidden">
                    <div class="w-[280px] min-w-[280px] border-r border-cat-border overflow-auto bg-[#1a1b26]">
                      ${this.selectedCommit.files.map((file, index) => html`
                        <div
                          class="px-3.5 py-3 border-b border-[rgba(49,50,68,0.75)] cursor-pointer flex flex-col gap-0.5
                            ${this.selectedFileIndex === index ? 'bg-cat-overlay' : 'hover:bg-[#25273a]'}"
                          @click=${() => { this.selectedFileIndex = index; }}>
                          <div class="text-[0.8rem] text-[#eef1ff] break-words">${file.path}</div>
                          <div class="text-[0.72rem] text-[#8f96b3]">${file.status} · +${file.additions} / -${file.deletions}</div>
                        </div>
                      `)}
                    </div>

                    <div class="flex-1 overflow-auto min-w-0 font-mono text-[0.78rem]">
                      ${this.selectedFile ? this.renderPatch(this.selectedFile.patch) : html`<div class="h-full flex items-center justify-center p-4 text-cat-subtle">Keine Datei ausgewählt</div>`}
                    </div>
                  </div>
                `}
      </section>
    `;
  }
}
