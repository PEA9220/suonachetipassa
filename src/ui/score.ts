import type { Exercise } from '../core/types';
import { toMeasures } from '../core/notation';

const KEY_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
const MEASURE_WIDTH = 190;

/** Disegna l'esercizio sul rigo; `colors[i]` colora la nota i dell'esercizio. */
export async function renderScore(el: HTMLElement, ex: Exercise, colors: (string | undefined)[] = []): Promise<void> {
  const VF = await import('vexflow/bravura');
  const { Renderer, Stave, StaveNote, Formatter, Accidental, Dot, StaveTie, Voice, Beam } = VF;
  el.replaceChildren();
  const ink = getComputedStyle(el).color || '#000';
  const width = Math.max(300, el.clientWidth || 340);
  const measures = toMeasures(ex);
  const perLine = Math.max(1, Math.floor((width - 70) / MEASURE_WIDTH));
  const lines = Math.ceil(measures.length / perLine);
  const lineHeight = 130;

  const renderer = new Renderer(el as HTMLDivElement, Renderer.Backends.SVG);
  renderer.resize(width, lines * lineHeight + 20);
  const ctx = renderer.getContext();
  ctx.setFillStyle(ink); ctx.setStrokeStyle(ink);

  for (let line = 0; line < lines; line++) {
    const group = measures.slice(line * perLine, (line + 1) * perLine);
    const first = line === 0;
    const headW = first ? 80 : 45;
    const mWidth = (width - 10 - headW) / group.length;
    let x = 5;
    const lineNotes: { note: InstanceType<typeof StaveNote>; tie: boolean }[] = [];
    group.forEach((pieces, i) => {
      const stave = new Stave(x, line * lineHeight + 10, mWidth + (i === 0 ? headW : 0));
      if (i === 0) { stave.addClef('treble'); if (first) stave.addTimeSignature(`${ex.meter[0]}/${ex.meter[1]}`); }
      stave.setStyle({ strokeStyle: ink, fillStyle: ink });
      stave.setContext(ctx).draw();
      x += stave.getWidth();

      const notes = pieces.map(p => {
        const midi = p.midi;
        const key = midi === null ? 'b/4' : `${KEY_NAMES[midi % 12]}/${Math.floor(midi / 12) - 1}`;
        const n = new StaveNote({ keys: [key], duration: p.duration + (midi === null ? 'r' : ''), autoStem: true });
        if (midi !== null && KEY_NAMES[midi % 12].includes('#')) n.addModifier(new Accidental('#'), 0);
        if (p.dots) Dot.buildAndAttach([n], { all: true });
        const color = p.noteIndex !== null ? colors[p.noteIndex] : undefined;
        n.setStyle({ fillStyle: color ?? ink, strokeStyle: color ?? ink });
        if (midi !== null) lineNotes.push({ note: n, tie: p.tieToNext });
        return n;
      });
      const voice = new Voice({ numBeats: ex.meter[0], beatValue: ex.meter[1] }).setMode(Voice.Mode.SOFT).addTickables(notes);
      const beams = Beam.generateBeams(notes, { groups: ex.meter[1] === 8 ? undefined : [new VF.Fraction(1, 4)] });
      beams.forEach(b => b.setStyle({ fillStyle: ink, strokeStyle: ink }));
      new Formatter().joinVoices([voice]).format([voice], stave.getNoteEndX() - stave.getNoteStartX() - 10);
      voice.draw(ctx, stave);
      beams.forEach(b => b.setContext(ctx).draw());
    });
    lineNotes.forEach((item, i) => {
      const next = lineNotes[i + 1];
      if (item.tie && next) new StaveTie({ firstNote: item.note, lastNote: next.note, firstIndexes: [0], lastIndexes: [0] }).setContext(ctx).draw();
    });
  }
  el.querySelector('svg')?.setAttribute('role', 'img');
  el.querySelector('svg')?.setAttribute('aria-label', 'Spartito dell’esercizio');
}
