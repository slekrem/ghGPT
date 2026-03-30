import { LitElement, html, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { repositoryService, type FileStatusEntry, type RepositoryStatusResult } from '../services/repository-service';

interface ParsedHunk {
  oldStart: number;
  newStart: number;
  lines: ParsedDiffLine[];
}

interface ParsedDiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
  oldNum: number | '';
  newNum: number | '';
  globalIndex: number;
}

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

    .list-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6c7086;
      background: #1e1e2e;
      border-bottom: 1px solid #313244;
      flex-shrink: 0;
    }

    .list-header input[type="checkbox"] { cursor: pointer; }

    .file-entries {
      overflow-y: auto;
      flex: 1;
    }

    .file-entry {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.3rem 0.75rem;
      cursor: pointer;
      font-size: 0.8rem;
      color: #cdd6f4;
      user-select: none;
    }

    .file-entry:hover { background: #313244; }
    .file-entry.selected { background: #45475a; }

    .file-entry input[type="checkbox"] {
      cursor: pointer;
      flex-shrink: 0;
      accent-color: #89b4fa;
      width: 14px;
      height: 14px;
    }

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
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      color: #a6adc8;
      border-bottom: 1px solid #313244;
      background: #1e1e2e;
      flex-shrink: 0;
      overflow: hidden;
    }

    .diff-header-path {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
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

    .diff-line.added:hover,
    .diff-line.removed:hover { cursor: pointer; filter: brightness(1.3); }

    .diff-line.added.selected {
      background: rgba(166, 227, 161, 0.35);
      outline: 1px solid #a6e3a1;
      outline-offset: -1px;
    }

    .diff-line.removed.selected {
      background: rgba(243, 139, 168, 0.35);
      outline: 1px solid #f38ba8;
      outline-offset: -1px;
    }

    .diff-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #45475a;
      font-size: 0.875rem;
    }

    .stage-lines-btn {
      background: #a6e3a1;
      border: none;
      border-radius: 4px;
      color: #1e1e2e;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.6rem;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .stage-lines-btn:hover { background: #c3f0c0; }

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
  @property({ type: Number }) refreshKey = 0;
  @query('.file-entries') private fileEntries?: HTMLDivElement;

  @state() private status: RepositoryStatusResult = { staged: [], unstaged: [] };
  private _orderedPaths: string[] = [];
  @state() private selectedFile: FileStatusEntry | null = null;
  @state() private diff = '';
  @state() private diffError = '';
  @state() private commitMessage = '';
  @state() private commitDescription = '';
  @state() private commitError = '';
  @state() private committing = false;
  @state() private selectedLineIndices = new Set<number>();
  private lastSelectedLineIndex: number | null = null;
  private parsedHunks: ParsedHunk[] = [];

  updated(changed: Map<string, unknown>) {
    if (changed.has('repoId') && this.repoId) {
      this.selectedFile = null;
      this.diff = '';
      this.diffError = '';
      this._orderedPaths = [];
      this.loadStatus();
    } else if (changed.has('refreshKey') && this.repoId) {
      const prevFile = this.selectedFile;
      this.loadStatus().then(async () => {
        if (!prevFile) return;
        const updated = this.allFiles.find(f => f.filePath === prevFile.filePath);
        if (updated) {
          await this.selectFile(updated);
        } else {
          this.selectedFile = null;
          this.diff = '';
          this.diffError = '';
        }
      });
    }
  }

  private async loadStatus() {
    if (!this.repoId) return;
    try {
      const newStatus = await repositoryService.getStatus(this.repoId);
      const newPaths = this.getStablePaths(newStatus);
      const kept = this._orderedPaths.filter(p => newPaths.includes(p));
      const added = newPaths.filter(p => !this._orderedPaths.includes(p));
      this._orderedPaths = [...kept, ...added];
      this.status = newStatus;
    } catch {
      this.status = { staged: [], unstaged: [] };
      this._orderedPaths = [];
    }
  }

  private async selectFile(entry: FileStatusEntry) {
    await this.preserveFileListScroll(async () => {
      this.selectedFile = entry;
      this.diff = '';
      this.diffError = '';
      this.selectedLineIndices = new Set();
      this.lastSelectedLineIndex = null;
      this.parsedHunks = [];
      try {
        this.diff = await repositoryService.getDiff(this.repoId, entry.filePath, entry.isStaged);
      } catch (e: unknown) {
        this.diffError = e instanceof Error ? e.message : 'Fehler beim Laden des Diffs';
      }
    });
  }

  private async toggleFile(entry: FileStatusEntry, selectAfterToggle = false) {
    await this.preserveFileListScroll(async () => {
      const shouldSelect = selectAfterToggle || this.selectedFile?.filePath === entry.filePath;
      if (entry.isStaged) {
        await repositoryService.unstageFile(this.repoId, entry.filePath);
      } else {
        await repositoryService.stageFile(this.repoId, entry.filePath);
      }
      await this.loadStatus();
      if (shouldSelect) {
        const updated = this.allFiles.find(f => f.filePath === entry.filePath);
        if (updated) await this.selectFile(updated);
      }
    });
  }

  private async toggleAll(checked: boolean) {
    await this.preserveFileListScroll(async () => {
      if (checked) {
        await repositoryService.stageAll(this.repoId);
      } else {
        await repositoryService.unstageAll(this.repoId);
      }
      this.selectedFile = null;
      this.diff = '';
      await this.loadStatus();
    });
  }

  private async preserveFileListScroll<T>(action: () => Promise<T> | T): Promise<T> {
    const scrollTop = this.fileEntries?.scrollTop ?? 0;
    const result = await action();
    await this.updateComplete;
    if (this.fileEntries) {
      this.fileEntries.scrollTop = scrollTop;
    }
    return result;
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
      this.dispatchEvent(new CustomEvent('commit-created', { bubbles: true, composed: true }));
    } catch (e: unknown) {
      this.commitError = e instanceof Error ? e.message : 'Commit fehlgeschlagen';
    } finally {
      this.committing = false;
    }
  }

  private toggleLineSelection(globalIndex: number, shiftKey: boolean) {
    const next = new Set(this.selectedLineIndices);
    if (shiftKey && this.lastSelectedLineIndex !== null) {
      const from = Math.min(this.lastSelectedLineIndex, globalIndex);
      const to = Math.max(this.lastSelectedLineIndex, globalIndex);
      // collect all selectable indices in this range
      const selectableInRange = this.parsedHunks
        .flatMap(h => h.lines)
        .filter(l => l.globalIndex >= from && l.globalIndex <= to && l.type !== 'context');
      const allSelected = selectableInRange.every(l => next.has(l.globalIndex));
      for (const l of selectableInRange) {
        if (allSelected) next.delete(l.globalIndex);
        else next.add(l.globalIndex);
      }
    } else {
      if (next.has(globalIndex)) next.delete(globalIndex);
      else next.add(globalIndex);
    }
    this.lastSelectedLineIndex = globalIndex;
    this.selectedLineIndices = next;
  }

  private buildPartialPatch(): string {
    if (!this.selectedFile || this.parsedHunks.length === 0) return '';

    const fp = this.selectedFile.filePath;
    let patchBody = '';

    for (const hunk of this.parsedHunks) {
      const resultLines: string[] = [];

      for (const line of hunk.lines) {
        if (line.type === 'context') {
          resultLines.push(line.content);
        } else if (line.type === 'added') {
          if (this.selectedLineIndices.has(line.globalIndex)) {
            resultLines.push(line.content); // keep as '+'
          }
          // unselected '+' → dropped entirely
        } else if (line.type === 'removed') {
          if (this.selectedLineIndices.has(line.globalIndex)) {
            resultLines.push(line.content); // keep as '-'
          } else {
            // unselected '-' → becomes context (stays in both old and new)
            resultLines.push(' ' + line.content.slice(1));
          }
        }
      }

      // Skip hunk if nothing actionable remains
      const hasChanges = resultLines.some(l => l.startsWith('+') || l.startsWith('-'));
      if (!hasChanges) continue;

      const oldCount = resultLines.filter(l => !l.startsWith('+')).length;
      const newCount = resultLines.filter(l => !l.startsWith('-')).length;
      patchBody += `@@ -${hunk.oldStart},${oldCount} +${hunk.newStart},${newCount} @@\n`;
      patchBody += resultLines.join('\n') + '\n';
    }

    if (!patchBody) return '';

    return `diff --git a/${fp} b/${fp}\n--- a/${fp}\n+++ b/${fp}\n${patchBody}`;
  }

  private async stageSelectedLines() {
    if (!this.selectedFile) return;
    const patch = this.buildPartialPatch();
    if (!patch) return;
    try {
      await repositoryService.stageLines(this.repoId, {
        filePath: this.selectedFile.filePath,
        patch,
      });
      this.selectedLineIndices = new Set();
      this.lastSelectedLineIndex = null;
      await this.loadStatus();
      const updated = this.allFiles.find(f => f.filePath === this.selectedFile?.filePath);
      if (updated) await this.selectFile(updated);
    } catch (e: unknown) {
      this.diffError = e instanceof Error ? e.message : 'Fehler beim Stagen der Zeilen';
    }
  }

  private parseDiff(): ParsedHunk[] {
    if (!this.diff) return [];

    const isMetadata = (l: string) =>
      l.startsWith('diff --git') || l.startsWith('index ') ||
      l.startsWith('--- ') || l.startsWith('+++ ') ||
      l.startsWith('\\ No newline') ||
      l.startsWith('new file mode') || l.startsWith('deleted file mode') ||
      l.startsWith('old mode') || l.startsWith('new mode');

    const raw = this.diff.split('\n');
    if (raw[raw.length - 1] === '') raw.pop();

    const hunks: ParsedHunk[] = [];
    let currentHunk: ParsedHunk | null = null;
    let oldLineNum = 0;
    let newLineNum = 0;
    let globalIndex = 0;

    for (const line of raw) {
      if (isMetadata(line)) continue;

      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldLineNum = parseInt(match[1]) - 1;
          newLineNum = parseInt(match[2]) - 1;
          currentHunk = { oldStart: parseInt(match[1]), newStart: parseInt(match[2]), lines: [] };
          hunks.push(currentHunk);
        }
        continue;
      }

      if (!currentHunk) continue;

      if (line.startsWith('+')) {
        newLineNum++;
        currentHunk.lines.push({ type: 'added', content: line, oldNum: '', newNum: newLineNum, globalIndex });
      } else if (line.startsWith('-')) {
        oldLineNum++;
        currentHunk.lines.push({ type: 'removed', content: line, oldNum: oldLineNum, newNum: '', globalIndex });
      } else {
        oldLineNum++;
        newLineNum++;
        currentHunk.lines.push({ type: 'context', content: line, oldNum: oldLineNum, newNum: newLineNum, globalIndex });
      }
      globalIndex++;
    }

    return hunks;
  }

  private statusChar(s: string) {
    return s === 'Modified' ? 'M' : s === 'Added' ? 'A' : s === 'Deleted' ? 'D' : s === 'Renamed' ? 'R' : '?';
  }

  private getStablePaths(status: RepositoryStatusResult): string[] {
    return [...new Set([...status.staged, ...status.unstaged].map(f => f.filePath))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }

  private renderDiff() {
    if (!this.selectedFile) {
      return html`<div class="diff-placeholder">Datei auswählen</div>`;
    }
    if (this.diffError) {
      return html`<div class="diff-placeholder" style="color:#f38ba8">${this.diffError}</div>`;
    }
    if (!this.diff) {
      return html`<div class="diff-placeholder">Kein Diff verfügbar</div>`;
    }

    this.parsedHunks = this.parseDiff();

    return html`
      <div class="diff-content">
        ${this.parsedHunks.flatMap(hunk => hunk.lines.map(line => {
          const isSelected = this.selectedLineIndices.has(line.globalIndex);
          const selectable = line.type !== 'context';
          const cls = `${line.type} ${isSelected ? 'selected' : ''}`;

          return html`
            <div
              class="diff-line ${cls}"
              @click=${selectable
                ? (e: MouseEvent) => this.toggleLineSelection(line.globalIndex, e.shiftKey)
                : null}>
              <span class="diff-line-num">${line.oldNum}</span>
              <span class="diff-line-num">${line.newNum}</span>
              <span class="diff-line-content">${line.content}</span>
            </div>`;
        }))}
      </div>`;
  }

  private get allFiles(): FileStatusEntry[] {
    const map = new Map([...this.status.staged, ...this.status.unstaged].map(f => [f.filePath, f]));
    return this._orderedPaths.map(p => map.get(p)).filter(Boolean) as FileStatusEntry[];
  }

  private get allChecked(): boolean {
    return this.allFiles.length > 0 && this.status.unstaged.length === 0;
  }

  private get someChecked(): boolean {
    return this.status.staged.length > 0 && this.status.unstaged.length > 0;
  }

  private renderFileEntry(entry: FileStatusEntry) {
    const isSelected = this.selectedFile?.filePath === entry.filePath;
    return html`
      <div class="file-entry ${isSelected ? 'selected' : ''}"
        @click=${() => this.selectFile(entry)}>
        <input type="checkbox"
          .checked=${entry.isStaged}
          @click=${(e: Event) => { e.stopPropagation(); this.toggleFile(entry, true); }} />
        <span class="file-status status-${entry.status}">${this.statusChar(entry.status)}</span>
        <span class="file-name" title="${entry.filePath}">${entry.filePath}</span>
      </div>`;
  }

  render() {
    const stagedCount = this.status.staged.length;
    const totalCount = this.allFiles.length;
    const showStageLinesBtn =
      this.selectedLineIndices.size > 0 &&
      this.selectedFile !== null &&
      !this.selectedFile.isStaged;

    return html`
      <div class="file-list">
        <div class="list-header">
          <input type="checkbox"
            .checked=${this.allChecked}
            .indeterminate=${this.someChecked}
            @change=${(e: Event) => this.toggleAll((e.target as HTMLInputElement).checked)} />
          <span>Änderungen (${totalCount})</span>
        </div>

        <div class="file-entries">
          ${totalCount === 0
            ? html`<div class="empty-hint">Keine Änderungen</div>`
            : repeat(this.allFiles, e => e.filePath, e => this.renderFileEntry(e))}
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
            ?disabled=${!this.commitMessage.trim() || stagedCount === 0 || this.committing}
            @click=${this.doCommit}>
            ${this.committing ? 'Committing…' : `Commit (${stagedCount} Datei${stagedCount !== 1 ? 'en' : ''})`}
          </button>
        </div>
      </div>

      <div class="diff-panel">
        <div class="diff-header">
          <span class="diff-header-path">${this.selectedFile ? this.selectedFile.filePath : 'Kein Diff'}</span>
          ${showStageLinesBtn ? html`
            <button class="stage-lines-btn" @click=${this.stageSelectedLines}>
              ${this.selectedLineIndices.size} Zeile${this.selectedLineIndices.size !== 1 ? 'n' : ''} stagen
            </button>` : ''}
        </div>
        ${this.renderDiff()}
      </div>
    `;
  }
}
