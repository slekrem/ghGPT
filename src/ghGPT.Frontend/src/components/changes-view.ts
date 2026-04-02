import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { marked } from 'marked';
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
  lineKey: string;
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
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      color: #a6adc8;
      border-bottom: 1px solid #313244;
      background: #1e1e2e;
      flex-shrink: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .diff-header-path {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .review-btn {
      background: transparent;
      border: 1px solid #45475a;
      border-radius: 4px;
      color: #a6adc8;
      cursor: pointer;
      font-size: 0.72rem;
      padding: 0.15rem 0.55rem;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .review-btn:hover:not(:disabled) { background: #313244; color: #cdd6f4; }
    .review-btn:disabled { opacity: 0.45; cursor: default; }

    .review-overlay {
      position: absolute;
      inset: 0;
      background: #181825;
      z-index: 10;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .review-overlay-header {
      padding: 0.6rem 1rem;
      border-bottom: 1px solid #313244;
      background: #1e1e2e;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .review-overlay-title {
      font-size: 0.82rem;
      font-weight: 600;
      color: #cdd6f4;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .review-close-btn {
      background: none;
      border: none;
      color: #6c7086;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
      line-height: 1;
    }

    .review-close-btn:hover { color: #cdd6f4; background: #313244; }

    .review-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 1.25rem;
      font-size: 0.83rem;
      line-height: 1.6;
      color: #cdd6f4;
    }

    .review-streaming {
      font-style: italic;
      color: #6c7086;
      font-size: 0.78rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .review-content h2 { font-size: 0.9rem; color: #cdd6f4; margin: 0.75em 0 0.35em; }
    .review-content h3 { font-size: 0.84rem; color: #a6adc8; margin: 0.6em 0 0.25em; }
    .review-content p { margin: 0 0 0.5em; }
    .review-content p:last-child { margin-bottom: 0; }
    .review-content ul, .review-content ol { margin: 0.25em 0; padding-left: 1.4em; }
    .review-content li { margin: 0.15em 0; }
    .review-content strong { color: #cba6f7; }
    .review-content code {
      background: #313244;
      padding: 0.1em 0.35em;
      border-radius: 4px;
      font-family: 'Cascadia Code', monospace;
      font-size: 0.77rem;
      color: #89b4fa;
    }
    .review-content pre {
      background: #11111b;
      border: 1px solid #313244;
      border-radius: 6px;
      padding: 0.6rem 0.75rem;
      overflow-x: auto;
      margin: 0.4em 0;
    }
    .review-content pre code { background: none; padding: 0; color: #cdd6f4; }

    .diff-content {
      flex: 1;
      overflow: auto;
      padding: 0;
      font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
      font-size: 0.78rem;
      background:
        linear-gradient(90deg, #202539 0, #202539 28px, transparent 28px);
    }

    .diff-line {
      display: flex;
      align-items: center;
      min-height: 22px;
      padding: 0 0.75rem 0 0;
      line-height: 1.45;
      white-space: pre;
      border-left: 3px solid transparent;
    }

    .diff-line-check {
      width: 28px;
      flex-shrink: 0;
      display: flex;
      align-self: stretch;
      justify-content: center;
      align-items: center;
      background: rgba(137, 180, 250, 0.04);
      border-right: 1px solid rgba(69, 71, 90, 0.45);
    }

    .diff-line-check input {
      width: 13px;
      height: 13px;
      accent-color: #89b4fa;
      cursor: pointer;
      margin: 0;
    }

    .diff-line-num {
      width: 32px;
      flex-shrink: 0;
      color: #585b70;
      user-select: none;
      text-align: right;
      padding-right: 0.45rem;
    }

    .diff-line-content {
      flex: 1;
      overflow-x: auto;
      padding-left: 0.1rem;
    }

    .diff-line.is-checked {
      border-left-color: #89b4fa;
    }

    .diff-line.is-checked .diff-line-check {
      background: rgba(137, 180, 250, 0.14);
    }

    .diff-line.added   { background: rgba(166, 227, 161, 0.12); color: #a6e3a1; }
    .diff-line.removed { background: rgba(243, 139, 168, 0.12); color: #f38ba8; }
    .diff-line.context { color: #cdd6f4; }

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

    .ai-btn {
      background: transparent;
      border: 1px solid #45475a;
      border-radius: 4px;
      color: #a6adc8;
      cursor: pointer;
      font-size: 0.75rem;
      padding: 0.2rem 0.6rem;
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .ai-btn:hover:not(:disabled) { background: #313244; color: #cdd6f4; }
    .ai-btn:disabled { opacity: 0.45; cursor: default; }

    .ai-streaming {
      font-size: 0.72rem;
      color: #89b4fa;
      font-style: italic;
      min-height: 1em;
    }

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
  @state() private selectedPath = '';
  @state() private combinedDiff = '';
  @state() private stagedDiff = '';
  @state() private stagedLineKeyValues: string[] = [];
  @state() private diffError = '';
  @state() private commitMessage = '';
  @state() private commitDescription = '';
  @state() private generatingMessage = false;
  @state() private aiStreamPreview = '';
  @state() private reviewContent = '';
  @state() private reviewStreaming = false;
  @state() private showReview = false;
  @state() private commitError = '';
  @state() private committing = false;
  @state() private lineActionInProgress = false;
  private lastSelectedLineKey: string | null = null;

  updated(changed: Map<string, unknown>) {
    if (changed.has('repoId') && this.repoId) {
      this.selectedPath = '';
      this.combinedDiff = '';
      this.stagedDiff = '';
      this.stagedLineKeyValues = [];
      this.diffError = '';
      this._orderedPaths = [];
      this.loadStatus();
    } else if (changed.has('refreshKey') && this.repoId) {
      const prevPath = this.selectedPath;
      this.loadStatus().then(async () => {
        if (!prevPath) return;
        if (this.allFiles.some(f => f.filePath === prevPath)) {
          await this.selectFile(prevPath);
        } else {
          this.selectedPath = '';
          this.combinedDiff = '';
          this.stagedDiff = '';
          this.stagedLineKeyValues = [];
          this.diffError = '';
        }
      });
    }
  }

  private async loadStatus() {
    if (!this.repoId) return;
    try {
      const newStatus = await repositoryService.getStatus(this.repoId);
      const newPaths = this.sortedPaths([...newStatus.staged, ...newStatus.unstaged]);
      const kept = this._orderedPaths.filter(p => newPaths.includes(p));
      const added = newPaths.filter(p => !this._orderedPaths.includes(p));
      this._orderedPaths = [...kept, ...added];
      this.status = newStatus;
    } catch {
      this.status = { staged: [], unstaged: [] };
      this._orderedPaths = [];
    }
  }

  private async selectFile(filePath: string) {
    await this.preserveFileListScroll(async () => {
      this.selectedPath = filePath;
      this.diffError = '';
      this.lastSelectedLineKey = null;

      try {
        const nextCombinedDiff = await repositoryService.getCombinedDiff(this.repoId, filePath);
        let nextStagedDiff = '';
        if (this.status.staged.some(f => f.filePath === filePath)) {
          nextStagedDiff = await repositoryService.getDiff(this.repoId, filePath, true);
        }
        this.combinedDiff = nextCombinedDiff;
        this.stagedDiff = nextStagedDiff;
        this.stagedLineKeyValues = this.extractStagedLineKeys(nextStagedDiff);
      } catch (e: unknown) {
        this.diffError = e instanceof Error ? e.message : 'Fehler beim Laden des Diffs';
      }
    });
  }

  private async toggleFile(entry: FileStatusEntry, selectAfterToggle = false) {
    await this.preserveFileListScroll(async () => {
      const shouldSelect = selectAfterToggle || this.selectedPath === entry.filePath;
      if (entry.isStaged) {
        await repositoryService.unstageFile(this.repoId, entry.filePath);
      } else {
        await repositoryService.stageFile(this.repoId, entry.filePath);
      }
      await this.loadStatus();
      if (shouldSelect) {
        await this.selectFile(entry.filePath);
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
      this.selectedPath = '';
      this.combinedDiff = '';
      this.stagedDiff = '';
      this.stagedLineKeyValues = [];
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

  private async startReview() {
    const totalCount = this.status.staged.length + this.status.unstaged.length;
    if (totalCount === 0 || this.reviewStreaming) return;

    this.showReview = true;
    this.reviewStreaming = true;
    this.reviewContent = '';

    try {
      const response = await fetch(`/api/repos/${encodeURIComponent(this.repoId)}/ai/review`, {
        method: 'POST',
      });
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
          if (line.startsWith('event: done')) { return; }
          if (line.startsWith('data: ')) {
            const token: string = JSON.parse(line.slice(6));
            this.reviewContent += token;
          }
        }
      }
    } catch {
      this.reviewContent += '\n\n*Fehler beim Laden des Reviews.*';
    } finally {
      this.reviewStreaming = false;
    }
  }

  private async generateCommitMessage() {
    if (this.generatingMessage || this.status.staged.length === 0) return;
    this.generatingMessage = true;
    this.aiStreamPreview = '';
    this.commitMessage = '';

    try {
      const response = await fetch(`/api/repos/${encodeURIComponent(this.repoId)}/ai/commit-message`, {
        method: 'POST',
      });
      if (!response.ok || !response.body) throw new Error('Anfrage fehlgeschlagen');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('event: done')) {
            this.commitMessage = accumulated.trim();
            this.aiStreamPreview = '';
            return;
          }
          if (line.startsWith('data: ')) {
            const token: string = JSON.parse(line.slice(6));
            accumulated += token;
            this.aiStreamPreview = accumulated;
          }
        }
      }
      this.commitMessage = accumulated.trim();
      this.aiStreamPreview = '';
    } catch {
      // Fehler still ignorieren
    } finally {
      this.generatingMessage = false;
      this.aiStreamPreview = '';
    }
  }

  private async doCommit() {
    if (!this.commitMessage.trim() || this.status.staged.length === 0) return;
    this.committing = true;
    this.commitError = '';
    try {
      await repositoryService.commit(this.repoId, this.commitMessage.trim(), this.commitDescription.trim() || undefined);
      this.commitMessage = '';
      this.commitDescription = '';
      this.selectedPath = '';
      this.combinedDiff = '';
      this.stagedDiff = '';
      this.stagedLineKeyValues = [];
      await this.loadStatus();
      this.dispatchEvent(new CustomEvent('commit-created', { bubbles: true, composed: true }));
    } catch (e: unknown) {
      this.commitError = e instanceof Error ? e.message : 'Commit fehlgeschlagen';
    } finally {
      this.committing = false;
    }
  }

  private parseDiff(diff: string): ParsedHunk[] {
    if (!diff) return [];

    const isMetadata = (l: string) =>
      l.startsWith('diff --git') || l.startsWith('index ') ||
      l.startsWith('--- ') || l.startsWith('+++ ') ||
      l.startsWith('\\ No newline') ||
      l.startsWith('new file mode') || l.startsWith('deleted file mode') ||
      l.startsWith('old mode') || l.startsWith('new mode');

    const raw = diff.split('\n');
    if (raw[raw.length - 1] === '') raw.pop();

    const hunks: ParsedHunk[] = [];
    let currentHunk: ParsedHunk | null = null;
    let oldLineNum = 0;
    let newLineNum = 0;
    let globalIndex = 0;
    const occurrenceCounts = new Map<string, number>();

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

      let type: ParsedDiffLine['type'];
      let oldNum: number | '' = '';
      let newNum: number | '' = '';

      if (line.startsWith('+')) {
        type = 'added';
        newLineNum++;
        newNum = newLineNum;
      } else if (line.startsWith('-')) {
        type = 'removed';
        oldLineNum++;
        oldNum = oldLineNum;
      } else {
        type = 'context';
        oldLineNum++;
        newLineNum++;
        oldNum = oldLineNum;
        newNum = newLineNum;
      }

      const baseKey = `${type}:${line}`;
      const occurrence = occurrenceCounts.get(baseKey) ?? 0;
      occurrenceCounts.set(baseKey, occurrence + 1);

      currentHunk.lines.push({
        type,
        content: line,
        oldNum,
        newNum,
        globalIndex,
        lineKey: `${baseKey}:${occurrence}`,
      });
      globalIndex++;
    }

    return hunks;
  }

  private get combinedHunks(): ParsedHunk[] {
    return this.parseDiff(this.combinedDiff);
  }

  private extractStagedLineKeys(diff: string): string[] {
    return this.parseDiff(diff)
      .flatMap(h => h.lines)
      .filter(l => l.type !== 'context')
      .map(l => l.lineKey);
  }

  private get stagedLineKeys(): Set<string> {
    return new Set(this.stagedLineKeyValues);
  }

  private collectLineIndices(globalIndex: number, shiftKey: boolean, checkedNow: boolean): Set<number> {
    if (!shiftKey || this.lastSelectedLineKey === null) {
      this.lastSelectedLineKey = String(globalIndex);
      return new Set([globalIndex]);
    }

    const lastIndex = parseInt(this.lastSelectedLineKey, 10);
    const from = Math.min(lastIndex, globalIndex);
    const to = Math.max(lastIndex, globalIndex);
    this.lastSelectedLineKey = String(globalIndex);

    return new Set(
      this.combinedHunks
        .flatMap(h => h.lines)
        .filter(l => l.globalIndex >= from && l.globalIndex <= to && l.type !== 'context')
        .filter(l => this.stagedLineKeys.has(l.lineKey) === checkedNow)
        .map(l => l.globalIndex)
    );
  }

  private buildStagePatch(selectedLineIndices: Set<number>): string {
    if (!this.selectedPath || this.combinedHunks.length === 0) return '';

    let patchBody = '';
    const stagedLineKeys = this.stagedLineKeys;

    for (const hunk of this.combinedHunks) {
      const resultLines: string[] = [];

      for (const line of hunk.lines) {
        if (line.type === 'context') {
          resultLines.push(line.content);
        } else if (line.type === 'added') {
          if (selectedLineIndices.has(line.globalIndex)) {
            resultLines.push(line.content);
          } else if (stagedLineKeys.has(line.lineKey)) {
            resultLines.push(' ' + line.content.slice(1));
          }
        } else {
          if (selectedLineIndices.has(line.globalIndex)) {
            resultLines.push(line.content);
          } else if (!stagedLineKeys.has(line.lineKey)) {
            resultLines.push(' ' + line.content.slice(1));
          }
        }
      }

      const hasChanges = resultLines.some(l => l.startsWith('+') || l.startsWith('-'));
      if (!hasChanges) continue;

      const oldCount = resultLines.filter(l => !l.startsWith('+')).length;
      const newCount = resultLines.filter(l => !l.startsWith('-')).length;
      patchBody += `@@ -${hunk.oldStart},${oldCount} +${hunk.newStart},${newCount} @@\n`;
      patchBody += resultLines.join('\n') + '\n';
    }

    if (!patchBody) return '';

    return `diff --git a/${this.selectedPath} b/${this.selectedPath}\n--- a/${this.selectedPath}\n+++ b/${this.selectedPath}\n${patchBody}`;
  }

  private buildUnstagePatch(selectedLineIndices: Set<number>): string {
    if (!this.selectedPath || this.combinedHunks.length === 0) return '';

    let patchBody = '';
    const stagedLineKeys = this.stagedLineKeys;

    for (const hunk of this.combinedHunks) {
      const resultLines: string[] = [];

      for (const line of hunk.lines) {
        if (line.type === 'context') {
          resultLines.push(line.content);
        } else if (line.type === 'added') {
          if (selectedLineIndices.has(line.globalIndex)) {
            resultLines.push(line.content);
          } else if (stagedLineKeys.has(line.lineKey)) {
            resultLines.push(' ' + line.content.slice(1));
          }
        } else if (selectedLineIndices.has(line.globalIndex)) {
          resultLines.push(line.content);
        } else if (!stagedLineKeys.has(line.lineKey)) {
          resultLines.push(' ' + line.content.slice(1));
        }
      }

      const hasChanges = resultLines.some(l => l.startsWith('+') || l.startsWith('-'));
      if (!hasChanges) continue;

      const oldCount = resultLines.filter(l => !l.startsWith('+')).length;
      const newCount = resultLines.filter(l => !l.startsWith('-')).length;
      patchBody += `@@ -${hunk.oldStart},${oldCount} +${hunk.newStart},${newCount} @@\n`;
      patchBody += resultLines.join('\n') + '\n';
    }

    if (!patchBody) return '';

    return `diff --git a/${this.selectedPath} b/${this.selectedPath}\n--- a/${this.selectedPath}\n+++ b/${this.selectedPath}\n${patchBody}`;
  }

  private async toggleLine(globalIndex: number, shiftKey: boolean) {
    if (!this.selectedPath) return;

    const line = this.combinedHunks.flatMap(h => h.lines).find(l => l.globalIndex === globalIndex);
    if (!line || line.type === 'context') return;

    const isChecked = this.stagedLineKeys.has(line.lineKey);
    const selectedLineIndices = this.collectLineIndices(globalIndex, shiftKey, isChecked);
    const patch = isChecked
      ? this.buildUnstagePatch(selectedLineIndices)
      : this.buildStagePatch(selectedLineIndices);
    if (!patch) return;

    const selectedLines = this.combinedHunks
      .flatMap(h => h.lines)
      .filter(l => selectedLineIndices.has(l.globalIndex) && l.type !== 'context');
    const nextStagedLineKeys = new Set(this.stagedLineKeys);
    for (const selectedLine of selectedLines) {
      if (isChecked) {
        nextStagedLineKeys.delete(selectedLine.lineKey);
      } else {
        nextStagedLineKeys.add(selectedLine.lineKey);
      }
    }

    this.lineActionInProgress = true;

    try {
      this.stagedLineKeyValues = [...nextStagedLineKeys];

      if (isChecked) {
        await repositoryService.unstageLines(this.repoId, {
          filePath: this.selectedPath,
          patch,
        });
      } else {
        await repositoryService.stageLines(this.repoId, {
          filePath: this.selectedPath,
          patch,
        });
      }

      await this.loadStatus();
    } catch (e: unknown) {
      this.stagedLineKeyValues = this.extractStagedLineKeys(this.stagedDiff);
      this.diffError = e instanceof Error
        ? e.message
        : isChecked
          ? 'Fehler beim Unstagen der Zeilen'
          : 'Fehler beim Stagen der Zeilen';
    } finally {
      this.lineActionInProgress = false;
    }
  }

  private statusChar(s: string) {
    return s === 'Modified' ? 'M' : s === 'Added' ? 'A' : s === 'Deleted' ? 'D' : s === 'Renamed' ? 'R' : '?';
  }

  private sortedPaths(entries: FileStatusEntry[]): string[] {
    return [...new Set(entries.map(f => f.filePath))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }

  private renderDiff() {
    if (!this.selectedPath) {
      return html`<div class="diff-placeholder">Datei auswählen</div>`;
    }
    if (this.diffError) {
      return html`<div class="diff-placeholder" style="color:#f38ba8">${this.diffError}</div>`;
    }
    if (!this.combinedDiff) {
      return html`<div class="diff-placeholder">Kein Diff verfügbar</div>`;
    }

    return html`
      <div class="diff-content">
        ${this.combinedHunks.flatMap(hunk => hunk.lines.map(line => {
          const selectable = line.type !== 'context';
          const isChecked = selectable && this.stagedLineKeys.has(line.lineKey);

          return html`
            <div class="diff-line ${line.type} ${isChecked ? 'is-checked' : ''}">
              <span class="diff-line-check">
                ${selectable ? html`
                  <input
                    type="checkbox"
                    .checked=${isChecked}
                    ?disabled=${this.lineActionInProgress}
                    @click=${(e: MouseEvent) => {
                      e.stopPropagation();
                      this.toggleLine(line.globalIndex, e.shiftKey);
                    }} />` : ''}
              </span>
              <span class="diff-line-num">${line.oldNum}</span>
              <span class="diff-line-num">${line.newNum}</span>
              <span class="diff-line-content">${line.content}</span>
            </div>`;
        }))}
      </div>`;
  }

  private get allFiles(): FileStatusEntry[] {
    const map = new Map<string, FileStatusEntry>();

    for (const file of this.status.unstaged) {
      map.set(file.filePath, file);
    }

    for (const file of this.status.staged) {
      if (!map.has(file.filePath)) {
        map.set(file.filePath, file);
      }
    }

    return this._orderedPaths.map(path => map.get(path)).filter(Boolean) as FileStatusEntry[];
  }

  private get allChecked(): boolean {
    return this.status.staged.length > 0 && this.status.unstaged.length === 0;
  }

  private get someChecked(): boolean {
    return this.status.staged.length > 0 && this.status.unstaged.length > 0;
  }

  private renderFileEntry(entry: FileStatusEntry) {
    const filePath = entry.filePath;
    const isSelected = this.selectedPath === filePath;
    const isFullyStaged = this.status.staged.some(f => f.filePath === filePath)
      && !this.status.unstaged.some(f => f.filePath === filePath);
    const isPartiallyStaged = this.status.staged.some(f => f.filePath === filePath)
      && this.status.unstaged.some(f => f.filePath === filePath);

    return html`
      <div class="file-entry ${isSelected ? 'selected' : ''}"
        @click=${() => this.selectFile(filePath)}>
        <input type="checkbox"
          .checked=${isFullyStaged}
          .indeterminate=${isPartiallyStaged}
          @click=${(e: Event) => {
            e.stopPropagation();
            this.toggleFile(
              {
                filePath,
                status: entry.status,
                isStaged: isFullyStaged || isPartiallyStaged,
              },
              true
            );
          }} />
        <span class="file-status status-${entry.status}">${this.statusChar(entry.status)}</span>
        <span class="file-name" title="${filePath}">${filePath}</span>
      </div>`;
  }

  render() {
    const stagedCount = this.status.staged.length;
    const totalCount = this.allFiles.length;

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
          <button class="ai-btn"
            ?disabled=${stagedCount === 0 || this.generatingMessage || this.committing}
            @click=${this.generateCommitMessage}>
            ✦ ${this.generatingMessage ? 'Generiere…' : 'KI-Vorschlag'}
          </button>
          ${this.aiStreamPreview ? html`<div class="ai-streaming">${this.aiStreamPreview}</div>` : ''}
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
            ${this.committing ? 'Committing...' : `Commit (${stagedCount} Datei${stagedCount !== 1 ? 'en' : ''})`}
          </button>
        </div>
      </div>

      <div class="diff-panel" style="position:relative">
        <div class="diff-header">
          <span class="diff-header-path">${this.selectedPath || 'Kein Diff'}</span>
          <button class="review-btn"
            ?disabled=${(this.status.staged.length + this.status.unstaged.length) === 0 || this.reviewStreaming}
            @click=${this.startReview}>
            ✦ ${this.reviewStreaming ? 'Analysiere…' : 'Code-Review'}
          </button>
        </div>
        ${this.renderDiff()}
        ${this.showReview ? html`
          <div class="review-overlay">
            <div class="review-overlay-header">
              <span class="review-overlay-title">✦ Code-Review</span>
              <button class="review-close-btn" @click=${() => { this.showReview = false; }}>✕</button>
            </div>
            <div class="review-content">
              ${this.reviewStreaming && !this.reviewContent
                ? html`<div class="review-streaming">Analysiere Änderungen…</div>`
                : unsafeHTML(marked.parse(this.reviewContent || '') as string)}
              ${this.reviewStreaming ? html`<div class="review-streaming" style="margin-top:0.5rem">▌</div>` : nothing}
            </div>
          </div>
        ` : nothing}
      </div>
    `;
  }
}
