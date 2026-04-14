import { html } from 'lit';

export function renderStateBadge(state: string, isDraft = false) {
  if (isDraft) return html`<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(166,173,200,0.15)] text-cat-subtext border border-[rgba(166,173,200,0.3)]">Draft</span>`;
  const s = state.toLowerCase();
  if (s === 'merged') return html`<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(203,166,247,0.15)] text-[#cba6f7] border border-[rgba(203,166,247,0.3)]">Merged</span>`;
  if (s === 'closed') return html`<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(243,139,168,0.15)] text-cat-red border border-[rgba(243,139,168,0.3)]">Closed</span>`;
  return html`<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(166,227,161,0.15)] text-cat-green border border-[rgba(166,227,161,0.3)]">Open</span>`;
}

export function renderLabel(name: string, color: string) {
  const hex = color.startsWith('#') ? color : `#${color}`;
  return html`<span
    class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold border"
    style="background:${hex}22;color:${hex};border-color:${hex}55">${name}</span>`;
}

export function renderAvatar(avatarUrl: string, login: string, size: 'small' | 'medium' = 'small') {
  if (size === 'small') {
    return avatarUrl
      ? html`<img class="w-4 h-4 rounded-full object-cover" src=${avatarUrl} alt=${login} />`
      : html`<div class="w-4 h-4 rounded-full bg-gradient-to-br from-cat-blue to-cat-peach text-[#11111b] flex items-center justify-center text-[0.55rem] font-bold shrink-0">${login.charAt(0).toUpperCase()}</div>`;
  }
  return avatarUrl
    ? html`<img class="w-6 h-6 rounded-full object-cover shrink-0" src=${avatarUrl} alt=${login} />`
    : html`<div class="w-6 h-6 rounded-full bg-gradient-to-br from-cat-blue to-cat-peach text-[#11111b] flex items-center justify-center text-[0.65rem] font-bold shrink-0">${login.charAt(0).toUpperCase()}</div>`;
}
