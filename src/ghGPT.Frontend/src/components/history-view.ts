import { html, css, nothing } from 'lit';
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
      width: 360px;
      min-width: 360px;
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
      gap: 0.2rem;
      flex-shrink: 0;
      background: #1e1e2e;
    }

    .panel-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #eef1ff;
    }

    .panel-subtitle {
      font-size: 0.75rem;
      color: #8f96b3;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .list-scroll {
      flex: 1;
      overflow: auto;
      position: relative;
    }

    .list-inner {
      position: relative;
    }

    .list-entry {
      position: absolute;
      left: 0;
      right: 0;
      height: 88px;
      padding: 0.8rem 1rem;
      display: grid;
      grid-template-columns: 34px 1fr;
      gap: 0.75rem;
      border-bottom: 1px solid rgba(49, 50, 68, 0.8);
      cursor: pointer;
      box-sizing: border-box;
    }

    .list-entry:hover {
      background: #25273a;
    }

    .list-entry.selected {
      background: #313244;
    }

    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      background: linear-gradient(135deg, #89b4fa, #fab387);
      color: #11111b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      margin-top: 0.1rem;
    }

    .entry-body {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .entry-message {
      font-size: 0.87rem;
      font-weight: 600;
      color: #eef1ff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .entry-meta,
    .entry-sha {
      font-size: 0.74rem;
      color: #8f96b3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex-shrink: 0;
    }

    .detail-title {
      font-size: 1rem;
      font-weight: 700;
      color: #eef1ff;
      white-space: pre-wrap;
    }

    .detail-meta {
      font-size: 0.78rem;
      color: #a6adc8;
    }

    .detail-body {
      flex: 1;
      display: flex;
      min-height: 0;
      overflow: hidden;
    }

    .file-list {
      width: 280px;
      min-width: 280px;
      border-right: 1px solid #313244;
      overflow: auto;
      background: #1a1b26;
    }

    .file-item {
      padding: 0.75rem 0.9rem;
      border-bottom: 1px solid rgba(49, 50, 68, 0.75);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .file-item:hover {
      background: #25273a;
    }

    .file-item.selected {
      background: #313244;
    }

    .file-path {
      font-size: 0.8rem;
      color: #eef1ff;
      word-break: break-word;
    }

    .file-stats {
      font-size: 0.72rem;
      color: #8f96b3;
    }

    .diff-panel {
      flex: 1;
      overflow: auto;
      min-width: 0;
      font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
      font-size: 0.78rem;
    }

    .diff-line {
      display: flex;
      padding: 0 0.75rem;
      line-height: 1.5;
      white-space: pre;
    }

    .diff-line-num {
      width: 32px;
      flex-shrink: 0;
      color: #45475a;
      user-select: none;
      text-align: right;
      padding-right: 0.5rem;
    }

    .diff-line-content {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: clip;
    }

    .diff-line.added {
      background: rgba(166, 227, 161, 0.12);
      color: #a6e3a1;
    }

    .diff-line.removed {
      background: rgba(243, 139, 168, 0.12);
      color: #f38ba8;
    }

    .empty,
    .error,
    .loading {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      color: #6c7086;
      text-align: center;
    }

    .error {
      color: #f38ba8;
    }

    .footer-hint {
      padding: 0.6rem 0.9rem;
      border-top: 1px solid #313244;
      font-size: 0.72rem;
      color: #8f96b3;
      flex-shrink: 0;
    }

    .summarize-btn {
      background: transparent;
      border: 1px solid #45475a;
      border-radius: 4px;
      color: #a6adc8;
      cursor: pointer;
      font-size: 0.72rem;
      padding: 0.2rem 0.6rem;
      white-space: nowrap;
      align-self: flex-start;
    }

    .summarize-btn:hover:not(:disabled) { background: #313244; color: #cdd6f4; }
    .summarize-btn:disabled { opacity: 0.45; cursor: default; }

    .summary-overlay {
      position: absolute;
      inset: 0;
      background: #1e1e2e;
      z-index: 10;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #313244;
    }

    .summary-overlay-header {
      padding: 0.7rem 1rem;
      border-bottom: 1px solid #313244;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .summary-overlay-title {
      font-size: 0.82rem;
      font-weight: 600;
      color: #cdd6f4;
    }

    .summary-overlay-actions {
      display: flex;
      gap: 0.4rem;
      align-items: center;
    }

    .summary-copy-btn {
      background: transparent;
      border: 1px solid #45475a;
      border-radius: 4px;
      color: #a6adc8;
      cursor: pointer;
      font-size: 0.72rem;
      padding: 0.15rem 0.5rem;
    }

    .summary-copy-btn:hover { background: #313244; color: #cdd6f4; }

    .summary-close-btn {
      background: none;
      border: none;
      color: #6c7086;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
      line-height: 1;
    }

    .summary-close-btn:hover { color: #cdd6f4; background: #313244; }

    .summary-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      font-size: 0.85rem;
      line-height: 1.7;
      color: #cdd6f4;
      white-space: pre-wrap;
    }

    .summary-streaming {
      color: #6c7086;
      font-style: italic;
    }
  `;

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
      return html`<div class="empty">Kein Diff verfügbar</div>`;
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
        <div class="diff-line ${cls}">
          <span class="diff-line-num">${oldNum}</span>
          <span class="diff-line-num">${newNum}</span>
          <span class="diff-line-content">${line}</span>
        </div>
      `;
    });
  }

  render() {
    const { start, end } = this.visibleRange;
    const visibleEntries = this.entries.slice(start, end);
    const totalHeight = this.entries.length * HistoryView.ROW_HEIGHT;

    return html`
      <section class="list-panel" style="position:relative">
        <div class="panel-header">
          <div class="panel-subtitle">History</div>
          <div class="panel-title">${this.branchName || this.branch || 'Aktueller Branch'}</div>
          <button class="summarize-btn"
            ?disabled=${this.entries.length === 0 || this.summaryStreaming}
            @click=${() => this.startSummary()}>
            ✦ ${this.summaryStreaming ? 'Zusammenfasse…' : 'Zusammenfassen'}
          </button>
        </div>

        ${this.showSummary ? html`
          <div class="summary-overlay">
            <div class="summary-overlay-header">
              <span class="summary-overlay-title">✦ Zusammenfassung</span>
              <div class="summary-overlay-actions">
                ${this.summaryContent ? html`
                  <button class="summary-copy-btn" @click=${() => this.copySummary()}>
                    ${this.copied ? '✓ Kopiert' : 'Kopieren'}
                  </button>
                ` : nothing}
                <button class="summary-close-btn" @click=${() => { this.showSummary = false; }}>✕</button>
              </div>
            </div>
            <div class="summary-content">
              ${this.summaryStreaming && !this.summaryContent
                ? html`<span class="summary-streaming">Analysiere Commits…</span>`
                : this.summaryContent}
              ${this.summaryStreaming ? html`<span class="summary-streaming"> ▌</span>` : nothing}
            </div>
          </div>
        ` : nothing}

        ${this.listError
          ? html`<div class="error">${this.listError}</div>`
          : html`
              <div class="list-scroll" @scroll=${this.onListScroll}>
                <div class="list-inner" style="height:${totalHeight}px">
                  ${visibleEntries.map((entry, index) => {
                    const absoluteIndex = start + index;
                    return html`
                      <div
                        class="list-entry ${this.selectedCommitSha === entry.sha ? 'selected' : ''}"
                        style="top:${absoluteIndex * HistoryView.ROW_HEIGHT}px"
                        @click=${() => this.selectCommit(entry.sha)}>
                        <div class="avatar">${this.initials(entry.authorName)}</div>
                        <div class="entry-body">
                          <div class="entry-message">${entry.message}</div>
                          <div class="entry-meta">${entry.authorName} · ${this.formatDate(entry.authorDate)}</div>
                          <div class="entry-sha">${entry.shortSha}</div>
                        </div>
                      </div>
                    `;
                  })}
                </div>
              </div>
            `}

        <div class="footer-hint">
          ${this.loadingList ? 'Lade weitere Commits…' : this.hasMore ? 'Weitere Commits werden beim Scrollen geladen.' : `${this.entries.length} Commits geladen`}
        </div>
      </section>

      <section class="detail-panel">
        ${this.loadingDetail
          ? html`<div class="loading">Commit-Details werden geladen…</div>`
          : this.detailError
            ? html`<div class="error">${this.detailError}</div>`
            : !this.selectedCommit
              ? html`<div class="empty">Commit auswählen</div>`
              : html`
                  <div class="detail-header">
                    <div class="detail-title">${this.selectedCommit.message}</div>
                    <div class="detail-meta">
                      ${this.selectedCommit.authorName} &lt;${this.selectedCommit.authorEmail}&gt; ·
                      ${this.formatDate(this.selectedCommit.authorDate)} · ${this.selectedCommit.shortSha}
                    </div>
                  </div>

                  <div class="detail-body">
                    <div class="file-list">
                      ${this.selectedCommit.files.map((file, index) => html`
                        <div
                          class="file-item ${this.selectedFileIndex === index ? 'selected' : ''}"
                          @click=${() => { this.selectedFileIndex = index; }}>
                          <div class="file-path">${file.path}</div>
                          <div class="file-stats">${file.status} · +${file.additions} / -${file.deletions}</div>
                        </div>
                      `)}
                    </div>

                    <div class="diff-panel">
                      ${this.selectedFile ? this.renderPatch(this.selectedFile.patch) : html`<div class="empty">Keine Datei ausgewählt</div>`}
                    </div>
                  </div>
                `}
      </section>
    `;
  }
}
