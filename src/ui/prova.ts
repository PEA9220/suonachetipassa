import type { App } from './app';
import { h, screen } from './dom';
import { errorBox } from './messages';
import { hzToMidiCents } from '../core/pitch';
import { noteName } from '../core/notes';
import { getRepertoire } from '../core/repertoire';
import { Listener } from '../audio/listener';
import { toneContext, unlockAudio } from '../audio/player';

/** Pagina di prova: frame del microfono dal vivo ed estratti del repertorio. */
export function renderProva(app: App): void {
  let listener: Listener | null = null;
  const out = h('pre', { class: 'frames' }, 'Microfono spento');
  const reading = h('p', { class: 'live-note' }, '—');
  const toggle = h('button', { class: 'btn primary' }, 'Accendi il microfono');
  const lines: string[] = [];

  const stop = () => { listener?.stop(); listener = null; toggle.textContent = 'Accendi il microfono'; };
  toggle.addEventListener('click', async () => {
    if (listener) { stop(); return; }
    try {
      await unlockAudio();
      listener = new Listener(toneContext());
      await listener.start(f => {
        const pitch = f.hz === null ? null : hzToMidiCents(f.hz);
        reading.textContent = pitch ? `${noteName(pitch.midi)} ${pitch.cents >= 0 ? '+' : '−'}${Math.abs(pitch.cents).toFixed(0)} cent` : '—';
        lines.unshift(`${f.timeMs.toFixed(0).padStart(8)} ms  ${f.hz === null ? '      —   ' : `${f.hz.toFixed(1).padStart(7)} Hz`}  rms ${f.rms.toFixed(3)}`);
        lines.length = Math.min(lines.length, 30);
        out.textContent = lines.join('\n');
      });
      toggle.textContent = 'Spegni il microfono';
    } catch (e) {
      listener = null;
      out.replaceChildren(errorBox(e));
    }
  });

  screen(app.root,
    h('header', { class: 'bar' },
      h('a', { class: 'btn quiet', href: '#', onclick: () => stop() }, 'Indietro'),
      h('h1', { class: 'compact', tabindex: -1 }, 'Prova')),
    h('p', {}, 'Suona un La: la lettura dovrebbe stare vicina a 440 Hz.'),
    toggle,
    reading,
    out,
    h('h2', {}, 'Repertorio'),
    h('div', { class: 'actions column' },
      ...getRepertoire().map(ex => h('button', { class: 'btn', onclick: () => { stop(); app.exercise(ex); } },
        `${ex.source?.composer}: ${ex.source?.work}`))),
  );
}
