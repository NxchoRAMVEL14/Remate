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

// v3.16: gráfica por periodo (barras o línea) con categorías fijas: días, semanas o meses.
// bk: [{label: 'lun', long: 'lunes 2 de noviembre', y: número|null, tip?: texto}]
// Opciones: type 'bar'|'line', unit, digits, goal (línea punteada de meta), trend (otra serie, misma escala:
// p. ej. promedio de 7 días), zero (la escala empieza en 0; siempre en barras).
const nfmt = (v, digits) => Number(v).toLocaleString('es-MX', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
export function periodChart(bk, { type = 'bar', unit = '', label = 'Gráfica', digits = 0, goal = null, goalLabel = 'Meta', trend = null, trendLabel = 'Promedio de 7 días', seriesLabel = null, zero = type === 'bar', table = true, int = false, fmtV = null } = {}) {
  const fmt = fmtV || ((v) => `${nfmt(v, digits)}${unit ? ` ${unit}` : ''}`);
  const box = h('div', { class: 'chart' });
  const has = bk.map((b) => b.y != null && Number.isFinite(Number(b.y)));
  const vals = bk.filter((b, i) => has[i]).map((b) => Number(b.y));
  const tr = Array.isArray(trend) ? trend.map((v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v))) : null;
  const fig = h('div', { class: 'chart-plot', role: 'img', 'aria-label': `${label}: ${bk.map((b, i) => `${b.long || b.label} ${has[i] ? fmt(b.y) : 'sin dato'}`).join(', ')}${goal != null ? `. ${goalLabel}: ${fmt(goal)}` : ''}` });
  const read = h('div', { class: 'chart-read', 'aria-live': 'polite' });
  if (tr) box.append(h('div', { class: 'chart-legend' },
    h('span', {}, h('i', { class: `sw ${type === 'bar' ? 'sw-bar' : 'sw-ln'}` }), seriesLabel || label),
    h('span', {}, h('i', { class: 'sw sw-trend' }), trendLabel)));
  box.append(fig, read);
  if (!vals.length) { read.textContent = 'Sin datos en este periodo.'; return box; }
  const showRead = (i) => {
    const b = bk[i];
    read.textContent = `${b.long || b.label}: ${has[i] ? fmt(b.y) : 'sin registro'}${tr && tr[i] != null ? ` · ${trendLabel.toLowerCase()}: ${fmt(tr[i])}` : ''}${b.tip ? ` · ${b.tip}` : ''}`;
  };
  const lastI = has.lastIndexOf(true);
  showRead(lastI);

  let lastW = 0;
  const draw = (W) => {
    if (Math.abs(W - lastW) < 4) return; lastW = W;
    const n = bk.length, H = Math.max(170, Math.min(230, Math.round(W * 0.5))), R = 10, T = 18, B = 24;
    const all = [...vals, ...(goal != null ? [goal] : []), ...(tr ? tr.filter((v) => v != null) : [])];
    let lo = zero ? 0 : Math.min(...all), hi = Math.max(...all);
    if (zero) { if (hi <= 0) hi = 1; hi *= 1.06; } else { const pad = Math.max((hi - lo) * 0.15, digits ? 0.5 : 2); lo -= pad; hi += pad; }
    const st = int ? Math.max(1, Math.round(niceStep(hi - lo))) : niceStep(hi - lo); lo = zero ? 0 : Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
    const big = Math.max(Math.abs(lo), Math.abs(hi)) >= 10000;      // con miles grandes: «5 mil, 10 mil, 15 mil»
    const tickTxt = (v) => (big && v ? `${nfmt(v / 1000, 1)} mil` : nfmt(Math.round(v * 10) / 10, 1));
    const L = Math.max(30, 8 + 7 * Math.max(...[lo, hi].map((v) => tickTxt(v).length)));
    const band = (W - L - R) / n;
    const cx = (i) => L + band * (i + 0.5);
    const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });
    for (let v = lo; v <= hi + 1e-9; v += st) {
      svg.append(s('line', { class: 'grid', x1: L, x2: W - R, y1: Y(v), y2: Y(v) }),
        s('text', { class: 'tick', x: L - 6, y: Y(v) + 4, 'text-anchor': 'end' }, tickTxt(v)));
    }
    const hl = s('rect', { class: 'hl', x: 0, y: T - 4, width: Math.max(4, band - 2), height: H - T - B + 4, rx: 4, visibility: 'hidden' });
    svg.append(hl);
    // Etiquetas de abajo: las que quepan (y siempre la última).
    const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor((W - L - R) / 36))));
    bk.forEach((b, i) => { if ((n - 1 - i) % every === 0) svg.append(s('text', { class: 'tick', x: cx(i), y: H - 6, 'text-anchor': 'middle' }, b.label)); });
    if (type === 'bar') {
      const bw = Math.max(3, Math.min(30, band - Math.max(2, band * 0.32)));
      bk.forEach((b, i) => {
        if (!has[i] || Number(b.y) <= 0) return;
        const x = cx(i) - bw / 2, y0 = Y(0), y1 = Y(Number(b.y)), r = Math.min(4, bw / 2, y0 - y1);
        svg.append(s('path', { class: 'bar', d: `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + bw - r}Q${x + bw},${y1} ${x + bw},${y1 + r}V${y0}Z` }));
      });
    } else {
      const segs = []; let cur = [];
      bk.forEach((b, i) => { if (has[i]) cur.push(`${cx(i)},${Y(Number(b.y))}`); });
      if (cur.length > 1) segs.push(cur);
      segs.forEach((p) => svg.append(s('polyline', { class: 'ln', points: p.join(' ') })));
      bk.forEach((b, i) => { if (has[i]) svg.append(s('circle', { class: 'dot', cx: cx(i), cy: Y(Number(b.y)), r: n > 40 ? 3 : 4.5 })); });
    }
    if (tr) {
      let seg = [];
      const flush = () => { if (seg.length > 1) svg.append(s('polyline', { class: 'trend', points: seg.join(' ') })); seg = []; };
      tr.forEach((v, i) => { if (v == null) flush(); else seg.push(`${cx(i)},${Y(v)}`); }); flush();
    }
    if (goal != null) {
      svg.append(s('line', { class: 'goal', x1: L, x2: W - R, y1: Y(goal), y2: Y(goal) }),
        s('text', { class: 'goal-t', x: W - R, y: Y(goal) - 5, 'text-anchor': 'end' }, `${goalLabel} ${nfmt(goal, digits)}`));
    }
    const pick = (ev) => {
      const r = svg.getBoundingClientRect(); const x = ((ev.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(n - 1, Math.floor((x - L) / band)));
      hl.setAttribute('x', cx(i) - Math.max(4, band - 2) / 2); hl.setAttribute('visibility', 'visible'); showRead(i);
    };
    svg.addEventListener('pointermove', pick); svg.addEventListener('pointerdown', pick);
    svg.addEventListener('pointerleave', () => { hl.setAttribute('visibility', 'hidden'); showRead(lastI); });
    fig.replaceChildren(svg);
  };
  const ro = new ResizeObserver(() => { if (!box.isConnected) { ro.disconnect(); return; } draw(Math.round(fig.clientWidth) || 320); });
  ro.observe(fig);
  if (table) box.append(h('details', { class: 'chart-table' }, h('summary', {}, 'Ver los números'),
    h('table', {}, h('tbody', {}, bk.map((b, i) => h('tr', {}, h('th', { scope: 'row' }, b.long || b.label), h('td', {}, has[i] ? fmt(b.y) : '—'), tr ? h('td', { class: 'muted' }, tr[i] != null ? fmt(tr[i]) : '') : null))))));
  return box;
}
