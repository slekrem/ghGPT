import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import { repositoryService, type BranchInfo } from '../services/repository-service';
import { ApiError } from '../services/api-client';

type DirtyDialogStep = 'options' | 'stash-name' | 'discard-confirm';

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

  @state() private dirtyDialogStep: DirtyDialogStep | null = null;
  @state() private pendingBranch = '';
  @state() private stashMessage = '';
  @state() private dirtyActionLoading = false;
  @state() private dirtyActionError = '';

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
      if (err instanceof ApiError && err.status === 409) {
        this.pendingBranch = name;
        this.stashMessage = '';
        this.dirtyActionError = '';
        this.dirtyDialogStep = 'options';
      } else {
        alert((err as Error).message);
      }
    }
  }

  private closeDirtyDialog() {
    this.dirtyDialogStep = null;
    this.pendingBranch = '';
    this.stashMessage = '';
    this.dirtyActionError = '';
  }

  private async executeDirtyAction(strategy: 'Carry' | 'Stash' | 'Discard', stashMessage?: string) {
    this.dirtyActionLoading = true;
    this.dirtyActionError = '';
    try {
      await repositoryService.checkoutBranch(this.repoId, this.pendingBranch, strategy, stashMessage);
      this.closeDirtyDialog();
      await this.loadBranches();
      this.dispatchEvent(new CustomEvent('branch-changed', { bubbles: true, composed: true }));
    } catch (err) {
      this.dirtyActionError = (err as Error).message;
    } finally {
      this.dirtyActionLoading = false;
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

  private renderDirtyDialog() {
    if (!this.dirtyDialogStep) return nothing;

    return html`
      <div data-testid="dirty-dialog-overlay" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
        <div data-testid="dirty-dialog" class="bg-cat-surface border border-cat-border rounded-xl p-6 w-[460px] flex flex-col gap-4">

          ${this.dirtyDialogStep === 'options' ? html`
            <div class="flex flex-col gap-1">
              <div class="text-base font-semibold text-cat-text">Ungespeicherte Änderungen</div>
              <div class="text-sm text-cat-subtext">
                Wechsel zu <span class="font-mono text-cat-blue">${this.pendingBranch}</span> — was soll mit den Änderungen passieren?
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <button data-testid="dirty-option-stash"
                class="flex flex-col gap-0.5 text-left px-4 py-3 rounded-lg border border-cat-muted bg-transparent hover:bg-cat-overlay hover:border-cat-blue cursor-pointer transition-colors"
                @click=${() => { this.dirtyDialogStep = 'stash-name'; this.stashMessage = ''; }}>
                <span class="text-sm font-medium text-cat-text">📦 Stashen</span>
                <span class="text-xs text-cat-subtle">Änderungen temporär sichern und später wiederherstellen</span>
              </button>

              <button data-testid="dirty-option-carry"
                class="flex flex-col gap-0.5 text-left px-4 py-3 rounded-lg border border-cat-muted bg-transparent hover:bg-cat-overlay hover:border-cat-blue cursor-pointer transition-colors"
                ?disabled=${this.dirtyActionLoading}
                @click=${() => this.executeDirtyAction('Carry')}>
                <span class="text-sm font-medium text-cat-text">🚚 Mitnehmen</span>
                <span class="text-xs text-cat-subtle">Änderungen in den Ziel-Branch übernehmen (schlägt fehl bei Konflikten)</span>
              </button>

              <button data-testid="dirty-option-commit"
                class="flex flex-col gap-0.5 text-left px-4 py-3 rounded-lg border border-cat-muted bg-transparent hover:bg-cat-overlay hover:border-cat-blue cursor-pointer transition-colors"
                @click=${() => { this.closeDirtyDialog(); this.dispatchEvent(new CustomEvent('navigate-to-changes', { bubbles: true, composed: true })); }}>
                <span class="text-sm font-medium text-cat-text">✅ Zuerst committen</span>
                <span class="text-xs text-cat-subtle">Abbrechen und zum Changes-View wechseln</span>
              </button>

              <button data-testid="dirty-option-discard"
                class="flex flex-col gap-0.5 text-left px-4 py-3 rounded-lg border border-cat-red/30 bg-transparent hover:bg-[rgba(243,139,168,0.08)] cursor-pointer transition-colors"
                @click=${() => { this.dirtyDialogStep = 'discard-confirm'; }}>
                <span class="text-sm font-medium text-cat-red">🗑 Verwerfen</span>
                <span class="text-xs text-cat-subtle">Alle Änderungen unwiderruflich löschen</span>
              </button>
            </div>

            ${this.dirtyActionError ? html`<span class="text-cat-red text-xs">${this.dirtyActionError}</span>` : nothing}

            <div class="flex justify-end">
              <button class="px-3 py-1.5 rounded-md border border-cat-muted bg-transparent text-cat-text text-sm cursor-pointer hover:bg-cat-overlay"
                @click=${this.closeDirtyDialog}>Abbrechen</button>
            </div>
          ` : nothing}

          ${this.dirtyDialogStep === 'stash-name' ? html`
            <div class="text-base font-semibold text-cat-text">Stash-Name (optional)</div>

            <input
              type="text"
              data-testid="stash-message-input"
              class="px-2.5 py-1.5 rounded-md border border-cat-muted bg-cat-overlay text-cat-text text-sm outline-none focus:border-cat-blue"
              placeholder="z.B. WIP: Login-Formular"
              .value=${this.stashMessage}
              @input=${(e: Event) => this.stashMessage = (e.target as HTMLInputElement).value}
              @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.executeDirtyAction('Stash', this.stashMessage || undefined)}
              autofocus
            />

            ${this.dirtyActionError ? html`<span class="text-cat-red text-xs">${this.dirtyActionError}</span>` : nothing}

            <div class="flex gap-2 justify-end">
              <button class="px-3 py-1.5 rounded-md border border-cat-muted bg-transparent text-cat-text text-sm cursor-pointer hover:bg-cat-overlay"
                @click=${() => { this.dirtyDialogStep = 'options'; this.dirtyActionError = ''; }}>Zurück</button>
              <button data-testid="confirm-stash-btn"
                class="px-3 py-1.5 rounded-md border border-cat-blue bg-cat-blue text-cat-base text-sm cursor-pointer hover:bg-cat-sapphire disabled:opacity-40 disabled:cursor-not-allowed"
                ?disabled=${this.dirtyActionLoading}
                @click=${() => this.executeDirtyAction('Stash', this.stashMessage || undefined)}>
                ${this.dirtyActionLoading ? 'Stashe…' : 'Stashen & wechseln'}
              </button>
            </div>
          ` : nothing}

          ${this.dirtyDialogStep === 'discard-confirm' ? html`
            <div class="flex flex-col gap-1">
              <div class="text-base font-semibold text-cat-red">Änderungen wirklich verwerfen?</div>
              <div class="text-sm text-cat-subtext">Diese Aktion kann nicht rückgängig gemacht werden. Alle uncommitted Änderungen gehen verloren.</div>
            </div>

            ${this.dirtyActionError ? html`<span class="text-cat-red text-xs">${this.dirtyActionError}</span>` : nothing}

            <div class="flex gap-2 justify-end">
              <button class="px-3 py-1.5 rounded-md border border-cat-muted bg-transparent text-cat-text text-sm cursor-pointer hover:bg-cat-overlay"
                @click=${() => { this.dirtyDialogStep = 'options'; this.dirtyActionError = ''; }}>Zurück</button>
              <button data-testid="confirm-discard-btn"
                class="px-3 py-1.5 rounded-md border border-cat-red bg-cat-red text-cat-base text-sm cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                ?disabled=${this.dirtyActionLoading}
                @click=${() => this.executeDirtyAction('Discard')}>
                ${this.dirtyActionLoading ? 'Verwerfe…' : 'Ja, verwerfen & wechseln'}
              </button>
            </div>
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

      ${this.renderDirtyDialog()}
    `;
  }
}
