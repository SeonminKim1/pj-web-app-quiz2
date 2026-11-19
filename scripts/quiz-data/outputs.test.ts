// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildQuizOutputs, playableWarnings } from './outputs.ts';

const MBTI_TYPES = [
  'ISTJ',
  'ISFJ',
  'INFJ',
  'INTJ',
  'ISTP',
  'ISFP',
  'INFP',
  'INTP',
  'ESTP',
  'ESFP',
  'ENFP',
  'ENTP',
  'ESTJ',
  'ESFJ',
  'ENFJ',
  'ENTJ',
];

// 넌센스 n문제 + MBTI 한 카테고리(16문제).
function files(nonsenseCount: number): Record<string, unknown> {
  return {
    'mbti.json': MBTI_TYPES.map((answer, i) => ({
      id: String(i + 1),
      question: `상황 ${i + 1}`,
      answer,
      category: '일상',
    })),
    'nonsense.json': Array.from({ length: nonsenseCount }, (_, i) => ({
      id: String(i + 1),
      question: `질문 ${i + 1}`,
      answer: `정답${i + 1}`,
      hints: ['힌트'],
    })),
  };
}

describe('buildQuizOutputs', () => {
  it('QUIZ_TOPICS 순서로 manifest와 주제 파일을 만든다', () => {
    const { manifest, topicFiles } = buildQuizOutputs({ files: files(30) });

    expect(manifest).toEqual({
      version: 1,
      topics: [
        {
          id: 'nonsense',
          label: '넌센스',
          count: 30,
          file: 'nonsense.json',
          playable: true,
        },
        {
          id: 'mbti',
          label: 'MBTI',
          count: 16,
          file: 'mbti.json',
          playable: true,
          categories: [{ name: '일상', count: 16 }],
        },
      ],
    });
    expect(Object.keys(topicFiles)).toEqual(['nonsense.json', 'mbti.json']);
    expect(topicFiles['nonsense.json']).toMatchObject({
      version: 1,
      topic: 'nonsense',
    });
    expect(topicFiles['nonsense.json']!.items).toHaveLength(30);
  });

  it('카테고리 단위가 아닌 주제는 30문제 미만이면 playable이 아니고 경고한다', () => {
    const { manifest } = buildQuizOutputs({ files: files(29) });

    expect(manifest.topics[0]).toMatchObject({ count: 29, playable: false });
    expect(playableWarnings(manifest)).toEqual([
      '넌센스(nonsense) 29문제: 30문제 미만이라 앱에 나오지 않아요',
    ]);
  });

  it('같은 입력이면 같은 결과다(시각·난수 없음)', () => {
    expect(buildQuizOutputs({ files: files(30) })).toEqual(
      buildQuizOutputs({ files: files(30) }),
    );
  });

  it('검사를 통과하지 못하면 만들지 않고 quiz_data_invalid로 실패한다', () => {
    const bad = files(30);
    (bad['nonsense.json'] as Record<string, unknown>[])[0]!.answer = '';

    expect(() => buildQuizOutputs({ files: bad })).toThrowError(
      expect.objectContaining({ code: 'quiz_data_invalid' }),
    );
  });
});
