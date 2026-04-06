import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import { repositoryService, type RepositoryInfo } from '../services/repository-service';
import { onHubEvent, offHubEvent } from '../services/hub-client';

type Tab = 'create' | 'import' | 'clone';

@customElement('repo-dialog')
export class RepoDialog extends AppElement {
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
      <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-6" @click=${(e: Event) => e.target === e.currentTarget && this.close()}>
        <div class="bg-cat-surface border border-cat-overlay rounded-xl w-[min(480px,100%)] flex flex-col overflow-hidden shadow-2xl">
          <div class="flex items-center justify-between px-5 py-4 border-b border-cat-overlay">
            <span class="font-bold text-[#eef1ff] text-sm">Repository hinzufügen</span>
            <button class="text-cat-subtle hover:text-cat-text bg-transparent border-none cursor-pointer text-xl leading-none" @click=${this.close}>✕</button>
          </div>

          <div class="flex border-b border-cat-overlay">
            ${(['clone', 'create', 'import'] as Tab[]).map(t => html`
              <button class="px-5 py-3 text-sm cursor-pointer border-b-2 ${this.tab === t ? 'text-cat-blue border-cat-blue' : 'text-cat-muted border-transparent hover:text-cat-text'}" @click=${() => { this.tab = t; this.error = ''; }}>
                ${t === 'clone' ? 'Klonen' : t === 'create' ? 'Erstellen' : 'Importieren'}
              </button>
            `)}
          </div>

          ${this.tab === 'create' ? html`
            <div class="flex flex-col gap-1.5 px-5 py-3">
              <label class="text-xs text-cat-muted">Name</label>
              <input class="px-3 py-2 rounded-md border border-cat-border bg-cat-base text-cat-text text-sm focus:outline-none focus:border-cat-blue w-full" type="text" .value=${this.createName} @input=${(e: Event) => this.createName = (e.target as HTMLInputElement).value} placeholder="mein-projekt" />
            </div>
            <div class="flex flex-col gap-1.5 px-5 py-3">
              <label class="text-xs text-cat-muted">Lokaler Pfad</label>
              <input class="px-3 py-2 rounded-md border border-cat-border bg-cat-base text-cat-text text-sm focus:outline-none focus:border-cat-blue w-full" type="text" .value=${this.createPath} @input=${(e: Event) => this.createPath = (e.target as HTMLInputElement).value} placeholder="C:/Projekte/mein-projekt" />
            </div>
          ` : ''}

          ${this.tab === 'import' ? html`
            <div class="flex flex-col gap-1.5 px-5 py-3">
              <label class="text-xs text-cat-muted">Lokaler Pfad (vorhandenes Git-Repository)</label>
              <input class="px-3 py-2 rounded-md border border-cat-border bg-cat-base text-cat-text text-sm focus:outline-none focus:border-cat-blue w-full" type="text" .value=${this.importPath} @input=${(e: Event) => this.importPath = (e.target as HTMLInputElement).value} placeholder="C:/Projekte/bestehendes-repo" />
            </div>
          ` : ''}

          ${this.tab === 'clone' ? html`
            <div class="flex flex-col gap-1.5 px-5 py-3">
              <label class="text-xs text-cat-muted">Remote URL</label>
              <input class="px-3 py-2 rounded-md border border-cat-border bg-cat-base text-cat-text text-sm focus:outline-none focus:border-cat-blue w-full" type="text" .value=${this.cloneUrl} @input=${(e: Event) => this.cloneUrl = (e.target as HTMLInputElement).value} placeholder="https://github.com/user/repo" />
            </div>
            <div class="flex flex-col gap-1.5 px-5 py-3">
              <label class="text-xs text-cat-muted">Zielverzeichnis (Repo wird als Unterordner angelegt)</label>
              <input class="px-3 py-2 rounded-md border border-cat-border bg-cat-base text-cat-text text-sm focus:outline-none focus:border-cat-blue w-full" type="text" .value=${this.clonePath} @input=${(e: Event) => this.clonePath = (e.target as HTMLInputElement).value} placeholder="C:/Projekte" />
            </div>
            ${this.progressLines.length > 0 ? html`
              <div class="text-xs text-cat-muted px-5 pb-3">${this.progressLines.map(l => html`<div>${l}</div>`)}</div>
            ` : ''}
          ` : ''}

          ${this.error ? html`<div class="text-xs text-cat-red px-5 pb-3">⚠ ${this.error}</div>` : ''}

          <div class="flex justify-end gap-2 px-5 py-4 border-t border-cat-overlay">
            <button class="px-4 py-1.5 rounded-md border border-cat-border bg-transparent text-cat-text text-sm cursor-pointer hover:bg-cat-overlay disabled:opacity-45 disabled:cursor-not-allowed" @click=${this.close}>Abbrechen</button>
            <button class="px-4 py-1.5 rounded-md border border-cat-blue bg-cat-blue text-[#11111b] font-semibold text-sm cursor-pointer hover:opacity-90 disabled:opacity-45 disabled:cursor-not-allowed" ?disabled=${this.loading} @click=${this.submit}>
              ${this.loading ? 'Bitte warten…' : this.tab === 'clone' ? 'Klonen' : this.tab === 'create' ? 'Erstellen' : 'Importieren'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
