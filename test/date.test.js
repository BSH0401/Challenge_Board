import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, addDays, diffDays, canEdit } from '../js/date.js';

test('한국 시간 새벽 4시 전까지는 전날로 친다', () => {
  // 2026-11-14 03:59 KST = 2026-11-13 18:59 UTC
  assert.equal(dayKey(new Date('2026-11-13T18:59:00Z')), '2026-11-13');
});

test('한국 시간 새벽 4시부터는 그날이다', () => {
  // 2026-11-14 04:00 KST = 2026-11-13 19:00 UTC
  assert.equal(dayKey(new Date('2026-11-13T19:00:00Z')), '2026-11-14');
});

test('한국 시간 낮은 그날이다', () => {
  // 2026-11-13 15:00 KST
  assert.equal(dayKey(new Date('2026-11-13T06:00:00Z')), '2026-11-13');
});

test('날짜를 더하고 빼면 달과 해가 넘어간다', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('두 날짜의 차이를 일 단위로 구한다', () => {
  assert.equal(diffDays('2026-11-13', '2026-11-13'), 0);
  assert.equal(diffDays('2026-11-13', '2026-11-14'), 1);
  assert.equal(diffDays('2026-11-13', '2026-12-12'), 29);
  assert.equal(diffDays('2026-11-14', '2026-11-13'), -1);
});

test('오늘과 어제만 수정할 수 있다', () => {
  const today = '2026-11-13';
  assert.equal(canEdit('2026-11-13', today), true);
  assert.equal(canEdit('2026-11-12', today), true);
  assert.equal(canEdit('2026-11-11', today), false);
  assert.equal(canEdit('2026-11-14', today), false, '미래는 수정할 수 없다');
});
