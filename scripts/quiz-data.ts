// 퀴즈 데이터 명령: npm run quiz-data(검사 → 생성) | npm run quiz-data:check(검사만)
// 프로젝트 루트에서 실행한다. 형식은 README.md "문제 데이터"에 있다.
import { formatQuizDataError, isQuizDataError } from './quiz-data/errors.ts';
import { readTopicFiles, replaceJsonFiles } from './quiz-data/io.ts';
import { buildQuizOutputs, playableWarnings } from './quiz-data/outputs.ts';
import { readPreviousRegistry, readRegistry } from './share/io.ts';
import { checkShareData, formatShareProblem } from './share/registry.ts';
import type { QuizItem } from '../src/types/quiz.ts';

const DATA_DIR = 'data';
const OUTPUT_DIR = 'public/data/quiz';

/** 주제 파일을 읽어 검사하고 생성 결과를 만든다. 깨진 JSON도 다른 위반과 함께 한 번에 보고한다. */
async function loadAndBuild(): Promise<ReturnType<typeof buildQuizOutputs>> {
  const { files, problems: readProblems } = await readTopicFiles(DATA_DIR);
  const outputs = buildQuizOutputs({ files, readProblems });
  await checkShare(files['nonsense.json'] as QuizItem[]);
  return outputs;
}

/** 공유 카드 검사(등록부·정답 노출·글자 배치). 위반은 모두 출력하고 실패한다. */
async function checkShare(items: QuizItem[]): Promise<void> {
  const { entries, problems: shape } = await readRegistry();
  const problems = [
    ...shape,
    ...checkShareData({
      items,
      registry: entries,
      previousRegistry: await readPreviousRegistry(),
    }),
  ];
  if (problems.length === 0) return;
  for (const problem of problems) console.error(formatShareProblem(problem));
  throw new ShareCheckFailed(problems.length);
}

class ShareCheckFailed extends Error {
  constructor(count: number) {
    super(`공유 카드 검사 위반 ${count}건`);
  }
}

/** 검사 → public/data/quiz/에 생성. */
async function build(): Promise<void> {
  const { manifest, topicFiles } = await loadAndBuild();
  await replaceJsonFiles({
    dir: OUTPUT_DIR,
    files: { 'manifest.json': manifest, ...topicFiles },
  });
  console.log(`퀴즈 데이터 생성 완료 → ${OUTPUT_DIR}/`);
  printSummary(manifest);
}

/** 검사만(파일을 쓰지 않음). */
async function check(): Promise<void> {
  const { manifest } = await loadAndBuild();
  console.log('퀴즈 데이터 검사 통과');
  printSummary(manifest);
}

// 주제별 문제 수·카테고리와 경고를 출력한다.
function printSummary(
  manifest: ReturnType<typeof buildQuizOutputs>['manifest'],
): void {
  for (const topic of manifest.topics) {
    const categories = topic.categories
      ? ` (${topic.categories.map((c) => `${c.name} ${c.count}`).join(', ')})`
      : '';
    console.log(`  ${topic.label}: ${topic.count}문제${categories}`);
  }
  for (const warning of playableWarnings(manifest)) {
    console.warn(`경고: ${warning}`);
  }
}

const COMMANDS: Record<string, () => Promise<void>> = { build, check };

const name = process.argv[2] ?? 'build';
const command = COMMANDS[name];
if (!command) {
  console.error(
    `사용법: tsx scripts/quiz-data.ts <${Object.keys(COMMANDS).join('|')}>`,
  );
  process.exitCode = 1;
} else {
  try {
    await command();
  } catch (error) {
    if (error instanceof ShareCheckFailed) {
      console.error(error.message);
      process.exitCode = 1;
    } else {
      if (!isQuizDataError(error)) throw error;
      console.error(formatQuizDataError(error));
      process.exitCode = 1;
    }
  }
}
