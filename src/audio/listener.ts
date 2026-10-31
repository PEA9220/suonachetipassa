import { FRAME_SIZE, HOP_MS, detectPitch, rms, type PitchFrame } from '../core/pitch';

export class MicPermissionError extends Error {}
export class MicUnavailableError extends Error {}

/**
 * Ascolta il microfono e produce un frame di altezza ogni HOP_MS.
 * `timeMs` è sull'orologio del contesto audio ricevuto, lo stesso del riproduttore.
 */
export class Listener {
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private sink: GainNode | null = null;
  private static loaded = new WeakSet<BaseAudioContext>();

  private readonly ctx: AudioContext;
  constructor(ctx: AudioContext) { this.ctx = ctx; }

  async start(onFrame: (f: PitchFrame) => void): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) throw new MicUnavailableError('Microfono non disponibile');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') throw new MicPermissionError('Permesso negato');
      throw new MicUnavailableError(String(e));
    }
    if (!Listener.loaded.has(this.ctx)) {
      await this.ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}worklets/frame-capture.js`);
      Listener.loaded.add(this.ctx);
    }
    const sampleRate = this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, 'frame-capture', { processorOptions: { frameSize: FRAME_SIZE, hopMs: HOP_MS } });
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
    this.source.connect(this.node).connect(this.sink).connect(this.ctx.destination);
  }

  stop(): void {
    this.node?.port.close();
    this.source?.disconnect();
    this.node?.disconnect();
    this.sink?.disconnect();
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null; this.node = null; this.source = null; this.sink = null;
  }
}
