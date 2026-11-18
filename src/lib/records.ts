/** 값이 배열이 아닌 일반 객체인지 확인한다(JSON 형식 검사용). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
