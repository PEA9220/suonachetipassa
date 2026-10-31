// Raccoglie i campioni del microfono e invia un blocco di frameSize campioni ogni hop.
class FrameCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const { frameSize, hopMs } = options.processorOptions;
    this.frameSize = frameSize;
    this.hop = Math.round((sampleRate * hopMs) / 1000);
    this.ring = new Float32Array(frameSize);
    this.write = 0;
    this.filled = 0;
    this.sinceLast = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      this.ring[this.write] = channel[i];
      this.write = (this.write + 1) % this.frameSize;
      if (this.filled < this.frameSize) this.filled++;
      this.sinceLast++;
      if (this.filled === this.frameSize && this.sinceLast >= this.hop) {
        this.sinceLast = 0;
        const block = new Float32Array(this.frameSize);
        block.set(this.ring.subarray(this.write));
        block.set(this.ring.subarray(0, this.write), this.frameSize - this.write);
        // istante dell'ultimo campione del blocco, sull'orologio del contesto audio
        const endTime = currentTime + (i + 1) / sampleRate;
        this.port.postMessage({ block, endTime }, [block.buffer]);
      }
    }
    return true;
  }
}
registerProcessor('frame-capture', FrameCapture);
