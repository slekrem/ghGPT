import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { aiService, type OllamaStatus, type OllamaModelInfo } from '../services/ai-service';
import { repositoryService, type AccountInfo } from '../services/repository-service';

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

    .account-connected {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.75rem;
      border-radius: 6px;
      background: #181825;
      border: 1px solid #313244;
    }

    .account-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .account-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #cdd6f4;
    }

    .account-login {
      font-size: 0.78rem;
      color: #6c7086;
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

    button.danger {
      background: #f38ba811;
      border-color: #f38ba8;
      color: #f38ba8;
    }

    button.danger:hover { background: #f38ba833; }

    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .success-msg {
      font-size: 0.8rem;
      color: #a6e3a1;
      align-self: center;
    }

    .error-msg {
      font-size: 0.8rem;
      color: #f38ba8;
      padding: 0.4rem 0.6rem;
      border-radius: 6px;
      background: #f38ba811;
      border: 1px solid #f38ba844;
    }
  `;

  // Ollama state
  @state() private ollamaStatus: OllamaStatus | null = null;
  @state() private ollamaLoading = true;
  @state() private models: OllamaModelInfo[] = [];
  @state() private baseUrl = 'http://localhost:11434';
  @state() private model = 'llama3.2';
  @state() private ollamaSaving = false;
  @state() private ollamaSaveResult: 'success' | 'error' | null = null;

  // Account state
  @state() private account: AccountInfo | null = null;
  @state() private accountLoading = true;
  @state() private patInput = '';
  @state() private accountError = '';
  @state() private accountSaving = false;

  async connectedCallback() {
    super.connectedCallback();
    await Promise.all([this.initOllamaSettings(), this.loadAccount()]);
  }

  private async initOllamaSettings() {
    this.ollamaLoading = true;
    try {
      this.ollamaStatus = await aiService.getStatus();
      this.baseUrl = this.ollamaStatus.baseUrl;
      this.model = this.ollamaStatus.model;
      if (this.ollamaStatus.online) {
        this.models = await aiService.getModels().catch(() => []);
      }
    } catch {
      this.ollamaStatus = null;
    } finally {
      this.ollamaLoading = false;
    }
  }

  private async checkOnlineStatus() {
    this.ollamaLoading = true;
    try {
      const status = await aiService.getStatus();
      this.ollamaStatus = { ...status, baseUrl: this.baseUrl, model: this.model };
      if (status.online) {
        this.models = await aiService.getModels().catch(() => []);
      }
    } catch {
      this.ollamaStatus = null;
    } finally {
      this.ollamaLoading = false;
    }
  }

  private async saveOllamaSettings() {
    this.ollamaSaving = true;
    this.ollamaSaveResult = null;
    try {
      await aiService.saveSettings({ baseUrl: this.baseUrl, model: this.model });
      this.ollamaSaveResult = 'success';
      await this.checkOnlineStatus();
    } catch {
      this.ollamaSaveResult = 'error';
    } finally {
      this.ollamaSaving = false;
    }
  }

  private async loadAccount() {
    this.accountLoading = true;
    try {
      this.account = await repositoryService.getAccount();
    } catch {
      this.account = null;
    } finally {
      this.accountLoading = false;
    }
  }

  private async saveToken() {
    if (!this.patInput.trim()) return;
    this.accountSaving = true;
    this.accountError = '';
    try {
      this.account = await repositoryService.saveToken(this.patInput.trim());
      this.patInput = '';
      this.dispatchEvent(new CustomEvent('account-changed', { bubbles: true, composed: true, detail: this.account }));
    } catch (err) {
      this.accountError = (err as Error).message;
    } finally {
      this.accountSaving = false;
    }
  }

  private async removeAccount() {
    this.accountSaving = true;
    try {
      await repositoryService.removeAccount();
      this.account = null;
      this.patInput = '';
      this.accountError = '';
      this.dispatchEvent(new CustomEvent('account-changed', { bubbles: true, composed: true, detail: null }));
    } finally {
      this.accountSaving = false;
    }
  }

  render() {
    return html`
      <h2>Einstellungen</h2>

      <div class="section">
        <div class="section-title">GitHub Account</div>
        <div class="card">
          ${this.accountLoading
            ? html`<span class="status-text">Lade…</span>`
            : this.account
              ? html`
                <div class="account-connected">
                  <img class="account-avatar" src="${this.account.avatarUrl}" alt="${this.account.login}" />
                  <div>
                    <div class="account-name">${this.account.name}</div>
                    <div class="account-login">@${this.account.login}</div>
                  </div>
                </div>
                <div class="actions">
                  <button class="danger" ?disabled=${this.accountSaving} @click=${() => this.removeAccount()}>
                    Account trennen
                  </button>
                </div>
              `
              : html`
                <div class="field">
                  <label>Personal Access Token (PAT)</label>
                  <input
                    type="password"
                    placeholder="ghp_…"
                    .value=${this.patInput}
                    @input=${(e: Event) => { this.patInput = (e.target as HTMLInputElement).value; this.accountError = ''; }}
                    @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.saveToken()}
                  />
                </div>
                ${this.accountError ? html`<div class="error-msg">${this.accountError}</div>` : ''}
                <div class="actions">
                  <button class="primary" ?disabled=${this.accountSaving || !this.patInput.trim()} @click=${() => this.saveToken()}>
                    ${this.accountSaving ? 'Verbinde…' : 'Verbinden'}
                  </button>
                </div>
              `}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Ollama</div>
        <div class="card">
          <div class="row">
            ${this.ollamaLoading
              ? html`<span class="status-dot loading"></span>`
              : html`<span class="status-dot ${this.ollamaStatus?.online ? 'online' : 'offline'}"></span>`}
            <span class="status-text">
              ${this.ollamaLoading
                ? 'Verbindung wird geprüft…'
                : this.ollamaStatus?.online
                  ? `Verbunden · Modell: ${this.ollamaStatus.model}`
                  : 'Nicht erreichbar'}
            </span>
            <button style="margin-left:auto;padding:0.25rem 0.6rem;font-size:0.78rem"
              @click=${() => this.checkOnlineStatus()} ?disabled=${this.ollamaLoading}>
              ↻
            </button>
          </div>

          <div class="field">
            <label>Ollama URL</label>
            <input
              type="text"
              .value=${this.baseUrl}
              @input=${(e: Event) => { this.baseUrl = (e.target as HTMLInputElement).value; this.ollamaSaveResult = null; }}
            />
          </div>

          <div class="field">
            <label>Modell</label>
            ${this.models.length > 0
              ? html`
                <select .value=${this.model}
                  @change=${(e: Event) => { this.model = (e.target as HTMLSelectElement).value; this.ollamaSaveResult = null; }}>
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
                  @input=${(e: Event) => { this.model = (e.target as HTMLInputElement).value; this.ollamaSaveResult = null; }}
                />
              `}
          </div>

          <div class="actions">
            ${this.ollamaSaveResult === 'success'
              ? html`<span class="success-msg">Gespeichert ✓</span>`
              : this.ollamaSaveResult === 'error'
                ? html`<span class="error-msg">Fehler beim Speichern</span>`
                : ''}
            <button class="primary" ?disabled=${this.ollamaSaving} @click=${() => this.saveOllamaSettings()}>
              ${this.ollamaSaving ? 'Speichert…' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
