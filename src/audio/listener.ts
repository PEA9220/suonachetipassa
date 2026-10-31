import type * as Tone from 'tone';
import { FRAME_SIZE, HOP_MS, detectPitch, rms, type PitchFrame } from '../core/pitch';

export class MicPermissionError extends Error {}
export class MicUnavailableError extends Error {}
/** Il microfono c'è, ma la catena di analisi audio non è partita. */
export class AudioSetupError extends Error {}

/**
 * Ascolta il microfono e produce un frame di altezza ogni HOP_MS.
 * Usa il contesto di Tone.js del riproduttore: i nodi vanno creati tramite Tone, perché il suo
 * contesto è un involucro che il costruttore nativo AudioWorkletNode rifiuta.
 * `timeMs` è sull'orologio di quel contesto, lo stesso del riproduttore.
 */
export class Listener {
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private sink: GainNode | null = null;
  private static loaded = new WeakSet<object>();

  private readonly ctx: Tone.BaseContext;
  constructor(ctx: Tone.BaseContext) { this.ctx = ctx; }

  async start(onFrame: (f: PitchFrame) => void): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) throw new MicUnavailableError('getUserMedia non disponibile');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') throw new MicPermissionError('Permesso negato');
      throw new MicUnavailableError(`${name ?? ''} ${String(e)}`.trim());
    }
    try {
      if (!Listener.loaded.has(this.ctx)) {
        await this.ctx.addAudioWorkletModule(`${import.meta.env.BASE_URL}worklets/frame-capture.js`);
        Listener.loaded.add(this.ctx);
      }
      const sampleRate = this.ctx.sampleRate;
      this.source = this.ctx.createMediaStreamSource(this.stream);
      this.node = this.ctx.createAudioWorkletNode('frame-capture', { processorOptions: { frameSize: FRAME_SIZE, hopMs: HOP_MS } });
      this.node.port.onmessage = (ev: MessageEvent<{ block: Float32Array; endTime: number }>) => {
        const { block, endTime } = ev.data;
        const level = rms(block);
        onFrame({
          timeMs: (endTime - FRAME_SIZE / 2 / sampleRate) * 1000,
          hz: level >= 0.005 ? detectPitch(block, sampleRate) : null,
          rms: level,
        });
      };
      // il nodo va collegato all'uscita perché il browser lo faccia lavorare; guadagno zero
      this.sink = this.ctx.createGain();
      this.sink.gain.value = 0;
      this.source.connect(this.node);
      this.node.connect(this.sink);
      this.sink.connect(this.ctx.rawContext.destination);
    } catch (e) {
      // senza analisi il microfono non deve restare acceso
      this.stop();
      throw new AudioSetupError(String(e));
    }
  }

  stop(): void {
    if (this.node) this.node.port.onmessage = null;
    this.source?.disconnect();
    this.node?.disconnect();
    this.sink?.disconnect();
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null; this.node = null; this.source = null; this.sink = null;
  }
}
