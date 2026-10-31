// Radar de habilidades (8 ejes, fases de 1 a 4). Se dibuja sobre la tarjeta azul del jugador.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// before (opcional): una segunda figura para comparar dos fechas (antes y después).
export function radarSVG({ values, target = [], labels, before = null }, label = 'Radar de habilidades') {
  const W = 400, H = 340, cx = 200, cy = 170, R = 100, LR = 122;
  const n = labels.length;
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i, v) => [cx + Math.cos(ang(i)) * R * (v / 4), cy + Math.sin(ang(i)) * R * (v / 4)];
  const poly = (arr) => arr.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ');
  let s = `<svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">`;
  for (let k = 1; k <= 4; k++) s += `<polygon class="ring" points="${poly(Array(n).fill(k))}"/>`;
  for (let i = 0; i < n; i++) { const [x, y] = pt(i, 4); s += `<line class="axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }
  if (target.some((v) => v > 0)) s += `<polygon class="target" points="${poly(target)}"/>`;
  if (before && before.some((v) => v > 0)) {
    s += `<polygon class="before" points="${poly(before)}"/>`;
    before.forEach((v, i) => { if (v > 0) { const [x, y] = pt(i, v); s += `<circle class="bdot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"/>`; } });
  }
  s += `<polygon class="shape" points="${poly(values)}"/>`;
  values.forEach((v, i) => { if (v > 0) { const [x, y] = pt(i, v); s += `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`; } });
  labels.forEach((t, i) => {
    const c = Math.cos(ang(i)), sn = Math.sin(ang(i));
    const x = cx + c * LR, y = cy + sn * LR + (sn > 0.5 ? 10 : sn < -0.5 ? -2 : 4);
    const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
    s += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}">${esc(t)}</text>`;
  });
  return s + '</svg>';
}
