# App violino a orecchio — Piano di sviluppo

> **Per chi esegue:** usare superpowers:subagent-driven-development (consigliato) o superpowers:executing-plans, un task alla volta. I passi usano le caselle `- [ ]`. Copiare questo piano nel repository come `docs/superpowers/plans/2026-10-31-app-violino.md`.

**Obiettivo:** una PWA personale che genera esercizi di violino a difficoltà crescente, li fa ascoltare, ascolta l'esecuzione e valuta automaticamente note, intonazione e ritmo.

**Architettura:** sette moduli con un compito ciascuno; Generatore e Libreria producono lo stesso tipo `Exercise`, il Valutatore è una funzione pura che riceve le tolleranze dal livello. Nessun server: tutto gira nel browser e i dati restano sul dispositivo.

**Stack:** TypeScript, Vite, Vitest, pitchy (rilevamento altezza), Tone.js (sintesi), VexFlow (spartito), idb-keyval (salvataggio), vite-plugin-pwa.

**Spec:** `docs/superpowers/specs/2026-10-31-app-violino-design.md`

## Vincoli globali

Valgono per ogni task, anche quando il task non li ripete.

- Solo browser, nessun server, nessun account; dati salvati sul dispositivo.
- Altezze come numeri MIDI; riferimento temperamento equabile, La4 = 440 Hz = MIDI 69.
- Estensione del violino: da Sol3 (MIDI 55) a Mi7 (MIDI 100); fuori estensione si ignora.
- Nota giusta: entro ±50 cent dall'attesa, a tutti i livelli.
- Punteggio: note 50%, intonazione 30%, ritmo 20%. Quando il ritmo non è valutato (livelli 1-2 o calibrazione assente) i pesi diventano note 62,5% e intonazione 37,5%.
- Sblocco livello: media ≥ 0,80 sugli ultimi 10 esercizi validi del livello.
- Silenzio: dopo 5 secondi senza suono dalla fine del conteggio, l'esercizio è interrotto e non conta.
- Conteggio d'attacco: una battuta al tempo dell'esercizio.
- Le soglie dei livelli vivono solo in `src/core/levels.ts`.
- Interfaccia leggibile da leggio: testo minimo 20 px, pulsanti minimo 64 px di lato.
- Identificatori nel codice in inglese, testi a schermo in italiano.

## Review focus

Casi che lo spec non nomina ma che un violinista incontra subito; ognuno ha un test nel task indicato.

1. **Vibrato:** l'altezza oscilla di ±20-30 cent; deve restare una nota sola, intonata secondo la sua altezza mediana (Task 5).
2. **Note ripetute uguali:** due La consecutivi separati da un cambio d'arco devono risultare due note, non una lunga (Task 5).
3. **Errori d'ottava del rilevatore:** un salto di 1200 cent per un solo frame non deve creare una nota nuova (Task 5).
4. **Partenza anticipata:** suonare durante il conteggio non deve spostare l'allineamento; le note prima della fine del conteggio si ignorano (Task 4).
5. **Note ravvicinate al livello 8:** note più corte di 80 ms in sequenza veloce devono comunque essere rilevate se l'esercizio le prevede (Task 5).

## Struttura dei file

Il codice puro, testabile senza browser, sta in `src/core/`; ciò che usa microfono, audio o schermo sta fuori.

| File | Responsabilità |
| --- | --- |
| `src/core/types.ts` | Tipi condivisi: `Note`, `Exercise`, `LevelConfig`, `PlayedNote` |
| `src/core/levels.ts` | Gli 8 livelli con contenuto e tolleranze |
| `src/core/random.ts` | Generatore pseudo-casuale con seme |
| `src/core/generator.ts` | Esercizi generati dal livello |
| `src/core/repertoire.ts` | Caricamento e validazione degli estratti |
| `src/repertoire/*.json` | Estratti del repertorio |
| `src/core/align.ts` | Allineamento note attese / suonate |
| `src/core/evaluate.ts` | Giudizio e punteggio |
| `src/core/pitch.ts` | Altezza da un blocco audio, conversioni Hz / MIDI / cent |
| `src/core/segment.ts` | Da frame di altezza a note suonate |
| `src/core/signal.ts` | Rilevamento di silenzio e rumore |
| `src/core/calibration.ts` | Calcolo della latenza |
| `src/core/progress.ts` | Regole di sblocco |
| `src/core/schedule.ts` | Tempi di riproduzione e conteggio |
| `src/core/session.ts` | Scelta dell'esercizio, esito grafico di ogni nota, fine ascolto |
| `src/audio/listener.ts` | Microfono e frame di altezza in tempo reale |
| `src/audio/player.ts` | Riproduzione con Tone.js |
| `public/samples/violin/` | Campioni di violino |
| `src/storage.ts` | Salvataggio su IndexedDB |
| `src/main.ts` | Avvio e navigazione tra schermate |
| `src/ui/*.ts` | Schermate: home, esercizio, riepilogo, calibrazione, messaggi |
| `src/ui/score.ts` | Spartito con VexFlow |
| `tests/` | Un file di test per ogni modulo di `src/core/` |
| `tests/fixtures/audio/` | Registrazioni di prova di Dario |

## Task 1: progetto, tipi e configurazione livelli

**File:** crea `src/core/types.ts`, `src/core/levels.ts`, `tests/levels.test.ts`.

**Interfacce prodotte:**

```ts
type Note = { midi: number; startBeat: number; durationBeats: number };
type Exercise = { id: string; origin: 'generated' | 'repertoire'; bpm: number;
  meter: [number, number]; notes: Note[]; level: number;
  source?: { composer: string; work: string; bars: string } };
type Tolerances = { intonationCents: number; rhythmMs: number | null };
type LevelContent = { kind: 'random' | 'styled' | 'repertoire'; minMidi: number; maxMidi: number;
  noteCount: [number, number]; maxInterval: number; durations: number[];
  accidentals: boolean; bpm: [number, number] };
type LevelConfig = { level: number; label: string; tolerances: Tolerances; content: LevelContent };
type PlayedNote = { midi: number; cents: number; startMs: number; durationMs: number };
function getLevel(level: number): LevelConfig;
const LEVELS: LevelConfig[];
```

- [ ] **Passo 1: crea il progetto.** `npm create vite@latest violino -- --template vanilla-ts`, poi `git init`, poi `npm i pitchy tone vexflow idb-keyval` e `npm i -D vitest vite-plugin-pwa`.
- [ ] **Passo 2: scrivi il test che fallisce** in `tests/levels.test.ts`:

```ts
expect(getLevel(1).tolerances).toEqual({ intonationCents: 30, rhythmMs: null });
expect(getLevel(2).tolerances).toEqual({ intonationCents: 25, rhythmMs: null });
expect(getLevel(3).tolerances).toEqual({ intonationCents: 22, rhythmMs: 200 });
expect(getLevel(8).tolerances).toEqual({ intonationCents: 8, rhythmMs: 50 });
expect(LEVELS.map(l => l.tolerances.intonationCents)).toEqual([30, 25, 22, 18, 15, 12, 10, 8]);
expect(LEVELS.slice(2).map(l => l.tolerances.rhythmMs)).toEqual([200, 160, 120, 90, 70, 50]);
expect(getLevel(8).content.kind).toBe('repertoire');
expect(() => getLevel(9)).toThrow();
```

- [ ] **Passo 3: verifica che fallisca.** `npx vitest run tests/levels.test.ts` → FAIL, modulo mancante.
- [ ] **Passo 4: implementa** tipi e `LEVELS` con questi contenuti:

| Livello | kind | MIDI | Note | Intervallo max | Durate (battiti) | Alterazioni | BPM |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | random | 69-83 | 1 | 0 | 2 | no | 60 |
| 2 | random | 55-83 | 1 | 0 | 2 | no | 60 |
| 3 | random | 55-83 | 2 | 7 | 1, 2 | no | 60-72 |
| 4 | random | 55-83 | 3-5 | 5 | 1, 2 | no | 60-72 |
| 5 | random | 55-83 | 5-8 | 7 | 0.5, 1, 2 | sì | 72-84 |
| 6 | random | 55-93 | 6-10 | 9 | 0.5, 1, 2 | sì | 72-96 |
| 7 | styled | 55-93 | 8-12 | 7 | 0.5, 1, 1.5, 2 | sì | 72-96 |
| 8 | repertoire | 55-100 | dall'estratto | — | — | — | dall'estratto |

- [ ] **Passo 5: verifica che passi.** Stesso comando → PASS.
- [ ] **Passo 6: commit.** `git commit -am "feat: tipi e configurazione livelli"`

## Task 2: Generatore

**File:** crea `src/core/random.ts`, `src/core/generator.ts`, `tests/generator.test.ts`.

**Interfacce:** usa `LevelConfig`, `Exercise`, `getLevel` (Task 1). Produce:

```ts
function createRng(seed: number): () => number; // [0, 1), deterministico
function generateExercise(config: LevelConfig, seed: number): Exercise;
```

- [ ] **Passo 1: scrivi i test che falliscono.** Per ogni livello da 1 a 7 e per 200 semi:

```ts
const ex = generateExercise(getLevel(n), seed);
const c = getLevel(n).content;
expect(ex.origin).toBe('generated'); expect(ex.level).toBe(n); expect(ex.meter).toEqual([4, 4]);
expect(ex.notes.length).toBeGreaterThanOrEqual(c.noteCount[0]);
expect(ex.notes.length).toBeLessThanOrEqual(c.noteCount[1]);
ex.notes.forEach(x => { expect(x.midi).toBeGreaterThanOrEqual(c.minMidi);
  expect(x.midi).toBeLessThanOrEqual(c.maxMidi); expect(c.durations).toContain(x.durationBeats); });
// note contigue, nessuna sovrapposizione
ex.notes.slice(1).forEach((x, i) => expect(x.startBeat).toBe(ex.notes[i].startBeat + ex.notes[i].durationBeats));
// salto massimo
ex.notes.slice(1).forEach((x, i) => expect(Math.abs(x.midi - ex.notes[i].midi)).toBeLessThanOrEqual(c.maxInterval));
if (!c.accidentals) ex.notes.forEach(x => expect([0, 2, 4, 5, 7, 9, 11]).toContain(x.midi % 12));
expect(ex.bpm).toBeGreaterThanOrEqual(c.bpm[0]); expect(ex.bpm).toBeLessThanOrEqual(c.bpm[1]);
```

Più tre test singoli: stesso seme → esercizio identico (`toEqual`); livello 7 → tutte le note appartengono a una scala maggiore la cui tonica è la classe dell'ultima nota; `generateExercise(getLevel(8), 1)` lancia un errore.

- [ ] **Passo 2: verifica che falliscano.** `npx vitest run tests/generator.test.ts` → FAIL.
- [ ] **Passo 3: implementa** `createRng` con l'algoritmo mulberry32 e `generateExercise`. Livelli `random`: prima nota casuale nell'estensione, le successive entro `maxInterval` e dentro l'estensione. Livello `styled`: sceglie una tonalità maggiore, usa solo note della scala, 70% di passi per grado congiunto, termina sulla tonica. `id` = `gen-<livello>-<seme>`.
- [ ] **Passo 4: verifica che passino.** Stesso comando → PASS.
- [ ] **Passo 5: commit.** `git commit -am "feat: generatore di esercizi"`

## Task 3: Libreria repertorio

**File:** crea `src/core/repertoire.ts`, `src/repertoire/bach-minuetto-sol.json`, `src/repertoire/beethoven-inno-gioia.json`, `src/repertoire/vivaldi-primavera.json`, `tests/repertoire.test.ts`.

**Interfacce:** usa `Exercise` (Task 1). Produce:

```ts
function parseExcerpt(raw: unknown): Exercise;   // lancia errore se non valido
function getRepertoire(): Exercise[];            // tutti gli estratti inclusi
```

- [ ] **Passo 1: scrivi i test che falliscono.**

```ts
const ok = { id: 'x', origin: 'repertoire', bpm: 80, meter: [3, 4], level: 8,
  source: { composer: 'J. S. Bach', work: 'Minuetto', bars: '1-2' },
  notes: [{ midi: 74, startBeat: 0, durationBeats: 1 }, { midi: 67, startBeat: 1, durationBeats: 0.5 }] };
expect(parseExcerpt(ok).notes).toHaveLength(2);
expect(() => parseExcerpt({ ...ok, source: undefined })).toThrow();
expect(() => parseExcerpt({ ...ok, notes: [{ midi: 40, startBeat: 0, durationBeats: 1 }] })).toThrow(); // sotto Sol3
expect(() => parseExcerpt({ ...ok, notes: [{ midi: 74, startBeat: 0, durationBeats: 0 }] })).toThrow();
// note sovrapposte: la seconda inizia prima della fine della prima
expect(() => parseExcerpt({ ...ok, notes: [{ midi: 74, startBeat: 0, durationBeats: 2 }, { midi: 76, startBeat: 1, durationBeats: 1 }] })).toThrow();
// le pause sono ammesse: inizio successivo alla fine della precedente
expect(() => parseExcerpt({ ...ok, notes: [{ midi: 74, startBeat: 0, durationBeats: 1 }, { midi: 76, startBeat: 2, durationBeats: 1 }] })).not.toThrow();
expect(getRepertoire()).toHaveLength(3);
```

- [ ] **Passo 2: verifica che falliscano.** `npx vitest run tests/repertoire.test.ts` → FAIL.
- [ ] **Passo 3: implementa** `parseExcerpt` e `getRepertoire` (caricamento con `import.meta.glob('../repertoire/*.json', { eager: true })`).
- [ ] **Passo 4: trascrivi i tre estratti** da edizioni di pubblico dominio: Bach, Minuetto in Sol maggiore BWV Anh. 114, battute 1-8; Beethoven, Inno alla gioia dalla Sinfonia n. 9, tema, battute 1-8; Vivaldi, La primavera, primo movimento, violino primo, battute 1-7.
- [ ] **Passo 5: verifica della trascrizione.** Dario confronta ogni estratto riprodotto con lo spartito originale prima del commit.
- [ ] **Passo 6: verifica che passino.** Stesso comando → PASS.
- [ ] **Passo 7: commit.** `git commit -am "feat: libreria repertorio"`

## Task 4: Valutatore

**File:** crea `src/core/align.ts`, `src/core/evaluate.ts`, `tests/evaluate.test.ts`.

**Interfacce:** usa `Exercise`, `PlayedNote`, `Tolerances`, `getLevel` (Task 1). Produce:

```ts
type NoteResult = { expectedIndex: number | null; playedIndex: number | null;
  status: 'correct' | 'wrong' | 'missing' | 'extra';
  centsOff: number | null; intonationOk: boolean | null;
  timingMs: number | null; timingOk: boolean | null };
type Evaluation = { results: NoteResult[];
  scores: { notes: number; intonation: number; rhythm: number | null }; total: number };
function align(expected: Note[], played: PlayedNote[]): Array<{ e: number | null; p: number | null }>;
function evaluate(ex: Exercise, played: PlayedNote[], tol: Tolerances, latencyMs: number | null): Evaluation;
```

Convenzioni: `PlayedNote.startMs` è misurato dalla fine del conteggio; `midi` è la nota più vicina e `cents` lo scarto da essa. Tempo atteso di una nota = `startBeat × 60000 / bpm`.

- [ ] **Passo 1: scrivi i test che falliscono.** Esercizio di prova: 4 note da un battito a 60 BPM (MIDI 69, 71, 73, 74), `perfect()` costruisce l'esecuzione esatta, `tol4 = getLevel(4).tolerances`; gli altri helper modificano una copia dell'esecuzione come dice il loro nome.

```ts
expect(evaluate(ex, perfect(ex), getLevel(4).tolerances, 0).total).toBe(1);
// nota sbagliata
expect(evaluate(ex, withMidi(perfect(ex), 1, 72), tol4, 0).scores.notes).toBe(0.75);
// nota mancante: le altre restano allineate
const r = evaluate(ex, without(perfect(ex), 1), tol4, 0);
expect(r.results.map(x => x.status)).toEqual(['correct', 'missing', 'correct', 'correct']);
// nota in più
expect(evaluate(ex, withExtra(perfect(ex), 2), tol4, 0).scores.notes).toBe(0.8);
// calante di 20 cent: fuori tolleranza al livello 4 (18), dentro al livello 3 (22)
expect(evaluate(ex, withCents(perfect(ex), -20), getLevel(4).tolerances, 0).scores.intonation).toBe(0);
expect(evaluate(ex, withCents(perfect(ex), -20), getLevel(3).tolerances, 0).scores.intonation).toBe(1);
// in ritardo di 150 ms: dentro al livello 4 (160), fuori al livello 5 (120)
expect(evaluate(ex, shifted(perfect(ex), 150), getLevel(4).tolerances, 0).scores.rhythm).toBe(1);
expect(evaluate(ex, shifted(perfect(ex), 150), getLevel(5).tolerances, 0).scores.rhythm).toBe(0);
// la latenza misurata viene sottratta
expect(evaluate(ex, shifted(perfect(ex), 120), getLevel(8).tolerances, 120).scores.rhythm).toBe(1);
// senza calibrazione il ritmo non è valutato e i pesi diventano 62,5 / 37,5
const nc = evaluate(ex, withCents(perfect(ex), -40), getLevel(8).tolerances, null);
expect(nc.scores.rhythm).toBeNull(); expect(nc.total).toBeCloseTo(0.625);
// pesi 50 / 30 / 20
expect(evaluate(ex, withCents(perfect(ex), -20, [0, 1]), getLevel(4).tolerances, 0).total).toBeCloseTo(0.5 + 0.15 + 0.2);
// review focus 4: note suonate durante il conteggio vengono ignorate
expect(evaluate(ex, [early(69, -1500), ...perfect(ex)], tol4, 0).total).toBe(1);
```

- [ ] **Passo 2: verifica che falliscano.** `npx vitest run tests/evaluate.test.ts` → FAIL.
- [ ] **Passo 3: implementa `align`** come allineamento a programmazione dinamica (Needleman-Wunsch): costo 0 se la nota suonata cade entro ±50 cent dall'attesa, 1 se diversa (sostituzione), 1 per nota mancante o in più; a parità di costo si preferisce l'abbinamento più vicino nel tempo.
- [ ] **Passo 4: implementa `evaluate`.** Scarta le note con inizio corretto per latenza prima di metà battito dalla partenza. Punteggi: note = giuste / (attese + in più); intonazione e ritmo = quota delle note giuste dentro la rispettiva tolleranza (0 se nessuna nota giusta); ritmo `null` se `tol.rhythmMs` o `latencyMs` è `null`. Totale con i pesi dei vincoli globali.
- [ ] **Passo 5: verifica che passino.** Stesso comando → PASS.
- [ ] **Passo 6: commit.** `git commit -am "feat: valutatore"`

## Task 5: Ascoltatore, rilevamento e segmentazione

**File:** crea `src/core/pitch.ts`, `src/core/segment.ts`, `tests/pitch.test.ts`, `tests/segment.test.ts`, `tests/recordings.test.ts`, `tests/helpers/wav.ts`, `tests/fixtures/audio/`.

**Interfacce:** usa `PlayedNote` (Task 1). Produce:

```ts
function hzToMidiCents(hz: number): { midi: number; cents: number };
function detectPitch(buf: Float32Array, sampleRate: number): number | null; // Hz, null se incerto o fuori estensione
type PitchFrame = { timeMs: number; hz: number | null; rms: number };
function framesToNotes(frames: PitchFrame[]): PlayedNote[];
const FRAME_SIZE = 2048, HOP_MS = 10, MIN_NOTE_MS = 60;
```

- [ ] **Passo 1: test oggettivi sul rilevamento** con toni sintetici a frequenza nota (verifica richiesta dallo spec):

```ts
for (let m = 55; m <= 100; m++) {
  const hz = 440 * 2 ** ((m - 69) / 12);
  const r = hzToMidiCents(detectPitch(sine(hz, 48000), 48000)!);
  expect(r.midi).toBe(m); expect(Math.abs(r.cents)).toBeLessThanOrEqual(2);
}
expect(hzToMidiCents(detectPitch(sine(440 * 2 ** (15 / 1200), 48000), 48000)!).cents).toBeCloseTo(15, 0);
expect(detectPitch(noise(48000), 48000)).toBeNull();
expect(detectPitch(sine(30, 48000), 48000)).toBeNull();
```

- [ ] **Passo 2: test sulla segmentazione**, con frame costruiti a mano ogni 10 ms:

```ts
expect(framesToNotes(steady(440, 500))).toMatchObject([{ midi: 69 }]); // durata 500 ± 20 ms
expect(framesToNotes([...steady(440, 300), ...silence(200), ...steady(494, 300)])).toHaveLength(2);
// review focus 1: vibrato ±20 cent a 5 Hz → una nota, intonazione mediana
const v = framesToNotes(vibrato(440, 20, 5, 1000)); expect(v).toHaveLength(1); expect(Math.abs(v[0].cents)).toBeLessThan(3);
// review focus 2: due La separati da un calo di volume (cambio d'arco) → due note
expect(framesToNotes([...steady(440, 300), ...dip(440, 30, 0.1), ...steady(440, 300)])).toHaveLength(2);
// review focus 3: un frame all'ottava sopra → sempre una nota
expect(framesToNotes(withGlitch(steady(440, 400), 20, 880))).toHaveLength(1);
// review focus 5: 8 note da 80 ms alternate La / Si → 8 note
expect(framesToNotes(alternating([440, 494], 80, 8))).toHaveLength(8);
```

- [ ] **Passo 3: verifica che falliscano.** `npx vitest run tests/pitch.test.ts tests/segment.test.ts` → FAIL.
- [ ] **Passo 4: implementa `detectPitch`** con `PitchDetector` di pitchy, soglia di chiarezza 0,9, scarto fuori da MIDI 55-100.
- [ ] **Passo 5: implementa `framesToNotes`.** Mediana mobile su 3 frame per eliminare i salti isolati; una nota finisce dopo 40 ms di silenzio o quando l'altezza cambia di oltre 70 cent per almeno 30 ms; una nuova nota alla stessa altezza inizia quando il volume scende sotto il 50% del picco locale e risale; scarta le note sotto `MIN_NOTE_MS`; l'altezza della nota è la mediana dei suoi frame.
- [ ] **Passo 6: verifica che passino.** Stesso comando → PASS.
- [ ] **Passo 7: registrazioni di prova.** Dario registra in WAV, telefono sul leggio: La4 accordato, La4 volutamente calante, scala di Sol maggiore su due ottave, scala lenta con vibrato, quattro La ripetuti, un motivo del livello 4, un motivo del livello 6, l'Inno alla gioia. Accanto a ogni file un JSON con le note attese e lo scarto in cent letto su un accordatore.
- [ ] **Passo 8: test sulle registrazioni** in `tests/recordings.test.ts`: per ogni file, le note rilevate coincidono con quelle attese e lo scarto in cent sta entro ±5 dalla lettura dell'accordatore. Se fallisce, si regolano le soglie del passo 5, non i test.
- [ ] **Passo 9: commit.** `git commit -am "feat: rilevamento altezza e segmentazione"`

## Task 6: Ascoltatore live e calibrazione

**File:** crea `src/core/calibration.ts`, `src/core/signal.ts`, `src/audio/listener.ts`, `tests/calibration.test.ts`, `tests/signal.test.ts`.

**Interfacce:** usa `detectPitch`, `PitchFrame`, `FRAME_SIZE`, `HOP_MS` (Task 5). Produce:

```ts
function computeLatency(clickMs: number[], onsetMs: number[]): number | null;
function isSilentFor(frames: PitchFrame[], fromMs: number, nowMs: number, limitMs = 5000): boolean;
function isNoisy(frames: PitchFrame[]): boolean;
class MicPermissionError extends Error {}
class Listener { start(onFrame: (f: PitchFrame) => void): Promise<void>; stop(): void; }
```

- [ ] **Passo 1: scrivi i test che falliscono.**

```ts
const clicks = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000];
expect(computeLatency(clicks, clicks.map((c, i) => c + 115 + (i % 2 ? 4 : -4)))).toBeCloseTo(115, -1);
expect(computeLatency(clicks, [115, 1115, 2115, 3115, 4115])).toBeNull();          // meno di 6 abbinati su 8
expect(computeLatency(clicks, [...clicks.map(c => c + 115), 2500])).toBeCloseTo(115, -1); // attacco spurio ignorato
expect(isSilentFor(quiet(5000), 0, 5000)).toBe(true);
expect(isSilentFor(quiet(4900), 0, 4900)).toBe(false);
expect(isNoisy(loudUnpitched(0.7, 1000))).toBe(true);
expect(isNoisy(steady(440, 1000))).toBe(false);
```

- [ ] **Passo 2: verifica che falliscano.** `npx vitest run tests/calibration.test.ts tests/signal.test.ts` → FAIL.
- [ ] **Passo 3: implementa.** `computeLatency`: abbina ogni click all'attacco più vicino entro 400 ms, restituisce la mediana degli scarti, `null` se gli abbinamenti sono meno di 6. Silenzio: RMS sotto 0,01. Rumore: oltre il 60% dei frame con RMS sopra 0,02 e altezza `null`.
- [ ] **Passo 4: verifica che passino.** Stesso comando → PASS.
- [ ] **Passo 5: implementa `Listener`** con `getUserMedia` (echoCancellation, noiseSuppression e autoGainControl disattivati) e un AudioWorklet che invia blocchi da `FRAME_SIZE` campioni ogni `HOP_MS`; un permesso negato lancia `MicPermissionError`.
- [ ] **Passo 6: prova manuale.** `npm run dev`, apri dal telefono la pagina di prova che stampa i frame, suona un La: compaiono valori vicini a 440 Hz.
- [ ] **Passo 7: commit.** `git commit -am "feat: ascolto dal vivo e calibrazione"`

## Task 7: Progressione e salvataggio

**File:** crea `src/core/progress.ts`, `src/storage.ts`, `tests/progress.test.ts`.

**Interfacce:** produce:

```ts
type ProgressState = { unlockedLevel: number; currentLevel: number;
  history: Record<number, number[]>; latencyMs: number | null };
function initialState(): ProgressState;
function canUnlock(scores: number[]): boolean;
function recordResult(s: ProgressState, level: number, total: number, valid: boolean):
  { state: ProgressState; newlyUnlocked: number | null };
function validateState(raw: unknown): ProgressState | null;
function loadState(): Promise<{ state: ProgressState; wasReset: boolean }>;
function saveState(s: ProgressState): Promise<void>;
```

- [ ] **Passo 1: scrivi i test che falliscono.**

```ts
expect(initialState()).toEqual({ unlockedLevel: 1, currentLevel: 1, history: {}, latencyMs: null });
expect(canUnlock(Array(9).fill(1))).toBe(false);            // servono almeno 10 esercizi
expect(canUnlock(Array(10).fill(0.8))).toBe(true);
expect(canUnlock([...Array(5).fill(0), ...Array(10).fill(0.85)])).toBe(true); // contano solo gli ultimi 10
expect(canUnlock(Array(10).fill(0.79))).toBe(false);
// esercizio non valido: non entra nello storico
expect(recordResult(initialState(), 1, 1, false).state.history[1] ?? []).toHaveLength(0);
// il decimo esercizio buono sblocca il livello 2
let s = initialState(); let last;
for (let i = 0; i < 10; i++) ({ state: s, ...last } = recordResult(s, 1, 0.9, true));
expect(last.newlyUnlocked).toBe(2); expect(s.unlockedLevel).toBe(2);
// oltre l'8 non si sblocca nulla
expect(recordResult({ ...s, unlockedLevel: 8, history: { 8: Array(9).fill(1) } }, 8, 1, true).newlyUnlocked).toBeNull();
expect(validateState({ unlockedLevel: 'x' })).toBeNull();
expect(validateState(initialState())).toEqual(initialState());
```

- [ ] **Passo 2: verifica che falliscano.** `npx vitest run tests/progress.test.ts` → FAIL.
- [ ] **Passo 3: implementa `progress.ts`.** Lo storico per livello conserva solo gli ultimi 10 punteggi.
- [ ] **Passo 4: implementa `storage.ts`** con idb-keyval, chiave `violino-progress`; se `validateState` restituisce `null`, `loadState` riparte da `initialState()` con `wasReset: true`.
- [ ] **Passo 5: verifica che passino.** Stesso comando → PASS.
- [ ] **Passo 6: commit.** `git commit -am "feat: progressione e salvataggio"`

## Task 8: Riproduttore

**File:** crea `src/core/schedule.ts`, `src/audio/player.ts`, `public/samples/violin/`, `tests/schedule.test.ts`.

**Interfacce:** usa `Exercise` (Task 1). Produce:

```ts
type ScheduledNote = { midi: number; timeMs: number; durationMs: number };
type Click = { timeMs: number; accent: boolean };
function buildPlayback(ex: Exercise): { notes: ScheduledNote[]; totalMs: number };
function buildCountIn(ex: Exercise): { clicks: Click[]; totalMs: number };
class Player { playExercise(ex: Exercise): Promise<void>; playCountIn(ex: Exercise): Promise<void>; stop(): void; }
```

- [ ] **Passo 1: scrivi i test che falliscono.**

```ts
const ex44 = { ...base, bpm: 60, meter: [4, 4], notes: [{ midi: 69, startBeat: 0, durationBeats: 1 }, { midi: 71, startBeat: 2, durationBeats: 2 }] };
expect(buildCountIn(ex44).clicks).toEqual([{ timeMs: 0, accent: true }, { timeMs: 1000, accent: false }, { timeMs: 2000, accent: false }, { timeMs: 3000, accent: false }]);
expect(buildCountIn(ex44).totalMs).toBe(4000);
expect(buildPlayback(ex44).notes).toEqual([{ midi: 69, timeMs: 0, durationMs: 1000 }, { midi: 71, timeMs: 2000, durationMs: 2000 }]);
expect(buildPlayback(ex44).totalMs).toBe(4000);
expect(buildCountIn({ ...ex44, bpm: 120, meter: [3, 4] }).clicks.map(c => c.timeMs)).toEqual([0, 500, 1000]);
```

- [ ] **Passo 2: verifica che falliscano.** `npx vitest run tests/schedule.test.ts` → FAIL.
- [ ] **Passo 3: implementa `schedule.ts`.**
- [ ] **Passo 4: verifica che passino.** Stesso comando → PASS.
- [ ] **Passo 5: implementa `Player`** con `Tone.Sampler` sui campioni di violino in `public/samples/violin/` (set con licenza libera scelto da Dario, risolve la domanda aperta dello spec); se i campioni non si caricano, ripiega su `Tone.FMSynth`. Il conteggio usa due click di altezza diversa per il battito accentato. Il contesto audio si avvia al primo tocco, come richiedono i browser.
- [ ] **Passo 6: prova manuale.** Su telefono: un esercizio del livello 4 suona alle altezze giuste, e il conteggio a 60 BPM dura 4 secondi.
- [ ] **Passo 7: commit.** `git commit -am "feat: riproduttore"`

## Task 9: Interfaccia

**File:** crea `src/core/session.ts`, `src/main.ts`, `src/style.css`, `src/ui/home.ts`, `src/ui/exercise.ts`, `src/ui/summary.ts`, `src/ui/calibration.ts`, `src/ui/score.ts`, `src/ui/messages.ts`, `tests/session.test.ts`.

**Interfacce:** usa tutti i task precedenti. Produce:

```ts
function pickExercise(level: number, seed: number): Exercise; // livello 8 → estratto, altrimenti generato
type Mark = 'correct' | 'flat' | 'sharp' | 'early' | 'late' | 'wrong' | 'missing' | 'extra';
function markFor(r: NoteResult): Mark;
function stopAtMs(ex: Exercise): number; // fine prevista + 1000 ms
```

- [ ] **Passo 1: scrivi i test che falliscono.**

```ts
expect(pickExercise(8, 1).origin).toBe('repertoire');
expect(pickExercise(3, 1).origin).toBe('generated');
expect(markFor({ status: 'correct', intonationOk: false, centsOff: -20, timingOk: true, timingMs: 0 } as NoteResult)).toBe('flat');
expect(markFor({ status: 'correct', intonationOk: true, centsOff: 2, timingOk: false, timingMs: 130 } as NoteResult)).toBe('late');
expect(markFor({ status: 'missing' } as NoteResult)).toBe('missing');
expect(stopAtMs({ ...pickExercise(3, 1), bpm: 60, notes: [{ midi: 69, startBeat: 0, durationBeats: 4 }] })).toBe(5000);
```

Precedenza di `markFor` per una nota giusta: prima l'intonazione, poi il ritmo.

- [ ] **Passo 2: verifica che falliscano, poi implementa `session.ts`, poi verifica che passino.** `npx vitest run tests/session.test.ts` → FAIL, poi PASS.
- [ ] **Passo 3: schermate.**
  - **Home:** livello attuale, avanzamento verso lo sblocco (media e numero di esercizi su 10), pulsante "Esercizio", elenco dei livelli sbloccati.
  - **Esercizio:** "Ascolta" (ripetibile), interruttore spartito, "Suono": conteggio, poi ascolto fino a `stopAtMs`, a "Stop", o a 5 secondi di silenzio; Wake Lock attivo durante l'esercizio.
  - **Riepilogo:** punteggio totale e per voce, spartito con un colore per ogni `Mark`, "Riprova" e "Prossimo"; se `newlyUnlocked`, l'avviso "Livello sbloccato: da ora il giudizio su intonazione e ritmo è più severo".
  - **Calibrazione:** 8 click a 60 BPM, Dario suona un La a ogni click, `computeLatency` salva `latencyMs`; se restituisce `null`, chiede di ripetere.
- [ ] **Passo 4: messaggi d'errore** in `messages.ts`, uno per ogni riga della tabella "Gestione degli errori" dello spec; gli esercizi interrotti, silenziosi o rumorosi chiamano `recordResult` con `valid: false`.
- [ ] **Passo 5: prova manuale al leggio.** Dal telefono a circa un metro: testi e pulsanti leggibili, un esercizio completo dal livello 1 fino al riepilogo, microfono negato mostra il messaggio giusto.
- [ ] **Passo 6: commit.** `git commit -am "feat: interfaccia"`

## Task 10: PWA e prova sul leggio

**File:** modifica `vite.config.ts`; crea `public/icons/`, `.github/workflows/deploy.yml`.

**Interfacce:** nessuna nuova; impacchetta l'app dei task 1-9.

- [ ] **Passo 1: configura vite-plugin-pwa.** Nome "Violino a orecchio", `display: standalone`, icone 192 e 512 px, precache di codice, estratti JSON e campioni di violino, così l'app funziona anche offline.
- [ ] **Passo 2: pubblica su GitHub Pages** con il workflow `deploy.yml` (build e pubblicazione a ogni push su `main`): serve HTTPS, che i browser richiedono per il microfono.
- [ ] **Passo 3: verifica l'installazione.** Dal telefono, "Aggiungi a schermata Home": l'app si apre a schermo intero.
- [ ] **Passo 4: verifica offline.** In modalità aereo l'app si apre, riproduce un esercizio e valuta l'esecuzione.
- [ ] **Passo 5: suite completa.** `npx vitest run` → tutti i test PASS, comprese le registrazioni di prova.
- [ ] **Passo 6: prova finale al leggio.** Calibrazione, un esercizio del livello 1 fino al riepilogo, poi un estratto del repertorio avviato dalla pagina di prova del Task 6.
- [ ] **Passo 7: commit.** `git commit -am "feat: PWA e pubblicazione"`
