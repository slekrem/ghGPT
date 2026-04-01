import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { aiService, type OllamaStatus, type OllamaModelInfo } from '../services/ai-service';

@customElement('settings-view')
export class SettingsView extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 1.5rem;
      color: #cdd6f4;
      max-width: 640px;
    }

    h2 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 1.5rem;
      color: #cdd6f4;
    }

    .section {
      margin-bottom: 2rem;
    }

    .section-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6c7086;
      margin-bottom: 0.75rem;
    }

    .card {
      background: #1e1e2e;
      border: 1px solid #313244;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .field label {
      font-size: 0.78rem;
      color: #a6adc8;
    }

    .field input,
    .field select {
      padding: 0.45rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: #181825;
      color: #cdd6f4;
      font-size: 0.875rem;
      font-family: inherit;
    }

    .field input:focus,
    .field select:focus {
      outline: none;
      border-color: #89b4fa;
    }

    .field select option { background: #1e1e2e; }

    .row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-dot.online  { background: #a6e3a1; }
    .status-dot.offline { background: #f38ba8; }
    .status-dot.loading { background: #f9e2af; }

    .status-text {
      font-size: 0.83rem;
      color: #a6adc8;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }

    button {
      padding: 0.4rem 1rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: transparent;
      color: #cdd6f4;
      font-size: 0.875rem;
      cursor: pointer;
    }

    button:hover { background: #313244; }

    button.primary {
      background: #89b4fa22;
      border-color: #89b4fa;
      color: #89b4fa;
    }

    button.primary:hover { background: #89b4fa44; }

    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .success-msg {
      font-size: 0.8rem;
      color: #a6e3a1;
    }

    .error-msg {
      font-size: 0.8rem;
      color: #f38ba8;
    }
  `;

  @state() private status: OllamaStatus | null = null;
  @state() private statusLoading = true;
  @state() private models: OllamaModelInfo[] = [];
  @state() private baseUrl = 'http://localhost:11434';
  @state() private model = 'llama3.2';
  @state() private saving = false;
  @state() private saveResult: 'success' | 'error' | null = null;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadStatus();
  }

  private async loadStatus() {
    this.statusLoading = true;
    try {
      this.status = await aiService.getStatus();
      this.baseUrl = this.status.baseUrl;
      this.model = this.status.model;

      if (this.status.online) {
        this.models = await aiService.getModels().catch(() => []);
      }
    } catch {
      this.status = null;
    } finally {
      this.statusLoading = false;
    }
  }

  private async saveSettings() {
    this.saving = true;
    this.saveResult = null;
    try {
      await aiService.saveSettings({ baseUrl: this.baseUrl, model: this.model });
      this.saveResult = 'success';
      await this.loadStatus();
    } catch {
      this.saveResult = 'error';
    } finally {
      this.saving = false;
    }
  }

  private renderStatusDot() {
    if (this.statusLoading) return html`<span class="status-dot loading"></span>`;
    return html`<span class="status-dot ${this.status?.online ? 'online' : 'offline'}"></span>`;
  }

  render() {
    return html`
      <h2>Einstellungen</h2>

      <div class="section">
        <div class="section-title">Ollama</div>
        <div class="card">
          <div class="row">
            ${this.renderStatusDot()}
            <span class="status-text">
              ${this.statusLoading
                ? 'Verbindung wird geprüft…'
                : this.status?.online
                  ? `Verbunden · Modell: ${this.status.model}`
                  : 'Nicht erreichbar'}
            </span>
            <button style="margin-left:auto;padding:0.25rem 0.6rem;font-size:0.78rem"
              @click=${() => this.loadStatus()} ?disabled=${this.statusLoading}>
              ↻
            </button>
          </div>

          <div class="field">
            <label>Ollama URL</label>
            <input
              type="text"
              .value=${this.baseUrl}
              @input=${(e: Event) => { this.baseUrl = (e.target as HTMLInputElement).value; this.saveResult = null; }}
            />
          </div>

          <div class="field">
            <label>Modell</label>
            ${this.models.length > 0
              ? html`
                <select .value=${this.model}
                  @change=${(e: Event) => { this.model = (e.target as HTMLSelectElement).value; this.saveResult = null; }}>
                  ${this.models.map(m => html`
                    <option value=${m.name} ?selected=${m.name === this.model}>${m.name}</option>
                  `)}
                </select>
              `
              : html`
                <input
                  type="text"
                  .value=${this.model}
                  placeholder="z.B. llama3.2"
                  @input=${(e: Event) => { this.model = (e.target as HTMLInputElement).value; this.saveResult = null; }}
                />
              `}
          </div>

          <div class="actions">
            ${this.saveResult === 'success'
              ? html`<span class="success-msg">Gespeichert ✓</span>`
              : this.saveResult === 'error'
                ? html`<span class="error-msg">Fehler beim Speichern</span>`
                : ''}
            <button class="primary" ?disabled=${this.saving} @click=${() => this.saveSettings()}>
              ${this.saving ? 'Speichert…' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
