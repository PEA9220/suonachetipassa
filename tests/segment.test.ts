import { describe, it, expect } from 'vitest';
import { framesToNotes } from '../src/core/segment';
import { seq, steady, silence, vibrato, dip, withGlitch, alternating } from './helpers/frames';

describe('framesToNotes', () => {
  it('una nota tenuta', () => {
    const notes = framesToNotes(steady(440, 500));
    expect(notes).toMatchObject([{ midi: 69 }]);
    expect(Math.abs(notes[0].durationMs - 500)).toBeLessThanOrEqual(20);
  });
  it('due note separate da silenzio', () => {
    const notes = framesToNotes(seq(steady(440, 300), silence(200), steady(494, 300)));
    expect(notes).toHaveLength(2);
    expect(notes.map(n => n.midi)).toEqual([69, 71]);
    expect(Math.abs(notes[1].startMs - 500)).toBeLessThanOrEqual(20);
  });
  it('review focus 1: vibrato → una nota, intonazione mediana', () => {
    const v = framesToNotes(vibrato(440, 20, 5, 1000));
    expect(v).toHaveLength(1); expect(Math.abs(v[0].cents)).toBeLessThan(3);
  });
  it('review focus 2: due La separati da un cambio d\'arco → due note', () => {
    expect(framesToNotes(seq(steady(440, 300), dip(440, 30, 0.1), steady(440, 300)))).toHaveLength(2);
  });
  it('review focus 3: un frame all\'ottava sopra → una nota', () => {
    expect(framesToNotes(withGlitch(steady(440, 400), 20, 880))).toHaveLength(1);
  });
  it('review focus 5: 8 note da 80 ms alternate La / Si → 8 note', () => {
    const notes = framesToNotes(alternating([440, 494], 80, 8));
    expect(notes).toHaveLength(8);
    notes.forEach((n, i) => expect(Math.abs(n.startMs - i * 80)).toBeLessThanOrEqual(20));
  });
  it('attacco accentato poi suono più debole: la nota dura tutta', () => {
    const notes = framesToNotes(seq(steady(440, 50, 0.3), steady(440, 450, 0.1)));
    expect(notes).toHaveLength(1);
    expect(Math.abs(notes[0].durationMs - 500)).toBeLessThanOrEqual(20);
  });
  it('attacco accentato poi cambio di nota a volume più basso: due note', () => {
    const notes = framesToNotes(seq(steady(440, 50, 0.3), steady(440, 250, 0.1), steady(494, 300, 0.1)));
    expect(notes.map(n => n.midi)).toEqual([69, 71]);
  });
  it('scarta le note troppo corte', () => {
    expect(framesToNotes(seq(silence(100), steady(440, 40), silence(100)))).toHaveLength(0);
  });
});

describe('vibrato con oscillazione di volume', () => {
  it('una sola nota anche se il volume scende al 40% a ogni ciclo', () => {
    const fr = vibrato(440, 25, 5.5, 1500).map(f => ({ ...f, rms: 0.1 * (0.7 + 0.3 * Math.sin((2 * Math.PI * 5.5 * f.timeMs) / 1000)) }));
    expect(framesToNotes(fr)).toHaveLength(1);
  });
});

describe('rumori brevi in un esercizio lento (tentativo reale di Dario)', () => {
  // due colpi gravi da 70 e 60 ms separati da un buco, poi un La6 tenuto (forma del tentativo reale)
  const fr = seq(steady(203, 70), silence(50), steady(196, 60), silence(10), steady(1760, 1860));
  it('con la durata minima dell\'esercizio resta solo la nota vera', () => {
    expect(framesToNotes(fr, { minNoteMs: 120 }).map(n => n.midi)).toEqual([93]);
  });
  it('senza indicazioni il comportamento resta quello di prima', () => {
    expect(framesToNotes(fr).map(n => n.midi)).toEqual([56, 55, 93]);
  });
});
