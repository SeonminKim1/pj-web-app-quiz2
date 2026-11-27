# Design: 스테이지 칸을 스테이지답게

Branch: `feat/stage-cells` (from main 299fb5d). 2026-11-27.

## 문제

넌센스 스테이지 목록이 스티커첩처럼 보여 "스테이지를 하나씩 깨는" 느낌이 약하다(오너 피드백, 360px 화면 확인).

- 목록 제목이 "스티커 수집첩", 옆 숫자가 "스티커 n / 55장". 화면 어디에도 "스테이지"라는 말이 없다.
- 칸의 주인공이 회색 스티커 그림이고, 스테이지 번호는 왼쪽 위에 작게 있다.
- 다 푼 칸, 푸는 중인 칸, 아직 안 한 칸의 차이가 약하다. 1번 칸의 분홍 테두리와 "여기부터"만 눈에 띈다.
- 55칸이 같은 모양으로 반복돼 수집 화면처럼 읽힌다.

## 고른 방향 (오너 선택: "칸을 스테이지 중심으로")

격자(넌센스 3열, MBTI 2열)와 칸 하나 = 판 하나는 그대로 둔다. 칸 안의 위계만 바꾼다.

1. 목록 제목은 "스테이지"(MBTI는 "카테고리"). 스티커 수는 오른쪽 보조 줄("스티커 n / 55장")로 남긴다.
2. 칸의 주인공은 큰 스테이지 번호와 상태:
   - 다 푼 칸: ✓ 표시, 칸이 채워진 느낌(받은 스티커가 선명).
   - 푸는 중: 진행 막대나 "n/10".
   - 지금 차례(다 풀지 않은 첫 칸): "다음!" 표시와 지금의 분홍 강조. 처음이면 "여기부터".
   - 아직: 번호만, 흐린 상태.
3. 스티커는 칸 구석의 작은 그림. 아직이면 흐리게(받을 보상 미리보기), 받으면 선명하게. 큰 보상 칸(5번마다)의 노란 바탕은 유지.
4. 잠김은 없다(rewards-playground.md 69행의 결정 유지). 어느 칸이든 누르면 그 스테이지로 간다.

## 디자인 리뷰 결정 (/plan-design-review, 2026-11-27)

- S1 칸 안 위계(넌센스 3열 칸, 약 100px): 1순위 스테이지 번호 Jua 32px, 칸 가운데에서 살짝 위. 2순위 상태 한 줄(번호 아래: 진행 막대·"n/10", 또는 "새 문제 n개"). 3순위 스티커 24px(큰 보상 28px), 칸 오른쪽 아래 구석. 다 푼 칸의 ✓ 배지는 오른쪽 위. "다음!"/"여기부터" 탭은 지금처럼 칸 위 가장자리.
- S2 다 푼 칸(스티커 받음): 민트 바탕(`--color-mint-soft`, D4 유지) + 오른쪽 위 동그란 ✓ 배지(`--color-mint` 바탕, `--border` 2px 갈색 테두리, 체크는 SVG/텍스트 글리프, 이모지 아님) + 구석 스티커 컬러. 흑백에서도 ✓로 구별된다. 받은 뒤 문제가 늘어 다시 덜 푼 칸은 ✓ 대신 "새 문제 n개"(D4 유지).
- S3 지금 차례 탭: 그 주제에서 한 문제도 풀지 않았으면 "여기부터", 하나라도 풀었으면 "다음!". 분홍 테두리는 그대로. 스크린리더 라벨은 둘 다 "지금 차례"(D23 유지).
- 상태 표(나머지는 D4 그대로 옮김):

  | 상태                  | 바탕                                                      | 번호                       | 상태 줄           | 스티커(구석) | 배지                                                          |
  | --------------------- | --------------------------------------------------------- | -------------------------- | ----------------- | ------------ | ------------------------------------------------------------- |
  | 다 푼 칸(`completed`) | 민트                                                      | 잉크                       | 없음              | 컬러         | ✓ 오른쪽 위(SVG)                                              |
  | 푸는 중               | 흰색                                                      | 잉크                       | 막대 + "n/10"     | 흐림         | 없음                                                          |
  | 지금 차례             | `--color-pink-soft`, 분홍 고리(지금 그대로)               | 잉크                       | 시작했으면 막대   | 흐림         | 위 탭: 그 칸이 시작 전이면 "여기부터", 시작했으면 "다음!"(R4) |
  | 아직                  | 흰색                                                      | `--color-ink-soft`         | 없음              | 흐림         | 없음                                                          |
  | 5번마다(큰 보상)      | 안 깼으면 연한 금색, 깼으면 민트 + 안쪽 3px 금색 고리(R6) | 위와 같음                  | 위와 같음         | 28px         | 위와 같음                                                     |
  | 표 밖(56번~)          | 흰색(다 풀면 민트, 다른 다 푼 칸과 같게)                  | 시작 전 `--color-ink-soft` | 시작하면 막대(R5) | 없음         | 다 풀면 ✓                                                     |
  | 로딩·오류             | 지금 목록의 `LoadingView`/`ErrorView` 그대로              |                            |                   |              |                                                               |

- S4 MBTI 카테고리 목록(2열 큰 칸): 주인공은 카테고리 이름(Jua 20px, 가운데). ✓·민트·지금 차례 탭·진행 막대 "n/16"·구석 스티커(32px)는 넌센스와 같다. 머리 제목은 "카테고리", 보조 줄 "스티커 n / 7장".
- 반응형·접근성: 360px 넌센스 3열(칸 약 100px), MBTI 2열. 데스크톱은 지금처럼 최대 폭 안에서 같은 격자. 터치 영역은 칸 전체(44px 이상). `--color-ink-soft` 번호는 흰 바탕에서 약 5.9:1(AA). 스크린리더 라벨·`aria-current="step"`·포커스 링·자동 스크롤(D23, D24)은 그대로. 상태는 색과 함께 ✓·막대·탭 글자로도 보인다.
- 여정(5초·5분·오래):

  | 단계 | 사용자가 하는 일              | 느낌                      | 받쳐 주는 것                                                                |
  | ---- | ----------------------------- | ------------------------- | --------------------------------------------------------------------------- |
  | 1    | 처음 넌센스 목록을 연다       | "1번부터 깨면 되는구나"   | 큰 번호, 1번 칸 "여기부터"                                                  |
  | 2    | 1번을 깨고 돌아온다           | "하나 깼다!"              | 1번 민트+✓, 2번 "여기부터"(R4, 2번은 아직 시작 전), 결과 카드의 새 보상(D6) |
  | 3    | 며칠 뒤 다시 연다             | "어디까지 했지" → 바로 앎 | 자동 스크롤(D24)로 지금 차례 칸이 가운데(하다 만 칸이면 "다음!")            |
  | 4    | 중간 스테이지를 골라 들어간다 | 잠김 없음, 자유           | 어느 칸이든 누르면 들어감                                                   |
  | 5    | 스티커를 모은다               | 보조 재미                 | 머리 줄 "스티커 n / 55장", 구석 컬러 스티커, 놀이터                         |

## 바뀌는 것 / 안 바뀌는 것

- 바뀜: `src/components/StickerAlbum.tsx`(칸 안 배치, `heading` prop), `StickerAlbum.module.css`, `src/pages/StageListPage.tsx`·`src/pages/CategoryListPage.tsx`(heading 넘기기), 새 `src/components/StickerAlbum.test.tsx`. 기존 테스트 문구는 바꿀 필요 없음(eng review 1번).
- 안 바뀜: 저장 형식, 보상 id·보상 표, 결과 카드, 칭호 카드, 판 목록 hook, 라우트. 스크린리더 라벨(이미 "스테이지 N, 10문제 중 n문제 풂, ...")은 그대로.
- 되돌리는 설계 결정: rewards-playground.md D5의 "앨범(스티커 수집첩)이 화면의 주인공" 부분. 이번에는 스테이지가 주인공이고 스티커는 보조다.

## 확인

- 360px에서 3열이 넘치지 않고 번호가 한눈에 읽힌다. 터치 영역 44px 이상.
- 다 푼 칸, 푸는 중, 지금 차례, 아직 네 상태가 흑백으로 봐도 구별된다(색만으로 구별하지 않음).
- MBTI 카테고리 목록(2열 큰 칸, 칸 이름이 카테고리 이름)도 깨지지 않는다.

## NOT in scope

- 잠김·별점: 넣지 않는다(rewards-playground D4 "Every cell opens its stage; no stars" 유지).
- 길(지도) 모양 목록, 스티커첩 분리 화면: 오너가 "칸을 스테이지 중심으로"를 골라 제외.
- 칭호 카드·결과 카드·놀이터 화면: 바꾸지 않는다.
- DESIGN.md 작성: TODOS의 "DESIGN.md via /design-consultation"으로 이미 남아 있다.

## What already exists

- `StickerAlbum`/`StickerCell`(`src/components/StickerAlbum.tsx`): 넌센스·MBTI가 같이 쓰는 칸 부품, `data-earned`·`data-big`·`data-current`·`data-flash` 상태 속성, 진행 막대, "새 문제 n개", "여기부터" 탭, 자동 스크롤(D24), 스크린리더 라벨(D23).
- `RewardArt`(스티커 그림), 토큰 `--font-display`, `--color-mint(-soft)`, `--color-gold-soft`, `--color-pink-strong`, `--color-ink-soft`, `--reward-faded`, `--border`, `--radius-tile`.

## Implementation Tasks

Synthesized from the design review (S1–S4) and the eng review (R1–R6). Run with Claude Code; checkbox as you ship.

- [x] **T1 (P1, human: ~3h / CC: ~25min)** — StickerAlbum + list pages — 칸 안 위계와 머리 제목
  - Surfaced by: S1–S4, R1 heading prop, R3 status line left 60%, R4 per-cell tab rule, R5 unstarted = number only, R6 done big cell mint + gold ring, ✓ = `completed` (SVG)
  - Files: src/components/StickerAlbum.tsx, src/components/StickerAlbum.module.css, src/pages/StageListPage.tsx, src/pages/CategoryListPage.tsx
  - Verify: `npm test` (pages.test.tsx, MbtiPlay.test.tsx 라벨 그대로), 360px /design-review
- [x] **T2 (P1, human: ~1h / CC: ~10min)** — tests — 새 `src/components/StickerAlbum.test.tsx`(R2)
  - Surfaced by: R2 regression contract
  - Files: src/components/StickerAlbum.test.tsx (MemoryRouter, `clearAlbumFlash()` between tests; do not duplicate MbtiPlay.test.tsx:120 exact label)
  - Verify: `npm test`

## Design Review Completion Summary

```
  +====================================================================+
  |         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
  +====================================================================+
  | System Audit         | DESIGN.md 없음(토큰은 index.css), UI: 판 목록 칸 |
  | Step 0               | 5/10, 7개 항목 모두                          |
  | Pass 1  (Info Arch)  | 6/10 → 9/10 after fixes                     |
  | Pass 2  (States)     | 6/10 → 9/10 after fixes                     |
  | Pass 3  (Journey)    | 7/10 → 9/10 after fixes                     |
  | Pass 4  (AI Slop)    | 8/10 → 8/10 after fixes                     |
  | Pass 5  (Design Sys) | 8/10 → 8/10 after fixes                     |
  | Pass 6  (Responsive) | 7/10 → 9/10 after fixes                     |
  | Pass 7  (Decisions)  | 4 resolved, 0 deferred                      |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (4 items)                           |
  | What already exists  | written                                     |
  | TODOS.md updates     | 0 items proposed                            |
  | Approved Mockups     | 0 generated (no image API key), 0 approved  |
  | Decisions made       | 4 added to plan (S1–S4)                     |
  | Decisions deferred   | 0                                           |
  | Overall design score | 6/10 → 8/10                                 |
  +====================================================================+
```

Unresolved Decisions: none.

## Eng review (/plan-eng-review, 2026-11-27)

Target: `docs/designs/stage-cells.md` (this file). Scope Challenge: 3~4 files, no new class → complexity gate skipped; scope accepted as-is.

Scope Challenge findings:

1. [INFORMATIONAL] (9/10) T2 assumed a test asserts "스티커 수집첩"; none does (`src/pages/pages.test.tsx:752` asserts only "스티커 1 / 2장", which stays). Factual correction, no question.
2. [INFORMATIONAL] (8/10) `src/components/StickerAlbum.tsx:61` hard-codes `<h2 id="album-title">스티커 수집첩</h2>`; callers `src/pages/StageListPage.tsx:31` and `src/pages/CategoryListPage.tsx:46` need "스테이지"/"카테고리". → R1.
3. [INFORMATIONAL] (8/10) S3 "아무것도 안 풀었음" = `album.cells.every((c) => c.solvedCount === 0)` (`StickerAlbum.tsx:34` already derives `current` from `album.cells`). Spec clarification, no question.

## Decision ledger

### R1: how the album gets its heading word

Finding: 2, INFORMATIONAL, 8/10, src/components/StickerAlbum.tsx:61, Claude (plan-eng-review)
Plan baseline: S4 (approved in /plan-design-review): heading "스테이지" for nonsense, "카테고리" for MBTI; mechanism unspecified.
Runtime evidence: heading is a literal in StickerAlbum; the two callers are separate pages.
Comparison grid:

| Choice            | Current                 | A                                  | B                                                            |
| ----------------- | ----------------------- | ---------------------------------- | ------------------------------------------------------------ |
| R1 heading source | literal "스티커 수집첩" | `heading` prop passed by each page | derived from `size` ('small' → 스테이지, 'large' → 카테고리) |
| S4 wording        | approved                | unchanged                          | unchanged                                                    |

Question D1:
D1 — 목록 머리 제목(스테이지/카테고리)을 어디서 정할까요?
Project/branch/task: feat/stage-cells, 판 목록 칸을 스테이지 중심으로.
ELI10: 스티커첩 부품 하나를 넌센스와 MBTI 목록이 같이 써요. 제목을 "스테이지"/"카테고리"로 나눠야 하는데, 부품 안에서 칸 크기로 짐작할지, 각 화면이 제목을 넘길지 정해야 합니다.
Stakes if we pick wrong: 크기로 짐작하면 나중에 다른 주제가 큰 칸을 쓸 때 제목이 틀리게 나오고 아무 테스트도 안 깨집니다.
Recommendation: A because 각 화면이 무엇을 보여 주는지 직접 말해 명시적이고, 칸 크기와 문구가 엮이지 않습니다.
Note: options differ in kind, not coverage — no completeness score.
Header: 제목 출처
Options:
A) 화면이 heading 넘기기 (recommended)
StageListPage는 "스테이지", CategoryListPage는 "카테고리"를 넘김. 부품에 문자열 prop 하나 추가(human ~10분 / CC ~2분). 크기와 문구가 따로라 새 주제에도 안전.
B) 칸 크기로 짐작
size가 small이면 스테이지, large면 카테고리. 호출부는 그대로지만 크기와 문구가 엮여, 큰 칸을 쓰는 새 주제가 생기면 조용히 틀린 제목이 나옴.

State: approved
Actual answer: A) 화면이 heading 넘기기 (D1, owner answer 2026-11-27)
Accepted scope: `StickerAlbum` gets a required `heading: string` prop rendered in `<h2 id="album-title">`; `StageListPage` passes "스테이지", `CategoryListPage` passes "카테고리". `size` keeps controlling layout only.
History: none

Factual corrections (no question): current cell background is `--color-pink-soft` today (`StickerAlbum.module.css:105`), and S3 keeps it, so the state table's "흰색, 분홍 테두리" row means pink-soft + pink-strong ring. An earned big-reward cell keeps the gold background (`.cell[data-big]` follows `[data-earned]`) and still shows ✓.

### R2: regression contract for the cell rewrite

Finding: Section 3, CRITICAL (regression risk), 8/10, src/components/StickerAlbum.tsx:111-125 (aria-label) and :127-137 (data-*, aria-current), Claude (plan-eng-review)
Plan baseline: plan says labels stay ("안 바뀜"); no test pins them. Existing coverage: pages.test.tsx flash (:798) and count (:752) only.
Runtime evidence: label pattern "스테이지 N, T문제 중 S문제 풂, (보상 받음|받을 보상 X|완료), 새 문제 n개, 지금 차례"; attributes data-earned/data-big/data-current/data-flash, aria-current="step".
Comparison grid:

| Choice                 | Current       | A                                                                                                                                         | B                                                      |
| ---------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| R2 regression contract | none          | unit tests pin: label text, aria-current on current cell only, data-earned/data-big, onSelect(no) on click, plus new S2/S3/S4/R1 behavior | only new behavior tests (S2/S3/S4/R1); labels unpinned |
| R1 heading             | approved prop | unchanged                                                                                                                                 | unchanged                                              |

Question D2:
D2 — 칸을 다시 짤 때 지금 동작(스크린리더 라벨 등)을 테스트로 고정할까요?
Project/branch/task: feat/stage-cells, 판 목록 칸을 스테이지 중심으로.
ELI10: 칸 안을 새로 배치하면서 스크린리더가 읽는 문장, 지금 차례 표시, 누르면 그 스테이지로 가는 동작이 실수로 바뀔 수 있어요. 지금은 이걸 지키는 테스트가 없습니다.
Stakes if we pick wrong: 라벨이 바뀌거나 빠져도 아무 테스트가 안 깨져 화면 읽기 사용자가 칸 상태를 못 듣게 됩니다.
Recommendation: A because 새 테스트 파일 하나에 지금 동작과 새 동작을 함께 넣어 추가 비용이 몇 분이고, 회귀를 바로 잡습니다.
Completeness: A=9/10, B=6/10
Header: 회귀 테스트
Options:
A) 지금 동작도 고정 (recommended)
src/components/StickerAlbum.test.tsx 새 파일: 라벨 문장, aria-current는 지금 차례 칸에만, data-earned·data-big, 누르면 onSelect(번호), 그리고 ✓·여기부터/다음!·MBTI 이름·heading(human ~1시간 / CC ~10분).
B) 새 동작만
✓·탭 문구·MBTI·heading만 테스트(human ~40분 / CC ~6분). 라벨·aria-current가 바뀌어도 잡지 못함.

State: approved
Actual answer: A) 지금 동작도 고정 (D2, owner answer 2026-11-27)
Accepted scope: new `src/components/StickerAlbum.test.tsx` pinning current behavior (aria-label text per state, `aria-current="step"` only on the current cell, `data-earned`/`data-big`, click calls `onSelect(no)`) plus the new behavior (✓ on earned cells and not on earned-with-new-questions, "여기부터" with nothing solved / "다음!" after, MBTI large cell shows the category name, `heading` prop text).
History: none

Outside voice (native Plan subagent, Codex not installed) corrections, verified in code, no question:

- ✓ shows iff `cell.completed` (`src/lib/album.ts:53-54`: `earned` is false for off-table cells, so keying ✓ on `earned` would miss 56+). Earned-but-not-completed is exactly the "새 문제 n개" case.
- R2 premise correction: labels are partly pinned already (`src/pages/MbtiPlay.test.tsx:120` full label; prefixes in `pages.test.tsx`). R2 stands; the new unit test must not duplicate MbtiPlay's exact label.
- New unit test needs `MemoryRouter` (StickerAlbum uses `useLocation`/`useNavigationType`) and `clearAlbumFlash()` between tests (`src/lib/rewardFlash.ts` module state).
- ✓ glyph is an inline SVG (U+2714 renders as color emoji on some phones, against S2's "이모지 아님").
- T1 and T2 merge (same file); verify with full `npm test` (there is no TopicPage test file; album page tests live in pages.test.tsx and MbtiPlay.test.tsx).

### R3: how the corner sticker and the status line share a cell

Finding: outside voice #2, High, 8/10, src/components/StickerAlbum.module.css:181-186 (`.progress` width 80%, centered); cell content ≈85px wide at 360px (328 − 2×12 album − 2×12 gaps ≈ 280 / 3 ≈ 93px − 8px padding), Plan subagent
Plan baseline: S1 (approved): number 32px center, status line under it, sticker 24/28px bottom-right corner. Overlap not addressed.
Runtime evidence: a 24px absolute sticker in the bottom-right overlaps the right end of an 80%-wide bar and "n/10" in ≈85px.
Comparison grid:

| Choice    | Current     | A                                                                                                                                                     | B                                   | C                                                         | D                                   |
| --------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------- | ----------------------------------- |
| R3 layout | unspecified | status line narrowed to the left ≈60% (bar + "n/10" left-aligned under the number), sticker keeps the bottom-right corner; cell min-height 108px kept | keep S1 as written (accept overlap) | investigate: build both in the browser at 360px, then ask | defer this row only (stays pending) |

Question D3:
D3 — 구석 스티커와 진행 줄이 칸 안에서 겹치지 않게 어떻게 나눌까요?
Project/branch/task: feat/stage-cells, 판 목록 칸을 스테이지 중심으로.
ELI10: 360px 화면에서 넌센스 칸 안쪽은 약 85px밖에 안 돼요. 진행 막대(칸 폭 80%)와 "4/10" 글자가 가운데 있고, 스티커를 오른쪽 아래 구석에 두면 막대 끝과 겹칩니다.
Stakes if we pick wrong: 푸는 중인 칸마다 스티커가 막대와 숫자를 가려 진행을 읽기 어렵습니다.
Recommendation: A because 진행 줄을 왼쪽으로 좁히면 S1(번호 주인공, 스티커 구석)을 그대로 지키면서 겹침만 없앱니다.
Note: options differ in kind, not coverage — no completeness score.
Header: 칸 안 배치
Options:
A) Apply: 진행 줄 왼쪽으로 (recommended)
진행 막대와 "n/10"을 칸 왼쪽 약 60% 폭으로, 스티커는 오른쪽 아래 그대로. 칸 높이 108px 유지(human ~20분 / CC ~3분).
B) Keep: S1 그대로
진행 줄 가운데 80% 유지. 구현은 그대로지만 푸는 중인 칸에서 스티커가 막대 끝을 가립니다.
C) Investigate: 브라우저로 먼저 비교
360px에서 두 배치를 직접 만들어 보고 다시 묻기. 구현 전 20~30분 더 걸리고 이 행은 그때까지 미정.
D) Defer: 이 행만 미루기
배치는 미정으로 두고 다른 결정은 그대로. 구현 때 다시 물어야 합니다.

State: approved
Actual answer: A) Apply: 진행 줄 왼쪽으로 (D3, owner answer 2026-11-27)
Accepted scope: status line (bar + "n/T", or "새 문제 n개") sits left-aligned in the left ≈60% of the cell under the number; the sticker keeps the bottom-right corner (24px, big 28px; MBTI 32px); cell min-height stays 108px (MBTI 132px).
History: none
Implementation note (fix/stage-cells-polish, 2026-11-27): the cell is a two-row grid (number on top, status line in the bottom row) instead of an absolutely placed status line, so larger text grows the cell rather than overlapping the number. The status line still leaves the sticker corner free (`width: calc(100% - 32px)`, MBTI `- 36px`).

### R4: which wording the current-cell tab uses

Finding: outside voice #6, Medium, 8/10, plan S3 (album-wide `every(c => c.solvedCount === 0)`), Plan subagent
Plan baseline: S3 (approved): "여기부터" when nothing in the topic is solved, "다음!" after.
Runtime evidence: no locks, so a user who solved only stage 7 gets "다음!" on stage 1, which they never touched.
Comparison grid:

| Choice              | Current       | A                                                                                              | B                  | C           | D                   |
| ------------------- | ------------- | ---------------------------------------------------------------------------------------------- | ------------------ | ----------- | ------------------- |
| R4 tab wording rule | S3 album-wide | per cell: "여기부터" when the current cell has `solvedCount === 0`, "다음!" when it is started | keep S3 album-wide | investigate | defer this row only |

Question D4:
D4 — 지금 차례 탭 문구를 주제 전체 기준이 아니라 그 칸 기준으로 바꿀까요?
Project/branch/task: feat/stage-cells, 판 목록 칸을 스테이지 중심으로.
ELI10: 잠김이 없어서 7번만 먼저 깬 사람도 있을 수 있어요. 지금 규칙(주제에서 하나라도 풀었으면 "다음!")이면, 한 번도 안 연 1번 칸에 "다음!"이 붙습니다.
Stakes if we pick wrong: 처음 보는 칸에 "다음!"이 붙어 이어서 하던 판처럼 보입니다(작은 혼란).
Recommendation: A because 칸 하나의 상태만 보면 규칙이 더 단순하고, 안 연 칸엔 "여기부터", 하다 만 칸엔 "다음!"이 붙어 말이 맞습니다.
Note: options differ in kind, not coverage — no completeness score.
Header: 차례 탭 규칙
Options:
A) Apply: 그 칸 기준 (recommended)
지금 차례 칸을 한 문제도 안 풀었으면 "여기부터", 시작했으면 "다음!". 첫 방문은 그대로 "여기부터"(human ~5분 / CC ~1분).
B) Keep: 주제 전체 기준(S3)
하나라도 풀었으면 "다음!". 7번만 깬 경우 1번에 "다음!"이 붙는 걸 받아들임.
C) Investigate: 먼저 알아보기
실제로 순서를 건너뛰는 사용자가 있는지 보고 다시 묻기. 지금은 데이터가 없어 결정이 미뤄짐.
D) Defer: 이 행만 미루기
S3 규칙은 미정으로 남고 구현 때 다시 물어야 함.

State: approved
Actual answer: A) Apply: 그 칸 기준 (D4, owner answer 2026-11-27)
Accepted scope: the current-cell tab reads "여기부터" when that cell has `solvedCount === 0` and "다음!" when it is started; replaces S3's album-wide rule. Consequence: after clearing stage 1, untouched stage 2 shows "여기부터" (journey row 2 updated). Screen-reader label stays "지금 차례".
History: S3 (design review) used the album-wide rule; reopened by outside-voice finding #6.

### R5: what an unstarted off-table cell (56+) shows

Finding: outside voice #7, Low, 8/10, src/components/StickerAlbum.tsx:158 (`(started || !reward)` shows "0/T" on unstarted cells without a reward), Plan subagent
Plan baseline: state table: off-table cells "진행만"; ordinary unstarted cells "번호만".
Runtime evidence: today an unstarted 56+ cell shows "0/10" plus bar.
Comparison grid:

| Choice                | Current            | A                                                              | B                       | C           | D                   |
| --------------------- | ------------------ | -------------------------------------------------------------- | ----------------------- | ----------- | ------------------- |
| R5 unstarted 56+ cell | "0/10" + empty bar | number only, like other unstarted cells (bar from first solve) | keep "0/10" + empty bar | investigate | defer this row only |

Question D5:
D5 — 보상 없는 56번 이후 칸이 아직 시작 전이면 무엇을 보여 줄까요?
Project/branch/task: feat/stage-cells, 판 목록 칸을 스테이지 중심으로.
ELI10: 지금은 보상 표 밖(56번~) 칸은 안 풀었어도 "0/10"과 빈 막대가 나와요. 새 디자인에서 다른 안 푼 칸은 번호만 보이니, 이 칸만 달라 보입니다.
Stakes if we pick wrong: 56번부터 칸 모양이 갑자기 달라 보여 뭔가 다른 칸처럼 느껴집니다(지금은 55스테이지라 아직 안 보임).
Recommendation: A because 안 푼 칸은 모두 번호만 보여야 상태 규칙이 하나로 맞습니다.
Note: options differ in kind, not coverage — no completeness score.
Header: 56번 이후 칸
Options:
A) Apply: 번호만 (recommended)
안 푼 56번 이후 칸도 번호만, 첫 문제를 풀면 막대가 나옴(human ~5분 / CC ~1분).
B) Keep: "0/10" 유지
지금처럼 빈 막대와 "0/10". 다른 안 푼 칸과 모양이 다름.
C) Investigate: 먼저 알아보기
문제가 56스테이지를 넘을 계획을 확인한 뒤 다시 묻기. 그때까지 미정.
D) Defer: 이 행만 미루기
지금 화면엔 안 나오니 미정으로 두고 다른 결정은 그대로.

State: approved
Actual answer: A) Apply: 번호만 (D5, owner answer 2026-11-27)
Accepted scope: an unstarted cell shows number only whether or not it has a reward; the status line (bar + "n/T") appears from the first solved question (`started`). Off-table cells: number, status line once started, ✓ when completed, no sticker.
History: none

### R6: how an earned big-reward cell (every 5th) looks done

Finding: outside voice #8, Low, 7/10, src/components/StickerAlbum.module.css:100 (`.cell[data-big]` gold follows `[data-earned]` mint), Plan subagent
Plan baseline: factual correction above: earned big cell keeps gold + ✓.
Runtime evidence: with the sticker shrunk to a 28px corner, 11 of 55 cells show "done" only by the ✓ badge, while other done cells also turn mint.
Comparison grid:

| Choice             | Current  | A                                                                                  | B             | C                                   | D                   |
| ------------------ | -------- | ---------------------------------------------------------------------------------- | ------------- | ----------------------------------- | ------------------- |
| R6 earned big cell | gold + ✓ | mint (like other done cells) + ✓ + a 2px gold inner ring keeps the big-reward hint | keep gold + ✓ | investigate in the browser at 360px | defer this row only |

Question D6:
D6 — 5번마다 있는 큰 보상 칸을 다 풀면 어떻게 보이게 할까요?
Project/branch/task: feat/stage-cells, 판 목록 칸을 스테이지 중심으로.
ELI10: 5번마다 칸은 노란 바탕이고, 다 풀어도 노란색 그대로예요. 다른 칸은 다 풀면 민트로 바뀌니, 큰 보상 칸만 ✓ 배지 하나로 "깼다"를 알려 줍니다.
Stakes if we pick wrong: 목록을 훑을 때 깬 큰 칸이 안 깬 큰 칸과 비슷해 보여 진행이 덜 한눈에 들어옵니다.
Recommendation: A because 깬 칸은 모두 민트로 같은 신호를 주고, 금색 테두리로 큰 보상 칸이라는 것도 남습니다.
Note: options differ in kind, not coverage — no completeness score.
Header: 깬 큰 칸
Options:
A) Apply: 민트 + 금색 테두리 (recommended)
다 풀면 민트 바탕 + ✓ + 안쪽 2px 금색 테두리. 안 깬 큰 칸은 지금처럼 노란 바탕(human ~10분 / CC ~2분).
B) Keep: 노란 바탕 그대로
깬 큰 칸도 노란 바탕 + ✓. 지금과 같지만 깬 칸 신호가 ✓ 하나뿐.
C) Investigate: 브라우저로 먼저 비교
360px에서 두 모양을 보고 다시 묻기. 구현 전 시간이 더 들고 그동안 미정.
D) Defer: 이 행만 미루기
미정으로 두고 구현 때 다시 묻기.

State: approved
Actual answer: A) Apply: 민트 + 금색 테두리 (D6, owner answer 2026-11-27)
Accepted scope: a completed big-reward cell gets the mint background like other done cells, the ✓ badge, and a 2px `--color-gold` inner ring; an unfinished big cell keeps `--color-gold-soft`. Supersedes the earlier factual correction that kept gold.
History: earlier factual correction (gold wins over mint) replaced by this decision.
Implementation note (fix/stage-cells-polish, 2026-11-27): the shipped ring is 3px `--color-gold-strong` (`#a87a00`, about 3.45:1 on mint) instead of 2px `--color-gold`, which was too faint on the mint background; the ring also stays while the cell is pressed (`:active`). The decision itself (mint + ✓ + inner gold ring) is unchanged.

Approval readiness: PASS — R1 (D1 A), R2 (D2 A), R3 (D3 A), R4 (D4 A), R5 (D5 A), R6 (D6 A); factual corrections carry no new behavior.

## Eng Review Completion Summary

- Scope Challenge: scope accepted as-is (4 source files + 1 new test file, no new class).
- Architecture: no new module; `heading` prop added (R1). No issues.
- Code quality: no issues (CSS comment for the current cell updates with T1).
- Tests: R2 regression contract approved; diagram above; test plan saved to `~/.gstack/projects/web-app-quiz2/smkim-feat-stage-cells-eng-review-test-plan-20261127-151146.md`.
- Performance: no issues (55 static cells).
- Outside voice: native Plan subagent (Codex not installed), 11 findings → 5 factual corrections, 4 decisions (R3–R6), 2 no-op (#10 MBTI name already covered by MbtiPlay, kept in R2 scope; #11 stale doc fixed here).
- Failure modes: none new (no data, network or storage path). Silent risk would be a mislabeled cell; R2 tests pin labels.
- Parallelization: Sequential implementation, no parallelization opportunity.
- Decisions: 6 approved (D1–D6), 0 pending. TODOS: none proposed.

## GSTACK REVIEW REPORT

| Review         | Trigger                                    | Why                             | Runs | Status                                      | Findings                        |
| -------------- | ------------------------------------------ | ------------------------------- | ---- | ------------------------------------------- | ------------------------------- |
| CEO Review     | `/plan-ceo-review`                         | Scope & strategy                | 0    | —                                           | —                               |
| Outside Review | native Plan subagent (Codex not installed) | Independent 2nd opinion         | 1    | issues_found (in-host; outside unavailable) | 11 findings, all resolved       |
| Eng Review     | `/plan-eng-review`                         | Architecture & tests (required) | 1    | clean                                       | 9 issues, 0 critical gaps       |
| Design Review  | `/plan-design-review`                      | UI/UX gaps                      | 1    | clean                                       | score: 6/10 → 8/10, 4 decisions |
| DX Review      | `/plan-devex-review`                       | Developer experience gaps       | 0    | —                                           | —                               |

- **OUTSIDE COVERAGE:** Codex plan-review unavailable (CLI not installed); native Plan subagent completed with 11 findings; design outside voices skipped by the owner.
- **VERDICT:** DESIGN + ENG CLEARED — ready to implement

NO UNRESOLVED DECISIONS
