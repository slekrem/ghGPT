import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AppElement } from '../app-element';
import { repositoryService } from '../services/repository-service';

type Step = 'options' | 'stash-name' | 'discard-confirm';

@customElement('dirty-checkout-dialog')
export class DirtyCheckoutDialog extends AppElement {
  @property() repoId = '';
  @property() branchName = '';

  @state() private step: Step = 'options';
  @state() private stashMessage = '';
  @state() private loading = false;
  @state() private error = '';

  updated(changed: Map<string, unknown>) {
    if (changed.has('branchName') && this.branchName) {
      this.step = 'options';
      this.stashMessage = '';
      this.error = '';
    }
  }

  private close() {
    this.dispatch('cancelled', null);
  }

  private dispatch(name: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private async execute(strategy: 'Carry' | 'Stash' | 'Discard', stashMessage?: string) {
    this.loading = true;
    this.error = '';
    try {
      await repositoryService.checkoutBranch(this.repoId, this.branchName, strategy, stashMessage);
      this.dispatch('checkout-complete', null);
    } catch (err) {
      this.error = (err as Error).message;
    } finally {
      this.loading = false;
    }
  }

  render() {
    if (!this.branchName) return nothing;

    return html`
      <div data-testid="dirty-dialog-overlay" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
        <div data-testid="dirty-dialog" class="bg-cat-surface border border-cat-border rounded-xl p-6 w-[460px] flex flex-col gap-4">

          ${this.step === 'options' ? html`
            <div class="flex flex-col gap-1">
              <div class="text-base font-semibold text-cat-text">Ungespeicherte Änderungen</div>
              <div class="text-sm text-cat-subtext">
                Wechsel zu <span class="font-mono text-cat-blue">${this.branchName}</span> — was soll mit den Änderungen passieren?
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <button data-testid="dirty-option-stash"
                class="flex flex-col gap-0.5 text-left px-4 py-3 rounded-lg border border-cat-muted bg-transparent hover:bg-cat-overlay hover:border-cat-blue cursor-pointer transition-colors"
                @click=${() => { this.step = 'stash-name'; this.stashMessage = ''; }}>
                <span class="text-sm font-medium text-cat-text">📦 Stashen</span>
                <span class="text-xs text-cat-subtle">Änderungen temporär sichern und später wiederherstellen</span>
              </button>

              <button data-testid="dirty-option-carry"
                class="flex flex-col gap-0.5 text-left px-4 py-3 rounded-lg border border-cat-muted bg-transparent hover:bg-cat-overlay hover:border-cat-blue cursor-pointer transition-colors"
                ?disabled=${this.loading}
                @click=${() => this.execute('Carry')}>
                <span class="text-sm font-medium text-cat-text">🚚 Mitnehmen</span>
                <span class="text-xs text-cat-subtle">Änderungen in den Ziel-Branch übernehmen (schlägt fehl bei Konflikten)</span>
              </button>

              <button data-testid="dirty-option-commit"
                class="flex flex-col gap-0.5 text-left px-4 py-3 rounded-lg border border-cat-muted bg-transparent hover:bg-cat-overlay hover:border-cat-blue cursor-pointer transition-colors"
                @click=${() => { this.close(); this.dispatch('navigate-to-changes', null); }}>
                <span class="text-sm font-medium text-cat-text">✅ Zuerst committen</span>
                <span class="text-xs text-cat-subtle">Abbrechen und zum Changes-View wechseln</span>
              </button>

              <button data-testid="dirty-option-discard"
                class="flex flex-col gap-0.5 text-left px-4 py-3 rounded-lg border border-cat-red/30 bg-transparent hover:bg-[rgba(243,139,168,0.08)] cursor-pointer transition-colors"
                @click=${() => { this.step = 'discard-confirm'; }}>
                <span class="text-sm font-medium text-cat-red">🗑 Verwerfen</span>
                <span class="text-xs text-cat-subtle">Alle Änderungen unwiderruflich löschen</span>
              </button>
            </div>

            ${this.error ? html`<span class="text-cat-red text-xs">${this.error}</span>` : nothing}

            <div class="flex justify-end">
              <button class="px-3 py-1.5 rounded-md border border-cat-muted bg-transparent text-cat-text text-sm cursor-pointer hover:bg-cat-overlay"
                @click=${this.close}>Abbrechen</button>
            </div>
          ` : nothing}

          ${this.step === 'stash-name' ? html`
            <div class="text-base font-semibold text-cat-text">Stash-Name (optional)</div>

            <input type="text" data-testid="stash-message-input"
              class="px-2.5 py-1.5 rounded-md border border-cat-muted bg-cat-overlay text-cat-text text-sm outline-none focus:border-cat-blue"
              placeholder="z.B. WIP: Login-Formular"
              .value=${this.stashMessage}
              @input=${(e: Event) => this.stashMessage = (e.target as HTMLInputElement).value}
              @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.execute('Stash', this.stashMessage || undefined)}
              autofocus />

            ${this.error ? html`<span class="text-cat-red text-xs">${this.error}</span>` : nothing}

            <div class="flex gap-2 justify-end">
              <button class="px-3 py-1.5 rounded-md border border-cat-muted bg-transparent text-cat-text text-sm cursor-pointer hover:bg-cat-overlay"
                @click=${() => { this.step = 'options'; this.error = ''; }}>Zurück</button>
              <button data-testid="confirm-stash-btn"
                class="px-3 py-1.5 rounded-md border border-cat-blue bg-cat-blue text-cat-base text-sm cursor-pointer hover:bg-cat-sapphire disabled:opacity-40 disabled:cursor-not-allowed"
                ?disabled=${this.loading}
                @click=${() => this.execute('Stash', this.stashMessage || undefined)}>
                ${this.loading ? 'Stashe…' : 'Stashen & wechseln'}
              </button>
            </div>
          ` : nothing}

          ${this.step === 'discard-confirm' ? html`
            <div class="flex flex-col gap-1">
              <div class="text-base font-semibold text-cat-red">Änderungen wirklich verwerfen?</div>
              <div class="text-sm text-cat-subtext">Diese Aktion kann nicht rückgängig gemacht werden. Alle uncommitted Änderungen gehen verloren.</div>
            </div>

            ${this.error ? html`<span class="text-cat-red text-xs">${this.error}</span>` : nothing}

            <div class="flex gap-2 justify-end">
              <button class="px-3 py-1.5 rounded-md border border-cat-muted bg-transparent text-cat-text text-sm cursor-pointer hover:bg-cat-overlay"
                @click=${() => { this.step = 'options'; this.error = ''; }}>Zurück</button>
              <button data-testid="confirm-discard-btn"
                class="px-3 py-1.5 rounded-md border border-cat-red bg-cat-red text-cat-base text-sm cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                ?disabled=${this.loading}
                @click=${() => this.execute('Discard')}>
                ${this.loading ? 'Verwerfe…' : 'Ja, verwerfen & wechseln'}
              </button>
            </div>
          ` : nothing}

        </div>
      </div>
    `;
  }
}
