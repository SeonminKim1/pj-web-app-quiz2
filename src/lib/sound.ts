// 효과음·진동(설정에서 켜야 난다, 기본 꺼짐). 소리 파일 없이 Web Audio로 짧게 합성한다.
// 브라우저는 사용자 동작 뒤에만 소리를 허락하므로, 켤 때와 첫 탭에서 AudioContext를 깨운다.
// 어떤 이유로든 실패하면 조용히 넘어간다(풀이를 막지 않음).

export type Cue = 'correct' | 'wrong' | 'coin' | 'levelUp' | 'treat' | 'hint';

let enabled = false;
let ctx: AudioContext | undefined;

/** 설정이 바뀔 때 부른다. 켜는 순간(사용자 동작 안)에 소리 장치를 깨운다. */
export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (on) unlockSound();
}

export function isSoundEnabled(): boolean {
  return enabled;
}

/** 사용자 동작(탭·키) 안에서 불러 소리 장치를 깨운다. 꺼져 있으면 아무것도 안 한다. */
export function unlockSound(): void {
  if (!enabled) return;
  try {
    const Ctor =
      globalThis.AudioContext ??
      (globalThis as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = undefined;
  }
}

type Note = {
  freq: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  /** 끝 음높이(미끄러지는 소리). */
  to?: number;
};

const CUES: Record<Cue, { notes: Note[]; vibrate?: number | number[] }> = {
  // 띠링: 위로 올라가는 두 음.
  correct: {
    notes: [
      { freq: 880, at: 0, dur: 0.12, type: 'triangle' },
      { freq: 1318.5, at: 0.09, dur: 0.22, type: 'triangle' },
    ],
    vibrate: 30,
  },
  // 뿅: 아래로 미끄러지는 낮은 음.
  wrong: {
    notes: [
      { freq: 320, to: 150, at: 0, dur: 0.22, type: 'square', gain: 0.06 },
    ],
    vibrate: [40, 40, 40],
  },
  // 동전: 짧고 높은 두 번.
  coin: {
    notes: [
      { freq: 1567.98, at: 0, dur: 0.06, type: 'square', gain: 0.05 },
      { freq: 2093, at: 0.06, dur: 0.12, type: 'square', gain: 0.05 },
    ],
  },
  // 칭호: 도미솔도.
  levelUp: {
    notes: [523.25, 659.25, 783.99, 1046.5].map((freq, i) => ({
      freq,
      at: i * 0.09,
      dur: 0.16,
      type: 'triangle' as const,
    })),
    vibrate: [30, 60, 30, 60, 60],
  },
  // 촤락: 카드 뒤집는 짧은 미끄럼 + 반짝.
  hint: {
    notes: [
      { freq: 520, to: 1040, at: 0, dur: 0.1, type: 'sine', gain: 0.1 },
      { freq: 1568, at: 0.1, dur: 0.14, type: 'triangle', gain: 0.07 },
    ],
    vibrate: 15,
  },
  // 냠냠: 낮게 두 번.
  treat: {
    notes: [
      { freq: 392, to: 330, at: 0, dur: 0.1, type: 'sine', gain: 0.14 },
      { freq: 392, to: 330, at: 0.16, dur: 0.1, type: 'sine', gain: 0.14 },
    ],
    vibrate: [20, 60, 20],
  },
};

/** 효과음 하나(+진동). 꺼져 있거나 준비가 안 됐으면 아무것도 안 한다. */
export function playCue(cue: Cue): void {
  if (!enabled) return;
  const { notes, vibrate } = CUES[cue];
  if (vibrate !== undefined) {
    try {
      globalThis.navigator?.vibrate?.(vibrate);
    } catch {
      // 진동이 없는 기기.
    }
  }
  if (!ctx || ctx.state !== 'running') return;
  try {
    const now = ctx.currentTime;
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      const start = now + note.at;
      const end = start + note.dur;
      osc.type = note.type ?? 'sine';
      osc.frequency.setValueAtTime(note.freq, start);
      if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, end);
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(note.gain ?? 0.1, start + 0.01);
      amp.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(amp).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch {
    // 소리 장치 오류는 무시.
  }
}
