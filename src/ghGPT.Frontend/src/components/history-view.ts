import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repositoryService, type CommitHistoryEntry } from '../services/repository-service';

@customElement('history-view')
export class HistoryView extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
      overflow: auto;
      background: #181825;
      color: #cdd6f4;
    }

    .history-list {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .history-entry {
      border: 1px solid #313244;
      border-radius: 8px;
      background: #1e1e2e;
      padding: 0.9rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .history-top {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .history-sha {
      font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
      font-size: 0.75rem;
      color: #89b4fa;
      background: rgba(137, 180, 250, 0.12);
      border-radius: 999px;
      padding: 0.15rem 0.5rem;
    }

    .history-message {
      font-size: 0.95rem;
      font-weight: 600;
      color: #eef1ff;
      white-space: pre-wrap;
    }

    .history-meta {
      font-size: 0.78rem;
      color: #a6adc8;
    }

    .empty,
    .error {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      color: #6c7086;
    }

    .error {
      color: #f38ba8;
    }
  `;

  @property() repoId = '';
  @property({ type: Number }) refreshKey = 0;

  @state() private entries: CommitHistoryEntry[] = [];
  @state() private error = '';

  updated(changed: Map<string, unknown>) {
    if ((changed.has('repoId') || changed.has('refreshKey')) && this.repoId) {
      this.loadHistory();
    }
  }

  private async loadHistory() {
    try {
      this.error = '';
      this.entries = await repositoryService.getHistory(this.repoId);
    } catch (e: unknown) {
      this.entries = [];
      this.error = e instanceof Error ? e.message : 'Fehler beim Laden der History';
    }
  }

  private formatDate(value: string) {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  render() {
    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    if (this.entries.length === 0) {
      return html`<div class="empty">Keine Commits</div>`;
    }

    return html`
      <div class="history-list">
        ${this.entries.map(entry => html`
          <div class="history-entry">
            <div class="history-top">
              <span class="history-sha">${entry.shortSha}</span>
              <span class="history-message">${entry.message}</span>
            </div>
            <div class="history-meta">
              ${entry.authorName} &lt;${entry.authorEmail}&gt; · ${this.formatDate(entry.authorDate)}
            </div>
          </div>
        `)}
      </div>
    `;
  }
}
