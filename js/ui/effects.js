import { h } from './dom.js';

const layer = () => document.getElementById('fx');

export function floatXp(text) {
  const el = h('div', { class: 'float-xp' }, text);
  layer().append(el);
  setTimeout(() => el.remove(), 1400);
}

export function toast(message, kind = '') {
  const el = h('div', { class: `toast ${kind}`, role: 'status' }, message);
  layer().append(el);
  setTimeout(() => el.remove(), 2800);
}

// 레벨업·배지 축하 창. 여러 개가 겹치면 하나씩 차례로 보여 준다.
let queue = Promise.resolve();
export function celebrate({ icon, kicker, title, body }) {
  queue = queue.then(() => new Promise((resolve) => {
    const previous = document.activeElement;
    const ok = h('button', { type: 'button', class: 'btn primary' }, '좋아요');
    const back = h('div', { class: 'modal-back' },
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('div', { class: 'modal-icon', 'aria-hidden': 'true' }, icon),
        h('p', { class: 'kicker' }, kicker),
        h('h2', {}, title),
        body ? h('p', { class: 'muted' }, body) : null,
        ok));
    const close = () => {
      back.remove();
      document.removeEventListener('keydown', onKey);
      if (previous && previous.focus) previous.focus();
      resolve();
    };
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); close(); } };
    ok.addEventListener('click', close);
    back.addEventListener('click', (e) => { if (e.target === back) close(); });
    document.addEventListener('keydown', onKey);
    document.body.append(back);
    ok.focus();
  }));
}
