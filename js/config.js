// 챌린지 보드의 규칙 숫자를 모두 여기서 관리한다.
// 값을 바꾸면 XP, 레벨, 배지 계산과 화면이 함께 바뀐다.

// 하루는 한국 시간(UTC+9) 새벽 4시에 바뀐다.
export const TZ_OFFSET_HOURS = 9;
export const DAY_RESET_HOUR = 4;

// 매일 기록하는 항목. kind가 'minutes'면 분을 입력하고 target 이상이면 달성,
// 'check'면 체크하면 달성이다. memo가 true면 한 줄 메모 칸이 생긴다.
export const ITEMS = [
  { id: 'exercise', label: '운동', icon: '🏃', kind: 'minutes', target: 30, memo: false },
  { id: 'study', label: '공부', icon: '📚', kind: 'minutes', target: 60, memo: true },
  { id: 'supplement', label: '영양제', icon: '💊', kind: 'check', memo: false },
  { id: 'medicine', label: '약', icon: '🩺', kind: 'check', memo: false },
  { id: 'job', label: '취업활동', icon: '📝', kind: 'check', memo: true },
];

export const XP = {
  item: 10, // 항목 1개 달성
  perfectBonus: 20, // 5개 전부 달성한 날
  streakBonus: 50, // 연속 달성 streakEvery일마다
  streakEvery: 7,
  qualifyMin: 3, // 이 개수 이상 달성한 날을 "달성한 날"로 본다 (연속 기록, 시즌 완주)
  mission: { easy: 30, normal: 60, hard: 100 },
};

// 다음 레벨까지 필요한 XP = base + (현재 레벨 - 1) * step
export const LEVEL = { base: 100, step: 50 };

export const SEASON = { length: 30, clearDays: 25 };

export const MISSION_CATEGORIES = [
  { id: 'apply', label: '지원서', icon: '📝' },
  { id: 'interview', label: '면접', icon: '🎤' },
  { id: 'portfolio', label: '포트폴리오', icon: '💼' },
  { id: 'dev', label: '개발', icon: '💻' },
  { id: 'learn', label: '학습', icon: '📚' },
  { id: 'life', label: '생활', icon: '🏃' },
];

export const DIFFICULTIES = [
  { id: 'easy', label: '쉬움' },
  { id: 'normal', label: '보통' },
  { id: 'hard', label: '어려움' },
];

// 배지는 stats[stat] >= min 이면 받는다. stats는 badges.js의 computeStats가 만든다.
export const BADGES = [
  { id: 'lv3', group: '레벨', icon: '🥉', name: '브론즈', desc: '레벨 3 달성', stat: 'level', min: 3 },
  { id: 'lv5', group: '레벨', icon: '🥈', name: '실버', desc: '레벨 5 달성', stat: 'level', min: 5 },
  { id: 'lv10', group: '레벨', icon: '🥇', name: '골드', desc: '레벨 10 달성', stat: 'level', min: 10 },
  { id: 'lv15', group: '레벨', icon: '💠', name: '플래티넘', desc: '레벨 15 달성', stat: 'level', min: 15 },
  { id: 'lv20', group: '레벨', icon: '💎', name: '다이아', desc: '레벨 20 달성', stat: 'level', min: 20 },
  { id: 'streak3', group: '연속', icon: '🕯️', name: '불씨', desc: '3일 연속 달성', stat: 'maxStreak', min: 3 },
  { id: 'streak7', group: '연속', icon: '🔥', name: '불꽃', desc: '7일 연속 달성', stat: 'maxStreak', min: 7 },
  { id: 'streak30', group: '연속', icon: '🌋', name: '용광로', desc: '30일 연속 달성', stat: 'maxStreak', min: 30 },
  { id: 'perfect', group: '업적', icon: '⭐', name: '완벽한 하루', desc: '5개 항목을 모두 달성한 날', stat: 'perfectDays', min: 1 },
  { id: 'exercise600', group: '업적', icon: '🏃', name: '꾸준한 몸', desc: '운동 누적 600분', stat: 'exerciseMinutes', min: 600 },
  { id: 'study3000', group: '업적', icon: '📚', name: '백 시간의 시작', desc: '공부 누적 3,000분', stat: 'studyMinutes', min: 3000 },
  { id: 'health14', group: '업적', icon: '💊', name: '잊지 않는 사람', desc: '영양제·약 14일 연속', stat: 'healthStreak', min: 14 },
  { id: 'mission10', group: '업적', icon: '🎯', name: '해결사', desc: '추가 미션 10개 완료', stat: 'missionsDone', min: 10 },
  { id: 'firstApply', group: '업적', icon: '📮', name: '첫 지원', desc: '지원서 미션 첫 완료', stat: 'applyMissionsDone', min: 1 },
  { id: 'seasonClear', group: '업적', icon: '🏁', name: '시즌 완주', desc: '한 시즌 30일 중 25일 이상 달성', stat: 'seasonsCleared', min: 1 },
];
