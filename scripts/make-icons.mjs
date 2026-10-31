// Disegna l'icona dell'app (la effe del violino) e la salva in SVG e PNG.
// Uso: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

// Linea centrale della effe: due curve di Bézier, dall'occhio in alto a quello in basso.
const SCALE = 1.28;
const SEGMENTS = [
  [[318, 150], [274, 128], [258, 196], [256, 256]],
  [[256, 256], [254, 316], [238, 384], [194, 362]],
].map(seg => seg.map(([x, y]) => [256 + (x - 256) * SCALE, 256 + (y - 256) * SCALE]));
const EYE = 25;

const bez = ([a, b, c, d], t) => {
  const u = 1 - t;
  return [0, 1].map(k => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]);
};
const bezD = ([a, b, c, d], t) => {
  const u = 1 - t;
  return [0, 1].map(k => 3 * u * u * (b[k] - a[k]) + 6 * u * t * (c[k] - b[k]) + 3 * t * t * (d[k] - c[k]));
};

// Spessore: pieno al centro, si assottiglia e poi si riallarga senza scalini fino agli occhi,
// come nell'intaglio vero, dove il gambo sfocia negli occhi rotondi.
const smooth = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const FLARE = 0.16; // tratto finale in cui il gambo si allarga fino all'occhio
const width = s => {
  const body = 11 + 27 * Math.pow(Math.sin(Math.PI * s), 1.3);
  const end = Math.min(s, 1 - s); // distanza dall'estremità più vicina
  const k = smooth(1 - end / FLARE);
  return body + (2 * EYE * 0.98 - body) * Math.pow(k, 2.2);
};

const N = 160;
const left = [], right = [];
SEGMENTS.forEach((seg, i) => {
  for (let j = 0; j <= N; j++) {
    if (i === 1 && j === 0) continue;
    const t = j / N, s = (i + t) / 2;
    const [x, y] = bez(seg, t), [dx, dy] = bezD(seg, t);
    const len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, w = width(s) / 2;
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
  }
});
const f = n => n.toFixed(1);
const stem = `M${left.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} L${right.reverse().map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;

// Intagli a V al centro, perpendicolari al gambo.
const [cx, cy] = bez(SEGMENTS[0], 1), [tx, ty] = bezD(SEGMENTS[0], 1);
const tl = Math.hypot(tx, ty), ux = tx / tl, uy = ty / tl, nx = -uy, ny = ux;
const nick = side => {
  const base = width(0.5) / 2 - 1, out = base + 15, half = 7;
  const p = (a, b) => `${f(cx + nx * side * a + ux * b)} ${f(cy + ny * side * a + uy * b)}`;
  return `M${p(base, -half)} L${p(out, 0)} L${p(base, half)} Z`;
};

// Occhi: centrati sulle estremità del gambo, che vi si allarga dentro.
const eyeTop = SEGMENTS[0][0];
const eyeBottom = SEGMENTS[1][3];

const STAFF = [86, 116, 146, 176, 206];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="#253c52"/>
      <stop offset="1" stop-color="#111b26"/>
    </radialGradient>
    <linearGradient id="rosin" x1="0.2" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#ffd884"/>
      <stop offset="0.5" stop-color="#f2b33d"/>
      <stop offset="1" stop-color="#d4880f"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <!-- cinque cerchi equidistanti come le righe del pentagramma; la effe ci sta sopra come una nota -->
  <g fill="none" stroke="#9fb6cc" stroke-width="4.5" opacity="0.30">
${STAFF.map(r => `    <circle cx="256" cy="256" r="${r}"/>`).join('\n')}
  </g>
  <g fill="url(#rosin)">
    <path d="${stem}"/>
    <circle cx="${f(eyeTop[0])}" cy="${f(eyeTop[1])}" r="${EYE}"/>
    <circle cx="${f(eyeBottom[0])}" cy="${f(eyeBottom[1])}" r="${EYE}"/>
    <path d="${nick(1)}"/>
    <path d="${nick(-1)}"/>
  </g>
</svg>
`;

writeFileSync('scripts/icon.svg', svg);
const render = size => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
for (const size of [192, 512]) writeFileSync(`public/icons/icon-${size}.png`, render(size));
writeFileSync('public/icons/apple-touch-icon.png', render(180));
// favicon: stesso disegno con angoli arrotondati
writeFileSync('public/favicon.svg', svg.replace('<rect width="512" height="512"', '<rect width="512" height="512" rx="96"'));
