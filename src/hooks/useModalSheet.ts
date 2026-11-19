// 아래에서 올라오는 시트(aria-modal)의 키보드 규칙을 한 곳에서: 열리면 시트에 포커스, Tab은 시트 안에서만 돌고,
// Esc는 포커스가 어디 있든 닫는다. 닫힐 때 포커스 되돌리기는 여는 쪽이 한다(MbtiGuide, SettingsButton).
import { useEffect, useRef, type RefObject } from 'react';

export function useModalSheet(
  onClose: () => void,
): RefObject<HTMLDivElement | null> {
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => sheetRef.current?.focus(), []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [
        ...sheet.querySelectorAll<HTMLElement>('button, a[href]'),
      ];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (
        event.shiftKey &&
        (active === first || active === sheet || !sheet.contains(active))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !sheet.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return sheetRef;
}
