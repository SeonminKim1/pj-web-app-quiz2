// "친구한테 내기": 문제 카드 오른쪽 위 테두리에 걸친 작은 태그(왼쪽 Q 번호 태그와 짝). 문제 하나 화면과 스테이지 화면이 같이 쓴다.
// 카드(position: relative) 안에 둔다.
import type { ReactElement } from 'react';
import { ShareIcon } from './ShareIcon.tsx';
import styles from './ShareButton.module.css';

export function ShareButton({
  onClick,
}: {
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      className={styles.button}
      aria-label="친구한테 이 문제 내기"
      onClick={onClick}
    >
      <ShareIcon size={14} />
      친구한테 내기
    </button>
  );
}
