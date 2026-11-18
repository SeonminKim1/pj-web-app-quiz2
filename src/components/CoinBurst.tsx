// 정답 연출: 동전 몇 개가 이 자리에서 화면 위 골드 배지([data-gold-badge])로 날아간다.
// 장식이라 보조 기술에는 숨기고, 움직임 줄이기 설정이면 날리지 않는다. 도착할 때 "동전" 효과음.
import { useEffect, useRef, type ReactElement } from 'react';
import { playCue } from '../lib/sound.ts';
import styles from './CoinBurst.module.css';

const COINS = 5;

export function CoinBurst(): ReactElement {
  const anchorRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const anchor = anchorRef.current;
    const target = document.querySelector('[data-gold-badge]');
    const reduce = globalThis.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (!anchor || !target || reduce || typeof anchor.animate !== 'function')
      return;
    const from = anchor.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const coins: HTMLElement[] = [];
    const timers: number[] = [];
    for (let i = 0; i < COINS; i++) {
      const coin = document.createElement('span');
      coin.className = styles.coin!;
      // 놀이 영역은 넘치는 부분을 자르므로 화면(body)에 붙여 고정 위치로 날린다.
      coin.style.left = `${from.left + from.width / 2}px`;
      coin.style.top = `${from.top + from.height / 2}px`;
      document.body.append(coin);
      coins.push(coin);
      // 처음에 조금 흩어졌다가 배지로 모인다.
      const spread = (i - (COINS - 1) / 2) * 22;
      const lift = -30 - (i % 2) * 18;
      const delay = i * 60;
      coin.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.85)', opacity: 0 },
          {
            transform: `translate(calc(-50% + ${spread}px), calc(-50% + ${lift}px)) scale(1.1)`,
            opacity: 1,
            offset: 0.3,
          },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`,
            opacity: 1,
            offset: 0.95,
          },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`,
            opacity: 0,
          },
        ],
        {
          duration: 760,
          delay,
          easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
          fill: 'both',
        },
      );
      if (i === 0)
        timers.push(window.setTimeout(() => playCue('coin'), delay + 720));
    }
    return () => {
      for (const timer of timers) clearTimeout(timer);
      for (const coin of coins) coin.remove();
    };
  }, []);
  return <span ref={anchorRef} className={styles.anchor} aria-hidden="true" />;
}
