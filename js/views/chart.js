// Gráfica de línea sencilla (una serie) en SVG, que se ajusta al ancho real y muestra el valor del punto que tocas.
import { h, parseDate, fmtDate } from '../util.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  kids.flat().forEach((k) => k != null && el.append(k.nodeType ? k : document.createTextNode(String(k))));
  return el;
};

function niceStep(range, target = 4) {
  const raw = range / target, mag = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((st) => range / st <= target) || 10 * mag;
}
const shortDate = (d) => fmtDate(d, { day: 'numeric', month: 'short' });

// pts: [{x: 'AAAA-MM-DD', y: número, tip: 'texto opcional'}], ordenados por fecha.
export function lineChart(pts, { unit = 'cm', label = 'Gráfica', digits = 1, lowerBetter = false, bestLabel = 'Mejor' } = {}) {
  const box = h('div', { class: 'chart' });
  const fig = h('div', { class: 'chart-plot', role: 'img', 'aria-label': `${label}: ${pts.map((p) => `${shortDate(p.x)} ${p.y} ${unit}`).join(', ')}` });
  const read = h('div', { class: 'chart-read', 'aria-live': 'polite' });
  box.append(fig, read);
  if (!pts.length) return box;
  const fmt = (v) => `${Number(v).toFixed(digits).replace(/\.0+$/, '')} ${unit}`;
  const bestI = pts.reduce((b, p, i) => ((lowerBetter ? p.y < pts[b].y : p.y > pts[b].y) ? i : b), 0);
  const showRead = (i) => { const p = pts[i]; read.textContent = `${fmtDate(p.x, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}: ${fmt(p.y)}${p.tip ? `, ${p.tip}` : ''}`; };
  showRead(pts.length - 1);

  let lastW = 0;
  const draw = (W) => {
    if (Math.abs(W - lastW) < 4) return; lastW = W;
    const H = Math.max(170, Math.min(240, Math.round(W * 0.45))), L = 40, R = 14, T = 18, B = 26;
    const t = pts.map((p) => parseDate(p.x).getTime());
    const t0 = Math.min(...t), t1 = Math.max(...t);
    let lo = Math.min(...pts.map((p) => p.y)), hi = Math.max(...pts.map((p) => p.y));
    if (hi - lo < 4) { lo -= 2; hi += 2; }
    const st = niceStep(hi - lo); lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
    const X = (v) => (t1 === t0 ? L + (W - L - R) / 2 : L + ((v - t0) / (t1 - t0)) * (W - L - R));
    const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });
    for (let v = lo; v <= hi + 1e-9; v += st) {
      svg.append(s('line', { class: 'grid', x1: L, x2: W - R, y1: Y(v), y2: Y(v) }),
        s('text', { class: 'tick', x: L - 6, y: Y(v) + 4, 'text-anchor': 'end' }, Math.round(v * 10) / 10));
    }
    const xl = pts.length > 1 ? [0, pts.length - 1] : [0];
    xl.forEach((i) => svg.append(s('text', { class: 'tick', x: X(t[i]), y: H - 6, 'text-anchor': pts.length > 1 ? (i ? 'end' : 'start') : 'middle' }, shortDate(pts[i].x))));
    if (pts.length > 1) svg.append(s('polyline', { class: 'ln', points: pts.map((p, i) => `${X(t[i])},${Y(p.y)}`).join(' ') }));
    const cross = s('line', { class: 'cross', y1: T, y2: H - B, x1: 0, x2: 0, visibility: 'hidden' });
    svg.append(cross);
    pts.forEach((p, i) => svg.append(s('circle', { class: `dot${i === bestI ? ' best' : ''}`, cx: X(t[i]), cy: Y(p.y), r: i === bestI ? 5.5 : 4.5 })));
    // Etiqueta directa solo en el mejor valor
    const bx = X(t[bestI]), by = Y(pts[bestI].y);
    svg.append(s('text', { class: 'lbl', x: Math.min(W - R, Math.max(L, bx)), y: Math.max(12, by - 10), 'text-anchor': bx > W - 60 ? 'end' : bx < L + 40 ? 'start' : 'middle' }, `${bestLabel}: ${fmt(pts[bestI].y)}`));
    const pick = (ev) => {
      const r = svg.getBoundingClientRect(); const x = ((ev.clientX - r.left) / r.width) * W;
      let k = 0; t.forEach((v, i) => { if (Math.abs(X(v) - x) < Math.abs(X(t[k]) - x)) k = i; });
      cross.setAttribute('x1', X(t[k])); cross.setAttribute('x2', X(t[k])); cross.setAttribute('visibility', 'visible'); showRead(k);
    };
    svg.addEventListener('pointermove', pick); svg.addEventListener('pointerdown', pick);
    fig.replaceChildren(svg);
  };
  const ro = new ResizeObserver(() => { if (!box.isConnected) { ro.disconnect(); return; } draw(Math.round(fig.clientWidth) || 320); });
  ro.observe(fig);
  return box;
}
