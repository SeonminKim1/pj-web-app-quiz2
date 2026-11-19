# TODOS

Deferred by /autoplan on 2026-11-18 (design doc: ~/.gstack/projects/web-app-quiz2/smkim-nobranch-design-20261118-172329.md).

- **Kakao share SDK personalized cards** — Why: preview could carry the sender's result. Depends on: Success Criteria passing. Effort: human M / CC S.
- **Netlify Edge Function per-sender OG** — Why: same, without Kakao keys. Trigger: landing→solve ≥50% but reshare <10%. Effort: human M / CC S.
- **MBTI result-card sharing** — Why: second content type. Depends on: nonsense loop result. Effort: human L / CC M.
- **Port bookmarks, TopicFilter from web-app-quiz** (MBTI topic and PetPicker done) — Why: parity with the old app. Depends on: evidence the loop works. Effort: human M / CC S.
- **DESIGN.md via /design-consultation** — Why: no written design system; ported tokens only. Effort: human S / CC S.
- **Client error reporting** — Why: no visibility into runtime errors in in-app browsers. Effort: human S / CC S.
- **Per-id grading JSON for shareable problems** — Why: cold landing downloads ~100KB. Trigger: slow first solve observed. Effort: human S / CC S.
- **Shared dialog sheet (style + keyboard hook)** — Why: /design-review FINDING-005/006 (2026-11-19, medium): PetPicker and the nickname sheet close on Esc only inside the sheet and don't keep Tab in (MbtiGuide does); backdrop/sheet CSS is copied in 3 files. One `ui.module.css` sheet pattern + one `useModalSheet` hook. Effort: human S / CC S.
- **MBTI solved-screen polish** — Why: /design-review FINDING-007/008 (polish): hint-locked axes look the same as correct ones once solved; picker status style composes from AnswerInput.module.css; 8px/26px chip values without tokens. Effort: human S / CC S.
