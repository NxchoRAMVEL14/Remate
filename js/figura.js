// Muñequito animado (v3.9): dibuja un movimiento con poses clave y lo anima en bucle.
// Vista de lado (mira a la derecha) o de frente. Ángulos en grados:
//   piernas y brazos: desde abajo (0 = colgando) y positivo hacia adelante (de lado) o hacia afuera (de frente);
//   tronco: desde arriba (0 = derecho) y positivo inclinado hacia adelante.
// Un solo reloj anima todas las figuras visibles. Con «reducir movimiento» o al imprimir se ven las poses fijas.
import { h } from './util.js';

const W = 200, H = 186, GROUND = 176;
const LEN = { torso: 40, neck: 5, head: 8, thigh: 29, shin: 29, foot: 9, upper: 22, fore: 21 };
const rad = (d) => (d * Math.PI) / 180;
const down = (o, deg, len, mirror = 1) => [o[0] + mirror * Math.sin(rad(deg)) * len, o[1] + Math.cos(rad(deg)) * len];

// Pose por omisión: de pie, brazos relajados.
export const STAND = { t: 0, L: [0, 0, 90], R: [0, 0, 90], A: [8, 15], B: [-6, 0], x: 0, up: 0 };
export const pose = (o = {}) => ({ ...STAND, ...o });

// Calcula las articulaciones de una pose.
function joints(p, view, groundY) {
  const front = view === 'front';
  const hip = [W / 2 + (p.x || 0), 0];
  const sh = [hip[0] + Math.sin(rad(p.t)) * LEN.torso, hip[1] - Math.cos(rad(p.t)) * LEN.torso];
  const neck = [hip[0] + Math.sin(rad(p.t)) * (LEN.torso + LEN.neck), hip[1] - Math.cos(rad(p.t)) * (LEN.torso + LEN.neck)];
  const headA = p.t + (p.hd || 0);
  const head = [neck[0] + Math.sin(rad(headA)) * LEN.head, neck[1] - Math.cos(rad(headA)) * LEN.head];
  const limbs = {};
  const leg = (key, ang, side) => {
    const m = front ? side : 1, base = front ? [hip[0] + side * 6, hip[1]] : hip;
    const knee = down(base, ang[0], LEN.thigh, m), ank = down(knee, ang[1], LEN.shin, m), toe = down(ank, ang[2] ?? 90, front ? 3 : LEN.foot, m);
    limbs[key] = [base, knee, ank, toe];
  };
  const arm = (key, ang, side) => {
    const m = front ? side : 1, base = front ? [sh[0] + side * 10, sh[1] + 2] : sh;
    const el = down(base, ang[0], LEN.upper, m), hand = down(el, ang[1], LEN.fore, m);
    limbs[key] = [base, el, hand];
  };
  leg('L', p.L, 1); leg('R', p.R, -1); arm('A', p.A, 1); arm('B', p.B, -1);
  const pts = [head, sh, ...limbs.L, ...limbs.R, ...limbs.A, ...limbs.B];
  // Lo más bajo del cuerpo toca el piso (o el cajón, o queda en el aire con «up»).
  const lowest = Math.max(...pts.map((q) => q[1] + (q === head ? LEN.head : 0)));
  const dy = (groundY - (p.up || 0)) - lowest;
  const mv = (q) => [q[0], q[1] + dy];
  const out = { hip: mv(hip), sh: mv(sh), neck: mv(neck), head: mv(head) };
  for (const k of Object.keys(limbs)) out[k] = limbs[k].map(mv);
  return out;
}

const lerp = (a, b, k) => a + (b - a) * k;
const lerpPose = (a, b, k) => {
  const o = {};
  for (const key of Object.keys(STAND)) {
    const va = a[key] ?? STAND[key], vb = b[key] ?? STAND[key];
    o[key] = Array.isArray(va) ? va.map((v, i) => lerp(v, vb[i] ?? v, k)) : lerp(va, vb, k);
  }
  o.hd = lerp(a.hd || 0, b.hd || 0, k);
  return o;
};
const ease = (k) => 0.5 - Math.cos(Math.PI * k) / 2;

// Utilería que se dibuja pegada al cuerpo o fija en la escena.
function propsSVG(mv, J, groundY) {
  const out = [];
  const A = J.A[2], B = J.B[2];
  const handMid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  for (const pr of mv.props || []) {
    const k = typeof pr === 'string' ? pr : pr.k;
    if (k === 'bar') out.push(`<circle class="fg-pr" cx="${A[0].toFixed(1)}" cy="${A[1].toFixed(1)}" r="9"/><circle class="fg-pr2" cx="${A[0].toFixed(1)}" cy="${A[1].toFixed(1)}" r="2.5"/>`);
    else if (k === 'barback') { const s = J.sh; out.push(`<circle class="fg-pr" cx="${(s[0] - 3).toFixed(1)}" cy="${(s[1] + 1).toFixed(1)}" r="9"/><circle class="fg-pr2" cx="${(s[0] - 3).toFixed(1)}" cy="${(s[1] + 1).toFixed(1)}" r="2.5"/>`); }
    else if (k === 'barhip') { const p = J.hip; out.push(`<circle class="fg-pr" cx="${(p[0] + 2).toFixed(1)}" cy="${(p[1] - 6).toFixed(1)}" r="9"/><circle class="fg-pr2" cx="${(p[0] + 2).toFixed(1)}" cy="${(p[1] - 6).toFixed(1)}" r="2.5"/>`); }
    else if (k === 'db') for (const q of [A, B]) out.push(`<rect class="fg-pr" x="${(q[0] - 5).toFixed(1)}" y="${(q[1] - 2.5).toFixed(1)}" width="10" height="5" rx="2"/>`);
    else if (k === 'db1') out.push(`<rect class="fg-pr" x="${(A[0] - 5).toFixed(1)}" y="${(A[1] - 2.5).toFixed(1)}" width="10" height="5" rx="2"/>`);
    else if (k === 'dbchest') out.push(`<rect class="fg-pr" x="${(handMid[0] - 3).toFixed(1)}" y="${(handMid[1] - 7).toFixed(1)}" width="6" height="12" rx="2"/>`);
    else if (k === 'mb') out.push(`<circle class="fg-pr" cx="${handMid[0].toFixed(1)}" cy="${(handMid[1] - 2).toFixed(1)}" r="6.5"/>`);
    else if (k === 'ball') out.push(`<circle class="fg-ball" cx="${handMid[0].toFixed(1)}" cy="${(handMid[1] - 5).toFixed(1)}" r="5.5"/>`);
    else if (k === 'ankle') for (const q of [J.L[2]]) out.push(`<rect class="fg-pr" x="${(q[0] - 3.5).toFixed(1)}" y="${(q[1] - 5).toFixed(1)}" width="7" height="6" rx="2"/>`);
    else if (k === 'band') { const to = [pr.to?.[0] ?? 20, pr.to?.[1] ?? J.A[2][1]]; out.push(`<line class="fg-band" x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${to[0]}" y2="${to[1]}"/>`); }
    else if (k === 'cable') { const to = pr.to || [20, 20]; out.push(`<line class="fg-band" x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${to[0]}" y2="${to[1]}"/><rect class="fg-pr" x="${to[0] - 3}" y="${to[1] - 3}" width="6" height="6"/>`); }
    else if (k === 'kneeband') { const a = J.L[1]; out.push(`<line class="fg-band" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${pr.to || 190}" y2="${a[1].toFixed(1)}"/><rect class="fg-pr" x="${(pr.to || 190) - 3}" y="${(a[1] - 3).toFixed(1)}" width="6" height="6"/>`); }
    else if (k === 'grip') out.push(`<line class="fg-wall" x1="${(A[0] - 30).toFixed(1)}" y1="${(A[1] - 2).toFixed(1)}" x2="${(A[0] + 30).toFixed(1)}" y2="${(A[1] - 2).toFixed(1)}"/>`);
    else if (k === 'ballA') out.push(`<circle class="fg-ball" cx="${A[0].toFixed(1)}" cy="${(A[1] - 6).toFixed(1)}" r="5.5"/>`);
    else if (k === 'ballB') out.push(`<circle class="fg-ball" cx="${B[0].toFixed(1)}" cy="${(B[1] - 6).toFixed(1)}" r="5.5"/>`);
    else if (k === 'dbhip') { const p = J.hip; out.push(`<rect class="fg-pr" x="${(p[0] - 5).toFixed(1)}" y="${(p[1] - 8).toFixed(1)}" width="12" height="6" rx="2"/>`); }
    else if (k === 'footplate') { const q = J.L[2]; out.push(`<line class="fg-wall" x1="${(q[0] + 4).toFixed(1)}" y1="${(q[1] - 16).toFixed(1)}" x2="${(q[0] + 4).toFixed(1)}" y2="${(q[1] + 10).toFixed(1)}"/>`); }
  }
  return out.join('');
}
function sceneSVG(mv, groundY) {
  const s = [];
  for (const pr of mv.props || []) {
    if (typeof pr === 'string') continue;
    const { k } = pr;
    if (k === 'box' || k === 'bench' || k === 'step') s.push(`<rect class="fg-box" x="${pr.x}" y="${GROUND - pr.h}" width="${pr.w}" height="${pr.h}" rx="2"/>`);
    else if (k === 'wall') s.push(`<line class="fg-wall" x1="${pr.x}" y1="10" x2="${pr.x}" y2="${GROUND}"/>`);
    else if (k === 'pullbar') s.push(`<line class="fg-wall" x1="${pr.x1}" y1="${pr.y}" x2="${pr.x2}" y2="${pr.y}"/>`);
    else if (k === 'cone') for (const x of pr.xs) s.push(`<path class="fg-cone" d="M${x - 5} ${GROUND} L${x} ${GROUND - 12} L${x + 5} ${GROUND} Z"/>`);
    else if (k === 'line') s.push(`<line class="fg-mark" x1="${pr.x}" y1="${GROUND - 1}" x2="${pr.x}" y2="${GROUND + 6}"/>`);
    else if (k === 'net') s.push(`<line class="fg-net" x1="${pr.x}" y1="${pr.y}" x2="${pr.x}" y2="${GROUND}"/>`);
    else if (k === 'pad') s.push(`<rect class="fg-box" x="${pr.x}" y="${pr.y}" width="${pr.w}" height="${pr.h}" rx="2"/>`);
  }
  return s.join('');
}

const seg = (a, b, cls) => `<line class="${cls}" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"/>`;
const poly = (pts, cls) => `<polyline class="${cls}" points="${pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ')}"/>`;
function bodySVG(mv, p) {
  const groundY = GROUND;
  const J = joints(p, mv.view, groundY);
  const front = mv.view === 'front';
  const far = front ? 'fg-limb' : 'fg-far';
  const sh = (p.up || 0) > 2 ? Math.max(0.35, 1 - (p.up || 0) / 60) : 1;
  return `<ellipse class="fg-shadow" cx="${J.hip[0].toFixed(1)}" cy="${GROUND + 1}" rx="${(22 * sh).toFixed(1)}" ry="2.5"/>`
    + poly(J.R, far) + poly(J.B, far)
    + `<line class="fg-torso" x1="${J.hip[0].toFixed(1)}" y1="${J.hip[1].toFixed(1)}" x2="${J.neck[0].toFixed(1)}" y2="${J.neck[1].toFixed(1)}"/>`
    + (front ? seg([J.hip[0] - 6, J.hip[1]], [J.hip[0] + 6, J.hip[1]], 'fg-limb') + seg([J.sh[0] - 10, J.sh[1] + 2], [J.sh[0] + 10, J.sh[1] + 2], 'fg-limb') : '')
    + `<circle class="fg-head" cx="${J.head[0].toFixed(1)}" cy="${J.head[1].toFixed(1)}" r="${LEN.head}"/>`
    + poly(J.L, 'fg-limb') + poly(J.A, 'fg-limb')
    + propsSVG(mv, J, groundY);
}

// Pose en el instante k (0..1) de un ciclo.
function poseAt(mv, k) {
  const fr = mv.frames, n = fr.length;
  if (n === 1) return fr[0];
  const hold = mv.hold || [];
  // Cada tramo dura lo mismo, más las pausas indicadas en las poses clave.
  const w = fr.map((_, i) => 1 + (hold[i] || 0));
  const tot = w.reduce((a, b) => a + b, 0);
  let x = k * tot, i = 0;
  while (i < n - 1 && x > w[i]) { x -= w[i]; i++; }
  const pausa = (hold[i] || 0) / w[i];
  const kk = x / w[i];
  const t = kk < pausa ? 0 : (kk - pausa) / (1 - pausa);
  return lerpPose(fr[i], fr[(i + 1) % n], ease(Math.min(1, Math.max(0, t))));
}

const CSS_CLASSES = 'fg';
// Figuras vivas en pantalla: un solo reloj las mueve.
const LIVE = new Set();
let raf = 0;
const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function tick(now) {
  raf = 0;
  for (const f of LIVE) {
    if (!f.el.isConnected) { LIVE.delete(f); f.io?.disconnect(); continue; }
    if (f.paused || !f.visible) continue;
    const mv = f.seq[f.cur];
    const dur = (mv.ms || 1800);
    f.acc += Math.min(100, now - (f.last || now)); f.last = now;
    if (f.acc >= dur * (mv.reps || (f.seq.length > 1 ? 2 : 1))) { f.acc = 0; if (f.seq.length > 1) { f.cur = (f.cur + 1) % f.seq.length; f.onMove?.(f.cur); } }
    const m2 = f.seq[f.cur];
    f.g.innerHTML = bodySVG(m2, poseAt(m2, (f.acc % (m2.ms || 1800)) / (m2.ms || 1800)));
    f.scene.innerHTML = sceneSVG(m2);
  }
  for (const f of LIVE) { if (!f.paused && f.visible) { raf = requestAnimationFrame(tick); break; } }
}
const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

// moves: un movimiento o una lista (se turnan). opts: { size, caption, still }
export function figure(moves, { size = 'md', label = '', still = false, onMove } = {}) {
  const seq = (Array.isArray(moves) ? moves : [moves]).filter(Boolean);
  if (!seq.length) return null;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H + 6}`);
  svg.setAttribute('class', `fg ${CSS_CLASSES}-${size}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label || seq.map((m) => m.name).join(', '));
  svg.innerHTML = `<line class="fg-ground" x1="6" y1="${GROUND + 1}" x2="${W - 6}" y2="${GROUND + 1}"/><g class="fg-scene"></g><g class="fg-body"></g>`;
  const scene = svg.querySelector('.fg-scene'), g = svg.querySelector('.fg-body');
  const f = { el: svg, g, scene, seq, cur: 0, acc: 0, last: 0, paused: false, visible: true, onMove };
  const draw0 = () => { g.innerHTML = bodySVG(seq[f.cur], seq[f.cur].frames[0]); scene.innerHTML = sceneSVG(seq[f.cur]); };
  draw0();
  const wrap = h('div', { class: `fg-wrap fg-wrap-${size}` }, svg);
  if (still || reduce()) return stillStrip(seq, size, label) || wrap;
  const btn = h('button', { type: 'button', class: 'fg-play', 'aria-label': 'Pausar o seguir el dibujo' }, '❚❚');
  const toggle = () => { f.paused = !f.paused; btn.textContent = f.paused ? '▶' : '❚❚'; f.last = 0; wrap.classList.toggle('paused', f.paused); if (!f.paused) wake(); };
  svg.addEventListener('click', toggle); btn.addEventListener('click', toggle);
  wrap.append(btn);
  if ('IntersectionObserver' in window) {
    f.io = new IntersectionObserver((es) => { for (const e of es) { f.visible = e.isIntersecting; f.last = 0; if (f.visible) wake(); } });
    f.io.observe(svg);
  }
  LIVE.add(f); wake();
  f.api = { el: wrap, show: (i) => { f.cur = i % seq.length; f.acc = 0; f.last = 0; draw0(); wake(); } };
  wrap._fig = f.api;
  return wrap;
}

// Poses fijas lado a lado (inicio → final): para imprimir o si el celular pide menos movimiento.
export function stillStrip(moves, size = 'sm', label = '') {
  const seq = (Array.isArray(moves) ? moves : [moves]).filter(Boolean);
  if (!seq.length) return null;
  const mv = seq[0];
  const frames = mv.frames.length > 3 ? [mv.frames[0], mv.frames[Math.floor(mv.frames.length / 2)], mv.frames[mv.frames.length - 1]] : mv.frames;
  const wrap = h('div', { class: `fg-strip fg-strip-${size}`, role: 'img', 'aria-label': label || mv.name });
  frames.forEach((p, i) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H + 6}`); svg.setAttribute('class', 'fg');
    svg.innerHTML = `<line class="fg-ground" x1="6" y1="${GROUND + 1}" x2="${W - 6}" y2="${GROUND + 1}"/>${sceneSVG(mv)}${bodySVG(mv, p)}`;
    wrap.append(svg);
    if (i < frames.length - 1) wrap.append(h('span', { class: 'fg-arrow', 'aria-hidden': 'true' }, '→'));
  });
  return wrap;
}

// SVG en texto de una pose (para los manuales y pruebas).
export function poseSVG(mv, i = 0) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H + 6}" class="fg"><line class="fg-ground" x1="6" y1="${GROUND + 1}" x2="${W - 6}" y2="${GROUND + 1}"/>${sceneSVG(mv)}${bodySVG(mv, mv.frames[i])}</svg>`;
}
export const _test = { joints, poseAt };

// Dibujo con su pie: el nombre del movimiento que se ve (si son varios, se turnan y el pie lo dice).
export function figCard(moves, { size = 'md', still = false } = {}) {
  const seq = (Array.isArray(moves) ? moves : [moves]).filter(Boolean);
  if (!seq.length) return null;
  const cap = h('div', { class: 'fg-cap', 'aria-live': 'off' });
  const say = (i) => { cap.textContent = seq.length > 1 ? `${seq[i].name} (${i + 1} de ${seq.length})` : seq[0].name; };
  const fig = figure(seq, { size, still, onMove: say });
  say(0);
  return h('figure', { class: `fg-card fg-card-${size}`, style: { margin: 0 } }, fig, cap);
}

// Para listas de ejercicios plegables: el dibujo se crea hasta que abres el ejercicio.
export function lazyFig(moves, opts = {}) {
  const slot = h('div', { class: 'fg-slot' });
  const fill = () => { if (!slot.firstChild && moves?.length) { const c = figCard(moves, opts); if (c) slot.append(c); } };
  return { slot, ontoggle: (e) => { if (e.target.open) fill(); }, fill };
}
