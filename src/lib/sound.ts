// 효과음·진동(설정에서 켜야 난다, 기본 꺼짐). 소리 파일 없이 Web Audio로 짧게 합성한다.
// 브라우저는 사용자 동작 뒤에만 소리를 허락하므로, 켤 때와 첫 탭에서 AudioContext를 깨운다.
// 어떤 이유로든 실패하면 조용히 넘어간다(풀이를 막지 않음).

export type Cue =
  | 'correct'
  | 'wrong'
  | 'coin'
  | 'levelUp'
  | 'treat'
  | 'hint'
  | 'flee'
  | 'grab'
  | 'drop'
  | 'plop'
  | 'share';

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
  /** 'noise'는 흰 소음을 freq 주변만 걸러 낸 소리(종이·바스락·쿵). */
  type?: OscillatorType | 'noise';
  gain?: number;
  /** 끝 음높이(미끄러지는 소리). 소음이면 거르는 주파수가 미끄러진다. */
  to?: number;
};

/** 소리 이름 → 음 목록과 진동. 동작마다 그 동작처럼 들리게 만든다. */
const CUES: Record<Cue, { notes: Note[]; vibrate?: number | number[] }> = {
  // 정답: 맑은 종소리 도-미-솔-도 아르페지오.
  correct: {
    notes: [523.25, 659.25, 783.99, 1046.5].map((freq, i) => ({
      freq,
      at: i * 0.06,
      dur: 0.32 - i * 0.03,
      type: 'triangle' as const,
      gain: 0.12,
    })),
    vibrate: 30,
  },
  // 오답: "삐빅" 장난스러운 낮은 두 번.
  wrong: {
    notes: [
      { freq: 220, at: 0, dur: 0.09, type: 'square', gain: 0.05 },
      { freq: 180, to: 140, at: 0.12, dur: 0.16, type: 'square', gain: 0.05 },
    ],
    vibrate: [40, 40, 40],
  },
  // 동전: 짧고 높은 "띵".
  coin: {
    notes: [
      { freq: 1567.98, at: 0, dur: 0.06, type: 'square', gain: 0.05 },
      { freq: 2093, at: 0.06, dur: 0.12, type: 'square', gain: 0.05 },
    ],
  },
  // 칭호: 도미솔도 팡파르.
  levelUp: {
    notes: [523.25, 659.25, 783.99, 1046.5].map((freq, i) => ({
      freq,
      at: i * 0.09,
      dur: 0.16,
      type: 'triangle' as const,
    })),
    vibrate: [30, 60, 30, 60, 60],
  },
  // 간식: "와삭" 세 번(먹는 연출의 오물오물 세 번에 맞춘다: 0.2초 뒤부터 0.26초 간격).
  treat: {
    notes: [0.2, 0.46, 0.72].map((at) => ({
      freq: 2400,
      to: 1200,
      at,
      dur: 0.07,
      type: 'noise' as const,
      gain: 0.35,
    })),
    vibrate: [20, 240, 20, 240, 20],
  },
  // 힌트 카드 뒤집기: 종이 "촤락" + 반짝.
  hint: {
    notes: [
      { freq: 3000, to: 900, at: 0, dur: 0.12, type: 'noise', gain: 0.3 },
      { freq: 1568, at: 0.12, dur: 0.12, type: 'triangle', gain: 0.07 },
      { freq: 2093, at: 0.18, dur: 0.16, type: 'triangle', gain: 0.06 },
    ],
    vibrate: 15,
  },
  // 방해꾼이 잡혀 도망: "뾰로롱" 빠르게 올라가는 소리.
  flee: {
    notes: [
      { freq: 500, to: 1400, at: 0, dur: 0.12, type: 'sine', gain: 0.12 },
      { freq: 900, to: 2000, at: 0.1, dur: 0.12, type: 'sine', gain: 0.09 },
    ],
    vibrate: 20,
  },
  // 방해꾼을 집어 듦: 짧은 "뽁".
  grab: {
    notes: [{ freq: 900, to: 300, at: 0, dur: 0.07, type: 'sine', gain: 0.18 }],
    vibrate: 15,
  },
  // 내려놓음: "쿵" 하고 "빙글빙글" 어지러운 소리.
  drop: {
    notes: [
      { freq: 160, to: 60, at: 0, dur: 0.14, type: 'sine', gain: 0.25 },
      { freq: 600, at: 0.15, dur: 0.1, type: 'sine', gain: 0.05 },
      { freq: 500, at: 0.25, dur: 0.1, type: 'sine', gain: 0.05 },
      { freq: 600, at: 0.35, dur: 0.1, type: 'sine', gain: 0.05 },
      { freq: 450, at: 0.45, dur: 0.14, type: 'sine', gain: 0.04 },
    ],
    vibrate: [30, 30, 10],
  },
  // 문제 위에 털썩 앉음.
  plop: {
    notes: [
      { freq: 400, to: 120, at: 0, dur: 0.1, type: 'noise', gain: 0.25 },
      { freq: 220, to: 150, at: 0, dur: 0.12, type: 'sine', gain: 0.12 },
    ],
  },
  // 공유 완료: "슝" 날아가는 소리.
  share: {
    notes: [
      { freq: 600, to: 4000, at: 0, dur: 0.22, type: 'noise', gain: 0.2 },
      { freq: 784, to: 1568, at: 0.05, dur: 0.18, type: 'sine', gain: 0.06 },
    ],
  },
};

let noiseBuffer: AudioBuffer | undefined;

/** 0.5초짜리 흰 소음(한 번 만들어 두고 다시 쓴다). */
function noise(c: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === c.sampleRate)
    return noiseBuffer;
  const length = Math.floor(c.sampleRate * 0.5);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

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
      const amp = ctx.createGain();
      const start = now + note.at;
      const end = start + note.dur;
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(note.gain ?? 0.1, start + 0.01);
      amp.gain.exponentialRampToValueAtTime(0.0001, end);
      amp.connect(ctx.destination);
      if (note.type === 'noise') {
        const src = ctx.createBufferSource();
        src.buffer = noise(ctx);
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.Q.value = 1.2;
        band.frequency.setValueAtTime(note.freq, start);
        if (note.to) band.frequency.exponentialRampToValueAtTime(note.to, end);
        src.connect(band).connect(amp);
        src.start(start);
        src.stop(end + 0.02);
        continue;
      }
      const osc = ctx.createOscillator();
      osc.type = note.type ?? 'sine';
      osc.frequency.setValueAtTime(note.freq, start);
      if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, end);
      osc.connect(amp);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch {
    // 소리 장치 오류는 무시.
  }
}
