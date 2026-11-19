// Entreno con dos grupos (v3.28): el mismo entrenamiento para un grupo que empieza (A) y otro más avanzado (B).
// Remate reparte a los convocados por su nivel (tú puedes moverlos), y en cada bloque cada grupo hace su versión:
// la fácil y la difícil del mismo ejercicio, o un ejercicio distinto para el grupo B. Se guarda en los ajustes del equipo
// (settings.split), así que no necesita SQL. El plan de siempre no cambia: el grupo B solo agrega «alt» a un bloque.
import { h, ic, toast, addDays } from '../util.js';
import { state, settings, saveSettings, convocados, patch } from '../store.js';
import { getExercise, allExercises } from '../content/exercises.js';
import { note } from './ui.js';
import { pickExerciseSheet } from './sheets-session.js';

const getEx = (id) => getExercise(id, state.data.customEx);
export const TIER = { A: 'Grupo A', B: 'Grupo B' };
export const CUT_NAME = { 1: 'nivel 1', 2: 'niveles 1 y 2', 3: 'niveles 1 a 3', 4: 'niveles 1 a 4', 5: 'niveles 1 a 5' };
const lvl = (p) => Math.min(6, Math.max(1, Number(p.level) || 1));

export const splitOf = (s) => (s ? settings().split?.[s.id] || null : null);
export function saveSplit(s, val) {
  const keep = new Set((state.data.sessions || []).filter((x) => x.session_date >= addDays(new Date().toISOString().slice(0, 10), -90)).map((x) => x.id));
  const split = Object.fromEntries(Object.entries(settings().split || {}).filter(([id]) => keep.has(id) && id !== s.id));
  if (val) split[s.id] = val;
  saveSettings({ split });
}
// El corte que mejor reparte: el grupo A son los de nivel ≤ corte.
export function bestCut(list) {
  let best = 2, diff = Infinity;
  for (let c = 1; c <= 5; c++) {
    const a = list.filter((p) => lvl(p) <= c).length, b = list.length - a;
    if (!a || !b) continue;
    const d = Math.abs(a - b) + (c === 2 || c === 3 ? -0.5 : 0);   // empate: preferimos el corte 2 o 3
    if (d < diff) { diff = d; best = c; }
  }
  return best;
}
export function groupOf(p, sp) { if (!sp) return null; return sp.moved?.[p.id] || (lvl(p) <= sp.cut ? 'A' : 'B'); }
export function groupsOf(s) {
  const sp = splitOf(s); if (!sp) return null;
  const list = convocados(s), A = list.filter((p) => groupOf(p, sp) === 'A'), B = list.filter((p) => groupOf(p, sp) === 'B');
  const range = (xs) => (xs.length ? [Math.min(...xs.map(lvl)), Math.max(...xs.map(lvl))] : null);
  return { sp, A, B, rA: range(A), rB: range(B) };
}
const rangeText = (r) => (!r ? 'sin jugadores' : r[0] === r[1] ? `nivel ${r[0]}` : `niveles ${r[0]} a ${r[1]}`);

// Lo que hace cada grupo en un bloque.
export function versionsOf(b) {
  const ex = b.ex ? getEx(b.ex) : null, alt = b.alt?.ex ? getEx(b.alt.ex) : null;
  return {
    A: { ex, text: ex ? (ex.easier ? `Versión fácil: ${ex.easier}` : 'Tal como está.') : b.text || 'Bloque libre' },
    B: alt ? { ex: alt, text: alt.harder ? `Si les queda fácil: ${alt.harder}` : 'Tal como está.', other: true }
      : { ex, text: ex ? (ex.harder ? `Versión difícil: ${ex.harder}` : 'Tal como está, con más exigencia.') : b.text || 'Bloque libre' },
  };
}

// Busca un ejercicio parecido (mismo fundamento y tipo) para un rango de niveles.
function findFor(ex, r, avoid) {
  if (!ex || !r) return null;
  const all = allExercises(state.data.customEx).filter((e) => !avoid.has(e.id) && e.kind === ex.kind && e.skills[0] === ex.skills[0]);
  const fits = (e) => e.levels[0] <= r[1] && e.levels[1] >= r[0];
  const score = (e) => Math.abs((e.levels[0] + e.levels[1]) / 2 - (r[0] + r[1]) / 2) + Math.abs(e.min - ex.min) / 20;
  return all.filter(fits).sort((a, b) => score(a) - score(b))[0] || null;
}
// «Ajustar con un toque»: si un ejercicio queda muy difícil para A, se busca uno para A; si queda muy fácil para B, uno para B.
export function suggestSplit(plan, rA, rB) {
  let changed = 0;
  const used = new Set(plan.map((b) => b.ex).filter(Boolean));
  const out = plan.map((b) => {
    const ex = b.ex ? getEx(b.ex) : null;
    if (!ex || ex.kind === 'calentamiento' || ex.kind === 'cierre' || ex.kind === 'fisico') return b;
    let nb = { ...b };
    if (rA && ex.levels[0] > rA[1]) {   // muy difícil para A: A hace otro, y el original se queda para B
      const a = findFor(ex, rA, used); if (a) { used.add(a.id); nb = { ...nb, ex: a.id, alt: { ex: ex.id } }; changed++; return nb; }
    }
    if (rB && ex.levels[1] < rB[0] && !b.alt?.ex) {   // muy fácil para B
      const bb = findFor(ex, rB, used); if (bb) { used.add(bb.id); nb = { ...nb, alt: { ex: bb.id } }; changed++; }
    }
    return nb;
  });
  return { plan: out, changed };
}

// ---------- panel en el entrenamiento ----------
export function splitBox(s) {
  const list = convocados(s), sp = splitOf(s);
  if (!sp) {
    const lv = new Set(list.map(lvl));
    return h('section', { class: 'panel stack split-box' },
      h('div', { class: 'split' }, h('h3', {}, 'Dos grupos'), h('span', { class: 'chip' }, 'Opcional')),
      h('p', { class: 'row-sub', style: { margin: 0 } }, lv.size > 1 ? `Tienes jugadores de ${lv.size} niveles distintos. Divide en un grupo que empieza (A) y otro más avanzado (B): el mismo entreno, cada uno con su versión.` : 'Si tienes un grupo que empieza y otro más avanzado, divídelos: el mismo entreno, cada uno con su versión.'),
      s.status !== 'cancelada' ? h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: () => {
        if (list.length < 2) { toast('Necesitas por lo menos 2 convocados'); return; }
        saveSplit(s, { cut: bestCut(list), moved: {} }); toast('Divididos en dos grupos por nivel');
      } }, ic('split', 16), 'Dividir en dos grupos por nivel')) : null);
  }
  const g = groupsOf(s);
  const col = (k, xs, r) => h('div', { class: `grp grp-${k.toLowerCase()}` },
    h('div', { class: 'split' }, h('strong', {}, TIER[k]), h('span', { class: 'chip' }, String(xs.length))),
    h('small', { class: 'row-sub' }, `${k === 'A' ? 'Empiezan' : 'Avanzados'} · ${rangeText(r)}`),
    h('div', { class: 'grp-names' }, xs.length ? xs.map((p) => h('button', { type: 'button', class: 'grp-p', title: `Pasar a ${k === 'A' ? 'B' : 'A'}`, 'aria-label': `${p.name}, nivel ${lvl(p)}. Pasar al grupo ${k === 'A' ? 'B' : 'A'}`,
      onclick: () => { const moved = { ...(sp.moved || {}) }; const to = k === 'A' ? 'B' : 'A'; if ((lvl(p) <= sp.cut ? 'A' : 'B') === to) delete moved[p.id]; else moved[p.id] = to; saveSplit(s, { ...sp, moved }); } },
      `${p.name.split(' ')[0]} `, h('small', {}, `N${lvl(p)}`))) : h('span', { class: 'row-sub' }, 'Nadie')));
  const cutSel = h('div', { class: 'seg', role: 'group', 'aria-label': 'Hasta qué nivel va el grupo A' }, [1, 2, 3, 4, 5].map((c) =>
    h('button', { type: 'button', 'aria-pressed': sp.cut === c ? 'true' : 'false', onclick: () => saveSplit(s, { cut: c, moved: {} }) }, `≤${c}`)));
  return h('section', { class: 'panel stack split-box on' },
    h('div', { class: 'split' }, h('h3', {}, 'Dos grupos'), h('span', { class: 'chip ok' }, 'Activado')),
    h('div', { class: 'field' }, h('span', { class: 'label' }, `Grupo A: ${CUT_NAME[sp.cut]}`), cutSel),
    h('div', { class: 'grp-cols' }, col('A', g.A, g.rA), col('B', g.B, g.rB)),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Toca un nombre para pasarlo al otro grupo. En cada bloque del plan ves qué hace cada grupo.'),
    !g.A.length || !g.B.length ? note('Un grupo quedó vacío: cambia el corte de nivel o mueve a alguien.', 'warn') : null,
    h('div', { class: 'cluster' },
      (s.plan || []).length ? h('button', { class: 'btn sm primary', type: 'button', onclick: () => {
        const r = suggestSplit(s.plan, g.rA, g.rB);
        if (!r.changed) { toast('El plan ya queda bien para los dos grupos: cada uno usa su versión'); return; }
        patch('sessions', s.id, { plan: r.plan }); toast(`${r.changed === 1 ? 'Ajusté 1 bloque' : `Ajusté ${r.changed} bloques`} para que cada grupo tenga su ejercicio`);
      } }, ic('sparkles', 16), 'Ajustar ejercicios a cada grupo') : null,
      h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { saveSplit(s, null); toast('Un solo grupo'); } }, ic('x', 16), 'Un solo grupo')));
}

// Líneas «A / B» debajo de un bloque del plan.
export function blockSplitLines(s, b, edit) {
  if (!splitOf(s)) return null;
  const v = versionsOf(b);
  if (!v.A.ex) return null;
  return h('span', { class: 'blk-split' },
    h('span', { class: 'bs-row' }, h('b', { class: 'bs-tag a' }, 'A'), h('span', {}, v.A.text)),
    h('span', { class: 'bs-row' }, h('b', { class: 'bs-tag b' }, 'B'), h('span', {}, v.B.other ? h('a', { href: `#/ejercicio/${v.B.ex.id}` }, v.B.ex.name) : null, v.B.other ? ` · ${v.B.text}` : v.B.text)),
    h('span', { class: 'cluster', style: { gap: '6px' } },
      h('button', { type: 'button', class: 'btn sm ghost', onclick: () => pickExerciseSheet((blk) => { if (!blk.ex) { toast('Para el grupo B elige un ejercicio de la biblioteca'); return; } edit({ alt: { ex: blk.ex } }); toast('Ejercicio del grupo B cambiado'); }) }, ic('replace', 14), b.alt?.ex ? 'Otro para B' : 'Ejercicio distinto para B'),
      b.alt?.ex ? h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { const { alt, ...rest } = b; edit({ ...rest, alt: null }); toast('Los dos grupos hacen el mismo ejercicio'); } }, ic('undo-2', 14), 'Igual que A') : null));
}

// Para imprimir: una hoja por grupo.
export function printableSplit(s, plan, longDate) {
  const g = groupsOf(s); if (!g) return null;
  const sheet = (k, xs) => h('div', { style: { breakBefore: k === 'B' ? 'page' : 'auto' } },
    h('h1', {}, `${s.title || 'Entrenamiento'} · ${TIER[k]} (${k === 'A' ? 'empiezan' : 'avanzados'})`),
    h('p', {}, `${longDate(s.session_date)}${s.start_time ? `, ${s.start_time.slice(0, 5)}` : ''}. Jugadores: ${xs.map((p) => p.name).join(', ') || '—'}.`),
    ...plan.map((b, i) => { const v = versionsOf(b)[k], ex = v.ex;
      return h('div', { style: { breakInside: 'avoid', margin: '0 0 12px', borderTop: '1px solid #999', paddingTop: '6px' } },
        h('h3', {}, `${i + 1}. ${ex ? ex.name : b.text || 'Bloque'} (${b.min} min)`),
        ex ? [h('p', {}, `Organización: ${ex.setup}`), h('ol', {}, ex.how.map((x) => h('li', {}, x))), h('p', {}, h('strong', {}, v.text))] : null,
        b.note ? h('p', {}, `Nota: ${b.note}`) : null); }));
  return h('section', { class: 'print-only' }, sheet('A', g.A), sheet('B', g.B));
}

// Para el jugador: en qué grupo va y qué le toca en cada bloque.
export function playerSplit(s, me) {
  const sp = splitOf(s); if (!sp || !me) return null;
  const k = groupOf(me, sp);
  return { k, name: TIER[k], items: (s.plan || []).map((b) => ({ b, v: versionsOf(b)[k] })) };
}
export const _gruposTest = { bestCut, suggestSplit, versionsOf };
