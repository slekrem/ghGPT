import { html, nothing } from 'lit';
import { AppElement } from '../app-element';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Erlaubte Tags und Attribute für das Markdown-Review-Rendering
const REVIEW_PURIFY_CONFIG = {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'hr', 'strong', 'em', 'a', 'code', 'pre',
                 'ul', 'ol', 'li', 'blockquote'],
  ALLOWED_ATTR: ['href', 'title', 'rel'],
};
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
export class ChangesView extends AppElement {
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
      this.resetReviewState();
      this.loadStatus();
    } else if (changed.has('refreshKey') && this.repoId) {
      this.resetReviewState();
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

  private resetReviewState() {
    this.reviewContent = '';
    this.showReview = false;
    this.reviewStreaming = false;
  }

  private handleReviewClick = () => {
    if (this.showReview) {
      this.showReview = false;
    } else if (!this.reviewContent) {
      this.startReview();
    } else {
      this.showReview = true;
    }
  };

  private get reviewBtnText(): string {
    if (this.reviewStreaming) return 'Analysiere…';
    if (this.showReview) return 'Review ausblenden';
    return this.reviewContent ? 'Review anzeigen' : 'Code-Review';
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
    } catch (err) {
      console.error('[CodeReview] Stream-Fehler:', err);
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
      return html`<div data-testid="diff-placeholder" class="flex items-center justify-center h-full text-cat-muted text-sm">Datei auswählen</div>`;
    }
    if (this.diffError) {
      return html`<div class="flex items-center justify-center h-full text-sm text-cat-red">${this.diffError}</div>`;
    }
    if (!this.combinedDiff) {
      return html`<div class="flex items-center justify-center h-full text-cat-muted text-sm">Kein Diff verfügbar</div>`;
    }

    return html`
      <div data-testid="diff-content" class="flex-1 overflow-auto p-0 font-mono text-[0.78rem]"
           style="background: linear-gradient(90deg, #202539 0, #202539 28px, transparent 28px)">
        ${this.combinedHunks.flatMap(hunk => hunk.lines.map(line => {
          const selectable = line.type !== 'context';
          const isChecked = selectable && this.stagedLineKeys.has(line.lineKey);

          return html`
            <div data-testid="diff-line" data-type=${line.type} class="diff-line ${line.type} flex leading-[1.5] whitespace-pre">
              <span data-testid="diff-line-num" class="w-8 shrink-0 text-cat-muted select-none text-right pr-2">${line.oldNum}</span>
              <span data-testid="diff-line-num" class="w-8 shrink-0 text-cat-muted select-none text-right pr-2">${line.newNum}</span>
              <span data-testid="diff-line-check" class="w-5 shrink-0 flex items-center justify-center">
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
              <span data-testid="diff-line-content" class="flex-1 min-w-0 overflow-hidden">${line.content}</span>
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

    const statusColorMap: Record<string, string> = {
      'Modified': 'text-cat-blue',
      'Added': 'text-cat-green',
      'Deleted': 'text-cat-red',
      'Renamed': 'text-cat-peach',
      'Untracked': 'text-cat-green',
    };
    const statusColor = statusColorMap[entry.status] ?? 'text-cat-subtext';

    return html`
      <div data-testid="file-entry" class="flex items-center gap-2 px-3 py-[0.3rem] cursor-pointer text-[0.8rem] text-cat-text select-none hover:bg-cat-overlay ${isSelected ? 'bg-cat-muted' : ''}"
        @click=${() => this.selectFile(filePath)}>
        <input type="checkbox"
          class="cursor-pointer shrink-0 accent-cat-blue w-[14px] h-[14px]"
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
        <span class="text-[0.65rem] font-bold w-[14px] text-center shrink-0 ${statusColor}">${this.statusChar(entry.status)}</span>
        <span class="overflow-hidden text-ellipsis whitespace-nowrap flex-1" title="${filePath}">${filePath}</span>
      </div>`;
  }

  render() {
    const stagedCount = this.status.staged.length;
    const totalCount = this.allFiles.length;

    return html`
      <div class="w-[260px] min-w-[260px] flex flex-col border-r border-cat-border overflow-hidden">
        <div data-testid="file-list-header" class="flex items-center gap-2 px-3 py-[0.4rem] text-[0.7rem] uppercase tracking-[0.08em] text-cat-subtle bg-cat-surface border-b border-cat-border shrink-0">
          <input type="checkbox"
            class="cursor-pointer"
            .checked=${this.allChecked}
            .indeterminate=${this.someChecked}
            @change=${(e: Event) => this.toggleAll((e.target as HTMLInputElement).checked)} />
          <span>Änderungen (${totalCount})</span>
        </div>

        <div class="file-entries overflow-y-auto flex-1">
          ${totalCount === 0
            ? html`<div class="px-3 py-2 text-[0.75rem] text-cat-muted italic">Keine Änderungen</div>`
            : repeat(this.allFiles, e => e.filePath, e => this.renderFileEntry(e))}
        </div>

        <div class="shrink-0 px-3 py-[0.6rem] border-t border-cat-border flex flex-col gap-[0.4rem] bg-cat-surface">
          <button
            class="bg-transparent border border-cat-muted rounded text-cat-subtext cursor-pointer text-[0.75rem] px-[0.6rem] py-[0.2rem] self-start flex items-center gap-[0.3rem] hover:bg-cat-overlay hover:text-cat-text disabled:opacity-45 disabled:cursor-default"
            ?disabled=${stagedCount === 0 || this.generatingMessage || this.committing}
            @click=${this.generateCommitMessage}>
            ✦ ${this.generatingMessage ? 'Generiere…' : 'KI-Vorschlag'}
          </button>
          ${this.aiStreamPreview ? html`<div class="text-[0.72rem] text-cat-blue italic min-h-[1em]">${this.aiStreamPreview}</div>` : ''}
          <input
            data-testid="commit-input"
            class="bg-cat-base border border-cat-border rounded text-cat-text text-[0.8rem] px-2 py-[0.35rem] w-full box-border font-[inherit] focus:outline-none focus:border-cat-blue placeholder:text-cat-muted"
            type="text"
            placeholder="Commit-Titel (Pflichtfeld)"
            .value=${this.commitMessage}
            @input=${(e: Event) => { this.commitMessage = (e.target as HTMLInputElement).value; }} />
          <textarea
            class="bg-cat-base border border-cat-border rounded text-cat-text text-[0.8rem] px-2 py-[0.35rem] w-full box-border font-[inherit] resize-none focus:outline-none focus:border-cat-blue placeholder:text-cat-muted"
            rows="2"
            placeholder="Beschreibung (optional)"
            .value=${this.commitDescription}
            @input=${(e: Event) => { this.commitDescription = (e.target as HTMLTextAreaElement).value; }}></textarea>
          ${this.commitError ? html`<div class="text-[0.72rem] text-cat-red">${this.commitError}</div>` : ''}
          <button
            data-testid="commit-btn"
            class="bg-cat-blue border-none rounded text-cat-surface cursor-pointer text-[0.8rem] font-semibold px-3 py-[0.35rem] w-full disabled:bg-cat-overlay disabled:text-cat-muted disabled:cursor-default hover:enabled:bg-[#b4d0ff]"
            ?disabled=${!this.commitMessage.trim() || stagedCount === 0 || this.committing}
            @click=${this.doCommit}>
            ${this.committing ? 'Committing...' : `Commit (${stagedCount} Datei${stagedCount !== 1 ? 'en' : ''})`}
          </button>
        </div>
      </div>

      <div data-testid="diff-panel" class="flex-1 flex flex-col overflow-hidden bg-cat-base relative">
        <div class="flex items-center gap-2 px-4 py-2 text-[0.8rem] text-cat-subtext border-b border-cat-border bg-cat-surface shrink-0 whitespace-nowrap overflow-hidden">
          <span class="flex-1 overflow-hidden text-ellipsis">${this.selectedPath || 'Kein Diff'}</span>
          <button
            class="bg-transparent border border-cat-muted rounded text-cat-subtext cursor-pointer text-[0.72rem] px-[0.55rem] py-[0.15rem] whitespace-nowrap shrink-0 hover:enabled:bg-cat-overlay hover:enabled:text-cat-text disabled:opacity-45 disabled:cursor-default"
            ?disabled=${(this.status.staged.length + this.status.unstaged.length) === 0 || this.reviewStreaming}
            @click=${this.handleReviewClick}>
            ✦ ${this.reviewBtnText}
          </button>
        </div>
        ${this.renderDiff()}
        ${this.showReview ? html`
          <div class="absolute inset-0 bg-cat-base z-10 flex flex-col overflow-hidden">
            <div class="flex items-center justify-between px-4 py-[0.6rem] border-b border-cat-border bg-cat-surface shrink-0">
              <span class="text-[0.82rem] font-semibold text-cat-text flex items-center gap-[0.4rem]">✦ Code-Review</span>
              <button
                class="bg-none border-none text-cat-subtle cursor-pointer text-base px-[0.3rem] py-[0.1rem] rounded leading-none hover:text-cat-text hover:bg-cat-overlay"
                @click=${() => { this.showReview = false; }}>✕</button>
            </div>
            <div class="review-content flex-1 overflow-y-auto px-5 py-4 text-[0.83rem] leading-relaxed text-cat-text">
              ${this.reviewStreaming && !this.reviewContent
                ? html`<div class="italic text-cat-subtle text-[0.78rem] flex items-center gap-[0.4rem]">Analysiere Änderungen…</div>`
                : unsafeHTML(DOMPurify.sanitize(marked.parse(this.reviewContent || '') as string, REVIEW_PURIFY_CONFIG) as string)}
              ${this.reviewStreaming ? html`<div class="italic text-cat-subtle text-[0.78rem] flex items-center gap-[0.4rem] mt-2">▌</div>` : nothing}
            </div>
          </div>
        ` : nothing}
      </div>
    `;
  }
}
