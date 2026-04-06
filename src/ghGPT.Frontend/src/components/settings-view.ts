import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import { aiService, type OllamaStatus, type OllamaModelInfo } from '../services/ai-service';
import { repositoryService, type AccountInfo } from '../services/repository-service';

@customElement('settings-view')
export class SettingsView extends AppElement {
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

  render() {
    return html`
      <h2 class="text-base font-bold text-[#eef1ff] mb-4">Einstellungen</h2>

      <div class="mb-8">
        <div class="text-xs uppercase tracking-widest text-cat-subtle mb-3">GitHub Account</div>
        <div class="bg-cat-surface border border-cat-overlay rounded-xl p-4 flex flex-col gap-3">
          ${this.accountLoading
            ? html`<span class="text-sm text-cat-muted">Lade…</span>`
            : this.account
              ? html`
                <div class="flex items-center gap-3 bg-cat-base border border-cat-overlay rounded-xl p-3">
                  <img class="w-9 h-9 rounded-full object-cover" src="${this.account.avatarUrl}" alt="${this.account.login}" />
                  <div>
                    <div class="font-semibold text-cat-text text-sm">${this.account.name}</div>
                    <div class="text-xs text-cat-muted">@${this.account.login}</div>
                  </div>
                </div>
              `
              : html`
                <div class="flex items-center gap-2 text-sm text-cat-subtle">
                  <span>Nicht angemeldet</span>
                </div>
                <div class="text-xs text-cat-muted">
                  Bitte <code class="bg-cat-overlay px-1 py-0.5 rounded text-cat-text">gh auth login</code> im Terminal ausführen.
                </div>
              `}
        </div>
      </div>

      <div class="mb-8">
        <div class="text-xs uppercase tracking-widest text-cat-subtle mb-3">Ollama</div>
        <div class="bg-cat-surface border border-cat-overlay rounded-xl p-4 flex flex-col gap-3">
          <div class="flex items-center gap-3">
            ${this.ollamaLoading
              ? html`<span class="w-2 h-2 rounded-full shrink-0 bg-cat-peach animate-pulse"></span>`
              : html`<span class="w-2 h-2 rounded-full shrink-0 ${this.ollamaStatus?.online ? 'bg-cat-green' : 'bg-cat-red'}"></span>`}
            <span class="text-sm text-cat-muted">
              ${this.ollamaLoading
                ? 'Verbindung wird geprüft…'
                : this.ollamaStatus?.online
                  ? `Verbunden · Modell: ${this.ollamaStatus.model}`
                  : 'Nicht erreichbar'}
            </span>
            <button class="px-4 py-1.5 rounded-md border border-cat-border bg-transparent text-cat-text text-sm cursor-pointer hover:bg-cat-overlay disabled:opacity-45 disabled:cursor-not-allowed" style="margin-left:auto;padding:0.25rem 0.6rem;font-size:0.78rem"
              @click=${() => this.checkOnlineStatus()} ?disabled=${this.ollamaLoading}>
              ↻
            </button>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-cat-muted">Ollama URL</label>
            <input
              class="px-3 py-2 rounded-md border border-cat-border bg-cat-base text-cat-text text-sm focus:outline-none focus:border-cat-blue"
              type="text"
              .value=${this.baseUrl}
              @input=${(e: Event) => { this.baseUrl = (e.target as HTMLInputElement).value; this.ollamaSaveResult = null; }}
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-cat-muted">Modell</label>
            ${this.models.length > 0
              ? html`
                <select class="px-3 py-2 rounded-md border border-cat-border bg-cat-base text-cat-text text-sm focus:outline-none focus:border-cat-blue" .value=${this.model}
                  @change=${(e: Event) => { this.model = (e.target as HTMLSelectElement).value; this.ollamaSaveResult = null; }}>
                  ${this.models.map(m => html`
                    <option value=${m.name} ?selected=${m.name === this.model}>${m.name}</option>
                  `)}
                </select>
              `
              : html`
                <input
                  class="px-3 py-2 rounded-md border border-cat-border bg-cat-base text-cat-text text-sm focus:outline-none focus:border-cat-blue"
                  type="text"
                  .value=${this.model}
                  placeholder="z.B. llama3.2"
                  @input=${(e: Event) => { this.model = (e.target as HTMLInputElement).value; this.ollamaSaveResult = null; }}
                />
              `}
          </div>

          <div class="flex gap-2 mt-2">
            ${this.ollamaSaveResult === 'success'
              ? html`<span class="text-xs text-cat-green">Gespeichert ✓</span>`
              : this.ollamaSaveResult === 'error'
                ? html`<span class="text-xs text-cat-red">Fehler beim Speichern</span>`
                : ''}
            <button class="px-4 py-1.5 rounded-md border border-cat-blue bg-transparent text-cat-blue text-sm cursor-pointer hover:bg-[rgba(137,180,250,0.1)] disabled:opacity-45 disabled:cursor-not-allowed" ?disabled=${this.ollamaSaving} @click=${() => this.saveOllamaSettings()}>
              ${this.ollamaSaving ? 'Speichert…' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
