import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import { repositoryService, type BranchInfo } from '../services/repository-service';

@customElement('branches-view')
export class BranchesView extends AppElement {
  @property() repoId = '';
  @property({ type: Number }) refreshKey = 0;
  @state() private branches: BranchInfo[] = [];
  @state() private showNewBranchDialog = false;
  @state() private newBranchName = '';
  @state() private newBranchStartPoint = '';
  @state() private dialogError = '';
  @state() private loading = false;

  updated(changedProps: Map<string, unknown>) {
    if ((changedProps.has('repoId') || changedProps.has('refreshKey')) && this.repoId) {
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
    if (!b.trackingBranch) return nothing;
    const parts = [];
    if (b.aheadBy > 0) parts.push(html`<span class="text-cat-green">↑${b.aheadBy}</span>`);
    if (b.behindBy > 0) parts.push(html`<span class="text-cat-red">↓${b.behindBy}</span>`);
    if (parts.length === 0) return nothing;
    return html`<span class="text-xs text-cat-subtle shrink-0">${parts}</span>`;
  }

  private renderBranchRow(b: BranchInfo) {
    return html`
      <div data-testid="branch-row" ?data-head=${b.isHead} class="group flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors
        ${b.isHead ? 'border-[#89b4fa33] bg-[#89b4fa11]' : 'border-transparent hover:bg-cat-overlay'}"
        @dblclick=${() => !b.isHead && this.checkout(b.name)}>
        <span data-testid="branch-icon" class="text-sm shrink-0">${b.isRemote ? '☁' : '🌿'}</span>
        <span class="text-sm flex-1 overflow-hidden text-ellipsis whitespace-nowrap
          ${b.isHead ? 'text-cat-blue font-medium' : 'text-cat-text'}">${b.name}</span>
        ${b.isHead ? html`<span data-testid="head-badge" class="text-[0.65rem] bg-[#89b4fa33] text-cat-blue rounded px-1 shrink-0">HEAD</span>` : nothing}
        ${this.renderAheadBehind(b)}
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          ${!b.isHead ? html`
            <button data-testid="checkout-btn" class="px-2 py-0.5 rounded border border-cat-muted bg-transparent text-cat-text text-xs cursor-pointer hover:bg-cat-muted"
              @click=${(e: Event) => { e.stopPropagation(); this.checkout(b.name); }}>
              Checkout
            </button>
          ` : nothing}
          ${!b.isHead ? html`
            <button data-testid="delete-btn" class="px-2 py-0.5 rounded border border-cat-muted bg-transparent text-cat-red text-xs cursor-pointer hover:bg-cat-muted"
              @click=${(e: Event) => { e.stopPropagation(); this.deleteBranch(b.name); }}>
              ✕
            </button>
          ` : nothing}
        </div>
      </div>
    `;
  }

  render() {
    const localBranches = this.localBranches;
    const remoteBranches = this.remoteBranches;
    const allOptions = [...localBranches, ...remoteBranches].map(b => b.name);

    return html`
      <div class="flex items-center gap-2 px-4 py-3 border-b border-cat-border shrink-0">
        <span data-testid="toolbar-title" class="text-sm font-semibold text-cat-text flex-1">Branches</span>
        <button data-testid="new-branch-btn" class="px-3 py-1 rounded-md border border-cat-blue bg-cat-blue text-cat-base text-xs cursor-pointer hover:bg-cat-sapphire hover:border-cat-sapphire"
          @click=${() => { this.showNewBranchDialog = true; this.newBranchStartPoint = localBranches.find(b => b.isHead)?.name ?? ''; }}>
          + Neuer Branch
        </button>
        <button class="px-3 py-1 rounded-md border border-cat-muted bg-transparent text-cat-text text-xs cursor-pointer hover:bg-cat-overlay"
          @click=${this.loadBranches}>↻ Aktualisieren</button>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div data-testid="section-title" class="text-[0.7rem] uppercase tracking-widest text-cat-subtle mb-2">Lokale Branches</div>
        <div class="flex flex-col gap-0.5">
          ${localBranches.length > 0
            ? localBranches.map(b => this.renderBranchRow(b))
            : html`<span class="text-cat-subtle text-sm py-1">Keine lokalen Branches</span>`}
        </div>

        ${remoteBranches.length > 0 ? html`
          <div data-testid="section-title" class="text-[0.7rem] uppercase tracking-widest text-cat-subtle mb-2 mt-4">Remote Branches</div>
          <div class="flex flex-col gap-0.5">
            ${remoteBranches.map(b => this.renderBranchRow(b))}
          </div>
        ` : nothing}
      </div>

      ${this.showNewBranchDialog ? html`
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
          @click=${(e: Event) => { if (e.target === e.currentTarget) this.showNewBranchDialog = false; }}>
          <div data-testid="new-branch-dialog" class="bg-cat-surface border border-cat-border rounded-xl p-6 w-[420px] flex flex-col gap-4">
            <div data-testid="dialog-title" class="text-base font-semibold text-cat-text">Neuen Branch erstellen</div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-cat-subtext">Branch-Name</label>
              <input
                type="text"
                class="px-2.5 py-1.5 rounded-md border border-cat-muted bg-cat-overlay text-cat-text text-sm outline-none focus:border-cat-blue"
                .value=${this.newBranchName}
                @input=${(e: Event) => this.newBranchName = (e.target as HTMLInputElement).value}
                @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.onCreateBranch()}
                placeholder="feature/mein-branch"
                autofocus
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-cat-subtext">Basis-Branch</label>
              <select
                class="px-2.5 py-1.5 rounded-md border border-cat-muted bg-cat-overlay text-cat-text text-sm outline-none focus:border-cat-blue"
                .value=${this.newBranchStartPoint}
                @change=${(e: Event) => this.newBranchStartPoint = (e.target as HTMLSelectElement).value}
              >
                ${allOptions.map(name => html`<option value=${name}>${name}</option>`)}
              </select>
            </div>

            ${this.dialogError ? html`<span data-testid="error-msg" class="text-cat-red text-xs">${this.dialogError}</span>` : nothing}

            <div class="flex gap-2 justify-end">
              <button class="btn px-3 py-1.5 rounded-md border border-cat-muted bg-transparent text-cat-text text-sm cursor-pointer hover:bg-cat-overlay"
                @click=${() => { this.showNewBranchDialog = false; this.dialogError = ''; }}>Abbrechen</button>
              <button data-testid="create-branch-btn" class="px-3 py-1.5 rounded-md border border-cat-blue bg-cat-blue text-cat-base text-sm cursor-pointer hover:bg-cat-sapphire disabled:opacity-40 disabled:cursor-not-allowed"
                ?disabled=${this.loading} @click=${this.onCreateBranch}>
                ${this.loading ? 'Erstelle…' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      ` : nothing}
    `;
  }
}
