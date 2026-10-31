import type { App } from './app';
import { newSeed } from './app';
import { h, screen } from './dom';
import { messageBox, type MessageKey } from './messages';
import { LEVELS, getLevel } from '../core/levels';
import { pickExercise } from '../core/session';
import { formatPercent } from '../core/notes';

export function renderHome(app: App, notice?: MessageKey): void {
  const s = app.state;
  const level = getLevel(s.currentLevel);
  const scores = s.history[s.currentLevel] ?? [];
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const progress = (() => {
    if (s.currentLevel < s.unlockedLevel) return h('p', { class: 'lead' }, 'Livello già superato: puoi continuare a esercitarti.');
    if (s.currentLevel === LEVELS.length) return h('p', { class: 'lead' }, 'È l’ultimo livello: estratti dal repertorio.');
    return h('div', { class: 'progress' },
      h('ol', { class: 'pips', 'aria-hidden': 'true' },
        ...Array.from({ length: 10 }, (_, i) => h('li', { class: i < scores.length ? (scores[i] >= 0.8 ? 'pip good' : 'pip done') : 'pip' }))),
      h('p', { class: 'lead' }, scores.length === 0
        ? `Servono 10 esercizi con media almeno dell’80% per sbloccare il livello ${s.currentLevel + 1}.`
        : `Media ${formatPercent(avg!)} su ${scores.length} esercizi di 10. Con almeno l’80% sblocchi il livello ${s.currentLevel + 1}.`));
  })();

  const levels = h('nav', { class: 'levels', 'aria-label': 'Livelli sbloccati' },
    ...LEVELS.filter(l => l.level <= s.unlockedLevel).map(l =>
      h('button', { class: 'level-btn', 'aria-current': l.level === s.currentLevel ? 'true' : undefined,
        onclick: async () => { await app.setState({ ...s, currentLevel: l.level }); renderHome(app); } },
        h('span', { class: 'level-num' }, String(l.level)), h('span', {}, l.label))));

  screen(app.root,
    notice ? messageBox(notice) : null,
    h('header', { class: 'hero' },
      h('h1', { tabindex: -1 }, `Livello ${level.level}`),
      h('p', { class: 'subtitle' }, level.label)),
    progress,
    h('button', { class: 'btn primary huge', onclick: () => app.exercise(pickExercise(s.currentLevel, newSeed())) }, 'Esercizio'),
    h('h2', {}, 'Livelli'),
    levels,
    h('h2', {}, 'Ritardo del microfono'),
    h('p', {}, s.latencyMs === null
      ? 'Non ancora misurato: il ritmo non viene valutato finché non calibri.'
      : `Misurato: ${Math.round(s.latencyMs)} ms.`),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: () => app.calibration() }, s.latencyMs === null ? 'Calibra' : 'Calibra di nuovo'),
      h('a', { class: 'btn quiet', href: '#prova' }, 'Prova il microfono')),
  );
}
