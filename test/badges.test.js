import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BADGES } from '../js/config.js';
import { computeStats, earnedBadges, newBadges, badgeProgress } from '../js/badges.js';

const three = { exercise: 30, study: 60, supplement: true };
const full = { exercise: 30, study: 60, supplement: true, medicine: true, job: true };

function daysFrom(start, records) {
  const out = {};
  const d = new Date(start + 'T00:00:00Z');
  for (const r of records) {
    if (r) out[d.toISOString().slice(0, 10)] = r;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

test('배지는 레벨 5개, 연속 3개, 업적 7개로 모두 15개다', () => {
  assert.equal(BADGES.length, 15);
  assert.equal(new Set(BADGES.map((b) => b.id)).size, 15, 'id가 겹치면 안 된다');
});

test('통계: 운동·공부 누적 분과 퍼펙트 날 수', () => {
  const days = daysFrom('2026-11-01', [full, three, { exercise: 15 }]);
  const s = computeStats({ days, missions: [], seasons: [], level: 1 });
  assert.equal(s.exerciseMinutes, 75);
  assert.equal(s.studyMinutes, 120);
  assert.equal(s.perfectDays, 1);
  assert.equal(s.maxStreak, 2);
});

test('통계: 영양제와 약을 둘 다 체크한 날의 연속', () => {
  const both = { supplement: true, medicine: true };
  const days = daysFrom('2026-11-01', [both, both, { supplement: true }, both]);
  assert.equal(computeStats({ days, missions: [], seasons: [], level: 1 }).healthStreak, 2);
});

test('통계: 완료한 미션과 지원서 미션', () => {
  const missions = [
    { id: 'a', category: 'apply', difficulty: 'normal', doneDay: '2026-11-01' },
    { id: 'b', category: 'dev', difficulty: 'easy', doneDay: '2026-11-02' },
    { id: 'c', category: 'apply', difficulty: 'hard', doneDay: null },
  ];
  const s = computeStats({ days: {}, missions, seasons: [], level: 1 });
  assert.equal(s.missionsDone, 2);
  assert.equal(s.applyMissionsDone, 1);
});

test('통계: 30일 중 25일 이상 달성한 시즌을 완주로 센다', () => {
  const seasons = [{ id: 1, start: '2026-11-01' }];
  const records = [...Array(25).fill(three), ...Array(5).fill(null)];
  const days = daysFrom('2026-11-01', records);
  assert.equal(computeStats({ days, missions: [], seasons, level: 1 }).seasonsCleared, 1);

  const fewer = daysFrom('2026-11-01', [...Array(24).fill(three)]);
  assert.equal(computeStats({ days: fewer, missions: [], seasons, level: 1 }).seasonsCleared, 0);
});

test('조건을 넘은 배지를 받는다', () => {
  const stats = {
    level: 5, maxStreak: 7, perfectDays: 1, exerciseMinutes: 0, studyMinutes: 0,
    healthStreak: 0, missionsDone: 0, applyMissionsDone: 1, seasonsCleared: 0,
  };
  assert.deepEqual(earnedBadges(stats), ['lv3', 'lv5', 'streak3', 'streak7', 'perfect', 'firstApply']);
});

test('새로 받은 배지만 골라낸다', () => {
  assert.deepEqual(newBadges(['lv3'], ['lv3', 'lv5', 'perfect']), ['lv5', 'perfect']);
  assert.deepEqual(newBadges(['lv3'], ['lv3']), []);
});

test('배지 진행도는 0~1 사이로 잘린다', () => {
  const b = BADGES.find((x) => x.id === 'exercise600');
  assert.deepEqual(badgeProgress(b, { exerciseMinutes: 150 }), { value: 150, min: 600, ratio: 0.25 });
  assert.equal(badgeProgress(b, { exerciseMinutes: 900 }).ratio, 1);
  assert.equal(badgeProgress(b, {}).ratio, 0);
});
