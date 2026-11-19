#!/bin/bash
# 스킬 사용 이력: 한 줄씩 .gstack/skill-log.jsonl에 남긴다(git 무시 폴더). 실패해도 작업을 막지 않는다.
#   by=claude  Claude가 Skill 도구를 부름(PostToolUse Skill)
#   by=read    누군가 SKILL.md를 직접 읽음(PostToolUse Read). 서브에이전트는 Skill 도구 대신 이렇게 스킬을 쓴다.
#   by=user    사용자가 /명령을 입력(UserPromptSubmit)
# agent: 서브에이전트에서 일어났으면 그 에이전트 id·종류(훅 입력에 있을 때만). 메인 대화면 null.
# gstack 자체 기록(~/.gstack/projects/<slug>/timeline.jsonl)에는 스킬 시작·끝이 남는다. 보고할 때 둘을 함께 본다.
log="${CLAUDE_PROJECT_DIR:-$PWD}/.gstack/skill-log.jsonl"
mkdir -p "$(dirname "$log")"
# 경로의 홈 디렉터리는 ~로 줄여 남긴다(사용자 이름이 로그에 박히지 않게).
jq -c --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg home "$HOME" '
  {agent: (.agent_id // null), agent_type: (.agent_type // null), session: .session_id} as $who
  | if .hook_event_name == "PostToolUse" and .tool_name == "Skill" then
      {ts: $ts, by: "claude", skill: .tool_input.skill, args: ((.tool_input.args // "") | .[0:200])} + $who
    elif .hook_event_name == "PostToolUse" and .tool_name == "Read"
      and ((.tool_input.file_path // "") | test("/SKILL\\.md$")) then
      {ts: $ts, by: "read", skill: (.tool_input.file_path | split("/") | .[-2]), args: (.tool_input.file_path | if startswith($home + "/") then "~" + .[($home | length):] else . end)} + $who
    elif .hook_event_name == "UserPromptSubmit" and ((.prompt // "") | test("^/[A-Za-z0-9:_-]+")) then
      (.prompt | capture("^/(?<cmd>[A-Za-z0-9:_-]+)\\s*(?<rest>.*)"; "s")) as $m
      | {ts: $ts, by: "user", skill: $m.cmd, args: ($m.rest | .[0:200])} + $who
    else empty end
' >> "$log"
