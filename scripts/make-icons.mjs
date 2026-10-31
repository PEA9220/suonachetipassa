// Disegna l'icona (una croma color inchiostro su fondo colofonia) e la salva in PNG.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0xf2, 0xb3, 0x3d], INK = [0x14, 0x20, 0x2c];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// forma in coordinate 0..1, contenuta nella zona sicura delle icone "maskable"
function inside(x, y) {
  // testa della nota: ellisse inclinata
  const cx = 0.42, cy = 0.68, a = 0.13, b = 0.095, t = -0.45;
  const dx = x - cx, dy = y - cy;
  const rx = dx * Math.cos(t) - dy * Math.sin(t), ry = dx * Math.sin(t) + dy * Math.cos(t);
  if ((rx * rx) / (a * a) + (ry * ry) / (b * b) <= 1) return true;
  // gambo
  if (x >= 0.515 && x <= 0.56 && y >= 0.24 && y <= 0.66) return true;
  // bandiera: scende verso destra e si assottiglia in punta
  if (x >= 0.54 && x <= 0.72) {
    const t = (x - 0.54) / 0.18;
    const top = 0.24 + 0.36 * t * t;
    const bottom = top + 0.13 * (1 - t) + 0.015;
    if (y >= top && y <= bottom) return true;
  }
  return false;
}

function png(size) {
  const ss = 4; // sovracampionamento per bordi morbidi
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++)
        if (inside((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size)) hits++;
      const k = hits / (ss * ss);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(BG[c] * (1 - k) + INK[c] * k);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [192, 512]) writeFileSync(`public/icons/icon-${size}.png`, png(size));
writeFileSync('public/icons/apple-touch-icon.png', png(180));
