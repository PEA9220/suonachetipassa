import { readFileSync } from 'node:fs';

/** Legge un WAV PCM 16/24/32 bit o float 32, e lo riduce a mono. */
export function readWav(path: string): { samples: Float32Array; sampleRate: number } {
  const buf = readFileSync(path);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`Non è un WAV: ${path}`);
  let pos = 12, format = 0, channels = 0, sampleRate = 0, bits = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4), size = buf.readUInt32LE(pos + 4), body = pos + 8;
    if (id === 'fmt ') {
      format = buf.readUInt16LE(body); channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4); bits = buf.readUInt16LE(body + 14);
      if (format === 0xfffe) format = buf.readUInt16LE(body + 24);
    } else if (id === 'data') {
      const bytes = bits / 8, frames = Math.floor(size / (bytes * channels));
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < channels; c++) {
          const at = body + (i * channels + c) * bytes;
          if (format === 3) sum += buf.readFloatLE(at);
          else if (bits === 16) sum += buf.readInt16LE(at) / 32768;
          else if (bits === 24) sum += buf.readIntLE(at, 3) / 8388608;
          else if (bits === 32) sum += buf.readInt32LE(at) / 2147483648;
          else throw new Error(`Formato non gestito: ${bits} bit`);
        }
        samples[i] = sum / channels;
      }
      return { samples, sampleRate };
    }
    pos = body + size + (size % 2);
  }
  throw new Error(`WAV senza dati: ${path}`);
}
