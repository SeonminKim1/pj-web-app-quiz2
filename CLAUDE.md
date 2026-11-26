# CLAUDE.md

이 프로젝트에만 해당하는 내용만 둔다. 사용법·빌드 단계·데이터 레시피는 `README.md`가 기준이다.

## 프로젝트 개요

"게임 놀이터": 넌센스 퀴즈 546문제와 MBTI 퀴즈 112문제를 스테이지로 풀고, 어느 문제든 링크(넌센스 `/q/<id>/`, MBTI `/m/<id>/`)로 단톡방에 낼 수 있는 웹앱. 사용자가 고른 방해꾼 동물이 풀이를 훼방 놓는다(시간 제한 없음). 무료, 광고(Google AdSense) 수익 예정.

- 스택: React + TypeScript(Vite) + react-router, CSS Modules. 서버·DB 없는 정적 사이트.
- 이전 저장소 `web-app-quiz`(비공개)에서 넌센스 주제와 MBTI 데이터를 옮겨 왔다. 필요한 정보는 거기서 가져와 쓰되 이 저장소만으로 돌아가게 옮겨 둔다(아래 Skill routing "Old repo"). 나머지는 `TODOS.md`.
- 정식 주소: https://quiz-noriteo.netlify.app (`site.config.json`의 `SITE_ORIGIN`. 첫 링크를 보낸 뒤에는 바꾸지 않는다)

## 명령

```sh
npm run dev            # 데이터·글꼴 생성 후 Vite
npm run lint           # oxlint --deny-warnings
npm run format:check
npm run typecheck      # tsc -b
npm test               # vitest run
npm run build          # 데이터 → 글꼴 → 앱 → OG 페이지 → 서비스 워커 → dist 검사
```

커밋 전에 lint, format:check, typecheck, test를 모두 통과시킨다.

## 고유 모듈

- `data/nonsense.json`: 문제 데이터의 기준. `scripts/quiz-data/`가 검사하고 `public/data/quiz/`(생성물, 커밋 안 함)를 만든다.
- `data/share/published-ids.json`(넌센스), `data/share/mbti-published-ids.json`(MBTI): 주제별 공개 id 등록부(`scripts/share/topics.ts`). 추가만 하고 손으로 고치지 않는다(`npm run register-ids`). 공개한 문제의 정답은 바꿀 수 없다.
- `scripts/og/`, `scripts/og-pages.ts`: 공유 문제마다 `dist/<q|m>/<id>/index.html`과 카드 PNG(satori + resvg, Jua TTF 동봉). 넌센스는 문제 문장 카드, MBTI는 공통 카드 한 장(문제는 미리보기 설명 줄). 주제 설정 `share.card`.
- `src/lib/quizTopics.ts`: 주제 설정(풀이 방식, 힌트 단계, 한 판 단위, 칭호 표, 보상 표, 공유 주소). 주제마다 화면 코드를 따로 만들지 않고 공유 부품을 골라 쓴다. 화면은 주제 id가 아니라 설정으로 분기한다.
- MBTI(`data/mbti.json`): 풀이 방식 `mbtiAxes`(`src/lib/mbti.ts`, `MbtiAxesPicker`), 카테고리 하나(16유형 한 번씩) = 스테이지 하나(`/topics/mbti/categories/<번호>`), ⓘ 설명 `MbtiGuide`.
- 스티커첩 보상(설계 `docs/designs/rewards-playground.md`): 판(스테이지·카테고리)을 다 풀면 받는 보상. 보상 목록 `src/lib/rewards.ts`(보상 id는 진행 `earnedRewards`에 남으므로 이름을 바꾸거나 지우지 않는다), 칸 계산 `src/lib/album.ts`, 받기 기록 `src/hooks/useClaimRewards.ts`(판 목록 hook `useTopicStages`·`useTopicCategories`·`useTopicRounds`가 불러, 목록·풀이·첫 화면·문제 하나 화면에서 기록. 방해꾼 시트와 놀이터는 `ClaimTopics`로 모든 주제를 읽어 기록), 그림 `src/components/RewardArt.tsx`. 넌센스 스테이지 목록과 MBTI 카테고리 목록은 같은 `StickerAlbum`을 쓰고, 새 보상은 결과 카드 `StageResult`, 결과로 못 본 보상은 `CollectedSheet`가 보여 준다.
  - 모자: 진행 `equipped`(동물별 모자 id), 규칙 `hatOf`·`equipHat`(`src/lib/progress.ts`, 받은 모자만 씌운다), 고르기 `HatRow`(방해꾼 시트 `PetPicker` 안, 잠긴 모자의 판 이름은 `quizTopics.ts`의 `rewardSourceLabel`), 그리기 `PetPortrait`의 `hat`(`RewardArt`의 `HatShape`). 내 동물 그림에만 넘기고 앱 아이콘·공유 카드에는 넘기지 않는다. 결과 카드의 "씌우기"는 지금 방해꾼에게 바로 씌운다.
  - 놀이터(`/playground`, `src/pages/YardPage.tsx`. 풀이 화면 위쪽 띠 `Playground.tsx`와는 다르다): 마당 6칸 `YardScene`, 아래 탭(내 물건·상점·모자) `ItemShelf`. 진행 `ownedItems`(산 물건)·`placed`(칸 → 물건 id), 규칙 `buyItem`·`placeItem`·`unplaceItem`·`unseenYardItems`(`src/lib/progress.ts`), 상점 목록·값·기본 물건·좋아하는 동물 `SHOP_ITEM_IDS`·`SHOP_PRICE`·`STARTER_ITEM_ID`·`likedBy`(`src/lib/rewards.ts`). 한 번도 놓지 않았으면 기본 물건이 0번 칸에 있고, 다 치운 빈 `placed`는 지우지 않는다. 첫 화면 놀이터 버튼은 안 본 물건 보상이 있으면 점을 띄우고, 결과 카드의 "놀이터에 놓기"는 놓기 모드로 연다. 마당 동물 움직임은 `src/hooks/useYardMotion.ts`(네 마리를 rAF 하나로, 좋아하는 물건 옆에 머물다 돌아다니고 돌아온다. 움직임 줄이기면 서 있기만), 자리·범위·일정 계산은 `pestMotion.ts`의 순수 함수 `standingPoint`·`yardBounds`·`nextYardLeg`·`yardRestMs`. 동물 자리는 CSS가 아니라 이 hook이 정한다.
- 방해꾼: 규칙·대사 `src/lib/pest.ts`, 동물 `src/lib/pestAnimals.ts`, 움직임 계산(순수 함수) `src/lib/pestMotion.ts`, 상태 `src/hooks/usePest.ts`(reducer), 프레임 루프 `src/hooks/usePestMotion.ts`, 그리기 `src/components/PestLayer.tsx`. 몸 모양 `figurePose`(`pestMotion.ts`)와 동작 줄이기 확인 `prefersReducedMotion`(`src/lib/reducedMotion.ts`)은 마당 동물과 같이 쓴다.
- PWA: `public/manifest.webmanifest`, 아이콘 `scripts/app-icon.ts` → `public/icons/`, 서비스 워커 본문 `scripts/sw/worker.js` → 빌드가 `dist/sw.js`로(`scripts/sw.ts`).
- 안드로이드(TWA, 패키지 `com.quiznoriteo.app`): `android/` (Bubblewrap 설정·스토어 자료, 절차는 `android/README.md`). 개인정보처리방침 `/privacy`(`src/pages/PrivacyPage.tsx`)는 저장·통계·공유·광고를 바꿀 때 같이 고친다.
- 에러 코드: `docs/errors.md`.

## 서비스 요구사항

- **정적 서비스**: 서버 없이 정적 파일만 배포한다. 진행 상황(푼 문제, 골드, 설정)은 이 기기 `localStorage`에만 저장한다.
- **골드**: 처음 30. 맞히면 +10(힌트를 연 문제는 +5). 힌트는 최대 3단계, 첫 단계 무료, 나머지 5골드. 넌센스 힌트 순서: 문장(무료) → 첫 글자(골드) → 문장(골드). MBTI 힌트: 축 공개(무료) → 축 공개(골드) → 축 공개(골드), 앞 축부터 고정.
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

**Required (not optional):** these steps run through the named skill, not an ad-hoc substitute (curl, a hand-written browser script, a manual checklist). Skip one only when the user says so, and say in the report which one was skipped and why.

| When                                                                  | Skill (required)                                      |
| --------------------------------------------------------------------- | ----------------------------------------------------- |
| Before building a new feature or topic (new `feat/` branch)           | /plan-eng-review (or /autoplan for the full pipeline) |
| Checks before every commit                                            | /verify                                               |
| UI changed (`src/components`, `src/pages`, CSS, icons), before the PR | /design-review                                        |
| Checking behavior in a browser, finding bugs                          | /qa (report only: /qa-only), not /browse alone        |
| Every PR                                                              | /ship (it runs the review, the docs audit and the PR) |
| After a production deploy (merge to `main`)                           | /canary on https://quiz-noriteo.netlify.app           |

Also use when they match:

- Product ideas, brainstorming, "is this worth building" → /office-hours
- Strategy or scope → /plan-ceo-review; UX plan → /plan-design-review
- Reviewing a diff or branch outside /ship → /review
- Security concerns → /cso
- Performance → /benchmark
- Docs out of date outside /ship → /document-release

**Old repo:** `~/Vscode/web-app-quiz` may be used as a source (specs, data, past designs) when quiz2 lacks something. Port what is needed into quiz2's own files so quiz2 stands alone; never depend on or point to the old repo.

**Hooks (`.claude/settings.json`):**

- `.claude/hooks/log-skill.sh` writes one line per skill use to `.gstack/skill-log.jsonl` (git-ignored): `by: "claude"` (Skill tool), `by: "read"` (a `SKILL.md` read directly; subagents use skills this way), `by: "user"` (typed `/command`). `agent`/`agent_type` say which subagent, when the hook input has them.
- `.claude/hooks/skill-nudge.sh` reminds after `gh pr merge` (/canary), a fresh commit (made in the last 2 minutes) with UI files, test files not counted (/design-review), and a new `feat/` or `feature/` branch (/plan-eng-review).
- To answer "which skills ran", read `.gstack/skill-log.jsonl` together with gstack's own `~/.gstack/projects/web-app-quiz2/timeline.jsonl` (skill start/end, including runs inside subagents).

## Health Stack

- typecheck: npm run typecheck
- lint: npm run lint
- test: npm test
- deadcode: npx --yes knip
