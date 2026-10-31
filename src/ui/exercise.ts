import type { App } from './app';
import { h, screen } from './dom';
import { errorBox, messageBox, type MessageKey } from './messages';
import { renderScore } from './score';
import { keepAwake } from './wakelock';
import type { Exercise, PlayedNote } from '../core/types';
import type { PitchFrame } from '../core/pitch';
import { hzToMidiCents } from '../core/pitch';
import { getLevel } from '../core/levels';
import { evaluate } from '../core/evaluate';
import { framesToNotes } from '../core/segment';
import { isNoisy } from '../core/signal';
import { recordResult } from '../core/progress';
import { noteName } from '../core/notes';
import { listenDecision, stopAtMs } from '../core/session';
import { buildCountIn, buildPlayback } from '../core/schedule';
import { Listener } from '../audio/listener';
import { audioContext, toneContext, unlockAudio } from '../audio/player';

type Attempt =
  | { kind: 'played'; notes: PlayedNote[] }
  | { kind: 'silent' | 'noisy' | 'interrupted' };

let showScore = false;

export function renderExercise(app: App, ex: Exercise, notice?: MessageKey): void {
  const level = getLevel(ex.level);
  const status = h('div', { class: 'status', 'aria-live': 'polite' });
  const scoreBox = h('div', { class: 'score', hidden: !showScore });
  const stopBtn = h('button', { class: 'btn danger huge', hidden: true }, 'Stop');
  const listenBtn = h('button', { class: 'btn' }, 'Ascolta');
  const playBtn = h('button', { class: 'btn primary huge' }, 'Suono');
  const scoreBtn = h('button', { class: 'btn quiet', 'aria-pressed': String(showScore) }, 'Spartito');
  const backBtn = h('button', { class: 'btn quiet' }, 'Indietro');
  const noticeBox = h('div', {}, notice ? messageBox(notice) : null);
  let busy = false;
  // ogni messaggio propone un'azione: qui, riprovare
  const retry = () => h('button', { class: 'btn', onclick: () => playBtn.click() }, 'Riprova');
  const showNotice = (key: MessageKey) => noticeBox.replaceChildren(messageBox(key, retry()));

  const setBusy = (b: boolean) => {
    busy = b;
    [listenBtn, playBtn, backBtn].forEach(x => { x.disabled = b; });
  };

  const drawScore = () => { if (showScore) void renderScore(scoreBox, ex); };

  scoreBtn.addEventListener('click', () => {
    showScore = !showScore;
    scoreBtn.setAttribute('aria-pressed', String(showScore));
    scoreBox.hidden = !showScore;
    drawScore();
  });

  backBtn.addEventListener('click', () => { if (!busy) app.home(); });

  listenBtn.addEventListener('click', async () => {
    setBusy(true);
    noticeBox.replaceChildren();
    try {
      await unlockAudio();
      status.replaceChildren(h('p', { class: 'big-status' }, 'Ascolta…'));
      await app.player.playExercise(ex);
      if (!app.player.usingSamples) noticeBox.replaceChildren(messageBox('samplesMissing'));
    } catch {
      noticeBox.replaceChildren(messageBox('audioFailed'));
    }
    status.replaceChildren();
    setBusy(false);
  });

  playBtn.addEventListener('click', async () => {
    setBusy(true);
    noticeBox.replaceChildren();
    try {
      await unlockAudio();
    } catch {
      showNotice('audioFailed');
      setBusy(false);
      return;
    }
    let attempt: Attempt;
    try {
      attempt = await runAttempt(app, ex, status, stopBtn);
    } catch (e) {
      status.replaceChildren();
      stopBtn.hidden = true;
      noticeBox.replaceChildren(errorBox(e, retry()));
      setBusy(false);
      return;
    }
    stopBtn.hidden = true;
    status.replaceChildren();
    setBusy(false);
    if (attempt.kind !== 'played') {
      // esercizio non valido: non entra nello storico
      await app.setState(recordResult(app.state, ex.level, 0, false).state);
      showNotice(attempt.kind);
      return;
    }
    const tol = level.tolerances;
    const latency = app.state.latencyMs;
    const evaluation = evaluate(ex, attempt.notes, tol, latency);
    const { state, newlyUnlocked } = recordResult(app.state, ex.level, evaluation.total, true);
    await app.setState(state);
    app.summary({ ex, evaluation, newlyUnlocked,
      rhythmSkipped: tol.rhythmMs === null ? 'level' : latency === null ? 'calibration' : null });
  });

  screen(app.root,
    h('header', { class: 'bar' },
      backBtn,
      h('div', {},
        h('h1', { class: 'compact', tabindex: -1 }, `Livello ${level.level}`),
        h('p', { class: 'subtitle' }, ex.source ? `${ex.source.composer}, ${ex.source.work}, battute ${ex.source.bars}` : level.label))),
    noticeBox,
    h('p', { class: 'hint' }, 'Ascolta l’esercizio quante volte vuoi, poi tocca Suono: dopo una battuta di conteggio suonalo tu.'),
    h('div', { class: 'actions' }, listenBtn, scoreBtn),
    scoreBox,
    status,
    playBtn,
    stopBtn,
  );
  drawScore();
  // lo schermo resta acceso per tutto l'esercizio
  void keepAwake();
}

async function runAttempt(app: App, ex: Exercise, status: HTMLElement, stopBtn: HTMLButtonElement): Promise<Attempt> {
  const ctx = audioContext();
  const frames: PitchFrame[] = [];
  const live = h('p', { class: 'live-note' }, '');
  const listener = new Listener(toneContext());
  await listener.start(f => {
    frames.push(f);
    if (f.hz !== null && f.rms >= 0.01) {
      const { midi, cents } = hzToMidiCents(f.hz);
      live.textContent = `${noteName(midi)} ${cents >= 0 ? '+' : '−'}${Math.abs(Math.round(cents))}`;
    }
  });

  try {
    // conteggio: i battiti si accendono uno alla volta
    const beats = buildCountIn(ex).clicks;
    const beatEls = beats.map((_, i) => h('span', { class: 'beat' }, String(i + 1)));
    status.replaceChildren(h('div', { class: 'count', 'aria-label': 'Conteggio' }, ...beatEls));
    const t0 = ctx.currentTime * 1000;
    const beatMs = 60000 / ex.bpm;
    const ticker = setInterval(() => {
      const i = Math.floor((ctx.currentTime * 1000 - t0 - 150) / beatMs);
      beatEls.forEach((el, k) => el.classList.toggle('on', k <= i));
    }, 30);
    const countEnd = await app.player.playCountIn(ex);
    clearInterval(ticker);

    status.replaceChildren(h('p', { class: 'big-status' }, 'Suona'), live);
    stopBtn.hidden = false;
    const endAt = stopAtMs(ex);
    const musicEnd = buildPlayback(ex).totalMs;

    const kind = await new Promise<'done' | 'silent' | 'interrupted'>(resolve => {
      const finish = (k: 'done' | 'silent' | 'interrupted') => {
        clearInterval(check);
        stopBtn.removeEventListener('click', onStop);
        resolve(k);
      };
      // fermato dopo la fine prevista: si valuta comunque
      const onStop = () => finish(ctx.currentTime * 1000 - countEnd >= musicEnd ? 'done' : 'interrupted');
      const check = setInterval(() => {
        const decision = listenDecision(frames, countEnd, ctx.currentTime * 1000, endAt);
        if (decision !== 'continue') finish(decision);
      }, 50);
      stopBtn.addEventListener('click', onStop);
    });
    if (kind !== 'done') return { kind };
    if (isNoisy(frames.filter(f => f.timeMs >= countEnd))) return { kind: 'noisy' };
    const notes = framesToNotes(frames).map(n => ({ ...n, startMs: n.startMs - countEnd }));
    return { kind: 'played', notes };
  } finally {
    listener.stop();
  }
}
