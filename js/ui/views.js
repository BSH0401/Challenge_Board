import { ITEMS, XP, SEASON, BADGES, MISSION_CATEGORIES, DIFFICULTIES } from '../config.js';
import { addDays, diffDays, canEdit, shortLabel } from '../date.js';
import { evaluateDay } from '../xp.js';
import { badgeProgress } from '../badges.js';
import { seasonEnd } from '../season.js';
import { h } from './dom.js';

const catOf = (id) => MISSION_CATEGORIES.find((c) => c.id === id) ?? MISSION_CATEGORIES[0];
const diffOf = (id) => DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[0];
const pct = (a, b) => `${Math.round(Math.min(1, b ? a / b : 0) * 100)}%`;
const bar = (ratio) => h('div', { class: 'bar' }, h('div', { style: `width:${Math.round(Math.min(1, ratio) * 100)}%` }));

// ---------- HUD ----------
const SAVE_LABEL = { idle: '', saving: '저장 중…', saved: '저장됨', error: '저장 실패', demo: '체험 모드' };

export function hud({ state, d }) {
  const { lvl } = d;
  return h('div', { class: 'hud-inner' },
    h('div', { class: 'emblem', role: 'img', 'aria-label': `레벨 ${lvl.level}` },
      h('span', { class: 'emblem-lv' }, 'LV'),
      h('span', { class: 'emblem-num' }, lvl.level)),
    h('div', { class: 'hud-main' },
      h('div', { class: 'hud-row' },
        h('span', { class: 'hud-title' }, state.mode === 'demo' ? '체험 플레이어' : '나의 챌린지'),
        h('span', { class: `save ${state.saveStatus}` }, SAVE_LABEL[state.mode === 'demo' ? 'demo' : state.saveStatus])),
      h('div', {
        class: 'xpbar', role: 'progressbar', 'aria-label': '다음 레벨까지 XP',
        'aria-valuemin': '0', 'aria-valuemax': String(lvl.need), 'aria-valuenow': String(lvl.into),
      }, h('div', { class: 'xpfill', style: `width:${pct(lvl.into, lvl.need)}` })),
      h('div', { class: 'hud-row small muted' },
        h('span', { class: 'num' }, `${lvl.into} / ${lvl.need} XP`),
        h('span', {}, '누적 ', h('span', { class: 'num' }, d.total.toLocaleString()), ' XP'))),
    h('div', { class: 'hud-side' },
      h('span', { class: 'chip', title: '연속 달성 일수 (하루 3개 이상)' }, '🔥 ', h('b', {}, d.streak), '일'),
      h('span', { class: 'chip' }, d.season ? `S${d.season.id} · ${d.summary.dayIndex}/${SEASON.length}일` : '시즌 없음')));
}

// ---------- 배너 ----------
export function banner({ state, d, act }) {
  const out = [];
  if (state.mode === 'demo') {
    out.push(h('div', { class: 'banner' },
      h('span', { class: 'grow' }, '🎮 체험 모드예요. 예시 데이터이고, 기록은 이 브라우저에만 저장돼요.'),
      h('button', { type: 'button', class: 'btn small', onClick: act.exitDemo }, '나가기')));
  }
  if (!d.season && state.tab !== 'season') {
    const ended = d.last && d.lastSummary?.ended;
    out.push(h('div', { class: 'banner gold' },
      h('span', { class: 'grow' }, ended ? `🏁 시즌 ${d.last.id}이 끝났어요! 결과를 확인하고 새 시즌을 시작하세요.` : '🏁 아직 시즌이 없어요. 시즌 1을 시작해 보세요.'),
      h('button', { type: 'button', class: 'btn small primary', onClick: () => act.setTab('season') }, ended ? '결과 보기' : '시작하기')));
  }
  return out;
}

// ---------- 오늘 ----------
function questCard(item, { day, record, evalResult, targets, editable, act }) {
  const done = evalResult.done.includes(item.id);
  const value = record[item.id];
  const head = h('div', { class: 'quest-head' },
    h('span', { class: 'quest-icon', 'aria-hidden': 'true' }, item.icon),
    h('div', {},
      h('div', { class: 'quest-name' }, item.label),
      h('div', { class: 'quest-goal' }, item.kind === 'minutes' ? `목표 ${targets[item.id] ?? item.target}분 · +${XP.item} XP` : `체크하면 달성 · +${XP.item} XP`)),
    h('span', { class: 'quest-state' }, done ? '달성!' : '진행 전'));

  let body;
  if (item.kind === 'minutes') {
    const minutes = Number(value) || 0;
    const target = targets[item.id] ?? item.target;
    const set = (v) => act.setItem(day, item.id, Math.max(0, Math.min(1440, v)));
    body = [
      h('div', { class: 'minutes' },
        h('button', { type: 'button', class: 'btn step', disabled: !editable || minutes === 0, 'aria-label': `${item.label} 10분 빼기`, onClick: () => set(minutes - 10) }, '−10'),
        h('input', {
          id: `in-${item.id}`, type: 'number', inputmode: 'numeric', min: '0', max: '1440', step: '5',
          value: String(minutes), disabled: !editable, 'aria-label': `${item.label} 시간(분)`,
          onChange: (e) => set(parseInt(e.target.value, 10) || 0),
        }),
        h('span', { class: 'unit' }, '분'),
        h('button', { type: 'button', class: 'btn step', disabled: !editable, 'aria-label': `${item.label} 10분 더하기`, onClick: () => set(minutes + 10) }, '+10'),
        h('button', { type: 'button', class: 'btn step', disabled: !editable, 'aria-label': `${item.label} 30분 더하기`, onClick: () => set(minutes + 30) }, '+30')),
      bar(minutes / target),
    ];
  } else {
    body = h('button', {
      type: 'button', class: `check-btn${done ? ' on' : ''}`, 'aria-pressed': String(done), disabled: !editable,
      onClick: () => act.setItem(day, item.id, !done),
    }, done ? '완료했어요 ✓' : '체크하기');
  }

  const memo = item.memo ? h('input', {
    id: `memo-${item.id}`, class: 'memo', type: 'text', maxlength: '80', disabled: !editable,
    placeholder: item.id === 'study' ? '무엇을 공부했나요? (한 줄 메모)' : '어떤 취업 활동을 했나요? (한 줄 메모)',
    value: record[`${item.id}Memo`] ?? '', 'aria-label': `${item.label} 메모`,
    onChange: (e) => act.setMemo(day, item.id, e.target.value),
  }) : null;

  return h('section', { class: `panel quest${done ? ' done' : ''}` }, head, body, memo);
}

export function today(ctx) {
  const { state, d, act } = ctx;
  const day = state.editDay;
  const record = state.data.days[day] ?? {};
  const targets = d.tf(day);
  const evalResult = evaluateDay(record, targets);
  const editable = canEdit(day, d.today);
  const yesterday = addDays(d.today, -1);
  const left = ITEMS.length - evalResult.count;

  const switcher = h('div', { class: 'day-switch', role: 'group', 'aria-label': '기록할 날짜' },
    h('button', { type: 'button', 'aria-pressed': String(day === d.today), onClick: () => act.setEditDay(d.today) }, `오늘 ${shortLabel(d.today)}`),
    h('button', { type: 'button', 'aria-pressed': String(day === yesterday), onClick: () => act.setEditDay(yesterday) }, `어제 ${shortLabel(yesterday)}`));

  const summary = h('section', { class: 'panel summary' },
    h('div', { class: 'summary-line' },
      h('h2', {}, `달성 ${evalResult.count} / ${ITEMS.length}`),
      h('span', { class: 'big-xp' }, `+${evalResult.xp} XP`)),
    h('div', { class: 'pips', 'aria-hidden': 'true' }, ITEMS.map((i) => h('span', { class: `pip${evalResult.done.includes(i.id) ? ' on' : ''}` }))),
    h('p', { class: 'small muted', style: 'margin:0' },
      evalResult.perfect ? `⭐ 퍼펙트 데이! 보너스 +${XP.perfectBonus} XP를 받았어요.`
        : evalResult.qualified ? `달성한 날로 기록돼요. 퍼펙트까지 ${left}개 남았어요.`
          : `${XP.qualifyMin - evalResult.count}개 더 하면 달성한 날이 돼서 연속 기록이 이어져요.`),
    day === yesterday ? h('p', { class: 'small muted', style: 'margin:0' }, '어제 기록은 오늘 하루 동안(내일 새벽 4시 전까지) 고칠 수 있어요.') : null);

  const open = state.data.missions.filter((m) => !m.doneDay).sort(missionOrder).slice(0, 3);
  const missionPanel = h('section', { class: 'panel' },
    h('div', { class: 'panel-head' },
      h('h3', {}, '📜 진행 중인 미션'),
      h('button', { type: 'button', class: 'linklike', onClick: () => act.setTab('missions') }, '전체 보기')),
    open.length ? open.map((m) => missionRow(m, ctx)) : h('p', { class: 'muted small', style: 'margin:0' }, '진행 중인 미션이 없어요. 미션 탭에서 추가해 보세요.'));

  return [switcher, summary, ...ITEMS.map((item) => questCard(item, { day, record, evalResult, targets, editable, act })), missionPanel];
}

// ---------- 미션 ----------
function missionOrder(a, b) {
  if (a.due && b.due) return a.due.localeCompare(b.due);
  if (a.due) return -1;
  if (b.due) return 1;
  return (a.createdDay ?? '').localeCompare(b.createdDay ?? '');
}

function missionRow(m, { state, d, act }) {
  const cat = catOf(m.category);
  const diff = diffOf(m.difficulty);
  const tags = [
    h('span', { class: 'tag' }, `${cat.icon} ${cat.label}`),
    h('span', { class: 'tag xp' }, `${diff.label} +${XP.mission[m.difficulty]} XP`),
  ];
  if (m.doneDay) {
    tags.push(h('span', { class: 'tag' }, `완료 ${shortLabel(m.doneDay)}`));
  } else if (m.due) {
    const left = diffDays(d.today, m.due);
    tags.push(h('span', { class: `tag ${left < 0 ? 'late' : 'due'}` }, left < 0 ? `마감 ${-left}일 지남` : left === 0 ? '오늘 마감' : `D-${left}`));
  }
  const confirming = state.confirmDelete === m.id;
  const actions = m.doneDay
    ? [canEdit(m.doneDay, d.today) ? h('button', { type: 'button', class: 'btn small ghost', onClick: () => act.undoMission(m.id) }, '되돌리기') : null]
    : [
      h('button', { type: 'button', class: 'btn small primary', onClick: () => act.completeMission(m.id) }, '완료'),
      h('button', { type: 'button', class: `btn small ${confirming ? 'danger' : 'ghost'}`, 'aria-label': `${m.title} 삭제`, onClick: () => act.deleteMission(m.id) }, confirming ? '정말 삭제' : '삭제'),
    ];
  return h('div', { class: `mission${m.doneDay ? ' is-done' : ''}` },
    h('div', { class: 'mission-title' }, m.title),
    h('div', { class: 'mission-actions' }, actions),
    h('div', { class: 'mission-meta' }, tags));
}

export function missions(ctx) {
  const { state, act } = ctx;
  const open = state.data.missions.filter((m) => !m.doneDay).sort(missionOrder);
  const done = state.data.missions.filter((m) => m.doneDay).sort((a, b) => b.doneDay.localeCompare(a.doneDay));

  const form = h('form', {
    class: 'panel mission-form', onSubmit: (e) => {
      e.preventDefault();
      const f = e.target;
      act.addMission({ title: f.elements['m-title'].value, category: f.elements['m-cat'].value, difficulty: f.elements['m-diff'].value, due: f.elements['m-due'].value });
    },
  },
  h('h3', {}, '새 미션'),
  h('label', { class: 'field' }, '할 일',
    h('input', { id: 'm-title', name: 'm-title', type: 'text', maxlength: '60', placeholder: '예: 엽스튜디오 지원서 내기', autocomplete: 'off' })),
  h('div', { class: 'form-grid' },
    h('label', { class: 'field' }, '분류',
      h('select', { id: 'm-cat', name: 'm-cat' }, MISSION_CATEGORIES.map((c) => h('option', { value: c.id }, `${c.icon} ${c.label}`)))),
    h('label', { class: 'field' }, '난이도',
      h('select', { id: 'm-diff', name: 'm-diff' }, DIFFICULTIES.map((x) => h('option', { value: x.id, selected: x.id === 'normal' }, `${x.label} (+${XP.mission[x.id]})`)))),
    h('label', { class: 'field' }, '마감일 (선택)', h('input', { id: 'm-due', name: 'm-due', type: 'date' }))),
  h('p', { class: 'error-text', role: 'alert' }, state.formError ?? ''),
  h('button', { type: 'submit', class: 'btn primary' }, '미션 추가'));

  const openPanel = h('section', { class: 'panel' },
    h('div', { class: 'panel-head' }, h('h3', {}, '진행 중'), h('span', { class: 'muted small' }, `${open.length}개`)),
    open.length ? open.map((m) => missionRow(m, ctx)) : h('p', { class: 'muted small', style: 'margin:0' }, '진행 중인 미션이 없어요.'));

  const donePanel = h('section', { class: 'panel' },
    h('details', {},
      h('summary', {}, `완료한 미션 ${done.length}개`),
      done.length ? done.map((m) => missionRow(m, ctx)) : h('p', { class: 'muted small' }, '아직 완료한 미션이 없어요.')));

  return [form, openPanel, donePanel];
}

// ---------- 달력 ----------
export function calendar(ctx) {
  const { state, d, act } = ctx;
  const season = d.season ?? d.last;
  if (!season) {
    return h('section', { class: 'panel' },
      h('h3', {}, '아직 시즌이 없어요'),
      h('p', { class: 'muted' }, '시즌을 시작하면 30일 달력이 생겨요.'),
      h('button', { type: 'button', class: 'btn primary', onClick: () => act.setTab('season') }, '시즌 시작하기'));
  }
  const summary = d.season ? d.summary : d.lastSummary;
  const sel = state.selDay && state.selDay >= season.start && state.selDay <= seasonEnd(season) ? state.selDay : (d.season ? d.today : season.start);

  const cells = Array.from({ length: SEASON.length }, (_, i) => {
    const day = addDays(season.start, i);
    const r = evaluateDay(state.data.days[day], season.targets);
    const future = day > d.today;
    const cls = ['cal-cell', future ? 'future' : `c${r.count}`, day === d.today ? 'today' : ''].join(' ');
    return h('button', {
      type: 'button', class: cls, 'aria-pressed': String(day === sel),
      'aria-label': `${i + 1}일차 ${shortLabel(day)}, ${future ? '아직 오지 않은 날' : `${r.count}개 달성`}${r.perfect ? ', 퍼펙트' : ''}`,
      onClick: () => act.selectDay(day),
    },
    h('span', { class: 'cal-d' }, i + 1),
    h('span', { class: 'cal-date' }, `${Number(day.slice(5, 7))}/${Number(day.slice(8))}`),
    r.perfect ? h('span', { class: 'cal-star', 'aria-hidden': 'true' }, '⭐') : null);
  });

  const shade = (n) => (n === 0 ? 'var(--panel-2)' : n === 5 ? 'var(--good)' : `color-mix(in srgb, var(--good) ${[0, 14, 28, 46, 64][n]}%, var(--panel))`);
  const legend = h('div', { class: 'legend' }, '적음',
    [0, 1, 2, 3, 4, 5].map((n) => h('i', { style: `background:${shade(n)}` })), '많음 · ⭐ 퍼펙트');

  const gridPanel = h('section', { class: 'panel' },
    h('div', { class: 'panel-head' },
      h('h3', {}, `시즌 ${season.id} 달력`),
      h('span', { class: 'muted small' }, `${shortLabel(season.start)} ~ ${shortLabel(seasonEnd(season))}`)),
    h('div', { class: 'cal' }, cells),
    h('div', { style: 'margin-top:10px' }, legend));

  // 선택한 날의 기록
  const rec = state.data.days[sel] ?? {};
  const r = evaluateDay(rec, season.targets);
  const dayXp = d.ledger.filter((e) => e.day === sel).reduce((s, e) => s + e.amount, 0);
  const doneMissions = state.data.missions.filter((m) => m.doneDay === sel);
  const detail = h('section', { class: 'panel' },
    h('div', { class: 'panel-head' },
      h('h3', {}, shortLabel(sel)),
      h('span', { class: 'big-xp', style: 'font-size:18px' }, `+${dayXp} XP`)),
    sel > d.today ? h('p', { class: 'muted', style: 'margin:0' }, '아직 오지 않은 날이에요.') : h('ul', { class: 'detail-list' },
      ITEMS.map((item) => {
        const v = rec[item.id];
        const ok = r.done.includes(item.id);
        const val = item.kind === 'minutes' ? `${Number(v) || 0}분` : (v ? '체크' : '안 함');
        const memo = rec[`${item.id}Memo`];
        return h('li', {},
          h('span', { 'aria-hidden': 'true' }, ok ? '✅' : '▫️'),
          h('span', {}, `${item.label} · ${val}`),
          memo ? h('span', { class: 'memo-text' }, `“${memo}”`) : null);
      }),
      doneMissions.map((m) => h('li', {}, h('span', { 'aria-hidden': 'true' }, '📜'), h('span', {}, `미션 완료: ${m.title}`)))),
    canEdit(sel, d.today) ? h('button', { type: 'button', class: 'btn', style: 'margin-top:10px', onClick: () => act.editDayFromCalendar(sel) }, '이 날 기록 고치기') : null);

  const counts = h('section', { class: 'panel' },
    h('div', { class: 'panel-head' }, h('h3', {}, '항목별 달성'), h('span', { class: 'muted small' }, `${summary.dayIndex}일 중`)),
    h('div', { style: 'display:grid;gap:8px' },
      ITEMS.map((item) => h('div', { class: 'count-row' },
        h('span', {}, `${item.icon} ${item.label}`),
        bar(summary.itemCounts[item.id] / summary.dayIndex),
        h('span', { class: 'num', style: 'text-align:right' }, `${summary.itemCounts[item.id]}일`)))));

  return [gridPanel, detail, counts];
}

// ---------- 배지 ----------
export function badges({ d }) {
  const groups = [...new Set(BADGES.map((b) => b.group))];
  return [
    h('section', { class: 'panel' },
      h('div', { class: 'panel-head' },
        h('h2', {}, '배지'),
        h('span', { class: 'big-xp', style: 'font-size:18px' }, `${d.badges.length} / ${BADGES.length}`)),
      h('p', { class: 'muted small', style: 'margin:0' }, '한 번 받은 배지는 시즌이 바뀌어도 사라지지 않아요.')),
    ...groups.map((g) => h('section', { class: 'panel' },
      h('h3', { style: 'margin-bottom:10px' }, g === '레벨' ? '🎖️ 레벨' : g === '연속' ? '🔥 연속' : '🏆 업적'),
      h('div', { class: 'badge-grid' },
        BADGES.filter((b) => b.group === g).map((b) => {
          const earned = d.badges.includes(b.id);
          const p = badgeProgress(b, d.stats);
          return h('div', { class: `badge${earned ? ' earned' : ''}`, 'aria-label': `${b.name}: ${b.desc}, ${earned ? '획득' : `진행 ${p.value}/${p.min}`}` },
            h('div', { class: 'badge-icon', 'aria-hidden': 'true' }, b.icon),
            h('div', { class: 'badge-name' }, b.name),
            h('div', { class: 'badge-desc' }, b.desc),
            earned ? h('div', { class: 'small', style: 'color:var(--gold);font-weight:700' }, '획득!')
              : [bar(p.ratio), h('div', { class: 'badge-desc num' }, `${p.value.toLocaleString()} / ${p.min.toLocaleString()}`)]);
        })))),
  ];
}

// ---------- 시즌 ----------
function statGrid(sum) {
  const stat = (value, label) => h('div', { class: 'stat' }, h('b', {}, value), h('span', {}, label));
  return h('div', { class: 'stat-grid' },
    stat(`${sum.qualifiedDays} / ${SEASON.clearDays}`, `달성한 날 (완주 목표 ${SEASON.clearDays}일)`),
    stat(sum.xp.toLocaleString(), '시즌 XP'),
    stat(sum.perfectDays, '퍼펙트 데이'),
    stat(sum.missionsDone, '완료한 미션'));
}

function seasonStart(ctx, title, description) {
  const { d, act, state } = ctx;
  const prev = d.last?.targets ?? {};
  const minuteItems = ITEMS.filter((i) => i.kind === 'minutes');
  return h('form', {
    class: 'panel mission-form', onSubmit: (e) => {
      e.preventDefault();
      const targets = Object.fromEntries(minuteItems.map((i) => [i.id, Math.max(5, parseInt(e.target.elements[`t-${i.id}`].value, 10) || i.target)]));
      act.startSeason(targets);
    },
  },
  h('h3', {}, title),
  h('p', { class: 'muted small', style: 'margin:0' }, description),
  h('div', { class: 'form-grid', style: 'grid-template-columns:1fr 1fr' },
    minuteItems.map((i) => h('label', { class: 'field' }, `${i.icon} ${i.label} 목표 (분)`,
      h('input', { id: `t-${i.id}`, name: `t-${i.id}`, type: 'number', min: '5', max: '600', step: '5', inputmode: 'numeric', value: String(prev[i.id] ?? i.target) })))),
  h('button', { type: 'submit', class: 'btn primary', disabled: state.busy }, `시즌 ${(d.last?.id ?? 0) + 1} 시작 (오늘부터 ${SEASON.length}일)`));
}

export function season(ctx) {
  const { state, d, act } = ctx;
  const out = [];
  if (d.season) {
    const s = d.summary;
    out.push(h('section', { class: 'panel' },
      h('p', { class: 'kicker' }, `SEASON ${d.season.id}`),
      h('div', { class: 'panel-head' },
        h('h2', {}, `${s.dayIndex}일차`),
        h('span', { class: 'muted small' }, `${shortLabel(d.season.start)} ~ ${shortLabel(s.end)} · ${s.daysLeft}일 남음`)),
      bar(s.dayIndex / SEASON.length),
      h('div', { style: 'margin-top:12px' }, statGrid(s)),
      h('p', { class: 'muted small', style: 'margin:10px 0 0' },
        `목표: ${ITEMS.filter((i) => i.kind === 'minutes').map((i) => `${i.label} ${d.season.targets?.[i.id] ?? i.target}분`).join(' · ')}`)));
  } else if (d.last) {
    const s = d.lastSummary;
    out.push(h('section', { class: 'panel', style: 'border-color:var(--gold)' },
      h('p', { class: 'kicker' }, `SEASON ${d.last.id} RESULT`),
      h('h2', {}, s.cleared ? '🏁 시즌 완주!' : '시즌이 끝났어요'),
      h('p', { class: 'muted small' }, `${shortLabel(d.last.start)} ~ ${shortLabel(s.end)}`),
      statGrid(s),
      h('p', { class: 'small', style: 'margin:10px 0 0' }, bestItemText(s))));
    out.push(seasonStart(ctx, '다음 시즌 시작', '레벨과 배지는 그대로 남고, 시즌 XP와 달력만 새로 시작해요. 못 끝낸 미션은 이어져요.'));
  } else {
    out.push(seasonStart(ctx, '시즌 1 시작', `오늘부터 ${SEASON.length}일 동안 도전해요. ${SEASON.clearDays}일 이상 달성하면 시즌 완주 배지를 받아요.`));
  }

  const past = state.data.seasons.filter((s) => s !== d.season && s !== d.last && d.last).slice().reverse();
  if (past.length) {
    out.push(h('section', { class: 'panel' },
      h('h3', { style: 'margin-bottom:8px' }, '지난 시즌'),
      past.map((s) => {
        const sum = act.summarize(s);
        return h('div', { class: 'mission' },
          h('div', { class: 'mission-title' }, `시즌 ${s.id} · ${shortLabel(s.start)} ~ ${shortLabel(sum.end)}`),
          h('div', { class: 'mission-meta' },
            h('span', { class: 'tag' }, `달성 ${sum.qualifiedDays}일`),
            h('span', { class: 'tag xp' }, `${sum.xp} XP`),
            sum.cleared ? h('span', { class: 'tag' }, '🏁 완주') : null));
      })));
  }

  out.push(settings(ctx));
  return out;
}

function bestItemText(sum) {
  const best = ITEMS.map((i) => [i, sum.itemCounts[i.id]]).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? `가장 꾸준했던 항목: ${best[0].icon} ${best[0].label} (${best[1]}일)` : '이번 시즌 기록이 없어요.';
}

function settings({ state, act }) {
  const theme = state.theme;
  return h('section', { class: 'panel' },
    h('h3', { style: 'margin-bottom:10px' }, '⚙️ 설정'),
    h('label', { class: 'field' }, '화면 테마',
      h('select', { id: 'theme', onChange: (e) => act.setTheme(e.target.value) },
        h('option', { value: 'system', selected: theme === 'system' }, '기기 설정 따르기'),
        h('option', { value: 'dark', selected: theme === 'dark' }, '다크'),
        h('option', { value: 'light', selected: theme === 'light' }, '라이트'))),
    h('div', { style: 'margin-top:12px;display:grid;gap:8px' },
      state.mode === 'owner' ? [
        h('p', { class: 'small muted', style: 'margin:0' }, `로그인: ${state.user?.email ?? ''}`),
        h('button', { type: 'button', class: 'btn', onClick: act.logout }, '로그아웃'),
      ] : [
        h('button', { type: 'button', class: 'btn', onClick: act.resetDemo }, '예시 데이터로 되돌리기'),
        h('button', { type: 'button', class: 'btn', onClick: act.exitDemo }, '체험 모드 나가기'),
      ]));
}
