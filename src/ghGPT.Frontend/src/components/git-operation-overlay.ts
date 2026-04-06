import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AppElement } from '../app-element';

@customElement('git-operation-overlay')
export class GitOperationOverlay extends AppElement {
  @property({ type: String }) operation: 'fetch' | 'pull' | 'push' | null = null;
  @property({ attribute: false }) lines: string[] = [];
  @property({ type: String }) error = '';
  @property({ type: String }) status = '';

  private get _isRunning() {
    return this.status === 'progress' || this.status === 'started';
  }

  render() {
    const statusClass = `text-xs ${this.error ? 'text-cat-red' : 'text-cat-subtle'}`;
    return html`
      <div class="git-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-[400] p-6">
        <div class="flex flex-col bg-cat-surface border border-cat-border rounded-xl shadow-2xl overflow-hidden w-[min(720px,100%)] max-h-[min(70vh,620px)]">
          <div class="flex items-center justify-between gap-4 px-4 py-3.5 border-b border-cat-overlay">
            <div>
              <div class="text-sm font-semibold text-cat-text capitalize">${this.operation}</div>
              <div class="git-overlay-status ${statusClass} ${this.error ? 'error' : ''}">
                ${this.error
                  ? this.error
                  : this.status === 'completed'
                    ? 'Abgeschlossen'
                    : 'Läuft…'}
              </div>
            </div>
            <button class="px-3 py-1 rounded-md border border-cat-border bg-transparent text-cat-text cursor-pointer text-xs hover:bg-cat-overlay disabled:opacity-45 disabled:cursor-not-allowed"
              ?disabled=${this._isRunning}
              @click=${() => this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))}>
              Schließen
            </button>
          </div>
          <div class="git-overlay-log p-4 overflow-auto font-mono text-[0.78rem] leading-relaxed text-cat-muted space-y-1.5">
            ${this.lines.length > 0
              ? this.lines.map(line => html`<div>${line}</div>`)
              : html`<div class="text-cat-subtle italic">Warte auf Git-Ausgabe…</div>`}
          </div>
        </div>
      </div>
    `;
  }
}
