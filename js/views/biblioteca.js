// v3.40 «Biblioteca»: favoritos, más usados, filtro por número de jugadores, compartir un ejercicio como imagen
// y diagrama paso a paso. Sin SQL: los favoritos del entrenador van en su perfil privado (sincronizado);
// los del jugador, en su celular.
import { h, ic, toast, todayStr, diffDays, plural, fmtDate } from '../util.js';
import { state, ls, profile, saveProfile, labReady } from '../store.js';
import { SKILL_BY_ID } from '../content/skills.js';
import { levelLabel } from '../content/exercises.js';
import { courtSVG } from '../court.js';

// ---------- Favoritos ----------
const favKey = () => `remate.fav.${state.user?.id || 'demo'}`;
const coachSync = () => state.role === 'coach' && labReady() && state.mode === 'cloud';
export function favorites() {
  if (coachSync()) return new Set(Array.isArray(profile().fav_ex) ? profile().fav_ex : []);
  try { return new Set(JSON.parse(ls.get(favKey()) || '[]')); } catch { return new Set(); }
}
export const isFav = (id) => favorites().has(id);
export function toggleFav(id) {
  const f = favorites(), on = !f.has(id);
  if (on) f.add(id); else f.delete(id);
  if (coachSync()) saveProfile({ fav_ex: [...f] }); else ls.set(favKey(), JSON.stringify([...f]));
  toast(on ? 'Agregado a favoritos' : 'Quitado de favoritos');
  return on;
}
export function favButton(ex, onChange) {
  const b = h('button', { type: 'button', class: 'btn sm fav-btn' });
  const paint = () => { const on = isFav(ex.id); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.replaceChildren(ic('star', 16), on ? 'En favoritos' : 'Favorito'); };
  b.addEventListener('click', () => { toggleFav(ex.id); paint(); onChange?.(); });
  paint(); return b;
}

// ---------- Más usados (en los planes de tus entrenos) ----------
export function usage(days = 180) {
  const t = todayStr(), out = new Map();
  for (const s of state.data.sessions || []) {
    if (!s.session_date || diffDays(t, s.session_date) > days) continue;
    for (const b of s.plan || []) {
      if (!b?.ex) continue;
      const x = out.get(b.ex) || { n: 0, last: '' }; x.n++; if (s.session_date > x.last) x.last = s.session_date; out.set(b.ex, x);
    }
  }
  return out;
}
export const usageText = (u) => (u ? `Usado ${u.n === 1 ? '1 vez' : `${u.n} veces`} · ${u.last > todayStr() ? 'próximo' : 'último'}: ${fmtDate(u.last, { day: 'numeric', month: 'short' })}` : '');

// ---------- Número de jugadores ----------
// «4 a 12» → [4, 12]; «1» → [1, 1]; «5 a 8 por círculo» → [5, ∞] (se repite por grupos); sin dato → cualquiera.
export function playersRange(ex) {
  const s = String(ex.players || '');
  const m = s.match(/(\d+)\s*(?:a\s*(\d+))?/);
  if (!m) return null;
  const lo = Number(m[1]), hi = m[2] ? Number(m[2]) : lo;
  return /por (círculo|grupo|cancha|pareja|trío)/i.test(s) ? [lo, Infinity] : [lo, hi];
}
export const fitsPlayers = (ex, n) => { if (!n) return true; const r = playersRange(ex); return !r || (n >= r[0] && n <= r[1]); };

// ---------- Diagrama paso a paso ----------
// Controla las flechas del diagrama: ◀ ▶ muestran una por una; «Ver todo» las muestra todas; «Animar» vuelve al bucle.
export function stepper(wrap) {
  const arrows = [...wrap.querySelectorAll('.cs-a')];
  if (arrows.length < 2) return null;
  let k = arrows.length, auto = true, t = null;
  const label = h('span', { class: 'row-sub step-lbl', 'aria-live': 'polite' });
  const show = () => { arrows.forEach((a, j) => { a.style.transition = 'opacity .3s'; a.style.opacity = j < k ? '1' : '0.1'; }); label.textContent = auto ? 'Animación' : k === arrows.length ? 'Todo el ejercicio' : k === 0 ? 'Inicio: solo la acomodación' : `Paso ${k} de ${arrows.length}`; };
  const stop = () => { auto = false; clearInterval(t); };
  const run = () => { auto = true; let i = 0; clearInterval(t); const tick = () => { if (!wrap.isConnected) { clearInterval(t); return; } k = i > arrows.length ? arrows.length : i; show(); i = i > arrows.length + 1 ? 0 : i + 1; }; tick(); t = setInterval(tick, 800); };
  const btn = (icon, text, fn) => h('button', { type: 'button', class: 'btn sm', 'aria-label': text, onclick: () => { const was = auto; stop(); fn(was); show(); } }, ic(icon, 16));
  const bar = h('div', { class: 'cluster step-bar' },
    btn('chevron-left', 'Paso anterior', (was) => { if (was) k = arrows.length; k = Math.max(0, k - 1); }),
    btn('chevron-right', 'Paso siguiente', (was) => { if (was) k = 0; k = Math.min(arrows.length, k + 1); }),
    h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { stop(); k = 0; show(); } }, 'Desde el inicio'),
    h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { stop(); k = arrows.length; show(); } }, 'Ver todo'),
    h('button', { type: 'button', class: 'btn sm ghost', onclick: run }, ic('play', 14), 'Animar'), label);
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { auto = false; show(); } else run();
  return bar;
}

// ---------- Compartir como imagen ----------
function wrapLines(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/), lines = []; let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
function svgImage(ex) {
  const css = getComputedStyle(document.documentElement);
  const v = (n, d) => css.getPropertyValue(n).trim() || d;
  const svg = courtSVG(ex.diagram, ex.name).replace(/var\(--floor-free\)/g, v('--floor-free', '#2d6a4f')).replace(/var\(--floor\)/g, v('--floor', '#e07a3f'))
    .replace(/var\(--[a-z-]+\)/g, '#0C2340').replace('<svg ', '<svg width="1200" height="1450" ');
  return new Promise((res) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; });
}
export async function exerciseImage(ex) {
  const W = 1080, P = 64, c = document.createElement('canvas'), g = c.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const disp = css.getPropertyValue('--font-display').trim() || '"Arial Narrow", sans-serif', body = css.getPropertyValue('--font-body').trim() || 'system-ui, sans-serif';
  try { await document.fonts?.ready; } catch { /* nada */ }
  const img = ex.diagram ? await svgImage(ex) : null;
  const diagH = img ? Math.round((W - 2 * P) * (ex.diagram.view === 'full' ? 2 : 14.5 / 12)) : 0;
  const shownH = img ? Math.min(diagH, ex.diagram.view === 'full' ? 1100 : 1000) : 0, shownW = img ? Math.round(shownH * (ex.diagram.view === 'full' ? 0.5 : 12 / 14.5)) : 0;
  // Primero medimos el texto para saber el alto.
  g.font = `400 34px ${body}`;
  const blocks = [['Objetivo', [ex.goal]], ['Cómo se hace', (ex.how || []).slice(0, 5).map((x, i) => `${i + 1}. ${x}`)], ['Puntos clave', (ex.cues || []).slice(0, 4).map((x) => `• ${x}`)]].filter(([, a]) => a.length && a[0]);
  const laid = blocks.map(([t, arr]) => [t, arr.flatMap((x) => wrapLines(g, x, W - 2 * P))]);
  const textH = laid.reduce((a, [, ls2]) => a + 60 + ls2.length * 46 + 20, 0);
  const H = 250 + (img ? shownH + 40 : 0) + textH + 90;
  c.width = W; c.height = H;
  g.fillStyle = '#F4F6FA'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#0C2340'; g.fillRect(0, 0, W, 200);
  g.fillStyle = '#F7C600'; g.fillRect(0, 200, W, 8);
  g.fillStyle = '#FFFFFF'; g.font = `800 64px ${disp}`;
  const tl = wrapLines(g, ex.name, W - 2 * P).slice(0, 2); tl.forEach((l, i) => g.fillText(l, P, 86 + i * 64 - (tl.length > 1 ? 18 : 0)));
  g.font = `500 30px ${body}`; g.fillStyle = '#C9D6E8';
  g.fillText([levelLabel(ex), `${ex.min} min`, ex.players && ex.players !== '—' ? `${ex.players} jugadores` : null, ex.skills.map((k) => SKILL_BY_ID[k]?.name || k).join(', ')].filter(Boolean).join('  ·  '), P, 176);
  let y = 250;
  if (img) { g.drawImage(img, (W - shownW) / 2, y, shownW, shownH); y += shownH + 40; }
  for (const [t, lines] of laid) {
    g.fillStyle = '#0C2340'; g.font = `800 40px ${disp}`; g.fillText(t, P, y + 40); y += 60;
    g.fillStyle = '#1E2A3A'; g.font = `400 34px ${body}`; for (const l of lines) { g.fillText(l, P, y + 36); y += 46; } y += 20;
  }
  g.fillStyle = '#5B6B7C'; g.font = `500 26px ${body}`; g.fillText('Remate · app de voleibol', P, H - 36);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}
export async function shareExerciseImage(ex) {
  toast('Preparando la imagen…');
  const blob = await exerciseImage(ex);
  if (!blob) { toast('No se pudo crear la imagen'); return; }
  const name = `${ex.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: ex.name }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Imagen descargada: mándala desde tu galería o tus archivos');
}
export const shareImageButton = (ex) => h('button', { type: 'button', class: 'btn sm', onclick: () => shareExerciseImage(ex) }, ic('image', 16), 'Compartir como imagen');
