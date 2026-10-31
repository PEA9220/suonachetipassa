import type { App, Outcome } from './app';
import { newSeed } from './app';
import { h, screen } from './dom';
import { messageBox } from './messages';
import { renderScore } from './score';
import { markFor, pickExercise, type Mark } from '../core/session';
import { formatPercent, noteName } from '../core/notes';
import { keepAwake } from './wakelock';

export const MARK_LABELS: Record<Mark, string> = {
  correct: 'giusta', flat: 'calante', sharp: 'crescente', early: 'in anticipo', late: 'in ritardo',
  wrong: 'sbagliata', missing: 'mancante', extra: 'in più',
};

const markColor = (m: Mark) => getComputedStyle(document.documentElement).getPropertyValue(`--mark-${m}`).trim();

export function renderSummary(app: App, o: Outcome): void {
  const { evaluation: ev, ex } = o;
  const marks = ev.results.map(r => markFor(r));
  const colors: (string | undefined)[] = [];
  ev.results.forEach((r, i) => { if (r.expectedIndex !== null) colors[r.expectedIndex] = markColor(marks[i]); });
  const extras = marks.filter(m => m === 'extra').length;
  const present = [...new Set(marks.filter(m => m !== 'extra'))];

  const row = (label: string, value: string, note?: string) =>
    h('div', { class: 'row' }, h('dt', {}, label), h('dd', {}, value, note ? h('small', {}, note) : null));

  const scoreBox = h('div', { class: 'score' });
  const beatMs = 60000 / ex.bpm;
  const heard = h('details', { class: 'heard' },
    h('summary', {}, `Note sentite: ${o.played.length}`),
    o.played.length === 0 ? h('p', {}, 'Nessuna nota riconosciuta.') : h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Nota'), h('th', {}, 'Inizio'), h('th', {}, 'Durata'))),
      h('tbody', {}, ...o.played.map(n => {
        const early = n.startMs - (o.latencyMs ?? 0) < -beatMs / 2;
        const cents = Math.round(n.cents);
        return h('tr', { class: early ? 'ignored' : undefined },
          h('td', {}, `${noteName(n.midi)} ${cents >= 0 ? '+' : '−'}${Math.abs(cents)}`),
          h('td', {}, early ? 'nel conteggio' : `${Math.round(n.startMs)} ms`),
          h('td', {}, `${Math.round(n.durationMs)} ms`));
      }))),
    h('button', { class: 'btn quiet', onclick: () => saveAttempt(o) }, 'Salva i dati del tentativo'));

  screen(app.root,
    o.newlyUnlocked ? h('section', { class: 'message message-good', role: 'status' },
      h('h2', {}, `Livello sbloccato: ${o.newlyUnlocked}`),
      h('p', {}, 'Da ora il giudizio su intonazione e ritmo è più severo.')) : null,
    h('header', { class: 'result' },
      h('h1', { class: 'total', tabindex: -1, 'aria-label': `Punteggio ${formatPercent(ev.total)}` }, formatPercent(ev.total)),
      h('p', { class: 'subtitle' }, `Livello ${ex.level}`)),
    h('dl', { class: 'scores' },
      row('Note', formatPercent(ev.scores.notes)),
      row('Intonazione', formatPercent(ev.scores.intonation)),
      ev.scores.rhythm === null
        ? row('Ritmo', 'non valutato', o.rhythmSkipped === 'calibration' ? 'manca la calibrazione' : 'non previsto a questo livello')
        : row('Ritmo', formatPercent(ev.scores.rhythm))),
    scoreBox,
    h('ul', { class: 'legend' }, ...present.map(m => h('li', {}, h('span', { class: `swatch mark-${m}` }), MARK_LABELS[m]))),
    extras ? h('p', {}, extras === 1 ? 'Hai suonato una nota in più.' : `Hai suonato ${extras} note in più.`) : null,
    o.rhythmSkipped === 'calibration' ? messageBox('notCalibrated') : null,
    heard,
    h('div', { class: 'actions wide' },
      h('button', { class: 'btn', onclick: () => app.exercise(ex) }, 'Riprova'),
      h('button', { class: 'btn primary', onclick: () => app.exercise(pickExercise(app.state.currentLevel, newSeed())) }, 'Prossimo')),
    h('button', { class: 'btn quiet', onclick: () => app.home() }, 'Torna ai livelli'),
  );
  void renderScore(scoreBox, ex, colors);
  void keepAwake();
}

/** Scarica un file con esercizio, frame e note del tentativo, per riprodurlo nei test. */
function saveAttempt(o: Outcome): void {
  const data = {
    version: 1,
    savedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    latencyMs: o.latencyMs,
    exercise: o.ex,
    frames: o.frames.map(f => ({ timeMs: Math.round(f.timeMs * 10) / 10, hz: f.hz === null ? null : Math.round(f.hz * 100) / 100, rms: Math.round(f.rms * 10000) / 10000 })),
    played: o.played,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  const a = h('a', { href: url, download: `tentativo-${o.ex.id}-${Date.now()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
