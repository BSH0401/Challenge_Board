import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  seasonEnd, seasonOf, currentSeason, lastSeason, startSeason, targetsFor, seasonSummary,
} from '../js/season.js';
import { buildLedger } from '../js/xp.js';

const s1 = { id: 1, start: '2026-11-13', targets: { exercise: 30, study: 60 } };

test('시즌은 시작일 포함 30일이다', () => {
  assert.equal(seasonEnd(s1), '2026-12-12');
});

test('날짜가 속한 시즌을 찾는다', () => {
  assert.equal(seasonOf([s1], '2026-11-13'), s1);
  assert.equal(seasonOf([s1], '2026-12-12'), s1);
  assert.equal(seasonOf([s1], '2026-12-13'), null);
  assert.equal(seasonOf([s1], '2026-11-12'), null);
});

test('시즌이 끝나면 현재 시즌은 없고 마지막 시즌은 남는다', () => {
  assert.equal(currentSeason([s1], '2026-12-13'), null);
  assert.equal(lastSeason([s1]), s1);
  assert.equal(lastSeason([]), null);
});

test('첫 시즌은 오늘 시작하고 번호는 1이다', () => {
  const seasons = startSeason([], '2026-11-13', { exercise: 30, study: 60 });
  assert.deepEqual(seasons, [s1]);
});

test('다음 시즌은 번호가 이어진다', () => {
  const seasons = startSeason([s1], '2026-12-14', { exercise: 40, study: 90 });
  assert.equal(seasons.length, 2);
  assert.deepEqual(seasons[1], { id: 2, start: '2026-12-14', targets: { exercise: 40, study: 90 } });
});

test('진행 중인 시즌이 있으면 새 시즌을 시작할 수 없다', () => {
  assert.throws(() => startSeason([s1], '2026-11-20', {}));
});

test('그날이 속한 시즌의 목표 시간을 돌려준다', () => {
  const s2 = { id: 2, start: '2026-12-14', targets: { exercise: 40, study: 90 } };
  const t = targetsFor([s1, s2]);
  assert.deepEqual(t('2026-11-20'), { exercise: 30, study: 60 });
  assert.deepEqual(t('2026-12-20'), { exercise: 40, study: 90 });
  assert.deepEqual(t('2026-12-13'), {}, '시즌 사이의 날은 기본 목표');
});

test('시즌 요약: 진행 일차, 달성한 날, 시즌 XP', () => {
  const three = { exercise: 30, study: 60, supplement: true };
  const full = { exercise: 30, study: 60, supplement: true, medicine: true, job: true };
  const days = {
    '2026-11-12': full, // 시즌 전날: 시즌 XP에 안 들어감
    '2026-11-13': full,
    '2026-11-14': three,
    '2026-11-15': { supplement: true },
  };
  const missions = [
    { id: 'a', category: 'apply', difficulty: 'normal', doneDay: '2026-11-14' },
    { id: 'b', category: 'dev', difficulty: 'easy', doneDay: '2026-11-10' },
  ];
  const ledger = buildLedger(days, missions);
  const s = seasonSummary(s1, { days, missions, ledger, today: '2026-11-15' });
  assert.equal(s.dayIndex, 3);
  assert.equal(s.daysLeft, 27);
  assert.equal(s.qualifiedDays, 2);
  assert.equal(s.perfectDays, 1);
  assert.equal(s.missionsDone, 1);
  assert.equal(s.xp, 70 + 30 + 10 + 60);
  assert.equal(s.itemCounts.exercise, 2);
  assert.equal(s.itemCounts.medicine, 1);
  assert.equal(s.ended, false);
  assert.equal(s.cleared, false);
});

test('시즌 요약: 끝난 시즌은 30일차로 고정되고 ended가 true', () => {
  const s = seasonSummary(s1, { days: {}, missions: [], ledger: [], today: '2027-01-05' });
  assert.equal(s.dayIndex, 30);
  assert.equal(s.daysLeft, 0);
  assert.equal(s.ended, true);
});
