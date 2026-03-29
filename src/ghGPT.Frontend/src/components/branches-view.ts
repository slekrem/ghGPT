import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repositoryService, type BranchInfo } from '../services/repository-service';

@customElement('branches-view')
export class BranchesView extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #313244;
      flex-shrink: 0;
    }

    .toolbar-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #cdd6f4;
      flex: 1;
    }

    .btn {
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: transparent;
      color: #cdd6f4;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .btn:hover { background-color: #313244; }

    .btn-primary {
      background-color: #89b4fa;
      border-color: #89b4fa;
      color: #1e1e2e;
    }

    .btn-primary:hover { background-color: #74c7ec; border-color: #74c7ec; }

    .btn-danger {
      color: #f38ba8;
      border-color: #45475a;
    }

    .btn-danger:hover { background-color: #313244; }

    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .section-title {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6c7086;
      margin-bottom: 0.5rem;
      margin-top: 1rem;
    }

    .section-title:first-child { margin-top: 0; }

    .branch-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .branch-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: background-color 0.1s;
    }

    .branch-row:hover { background-color: #313244; }

    .branch-row.head {
      border-color: #89b4fa33;
      background-color: #89b4fa11;
    }

    .branch-icon {
      font-size: 0.875rem;
      flex-shrink: 0;
    }

    .branch-name {
      font-size: 0.875rem;
      color: #cdd6f4;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .branch-row.head .branch-name {
      color: #89b4fa;
      font-weight: 500;
    }

    .head-badge {
      font-size: 0.65rem;
      background: #89b4fa33;
      color: #89b4fa;
      border-radius: 4px;
      padding: 0.1rem 0.4rem;
      flex-shrink: 0;
    }

    .ahead-behind {
      font-size: 0.7rem;
      color: #6c7086;
      flex-shrink: 0;
    }

    .ahead { color: #a6e3a1; }
    .behind { color: #f38ba8; }

    .branch-actions {
      display: flex;
      gap: 0.25rem;
      opacity: 0;
      transition: opacity 0.1s;
    }

    .branch-row:hover .branch-actions { opacity: 1; }

    .action-btn {
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      border: 1px solid #45475a;
      background: transparent;
      color: #cdd6f4;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .action-btn:hover { background-color: #45475a; }

    .action-btn.danger { color: #f38ba8; }
    .action-btn.danger:hover { background-color: #45475a; }

    .empty {
      color: #6c7086;
      font-size: 0.875rem;
      padding: 0.5rem 0;
    }

    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .dialog {
      background: #1e1e2e;
      border: 1px solid #313244;
      border-radius: 10px;
      padding: 1.5rem;
      width: 420px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .dialog-title {
      font-size: 1rem;
      font-weight: 600;
      color: #cdd6f4;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    label {
      font-size: 0.8rem;
      color: #a6adc8;
    }

    input, select {
      padding: 0.4rem 0.6rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: #313244;
      color: #cdd6f4;
      font-size: 0.875rem;
      outline: none;
    }

    input:focus, select:focus { border-color: #89b4fa; }

    .dialog-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .error-msg {
      color: #f38ba8;
      font-size: 0.8rem;
    }
  `;

  @property() repoId = '';
  @state() private branches: BranchInfo[] = [];
  @state() private showNewBranchDialog = false;
  @state() private newBranchName = '';
  @state() private newBranchStartPoint = '';
  @state() private dialogError = '';
  @state() private loading = false;

  updated(changedProps: Map<string, unknown>) {
    if (changedProps.has('repoId') && this.repoId) {
      this.loadBranches();
    }
  }

  private async loadBranches() {
    if (!this.repoId) return;
    this.branches = await repositoryService.getBranches(this.repoId);
  }

  private async checkout(name: string) {
    if (!this.repoId) return;
    try {
      await repositoryService.checkoutBranch(this.repoId, name);
      await this.loadBranches();
      this.dispatchEvent(new CustomEvent('branch-changed', { bubbles: true, composed: true }));
    } catch (err) {
      alert((err as Error).message);
    }
  }

  private async deleteBranch(name: string) {
    if (!confirm(`Branch "${name}" wirklich löschen?`)) return;
    try {
      await repositoryService.deleteBranch(this.repoId, name);
      await this.loadBranches();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  private async onCreateBranch() {
    this.dialogError = '';
    if (!this.newBranchName.trim()) {
      this.dialogError = 'Branch-Name ist erforderlich.';
      return;
    }
    this.loading = true;
    try {
      await repositoryService.createBranch(this.repoId, this.newBranchName.trim(), this.newBranchStartPoint || undefined);
      this.showNewBranchDialog = false;
      this.newBranchName = '';
      this.newBranchStartPoint = '';
      await this.loadBranches();
      this.dispatchEvent(new CustomEvent('branch-changed', { bubbles: true, composed: true }));
    } catch (err) {
      this.dialogError = (err as Error).message;
    } finally {
      this.loading = false;
    }
  }

  private get localBranches() {
    return this.branches.filter(b => !b.isRemote);
  }

  private get remoteBranches() {
    return this.branches.filter(b => b.isRemote);
  }

  private renderAheadBehind(b: BranchInfo) {
    if (!b.trackingBranch) return '';
    const parts = [];
    if (b.aheadBy > 0) parts.push(html`<span class="ahead">↑${b.aheadBy}</span>`);
    if (b.behindBy > 0) parts.push(html`<span class="behind">↓${b.behindBy}</span>`);
    if (parts.length === 0) return '';
    return html`<span class="ahead-behind">${parts}</span>`;
  }

  private renderBranchRow(b: BranchInfo) {
    return html`
      <div class="branch-row ${b.isHead ? 'head' : ''}" @dblclick=${() => !b.isHead && !b.isRemote && this.checkout(b.name)}>
        <span class="branch-icon">${b.isRemote ? '☁' : '🌿'}</span>
        <span class="branch-name">${b.name}</span>
        ${b.isHead ? html`<span class="head-badge">HEAD</span>` : ''}
        ${this.renderAheadBehind(b)}
        <div class="branch-actions">
          ${!b.isHead && !b.isRemote ? html`
            <button class="action-btn" @click=${(e: Event) => { e.stopPropagation(); this.checkout(b.name); }}>
              Checkout
            </button>
          ` : ''}
          ${!b.isHead ? html`
            <button class="action-btn danger" @click=${(e: Event) => { e.stopPropagation(); this.deleteBranch(b.name); }}>
              ✕
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  render() {
    const localBranches = this.localBranches;
    const remoteBranches = this.remoteBranches;
    const localOptions = localBranches.map(b => b.name);

    return html`
      <div class="toolbar">
        <span class="toolbar-title">Branches</span>
        <button class="btn btn-primary" @click=${() => { this.showNewBranchDialog = true; this.newBranchStartPoint = localBranches.find(b => b.isHead)?.name ?? ''; }}>
          + Neuer Branch
        </button>
        <button class="btn" @click=${this.loadBranches}>↻ Aktualisieren</button>
      </div>

      <div class="content">
        <div class="section-title">Lokale Branches</div>
        <div class="branch-list">
          ${localBranches.length > 0
            ? localBranches.map(b => this.renderBranchRow(b))
            : html`<span class="empty">Keine lokalen Branches</span>`}
        </div>

        ${remoteBranches.length > 0 ? html`
          <div class="section-title">Remote Branches</div>
          <div class="branch-list">
            ${remoteBranches.map(b => this.renderBranchRow(b))}
          </div>
        ` : ''}
      </div>

      ${this.showNewBranchDialog ? html`
        <div class="dialog-overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.showNewBranchDialog = false; }}>
          <div class="dialog">
            <div class="dialog-title">Neuen Branch erstellen</div>

            <div class="form-group">
              <label>Branch-Name</label>
              <input
                type="text"
                .value=${this.newBranchName}
                @input=${(e: Event) => this.newBranchName = (e.target as HTMLInputElement).value}
                @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.onCreateBranch()}
                placeholder="feature/mein-branch"
                autofocus
              />
            </div>

            <div class="form-group">
              <label>Basis-Branch</label>
              <select
                .value=${this.newBranchStartPoint}
                @change=${(e: Event) => this.newBranchStartPoint = (e.target as HTMLSelectElement).value}
              >
                ${localOptions.map(name => html`<option value=${name}>${name}</option>`)}
              </select>
            </div>

            ${this.dialogError ? html`<span class="error-msg">${this.dialogError}</span>` : ''}

            <div class="dialog-actions">
              <button class="btn" @click=${() => { this.showNewBranchDialog = false; this.dialogError = ''; }}>Abbrechen</button>
              <button class="btn btn-primary" ?disabled=${this.loading} @click=${this.onCreateBranch}>
                ${this.loading ? 'Erstelle…' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }
}
