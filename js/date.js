import { TZ_OFFSET_HOURS, DAY_RESET_HOUR } from './config.js';

const HOUR_MS = 3600000;
const DAY_MS = 86400000;

// 'YYYY-MM-DD' 형식의 하루 키. 한국 시간 새벽 4시 전까지는 전날로 친다.
export function dayKey(date = new Date()) {
  const shifted = new Date(date.getTime() + (TZ_OFFSET_HOURS - DAY_RESET_HOUR) * HOUR_MS);
  return shifted.toISOString().slice(0, 10);
}

export function addDays(key, n) {
  const d = new Date(key + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// b - a (일)
export function diffDays(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY_MS);
}

// 오늘과 어제만 수정할 수 있다.
export function canEdit(target, today) {
  const d = diffDays(target, today);
  return d === 0 || d === 1;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function weekday(key) {
  return WEEKDAYS[new Date(key + 'T00:00:00Z').getUTCDay()];
}

// '11/13 (금)'
export function shortLabel(key) {
  const [, m, d] = key.split('-');
  return `${Number(m)}/${Number(d)} (${weekday(key)})`;
}
