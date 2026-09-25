/* Procedural audio for the game: a Three Kingdoms flavoured score and interface
   sound effects, all synthesised with the Web Audio API. No audio files are
   bundled or downloaded, so every sound is generated from the score data below. */

export type SfxName =
  | 'click'
  | 'select'
  | 'open'
  | 'close'
  | 'confirm'
  | 'cancel'
  | 'order'
  | 'muster'
  | 'coin'
  | 'march'
  | 'clash'
  | 'capture'
  | 'turn'
  | 'win'
  | 'lose'
  | 'error';

export type Voice = 'pluck' | 'lead' | 'bass' | 'bell' | 'gong' | 'drum' | 'arpeggio';

export type MusicNote = {
  /** Offset inside the bar, in beats. */
  beat: number;
  /** Semitone offset from the score root; percussion uses it as a pitch hint. */
  semitone: number;
  /** Duration in beats. */
  beats: number;
  voice: Voice;
  gain: number;
};

export type MusicBar = { notes: MusicNote[] };

export type Score = {
  bpm: number;
  beatsPerBar: number;
  rootHz: number;
  /** One pass of the loop; the scheduler repeats it. */
  bars: MusicBar[];
};

export const AUDIO_STORAGE_KEY = 'sanguo-jiangshan-audio';

/** D3; the score sits on the 宮商角徵羽 pentatonic shape used by Chinese court music. */
export const MUSIC_ROOT_HZ = 146.83;

/** D, F, G, A, C — a minor-pentatonic set that keeps every voice consonant. */
export const PENTATONIC = [0, 3, 5, 7, 10];

export const SCORE_BPM = 76;

const MELODY_A: Voice = 'pluck';
const MELODY_B: Voice = 'lead';

export function semitoneToHz(rootHz: number, semitone: number) {
  return rootHz * Math.pow(2, semitone / 12);
}

export function inPentatonic(semitone: number) {
  const pitch = ((semitone % 12) + 12) % 12;
  return PENTATONIC.includes(pitch);
}

type RawNote = [beat: number, semitone: number, beats: number];

function bar(notes: RawNote[], voice: Voice, gain: number): MusicBar {
  return {
    notes: notes.map(([beat, semitone, beats]) => ({ beat, semitone, beats, voice, gain })),
  };
}

function percussion(offset: number, semitone: number, gain = 0.2): MusicNote {
  return { beat: offset, semitone, beats: 0.5, voice: 'drum', gain };
}

/* ---------- score ---------- */

/** Four two-bar phrases in the lower register: the opening statement of the theme. */
const PHRASE_A: RawNote[][] = [
  [
    [0, 19, 1],
    [1, 17, 0.5],
    [1.5, 15, 0.5],
    [2, 12, 2],
  ],
  [
    [0, 15, 1],
    [1, 17, 1],
    [2, 19, 2],
  ],
  [
    [0, 22, 1],
    [1, 19, 0.5],
    [1.5, 17, 0.5],
    [2, 15, 2],
  ],
  [
    [0, 17, 1],
    [1, 15, 1],
    [2, 12, 2],
  ],
];

/** The answering phrases move up an octave and push the rhythm forward. */
const PHRASE_B: RawNote[][] = [
  [
    [0, 19, 1],
    [1, 22, 1],
    [2, 24, 2],
  ],
  [
    [0, 22, 1],
    [1, 19, 1],
    [2, 17, 2],
  ],
  [
    [0, 15, 0.5],
    [0.5, 17, 0.5],
    [1, 19, 1],
    [2, 22, 1],
    [3, 19, 1],
  ],
  [
    [0, 17, 2],
    [2, 15, 1],
    [3, 12, 1],
  ],
];

/** Section B: the same mode, an octave higher, phrased as a bowed line. */
const PHRASE_C: RawNote[][] = [
  [
    [0, 31, 0.5],
    [0.5, 29, 0.5],
    [1, 27, 1],
    [2, 24, 2],
  ],
  [
    [0, 27, 1],
    [1, 29, 1],
    [2, 31, 1],
    [3, 34, 1],
  ],
  [
    [0, 31, 1.5],
    [1.5, 29, 0.5],
    [2, 27, 2],
  ],
  [
    [0, 24, 1],
    [1, 27, 1],
    [2, 29, 2],
  ],
  [
    [0, 34, 1],
    [1, 31, 1],
    [2, 29, 1],
    [3, 27, 1],
  ],
  [
    [0, 29, 2],
    [2, 31, 1],
    [3, 29, 1],
  ],
  [
    [0, 27, 1],
    [1, 29, 1],
    [2, 31, 2],
  ],
  [[0, 24, 3]],
];

/** Bridge: thin texture that hands the loop back to the opening phrase. */
const PHRASE_D: RawNote[][] = [
  [
    [0, 12, 2],
    [2, 15, 2],
  ],
  [
    [0, 17, 2],
    [2, 19, 2],
  ],
  [
    [0, 22, 1],
    [1, 19, 1],
    [2, 17, 2],
  ],
  [
    [0, 15, 1],
    [1, 12, 3],
  ],
];

const A_BASS = [-12, -12, -7, -7, -5, -5, -12, -12];
const B_BASS = [-12, -12, -9, -9, -7, -7, -5, -12];

/** Root on the downbeat, its octave on beat three: a slow, ceremonial pulse. */
function bassBar(root: number): MusicBar {
  return {
    notes: [
      { beat: 0, semitone: root, beats: 2, voice: 'bass', gain: 0.16 },
      { beat: 2, semitone: root + 12, beats: 2, voice: 'bass', gain: 0.1 },
    ],
  };
}

/** Broken chord figure for the pipa-like middle voice. */
function arpeggioBar(root: number, gain = 0.05): MusicBar {
  // Figuration is drawn from the mode itself, so it stays consonant over every
  // chord root instead of transposing a fixed shape.
  const run = pentatonicRun(root + 12, 5);
  const shape = [0, 1, 2, 3, 2, 1, 2, 0];
  return {
    notes: shape.map((step, position) => ({
      beat: position * 0.5,
      semitone: run[step],
      beats: 0.5,
      voice: 'arpeggio',
      gain,
    })),
  };
}

/** Ascending pentatonic pitches from `from`, used to keep figuration in the mode. */
function pentatonicRun(from: number, steps: number) {
  const out: number[] = [];
  let octave = Math.floor(from / 12) * 12;
  let index = PENTATONIC.findIndex((pitch) => octave + pitch >= from);
  if (index < 0) {
    index = 0;
    octave += 12;
  }
  while (out.length < steps) {
    out.push(octave + PENTATONIC[index]);
    index += 1;
    if (index === PENTATONIC.length) {
      index = 0;
      octave += 12;
    }
  }
  return out;
}

function drumBar(dense: boolean, roll = false): MusicBar {
  const notes = roll
    ? [percussion(2, -12, 0.12), percussion(2.5, -12, 0.14), percussion(3, -12, 0.17), percussion(3.5, -12, 0.2)]
    : dense
      ? [percussion(0, -12, 0.22), percussion(1.5, -5, 0.12), percussion(2, -12, 0.17), percussion(3.5, -5, 0.13)]
      : [percussion(0, -12, 0.22), percussion(2, -5, 0.12)];
  return { notes };
}

function bellNote(beat: number, semitone: number, gain = 0.13): MusicNote {
  return { beat, semitone, beats: 2, voice: 'bell', gain };
}

function mergeBars(...layers: MusicBar[][]): MusicBar[] {
  return layers.reduce<MusicBar[]>((bars, layer) => {
    layer.forEach((part, index) => {
      bars[index] = { notes: [...(bars[index]?.notes ?? []), ...part.notes] };
    });
    return bars;
  }, []);
}

/** The full loop: A (8 bars) → B (8 bars) → bridge (4 bars), 20 bars at 76 BPM. */
export function buildScore(): Score {
  const melodyA = [...PHRASE_A, ...PHRASE_B].map((phrase) => bar(phrase, MELODY_A, 0.15));
  const melodyB = PHRASE_C.map((phrase) => bar(phrase, MELODY_B, 0.13));
  const melodyD = PHRASE_D.map((phrase) => bar(phrase, MELODY_A, 0.12));

  // The pipa enters in the second half of section A, so the opening stays bare
  // and the loop gains a layer as it develops.
  const aArpeggio = A_BASS.map((root, index) =>
    index >= 4 ? arpeggioBar(root, 0.042) : { notes: [] },
  );
  const dRoots = [-12, -5, -7, -12];

  const bars: MusicBar[] = [
    ...mergeBars(
      melodyA,
      A_BASS.map((root) => bassBar(root)),
      Array.from({ length: 8 }, (_, i) => drumBar(i % 2 === 1)),
      aArpeggio,
    ),
    ...mergeBars(
      melodyB,
      B_BASS.map((root) => bassBar(root)),
      Array.from({ length: 8 }, (_, i) => drumBar(true, i === 7)),
      // A named callback keeps the array index out of the gain parameter.
      B_BASS.map((root) => arpeggioBar(root)),
    ),
    ...mergeBars(
      melodyD,
      dRoots.map((root) => bassBar(root)),
      [drumBar(false), drumBar(false), drumBar(false), drumBar(false, true)],
      dRoots.map((root) => arpeggioBar(root, 0.045)),
    ),
  ];

  bars[0] = { notes: [...bars[0].notes, bellNote(0, 12, 0.12)] };
  bars[7] = { notes: [...bars[7].notes, bellNote(3, 19, 0.11)] };
  bars[15] = { notes: [...bars[15].notes, bellNote(2.5, 24, 0.12)] };
  bars[19] = { notes: [...bars[19].notes, bellNote(1, 19, 0.13)] };

  return { bpm: SCORE_BPM, beatsPerBar: 4, rootHz: MUSIC_ROOT_HZ, bars };
}

/** Loop length in seconds, used by the scheduler and the offline render check. */
export function scoreDuration(score: Score) {
  return (score.bars.length * score.beatsPerBar * 60) / score.bpm;
}

/* ---------- synthesis ---------- */

type Ctx = BaseAudioContext;

function noiseBuffer(ctx: Ctx) {
  const cache = ctx as Ctx & { __noise?: AudioBuffer };
  if (!cache.__noise) {
    const frames = Math.floor(ctx.sampleRate * 0.6);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x2f6e2b1;
    for (let i = 0; i < frames; i++) {
      // Deterministic noise keeps every render of a sound identical.
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (seed / 0x3fffffff - 1) * 0.9;
    }
    cache.__noise = buffer;
  }
  return cache.__noise;
}

function noiseBurst(
  ctx: Ctx,
  dest: AudioNode,
  time: number,
  duration: number,
  gain: number,
  filterHz: number,
  type: BiquadFilterType,
) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = filterHz;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, time);
  amp.gain.linearRampToValueAtTime(gain, time + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(filter).connect(amp).connect(dest);
  source.start(time, Math.random() * 0.2, duration + 0.02);
  source.stop(time + duration + 0.05);
}

/** Plucked string: a few decaying partials plus a short attack transient. */
function pluck(ctx: Ctx, dest: AudioNode, time: number, hz: number, gain: number, duration: number) {
  const partials = [1, 2, 3, 4.5];
  const levels = [1, 0.4, 0.2, 0.08];
  for (let i = 0; i < partials.length; i++) {
    const decay = Math.max(0.3, Math.min(duration, 2.6)) * (1 - i * 0.16);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = hz * partials[i];
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.linearRampToValueAtTime(Math.max(0.0002, gain * levels[i]), time + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    osc.connect(amp).connect(dest);
    osc.start(time);
    osc.stop(time + decay + 0.05);
  }
  noiseBurst(ctx, dest, time, 0.02, gain * 0.35, hz * 5, 'highpass');
}

/** Bowed lead with a slow attack and a light vibrato, for the second section. */
function lead(ctx: Ctx, dest: AudioNode, time: number, hz: number, gain: number, duration: number) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = hz;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = hz * 4.5;
  filter.Q.value = 2.5;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.linearRampToValueAtTime(gain, time + 0.14);
  amp.gain.setValueAtTime(gain, time + Math.max(0.16, duration * 0.72));
  amp.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.3);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.1;
  const depth = ctx.createGain();
  depth.gain.value = hz * 0.006;
  lfo.connect(depth).connect(osc.frequency);

  osc.connect(filter).connect(amp).connect(dest);
  osc.start(time);
  lfo.start(time);
  osc.stop(time + duration + 0.35);
  lfo.stop(time + duration + 0.35);
}

/** Low register support: a soft, sine-heavy tone that does not fight the drums. */
function bass(ctx: Ctx, dest: AudioNode, time: number, hz: number, gain: number, duration: number) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = hz;
  const sub = ctx.createOscillator();
  sub.type = 'triangle';
  sub.frequency.value = hz * 2;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.linearRampToValueAtTime(gain, time + 0.05);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  const subAmp = ctx.createGain();
  subAmp.gain.value = 0.35;
  osc.connect(amp);
  sub.connect(subAmp).connect(amp);
  amp.connect(dest);
  osc.start(time);
  sub.start(time);
  osc.stop(time + duration + 0.05);
  sub.stop(time + duration + 0.05);
}

/** Inharmonic partials give a bronze bell / 編鐘 colour. */
function bell(ctx: Ctx, dest: AudioNode, time: number, hz: number, gain: number, decay = 2.6) {
  const partials = [1, 2.76, 5.4, 8.9];
  const levels = [1, 0.5, 0.26, 0.12];
  partials.forEach((partial, index) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz * partial;
    const amp = ctx.createGain();
    const partialDecay = decay * (1 - index * 0.2);
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.linearRampToValueAtTime(Math.max(0.0002, gain * levels[index]), time + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + partialDecay);
    osc.connect(amp).connect(dest);
    osc.start(time);
    osc.stop(time + partialDecay + 0.05);
  });
}

function drum(ctx: Ctx, dest: AudioNode, time: number, hz: number, gain: number) {
  const low = hz < 90;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(hz * 1.9, time);
  osc.frequency.exponentialRampToValueAtTime(Math.max(36, hz * 0.55), time + 0.16);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.linearRampToValueAtTime(gain, time + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + (low ? 0.46 : 0.26));
  osc.connect(amp).connect(dest);
  osc.start(time);
  osc.stop(time + 0.5);
  noiseBurst(ctx, dest, time, low ? 0.06 : 0.04, gain * 0.3, low ? 800 : 1600, 'lowpass');
}

function voiceFor(voice: Voice) {
  switch (voice) {
    case 'pluck':
      return pluck;
    case 'arpeggio':
      return pluck;
    case 'lead':
      return lead;
    case 'bass':
      return bass;
    case 'bell':
      return bell;
    case 'gong':
      return (ctx: Ctx, dest: AudioNode, time: number, hz: number, gain: number) =>
        bell(ctx, dest, time, hz, gain, 3.4);
    case 'drum':
      return drum;
  }
}

/**
 * Schedules a slice of the score onto any audio graph. The live player and the
 * offline render check both call this, so what is verified is what is heard.
 */
export function scheduleBars(
  ctx: Ctx,
  dest: AudioNode,
  score: Score,
  fromBar: number,
  startTime: number,
  until: number,
) {
  const beatSeconds = 60 / score.bpm;
  let scheduled = 0;
  for (let index = 0; index < score.bars.length; index++) {
    const barIndex = (fromBar + index) % score.bars.length;
    const barStart = startTime + index * score.beatsPerBar * beatSeconds;
    if (barStart >= until) break;
    for (const note of score.bars[barIndex].notes) {
      const time = barStart + note.beat * beatSeconds;
      if (time >= until) continue;
      const seconds = note.beats * beatSeconds;
      if (note.voice === 'drum') {
        drum(ctx, dest, time, semitoneToHz(110, note.semitone), note.gain);
        continue;
      }
      voiceFor(note.voice)(ctx, dest, time, semitoneToHz(score.rootHz, note.semitone), note.gain, seconds);
      scheduled++;
    }
  }
  return scheduled;
}

/* ---------- sound effects ---------- */

function playSfxInto(ctx: Ctx, dest: AudioNode, name: SfxName, time: number) {
  const tone = (semitone: number, offset: number, duration: number, gain: number, voice: Voice = 'pluck') =>
    voiceFor(voice)(ctx, dest, time + offset, semitoneToHz(MUSIC_ROOT_HZ, semitone), gain, duration);

  switch (name) {
    // Interface ticks stay short and quiet so they never mask the score.
    case 'click':
      tone(24, 0, 0.1, 0.05);
      noiseBurst(ctx, dest, time, 0.03, 0.03, 2600, 'highpass');
      break;
    case 'select':
      tone(19, 0, 0.35, 0.07);
      break;
    case 'open':
      tone(12, 0, 0.5, 0.06);
      tone(19, 0.06, 0.5, 0.05);
      break;
    case 'close':
      tone(19, 0, 0.4, 0.05);
      tone(12, 0.05, 0.5, 0.045);
      break;
    case 'confirm':
      tone(19, 0, 0.6, 0.09);
      tone(24, 0.09, 0.8, 0.08);
      tone(31, 0.18, 1, 0.06);
      break;
    case 'cancel':
      tone(17, 0, 0.4, 0.07);
      tone(12, 0.09, 0.6, 0.06);
      break;
    case 'order':
      // A three note flourish: the officer carries out an order.
      tone(12, 0, 0.35, 0.09);
      tone(19, 0.07, 0.35, 0.08);
      tone(22, 0.14, 0.5, 0.075);
      noiseBurst(ctx, dest, time, 0.08, 0.05, 3200, 'highpass');
      break;
    case 'muster':
      for (let i = 0; i < 5; i++)
        drum(ctx, dest, time + i * 0.075, 120 - i * 4, 0.1 + i * 0.035);
      noiseBurst(ctx, dest, time + 0.3, 0.35, 0.09, 1200, 'bandpass');
      break;
    case 'coin':
      bell(ctx, dest, time, semitoneToHz(MUSIC_ROOT_HZ, 31), 0.09, 0.6);
      bell(ctx, dest, time + 0.07, semitoneToHz(MUSIC_ROOT_HZ, 38), 0.07, 0.5);
      break;
    case 'march':
      drum(ctx, dest, time, 70, 0.24);
      drum(ctx, dest, time + 0.22, 62, 0.22);
      drum(ctx, dest, time + 0.44, 55, 0.26);
      tone(-5, 0.02, 1.2, 0.1, 'bass');
      tone(7, 0.44, 1.4, 0.08, 'lead');
      break;
    case 'clash':
      noiseBurst(ctx, dest, time, 0.5, 0.22, 5200, 'highpass');
      noiseBurst(ctx, dest, time + 0.02, 0.35, 0.16, 1800, 'bandpass');
      tone(19, 0, 0.3, 0.08);
      drum(ctx, dest, time, 90, 0.18);
      break;
    case 'capture':
      bell(ctx, dest, time, semitoneToHz(MUSIC_ROOT_HZ, 12), 0.16, 3.2);
      tone(12, 0.05, 0.6, 0.09);
      tone(19, 0.16, 0.6, 0.085);
      tone(24, 0.27, 0.8, 0.08);
      tone(31, 0.38, 1.2, 0.07);
      drum(ctx, dest, time, 60, 0.24);
      break;
    case 'turn':
      bell(ctx, dest, time, semitoneToHz(MUSIC_ROOT_HZ, 0), 0.14, 3);
      drum(ctx, dest, time + 0.02, 62, 0.2);
      break;
    case 'win':
      [12, 19, 24, 31, 36].forEach((semitone, index) =>
        tone(semitone, index * 0.16, 1.4, 0.1),
      );
      bell(ctx, dest, time + 0.6, semitoneToHz(MUSIC_ROOT_HZ, 12), 0.18, 4);
      break;
    case 'lose':
      [19, 15, 12, 5].forEach((semitone, index) => tone(semitone, index * 0.24, 1.6, 0.1));
      drum(ctx, dest, time + 0.1, 55, 0.24);
      bell(ctx, dest, time + 0.9, semitoneToHz(MUSIC_ROOT_HZ, -5), 0.12, 3.4);
      break;
    case 'error':
      tone(-5, 0, 0.35, 0.09, 'lead');
      tone(-4, 0.02, 0.35, 0.08, 'lead');
      drum(ctx, dest, time, 80, 0.12);
      break;
  }
}

/* ---------- live engine ---------- */

type Engine = {
  enabled: boolean;
  ctx: AudioContext | null;
  master: GainNode | null;
  musicBus: GainNode | null;
  sfxBus: GainNode | null;
  timer: number | null;
  bar: number;
  nextBarTime: number;
};

const engine: Engine = {
  enabled: readStoredSound(),
  ctx: null,
  master: null,
  musicBus: null,
  sfxBus: null,
  timer: null,
  bar: 0,
  nextBarTime: 0,
};

const LOOKAHEAD_MS = 60;
const SCHEDULE_AHEAD = 1.2;
const MUSIC_GAIN = 0.34;

export function readStoredSound() {
  try {
    const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (raw === null) return true;
    return raw === 'on';
  } catch {
    return true;
  }
}

function storeSound(enabled: boolean) {
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    /* private mode: the choice simply does not persist */
  }
}

/** Creates the graph on demand; browsers only allow this from a user gesture. */
function graph() {
  if (engine.ctx) return engine.ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const musicBus = ctx.createGain();
  musicBus.gain.value = MUSIC_GAIN;
  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.7;
  musicBus.connect(master);
  sfxBus.connect(master);
  master.connect(ctx.destination);
  engine.ctx = ctx;
  engine.master = master;
  engine.musicBus = musicBus;
  engine.sfxBus = sfxBus;
  return ctx;
}

function scheduleLoop() {
  const ctx = engine.ctx;
  if (!ctx || !engine.musicBus) return;
  const score = cachedScore();
  const barSeconds = (score.beatsPerBar * 60) / score.bpm;
  while (engine.nextBarTime < ctx.currentTime + SCHEDULE_AHEAD) {
    const horizon = engine.nextBarTime + barSeconds;
    scheduleBars(ctx, engine.musicBus, score, engine.bar, engine.nextBarTime, horizon);
    engine.bar = (engine.bar + 1) % score.bars.length;
    engine.nextBarTime += barSeconds;
  }
}

let score: Score | null = null;
function cachedScore() {
  if (!score) score = buildScore();
  return score;
}

export function startMusic() {
  const ctx = graph();
  if (!ctx || !engine.enabled || engine.timer !== null) return;
  void ctx.resume();
  // Re-arm the bus in case a previous stop faded it out.
  if (engine.musicBus) {
    engine.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    engine.musicBus.gain.setValueAtTime(MUSIC_GAIN, ctx.currentTime);
  }
  engine.bar = 0;
  engine.nextBarTime = ctx.currentTime + 0.25;
  engine.timer = window.setInterval(scheduleLoop, LOOKAHEAD_MS);
  scheduleLoop();
}

export function stopMusic() {
  if (engine.timer !== null) {
    window.clearInterval(engine.timer);
    engine.timer = null;
  }
  const ctx = engine.ctx;
  const bus = engine.musicBus;
  if (!ctx || !bus) return;
  // Let the bars already scheduled ring out instead of cutting them off.
  bus.gain.cancelScheduledValues(ctx.currentTime);
  bus.gain.setValueAtTime(bus.gain.value, ctx.currentTime);
  bus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
}

export function setSoundEnabled(enabled: boolean) {
  engine.enabled = enabled;
  storeSound(enabled);
  if (!enabled) stopMusic();
}

export function isSoundEnabled() {
  return engine.enabled;
}

/** Called from the first user gesture: resumes the context and starts the score. */
export function unlockAudio() {
  if (!engine.enabled) return;
  const ctx = graph();
  if (!ctx) return;
  void ctx.resume();
  startMusic();
}

export function playSfx(name: SfxName) {
  if (!engine.enabled) return;
  const ctx = graph();
  if (!ctx || !engine.sfxBus) return;
  if (ctx.state === 'suspended') void ctx.resume();
  playSfxInto(ctx, engine.sfxBus, name, ctx.currentTime + 0.01);
}

/** Renders the score offline; used by the audio check to prove the mix is audible. */
export function renderScoreOffline(context: OfflineAudioContext, seconds: number) {
  const master = context.createGain();
  master.gain.value = 0.9;
  master.connect(context.destination);
  return scheduleBars(context, master, cachedScore(), 0, 0.1, seconds);
}

export function renderSfxOffline(context: OfflineAudioContext, name: SfxName) {
  const master = context.createGain();
  master.gain.value = 0.8;
  master.connect(context.destination);
  playSfxInto(context, master, name, 0.05);
}
