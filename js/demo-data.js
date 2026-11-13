import { addDays } from './date.js';
import { ITEMS } from './config.js';

// 체험 모드용 예시 데이터. 오늘을 시즌 1의 12일차로 두고 지난 11일을 채운다.
const RECORDS = [
  { exercise: 40, study: 90, supplement: true, medicine: true, job: true, studyMemo: 'Unity 입력 시스템 복습', jobMemo: '게임잡 공고 확인' },
  { exercise: 30, study: 60, supplement: true, medicine: true, studyMemo: 'C# 델리게이트와 이벤트 정리' },
  { exercise: 0, study: 120, supplement: true, medicine: true, job: true, studyMemo: 'TDD 개념 정리', jobMemo: '자기소개서 수정' },
  { exercise: 35, study: 45, supplement: true, medicine: true, job: true, studyMemo: '알고리즘 1문제', jobMemo: '포트폴리오 README 정리' },
  { exercise: 50, study: 80, supplement: true, medicine: true, job: true, studyMemo: '오브젝트 풀링 구현', jobMemo: '엽스튜디오 지원서 제출' },
  { study: 20, supplement: true, studyMemo: '컨디션 난조, 짧게 복습' },
  { exercise: 30, study: 60, supplement: true, medicine: true, job: true, studyMemo: 'Firebase 인증 공부', jobMemo: '면접 예상 질문 정리' },
  { exercise: 45, study: 70, supplement: true, medicine: true, studyMemo: '셰이더 그래프 기초' },
  { exercise: 30, study: 90, supplement: true, medicine: true, job: true, studyMemo: 'Core Overclock 테스트 작성', jobMemo: '공고 3개 확인' },
  { exercise: 60, study: 60, supplement: true, medicine: true, job: true, studyMemo: '디자인 패턴: 상태 패턴', jobMemo: '인성면접 답변 연습' },
  { exercise: 30, study: 100, supplement: true, medicine: true, job: true, studyMemo: 'UI 툴킷 레이아웃', jobMemo: '크로노스튜디오 지원서 제출' },
  { study: 30, supplement: true, medicine: true, studyMemo: '오늘 공부 중' },
];

export function makeDemoData(today) {
  const start = addDays(today, -(RECORDS.length - 1));
  const days = {};
  RECORDS.forEach((r, i) => { days[addDays(start, i)] = { ...r }; });
  const targets = Object.fromEntries(ITEMS.filter((i) => i.kind === 'minutes').map((i) => [i.id, i.target]));
  const mission = (id, title, category, difficulty, createdOffset, doneOffset, dueOffset) => ({
    id: `demo-${id}`,
    title,
    category,
    difficulty,
    createdDay: addDays(start, createdOffset),
    doneDay: doneOffset == null ? null : addDays(start, doneOffset),
    due: dueOffset == null ? null : addDays(today, dueOffset),
  });
  return {
    seasons: [{ id: 1, start, targets }],
    days,
    missions: [
      mission(1, '포트폴리오 README 다시 쓰기', 'portfolio', 'normal', 0, 3),
      mission(2, '엽스튜디오 지원서 내기', 'apply', 'hard', 1, 4),
      mission(3, 'Core Overclock에 테스트 3개 쓰기', 'dev', 'normal', 5, 8),
      mission(4, '인성면접 답변 10개 연습', 'interview', 'normal', 7, null, 3),
      mission(5, 'TDD 정리 노트 다시 읽기', 'learn', 'easy', 9, null, null),
      mission(6, '운동화 사기', 'life', 'easy', 10, null, 6),
    ],
  };
}
