import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { RepositoryInfo, AccountInfo } from '../services/repository-service';
import type { HubConnectionStatus } from '../services/hub-client';

type View = 'changes' | 'history' | 'branches' | 'pull-requests' | 'settings';

@customElement('app-sidebar')
export class AppSidebar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 240px;
      min-width: 240px;
      background-color: #1e1e2e;
      color: #cdd6f4;
      border-right: 1px solid #313244;
    }

    .sidebar-header {
      padding: 1rem;
      font-size: 1.1rem;
      font-weight: 600;
      border-bottom: 1px solid #313244;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .sidebar-section {
      padding: 0.5rem 0;
      flex: 1;
      overflow-y: auto;
    }

    .sidebar-section-title {
      padding: 0.25rem 1rem;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6c7086;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .add-btn {
      background: none;
      border: none;
      color: #6c7086;
      cursor: pointer;
      font-size: 1rem;
      padding: 0 0.25rem;
      line-height: 1;
    }

    .add-btn:hover { color: #cdd6f4; }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: #cdd6f4;
      transition: background-color 0.1s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-item:hover { background-color: #313244; }

    .nav-item.active {
      background-color: #45475a;
      color: #cba6f7;
    }

    .repo-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: #cdd6f4;
      transition: background-color 0.1s;
    }

    .repo-item:hover { background-color: #313244; }

    .repo-item.active {
      background-color: #45475a;
      color: #cba6f7;
    }

    .repo-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .repo-remove-btn {
      display: none;
      align-items: center;
      justify-content: center;
      margin-left: auto;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      border: none;
      background: none;
      color: #6c7086;
      cursor: pointer;
      font-size: 0.75rem;
      line-height: 1;
      border-radius: 3px;
      padding: 0;
    }

    .repo-item:hover .repo-remove-btn { display: flex; }

    .repo-remove-btn:hover {
      color: #f38ba8;
      background-color: #45475a;
    }

    .sidebar-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid #313244;
      font-size: 0.8rem;
      color: #6c7086;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      user-select: none;
    }

    .sidebar-footer:hover { color: #cdd6f4; }

    .account-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .account-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .account-badge {
      font-size: 0.65rem;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      background: #a6e3a133;
      color: #a6e3a1;
      flex-shrink: 0;
    }

    .hub-status {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-left: auto;
      flex-shrink: 0;
    }

    .hub-status--connected    { background: #a6e3a1; }
    .hub-status--reconnecting { background: #f9e2af; }
    .hub-status--disconnected { background: #f38ba8; }
  `;

  @property({ attribute: false }) repos: RepositoryInfo[] = [];
  @property({ attribute: false }) activeRepoId: string | null = null;
  @property({ type: String }) activeView: View = 'changes';
  @property({ attribute: false }) account: AccountInfo | null = null;
  @property({ type: String }) hubState: HubConnectionStatus = 'disconnected';

  private dispatch<T>(name: string, detail?: T) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="sidebar-header">
        <span>⚡</span>
        <span>ghGPT</span>
        <span class="hub-status hub-status--${this.hubState}" title="${this.hubState}"></span>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-section-title">
          <span>Repositories</span>
          <button class="add-btn" title="Repository hinzufügen"
            @click=${() => this.dispatch('add-repo')}>＋</button>
        </div>

        ${this.repos.map(repo => html`
          <div class="repo-item ${repo.id === this.activeRepoId ? 'active' : ''}"
            @click=${() => this.dispatch('activate-repo', repo.id)}>
            <span>📁</span>
            <span class="repo-name">${repo.name}</span>
            <button class="repo-remove-btn"
              title="Aus Tracking entfernen"
              @click=${(e: Event) => { e.stopPropagation(); this.dispatch('remove-repo', repo.id); }}>
              ×
            </button>
          </div>
        `)}

        <div class="sidebar-section-title" style="margin-top:0.5rem">Workspace</div>
        <div class="nav-item ${this.activeView === 'changes' ? 'active' : ''}"
          @click=${() => this.dispatch('navigate', 'changes')}>
          <span>✏️</span> Änderungen
        </div>
        <div class="nav-item ${this.activeView === 'history' ? 'active' : ''}"
          @click=${() => this.dispatch('navigate', 'history')}>
          <span>🕐</span> History
        </div>

        <div class="sidebar-section-title" style="margin-top:0.5rem">Repository</div>
        <div class="nav-item ${this.activeView === 'branches' ? 'active' : ''}"
          @click=${() => this.dispatch('navigate', 'branches')}>
          <span>🌿</span> Branches
        </div>
        <div class="nav-item ${this.activeView === 'pull-requests' ? 'active' : ''}"
          @click=${() => this.dispatch('navigate', 'pull-requests')}>
          <span>🔀</span> Pull Requests
        </div>

        <div class="sidebar-section-title" style="margin-top:0.5rem">App</div>
        <div class="nav-item ${this.activeView === 'settings' ? 'active' : ''}"
          @click=${() => this.dispatch('navigate', 'settings')}>
          <span>⚙</span> Einstellungen
        </div>
      </div>

      <div class="sidebar-footer" @click=${() => this.dispatch('navigate', 'settings')}>
        ${this.account
          ? html`
            <img class="account-avatar" src="${this.account.avatarUrl}" alt="${this.account.login}" />
            <span class="account-name">${this.account.name}</span>
            <span class="account-badge">✓</span>
          `
          : html`
            <span>👤</span>
            <span class="account-name">Nicht verbunden</span>
          `}
      </div>
    `;
  }
}
