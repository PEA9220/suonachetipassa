export type Note = { midi: number; startBeat: number; durationBeats: number };

export type Exercise = {
  id: string;
  origin: 'generated' | 'repertoire';
  bpm: number;
  meter: [number, number];
  notes: Note[];
  level: number;
  source?: { composer: string; work: string; bars: string };
};

export type Tolerances = { intonationCents: number; rhythmMs: number | null };

export type LevelContent = {
  kind: 'random' | 'styled' | 'repertoire';
  minMidi: number;
  maxMidi: number;
  noteCount: [number, number];
  maxInterval: number;
  durations: number[];
  accidentals: boolean;
  bpm: [number, number];
};

export type LevelConfig = { level: number; label: string; tolerances: Tolerances; content: LevelContent };

/** startMs è misurato dalla fine del conteggio; midi è la nota più vicina, cents lo scarto da essa. */
export type PlayedNote = { midi: number; cents: number; startMs: number; durationMs: number };
