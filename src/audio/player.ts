import * as Tone from 'tone';
import type { Exercise } from '../core/types';
import { buildCountIn, buildPlayback } from '../core/schedule';

const LEAD_S = 0.15; // margine prima del primo suono programmato

/** Il contesto audio condiviso da riproduttore e ascoltatore: un solo orologio. */
export function audioContext(): AudioContext {
  return Tone.getContext().rawContext as AudioContext;
}

/** Il contesto di Tone.js, da passare all'ascoltatore. */
export function toneContext(): Tone.BaseContext {
  return Tone.getContext();
}

/** Da chiamare dentro un gesto dell'utente: i browser avviano l'audio solo così. */
export async function unlockAudio(): Promise<void> {
  await Tone.start();
}

type Voice = { triggerAttackRelease(note: Tone.Unit.Frequency, dur: number, time: number): unknown; dispose(): unknown };

async function loadSampler(): Promise<Voice | null> {
  const base = `${import.meta.env.BASE_URL}samples/violin/`;
  try {
    const res = await fetch(`${base}manifest.json`);
    if (!res.ok) return null;
    const urls = (await res.json()) as Record<string, string>;
    if (Object.keys(urls).length === 0) return null;
    return await new Promise<Voice | null>(resolve => {
      const sampler: Tone.Sampler = new Tone.Sampler({ urls, baseUrl: base, release: 0.4,
        onload: () => resolve(sampler), onerror: () => { sampler.dispose(); resolve(null); } }).toDestination();
    });
  } catch {
    return null;
  }
}

function fallbackSynth(): Voice {
  // ripiego se i campioni non ci sono: timbro FM vagamente d'arco
  return new Tone.FMSynth({
    harmonicity: 1, modulationIndex: 2.5,
    oscillator: { type: 'sawtooth' }, modulation: { type: 'sine' },
    envelope: { attack: 0.06, decay: 0.1, sustain: 0.85, release: 0.25 },
    modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.2 },
    volume: -10,
  }).toDestination();
}

export class Player {
  private voice: Promise<Voice> | null = null;
  private click: Tone.Synth | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private finish: (() => void) | null = null;
  usingSamples = false;

  private getVoice(): Promise<Voice> {
    if (!this.voice) {
      this.voice = loadSampler().then(s => { this.usingSamples = s !== null; return s ?? fallbackSynth(); });
    }
    return this.voice;
  }

  private getClick(): Tone.Synth {
    if (!this.click) {
      this.click = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 }, volume: -8 }).toDestination();
    }
    return this.click;
  }

  /** Prepara campioni e sintetizzatori in anticipo. */
  async prepare(): Promise<void> {
    await this.getVoice();
    this.getClick();
  }

  private waitUntil(endS: number): Promise<void> {
    return new Promise(resolve => {
      this.finish = resolve;
      this.timer = setTimeout(() => { this.timer = null; this.finish = null; resolve(); },
        Math.max(0, (endS - audioContext().currentTime) * 1000));
    });
  }

  async playExercise(ex: Exercise): Promise<void> {
    this.stop();
    const voice = await this.getVoice();
    const t0 = audioContext().currentTime + LEAD_S;
    const { notes, totalMs } = buildPlayback(ex);
    for (const n of notes) {
      voice.triggerAttackRelease(Tone.Frequency(n.midi, 'midi').toFrequency(), Math.max(0.05, n.durationMs / 1000 - 0.03), t0 + n.timeMs / 1000);
    }
    await this.waitUntil(t0 + totalMs / 1000 + 0.3);
  }

  /** Suona il conteggio e risolve con l'istante (ms, orologio audio) in cui finisce. */
  async playCountIn(ex: Exercise): Promise<number> {
    this.stop();
    const click = this.getClick();
    const t0 = audioContext().currentTime + LEAD_S;
    const { clicks, totalMs } = buildCountIn(ex);
    for (const c of clicks) click.triggerAttackRelease(c.accent ? 'C7' : 'G6', 0.04, t0 + c.timeMs / 1000);
    const end = t0 + totalMs / 1000;
    await this.waitUntil(end);
    return end * 1000;
  }

  /** Click singoli agli istanti dati (ms dall'avvio); risolve con l'istante audio di ciascun click. */
  async playClicks(timesMs: number[], tailMs: number): Promise<number[]> {
    this.stop();
    const click = this.getClick();
    const t0 = audioContext().currentTime + LEAD_S;
    timesMs.forEach((t, i) => click.triggerAttackRelease(i === 0 ? 'C7' : 'G6', 0.04, t0 + t / 1000));
    await this.waitUntil(t0 + (timesMs[timesMs.length - 1] + tailMs) / 1000);
    return timesMs.map(t => (t0 * 1000) + t);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const finish = this.finish;
    this.finish = null;
    if (finish) {
      // i suoni già programmati si cancellano solo eliminando le voci: si ricreano al prossimo uso
      const voice = this.voice;
      this.voice = null;
      void voice?.then(v => v.dispose());
      this.click?.dispose();
      this.click = null;
      finish();
    }
  }
}
