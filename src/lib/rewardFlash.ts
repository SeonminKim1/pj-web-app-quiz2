// 결과 화면에서 새 보상을 보여 준 뒤 스티커첩으로 돌아가면 그 칸을 한 번 반짝인다(설계 D7).
// 화면을 건너 전하는 한 번짜리 값이라 저장하지 않고 메모리에만 둔다.
let pending: string | undefined;

/** 반짝일 보상 id를 남긴다(결과 화면). */
export function flashOnAlbum(rewardId: string): void {
  pending = rewardId;
}

/** 남은 반짝임(스티커첩이 처음 그릴 때 읽는다). */
export function peekAlbumFlash(): string | undefined {
  return pending;
}

/** 반짝임을 썼다. */
export function clearAlbumFlash(): void {
  pending = undefined;
}
