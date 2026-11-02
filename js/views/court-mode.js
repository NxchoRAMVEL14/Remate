// Modo cancha: pantalla completa con cronómetro por bloques, puntos clave y aviso sonoro. Mantiene la pantalla encendida.
import { h, ic, toast } from '../util.js';
import { state } from '../store.js';
import { getExercise } from '../content/exercises.js';
import { exerciseSheet } from './ejercicio.js';
import { figCard } from '../figura.js';
import { figFor, stepFigs } from '../content/movimientos.js';
import { courtSVG, animateArrows } from '../court.js';

// v3.9: partes de un bloque. Si los pasos empiezan con «2 min · Tobillo: …» o «3 min: …», cada parte lleva su tiempo y su dibujo.
const PART_RE = /^\s*(\d+(?:[.,]\d+)?)\s*min\s*[·:\-–]\s*/i;
export function partsOf(ex, secs) {
  const how = ex?.how || [];
  if (how.length < 2 || !how.every((x) => PART_RE.test(x))) return null;
  const figs = stepFigs(ex) || [];
  const raw = how.map((x, i) => {
    const min = Number(x.match(PART_RE)[1].replace(',', '.')), rest = x.replace(PART_RE, '');
    const m = rest.match(/^([^:]{2,28}):\s*(.+)$/);
    return { secs: min * 60, title: m ? m[1] : `Parte ${i + 1}`, text: m ? m[2] : rest, moves: figs[i] || [] };
  });
  // Si cambiaste los minutos del bloque, las partes se ajustan en proporción.
  const sum = raw.reduce((a, p) => a + p.secs, 0), k = sum ? secs / sum : 1;
  let acc = 0;
  return raw.map((p) => { const s0 = acc; acc += p.secs * k; return { ...p, from: s0, to: acc }; });
}

const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function openCourtMode(session) {
  const plan = (session.plan || []).filter((b) => Number(b.min) > 0);
  if (!plan.length) { toast('Este entrenamiento no tiene plan'); return; }
  const items = plan.map((b) => { const ex = b.ex ? getExercise(b.ex, state.data.customEx) : null; const secs = Math.round(b.min * 60); return { ex, name: ex?.name || b.text || 'Bloque', secs, note: b.note || '', parts: partsOf(ex, secs) }; });
  const total = items.reduce((n, x) => n + x.secs, 0);
  let idx = 0, left = items[0].secs, running = false, last = 0, beeped = false, finished = false, spent = 0, wake = null, audio = null, timer = null;
  const returnTo = document.activeElement, root = document.getElementById('root');

  const name = h('h2', { 'aria-live': 'polite' }), count = h('div', { class: 'row-sub', style: { color: '#fff', opacity: '.85', textAlign: 'center' } });
  const clock = h('div', { class: 'clock', role: 'timer', 'aria-label': 'Tiempo del bloque' });
  const info = h('div', { style: { textAlign: 'center', maxWidth: '60ch', margin: '0 auto' } });
  const nextUp = h('div', { style: { textAlign: 'center', opacity: '.85' } });
  const visual = h('div', { class: 'cm-visual' }), partBar = h('div', { class: 'cm-parts', 'aria-hidden': 'true' });
  let visKey = '', lastPart = -1;
  const segs = h('div', { class: 'segs', 'aria-hidden': 'true' }, items.map((x) => h('i', { style: { flex: String(x.secs) } })));
  const playBtn = h('button', { class: 'btn ball', type: 'button', style: { minWidth: '150px' }, onclick: toggle });
  const btn = (label, icon, fn, cls = '') => h('button', { class: `btn ${cls}`, type: 'button', 'aria-label': label, title: label, onclick: fn }, ic(icon, 20), h('span', {}, label));

  const closeBtn = h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Cerrar modo cancha', onclick: close }, ic('x', 26));
  const ov = h('div', { class: 'timer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Modo cancha' },
    h('div', { class: 'stack' }, h('div', { class: 'split', style: { flexWrap: 'nowrap' } }, count, closeBtn), segs),
    h('div', { class: 'mid' }, name, partBar, clock, visual, info, nextUp),
    h('div', { class: 'ctrl' },
      btn('Anterior', 'chevron-left', () => go(idx - 1)),
      playBtn,
      btn('Siguiente', 'chevron-right', () => go(idx + 1)),
      btn('Menos 1 min', 'arrow-down', () => adjust(-60)),
      btn('Más 1 min', 'arrow-up', () => adjust(60)),
      btn('Ver ejercicio', 'eye', () => { const x = items[idx]; if (x.ex) exerciseSheet(x.ex); else toast('Este bloque no tiene ejercicio'); })));

  function beep() {
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.28, 0.56].forEach((t) => { const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
        const at = audio.currentTime + t; g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.4, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22); o.start(at); o.stop(at + 0.25); });
    } catch { /* sin audio */ }
    try { navigator.vibrate?.([220, 120, 220]); } catch { /* sin vibración */ }
  }
  function chirp() {
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain(), at = audio.currentTime; o.frequency.value = 660; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.35, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.3); o.start(at); o.stop(at + 0.32);
    } catch { /* sin audio */ }
    try { navigator.vibrate?.(150); } catch { /* sin vibración */ }
  }
  async function keepAwake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wake = await navigator.wakeLock.request('screen'); } catch { /* no disponible */ } }

  function paint() {
    const x = items[idx];
    count.textContent = finished ? 'Entrenamiento completo' : `Bloque ${idx + 1} de ${items.length}, ${fmt(spent)} de ${fmt(total)}`;
    name.textContent = finished ? '¡Buen trabajo!' : x.name;
    clock.textContent = finished ? '0:00' : left >= 0 ? fmt(left) : `+${fmt(-left)}`;
    clock.className = `clock ${left < 0 && !finished ? 'over' : ''}`;
    // Parte actual del bloque (calentamientos): su tiempo, su texto y su dibujo.
    const el = x.secs - left, pi = x.parts ? Math.max(0, x.parts.findIndex((p) => el < p.to)) : -1;
    const part = x.parts ? x.parts[pi < 0 ? x.parts.length - 1 : pi] : null;
    if (x.parts && running && lastPart >= 0 && pi !== lastPart && left > 0) chirp();
    lastPart = x.parts ? pi : -1;
    partBar.replaceChildren(...(x.parts && !finished ? x.parts.map((p, i) => h('i', { class: i < pi ? 'done' : i === pi ? 'cur' : '', style: { flex: String(p.to - p.from) } }, h('span', {}, p.title))) : []));
    partBar.hidden = !x.parts || finished;
    if (part && !finished) { name.textContent = part.title; clock.textContent = fmt(Math.max(0, part.to - el)); count.textContent = `Bloque ${idx + 1} de ${items.length} · ${x.name.replace(/:.*/, '')} · ${fmt(spent)} de ${fmt(total)}`; }
    const key = finished ? 'fin' : `${idx}:${part ? pi : 'b'}`;
    if (key !== visKey) {
      visKey = key;
      const moves = finished ? [] : part ? part.moves : figFor(x.ex);
      visual.replaceChildren(...(moves.length ? [figCard(moves, { size: 'lg' })]
        : !finished && x.ex?.diagram ? [h('figure', { class: 'court-wrap cm-court', style: { margin: 0 } }, animateArrows(h('div', { html: courtSVG(x.ex.diagram, `Diagrama de ${x.name}`) })))] : []));
      ov.classList.toggle('has-vis', !!visual.firstChild);
    }
    info.replaceChildren(...(finished ? [h('p', {}, 'Terminaste todos los bloques. Pasa lista si aún no lo haces.')] : [
      part ? h('p', { class: 'cm-part' }, part.text) : null,
      x.note ? h('p', { style: { fontWeight: 700 } }, x.note) : null,
      !part && x.ex?.cues?.length ? h('ul', { style: { textAlign: 'left', display: 'inline-grid', gap: '4px', margin: 0 } }, x.ex.cues.slice(0, 3).map((c) => h('li', {}, c))) : null].filter(Boolean)));
    const n = items[idx + 1], np = part && x.parts[pi + 1];
    nextUp.textContent = finished ? '' : np ? `Sigue: ${np.title}` : !n ? 'Último bloque' : `Sigue: ${n.name}, ${Math.round(n.secs / 60)} min`;
    [...segs.children].forEach((s, i) => { s.className = finished || i < idx ? 'done' : i === idx ? 'cur' : ''; });
    playBtn.replaceChildren(ic(running ? 'pause' : 'play', 20), h('span', {}, finished ? 'Reiniciar' : running ? 'Pausa' : 'Iniciar'));
  }
  function tick() {
    const now = Date.now(), dt = Math.min(5, (now - last) / 1000); last = now;
    left -= dt; spent += dt;
    if (left <= 0 && !beeped) { beeped = true; beep(); }
    paint();
  }
  function start() { running = true; last = Date.now(); clearInterval(timer); timer = setInterval(tick, 250); keepAwake(); try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch { /* sin audio */ } paint(); }
  function stop() { running = false; clearInterval(timer); paint(); }
  function toggle() { if (finished) { finished = false; idx = 0; left = items[0].secs; spent = 0; beeped = false; start(); return; } running ? stop() : start(); }
  function go(i) {
    if (i < 0) i = 0;
    if (i >= items.length) { finished = true; stop(); beep(); return; }
    finished = false; idx = i; left = items[i].secs; beeped = false;
    spent = items.slice(0, i).reduce((n, x) => n + x.secs, 0);
    paint();
  }
  function adjust(d) { left += d; if (left > 0) beeped = false; paint(); }
  function onKey(e) { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) close(); if (e.key === ' ' && e.target === document.body) { e.preventDefault(); toggle(); } }
  function onVis() { if (document.visibilityState === 'visible' && running) keepAwake(); }
  function close() {
    clearInterval(timer); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis);
    try { wake?.release(); } catch { /* nada */ }
    try { audio?.close(); } catch { /* nada */ }
    ov.remove(); if (root) root.inert = false; try { returnTo?.focus(); } catch { /* nada */ }
  }
  document.addEventListener('keydown', onKey); document.addEventListener('visibilitychange', onVis);
  document.body.append(ov); if (root) root.inert = true;
  paint(); playBtn.focus();
}
