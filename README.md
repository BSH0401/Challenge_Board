# 🎮 챌린지 보드

취업 준비를 게임처럼 관리하는 웹 앱이에요. 매일 **운동 · 공부 · 영양제 · 약 · 취업활동**을 기록하고, XP와 배지를 모아 레벨을 올려요.

- **써 보기 (체험 모드, 로그인 필요 없음):** https://bsh0401.github.io/Challenge_Board/?demo
- **앱 주소:** https://bsh0401.github.io/Challenge_Board/

## 주요 기능

| 기능 | 내용 |
|---|---|
| 오늘의 퀘스트 | 운동·공부는 분 단위로 입력, 영양제·약·취업활동은 체크. 공부와 취업활동은 한 줄 메모 |
| XP · 레벨 | 항목 달성 10 XP, 퍼펙트 데이 +20, 7일 연속 +50, 추가 미션 30/60/100 XP |
| 배지 15종 | 레벨(브론즈~다이아), 연속(3·7·30일), 업적(퍼펙트, 운동 600분, 공부 3,000분, 첫 지원 등) |
| 30일 시즌 | 시즌 XP·달력은 시즌마다 새로 시작하고, 레벨·배지는 영구로 남음 |
| 추가 미션 | 지원서·면접·포트폴리오·개발·학습·생활 분류, 난이도, 마감일 |
| 기록 규칙 | 하루는 한국 시간 **새벽 4시**에 바뀌고, **오늘과 어제**만 고칠 수 있음 |
| 체험 모드 | 로그인 없이 예시 데이터로 모든 기능 사용. 브라우저에만 저장 |

## 기술

- **순수 JavaScript (ES Modules)**: 빌드 도구 없이 GitHub Pages로 배포
- **Firebase Authentication (Google 로그인) + Cloud Firestore**: 보안 규칙으로 주인 계정만 읽고 쓰기
- **TDD (`node --test`)**: XP·레벨·연속 기록·배지·시즌 계산을 테스트 먼저 작성 → 구현 (커밋 기록에 Red → Green 순서가 남아 있어요)

## 구조

```
index.html
css/style.css
js/
  config.js          규칙 숫자 모음 (XP, 레벨, 배지, 목표 시간, 미션 분류)
  date.js            KST 새벽 4시 기준 하루, 수정 가능 기간
  xp.js              하루 평가, XP 내역, 레벨 곡선, 연속 기록
  badges.js          배지 통계와 획득 판정
  season.js          30일 시즌, 시즌 요약
  store-demo.js      체험 모드 저장소 (localStorage)
  firebase.js        로그인, Firestore 저장소
  app.js             상태 관리, 연출, 화면 전환
  ui/views.js        화면 그리기
test/                계산 로직 테스트
firestore.rules      Firestore 보안 규칙
```

## 테스트

```bash
node --test
```

Node.js 20 이상이면 설치할 것 없이 바로 돌아가요.

## 규칙 바꾸기

XP, 목표 시간, 배지 조건, 미션 분류는 모두 [`js/config.js`](js/config.js) 한 곳에서 바꿀 수 있어요.
