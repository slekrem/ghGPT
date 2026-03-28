import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repositoryService, type RepositoryInfo } from '../services/repository-service';
import { onHubEvent, offHubEvent } from '../services/hub-client';

type Tab = 'create' | 'import' | 'clone';

@customElement('repo-dialog')
export class RepoDialog extends LitElement {
  static styles = css`
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: #1e1e2e;
      border: 1px solid #313244;
      border-radius: 10px;
      width: 480px;
      padding: 1.5rem;
      color: #cdd6f4;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .dialog-title {
      font-size: 1rem;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      color: #6c7086;
      cursor: pointer;
      font-size: 1.25rem;
      line-height: 1;
    }

    .close-btn:hover { color: #cdd6f4; }

    .tabs {
      display: flex;
      gap: 0.25rem;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid #313244;
      padding-bottom: 0;
    }

    .tab {
      background: none;
      border: none;
      color: #6c7086;
      padding: 0.4rem 0.75rem;
      cursor: pointer;
      font-size: 0.875rem;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }

    .tab.active {
      color: #cba6f7;
      border-bottom-color: #cba6f7;
    }

    .field {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      font-size: 0.8rem;
      color: #a6adc8;
      margin-bottom: 0.35rem;
    }

    input {
      width: 100%;
      background: #181825;
      border: 1px solid #45475a;
      border-radius: 6px;
      color: #cdd6f4;
      padding: 0.4rem 0.6rem;
      font-size: 0.875rem;
      box-sizing: border-box;
    }

    input:focus {
      outline: none;
      border-color: #cba6f7;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.25rem;
    }

    .btn {
      padding: 0.4rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      cursor: pointer;
      border: 1px solid #45475a;
      background: transparent;
      color: #cdd6f4;
    }

    .btn-primary {
      background: #cba6f7;
      color: #1e1e2e;
      border-color: #cba6f7;
      font-weight: 600;
    }

    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .progress {
      margin-top: 1rem;
      background: #181825;
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
      color: #a6e3a1;
      max-height: 120px;
      overflow-y: auto;
    }

    .error {
      margin-top: 0.75rem;
      color: #f38ba8;
      font-size: 0.8rem;
    }
  `;

  @state() private tab: Tab = 'clone';
  @state() private loading = false;
  @state() private error = '';
  @state() private progressLines: string[] = [];

  // create
  @state() private createPath = '';
  @state() private createName = '';

  // import
  @state() private importPath = '';

  // clone
  @state() private cloneUrl = '';
  @state() private clonePath = '';

  private _onCloneProgress = (message: string) => {
    this.progressLines = [...this.progressLines, message];
  };

  connectedCallback() {
    super.connectedCallback();
    onHubEvent('clone-progress', this._onCloneProgress);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    offHubEvent('clone-progress', this._onCloneProgress);
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private async submit() {
    this.error = '';
    this.progressLines = [];
    this.loading = true;
    try {
      let repo: RepositoryInfo;
      if (this.tab === 'create') {
        repo = await repositoryService.create(this.createPath, this.createName);
      } else if (this.tab === 'import') {
        repo = await repositoryService.import(this.importPath);
      } else {
        repo = await repositoryService.clone(this.cloneUrl, this.clonePath);
      }
      this.dispatchEvent(new CustomEvent('repo-added', { detail: repo }));
      this.close();
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Unbekannter Fehler';
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <div class="backdrop" @click=${(e: Event) => e.target === e.currentTarget && this.close()}>
        <div class="dialog">
          <div class="dialog-header">
            <span class="dialog-title">Repository hinzufügen</span>
            <button class="close-btn" @click=${this.close}>✕</button>
          </div>

          <div class="tabs">
            ${(['clone', 'create', 'import'] as Tab[]).map(t => html`
              <button class="tab ${this.tab === t ? 'active' : ''}" @click=${() => { this.tab = t; this.error = ''; }}>
                ${t === 'clone' ? 'Klonen' : t === 'create' ? 'Erstellen' : 'Importieren'}
              </button>
            `)}
          </div>

          ${this.tab === 'create' ? html`
            <div class="field">
              <label>Name</label>
              <input type="text" .value=${this.createName} @input=${(e: Event) => this.createName = (e.target as HTMLInputElement).value} placeholder="mein-projekt" />
            </div>
            <div class="field">
              <label>Lokaler Pfad</label>
              <input type="text" .value=${this.createPath} @input=${(e: Event) => this.createPath = (e.target as HTMLInputElement).value} placeholder="C:/Projekte/mein-projekt" />
            </div>
          ` : ''}

          ${this.tab === 'import' ? html`
            <div class="field">
              <label>Lokaler Pfad (vorhandenes Git-Repository)</label>
              <input type="text" .value=${this.importPath} @input=${(e: Event) => this.importPath = (e.target as HTMLInputElement).value} placeholder="C:/Projekte/bestehendes-repo" />
            </div>
          ` : ''}

          ${this.tab === 'clone' ? html`
            <div class="field">
              <label>Remote URL</label>
              <input type="text" .value=${this.cloneUrl} @input=${(e: Event) => this.cloneUrl = (e.target as HTMLInputElement).value} placeholder="https://github.com/user/repo" />
            </div>
            <div class="field">
              <label>Lokaler Pfad</label>
              <input type="text" .value=${this.clonePath} @input=${(e: Event) => this.clonePath = (e.target as HTMLInputElement).value} placeholder="C:/Projekte/repo" />
            </div>
            ${this.progressLines.length > 0 ? html`
              <div class="progress">${this.progressLines.map(l => html`<div>${l}</div>`)}</div>
            ` : ''}
          ` : ''}

          ${this.error ? html`<div class="error">⚠ ${this.error}</div>` : ''}

          <div class="actions">
            <button class="btn" @click=${this.close}>Abbrechen</button>
            <button class="btn btn-primary" ?disabled=${this.loading} @click=${this.submit}>
              ${this.loading ? 'Bitte warten…' : this.tab === 'clone' ? 'Klonen' : this.tab === 'create' ? 'Erstellen' : 'Importieren'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
