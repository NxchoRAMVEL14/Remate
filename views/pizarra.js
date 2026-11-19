// Pizarra (v3.21): la cancha completa para explicar en el partido o en el entreno. Arriba el rival y abajo tu equipo,
// cada quien en su ficha; las arrastras, dibujas flechas (de tu equipo, del rival o del balón), rotas a cualquiera de
// los dos lados y guardas «pasos» para ver la jugada animada. Desde un partido, tus 6 salen en la rotación de ese
// momento. Las jugadas se guardan en los ajustes del equipo (no necesita SQL) y se comparten como imagen.
import { h, ic, toast, openSheet, confirmSheet, uid, fmtDate, rivalKey } from '../util.js';
import { state, players, playerById, settings, saveSettings, isStaff, profile } from '../store.js';
import { replay } from '../match-calc.js';
import { note } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v); kids.flat().forEach((c) => c != null && e.append(c)); return e; };
const W = 90, H = 180, NET = 90;          // cancha de 9 × 18 m (×10), red a la mitad
const US_Z = { 4: [15, 106], 3: [45, 106], 2: [75, 106], 5: [15, 152], 6: [45, 152], 1: [75, 152] };   // vista desde tu banca
const TH_Z = { 2: [15, 74], 3: [45, 74], 4: [75, 74], 1: [15, 28], 6: [45, 28], 5: [75, 28] };   // el rival, de frente
const COLORS = { us: '#1B4FA8', them: '#C62828', ball: '#E0A100' };
const MAX_BOARDS = 40;
const r1 = (x) => Math.round(x * 10) / 10;
const clone = (o) => JSON.parse(JSON.stringify(o));

// Fichas iniciales: tus 6 (con los de la rotación si los hay) y los 6 del rival.
function fresh(slots = null) {
  const us = [1, 2, 3, 4, 5, 6].map((z) => {
    const pid = slots?.[z - 1] || null, p = pid ? playerById(pid) : null;
    return { id: `u${z}`, z, x: US_Z[z][0], y: US_Z[z][1], label: p ? (p.jersey != null ? String(p.jersey) : p.name.slice(0, 2)) : String(z), pid };
  });
  const them = [1, 2, 3, 4, 5, 6].map((z) => ({ id: `t${z}`, z, x: TH_Z[z][0], y: TH_Z[z][1], label: String(z) }));
  return { us, them, ball: { x: 75, y: 168 }, arrows: [], steps: [] };
}
// Rotar: cada ficha pasa a la siguiente zona (2→1, 1→6, 6→5, 5→4, 4→3, 3→2).
const NEXT_Z = { 2: 1, 1: 6, 6: 5, 5: 4, 4: 3, 3: 2 };
function rotate(list, Z) { for (const t of list) { t.z = NEXT_Z[t.z]; [t.x, t.y] = Z[t.z]; } }
const snapshot = (b) => ({ us: b.us.map((t) => [t.x, t.y]), them: b.them.map((t) => [t.x, t.y]), ball: [b.ball.x, b.ball.y], arrows: clone(b.arrows) });
function applySnap(b, s) { s.us.forEach(([x, y], i) => { if (b.us[i]) Object.assign(b.us[i], { x, y }); }); s.them.forEach(([x, y], i) => { if (b.them[i]) Object.assign(b.them[i], { x, y }); }); [b.ball.x, b.ball.y] = s.ball; b.arrows = clone(s.arrows); }

const boardsOf = () => (Array.isArray(settings().boards) ? settings().boards : []);
function saveBoards(list) { saveSettings({ boards: list.slice(0, MAX_BOARDS) }); }

export default function pizarra(ctx) {
  const ui = ctx.ui, [arg] = ctx.args;
  const m = arg && arg !== 'j' ? (state.data.matches || []).find((x) => x.id === arg) : null;
  const saved = arg === 'j' ? boardsOf().find((x) => x.id === ctx.args[1]) : null;
  const canSave = ctx.role === 'coach';
  if (!ui.b) {
    if (saved) { ui.b = clone(saved.b); ui.name = saved.name; ui.savedId = saved.id; }
    else {
      let slots = null;
      if (m) { try { const log = (state.data.matchLogs || []).find((l) => l.match_id === m.id)?.log || []; slots = replay(log, m.lineups || [], players()).cur?.slots || m.lineups?.[0]?.slots || null; } catch { slots = m.lineups?.[0]?.slots || null; } }
      ui.b = fresh(slots); ui.name = m ? `Contra ${m.rival}` : '';
      // v3.23: si tienes scouting de ese rival, sus números (primero los que atacan) en lugar del 1 al 6.
      if (m) { const sc = (profile().scouting || {})[rivalKey(m.rival)]; const ns = (sc?.players || []).filter((p) => p.num).sort((a, b) => (b.attacks ? 1 : 0) - (a.attacks ? 1 : 0)).map((p) => String(p.num)).slice(0, 6); ns.forEach((n, i) => { ui.b.them[i].label = n; }); }
    }
    ui.tool = 'move'; ui.hist = []; ui.step = -1;
  }
  const b = ui.b;
  const push = () => { ui.hist.push(JSON.stringify(b)); if (ui.hist.length > 40) ui.hist.shift(); };

  // ---------- la cancha ----------
  const svg = S('svg', { viewBox: `-6 -6 ${W + 12} ${H + 12}`, class: 'pz-svg', role: 'img', 'aria-label': 'Pizarra: cancha con tu equipo abajo y el rival arriba' });
  const defs = S('defs', {}, ...Object.entries(COLORS).map(([k, c]) => S('marker', { id: `pz-a-${k}`, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, S('path', { d: 'M0,0 L10,5 L0,10 z', fill: c }))));
  const court = S('g', {},
    S('rect', { x: -6, y: -6, width: W + 12, height: H + 12, rx: 3, class: 'pz-out' }),
    S('rect', { x: 0, y: 0, width: W, height: H, class: 'pz-court' }),
    S('line', { x1: 0, y1: NET - 30, x2: W, y2: NET - 30, class: 'pz-line' }), S('line', { x1: 0, y1: NET + 30, x2: W, y2: NET + 30, class: 'pz-line' }),
    S('line', { x1: -6, y1: NET, x2: W + 6, y2: NET, class: 'pz-net' }),
    S('text', { x: W / 2, y: 12, class: 'pz-side' }, 'Rival'), S('text', { x: W / 2, y: H - 5, class: 'pz-side' }, 'Nosotros'));
  const arrowsG = S('g'), tokensG = S('g'), drawG = S('g');
  svg.append(defs, court, arrowsG, tokensG, drawG);

  const toPt = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return { x: Math.max(-4, Math.min(W + 4, q.x)), y: Math.max(-4, Math.min(H + 4, q.y)) }; };
  function paintArrows() {
    arrowsG.replaceChildren(...b.arrows.map((a) => S('line', { x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, class: `pz-arrow ${a.c}`, stroke: COLORS[a.c], 'marker-end': `url(#pz-a-${a.c})` })));
  }
  function tokenEl(t, kind) {
    const g = S('g', { class: `pz-tok ${kind}`, transform: `translate(${t.x} ${t.y})`, 'data-id': t.id, tabindex: 0, role: 'button', 'aria-label': `${kind === 'us' ? 'Tu jugador' : 'Rival'} ${t.label}` },
      S('circle', { r: 7.2, fill: COLORS[kind] }), S('text', { class: 'pz-lbl', y: 0.4 }, t.label.slice(0, 3)));
    g._t = t; return g;
  }
  function paintTokens() {
    const ball = S('g', { class: 'pz-tok ball', transform: `translate(${b.ball.x} ${b.ball.y})`, 'data-id': 'ball', role: 'button', 'aria-label': 'Balón' }, S('circle', { r: 4.2, fill: '#FFD43B', stroke: '#8A6500', 'stroke-width': 0.8 }), S('path', { d: 'M-4,0 Q0,-2 4,0 M0,-4 Q-1.5,0 0,4', fill: 'none', stroke: '#8A6500', 'stroke-width': 0.6 }));
    ball._t = b.ball;
    tokensG.replaceChildren(...b.them.map((t) => tokenEl(t, 'them')), ...b.us.map((t) => tokenEl(t, 'us')), ball);
  }
  const paint = () => { paintArrows(); paintTokens(); };
  paint();

  let drag = null;
  svg.addEventListener('pointerdown', (e) => {
    const pt = toPt(e);
    if (ui.tool === 'move') {
      const g = e.target.closest?.('.pz-tok'); if (!g) return;
      push(); drag = { g, t: g._t, moved: false, ox: pt.x - g._t.x, oy: pt.y - g._t.y }; svg.setPointerCapture(e.pointerId); g.classList.add('on'); e.preventDefault();
    } else {
      push(); drag = { arrow: { x1: r1(pt.x), y1: r1(pt.y), x2: r1(pt.x), y2: r1(pt.y), c: ui.tool } }; svg.setPointerCapture(e.pointerId); e.preventDefault();
    }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pt = toPt(e);
    if (drag.t) { drag.moved = true; drag.t.x = r1(pt.x - drag.ox); drag.t.y = r1(pt.y - drag.oy); drag.g.setAttribute('transform', `translate(${drag.t.x} ${drag.t.y})`); }
    else { Object.assign(drag.arrow, { x2: r1(pt.x), y2: r1(pt.y) }); drawG.replaceChildren(S('line', { ...drag.arrow, class: `pz-arrow ${drag.arrow.c}`, stroke: COLORS[drag.arrow.c], 'marker-end': `url(#pz-a-${drag.arrow.c})` })); }
  });
  const end = () => {
    if (!drag) return;
    if (drag.t) { drag.g.classList.remove('on'); if (!drag.moved) { ui.hist.pop(); renameSheet(drag.t, drag.g.classList.contains('us') ? 'us' : drag.g.classList.contains('them') ? 'them' : 'ball'); } }
    else { const a = drag.arrow; drawG.replaceChildren(); if (Math.hypot(a.x2 - a.x1, a.y2 - a.y1) > 4) b.arrows.push(a); else ui.hist.pop(); paintArrows(); }
    drag = null;
  };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);

  function renameSheet(t, kind) {
    if (kind === 'ball') return;
    let sh;
    const inp = h('input', { type: 'text', maxlength: 3, value: t.label, 'aria-label': 'Número o letras' });
    const roster = kind === 'us' ? players().filter((p) => p.active !== false) : [];
    sh = openSheet({ title: kind === 'us' ? '¿Quién es?' : 'Jugador del rival', body: h('div', { class: 'stack' },
      roster.length ? h('div', { class: 'pz-roster' }, roster.map((p) => h('button', { type: 'button', class: `btn sm ${t.pid === p.id ? 'primary' : ''}`, onclick: () => { push(); t.pid = p.id; t.label = p.jersey != null ? String(p.jersey) : p.name.slice(0, 2); sh?.close(); paint(); } }, p.jersey != null ? `${p.jersey} · ${p.name}` : p.name))) : null,
      h('label', { class: 'field' }, h('span', { class: 'label' }, kind === 'us' ? 'O escribe un número o letras' : 'Número o letras (hasta 3)'), inp),
      h('button', { type: 'button', class: 'btn primary', onclick: () => { push(); t.label = inp.value.trim().slice(0, 3) || t.label; if (kind === 'us') t.pid = null; sh?.close(); paint(); } }, 'Listo')) });
  }

  // ---------- herramientas ----------
  const tool = (k, label, icon, cls = '') => h('button', { type: 'button', class: `pz-tool ${cls}`, 'aria-pressed': ui.tool === k ? 'true' : 'false', onclick: () => { ui.tool = k; ctx.rerender(); } }, ic(icon, 18), label);
  const act = (label, icon, fn) => h('button', { type: 'button', class: 'btn sm', onclick: fn }, ic(icon, 16), label);
  const undo = () => { const last = ui.hist.pop(); if (!last) { toast('No hay nada que deshacer'); return; } Object.assign(b, JSON.parse(last)); paint(); };

  // ---------- pasos y animación ----------
  let playing = false;
  async function play() {
    if (b.steps.length < 2) { toast('Guarda por lo menos 2 pasos'); return; }
    if (playing) return; playing = true;
    applySnap(b, b.steps[0]); paint();
    for (let k = 1; k < b.steps.length; k++) {
      await new Promise((r) => setTimeout(r, 450));
      const A = b.steps[k - 1], B = b.steps[k];
      b.arrows = []; paintArrows();
      await new Promise((resolve) => {
        const t0 = performance.now(), dur = 950;
        const frame = (now) => {
          const u = Math.min(1, (now - t0) / dur), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2, lerp = (p, q) => p + (q - p) * e;
          A.us.forEach(([x, y], i) => { if (b.us[i]) { b.us[i].x = lerp(x, B.us[i][0]); b.us[i].y = lerp(y, B.us[i][1]); } });
          A.them.forEach(([x, y], i) => { if (b.them[i]) { b.them[i].x = lerp(x, B.them[i][0]); b.them[i].y = lerp(y, B.them[i][1]); } });
          b.ball.x = lerp(A.ball[0], B.ball[0]); b.ball.y = lerp(A.ball[1], B.ball[1]);
          paintTokens();
          if (u < 1) requestAnimationFrame(frame); else resolve();
        };
        requestAnimationFrame(frame);
      });
      b.arrows = clone(B.arrows); paintArrows(); ui.step = k;
    }
    playing = false; stepsBox.replaceChildren(...stepChips());
  }
  const stepChips = () => b.steps.map((s, i) => h('button', { type: 'button', class: `ap-chip ${ui.step === i ? 'on' : ''}`, 'aria-pressed': ui.step === i ? 'true' : 'false',
    onclick: () => { push(); applySnap(b, s); ui.step = i; paint(); stepsBox.replaceChildren(...stepChips()); } }, `Paso ${i + 1}`));
  const stepsBox = h('div', { class: 'ap-chips' }, stepChips());

  // ---------- guardar, compartir ----------
  function saveSheet() {
    let sh;
    const inp = h('input', { type: 'text', maxlength: 60, value: ui.name || '', placeholder: 'Ej. Recepción en rotación 1', 'aria-label': 'Nombre de la jugada' });
    sh = openSheet({ title: ui.savedId ? 'Guardar cambios' : 'Guardar jugada', body: h('div', { class: 'stack' },
      h('label', { class: 'field' }, h('span', { class: 'label' }, 'Nombre'), inp),
      h('button', { type: 'button', class: 'btn primary', onclick: () => {
        const name = inp.value.trim(); if (!name) { toast('Ponle un nombre'); return; }
        const list = boardsOf().filter((x) => x.id !== ui.savedId);
        const row = { id: ui.savedId || uid(), name, match_id: m?.id || saved?.match_id || null, at: new Date().toISOString(), b: clone(b) };
        if (boardsOf().length >= MAX_BOARDS && !ui.savedId) { toast(`Llegaste a ${MAX_BOARDS} jugadas: borra alguna`); return; }
        saveBoards([row, ...list]); ui.savedId = row.id; ui.name = name; sh?.close(); toast('Jugada guardada'); ctx.rerender();
      } }, ic('check', 18), 'Guardar')) });
  }
  async function shareImg() {
    try {
      const clone2 = svg.cloneNode(true);
      clone2.setAttribute('width', 600); clone2.setAttribute('height', 1180);
      const css = `.pz-out{fill:#2E7D32}.pz-court{fill:#F4A261;stroke:#fff;stroke-width:.8}.pz-line{stroke:#fff;stroke-width:.6}.pz-net{stroke:#222;stroke-width:1.6}.pz-side{font:700 5px sans-serif;fill:#fff;text-anchor:middle;opacity:.85}.pz-lbl{font:800 6px sans-serif;fill:#fff;text-anchor:middle;dominant-baseline:middle}.pz-arrow{stroke-width:1.4;fill:none}.pz-arrow.ball{stroke-dasharray:3 2}`;
      clone2.insertBefore(S('style', {}, css), clone2.firstChild);
      const src = new XMLSerializer().serializeToString(clone2);
      const img = new Image(); img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
      await img.decode();
      const cv = document.createElement('canvas'); cv.width = 600; cv.height = 1180;
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 600, 1180); g.drawImage(img, 0, 0, 600, 1180);
      const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
      const file = new File([blob], `${(ui.name || 'jugada').replace(/[^\wáéíóúñ -]/gi, '').trim() || 'jugada'}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: ui.name || 'Jugada' });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Imagen descargada'); }
    } catch (e) { if (e?.name !== 'AbortError') toast('No se pudo hacer la imagen'); }
  }
  const big = () => { const wrap = el.querySelector('.pz-wrap'); try { (wrap.requestFullscreen?.() || Promise.reject()).catch(() => wrap.classList.toggle('pz-full')); } catch { wrap.classList.toggle('pz-full'); } };

  const list = boardsOf().filter((x) => !m || x.match_id === m.id || !x.match_id);
  const el = h('div', { class: 'page pizarra' },
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Arrastra las fichas; tócalas para ponerles número. Con «Flecha», «Rival» o «Balón» dibujas movimientos.'),
    h('div', { class: 'pz-tools', role: 'group', 'aria-label': 'Herramienta' }, tool('move', 'Mover', 'move'), tool('us', 'Flecha', 'arrow-up-right', 'us'), tool('them', 'Rival', 'arrow-up-right', 'them'), tool('ball', 'Balón', 'arrow-up-right', 'ball')),
    h('div', { class: 'pz-wrap' }, svg, h('button', { type: 'button', class: 'iconbtn pz-close', 'aria-label': 'Salir de pantalla grande', onclick: () => { const w = el.querySelector('.pz-wrap'); if (document.fullscreenElement) document.exitFullscreen?.(); w.classList.remove('pz-full'); } }, ic('x', 22))),
    h('div', { class: 'cluster' },
      act('Rotar mi equipo', 'refresh-cw', () => { push(); rotate(b.us, US_Z); paint(); }),
      act('Rotar rival', 'refresh-cw', () => { push(); rotate(b.them, TH_Z); paint(); }),
      act('Deshacer', 'undo', undo),
      act('Borrar flechas', 'eraser', () => { if (!b.arrows.length) return; push(); b.arrows = []; paint(); }),
      act('Acomodar', 'grid-3x3', async () => { if (await confirmSheet({ title: '¿Acomodar en sus zonas?', text: 'Las fichas regresan a su zona de inicio. Las flechas se borran.', ok: 'Acomodar' })) { push(); for (const t of b.us) [t.x, t.y] = US_Z[t.z]; for (const t of b.them) [t.x, t.y] = TH_Z[t.z]; b.arrows = []; paint(); } }),
      act('Pantalla grande', 'maximize', big)),
    h('section', { class: 'panel stack' }, h('div', { class: 'split' }, h('h3', {}, 'Pasos de la jugada'), h('span', { class: 'row-sub' }, `${b.steps.length} guardados`)),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Acomoda, toca «Guardar paso», mueve a los que se mueven y guarda otro. «Reproducir» los anima en orden.'),
      stepsBox,
      h('div', { class: 'cluster' },
        act('Guardar paso', 'plus', () => { b.steps.push(snapshot(b)); ui.step = b.steps.length - 1; stepsBox.replaceChildren(...stepChips()); toast(`Paso ${b.steps.length} guardado`); }),
        b.steps.length ? act('Quitar el último', 'minus', () => { b.steps.pop(); ui.step = -1; stepsBox.replaceChildren(...stepChips()); }) : null,
        h('button', { type: 'button', class: 'btn sm ball', onclick: play }, ic('play', 16), 'Reproducir'))),
    h('div', { class: 'cluster' },
      canSave ? h('button', { type: 'button', class: 'btn primary', onclick: saveSheet }, ic('save', 18), ui.savedId ? 'Guardar cambios' : 'Guardar jugada') : null,
      h('button', { type: 'button', class: 'btn', onclick: shareImg }, ic('share-2', 18), 'Compartir imagen'),
      h('button', { type: 'button', class: 'btn ghost', onclick: async () => { if (await confirmSheet({ title: '¿Empezar en blanco?', text: 'Se borra lo que tienes en la pizarra (las jugadas guardadas se quedan).', ok: 'En blanco' })) { ui.b = null; ui.savedId = null; ctx.rerender(); } } }, ic('file', 18), 'En blanco')),
    !canSave ? note('Las jugadas solo las guarda el entrenador; tú puedes usar la pizarra y compartir la imagen.') : null,
    list.length ? h('section', { class: 'panel stack' }, h('h3', {}, 'Jugadas guardadas'),
      h('div', { class: 'rows' }, list.map((x) => h('div', { class: 'row' },
        h('a', { class: 'row-main', href: `#/pizarra/j/${x.id}` }, h('strong', {}, x.name), h('span', { class: 'row-sub' }, `${fmtDate(x.at.slice(0, 10), { day: 'numeric', month: 'short' })}${x.b?.steps?.length ? ` · ${x.b.steps.length} pasos` : ''}`)),
        canSave ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Borrar ${x.name}`, onclick: async () => { if (await confirmSheet({ title: `¿Borrar «${x.name}»?`, ok: 'Borrar', danger: true })) { saveBoards(boardsOf().filter((y) => y.id !== x.id)); if (ui.savedId === x.id) ui.savedId = null; ctx.rerender(); } } }, ic('trash-2', 18)) : null)))) : null);
  return { title: 'Pizarra', sub: ui.name || (m ? `Contra ${m.rival}` : 'Cancha para explicar jugadas'), back: m ? `#/partido/${m.id}` : ctx.role === 'coach' ? '#/partidos' : '#/partidos', el };
}
