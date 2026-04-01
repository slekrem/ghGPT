import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

@customElement('chat-panel')
export class ChatPanel extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 320px;
      min-width: 320px;
      height: 100vh;
      background: #1e1e2e;
      border-left: 1px solid #313244;
      font-family: var(--bs-font-sans-serif, system-ui, sans-serif);
    }

    .panel-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #313244;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .panel-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #cdd6f4;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .close-btn {
      background: none;
      border: none;
      color: #6c7086;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
      line-height: 1;
    }

    .close-btn:hover { color: #cdd6f4; background: #313244; }

    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #6c7086;
      font-size: 0.8rem;
      text-align: center;
      gap: 0.5rem;
    }

    .empty-icon { font-size: 1.8rem; }

    .message {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      max-width: 100%;
    }

    .message-label {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #6c7086;
    }

    .message-bubble {
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      font-size: 0.82rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .message.user .message-bubble {
      background: #313244;
      color: #cdd6f4;
      align-self: flex-end;
    }

    .message.user .message-label {
      text-align: right;
    }

    .message.assistant .message-bubble {
      background: #181825;
      border: 1px solid #313244;
      color: #cdd6f4;
    }

    .cursor {
      display: inline-block;
      width: 2px;
      height: 0.9em;
      background: #89b4fa;
      margin-left: 1px;
      vertical-align: text-bottom;
      animation: blink 1s step-end infinite;
    }

    @keyframes blink {
      50% { opacity: 0; }
    }

    .input-area {
      padding: 0.75rem;
      border-top: 1px solid #313244;
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    textarea {
      flex: 1;
      padding: 0.45rem 0.65rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: #181825;
      color: #cdd6f4;
      font-size: 0.82rem;
      font-family: inherit;
      resize: none;
      line-height: 1.4;
      min-height: 36px;
      max-height: 120px;
    }

    textarea:focus {
      outline: none;
      border-color: #89b4fa;
    }

    textarea::placeholder { color: #45475a; }

    .send-btn {
      padding: 0.4rem 0.65rem;
      border-radius: 6px;
      border: 1px solid #45475a;
      background: transparent;
      color: #89b4fa;
      cursor: pointer;
      font-size: 0.9rem;
      align-self: flex-end;
      flex-shrink: 0;
    }

    .send-btn:hover { background: #313244; }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  `;

  @property() repoId = '';
  @property() branch = '';

  @state() private messages: Message[] = [];
  @state() private input = '';
  @state() private streaming = false;

  private _abortController: AbortController | null = null;

  disconnectedCallback() {
    super.disconnectedCallback();
    this._abortController?.abort();
  }

  private async send() {
    const text = this.input.trim();
    if (!text || this.streaming) return;

    this.input = '';
    this.messages = [...this.messages, { role: 'user', content: text }];
    this.streaming = true;

    const assistantMsg: Message = { role: 'assistant', content: '', streaming: true };
    this.messages = [...this.messages, assistantMsg];

    this._abortController = new AbortController();

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, repoId: this.repoId || null, branch: this.branch || null }),
        signal: this._abortController.signal,
      });

      if (!response.ok || !response.body) throw new Error('Anfrage fehlgeschlagen');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: done')) {
            this.finalizeLastMessage();
            return;
          }
          if (line.startsWith('event: error')) continue;
          if (line.startsWith('data: ')) {
            const token = JSON.parse(line.slice(6));
            this.appendToken(token);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        this.appendToken('\n\n[Fehler: ' + (err as Error).message + ']');
      }
    } finally {
      this.finalizeLastMessage();
    }
  }

  private appendToken(token: string) {
    const last = this.messages[this.messages.length - 1];
    if (last?.role === 'assistant') {
      this.messages = [
        ...this.messages.slice(0, -1),
        { ...last, content: last.content + token },
      ];
      this.scrollToBottom();
    }
  }

  private finalizeLastMessage() {
    const last = this.messages[this.messages.length - 1];
    if (last?.role === 'assistant') {
      this.messages = [
        ...this.messages.slice(0, -1),
        { ...last, streaming: false },
      ];
    }
    this.streaming = false;
    this._abortController = null;
  }

  private scrollToBottom() {
    const el = this.shadowRoot?.querySelector('.messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  private onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  render() {
    return html`
      <div class="panel-header">
        <span class="panel-title">✦ KI-Assistent</span>
        <button class="close-btn" @click=${() => this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))}>✕</button>
      </div>

      <div class="messages">
        ${this.messages.length === 0 ? html`
          <div class="empty">
            <span class="empty-icon">✦</span>
            <span>Stelle eine Frage oder beschreibe eine Aufgabe</span>
          </div>
        ` : this.messages.map(m => html`
          <div class="message ${m.role}">
            <span class="message-label">${m.role === 'user' ? 'Du' : 'Assistent'}</span>
            <div class="message-bubble">
              ${m.content}${m.streaming ? html`<span class="cursor"></span>` : ''}
            </div>
          </div>
        `)}
      </div>

      <div class="input-area">
        <textarea
          placeholder="Nachricht eingeben… (Enter zum Senden)"
          .value=${this.input}
          @input=${(e: Event) => { this.input = (e.target as HTMLTextAreaElement).value; }}
          @keydown=${this.onKeydown}
          ?disabled=${this.streaming}
          rows="1"
        ></textarea>
        <button class="send-btn" ?disabled=${this.streaming || !this.input.trim()} @click=${() => this.send()}>
          ${this.streaming ? '…' : '↑'}
        </button>
      </div>
    `;
  }
}
