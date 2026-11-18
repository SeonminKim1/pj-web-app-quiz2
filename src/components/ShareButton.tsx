// "친구한테 내기" 버튼(풀이 화면 힌트 줄 왼쪽). 문제 하나 화면과 스테이지 화면이 같이 쓴다.
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
      <ShareIcon size={16} />
      친구한테 내기
    </button>
  );
}
