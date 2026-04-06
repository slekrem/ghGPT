import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import type { RepositoryInfo, AccountInfo } from '../services/repository-service';
import type { HubConnectionStatus } from '../services/hub-client';

type View = 'changes' | 'history' | 'branches' | 'pull-requests' | 'settings';

@customElement('app-sidebar')
export class AppSidebar extends AppElement {
  @property({ attribute: false }) repos: RepositoryInfo[] = [];
  @property({ attribute: false }) activeRepoId: string | null = null;
  @property({ type: String }) activeView: View = 'changes';
  @property({ attribute: false }) account: AccountInfo | null = null;
  @property({ type: String }) hubState: HubConnectionStatus = 'disconnected';

  private dispatch<T>(name: string, detail?: T) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  render() {
    const hubDotColor =
      this.hubState === 'connected'    ? 'bg-cat-green' :
      this.hubState === 'reconnecting' ? 'bg-[#f9e2af]' :
                                         'bg-cat-red';

    return html`
      <div class="flex items-center gap-2 px-4 py-4 text-[1.1rem] font-semibold border-b border-cat-overlay">
        <span>⚡</span>
        <span>ghGPT</span>
        <span class="w-[7px] h-[7px] rounded-full ml-auto shrink-0 ${hubDotColor}" title="${this.hubState}"></span>
      </div>

      <div class="py-2 flex-1 overflow-y-auto">
        <div class="flex items-center justify-between px-4 py-1 text-[0.65rem] uppercase tracking-widest text-cat-subtle">
          <span>Repositories</span>
          <button data-testid="add-repo-btn" class="bg-transparent border-none text-cat-subtle cursor-pointer text-base px-1 py-0 leading-none hover:text-cat-text"
            title="Repository hinzufügen"
            @click=${() => this.dispatch('add-repo')}>＋</button>
        </div>

        ${this.repos.map(repo => html`
          <div data-testid="repo-item" ?data-active=${repo.id === this.activeRepoId}
            class="group flex items-center gap-2 px-4 py-[0.4rem] cursor-pointer text-sm transition-colors
                      ${repo.id === this.activeRepoId
                        ? 'bg-[#45475a] text-[#cba6f7]'
                        : 'text-cat-text hover:bg-cat-overlay'}"
            @click=${() => this.dispatch('activate-repo', repo.id)}>
            <span>📁</span>
            <span data-testid="repo-name" class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">${repo.name}</span>
            <button data-testid="repo-remove-btn" class="hidden group-hover:flex items-center justify-center ml-auto shrink-0 w-4 h-4
                           border-none bg-transparent text-cat-subtle cursor-pointer text-xs leading-none rounded-[3px] p-0
                           hover:text-cat-red hover:bg-[#45475a]"
              title="Aus Tracking entfernen"
              @click=${(e: Event) => { e.stopPropagation(); this.dispatch('remove-repo', repo.id); }}>
              ×
            </button>
          </div>
        `)}

        <div class="flex items-center justify-between px-4 py-1 text-[0.65rem] uppercase tracking-widest text-cat-subtle mt-2">Workspace</div>
        <div data-testid="nav-item" class="flex items-center gap-2 px-4 py-[0.4rem] cursor-pointer text-sm transition-colors whitespace-nowrap overflow-hidden text-ellipsis
                    ${this.activeView === 'changes' ? 'bg-[#45475a] text-[#cba6f7]' : 'text-cat-text hover:bg-cat-overlay'}"
          @click=${() => this.dispatch('navigate', 'changes')}>
          <span>✏️</span> Änderungen
        </div>
        <div data-testid="nav-item" class="flex items-center gap-2 px-4 py-[0.4rem] cursor-pointer text-sm transition-colors whitespace-nowrap overflow-hidden text-ellipsis
                    ${this.activeView === 'history' ? 'bg-[#45475a] text-[#cba6f7]' : 'text-cat-text hover:bg-cat-overlay'}"
          @click=${() => this.dispatch('navigate', 'history')}>
          <span>🕐</span> History
        </div>

        <div class="flex items-center justify-between px-4 py-1 text-[0.65rem] uppercase tracking-widest text-cat-subtle mt-2">Repository</div>
        <div data-testid="nav-item" class="flex items-center gap-2 px-4 py-[0.4rem] cursor-pointer text-sm transition-colors whitespace-nowrap overflow-hidden text-ellipsis
                    ${this.activeView === 'branches' ? 'bg-[#45475a] text-[#cba6f7]' : 'text-cat-text hover:bg-cat-overlay'}"
          @click=${() => this.dispatch('navigate', 'branches')}>
          <span>🌿</span> Branches
        </div>
        <div data-testid="nav-item" class="flex items-center gap-2 px-4 py-[0.4rem] cursor-pointer text-sm transition-colors whitespace-nowrap overflow-hidden text-ellipsis
                    ${this.activeView === 'pull-requests' ? 'bg-[#45475a] text-[#cba6f7]' : 'text-cat-text hover:bg-cat-overlay'}"
          @click=${() => this.dispatch('navigate', 'pull-requests')}>
          <span>🔀</span> Pull Requests
        </div>

        <div class="flex items-center justify-between px-4 py-1 text-[0.65rem] uppercase tracking-widest text-cat-subtle mt-2">App</div>
        <div data-testid="nav-item" class="flex items-center gap-2 px-4 py-[0.4rem] cursor-pointer text-sm transition-colors whitespace-nowrap overflow-hidden text-ellipsis
                    ${this.activeView === 'settings' ? 'bg-[#45475a] text-[#cba6f7]' : 'text-cat-text hover:bg-cat-overlay'}"
          @click=${() => this.dispatch('navigate', 'settings')}>
          <span>⚙</span> Einstellungen
        </div>
      </div>

      <div class="flex items-center gap-2 px-4 py-3 border-t border-cat-overlay text-[0.8rem] text-cat-subtle cursor-pointer select-none hover:text-cat-text"
        @click=${() => this.dispatch('navigate', 'settings')}>
        ${this.account
          ? html`
            <img class="w-[22px] h-[22px] rounded-full object-cover shrink-0" src="${this.account.avatarUrl}" alt="${this.account.login}" />
            <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">${this.account.name}</span>
            <span class="text-[0.65rem] px-[0.35rem] py-[0.1rem] rounded bg-[#a6e3a133] text-cat-green shrink-0">✓</span>
          `
          : html`
            <span>👤</span>
            <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">Nicht verbunden</span>
          `}
      </div>
    `;
  }
}
