import type { App } from './app';
import { h, screen } from './dom';
import { messageBox } from './messages';
import type { PitchFrame } from '../core/pitch';
import { framesToNotes } from '../core/segment';
import { computeLatency } from '../core/calibration';
import { Listener, MicPermissionError } from '../audio/listener';
import { audioContext, unlockAudio } from '../audio/player';
import { keepAwake, releaseAwake } from './wakelock';

const CLICKS = Array.from({ length: 8 }, (_, i) => i * 1000); // 8 click a 60 BPM

export function renderCalibration(app: App): void {
  const box = h('div', { 'aria-live': 'polite' });
  const startBtn = h('button', { class: 'btn primary huge' }, 'Inizia');
  const backBtn = h('button', { class: 'btn quiet', onclick: () => app.home() }, 'Indietro');

  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true; backBtn.disabled = true;
    box.replaceChildren(h('p', { class: 'big-status' }, 'Un La per ogni click'));
    const frames: PitchFrame[] = [];
    try {
      await unlockAudio();
      await keepAwake();
      const listener = new Listener(audioContext());
      await listener.start(f => frames.push(f));
      let clickTimes: number[];
      try {
        clickTimes = await app.player.playClicks(CLICKS, 800);
      } finally {
        listener.stop();
      }
      // contano solo i La: il click e gli altri suoni si ignorano
      const onsets = framesToNotes(frames).filter(n => n.midi % 12 === 9).map(n => n.startMs);
      const latency = computeLatency(clickTimes, onsets);
      if (latency === null) {
        box.replaceChildren(messageBox('calibrationFailed'));
      } else {
        await app.setState({ ...app.state, latencyMs: latency });
        box.replaceChildren(h('p', { class: 'big-status' }, `Ritardo: ${Math.round(latency)} ms`),
          h('p', {}, 'Salvato. Da ora il ritmo viene valutato dal livello 3 in su.'));
        startBtn.textContent = 'Ripeti';
      }
    } catch (e) {
      box.replaceChildren(messageBox(e instanceof MicPermissionError ? 'micDenied' : 'micUnavailable'));
    }
    releaseAwake();
    startBtn.disabled = false; backBtn.disabled = false;
  });

  screen(app.root,
    h('header', { class: 'bar' }, backBtn, h('h1', { class: 'compact', tabindex: -1 }, 'Calibrazione')),
    h('p', { class: 'lead' }, 'Il telefono sente il suono con un piccolo ritardo. Per misurarlo suonerò 8 click a 60 al minuto: suona un La breve e deciso insieme a ogni click.'),
    h('p', {}, 'Mettiti dove ti eserciti di solito, con il telefono sul leggio.'),
    box,
    startBtn,
  );
}
