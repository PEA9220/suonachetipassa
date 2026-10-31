import type { App, Outcome } from './app';
import { newSeed } from './app';
import { h, screen } from './dom';
import { messageBox } from './messages';
import { renderScore } from './score';
import { markFor, pickExercise, type Mark } from '../core/session';
import { formatPercent } from '../core/notes';

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
    h('div', { class: 'actions wide' },
      h('button', { class: 'btn', onclick: () => app.exercise(ex) }, 'Riprova'),
      h('button', { class: 'btn primary', onclick: () => app.exercise(pickExercise(app.state.currentLevel, newSeed())) }, 'Prossimo')),
    h('button', { class: 'btn quiet', onclick: () => app.home() }, 'Torna ai livelli'),
  );
  void renderScore(scoreBox, ex, colors);
}
