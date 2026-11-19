#!/bin/bash
# 스킬 사용 이력: Claude가 Skill 도구를 부를 때(PostToolUse)와 사용자가 /명령을 입력할 때(UserPromptSubmit)
# 한 줄씩 .gstack/skill-log.jsonl에 남긴다(git 무시 폴더). 실패해도 작업을 막지 않는다.
log="${CLAUDE_PROJECT_DIR:-$PWD}/.gstack/skill-log.jsonl"
mkdir -p "$(dirname "$log")"
jq -c --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
  if .hook_event_name == "PostToolUse" and .tool_name == "Skill" then
    {ts: $ts, by: "claude", skill: .tool_input.skill, args: ((.tool_input.args // "") | .[0:200]), session: .session_id}
  elif .hook_event_name == "UserPromptSubmit" and ((.prompt // "") | test("^/[A-Za-z0-9:_-]+")) then
    (.prompt | capture("^/(?<cmd>[A-Za-z0-9:_-]+)\\s*(?<rest>.*)"; "s")) as $m
    | {ts: $ts, by: "user", skill: $m.cmd, args: ($m.rest | .[0:200]), session: .session_id}
  else empty end
' >> "$log"
