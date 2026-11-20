# TODOS

Deferred by /autoplan on 2026-11-18 (design doc: ~/.gstack/projects/web-app-quiz2/smkim-nobranch-design-20261118-172329.md).

- **Kakao share SDK personalized cards** — Why: preview could carry the sender's result. Depends on: Success Criteria passing. Effort: human M / CC S.
- **Netlify Edge Function per-sender OG** — Why: same, without Kakao keys. Trigger: landing→solve ≥50% but reshare <10%. Effort: human M / CC S.
- **MBTI result-card sharing** — Why: second content type. Depends on: nonsense loop result. Effort: human L / CC M.
- **Port bookmarks, TopicFilter from web-app-quiz** (MBTI topic and PetPicker done) — Why: parity with the old app. Depends on: evidence the loop works. Effort: human M / CC S.
- **DESIGN.md via /design-consultation** — Why: no written design system; ported tokens only. Effort: human S / CC S.
- **Client error reporting** — Why: no visibility into runtime errors in in-app browsers. Effort: human S / CC S.
- **Per-id grading JSON for shareable problems** — Why: cold landing downloads ~100KB. Trigger: slow first solve observed. Effort: human S / CC S.
- **Shared dialog sheet (style + keyboard hook)** — Why: /design-review FINDING-005/006 (2026-11-19, medium): PetPicker and the nickname sheet close on Esc only inside the sheet and don't keep Tab in (MbtiGuide does); backdrop/sheet CSS is copied in 3 files. `useModalSheet` now exists (feat/settings-gear: MbtiGuide and the ⚙ settings sheet use it); left: move PetPicker and NicknameSheet onto it (red team: Tab can reach the header ⚙ behind them) and share one `ui.module.css` sheet pattern. Effort: human S / CC S.
- **MBTI solved-screen polish** — Why: /design-review FINDING-007/008 (polish): hint-locked axes look the same as correct ones once solved; picker status style composes from AnswerInput.module.css; 8px/26px chip values without tokens. Effort: human S / CC S.
- **Progress sync across tabs** — What: listen to the `storage` event and merge another tab's saved progress (solved ∪, gold, owned items, placements). Why: each tab loads progress once (`useProgressState.ts:23`) and saves the whole object (`localStore.ts:66`), so a second tab's save drops a purchase from the first and refunds its gold; also affects solved/gold today. Pros: purchases and solves never vanish. Cons: merge rules for gold need care (gold is not a union). Context: from /plan-eng-review of `docs/designs/rewards-playground.md` (Outside Voice OV9, 2026-11-20). Depends on: PR ③ (shop) for the biggest benefit. Effort: human S / CC S.
