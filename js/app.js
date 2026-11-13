import { ITEMS } from './config.js';
import { dayKey, canEdit } from './date.js';
import { buildLedger, totalXp, levelInfo, currentStreak } from './xp.js';
import { computeStats, earnedBadges, newBadges } from './badges.js';
import { currentSeason, lastSeason, startSeason, targetsFor, seasonSummary } from './season.js';
import { BADGES } from './config.js';
import { createDemoStore } from './store-demo.js';
import { isConfigured, watchUser, signIn, signOutUser, createFirestoreStore } from './firebase.js';
import { h, clear } from './ui/dom.js';
import { floatXp, toast, celebrate } from './ui/effects.js';
import * as views from './ui/views.js';

const $ = (id) => document.getElementById(id);
const readTheme = () => { try { return localStorage.getItem('cb-theme') || 'system'; } catch (e) { return 'system'; } };

const state = {
  mode: null, // 'owner' | 'demo'
  user: null,
  store: null,
  data: { days: {}, missions: [], seasons: [] },
  tab: 'today',
  editDay: dayKey(),
  selDay: null,
  saveStatus: 'idle',
  confirmDelete: null,
  formError: '',
  busy: false,
  theme: readTheme(),
};
let derived = null;

// ---------- 계산 ----------
function derive() {
  const today = dayKey();
  const { days, missions, seasons } = state.data;
  const tf = targetsFor(seasons);
  const ledger = buildLedger(days, missions, tf);
  const total = totalXp(ledger);
  const lvl = levelInfo(total);
  const stats = computeStats({ days, missions, seasons, level: lvl.level, targetsFor: tf });
  const season = currentSeason(seasons, today);
  const last = lastSeason(seasons);
  const summarize = (s) => (s ? seasonSummary(s, { days, missions, ledger, today }) : null);
  return {
    today, tf, ledger, total, lvl, stats,
    badges: earnedBadges(stats),
    season, summary: summarize(season),
    last, lastSummary: summarize(last),
    streak: currentStreak(days, today, tf),
    summarize,
  };
}

// 상태가 바뀔 때마다 다시 계산하고, XP·레벨·배지가 늘었으면 연출을 보여 준다.
function update({ quiet = false } = {}) {
  const before = derived;
  derived = derive();
  if (before && !quiet) {
    const gained = derived.total - before.total;
    if (gained > 0) floatXp(`+${gained} XP`);
    if (derived.lvl.level > before.lvl.level) {
      celebrate({ icon: '⬆️', kicker: 'LEVEL UP', title: `레벨 ${derived.lvl.level}!`, body: `다음 레벨까지 ${derived.lvl.need} XP` });
    }
    for (const id of newBadges(before.badges, derived.badges)) {
      const b = BADGES.find((x) => x.id === id);
      celebrate({ icon: b.icon, kicker: 'BADGE UNLOCKED', title: b.name, body: b.desc });
    }
  }
  render();
}

// ---------- 저장 ----------
const timers = {};
function queueSaveDay(day) {
  if (state.mode === 'owner') state.saveStatus = 'saving';
  clearTimeout(timers[day]);
  timers[day] = setTimeout(async () => {
    try {
      await state.store.saveDay(day, state.data.days[day]);
      if (state.mode === 'owner') state.saveStatus = 'saved';
    } catch (e) {
      state.saveStatus = 'error';
      toast('저장하지 못했어요. 인터넷 연결을 확인해 주세요.', 'bad');
    }
    renderHud();
  }, 500);
}

async function persist(task) {
  try {
    await task();
  } catch (e) {
    state.saveStatus = 'error';
    toast('저장하지 못했어요. 인터넷 연결을 확인해 주세요.', 'bad');
    renderHud();
  }
}

// ---------- 동작 ----------
const act = {
  setTab(tab) {
    state.tab = tab;
    state.confirmDelete = null;
    state.formError = '';
    render();
    $('view').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  },
  setEditDay(day) { state.editDay = day; render(); },
  setItem(day, id, value) {
    if (!canEdit(day, derived.today)) return;
    state.data.days[day] = { ...(state.data.days[day] ?? {}), [id]: value };
    queueSaveDay(day);
    update();
  },
  setMemo(day, id, text) {
    if (!canEdit(day, derived.today)) return;
    state.data.days[day] = { ...(state.data.days[day] ?? {}), [`${id}Memo`]: text.trim().slice(0, 80) };
    queueSaveDay(day);
    update({ quiet: true });
  },
  addMission({ title, category, difficulty, due }) {
    const clean = title.trim();
    if (!clean) { state.formError = '할 일을 적어 주세요.'; render(); return; }
    const m = { id: crypto.randomUUID(), title: clean.slice(0, 60), category, difficulty, due: due || null, createdDay: derived.today, doneDay: null };
    state.data.missions.push(m);
    state.formError = '';
    persist(() => state.store.saveMission(m));
    update({ quiet: true });
    toast('미션을 추가했어요.');
  },
  completeMission(id) {
    const m = state.data.missions.find((x) => x.id === id);
    if (!m) return;
    m.doneDay = derived.today;
    persist(() => state.store.saveMission(m));
    update();
  },
  undoMission(id) {
    const m = state.data.missions.find((x) => x.id === id);
    if (!m || !canEdit(m.doneDay, derived.today)) return;
    m.doneDay = null;
    persist(() => state.store.saveMission(m));
    update({ quiet: true });
  },
  deleteMission(id) {
    if (state.confirmDelete !== id) {
      state.confirmDelete = id;
      render();
      setTimeout(() => { if (state.confirmDelete === id) { state.confirmDelete = null; render(); } }, 4000);
      return;
    }
    state.confirmDelete = null;
    state.data.missions = state.data.missions.filter((m) => m.id !== id);
    persist(() => state.store.deleteMission(id));
    update({ quiet: true });
    toast('미션을 삭제했어요.');
  },
  startSeason(targets) {
    try {
      state.data.seasons = startSeason(state.data.seasons, derived.today, targets);
    } catch (e) {
      toast(e.message, 'bad');
      return;
    }
    persist(() => state.store.saveSeasons(state.data.seasons));
    const s = state.data.seasons[state.data.seasons.length - 1];
    update({ quiet: true });
    celebrate({ icon: '🏁', kicker: `SEASON ${s.id}`, title: `시즌 ${s.id} 시작!`, body: '30일 동안 함께 달려 봐요.' });
  },
  selectDay(day) { state.selDay = day; render(); },
  editDayFromCalendar(day) { state.editDay = day; act.setTab('today'); },
  setTheme(theme) {
    state.theme = theme;
    try { localStorage.setItem('cb-theme', theme); } catch (e) { /* 무시 */ }
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  },
  summarize: (s) => derived.summarize(s),
  async logout() {
    await signOutUser();
    location.reload();
  },
  resetDemo() {
    state.store.reset();
    startDemo();
    toast('예시 데이터로 되돌렸어요.');
  },
  exitDemo() {
    try { localStorage.removeItem('cb-mode'); } catch (e) { /* 무시 */ }
    state.store?.destroy?.();
    location.reload();
  },
};

// ---------- 그리기 ----------
function renderHud() {
  if (derived) clear($('hud'), views.hud({ state, d: derived, act }));
}

function render() {
  if (!derived) return;
  // 하루가 바뀌어 고칠 수 없게 된 날을 보고 있으면 오늘로 돌린다.
  if (!canEdit(state.editDay, derived.today)) state.editDay = derived.today;

  // 다시 그려도 입력 중이던 칸의 포커스를 지킨다.
  const active = document.activeElement?.id;
  const ctx = { state, d: derived, act };
  renderHud();
  clear($('banner'), views.banner(ctx));
  clear($('view'), views[state.tab](ctx));
  for (const btn of document.querySelectorAll('#tabs button')) {
    if (btn.dataset.tab === state.tab) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
  }
  if (active) { const el = document.getElementById(active); if (el && el !== document.activeElement) el.focus({ preventScroll: true }); }
}

function showApp() {
  $('gate').hidden = true;
  $('app').hidden = false;
}

// ---------- 첫 화면 ----------
function showGate(kind = 'welcome', user = null) {
  $('app').hidden = true;
  $('gate').hidden = false;
  const configured = isConfigured();
  const demoBtn = h('button', { type: 'button', class: 'btn', onClick: () => { try { localStorage.setItem('cb-mode', 'demo'); } catch (e) { /* 무시 */ } startDemo(); } }, '🎮 로그인 없이 체험해 보기');
  let body;
  if (kind === 'not-owner') {
    body = [
      h('p', { class: 'gate-sub' }, `${user?.email ?? '이 계정'}은 이 보드에 기록을 저장할 수 없어요. 이 보드는 주인 계정만 쓸 수 있어요.`),
      h('p', { class: 'gate-note' }, '보드 주인이라면 아래 UID를 Firestore 보안 규칙에 넣어 주세요.'),
      h('code', { class: 'uid' }, user?.uid ?? ''),
      h('div', { class: 'gate-actions' },
        h('button', { type: 'button', class: 'btn', onClick: () => copy(user?.uid ?? '') }, 'UID 복사'),
        demoBtn,
        h('button', { type: 'button', class: 'btn ghost', onClick: act.logout }, '로그아웃')),
    ];
  } else if (kind === 'loading') {
    body = [h('p', { class: 'gate-sub' }, '불러오는 중이에요…')];
  } else {
    const loginBtn = h('button', {
      type: 'button', class: 'btn primary', disabled: !configured,
      onClick: async () => {
        try { await signIn(); } catch (e) { toast('로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.', 'bad'); }
      },
    }, 'Google 계정으로 로그인');
    body = [
      h('div', { class: 'gate-preview', 'aria-hidden': 'true' }, ITEMS.map((i) => h('span', {}, i.icon))),
      h('p', { class: 'gate-sub' }, '운동, 공부, 영양제, 약, 취업활동을 매일 기록하고 XP와 배지를 모아 레벨을 올리는 취업 준비 챌린지예요.'),
      h('div', { class: 'gate-actions' }, loginBtn, demoBtn),
      h('p', { class: 'gate-note' }, configured
        ? '기록 저장은 보드 주인 계정만 할 수 있어요. 다른 분은 체험 모드로 모든 기능을 써 볼 수 있어요.'
        : '아직 Firebase를 연결하기 전이라 체험 모드만 쓸 수 있어요.'),
    ];
  }
  clear($('gate'), h('div', { class: 'gate-card' },
    h('p', { class: 'kicker' }, 'QUEST LOG'),
    h('h1', { class: 'gate-title' }, '챌린지 보드'),
    body));
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('복사했어요.'); } catch (e) { toast('복사하지 못했어요. 직접 선택해서 복사해 주세요.', 'bad'); }
}

// ---------- 시작 ----------
async function loadFrom(store, mode) {
  state.store = store;
  state.mode = mode;
  state.data = await store.load();
  state.editDay = dayKey();
  state.saveStatus = 'idle';
  derived = null;
  update({ quiet: true });
  showApp();
}

function startDemo() {
  state.user = null;
  return loadFrom(createDemoStore(dayKey()), 'demo');
}

async function startOwner(user) {
  state.user = user;
  showGate('loading');
  try {
    await loadFrom(await createFirestoreStore(user.uid), 'owner');
  } catch (e) {
    if (e.code === 'not-owner') showGate('not-owner', user);
    else { showGate(); toast('기록을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.', 'bad'); }
  }
}

function init() {
  for (const btn of document.querySelectorAll('#tabs button')) btn.addEventListener('click', () => act.setTab(btn.dataset.tab));
  // 주소 끝의 #calendar 같은 탭 이름으로 처음 열 탭을 고른다.
  const hashTab = location.hash.slice(1);
  if (['today', 'calendar', 'missions', 'badges', 'season'].includes(hashTab)) state.tab = hashTab;
  // 앱을 켜 둔 채 새벽 4시가 지나면 날짜를 다시 계산한다.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && derived && dayKey() !== derived.today) update({ quiet: true }); });
  window.addEventListener('beforeunload', (e) => { if (state.saveStatus === 'saving') { e.preventDefault(); e.returnValue = ''; } });

  // 주소 끝에 ?demo를 붙이면 바로 체험 모드로 연다 (포트폴리오 링크용).
  let wantsDemo = new URLSearchParams(location.search).has('demo');
  try { wantsDemo = wantsDemo || localStorage.getItem('cb-mode') === 'demo'; } catch (e) { /* 무시 */ }
  if (wantsDemo) { startDemo(); return; }
  if (!isConfigured()) { showGate(); return; }
  showGate('loading');
  watchUser((user) => { if (user) startOwner(user); else showGate(); }).catch(() => showGate());
}

init();
