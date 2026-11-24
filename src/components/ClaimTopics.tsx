// 들어갈 수 있는 주제의 파일을 모두 읽어 다 푼 판의 보상을 기록한다(useTopicRounds가 기록까지 한다).
// 모자 시트(PetPicker)와 놀이터(YardPage)가 연 동안 쓴다(설계 D29, D15). 그리는 것은 없고,
// 못 읽은 주제가 있으면 onFailure로 "다시" 함수를 알린다(모두 다시 읽음, F6).
import { useEffect, useRef, type ReactElement } from 'react';
import { useTopicRounds } from '../hooks/useTopicRounds.ts';
import { QUIZ_TOPICS, isEnterableTopic } from '../lib/quizTopics.ts';
import type { QuizTopic } from '../types/quiz.ts';

const CLAIM_TOPICS: readonly QuizTopic[] = QUIZ_TOPICS.filter(
  (topic) => isEnterableTopic(topic) && topic.rewards !== undefined,
);

export function ClaimTopics({
  onFailure,
}: {
  /** 못 읽은 주제가 생기면 다시 읽기 함수, 모두 읽었으면 undefined. */
  onFailure?: (retry: (() => void) | undefined) => void;
}): ReactElement {
  // 주제마다 못 읽었으면 그 주제의 다시 읽기.
  const failed = useRef(new Map<string, () => void>());
  const report = (topicId: string, retry: (() => void) | undefined): void => {
    if (retry) failed.current.set(topicId, retry);
    else failed.current.delete(topicId);
    const retries = [...failed.current.values()];
    onFailure?.(
      retries.length > 0 ? () => retries.forEach((run) => run()) : undefined,
    );
  };
  return (
    <>
      {CLAIM_TOPICS.map((topic) => (
        <ClaimTopic key={topic.id} topic={topic} onReport={report} />
      ))}
    </>
  );
}

function ClaimTopic({
  topic,
  onReport,
}: {
  topic: QuizTopic;
  onReport: (topicId: string, retry: (() => void) | undefined) => void;
}): null {
  const { state, retry } = useTopicRounds(topic);
  const error = state.status === 'error';
  const reportRef = useRef(onReport);
  useEffect(() => {
    reportRef.current = onReport;
  });
  useEffect(() => {
    reportRef.current(topic.id, error ? retry : undefined);
  }, [topic.id, error, retry]);
  return null;
}
