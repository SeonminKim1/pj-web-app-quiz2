# CLAUDE.md

이 프로젝트에만 해당하는 내용만 둔다. 사용법·빌드 단계·데이터 레시피는 `README.md`가 기준이다.

## 프로젝트 개요

"퀴즈 놀이터": 넌센스 퀴즈 546문제를 스테이지로 풀고, 어느 문제든 `/q/<id>/` 링크로 단톡방에 낼 수 있는 웹앱. 사용자가 고른 방해꾼 동물이 풀이를 훼방 놓는다(시간 제한 없음). 무료, 광고(Google AdSense) 수익 예정.

- 스택: React + TypeScript(Vite) + react-router, CSS Modules. 서버·DB 없는 정적 사이트.
- 이전 저장소 `web-app-quiz`(비공개)에서 넌센스 주제만 옮겨 왔다. MBTI 등 나머지는 `TODOS.md`.
- 정식 주소: https://quiz-noriteo.netlify.app (`site.config.json`의 `SITE_ORIGIN`. 첫 링크를 보낸 뒤에는 바꾸지 않는다)

## 명령

```sh
npm run dev            # 데이터·글꼴 생성 후 Vite
npm run lint           # oxlint --deny-warnings
npm run format:check
npm run typecheck      # tsc -b
npm test               # vitest run
npm run build          # 데이터 → 글꼴 → 앱 → OG 페이지 → dist 검사
```

커밋 전에 lint, format:check, typecheck, test를 모두 통과시킨다.

## 고유 모듈

- `data/nonsense.json`: 문제 데이터의 기준. `scripts/quiz-data/`가 검사하고 `public/data/quiz/`(생성물, 커밋 안 함)를 만든다.
- `data/share/published-ids.json`: 공개한 id 등록부. 추가만 하고 손으로 고치지 않는다(`npm run register-ids`). 공개한 문제의 정답은 바꿀 수 없다.
- `scripts/og/`, `scripts/og-pages.ts`: 공유 문제마다 `dist/q/<id>/index.html`과 카드 PNG(satori + resvg, Jua TTF 동봉).
- `src/lib/quizTopics.ts`: 주제 설정(풀이 방식, 힌트 단계, 한 판 단위). 주제마다 화면 코드를 따로 만들지 않고 공유 부품을 골라 쓴다.
- 방해꾼: 규칙·대사 `src/lib/pest.ts`, 동물 `src/lib/pestAnimals.ts`, 움직임 계산(순수 함수) `src/lib/pestMotion.ts`, 상태 `src/hooks/usePest.ts`(reducer), 프레임 루프 `src/hooks/usePestMotion.ts`, 그리기 `src/components/PestLayer.tsx`.
- 에러 코드: `docs/errors.md`.

## 서비스 요구사항

- **정적 서비스**: 서버 없이 정적 파일만 배포한다. 진행 상황(푼 문제, 골드, 설정)은 이 기기 `localStorage`에만 저장한다.
- **골드**: 처음 30. 맞히면 +10(힌트를 연 문제는 +5). 힌트는 최대 3단계, 첫 단계 무료, 나머지 5골드. 넌센스 힌트 순서: 문장(무료) → 첫 글자(골드) → 문장(골드).
- **방해꾼**: 평소에는 풀이 화면 위쪽 놀이터에서 논다. 동물마다 15~50초 간격으로 문제 위에 앉아 가리고, 잡거나 끌어서 치운다. 힌트·정답·오답에 반응해 잠깐 달려가고, 가끔 입력칸 아래 빈 곳을 산책한다. 입력칸·버튼 위에 머물지 않는다. 간식은 무료이고 언제든 준다. 움직임 줄이기 설정이면 움직이지 않는다.
- **모바일 우선**: 360px 폭 세로 화면 기준, 터치 영역 44px 이상, 데스크톱에서도 깨지지 않게.
- **개인정보**: 원본 데이터의 Slack ID·실명·사내 전용 문제는 저장소와 앱에 넣지 않는다. `data/raw/`, `data/excluded/`는 커밋하지 않는다. 저장소가 공개이므로 커밋 작성자 이메일은 GitHub noreply 주소를 쓴다.
- **광고 정책 준수 콘텐츠**: 혐오·차별·선정성 문제는 넣지 않는다. 특정 집단을 소재로 한 말장난도 제외한다.
- **저작권**: 출처·이용 허락이 확인되지 않은 이미지·에셋·글꼴은 넣지 않는다(글꼴은 OFL).

## 배포와 트래커

- 저장소: https://github.com/SeonminKim1/pj-web-app-quiz2 (공개)
- 배포: `main`에 push → Netlify가 `npm run build`로 자동 배포(`netlify.toml`). 끌어다 놓기·CLI 배포는 정식 사이트에 쓰지 않는다.
- 이슈 트래커: GitHub Project `SeonminKim1` #4 (`pj-web-app-quiz`). 끝낸 작업은 이슈로 남기고 Status를 Done으로.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. gstack is set to `proactive: all`, so any matching gstack skill may run without being typed.

- Product ideas, brainstorming, "is this worth building" → /office-hours
- Plan or feature review before building → /autoplan (or /plan-ceo-review, /plan-design-review, /plan-devex-review)
- Visual polish, spacing, "looks off" → /design-review
- Testing site behavior in a browser, finding bugs → /qa (report only: /qa-only)
- Running checks while coding, before a commit → /verify
- Reviewing a diff or branch → /review
- Security concerns → /cso
- Performance → /benchmark
- Ship, PR, release → /ship
- After a production deploy → /canary
- Docs out of date after shipping → /document-release

## Health Stack

- typecheck: npm run typecheck
- lint: npm run lint
- test: npm test
- deadcode: npx --yes knip
