// Video con dibujos (v3.23).
// 1) drawLayer(): una capa para dibujar encima de un <video> (flecha, línea, círculo o a mano). Los trazos se guardan
//    en coordenadas del cuadro del video (0 a 1), así se ven igual en cualquier pantalla. La usan los videos de técnica.
// 2) La pantalla «Video con dibujos» (#/video): abre un video de tu celular, sin subirlo a ningún lado, para verlo
//    lento o cuadro por cuadro, dibujar y compartir la imagen.
import { h, ic, toast } from '../util.js';
import { note } from './ui.js';

export const COLORS = { y: '#FFD43B', r: '#FF3B30', b: '#2F80ED', w: '#FFFFFF' };
const TOOLS = [['a', 'Flecha', 'arrow-up-right'], ['l', 'Línea', 'minus'], ['c', 'Círculo', 'circle'], ['f', 'A mano', 'pencil']];
const r3 = (x) => Math.round(x * 1000) / 1000;
const MAX_FREE = 40;

// Rectángulo donde realmente se ve el video dentro del elemento (object-fit: contain).
function contentRect(v, w, hgt) {
  const vw = v.videoWidth || 16, vh = v.videoHeight || 9, s = Math.min(w / vw, hgt / vh), cw = vw * s, ch = vh * s;
  return { x: (w - cw) / 2, y: (hgt - ch) / 2, w: cw, h: ch };
}
// Dibuja una lista de trazos en un contexto 2D dentro del rectángulo R.
export function paintShapes(g, shapes, R, scale = 1) {
  const P = (x, y) => [R.x + x * R.w, R.y + y * R.h];
  for (const s of shapes || []) {
    g.strokeStyle = COLORS[s.c] || COLORS.y; g.fillStyle = g.strokeStyle; g.lineWidth = Math.max(2, 4 * scale); g.lineCap = 'round'; g.lineJoin = 'round';
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 3 * scale;
    const p = s.p || [];
    g.beginPath();
    if (s.t === 'c') { const [x1, y1] = P(p[0], p[1]), [x2, y2] = P(p[2], p[3]); g.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2 || 1, Math.abs(y2 - y1) / 2 || 1, 0, 0, Math.PI * 2); g.stroke(); continue; }
    if (s.t === 'f') { for (let i = 0; i < p.length; i += 2) { const [x, y] = P(p[i], p[i + 1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); continue; }
    const [x1, y1] = P(p[0], p[1]), [x2, y2] = P(p[2], p[3]);
    g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    if (s.t === 'a') { const a = Math.atan2(y2 - y1, x2 - x1), L = 16 * scale; g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45)); g.lineTo(x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)); g.closePath(); g.fill(); }
  }
  g.shadowBlur = 0;
}

// La capa. video: el <video>. Devuelve { el, bar, shapes(), set(list), on(bool), clear() }.
export function drawLayer(video) {
  const cv = h('canvas', { class: 'vd-canvas', 'aria-hidden': 'true' });
  const wrap = h('div', { class: 'vd-wrap' }, video, cv);
  let shapes = [], editing = false, tool = 'a', color = 'y', cur = null;
  const fit = () => { const r = video.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr)); cv.style.width = `${r.width}px`; cv.style.height = `${r.height}px`; paint(); };
  const paint = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); const R = contentRect(video, cv.width, cv.height), dpr = window.devicePixelRatio || 1; paintShapes(g, cur ? [...shapes, cur] : shapes, R, dpr); };
  const norm = (e) => { const r = cv.getBoundingClientRect(), R = contentRect(video, r.width, r.height); return [r3(Math.min(1, Math.max(0, (e.clientX - r.left - R.x) / R.w))), r3(Math.min(1, Math.max(0, (e.clientY - r.top - R.y) / R.h)))]; };
  cv.addEventListener('pointerdown', (e) => { if (!editing) return; e.preventDefault(); cv.setPointerCapture(e.pointerId); const [x, y] = norm(e); cur = { t: tool, c: color, p: tool === 'f' ? [x, y] : [x, y, x, y] }; paint(); });
  cv.addEventListener('pointermove', (e) => {
    if (!cur) return; const [x, y] = norm(e);
    if (cur.t === 'f') { const n = cur.p.length, lx = cur.p[n - 2], ly = cur.p[n - 1]; if (Math.hypot(x - lx, y - ly) >= 0.02 && n / 2 < MAX_FREE) cur.p.push(x, y); }
    else { cur.p[2] = x; cur.p[3] = y; }
    paint();
  });
  const end = () => { if (!cur) return; const p = cur.p; const big = cur.t === 'f' ? p.length >= 4 : Math.hypot(p[2] - p[0], p[3] - p[1]) > 0.02; if (big) shapes.push(cur); cur = null; paint(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  new ResizeObserver(fit).observe(video);
  video.addEventListener('loadedmetadata', fit);
  const toolBtns = h('div', { class: 'vd-tools', role: 'group', 'aria-label': 'Herramienta de dibujo' });
  const paintBar = () => toolBtns.replaceChildren(
    ...TOOLS.map(([k, t, icn]) => h('button', { type: 'button', class: 'pz-tool', 'aria-pressed': tool === k ? 'true' : 'false', onclick: () => { tool = k; paintBar(); } }, ic(icn, 18), t)),
    h('div', { class: 'vd-colors', role: 'group', 'aria-label': 'Color' }, Object.entries(COLORS).map(([k, c]) => h('button', { type: 'button', class: 'vd-color', style: { background: c }, 'aria-label': { y: 'Amarillo', r: 'Rojo', b: 'Azul', w: 'Blanco' }[k], 'aria-pressed': color === k ? 'true' : 'false', onclick: () => { color = k; paintBar(); } }))),
    h('button', { type: 'button', class: 'btn sm', onclick: () => { shapes.pop(); paint(); } }, ic('undo', 16), 'Deshacer'),
    h('button', { type: 'button', class: 'btn sm', onclick: () => { shapes = []; paint(); } }, ic('eraser', 16), 'Borrar'));
  paintBar();
  const bar = h('div', { class: 'stack vd-bar', hidden: true }, toolBtns);
  const api = {
    el: wrap, bar,
    shapes: () => shapes.map((s) => ({ t: s.t, c: s.c, p: s.p.slice() })),
    set: (list) => { shapes = (list || []).map((s) => ({ ...s, p: [...s.p] })); paint(); },
    clear: () => { shapes = []; paint(); },
    on: (v) => { editing = !!v; wrap.classList.toggle('drawing', editing); bar.hidden = !editing; if (editing) { video.pause(); video.controls = false; } else video.controls = true; fit(); },
    get editing() { return editing; },
    fit,
  };
  setTimeout(fit, 50);
  return api;
}

// Imagen del cuadro con el dibujo. Si el navegador no deja copiar el cuadro (video de otro sitio), sale solo el dibujo.
export async function snapshot(video, shapes, name = 'cuadro') {
  const vw = video.videoWidth || 1280, vh = video.videoHeight || 720, s = Math.min(1, 1280 / Math.max(vw, vh));
  const make = () => { const c = document.createElement('canvas'); c.width = Math.round(vw * s); c.height = Math.round(vh * s); return c; };
  let cv = make(), g = cv.getContext('2d'), frame = true;
  try { g.drawImage(video, 0, 0, cv.width, cv.height); g.getImageData(0, 0, 1, 1); }
  catch { frame = false; cv = make(); g = cv.getContext('2d'); g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, cv.width, cv.height); }
  paintShapes(g, shapes, { x: 0, y: 0, w: cv.width, h: cv.height }, cv.width / 600);
  const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.88));
  const file = new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
  try {
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: name });
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Imagen descargada'); }
  } catch (e) { if (e?.name !== 'AbortError') toast('No se pudo compartir'); }
  if (!frame) toast('El navegador no dejó copiar el cuadro del video: la imagen lleva solo el dibujo.', 5000);
}

const fmtT = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${Math.floor((t % 1) * 10)}`;

// ---------- pantalla: analizar un video de tu celular ----------
export default function videoDibujo(ctx) {
  const ui = ctx.ui; ui.marks ??= [];
  const vid = h('video', { playsinline: true, controls: true, preload: 'metadata', class: 'tv-video vd-video' });
  vid.setAttribute('playsinline', ''); vid.setAttribute('webkit-playsinline', '');
  if (ui.url) vid.src = ui.url;
  const layer = drawLayer(vid);
  const file = h('input', { type: 'file', accept: 'video/*', class: 'sr-only', id: 'vd-file', onchange: (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (ui.url) URL.revokeObjectURL(ui.url);
    ui.url = URL.createObjectURL(f); ui.fname = f.name.replace(/\.[^.]+$/, ''); ui.marks = [];
    ctx.rerender();
  } });
  const rate = (r) => { vid.playbackRate = r; toast(`Velocidad ${r === 1 ? 'normal' : `×${r}`}`, 900); };
  const step = (d) => { vid.pause(); vid.currentTime = Math.max(0, Math.min(vid.duration || 0, vid.currentTime + d)); };
  const marks = h('div', { class: 'rows' });
  const paintMarks = () => { if (typeof marksBox !== 'undefined') marksBox.hidden = !ui.marks.length; marks.replaceChildren(...ui.marks.slice().sort((a, b) => a.t - b.t).map((mk) => h('div', { class: 'row' },
    h('button', { type: 'button', class: 'btn sm', onclick: () => { layer.on(false); drawBtn.setAttribute('aria-pressed', 'false'); vid.pause(); vid.currentTime = mk.t; layer.set(mk.shapes); } }, ic('clock', 14), fmtT(mk.t)),
    h('span', { class: 'row-main' }, mk.text || `${mk.shapes.length} ${mk.shapes.length === 1 ? 'trazo' : 'trazos'}`),
    h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Quitar marca', onclick: () => { ui.marks = ui.marks.filter((x) => x !== mk); paintMarks(); } }, ic('x', 18))))); };
  const marksBox = h('section', { class: 'stack', hidden: !ui.marks.length }, h('h3', { style: { margin: 0 } }, 'Marcas'), marks);
  paintMarks();
  vid.addEventListener('play', () => { if (!layer.editing) layer.clear(); });
  const drawBtn = h('button', { type: 'button', class: 'btn sm primary', 'aria-pressed': 'false', onclick: () => { const on = !layer.editing; layer.on(on); drawBtn.setAttribute('aria-pressed', String(on)); drawBtn.lastChild.textContent = on ? 'Listo' : 'Dibujar'; } }, ic('pencil', 16), h('span', {}, 'Dibujar'));
  const txt = h('input', { type: 'text', maxlength: 120, placeholder: 'Nota de este momento (opcional)', 'aria-label': 'Nota de la marca' });
  const el = h('div', { class: 'page vd' },
    h('p', { style: { margin: 0 } }, 'Abre un video de tu celular (por ejemplo, el partido grabado). Se queda en tu celular: no se sube a ningún lado.'),
    h('label', { class: 'btn', for: 'vd-file', style: { justifySelf: 'start' } }, ic('video', 18), ui.url ? 'Abrir otro video' : 'Abrir un video'), file,
    ui.url ? h('div', { class: 'stack' },
      layer.el, layer.bar,
      h('div', { class: 'cluster' },
        h('button', { type: 'button', class: 'btn sm', onclick: () => step(-1 / 30) }, ic('chevron-left', 16), 'Cuadro'),
        h('button', { type: 'button', class: 'btn sm', onclick: () => step(1 / 30) }, 'Cuadro', ic('chevron-right', 16)),
        h('button', { type: 'button', class: 'btn sm', onclick: () => rate(0.25) }, '×0.25'),
        h('button', { type: 'button', class: 'btn sm', onclick: () => rate(0.5) }, '×0.5'),
        h('button', { type: 'button', class: 'btn sm', onclick: () => rate(1) }, 'Normal'), drawBtn),
      h('div', { class: 'cluster' },
        h('button', { type: 'button', class: 'btn sm', onclick: () => { const s = layer.shapes(); if (!s.length && !txt.value.trim()) { toast('Dibuja algo o escribe una nota'); return; } ui.marks.push({ t: Math.round(vid.currentTime * 10) / 10, shapes: s, text: txt.value.trim() }); txt.value = ''; paintMarks(); toast('Marca guardada'); } }, ic('plus', 16), 'Guardar marca'),
        h('button', { type: 'button', class: 'btn sm', onclick: () => snapshot(vid, layer.shapes(), `${ui.fname || 'video'}-${fmtT(vid.currentTime).replace(/[:.]/g, '-')}`) }, ic('share-2', 16), 'Compartir imagen')),
      txt,
      marksBox,
      note('Las marcas se borran al cerrar la app: el video no se guarda en Remate. Para que quede, comparte la imagen de cada momento.'))
      : note('Tip: graba el partido desde atrás de la cancha, un poco alto, con el celular de lado.'));
  return { title: 'Video con dibujos', back: '#/mas', el };
}
