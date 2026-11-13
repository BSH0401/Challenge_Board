import { BADGES, SEASON } from './config.js';
import { evaluateDay, maxRun } from './xp.js';
import { seasonEnd } from './season.js';

const noTargets = () => ({});

// 배지 조건에 쓰는 통계. 모든 기록(시즌과 상관없이)을 기준으로 계산한다.
export function computeStats({ days, missions, seasons, level, targetsFor = noTargets }) {
  const evals = Object.fromEntries(
    Object.entries(days).map(([day, rec]) => [day, evaluateDay(rec, targetsFor(day))]),
  );
  const sum = (field) => Object.values(days).reduce((s, r) => s + (Number(r?.[field]) || 0), 0);
  const done = missions.filter((m) => m.doneDay);
  const seasonsCleared = seasons.filter((s) => {
    const end = seasonEnd(s);
    const count = Object.entries(evals).filter(([day, e]) => day >= s.start && day <= end && e.qualified).length;
    return count >= SEASON.clearDays;
  }).length;

  return {
    level,
    maxStreak: maxRun(days, (_, day) => evals[day].qualified),
    perfectDays: Object.values(evals).filter((e) => e.perfect).length,
    exerciseMinutes: sum('exercise'),
    studyMinutes: sum('study'),
    healthStreak: maxRun(days, (r) => r?.supplement === true && r?.medicine === true),
    missionsDone: done.length,
    applyMissionsDone: done.filter((m) => m.category === 'apply').length,
    seasonsCleared,
  };
}

export function earnedBadges(stats) {
  return BADGES.filter((b) => (stats[b.stat] ?? 0) >= b.min).map((b) => b.id);
}

export function newBadges(before, after) {
  return after.filter((id) => !before.includes(id));
}

export function badgeProgress(badge, stats) {
  const value = stats[badge.stat] ?? 0;
  return { value, min: badge.min, ratio: Math.min(1, value / badge.min) };
}
