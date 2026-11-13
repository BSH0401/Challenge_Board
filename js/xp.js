import { ITEMS, XP, LEVEL } from './config.js';
import { addDays, diffDays } from './date.js';

const noTargets = () => ({});

export function isItemDone(item, value, targets = {}) {
  if (item.kind === 'minutes') {
    const target = targets[item.id] ?? item.target;
    return Number(value) >= target;
  }
  return value === true;
}

// 하루 기록을 평가한다. targets는 시즌에서 바꾼 목표 시간 (예: { exercise: 40 }).
export function evaluateDay(record = {}, targets = {}) {
  const rec = record || {};
  const done = ITEMS.filter((i) => isItemDone(i, rec[i.id], targets)).map((i) => i.id);
  const perfect = done.length === ITEMS.length;
  return {
    done,
    count: done.length,
    perfect,
    qualified: done.length >= XP.qualifyMin,
    xp: done.length * XP.item + (perfect ? XP.perfectBonus : 0),
  };
}

// XP를 받은 내역을 날짜순으로 만든다: 하루 XP, 연속 보너스, 미션 XP.
export function buildLedger(days, missions = [], targetsFor = noTargets) {
  const ledger = [];
  let run = 0;
  let prev = null;
  for (const day of Object.keys(days).sort()) {
    const r = evaluateDay(days[day], targetsFor(day));
    if (r.xp > 0) ledger.push({ day, amount: r.xp, reason: 'day' });
    if (r.qualified) {
      run = prev && diffDays(prev, day) === 1 && run > 0 ? run + 1 : 1;
      if (run % XP.streakEvery === 0) ledger.push({ day, amount: XP.streakBonus, reason: 'streak' });
    } else {
      run = 0;
    }
    prev = day;
  }
  for (const m of missions) {
    if (m.doneDay) ledger.push({ day: m.doneDay, amount: XP.mission[m.difficulty] ?? 0, reason: 'mission', id: m.id });
  }
  return ledger.sort((a, b) => a.day.localeCompare(b.day));
}

export function totalXp(ledger, from = '0000-00-00', to = '9999-99-99') {
  return ledger.reduce((sum, e) => (e.day >= from && e.day <= to ? sum + e.amount : sum), 0);
}

// 누적 XP → 레벨. into는 현재 레벨에서 모은 XP, need는 다음 레벨까지 필요한 XP.
export function levelInfo(total) {
  let level = 1;
  let rest = total;
  let need = LEVEL.base;
  while (rest >= need) {
    rest -= need;
    level += 1;
    need = LEVEL.base + (level - 1) * LEVEL.step;
  }
  return { level, into: rest, need, total };
}

// predicate(record, day)가 참인 날이 연속으로 이어진 가장 긴 길이
export function maxRun(days, predicate) {
  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of Object.keys(days).sort()) {
    if (predicate(days[day], day)) {
      run = prev && diffDays(prev, day) === 1 && run > 0 ? run + 1 : 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    prev = day;
  }
  return best;
}

// 지금 이어지고 있는 연속 달성 일수. 오늘 아직 못 했으면 어제부터 센다.
export function currentStreak(days, today, targetsFor = noTargets) {
  const ok = (day) => evaluateDay(days[day], targetsFor(day)).qualified;
  let day = ok(today) ? today : addDays(today, -1);
  let count = 0;
  while (ok(day)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}
