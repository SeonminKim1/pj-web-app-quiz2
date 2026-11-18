/** 0 이상 1 미만의 난수를 돌려주는 함수(Math.random과 같은 모양). 테스트에서 고정값을 주입한다. */
export type RandomFn = () => number;

/** min 이상 max 이하의 무작위 정수. 난수 함수가 1 이상을 돌려줘도 max를 넘지 않는다. */
export function randomIntBetween({
  min,
  max,
  random,
}: {
  min: number;
  max: number;
  random: RandomFn;
}): number {
  return Math.min(max, min + Math.floor(random() * (max - min + 1)));
}
