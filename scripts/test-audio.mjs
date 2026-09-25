import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['src/game/audio.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
});
const A = await import(
  'data:text/javascript;base64,' +
    Buffer.from(bundle.outputFiles[0].text).toString('base64')
);

/** Minimal Web Audio stand-in that records the graph the synthesis code builds. */
function stubContext() {
  const created = [];
  const node = (kind) => {
    created.push(kind);
    const params = { value: 0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, cancelScheduledValues: () => {} };
    return {
      kind,
      frequency: { ...params },
      gain: { ...params },
      Q: { ...params },
      detune: { ...params },
      type: '',
      buffer: null,
      onended: null,
      connect: (destination) => destination,
      disconnect: () => {},
      start: () => {},
      stop: () => {},
    };
  };
  return {
    created,
    sampleRate: 44100,
    currentTime: 0,
    destination: node('destination'),
    createGain: () => node('gain'),
    createOscillator: () => node('oscillator'),
    createBiquadFilter: () => node('filter'),
    createBufferSource: () => node('bufferSource'),
    createBuffer: (channels, frames) => ({
      length: frames,
      getChannelData: () => new Float32Array(frames),
    }),
    resume: async () => {},
  };
}

const SFX_NAMES = [
  'click',
  'select',
  'open',
  'close',
  'confirm',
  'cancel',
  'order',
  'muster',
  'coin',
  'march',
  'clash',
  'capture',
  'turn',
  'win',
  'lose',
  'error',
];

test('score is a 20-bar loop in the pentatonic mode with a bass and drum pulse', () => {
  const score = A.buildScore();
  assert.equal(score.bars.length, 20);
  assert.equal(score.beatsPerBar, 4);
  assert.equal(score.bpm, A.SCORE_BPM);
  assert.equal(score.rootHz, A.MUSIC_ROOT_HZ);
  for (const [index, bar] of score.bars.entries()) {
    assert(bar.notes.length > 0, `bar ${index} is empty`);
    assert(
      bar.notes.some((note) => note.voice === 'drum'),
      `bar ${index} has no percussion`,
    );
    assert(
      bar.notes.some((note) => note.voice !== 'drum'),
      `bar ${index} has no pitched voice`,
    );
    assert(
      bar.notes.some((note) => note.voice === 'bass'),
      `bar ${index} has no bass`,
    );
    for (const note of bar.notes) {
      assert(Number.isFinite(note.beat) && note.beat >= 0 && note.beat < 4);
      assert(Number.isFinite(note.beats) && note.beats > 0 && note.beats <= 4);
      assert(note.gain > 0 && note.gain <= 0.5, `gain ${note.gain} out of range`);
    }
  }
});

test('every pitched note stays inside the 宮商角徵羽 pentatonic set', () => {
  const score = A.buildScore();
  assert.deepEqual(A.PENTATONIC, [0, 3, 5, 7, 10]);
  for (const note of score.bars.flatMap((bar) => bar.notes)) {
    if (note.voice === 'drum') continue;
    assert(
      A.inPentatonic(note.semitone),
      `${note.voice} note ${note.semitone} left the pentatonic set`,
    );
  }
  for (const semitone of [0, 3, 5, 7, 10, 12, 15, 19, 24, -12, -5]) {
    assert(A.inPentatonic(semitone), `${semitone} should be in the set`);
  }
  for (const semitone of [1, 2, 4, 6, 8, 9, 11, 13, 18]) {
    assert(!A.inPentatonic(semitone), `${semitone} should not be in the set`);
  }
});

test('score layout is deterministic, so repeated plays sound identical', () => {
  assert.deepEqual(A.buildScore(), A.buildScore());
  const duration = A.scoreDuration(A.buildScore());
  assert(Math.abs(duration - (20 * 4 * 60) / A.SCORE_BPM) < 1e-6);
  assert(duration > 60 && duration < 66, `loop is ${duration}s`);
});

test('semitoneToHz follows equal temperament and stays finite', () => {
  assert.equal(A.semitoneToHz(100, 0), 100);
  assert(Math.abs(A.semitoneToHz(100, 12) - 200) < 1e-9);
  assert(Math.abs(A.semitoneToHz(100, -12) - 50) < 1e-9);
  for (let semitone = -24; semitone <= 36; semitone++) {
    const hz = A.semitoneToHz(A.MUSIC_ROOT_HZ, semitone);
    assert(Number.isFinite(hz) && hz > 20 && hz < 8000, `${semitone} -> ${hz}`);
  }
});

test('the scheduler builds a full graph for the score without throwing', () => {
  const ctx = stubContext();
  const master = ctx.createGain();
  const scheduled = A.scheduleBars(ctx, master, A.buildScore(), 0, 0, 12);
  assert(scheduled > 20, `only ${scheduled} pitched notes in 12 seconds`);
  assert(ctx.created.includes('oscillator'));
  assert(ctx.created.includes('gain'));
  assert(ctx.created.includes('bufferSource'), 'percussion needs noise sources');
  assert(ctx.created.includes('filter'));
});

test('the scheduler wraps past the end of the loop and respects the horizon', () => {
  const ctx = stubContext();
  const master = ctx.createGain();
  assert(A.scheduleBars(ctx, master, A.buildScore(), 18, 0, 3.2) > 0);
  assert(A.scheduleBars(ctx, master, A.buildScore(), 19, 0, 3.2) > 0);
  // Nothing is emitted for bars that begin after the horizon.
  assert.equal(A.scheduleBars(ctx, master, A.buildScore(), 0, 100, 50), 0);
  // A short window only covers the notes that fall inside it.
  const short = A.scheduleBars(ctx, master, A.buildScore(), 0, 0, 1);
  const full = A.scheduleBars(ctx, master, A.buildScore(), 0, 0, 3.2);
  assert(short > 0 && short < full);
});

test('every sound effect builds a non-empty graph', () => {
  for (const name of SFX_NAMES) {
    const ctx = stubContext();
    A.renderSfxOffline(ctx, name);
    const voices = ctx.created.filter(
      (kind) => kind === 'oscillator' || kind === 'bufferSource',
    );
    assert(voices.length > 0, `${name} produced no voices`);
    assert(ctx.created.includes('gain'), `${name} produced no envelope`);
  }
});

test('the arrangement develops: bare opening, pipa entry, bowed B, thin bridge', () => {
  const notes = A.buildScore().bars.map((bar) => bar.notes);
  const has = (bar, voice) => bar.some((note) => note.voice === voice);
  assert(!has(notes[0], 'arpeggio'), 'the opening bar should stay bare');
  assert(!has(notes[3], 'arpeggio'));
  assert(has(notes[4], 'arpeggio'), 'the pipa should enter in the second half');
  assert(notes.slice(8, 16).every((bar) => has(bar, 'arpeggio')));
  assert(notes.slice(8, 16).every((bar) => has(bar, 'lead')), 'section B is bowed');
  assert(notes.slice(0, 8).every((bar) => !has(bar, 'lead')), 'section A is plucked');
  assert(notes.slice(16, 20).every((bar) => has(bar, 'arpeggio')));
  // Every bar keeps a bass root, and only the two drum rolls drop the downbeat.
  for (const bar of notes) {
    assert(bar.some((note) => note.voice === 'bass' && note.beat === 0));
  }
  const downbeats = notes.filter((bar) =>
    bar.some((note) => note.voice === 'drum' && note.beat === 0),
  );
  assert(downbeats.length >= 18, `only ${downbeats.length} bars have a downbeat drum`);
});

test('a missing Web Audio implementation is reported instead of crashing', () => {
  const ctx = stubContext();
  assert.equal(typeof A.renderScoreOffline, 'function');
  assert.equal(typeof A.readStoredSound(), 'boolean');
  assert.equal(typeof A.setSoundEnabled, 'function');
  assert.doesNotThrow(() => A.setSoundEnabled(false));
  assert.equal(A.isSoundEnabled(), false);
  assert.doesNotThrow(() => A.playSfx('click'));
  assert.doesNotThrow(() => A.stopMusic());
  assert.doesNotThrow(() => A.unlockAudio());
  assert.doesNotThrow(() => A.setSoundEnabled(true));
  assert.equal(A.isSoundEnabled(), true);
  assert.equal(typeof ctx.createGain(), 'object');
});
