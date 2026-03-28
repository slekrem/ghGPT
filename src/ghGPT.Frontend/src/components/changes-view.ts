import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repositoryService, type FileStatusEntry, type RepositoryStatusResult } from '../services/repository-service';

@customElement('changes-view')
export class ChangesView extends LitElement {
  static styles = css`
    :host {
      display: flex;
      height: 100%;
      overflow: hidden;
    }

    .file-list {
      width: 260px;
      min-width: 260px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #313244;
      overflow: hidden;
    }

    .section {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.4rem 0.75rem;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6c7086;
      background: #1e1e2e;
      border-bottom: 1px solid #313244;
      flex-shrink: 0;
    }

    .section-actions {
      display: flex;
      gap: 0.25rem;
    }

    .action-btn {
      background: none;
      border: none;
      color: #6c7086;
      cursor: pointer;
      font-size: 0.7rem;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
    }

    .action-btn:hover { color: #cdd6f4; background: #313244; }

    .file-entries {
      overflow-y: auto;
      flex: 1;
    }

    .file-entry {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem;
      cursor: pointer;
      font-size: 0.8rem;
      color: #cdd6f4;
    }

    .file-entry:hover { background: #313244; }
    .file-entry.selected { background: #45475a; }

    .file-status {
      font-size: 0.65rem;
      font-weight: 700;
      width: 14px;
      text-align: center;
      flex-shrink: 0;
    }

    .status-Modified  { color: #89b4fa; }
    .status-Added     { color: #a6e3a1; }
    .status-Deleted   { color: #f38ba8; }
    .status-Renamed   { color: #fab387; }
    .status-Untracked { color: #a6e3a1; }

    .file-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .empty-hint {
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
      color: #45475a;
      font-style: italic;
    }

    .diff-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #181825;
    }

    .diff-header {
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      color: #a6adc8;
      border-bottom: 1px solid #313244;
      background: #1e1e2e;
      flex-shrink: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .diff-content {
      flex: 1;
      overflow: auto;
      padding: 0;
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
      width: 40px;
      flex-shrink: 0;
      color: #45475a;
      user-select: none;
      text-align: right;
      padding-right: 1rem;
    }

    .diff-line-content { flex: 1; }

    .diff-line.added   { background: rgba(166, 227, 161, 0.12); color: #a6e3a1; }
    .diff-line.removed { background: rgba(243, 139, 168, 0.12); color: #f38ba8; }
    .diff-line.hunk    { background: rgba(203, 166, 247, 0.1);  color: #cba6f7; }

    .diff-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #45475a;
      font-size: 0.875rem;
    }
  `;

  @property() repoId = '';

  @state() private status: RepositoryStatusResult = { staged: [], unstaged: [] };
  @state() private selectedFile: FileStatusEntry | null = null;
  @state() private diff = '';
  updated(changed: Map<string, unknown>) {
    if (changed.has('repoId') && this.repoId) {
      this.loadStatus();
    }
  }

  private async loadStatus() {
    if (!this.repoId) return;
    try {
      this.status = await repositoryService.getStatus(this.repoId);
    } catch {
      this.status = { staged: [], unstaged: [] };
    }
  }

  private async selectFile(entry: FileStatusEntry) {
    this.selectedFile = entry;
    this.diff = '';
    if (entry.status === 'Untracked') return;
    try {
      this.diff = await repositoryService.getDiff(this.repoId, entry.filePath, entry.isStaged);
    } catch {
      this.diff = '';
    }
  }

  private async stageFile(entry: FileStatusEntry) {
    await repositoryService.stageFile(this.repoId, entry.filePath);
    if (this.selectedFile?.filePath === entry.filePath) this.selectedFile = null;
    await this.loadStatus();
  }

  private async unstageFile(entry: FileStatusEntry) {
    await repositoryService.unstageFile(this.repoId, entry.filePath);
    if (this.selectedFile?.filePath === entry.filePath) this.selectedFile = null;
    await this.loadStatus();
  }

  private async stageAll() {
    await repositoryService.stageAll(this.repoId);
    this.selectedFile = null;
    await this.loadStatus();
  }

  private async unstageAll() {
    await repositoryService.unstageAll(this.repoId);
    this.selectedFile = null;
    await this.loadStatus();
  }

  private statusChar(s: string) {
    return s === 'Modified' ? 'M' : s === 'Added' ? 'A' : s === 'Deleted' ? 'D' : s === 'Renamed' ? 'R' : '?';
  }

  private renderDiff() {
    if (!this.selectedFile) {
      return html`<div class="diff-placeholder">Datei auswählen</div>`;
    }
    if (this.selectedFile.status === 'Untracked') {
      return html`<div class="diff-placeholder">Kein Diff für ungetrackte Dateien</div>`;
    }
    if (!this.diff) {
      return html`<div class="diff-placeholder">Kein Diff verfügbar</div>`;
    }

    const lines = this.diff.split('\n');
    let lineNum = 0;

    return html`
      <div class="diff-content">
        ${lines.map(line => {
          let cls = '';
          if (line.startsWith('@@')) { cls = 'hunk'; lineNum = 0; }
          else if (line.startsWith('+') && !line.startsWith('+++')) { cls = 'added'; lineNum++; }
          else if (line.startsWith('-') && !line.startsWith('---')) { cls = 'removed'; }
          else { lineNum++; }

          return html`
            <div class="diff-line ${cls}">
              <span class="diff-line-num">${cls !== 'hunk' && cls !== 'removed' ? lineNum : ''}</span>
              <span class="diff-line-content">${line}</span>
            </div>`;
        })}
      </div>`;
  }

  private renderFileEntry(entry: FileStatusEntry, staged: boolean) {
    return html`
      <div class="file-entry ${this.selectedFile?.filePath === entry.filePath && this.selectedFile?.isStaged === entry.isStaged ? 'selected' : ''}"
        @click=${() => this.selectFile(entry)}>
        <span class="file-status status-${entry.status}">${this.statusChar(entry.status)}</span>
        <span class="file-name" title="${entry.filePath}">${entry.filePath}</span>
        <button class="action-btn" title="${staged ? 'Unstagen' : 'Stagen'}"
          @click=${(e: Event) => { e.stopPropagation(); staged ? this.unstageFile(entry) : this.stageFile(entry); }}>
          ${staged ? '↓' : '↑'}
        </button>
      </div>`;
  }

  render() {
    return html`
      <div class="file-list">
        <div class="section" style="flex:0 0 auto; max-height:50%">
          <div class="section-header">
            <span>Staged (${this.status.staged.length})</span>
            <div class="section-actions">
              <button class="action-btn" title="Alle unstagen" @click=${this.unstageAll}>↓ Alle</button>
            </div>
          </div>
          <div class="file-entries">
            ${this.status.staged.length === 0
              ? html`<div class="empty-hint">Keine gestagten Änderungen</div>`
              : this.status.staged.map(e => this.renderFileEntry(e, true))}
          </div>
        </div>

        <div class="section" style="flex:1; min-height:0">
          <div class="section-header">
            <span>Änderungen (${this.status.unstaged.length})</span>
            <div class="section-actions">
              <button class="action-btn" title="Alle stagen" @click=${this.stageAll}>↑ Alle</button>
            </div>
          </div>
          <div class="file-entries">
            ${this.status.unstaged.length === 0
              ? html`<div class="empty-hint">Keine Änderungen</div>`
              : this.status.unstaged.map(e => this.renderFileEntry(e, false))}
          </div>
        </div>
      </div>

      <div class="diff-panel">
        <div class="diff-header">
          ${this.selectedFile ? this.selectedFile.filePath : 'Kein Diff'}
        </div>
        ${this.renderDiff()}
      </div>
    `;
  }
}
