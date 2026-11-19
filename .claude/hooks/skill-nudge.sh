#!/bin/bash
# 때맞춘 gstack 스킬 알림(PostToolUse Bash). CLAUDE.md "Skill routing"의 필수 규칙을 놓치지 않게,
# 해당 명령이 끝난 직후 Claude에게 다음 스킬을 알려 주고(additionalContext) 사용자에게도 한 줄 보여 준다.
#   gh pr merge                      → /canary (배포 확인)
#   git commit (UI 파일 포함)        → /design-review (PR 전)
#   git switch -c / checkout -b      → /plan-eng-review (구현 전)
# 알림만 하고 막지 않는다. 실패해도 작업을 막지 않는다.
input=$(cat)
cmd=$(jq -r '.tool_input.command // ""' <<<"$input")
cd "${CLAUDE_PROJECT_DIR:-$PWD}" 2>/dev/null || exit 0

msg=""
if grep -Eq '(^|[;&|[:space:]])gh[[:space:]]+pr[[:space:]]+merge([[:space:]]|$)' <<<"$cmd"; then
  msg="PR을 머지했어요. main push로 Netlify가 배포합니다. 배포가 끝나면 /canary로 정식 사이트(https://quiz-noriteo.netlify.app)를 확인하세요(CLAUDE.md Skill routing: 배포 후 /canary)."
elif grep -Eq '(^|[;&|[:space:]])git[[:space:]]+commit([[:space:]]|$)' <<<"$cmd" \
  && [ $(($(date +%s) - $(git log -1 --format=%ct 2>/dev/null || echo 0))) -lt 120 ]; then
  # 방금(2분 안) 만든 커밋만 본다: 실패한 커밋·다른 저장소 커밋 뒤에 옛 HEAD를 알리지 않게.
  # 파일 이름은 안전한 글자만 남겨 Claude 문맥에 넣는다(파일 이름에 섞인 지시문 차단).
  ui=$(git show --name-only --format= HEAD 2>/dev/null | grep -E '^src/(components|pages)/|\.css$|^public/.*\.(svg|png|webmanifest)$' | grep -vE '\.test\.tsx?$' | grep -E '^[A-Za-z0-9._/-]{1,120}$' | head -5)
  if [ -n "$ui" ]; then
    msg="방금 커밋에 화면 파일이 있어요($(tr '\n' ' ' <<<"$ui"| sed 's/ $//')). PR 전에 /design-review로 360px 화면을 확인하세요(CLAUDE.md Skill routing: UI를 바꾸면 PR 전에 /design-review)."
  fi
elif grep -Eq '(^|[;&|[:space:]])git[[:space:]]+(switch[[:space:]]+-c|checkout[[:space:]]+-b)[[:space:]]+(feat|feature)/' <<<"$cmd"; then
  msg="새 기능 브랜치를 만들었어요. 구현 전에 /plan-eng-review로 설계·데이터 흐름·테스트 계획을 잡으세요(CLAUDE.md Skill routing: 새 기능은 구현 전에 /plan-eng-review). 이전 저장소(~/Vscode/web-app-quiz)에 관련 spec이 있으면 먼저 확인하세요."
fi

[ -z "$msg" ] && exit 0
jq -nc --arg m "$msg" '{systemMessage: ("gstack: " + $m), hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $m}}'
