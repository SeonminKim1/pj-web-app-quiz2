// npm run register-ids [-- --dry-run]
// 아직 등록부에 없는 공유 대상(shareable: true) id를 등록한다. 로컬에서만 돌리고, 바뀐 등록부를 커밋한다.
// 다시 돌려도 아무것도 바뀌지 않는다. 정답이 바뀐 공개 id가 있으면 아무것도 쓰지 않고 실패한다.
import { readFile } from 'node:fs/promises';
import type { QuizItem } from '../src/types/quiz.ts';
import { readRegistry, writeRegistry } from './share/io.ts';
import {
  REGISTRY_FILE,
  formatShareProblem,
  planRegistration,
} from './share/registry.ts';

function localDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const dryRun = process.argv.includes('--dry-run');
const items = JSON.parse(
  await readFile('data/nonsense.json', 'utf8'),
) as QuizItem[];
const { entries, problems: shape } = await readRegistry();
if (shape.length > 0) {
  for (const problem of shape) console.error(formatShareProblem(problem));
  console.error('side effects: none');
  process.exitCode = 1;
} else {
  const plan = planRegistration({
    items,
    registry: entries,
    today: localDate(),
  });
  if (!plan.ok) {
    for (const problem of plan.problems)
      console.error(formatShareProblem(problem));
    console.error('side effects: none');
    process.exitCode = 1;
  } else {
    const list = plan.added.length > 0 ? `${plan.added.join(', ')} ` : '';
    console.log(
      `added: ${list}(${plan.added.length}) / unchanged: ${plan.unchanged}`,
    );
    if (dryRun) console.log('dry run: 파일을 쓰지 않았어요');
    else if (plan.added.length > 0) {
      await writeRegistry(plan.next);
      console.log(`→ ${REGISTRY_FILE}를 커밋하세요`);
    }
  }
}
