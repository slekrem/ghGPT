import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

type View = 'changes' | 'history' | 'branches' | 'pull-requests';

@customElement('app-shell')
export class AppShell extends LitElement {
  static styles = css`
    :host {
      display: flex;
      height: 100vh;
      width: 100vw;
      font-family: var(--bs-font-sans-serif, system-ui, sans-serif);
    }

    .sidebar {
      width: 240px;
      min-width: 240px;
      background-color: #1e1e2e;
      color: #cdd6f4;
      display: flex;
      flex-direction: column;
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
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      cursor: pointer;
      font-size: 0.875rem;
      border-radius: 0;
      color: #cdd6f4;
      transition: background-color 0.1s;
    }

    .nav-item:hover {
      background-color: #313244;
    }

    .nav-item.active {
      background-color: #45475a;
      color: #cba6f7;
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
    }

    .sidebar-footer:hover {
      color: #cdd6f4;
    }

    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: #1a1b26;
      overflow: hidden;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background-color: #1e1e2e;
      border-bottom: 1px solid #313244;
    }

    .toolbar-branch {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: transparent;
      color: #cdd6f4;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .toolbar-branch:hover {
      background-color: #313244;
    }

    .toolbar-spacer {
      flex: 1;
    }

    .toolbar-btn {
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: transparent;
      color: #cdd6f4;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .toolbar-btn:hover {
      background-color: #313244;
    }

    .content {
      flex: 1;
      overflow: auto;
      padding: 1rem;
      color: #cdd6f4;
    }

    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #6c7086;
      gap: 0.5rem;
    }

    .placeholder-icon {
      font-size: 2.5rem;
    }
  `;

  @state() private activeView: View = 'changes';

  private navigate(view: View) {
    this.activeView = view;
  }

  render() {
    return html`
      <aside class="sidebar">
        <div class="sidebar-header">
          <span>⚡</span>
          <span>ghGPT</span>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-section-title">Workspace</div>
          <div
            class="nav-item ${this.activeView === 'changes' ? 'active' : ''}"
            @click=${() => this.navigate('changes')}
          >
            <span>✏️</span> Änderungen
          </div>
          <div
            class="nav-item ${this.activeView === 'history' ? 'active' : ''}"
            @click=${() => this.navigate('history')}
          >
            <span>🕐</span> History
          </div>

          <div class="sidebar-section-title" style="margin-top:0.5rem">Repository</div>
          <div
            class="nav-item ${this.activeView === 'branches' ? 'active' : ''}"
            @click=${() => this.navigate('branches')}
          >
            <span>🌿</span> Branches
          </div>
          <div
            class="nav-item ${this.activeView === 'pull-requests' ? 'active' : ''}"
            @click=${() => this.navigate('pull-requests')}
          >
            <span>🔀</span> Pull Requests
          </div>
        </div>

        <div class="sidebar-footer">
          <span>👤</span>
          <span>Kein Account verbunden</span>
        </div>
      </aside>

      <main class="main">
        <div class="toolbar">
          <button class="toolbar-branch">🌿 main ▾</button>
          <div class="toolbar-spacer"></div>
          <button class="toolbar-btn">↓ Fetch</button>
          <button class="toolbar-btn">↓ Pull</button>
          <button class="toolbar-btn">↑ Push</button>
        </div>

        <div class="content">
          ${this.renderView()}
        </div>
      </main>
    `;
  }

  private renderView() {
    switch (this.activeView) {
      case 'changes':
        return html`<div class="placeholder"><span class="placeholder-icon">✏️</span><span>Kein Repository geöffnet</span></div>`;
      case 'history':
        return html`<div class="placeholder"><span class="placeholder-icon">🕐</span><span>Kein Repository geöffnet</span></div>`;
      case 'branches':
        return html`<div class="placeholder"><span class="placeholder-icon">🌿</span><span>Kein Repository geöffnet</span></div>`;
      case 'pull-requests':
        return html`<div class="placeholder"><span class="placeholder-icon">🔀</span><span>Kein Repository geöffnet</span></div>`;
    }
  }
}
