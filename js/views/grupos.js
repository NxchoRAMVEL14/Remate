// Entreno con dos grupos (v3.28): el mismo entrenamiento para un grupo que empieza (A) y otro más avanzado (B).
// Remate reparte a los convocados por su nivel (tú puedes moverlos), y en cada bloque cada grupo hace su versión:
// la fácil y la difícil del mismo ejercicio, o un ejercicio distinto para el grupo B. Se guarda en los ajustes del equipo
// (settings.split), así que no necesita SQL. El plan de siempre no cambia: el grupo B solo agrega «alt» a un bloque.
import { h, ic, toast, addDays, fmtDate } from '../util.js';
import { state, settings, saveSettings, convocados, patch } from '../store.js';
import { getExercise, allExercises, progressionOf } from '../content/exercises.js';
import { note } from './ui.js';
import { pickExerciseSheet } from './sheets-session.js';
import { isAbsent } from './condiciones.js';

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
  const list = convocados(s).filter((p) => !isAbsent(s, p)), A = list.filter((p) => groupOf(p, sp) === 'A'), B = list.filter((p) => groupOf(p, sp) === 'B');   // v3.36: sin los que faltaron
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

// ---------- v3.33: marcador del ejercicio ----------
// En modo cancha el entrenador marca cómo salió cada bloque (por grupo si hay dos). Se guarda en el bloque del plan:
// b.res = { T | A | B: { r: 'no'|'reg'|'ok'|'facil', n?: número } }. T = todo el equipo (sin grupos). Sin SQL.
export const RES = { no: { t: 'No salió', cls: 'r-no' }, reg: { t: 'A medias', cls: 'r-reg' }, ok: { t: 'Salió', cls: 'r-ok' }, facil: { t: 'Muy fácil', cls: 'r-facil' } };
export const RES_KEYS = ['no', 'reg', 'ok', 'facil'];
export const rateable = (ex) => !!ex && ex.kind !== 'calentamiento' && ex.kind !== 'cierre';
// Historial de un ejercicio: lo más reciente primero. g = 'T', 'A' o 'B'.
export function exHistory(exId, { except = null } = {}) {
  const out = [];
  for (const s of state.data.sessions || []) {
    if (s.id === except) continue;
    for (const b of s.plan || []) {
      const res = b.res; if (!res) continue;
      for (const g of ['T', 'A', 'B']) {
        const r = res[g]; if (!r?.r) continue;
        const id = g === 'B' ? b.alt?.ex || b.ex : b.ex;
        if (id === exId) out.push({ date: s.session_date, sid: s.id, title: s.title, g, r: r.r, n: r.n ?? null });
      }
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
// Sugerencia con los 2 últimos resultados (del mismo grupo si se pide).
export function exAdvice(exId, opts = {}) {
  let hist = exHistory(exId, opts); if (opts.g) hist = hist.filter((x) => x.g === opts.g || x.g === 'T');
  const [a, b] = hist;
  if (!a || !b) return null;
  if (a.r === 'facil' && b.r === 'facil') return { k: 'up', t: 'Les quedó muy fácil las 2 últimas veces: usa la versión difícil o un ejercicio del siguiente nivel.' };
  if (a.r === 'no' && b.r === 'no') return { k: 'down', t: 'No les salió las 2 últimas veces: usa la versión fácil o regresa al ejercicio anterior.' };
  return null;
}
const resText = (x) => `${RES[x.r]?.t || x.r}${x.n != null ? ` (${x.n})` : ''}`;
// Debajo de un bloque del plan (entrenador): el resultado de este entreno y la sugerencia por historial.
const swapTo = (exId, k) => { const ex = getEx(exId); if (!ex) return null; const p = progressionOf(ex, allExercises(state.data.customEx)); return k === 'up' ? p.next : p.prev; };
export function blockResultLine(s, b, edit = null) {
  const ex = b.ex ? getEx(b.ex) : null; if (!ex) return null;
  const res = b.res || {}, have = ['T', 'A', 'B'].filter((g) => res[g]?.r);
  const advA = exAdvice(b.ex, { except: s.id, g: splitOf(s) ? 'A' : null });
  const advB = splitOf(s) && b.alt?.ex ? exAdvice(b.alt.ex, { except: s.id, g: 'B' }) : null;
  if (!have.length && !advA && !advB) return null;
  return h('span', { class: 'blk-res' },
    have.length ? h('span', { class: 'cluster', style: { gap: '6px' } }, h('small', { class: 'row-sub' }, 'Cómo salió:'),
      have.map((g) => h('span', { class: `chip ${RES[res[g].r]?.cls || ''}` }, g === 'T' ? resText(res[g]) : `${g}: ${resText(res[g])}`))) : null,
    advA ? advLine(advA, splitOf(s) ? 'Grupo A: ' : '', swapTo(b.ex, advA.k), edit && ((to) => { edit({ ...(splitOf(s) && !b.alt?.ex ? { ex: to.id, alt: { ex: b.ex } } : { ex: to.id }), res: dropRes(b.res, ['T', 'A']) }); toast(`Cambiado por «${to.name}»`); })) : null,
    advB ? advLine(advB, 'Grupo B: ', swapTo(b.alt.ex, advB.k), edit && ((to) => { edit({ alt: { ex: to.id }, res: dropRes(b.res, ['B']) }); toast(`Grupo B: ahora «${to.name}»`); })) : null);
}
// Al cambiar el ejercicio, el resultado ya marcado de ese grupo se quita (era del ejercicio anterior).
const dropRes = (res, gs) => { if (!res) return undefined; const r = { ...res }; gs.forEach((g) => delete r[g]); return Object.keys(r).length ? r : undefined; };
// v3.34: la sugerencia con botón para cambiar al ejercicio siguiente (o anterior) de la progresión.
function advLine(adv, pre, to, onSwap) {
  return h('span', { class: `adv ${adv.k}` }, ic(adv.k === 'up' ? 'arrow-up' : 'arrow-down', 14),
    h('small', {}, ` ${pre}${adv.t}`),
    to && onSwap ? h('button', { type: 'button', class: 'btn sm ghost', onclick: () => onSwap(to) }, ic('replace', 14), `Cambiar por «${to.name}»`) : null);
}
// En la página del ejercicio (entrenador): los últimos resultados.
export function exHistoryCard(ex) {
  const hist = exHistory(ex.id).slice(0, 8);
  const adv = exAdvice(ex.id);
  return h('section', { class: 'panel stack' },
    h('div', { class: 'split' }, h('h3', { style: { margin: 0 } }, 'Cómo les ha salido'), hist.length ? h('span', { class: 'row-sub' }, `${hist.length === 8 ? 'Últimas 8' : hist.length === 1 ? '1 vez' : `${hist.length} veces`}`) : null),
    hist.length ? h('div', { class: 'rows' }, hist.map((x) => h('a', { class: 'row', href: `#/sesion/${x.sid}` },
      h('span', { class: 'row-main' }, h('strong', {}, fmtDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' })), h('span', { class: 'row-sub' }, x.g === 'T' ? (x.title || 'Entrenamiento') : `Grupo ${x.g} · ${x.title || 'Entrenamiento'}`)),
      h('span', { class: `chip ${RES[x.r]?.cls || ''}` }, resText(x)))))
      : h('p', { class: 'row-sub', style: { margin: 0 } }, 'Todavía no hay resultados. En el modo cancha, al terminar el bloque, toca «¿Cómo salió?».'),
    adv ? note(adv.t, adv.k === 'up' ? 'ok' : 'warn') : null);
}
