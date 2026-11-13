import { ITEMS, SEASON } from './config.js';
import { addDays, diffDays } from './date.js';
import { evaluateDay, totalXp } from './xp.js';

export function seasonEnd(season) {
  return addDays(season.start, SEASON.length - 1);
}

export function seasonOf(seasons, day) {
  return seasons.find((s) => day >= s.start && day <= seasonEnd(s)) ?? null;
}

export function currentSeason(seasons, today) {
  return seasonOf(seasons, today);
}

export function lastSeason(seasons) {
  return seasons.length ? seasons[seasons.length - 1] : null;
}

// 새 시즌을 오늘 시작한다. 진행 중인 시즌이 있으면 시작할 수 없다.
export function startSeason(seasons, today, targets) {
  if (currentSeason(seasons, today)) throw new Error('진행 중인 시즌이 있어요.');
  const id = seasons.length ? Math.max(...seasons.map((s) => s.id)) + 1 : 1;
  return [...seasons, { id, start: today, targets: { ...targets } }];
}

// 날짜 → 그날이 속한 시즌의 목표 시간. 시즌 밖이면 기본 목표({}).
export function targetsFor(seasons) {
  return (day) => seasonOf(seasons, day)?.targets ?? {};
}

export function seasonSummary(season, { days, missions, ledger, today }) {
  const end = seasonEnd(season);
  const inSeason = (day) => day >= season.start && day <= end;
  const itemCounts = Object.fromEntries(ITEMS.map((i) => [i.id, 0]));
  let qualifiedDays = 0;
  let perfectDays = 0;
  for (const [day, record] of Object.entries(days)) {
    if (!inSeason(day)) continue;
    const r = evaluateDay(record, season.targets);
    if (r.qualified) qualifiedDays += 1;
    if (r.perfect) perfectDays += 1;
    for (const id of r.done) itemCounts[id] += 1;
  }
  const elapsed = diffDays(season.start, today) + 1;
  const dayIndex = Math.min(Math.max(elapsed, 1), SEASON.length);
  return {
    season,
    end,
    dayIndex,
    daysLeft: SEASON.length - dayIndex,
    qualifiedDays,
    perfectDays,
    missionsDone: missions.filter((m) => m.doneDay && inSeason(m.doneDay)).length,
    xp: totalXp(ledger, season.start, end),
    itemCounts,
    ended: today > end,
    cleared: qualifiedDays >= SEASON.clearDays,
  };
}
