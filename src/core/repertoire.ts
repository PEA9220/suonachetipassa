import type { Exercise, Note } from './types';

const MIN_MIDI = 55;
const MAX_MIDI = 100;

function fail(msg: string): never {
  throw new Error(`Estratto non valido: ${msg}`);
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export function parseExcerpt(raw: unknown): Exercise {
  if (!isRecord(raw)) fail('non è un oggetto');
  const { id, bpm, meter, notes, source, level } = raw;
  if (typeof id !== 'string' || id === '') fail('id mancante');
  if (typeof bpm !== 'number' || !(bpm > 0)) fail('bpm');
  if (!Array.isArray(meter) || meter.length !== 2 || !meter.every(n => Number.isInteger(n) && n > 0)) fail('metro');
  if (!isRecord(source) || typeof source.composer !== 'string' || typeof source.work !== 'string' || typeof source.bars !== 'string') fail('fonte');
  if (!Array.isArray(notes) || notes.length === 0) fail('note mancanti');
  const parsed: Note[] = notes.map((n, i) => {
    if (!isRecord(n)) fail(`nota ${i}`);
    const { midi, startBeat, durationBeats } = n;
    if (typeof midi !== 'number' || !Number.isInteger(midi) || midi < MIN_MIDI || midi > MAX_MIDI) fail(`nota ${i} fuori estensione`);
    if (typeof startBeat !== 'number' || startBeat < 0) fail(`nota ${i} inizio`);
    if (typeof durationBeats !== 'number' || !(durationBeats > 0)) fail(`nota ${i} durata`);
    return { midi, startBeat, durationBeats };
  });
  parsed.slice(1).forEach((n, i) => {
    if (n.startBeat < parsed[i].startBeat + parsed[i].durationBeats - 1e-9) fail(`nota ${i + 1} sovrapposta`);
  });
  return {
    id, origin: 'repertoire', bpm, meter: [meter[0], meter[1]], notes: parsed,
    level: typeof level === 'number' ? level : 8,
    source: { composer: source.composer, work: source.work, bars: source.bars },
  };
}

const files = import.meta.glob('../repertoire/*.json', { eager: true, import: 'default' });

export function getRepertoire(): Exercise[] {
  return Object.keys(files).sort().map(k => parseExcerpt(files[k]));
}
