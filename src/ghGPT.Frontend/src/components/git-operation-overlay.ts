import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('git-operation-overlay')
export class GitOperationOverlay extends LitElement {
  static styles = css`
    .git-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 12, 18, 0.72);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 400;
      padding: 1.5rem;
    }

    .git-overlay-card {
      width: min(720px, 100%);
      max-height: min(70vh, 620px);
      display: flex;
      flex-direction: column;
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 12px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.45);
      overflow: hidden;
    }

    .git-overlay-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.9rem 1rem;
      border-bottom: 1px solid #313244;
    }

    .git-overlay-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #cdd6f4;
      text-transform: capitalize;
    }

    .git-overlay-status {
      font-size: 0.75rem;
      color: #6c7086;
    }

    .git-overlay-status.error { color: #f38ba8; }

    .git-overlay-close {
      padding: 0.25rem 0.7rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: transparent;
      color: #cdd6f4;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .git-overlay-close:hover { background: #313244; }

    .git-overlay-log {
      padding: 0.9rem 1rem 1rem;
      overflow: auto;
      font-family: 'Cascadia Code', 'Consolas', monospace;
      font-size: 0.78rem;
      line-height: 1.5;
      color: #a6adc8;
    }

    .git-overlay-line + .git-overlay-line { margin-top: 0.35rem; }

    .git-overlay-empty {
      color: #6c7086;
      font-style: italic;
    }
  `;

  @property({ type: String }) operation: 'fetch' | 'pull' | 'push' | null = null;
  @property({ attribute: false }) lines: string[] = [];
  @property({ type: String }) error = '';
  @property({ type: String }) status = '';

  private get _isRunning() {
    return this.status === 'progress' || this.status === 'started';
  }

  render() {
    return html`
      <div class="git-overlay">
        <div class="git-overlay-card">
          <div class="git-overlay-header">
            <div>
              <div class="git-overlay-title">${this.operation}</div>
              <div class="git-overlay-status ${this.error ? 'error' : ''}">
                ${this.error
                  ? this.error
                  : this.status === 'completed'
                    ? 'Abgeschlossen'
                    : 'Läuft…'}
              </div>
            </div>
            <button class="git-overlay-close"
              ?disabled=${this._isRunning}
              @click=${() => this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))}>
              Schließen
            </button>
          </div>
          <div class="git-overlay-log">
            ${this.lines.length > 0
              ? this.lines.map(line => html`<div class="git-overlay-line">${line}</div>`)
              : html`<div class="git-overlay-empty">Warte auf Git-Ausgabe…</div>`}
          </div>
        </div>
      </div>
    `;
  }
}
