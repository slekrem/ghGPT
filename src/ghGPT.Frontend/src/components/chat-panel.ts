import { html, nothing } from 'lit';
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
      const el = this.querySelector('.messages');
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
    const ta = this.querySelector('textarea') as HTMLTextAreaElement | null;
    if (ta) ta.style.height = 'auto';
  }

  private renderMarkdown(content: string) {
    const html = marked.parse(content) as string;
    return unsafeHTML(html);
  }

  render() {
    return html`
      <div class="px-4 py-3 border-b border-[#313244] flex items-center justify-between shrink-0">
        <span class="text-sm font-semibold text-[#cdd6f4] flex items-center gap-1.5">✦ KI-Assistent</span>
        <div class="flex items-center gap-1">
          ${this.messages.length > 0 && this.repoId ? html`
            <button class="bg-transparent border-none text-[#6c7086] cursor-pointer text-xs px-1 py-0.5 rounded hover:text-[#cdd6f4] hover:bg-[#313244]"
              title="Verlauf löschen" @click=${() => this.clearHistory()}>🗑</button>
          ` : nothing}
          <button class="bg-transparent border-none text-[#6c7086] cursor-pointer text-base px-1 py-0.5 rounded leading-none hover:text-[#cdd6f4] hover:bg-[#313244]"
            @click=${() => this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))}>✕</button>
        </div>
      </div>

      <div class="messages flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        ${this.messages.length === 0 ? html`
          <div class="flex flex-col items-center justify-center h-full text-[#6c7086] text-[0.8rem] text-center gap-2">
            <span class="text-[1.8rem]">✦</span>
            <span>Stelle eine Frage oder beschreibe eine Aufgabe</span>
          </div>
        ` : this.messages.map(m => {
          if (m.role === 'tool') {
            const icon = m.toolSuccess ? '✓' : '✗';
            const cls = m.toolSuccess
              ? 'border-[#a6e3a1] text-[#a6e3a1]'
              : 'border-[#f38ba8] text-[#f38ba8]';
            return html`
              <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[0.78rem] border bg-[#181825] ${cls}">
                <span class="text-[0.9rem] shrink-0">${icon}</span>
                <span class="flex-1 font-mono">${m.content}</span>
              </div>
            `;
          }
          return html`
            <div class="message ${m.role} flex flex-col gap-0.5 max-w-full">
              <span class="text-[0.68rem] uppercase tracking-wider text-[#6c7086] ${m.role === 'user' ? 'text-right' : ''}">
                ${m.role === 'user' ? 'Du' : 'Assistent'}
              </span>
              <div class="message-bubble px-3 py-2 rounded-lg text-[0.82rem] leading-[1.5] break-words
                ${m.role === 'user'
                  ? 'bg-[#313244] text-[#cdd6f4] self-end whitespace-pre-wrap'
                  : 'bg-[#181825] border border-[#313244] text-[#cdd6f4]'}">
                ${m.role === 'assistant'
                  ? html`${this.renderMarkdown(m.content)}${m.streaming ? html`<span class="cursor"></span>` : nothing}`
                  : html`${m.content}`}
              </div>
            </div>
          `;
        })}
      </div>

      <div class="px-3 py-3 border-t border-[#313244] flex gap-2 shrink-0 items-end">
        <textarea
          class="flex-1 px-2.5 py-1.5 rounded-md border border-[#45475a] bg-[#181825] text-[#cdd6f4] text-[0.82rem] font-[inherit] resize-none leading-[1.4] min-h-[36px] max-h-[120px] overflow-y-auto outline-none focus:border-[#89b4fa] placeholder:text-[#45475a] disabled:opacity-50"
          placeholder="Nachricht eingeben… (Enter zum Senden)"
          .value=${this.input}
          @input=${this.onInput}
          @keydown=${this.onKeydown}
          ?disabled=${this.streaming}
          rows="1"
        ></textarea>
        <button class="px-2.5 py-1.5 rounded-md border border-[#45475a] bg-transparent text-[#89b4fa] cursor-pointer text-[0.9rem] shrink-0 h-[36px] hover:bg-[#313244] disabled:opacity-40 disabled:cursor-not-allowed"
          ?disabled=${this.streaming || !this.input.trim()} @click=${() => this.send()}>
          ${this.streaming ? '…' : '↑'}
        </button>
      </div>
    `;
  }
}
