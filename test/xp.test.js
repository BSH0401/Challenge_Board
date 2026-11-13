import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS } from '../js/config.js';
import {
  isItemDone, evaluateDay, buildLedger, totalXp, levelInfo, maxRun, currentStreak,
} from '../js/xp.js';

const item = (id) => ITEMS.find((i) => i.id === id);
const full = { exercise: 30, study: 60, supplement: true, medicine: true, job: true };
const three = { exercise: 30, study: 60, supplement: true };
const two = { supplement: true, medicine: true };

test('운동은 30분부터 달성이다', () => {
  assert.equal(isItemDone(item('exercise'), 30), true);
  assert.equal(isItemDone(item('exercise'), 29), false);
  assert.equal(isItemDone(item('exercise'), undefined), false);
});

test('시즌에서 바꾼 목표 시간을 따른다', () => {
  assert.equal(isItemDone(item('exercise'), 30, { exercise: 40 }), false);
  assert.equal(isItemDone(item('exercise'), 40, { exercise: 40 }), true);
});

test('체크 항목은 true일 때만 달성이다', () => {
  assert.equal(isItemDone(item('supplement'), true), true);
  assert.equal(isItemDone(item('supplement'), false), false);
  assert.equal(isItemDone(item('supplement'), undefined), false);
});

test('항목 하나에 10 XP', () => {
  const r = evaluateDay({ exercise: 45 });
  assert.equal(r.count, 1);
  assert.equal(r.xp, 10);
  assert.equal(r.perfect, false);
});

test('5개 전부 달성하면 퍼펙트 보너스 20 XP가 붙는다', () => {
  const r = evaluateDay(full);
  assert.equal(r.count, 5);
  assert.equal(r.perfect, true);
  assert.equal(r.xp, 70);
});

test('3개 이상 달성한 날만 "달성한 날"이다', () => {
  assert.equal(evaluateDay(three).qualified, true);
  assert.equal(evaluateDay(two).qualified, false);
});

test('빈 기록은 0 XP', () => {
  assert.equal(evaluateDay({}).xp, 0);
  assert.equal(evaluateDay(undefined).xp, 0);
});

function daysFrom(start, records) {
  const out = {};
  const d = new Date(start + 'T00:00:00Z');
  for (const r of records) {
    if (r) out[d.toISOString().slice(0, 10)] = r;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

test('7일 연속 달성하면 7일째에 연속 보너스 50 XP', () => {
  const days = daysFrom('2026-11-01', Array(7).fill(three));
  const ledger = buildLedger(days, []);
  const bonus = ledger.filter((e) => e.reason === 'streak');
  assert.equal(bonus.length, 1);
  assert.equal(bonus[0].day, '2026-11-07');
  assert.equal(bonus[0].amount, 50);
  assert.equal(totalXp(ledger), 7 * 30 + 50);
});

test('14일 연속이면 연속 보너스가 두 번', () => {
  const days = daysFrom('2026-11-01', Array(14).fill(three));
  const bonus = buildLedger(days, []).filter((e) => e.reason === 'streak');
  assert.deepEqual(bonus.map((e) => e.day), ['2026-11-07', '2026-11-14']);
});

test('하루라도 빠지면 연속이 끊긴다', () => {
  // 6일 달성 → 하루 기록 없음 → 6일 달성: 보너스 없음
  const days = daysFrom('2026-11-01', [...Array(6).fill(three), null, ...Array(6).fill(three)]);
  assert.equal(buildLedger(days, []).filter((e) => e.reason === 'streak').length, 0);
});

test('2개만 달성한 날도 연속을 끊는다', () => {
  const days = daysFrom('2026-11-01', [...Array(6).fill(three), two, three]);
  assert.equal(buildLedger(days, []).filter((e) => e.reason === 'streak').length, 0);
});

test('미션은 완료한 날에 난이도별 XP를 준다', () => {
  const missions = [
    { id: 'a', difficulty: 'easy', doneDay: '2026-11-02' },
    { id: 'b', difficulty: 'normal', doneDay: '2026-11-03' },
    { id: 'c', difficulty: 'hard', doneDay: '2026-11-03' },
    { id: 'd', difficulty: 'hard', doneDay: null },
  ];
  const ledger = buildLedger({}, missions);
  assert.equal(totalXp(ledger), 30 + 60 + 100);
  assert.deepEqual(ledger.map((e) => e.day), ['2026-11-02', '2026-11-03', '2026-11-03']);
});

test('기간을 주면 그 기간의 XP만 더한다', () => {
  const days = daysFrom('2026-11-01', [full, full, full]);
  const ledger = buildLedger(days, []);
  assert.equal(totalXp(ledger, '2026-11-02', '2026-11-03'), 140);
});

test('레벨 곡선: Lv1→2는 100, Lv2→3은 150', () => {
  assert.deepEqual(levelInfo(0), { level: 1, into: 0, need: 100, total: 0 });
  assert.deepEqual(levelInfo(99), { level: 1, into: 99, need: 100, total: 99 });
  assert.deepEqual(levelInfo(100), { level: 2, into: 0, need: 150, total: 100 });
  assert.deepEqual(levelInfo(250), { level: 3, into: 0, need: 200, total: 250 });
  assert.deepEqual(levelInfo(449), { level: 3, into: 199, need: 200, total: 449 });
});

test('가장 긴 연속 기록을 찾는다', () => {
  const days = daysFrom('2026-11-01', [three, three, null, three, three, three, two, three]);
  assert.equal(maxRun(days, (r) => evaluateDay(r).qualified), 3);
});

test('현재 연속: 오늘 달성했으면 오늘부터 센다', () => {
  const days = daysFrom('2026-11-01', [three, three, three]);
  assert.equal(currentStreak(days, '2026-11-03'), 3);
});

test('현재 연속: 오늘 아직이면 어제까지 센다', () => {
  const days = daysFrom('2026-11-01', [three, three, two]);
  assert.equal(currentStreak(days, '2026-11-03'), 2);
});

test('현재 연속: 어제도 못 했으면 0', () => {
  const days = daysFrom('2026-11-01', [three, two, two]);
  assert.equal(currentStreak(days, '2026-11-03'), 0);
});
