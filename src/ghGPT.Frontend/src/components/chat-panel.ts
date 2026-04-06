import { html, css, nothing } from 'lit';
import { AppElement } from '../app-element';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { marked } from 'marked';

marked.setOptions({ breaks: true });

interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  streaming?: boolean;
  toolName?: string;
  toolDisplayArgs?: string;
  toolSuccess?: boolean;
}

@customElement('chat-panel')
export class ChatPanel extends AppElement {
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .close-btn, .clear-btn {
      background: none;
      border: none;
      color: #6c7086;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
      line-height: 1;
    }

    .close-btn:hover, .clear-btn:hover { color: #cdd6f4; background: #313244; }
    .clear-btn { font-size: 0.75rem; }

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

    .message.user .message-label { text-align: right; }

    .message-bubble {
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      font-size: 0.82rem;
      line-height: 1.5;
      word-break: break-word;
    }

    .message.user .message-bubble {
      background: #313244;
      color: #cdd6f4;
      align-self: flex-end;
      white-space: pre-wrap;
    }

    .message.assistant .message-bubble {
      background: #181825;
      border: 1px solid #313244;
      color: #cdd6f4;
    }

    /* Markdown styles inside assistant bubble */
    .message.assistant .message-bubble p {
      margin: 0 0 0.5em;
    }
    .message.assistant .message-bubble p:last-child { margin-bottom: 0; }

    .message.assistant .message-bubble pre {
      background: #11111b;
      border: 1px solid #313244;
      border-radius: 6px;
      padding: 0.6rem 0.75rem;
      overflow-x: auto;
      margin: 0.4em 0;
    }

    .message.assistant .message-bubble code {
      font-family: 'Cascadia Code', 'Consolas', monospace;
      font-size: 0.78rem;
    }

    .message.assistant .message-bubble pre code {
      background: none;
      padding: 0;
      color: #cdd6f4;
    }

    .message.assistant .message-bubble :not(pre) > code {
      background: #313244;
      padding: 0.1em 0.35em;
      border-radius: 4px;
      color: #89b4fa;
    }

    .message.assistant .message-bubble ul,
    .message.assistant .message-bubble ol {
      margin: 0.3em 0;
      padding-left: 1.25em;
    }

    .message.assistant .message-bubble li { margin: 0.1em 0; }

    .message.assistant .message-bubble strong { color: #cba6f7; }

    .message.assistant .message-bubble blockquote {
      border-left: 3px solid #45475a;
      margin: 0.4em 0;
      padding-left: 0.75em;
      color: #a6adc8;
    }

    .message.assistant .message-bubble h1,
    .message.assistant .message-bubble h2,
    .message.assistant .message-bubble h3 {
      margin: 0.5em 0 0.25em;
      color: #cdd6f4;
      font-size: 0.9rem;
    }

    .tool-card {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.65rem;
      border-radius: 6px;
      font-size: 0.78rem;
      border: 1px solid #313244;
      background: #181825;
      color: #a6adc8;
    }

    .tool-card.success { border-color: #a6e3a1; color: #a6e3a1; }
    .tool-card.error { border-color: #f38ba8; color: #f38ba8; }

    .tool-icon { font-size: 0.9rem; flex-shrink: 0; }
    .tool-label { flex: 1; font-family: 'Cascadia Code', 'Consolas', monospace; }

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
      align-items: flex-end;
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
      overflow-y: auto;
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
      flex-shrink: 0;
      height: 36px;
    }

    .send-btn:hover { background: #313244; }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  `;

  @property() repoId = '';
  @property() branch = '';
  @property() activeView = '';

  @state() private messages: Message[] = [];
  @state() private input = '';
  @state() private streaming = false;

  private _abortController: AbortController | null = null;
  private _pendingToolEvent = false;

  connectedCallback() {
    super.connectedCallback();
    if (this.repoId) this.loadHistory();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('repoId') && changed.get('repoId') !== this.repoId) {
      this.messages = [];
      if (this.repoId) this.loadHistory();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._abortController?.abort();
  }

  private async loadHistory() {
    try {
      const res = await fetch(`/api/ai/history/${encodeURIComponent(this.repoId)}`);
      if (!res.ok) return;
      const entries: Array<{ role: string; content: string }> = await res.json();
      this.messages = entries
        .filter(e => e.role === 'user' || e.role === 'assistant')
        .map(e => ({ role: e.role as 'user' | 'assistant', content: e.content }));
      this.scrollToBottom();
    } catch {
      // Verlauf nicht verfügbar — kein Problem
    }
  }

  private async clearHistory() {
    try {
      await fetch(`/api/ai/history/${encodeURIComponent(this.repoId)}`, { method: 'DELETE' });
    } catch {
      // ignorieren
    }
    this.messages = [];
  }

  private async send() {
    const text = this.input.trim();
    if (!text || this.streaming) return;

    this.input = '';
    this.resetTextareaHeight();
    this.messages = [...this.messages, { role: 'user', content: text }];
    this.streaming = true;

    const assistantMsg: Message = { role: 'assistant', content: '', streaming: true };
    this.messages = [...this.messages, assistantMsg];

    this._abortController = new AbortController();

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, repoId: this.repoId || null, branch: this.branch || null, activeView: this.activeView || null }),
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
          if (line.startsWith('event: tool')) {
            this._pendingToolEvent = true;
            continue;
          }
          if (line.startsWith('data: ')) {
            if (this._pendingToolEvent) {
              this._pendingToolEvent = false;
              const toolEvent = JSON.parse(line.slice(6));
              this.addToolCard(toolEvent);
            } else {
              const token = JSON.parse(line.slice(6));
              this.appendToken(token);
            }
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

  private addToolCard(toolEvent: { toolName: string; displayArgs: string; success: boolean; message: string }) {
    // Streaming-Message temporär finalisieren damit die Tool-Karte davor eingefügt wird
    const last = this.messages[this.messages.length - 1];
    const hasStreamingAssistant = last?.role === 'assistant' && last.streaming;
    if (hasStreamingAssistant) {
      this.messages = [...this.messages.slice(0, -1)];
    }

    this.messages = [...this.messages, {
      role: 'tool',
      content: toolEvent.message,
      toolName: toolEvent.toolName,
      toolDisplayArgs: toolEvent.displayArgs,
      toolSuccess: toolEvent.success,
    }];

    // Streaming-Message wieder anhängen
    if (hasStreamingAssistant) {
      this.messages = [...this.messages, last];
    }

    this.scrollToBottom();
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
    this.scrollToBottom();
  }

  private scrollToBottom() {
    requestAnimationFrame(() => {
      const el = this.shadowRoot?.querySelector('.messages');
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  private onInput(e: Event) {
    const ta = e.target as HTMLTextAreaElement;
    this.input = ta.value;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }

  private onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  private resetTextareaHeight() {
    const ta = this.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement | null;
    if (ta) ta.style.height = 'auto';
  }

  private renderMarkdown(content: string) {
    const html = marked.parse(content) as string;
    return unsafeHTML(html);
  }

  render() {
    return html`
      <div class="panel-header">
        <span class="panel-title">✦ KI-Assistent</span>
        <div class="header-actions">
          ${this.messages.length > 0 && this.repoId ? html`
            <button class="clear-btn" title="Verlauf löschen" @click=${() => this.clearHistory()}>🗑</button>
          ` : nothing}
          <button class="close-btn" @click=${() => this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))}>✕</button>
        </div>
      </div>

      <div class="messages">
        ${this.messages.length === 0 ? html`
          <div class="empty">
            <span class="empty-icon">✦</span>
            <span>Stelle eine Frage oder beschreibe eine Aufgabe</span>
          </div>
        ` : this.messages.map(m => {
          if (m.role === 'tool') {
            const icon = m.toolSuccess ? '✓' : '✗';
            const cls = m.toolSuccess ? 'success' : 'error';
            return html`
              <div class="tool-card ${cls}">
                <span class="tool-icon">${icon}</span>
                <span class="tool-label">${m.content}</span>
              </div>
            `;
          }
          return html`
            <div class="message ${m.role}">
              <span class="message-label">${m.role === 'user' ? 'Du' : 'Assistent'}</span>
              <div class="message-bubble">
                ${m.role === 'assistant'
                  ? html`${this.renderMarkdown(m.content)}${m.streaming ? html`<span class="cursor"></span>` : nothing}`
                  : html`${m.content}`}
              </div>
            </div>
          `;
        })}
      </div>

      <div class="input-area">
        <textarea
          placeholder="Nachricht eingeben… (Enter zum Senden)"
          .value=${this.input}
          @input=${this.onInput}
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
