import type { Exercise, LevelConfig, LevelContent, Note } from './types';
import { createRng, pick, randInt } from './random';

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function withRhythm(rng: () => number, pitches: number[], durations: number[]): Note[] {
  let beat = 0;
  return pitches.map(midi => {
    const durationBeats = pick(rng, durations);
    const note = { midi, startBeat: beat, durationBeats };
    beat += durationBeats;
    return note;
  });
}

function randomPitches(rng: () => number, c: LevelContent, count: number): number[] {
  const allowed = range(c.minMidi, c.maxMidi).filter(m => c.accidentals || MAJOR_STEPS.includes(m % 12));
  const pitches = [pick(rng, allowed)];
  while (pitches.length < count) {
    const prev = pitches[pitches.length - 1];
    const options = allowed.filter(m => m !== prev && Math.abs(m - prev) <= c.maxInterval);
    pitches.push(pick(rng, options));
  }
  return pitches;
}

/** Melodia in una tonalità maggiore: 70% gradi congiunti, chiude sulla tonica. */
function styledPitches(rng: () => number, c: LevelContent, count: number): number[] {
  for (;;) {
    const tonic = randInt(rng, 0, 11);
    const scale = range(c.minMidi, c.maxMidi).filter(m => MAJOR_STEPS.includes((m - tonic + 12) % 12));
    let idx = randInt(rng, 0, scale.length - 1);
    const pitches = [scale[idx]];
    while (pitches.length < count - 1) {
      if (rng() < 0.7) {
        const step = rng() < 0.5 ? -1 : 1;
        idx = Math.min(scale.length - 1, Math.max(0, idx + step));
        if (scale[idx] === pitches[pitches.length - 1]) idx += idx === 0 ? 1 : -1;
      } else {
        const prev = scale[idx];
        const leaps = scale.map((m, i) => ({ m, i })).filter(x => x.m !== prev && Math.abs(x.m - prev) <= c.maxInterval);
        idx = pick(rng, leaps).i;
      }
      pitches.push(scale[idx]);
    }
    const prev = pitches[pitches.length - 1];
    const endings = scale.filter(m => m % 12 === tonic && m !== prev && Math.abs(m - prev) <= c.maxInterval);
    if (endings.length > 0) {
      pitches.push(endings.reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a)));
      return pitches;
    }
  }
}

export function generateExercise(config: LevelConfig, seed: number): Exercise {
  const c = config.content;
  if (c.kind === 'repertoire') throw new Error(`Il livello ${config.level} usa il repertorio, non si genera`);
  const rng = createRng(seed);
  const count = randInt(rng, c.noteCount[0], c.noteCount[1]);
  const pitches = c.kind === 'styled' ? styledPitches(rng, c, count) : randomPitches(rng, c, count);
  return {
    id: `gen-${config.level}-${seed}`,
    origin: 'generated',
    bpm: randInt(rng, c.bpm[0], c.bpm[1]),
    meter: [4, 4],
    notes: withRhythm(rng, pitches, c.durations),
    level: config.level,
  };
}
