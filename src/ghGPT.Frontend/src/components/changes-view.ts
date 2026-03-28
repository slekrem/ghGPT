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
      width: 32px;
      flex-shrink: 0;
      color: #45475a;
      user-select: none;
      text-align: right;
      padding-right: 0.5rem;
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

    .commit-form {
      flex-shrink: 0;
      padding: 0.6rem 0.75rem;
      border-top: 1px solid #313244;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      background: #1e1e2e;
    }

    .commit-input {
      background: #181825;
      border: 1px solid #313244;
      border-radius: 4px;
      color: #cdd6f4;
      font-size: 0.8rem;
      padding: 0.35rem 0.5rem;
      width: 100%;
      box-sizing: border-box;
      font-family: inherit;
      resize: none;
    }

    .commit-input:focus { outline: none; border-color: #89b4fa; }
    .commit-input::placeholder { color: #45475a; }

    .commit-btn {
      background: #89b4fa;
      border: none;
      border-radius: 4px;
      color: #1e1e2e;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      width: 100%;
    }

    .commit-btn:disabled { background: #313244; color: #45475a; cursor: default; }
    .commit-btn:not(:disabled):hover { background: #b4d0ff; }

    .commit-error {
      font-size: 0.72rem;
      color: #f38ba8;
    }
  `;

  @property() repoId = '';

  @state() private status: RepositoryStatusResult = { staged: [], unstaged: [] };
  @state() private selectedFile: FileStatusEntry | null = null;
  @state() private diff = '';
  @state() private diffError = '';
  @state() private commitMessage = '';
  @state() private commitDescription = '';
  @state() private commitError = '';
  @state() private committing = false;
  updated(changed: Map<string, unknown>) {
    if (changed.has('repoId') && this.repoId) {
      this.selectedFile = null;
      this.diff = '';
      this.diffError = '';
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
    this.diffError = '';
    if (entry.status === 'Untracked') return;
    try {
      this.diff = await repositoryService.getDiff(this.repoId, entry.filePath, entry.isStaged);
    } catch (e: unknown) {
      this.diffError = e instanceof Error ? e.message : 'Fehler beim Laden des Diffs';
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

  private async doCommit() {
    if (!this.commitMessage.trim() || this.status.staged.length === 0) return;
    this.committing = true;
    this.commitError = '';
    try {
      await repositoryService.commit(this.repoId, this.commitMessage.trim(), this.commitDescription.trim() || undefined);
      this.commitMessage = '';
      this.commitDescription = '';
      this.selectedFile = null;
      this.diff = '';
      await this.loadStatus();
    } catch (e: unknown) {
      this.commitError = e instanceof Error ? e.message : 'Commit fehlgeschlagen';
    } finally {
      this.committing = false;
    }
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
    if (this.diffError) {
      return html`<div class="diff-placeholder" style="color:#f38ba8">${this.diffError}</div>`;
    }
    if (!this.diff) {
      return html`<div class="diff-placeholder">Kein Diff verfügbar</div>`;
    }

    const isMetadata = (l: string) =>
      l.startsWith('diff --git') || l.startsWith('index ') ||
      l.startsWith('--- ') || l.startsWith('+++ ') ||
      l.startsWith('\\ No newline');

    const raw = this.diff.split('\n');
    if (raw[raw.length - 1] === '') raw.pop();
    const lines = raw.filter(l => !isMetadata(l));
    let oldLineNum = 0;
    let newLineNum = 0;

    return html`
      <div class="diff-content">
        ${lines.map(line => {
          // Parse hunk header to get correct starting line numbers, then skip rendering
          if (line.startsWith('@@')) {
            const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
            if (match) { oldLineNum = parseInt(match[1]) - 1; newLineNum = parseInt(match[2]) - 1; }
            return '';
          }

          let cls = '';
          let oldNum: number | '' = '';
          let newNum: number | '' = '';
          if (line.startsWith('+')) { cls = 'added'; newLineNum++; newNum = newLineNum; }
          else if (line.startsWith('-')) { cls = 'removed'; oldLineNum++; oldNum = oldLineNum; }
          else { oldLineNum++; newLineNum++; oldNum = oldLineNum; newNum = newLineNum; }

          return html`
            <div class="diff-line ${cls}">
              <span class="diff-line-num">${oldNum}</span>
              <span class="diff-line-num">${newNum}</span>
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

        <div class="commit-form">
          <input class="commit-input" type="text" placeholder="Commit-Titel (Pflichtfeld)"
            .value=${this.commitMessage}
            @input=${(e: Event) => { this.commitMessage = (e.target as HTMLInputElement).value; }} />
          <textarea class="commit-input" rows="2" placeholder="Beschreibung (optional)"
            .value=${this.commitDescription}
            @input=${(e: Event) => { this.commitDescription = (e.target as HTMLTextAreaElement).value; }}></textarea>
          ${this.commitError ? html`<div class="commit-error">${this.commitError}</div>` : ''}
          <button class="commit-btn"
            ?disabled=${!this.commitMessage.trim() || this.status.staged.length === 0 || this.committing}
            @click=${this.doCommit}>
            ${this.committing ? 'Committing…' : `Commit (${this.status.staged.length} Datei${this.status.staged.length !== 1 ? 'en' : ''})`}
          </button>
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
