// npm run register-ids [-- --dry-run]
// 공유 주제마다(넌센스, MBTI …) 아직 등록부에 없는 공유 대상(shareable: true) id를 등록한다.
// 로컬에서만 돌리고, 바뀐 등록부를 커밋한다. 다시 돌려도 아무것도 바뀌지 않는다.
// 한 주제라도 형식이 틀리거나 정답이 바뀐 공개 id가 있으면 아무것도 쓰지 않고 실패한다.
import { readFile } from 'node:fs/promises';
import type { QuizItem } from '../src/types/quiz.ts';
import { readRegistry, writeRegistry } from './share/io.ts';
import {
  formatShareProblem,
  planRegistration,
  type RegistryEntry,
  type ShareProblem,
} from './share/registry.ts';
import { SHARE_SETUPS, type ShareSetup } from './share/topics.ts';

function localDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

type Plan = {
  setup: ShareSetup;
  next: RegistryEntry[];
  added: string[];
  unchanged: number;
};

const dryRun = process.argv.includes('--dry-run');
const problems: ShareProblem[] = [];
const plans: Plan[] = [];
for (const setup of SHARE_SETUPS) {
  const items = JSON.parse(
    await readFile(setup.dataFile, 'utf8'),
  ) as QuizItem[];
  const { entries, problems: shape } = await readRegistry(setup.registryFile);
  if (shape.length > 0) {
    problems.push(...shape);
    continue;
  }
  const plan = planRegistration({
    items,
    registry: entries,
    today: localDate(),
  });
  if (!plan.ok) problems.push(...plan.problems);
  else plans.push({ setup, ...plan });
}

if (problems.length > 0) {
  for (const problem of problems) console.error(formatShareProblem(problem));
  console.error('side effects: none');
  process.exitCode = 1;
} else {
  // 검사는 모두 통과했다. 쓰다가 실패하면(디스크 등) 이미 쓴 등록부를 알려 주고 실패한다.
  const written: string[] = [];
  try {
    for (const { setup, next, added, unchanged } of plans) {
      const list = added.length > 0 ? `${added.join(', ')} ` : '';
      console.log(
        `${setup.topic.label}: added: ${list}(${added.length}) / unchanged: ${unchanged}`,
      );
      if (!dryRun && added.length > 0) {
        await writeRegistry(next, setup.registryFile);
        written.push(setup.registryFile);
        console.log(`→ ${setup.registryFile}를 커밋하세요`);
      }
    }
  } catch (error) {
    console.error(
      `등록부를 쓰다 실패했어요: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error(
      `side effects: ${written.length > 0 ? `${written.join(', ')}는 이미 썼어요(다시 돌리면 나머지만 추가돼요)` : 'none'}`,
    );
    process.exitCode = 1;
  }
  if (dryRun) console.log('dry run: 파일을 쓰지 않았어요');
}
