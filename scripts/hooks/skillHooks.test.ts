// @vitest-environment node
// .claude/hooks의 스킬 기록·알림 스크립트를 실제 훅 입력(JSON)으로 돌려 본다(CLAUDE.md "Skill routing").
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const NUDGE = join(ROOT, '.claude/hooks/skill-nudge.sh');
const LOG = join(ROOT, '.claude/hooks/log-skill.sh');

function run(script: string, input: object, projectDir = ROOT): string {
  return execFileSync('bash', [script], {
    input: JSON.stringify(input),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: 'utf8',
  });
}

function nudge(command: string): string {
  return run(NUDGE, {
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_input: { command },
  });
}

describe('skill-nudge.sh', () => {
  it('PR 머지 뒤에는 /canary를 알린다(Claude에게도, 사용자에게도)', () => {
    const out = JSON.parse(nudge('gh pr merge 16 --merge')) as {
      systemMessage: string;
      hookSpecificOutput: { hookEventName: string; additionalContext: string };
    };
    expect(out.systemMessage).toContain('/canary');
    expect(out.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    expect(out.hookSpecificOutput.additionalContext).toContain('/canary');
  });

  it('새 기능 브랜치는 /plan-eng-review, 다른 브랜치·명령은 조용하다', () => {
    expect(nudge('git switch -c feat/bookmarks')).toContain('/plan-eng-review');
    expect(nudge('git checkout -b feature/x')).toContain('/plan-eng-review');
    expect(nudge('git switch -c fix/typo')).toBe('');
    expect(nudge('ls -la')).toBe('');
    expect(nudge('echo "gh pr merge"x')).toBe('');
  });
});

describe('skill-nudge.sh: 화면 파일 커밋', () => {
  let repo: string;
  afterEach(() => rmSync(repo, { recursive: true, force: true }));

  // 임시 저장소에 파일 하나를 커밋하고 그 저장소 기준으로 알림을 돌린다.
  function commitAndNudge(file: string): string {
    const git = (...args: string[]) =>
      execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
    const target = join(repo, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, 'x');
    git('add', file);
    git(
      '-c',
      'user.name=t',
      '-c',
      'user.email=t@example.test',
      'commit',
      '-qm',
      file,
    );
    return run(
      NUDGE,
      { tool_name: 'Bash', tool_input: { command: 'git commit -m x' } },
      repo,
    );
  }

  it('CSS·컴포넌트 커밋은 /design-review를 알리고, 테스트만 바꾼 커밋은 조용하다', () => {
    repo = mkdtempSync(join(tmpdir(), 'nudge-repo-'));
    execFileSync('git', ['init', '-q', repo]);
    expect(commitAndNudge('src/components/A.module.css')).toContain(
      '/design-review',
    );
    expect(commitAndNudge('src/pages/A.test.tsx')).toBe('');
  });
});

describe('log-skill.sh', () => {
  let dir: string;
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('Skill 호출, SKILL.md 직접 읽기(에이전트 id 포함), /명령을 남기고 다른 읽기는 무시한다', () => {
    dir = mkdtempSync(join(tmpdir(), 'skill-log-'));
    const base = { session_id: 's1' };
    run(
      LOG,
      {
        ...base,
        hook_event_name: 'PostToolUse',
        tool_name: 'Skill',
        tool_input: { skill: 'qa', args: 'site' },
      },
      dir,
    );
    run(
      LOG,
      {
        ...base,
        hook_event_name: 'PostToolUse',
        tool_name: 'Read',
        tool_input: { file_path: '/p/.claude/skills/gstack/qa/SKILL.md' },
        agent_id: 'a1',
        agent_type: 'general-purpose',
      },
      dir,
    );
    run(
      LOG,
      {
        ...base,
        hook_event_name: 'PostToolUse',
        tool_name: 'Read',
        tool_input: { file_path: '/p/README.md' },
      },
      dir,
    );
    run(
      LOG,
      { ...base, hook_event_name: 'UserPromptSubmit', prompt: '/ship now' },
      dir,
    );
    const rows = readFileSync(join(dir, '.gstack/skill-log.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(rows.map(({ by, skill, agent }) => ({ by, skill, agent }))).toEqual([
      { by: 'claude', skill: 'qa', agent: null },
      { by: 'read', skill: 'qa', agent: 'a1' },
      { by: 'user', skill: 'ship', agent: null },
    ]);
  });
});
