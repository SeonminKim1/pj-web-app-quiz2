// 배경음악(설정에서 켜야 난다, 기본 꺼짐). 효과음처럼 소리 파일 없이 Web Audio로 직접 연주한다.
// 곡은 이 앱을 위해 만든 8마디 반복(C–Am–F–G, 108 BPM): 세모파 멜로디 + 사인파 베이스.
// 브라우저는 사용자 동작 뒤에만 소리를 허락하므로 켤 때와 첫 탭에서 깨운다. 탭이 숨겨지면 멈춘다.
// 어떤 이유로든 실패하면 조용히 넘어간다(풀이를 막지 않음).

/** 한 음: MIDI 번호(없으면 쉼표)와 길이(8분음표 개수). */
type Step = readonly [midi: number | null, eighths: number];

const BPM = 108;
const EIGHTH = 60 / BPM / 2;
/** 한 마디 = 8분음표 8개. */
const BAR = 8;

// MIDI: C5=72. 마디마다 길이 합이 8이다(테스트로 막는다).
const C5 = 72;
const n = (semitones: number): number => C5 + semitones;

/** 멜로디 8마디. */
export const MELODY: readonly (readonly Step[])[] = [
  // C
  [
    [n(4), 1],
    [n(7), 1],
    [n(12), 2],
    [n(11), 1],
    [n(7), 1],
    [n(4), 2],
  ],
  // Am
  [
    [n(9), 1],
    [n(12), 1],
    [n(16), 2],
    [n(14), 1],
    [n(12), 1],
    [n(9), 2],
  ],
  // F
  [
    [n(5), 1],
    [n(9), 1],
    [n(12), 1],
    [n(9), 1],
    [n(7), 2],
    [n(5), 1],
    [n(4), 1],
  ],
  // G
  [
    [n(2), 2],
    [n(7), 2],
    [n(11), 2],
    [null, 2],
  ],
  // C
  [
    [n(4), 1],
    [n(7), 1],
    [n(12), 2],
    [n(14), 1],
    [n(16), 1],
    [n(14), 2],
  ],
  // Am
  [
    [n(12), 1],
    [n(11), 1],
    [n(9), 2],
    [n(4), 2],
    [n(9), 2],
  ],
  // F
  [
    [n(5), 1],
    [n(7), 1],
    [n(9), 1],
    [n(12), 1],
    [n(11), 2],
    [n(7), 2],
  ],
  // G → C
  [
    [n(14), 2],
    [n(11), 2],
    [n(12), 4],
  ],
];

/** 베이스: 마디의 근음으로 4분음표 근음–5도–옥타브–5도. */
const BASS_ROOTS = [48, 45, 41, 43, 48, 45, 41, 43]; // C3 A2 F2 G2 ×2

export const BASS: readonly (readonly Step[])[] = BASS_ROOTS.map((root) => [
  [root, 2],
  [root + 7, 2],
  [root + 12, 2],
  [root + 7, 2],
]);

/** 연주할 음 하나(반복 한 바퀴 안의 시작 시각, 초). */
export type MusicEvent = {
  at: number;
  dur: number;
  freq: number;
  voice: 'lead' | 'bass';
};

function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function flatten(
  bars: readonly (readonly Step[])[],
  voice: MusicEvent['voice'],
): MusicEvent[] {
  const events: MusicEvent[] = [];
  let pos = 0;
  for (const bar of bars) {
    for (const [midi, eighths] of bar) {
      if (midi !== null) {
        events.push({
          at: pos * EIGHTH,
          dur: eighths * EIGHTH,
          freq: midiToFreq(midi),
          voice,
        });
      }
      pos += eighths;
    }
  }
  return events;
}

/** 한 바퀴 길이(초). */
export const LOOP_SECONDS = MELODY.length * BAR * EIGHTH;

/** 한 바퀴의 음을 시작 시각 순서로. */
export const EVENTS: readonly MusicEvent[] = [
  ...flatten(MELODY, 'lead'),
  ...flatten(BASS, 'bass'),
].sort((a, b) => a.at - b.at);

/** 앞으로 미리 잡아 둘 시간(초)과 잡는 간격(ms). */
const LOOKAHEAD = 0.3;
const TICK_MS = 100;
/** 전체 음량(효과음보다 작게). */
const VOLUME = 0.32;

let enabled = false;
let ctx: AudioContext | undefined;
let master: GainNode | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
/** 지금 바퀴가 시작한 시각(ctx 시간)과 다음에 잡을 음 번호. */
let loopStart = 0;
let nextIndex = 0;

function audioContext(): AudioContext | undefined {
  if (ctx) return ctx;
  const Ctor =
    globalThis.AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return undefined;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  return ctx;
}

function playNote(
  c: AudioContext,
  out: GainNode,
  e: MusicEvent,
  start: number,
) {
  const osc = c.createOscillator();
  const amp = c.createGain();
  const lead = e.voice === 'lead';
  osc.type = lead ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(e.freq, start);
  const peak = lead ? 0.22 : 0.3;
  const end = start + e.dur * 0.92;
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(peak, start + 0.015);
  // 통통 튀는 느낌: 바로 줄었다가 길게 남는다.
  amp.gain.exponentialRampToValueAtTime(peak * 0.45, start + 0.12);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(amp).connect(out);
  osc.start(start);
  osc.stop(end + 0.02);
}

function schedule(): void {
  const c = ctx;
  const out = master;
  if (!c || !out) return;
  const horizon = c.currentTime + LOOKAHEAD;
  // 한 번에 너무 많이 밀리지 않게(탭이 잠깐 멈췄다 돌아온 경우) 한 바퀴 이상은 건너뛴다.
  if (loopStart + LOOP_SECONDS < c.currentTime) {
    loopStart = c.currentTime;
    nextIndex = 0;
  }
  for (;;) {
    const e = EVENTS[nextIndex];
    if (!e) {
      loopStart += LOOP_SECONDS;
      nextIndex = 0;
      continue;
    }
    const start = loopStart + e.at;
    if (start >= horizon) break;
    if (start >= c.currentTime) playNote(c, out, e, start);
    nextIndex += 1;
  }
}

function shouldPlay(): boolean {
  return enabled && !(typeof document !== 'undefined' && document.hidden);
}

/** 켜져 있고 화면이 보이면 연주를 시작하고, 아니면 멈춘다. */
function sync(): void {
  try {
    if (!shouldPlay()) {
      stop();
      return;
    }
    const c = audioContext();
    if (!c || !master) return;
    if (c.state === 'suspended') void c.resume();
    if (timer !== undefined) return;
    loopStart = c.currentTime + 0.05;
    nextIndex = 0;
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setValueAtTime(master.gain.value, c.currentTime);
    master.gain.linearRampToValueAtTime(VOLUME, c.currentTime + 0.6);
    schedule();
    timer = setInterval(schedule, TICK_MS);
  } catch {
    stop();
  }
}

function stop(): void {
  if (timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
  try {
    if (ctx && master) {
      // 이미 잡아 둔 음(최대 0.3초)은 소리를 줄여서 끝낸다.
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    }
  } catch {
    // 소리 장치 오류는 무시.
  }
}

/** 설정이 바뀔 때 부른다. 켜는 순간(사용자 동작 안)에 소리 장치를 깨운다. */
export function setMusicEnabled(on: boolean): void {
  enabled = on;
  sync();
}

export function isMusicPlaying(): boolean {
  return timer !== undefined;
}

/** 사용자 동작(탭·키) 안에서 불러 소리 장치를 깨운다. 꺼져 있으면 아무것도 안 한다. */
export function unlockMusic(): void {
  if (enabled) sync();
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', sync);
}
