// Lo que hay hoy (v3.36): plantillas propias, el plan que se ajusta a cuántos llegaron y «Hoy tengo…» (espacio, red,
// pared, balones). Todo se guarda en los ajustes del equipo (settings), sin SQL:
//  - settings.my_templates = [{ id, name, minutes, focus, plan }]
//  - settings.cond = { [sessionId]: { espacio: 'completa'|'media', red: bool, pared: bool, balones: 'suficientes'|'pocos' } }
import { h, ic, toast, openSheet, uid, todayStr, addDays } from '../util.js';
import { state, settings, saveSettings, convocados, patch } from '../store.js';
import { getExercise, allExercises, levelLabel } from '../content/exercises.js';
import { TEMPLATES, ALL_TEMPLATES, TEMPLATE_BY_ID, planFromTemplate } from '../content/templates.js';
import { note, field, options } from './ui.js';

const getEx = (id) => getExercise(id, state.data.customEx);

// ---------- plantillas propias ----------
export const myTemplates = () => settings().my_templates || [];
export function saveAsTemplate(s) {
  const name = h('input', { type: 'text', value: s.title || '', maxlength: 60, placeholder: 'Por ejemplo: Martes de saque' });
  openSheet({ title: 'Guardar como plantilla', body: h('div', { class: 'stack' }, field('Nombre', name),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Se guarda el plan (ejercicios, minutos y notas) para usarlo en otros entrenos, en «Aplicar plantilla» y en «Programar semanas».')),
  actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
    const n = name.value.trim(); if (!n) { toast('Ponle un nombre'); return false; }
    const plan = (s.plan || []).map(({ res, ...b }) => structuredClone(b));
    if (!plan.length) { toast('Este entreno no tiene plan'); return false; }
    const t = { id: `mt-${uid().slice(0, 8)}`, name: n, minutes: plan.reduce((a, b) => a + (Number(b.min) || 0), 0), focus: s.focus || [], plan };
    saveSettings({ my_templates: [...myTemplates().filter((x) => x.name !== n), t] });
    toast(`Plantilla «${n}» guardada`);
  } }] });
}
export const deleteTemplate = (id) => saveSettings({ my_templates: myTemplates().filter((x) => x.id !== id) });
// Lista para un <select>: primero las tuyas.
export const templateChoices = () => [...myTemplates().map((t) => [t.id, `★ ${t.name}, ${t.minutes} min`]), ...ALL_TEMPLATES.map((t) => [t.id, `${t.name}, ${t.minutes} min`])];
export const templateById = (id) => myTemplates().find((t) => t.id === id) || TEMPLATE_BY_ID[id] || null;
export function planFromAny(id, date, warm = true) {
  const mt = myTemplates().find((t) => t.id === id);
  if (mt) return structuredClone(mt.plan);
  const t = TEMPLATE_BY_ID[id]; return t ? planFromTemplate(t, date, warm) : [];
}

// ---------- cuántos son ----------
export function parsePlayers(ex) {
  const s = String(ex?.players || ''), n = s.match(/\d+/g)?.map(Number) || [];
  return { min: n[0] || 1, max: n[1] || n[0] || 99, multi: /por (círculo|grupo|cancha|pareja|trío)/i.test(s) };
}
const ABSENT = new Set(['falta', 'justificada']);
const marksOf = (s) => (state.data.attendance || []).filter((a) => a.session_id === s.id);
export const isAbsent = (s, p) => marksOf(s).some((a) => a.player_id === p.id && ABSENT.has(a.status));
// Los que sí están: los convocados menos los que tienen falta (o justificada) en la lista.
export function presentOf(s) {
  const marks = marksOf(s);
  if (marks.length) return { list: convocados(s).filter((p) => !isAbsent(s, p)), by: 'lista' };   // con lista: sin los que faltaron
  return { list: convocados(s), by: 'convocados' };
}

// ---------- hoy tengo… ----------
export const COND_DEFAULT = { espacio: 'completa', red: true, pared: true, balones: 'suficientes' };
export const condOf = (s) => ({ ...COND_DEFAULT, ...(s ? settings().cond?.[s.id] || {} : {}) });
export function saveCond(s, val) {
  const keep = new Set((state.data.sessions || []).filter((x) => x.session_date >= addDays(todayStr(), -90)).map((x) => x.id));
  const cond = Object.fromEntries(Object.entries(settings().cond || {}).filter(([id]) => keep.has(id) && id !== s.id));
  const v = { ...condOf(s), ...val };
  if (JSON.stringify(v) !== JSON.stringify(COND_DEFAULT)) cond[s.id] = v;
  saveSettings({ cond });
}
const needsFull = (ex) => ex?.diagram?.view === 'full' && parsePlayers(ex).min >= 6;
const manyBalls = (ex) => /cada (jugador|quien|uno)[^.]{0,20}(con )?(un )?bal[oó]n|parejas con un bal[oó]n|un bal[oó]n por (jugador|pareja)|con un bal[oó]n cada/i.test(`${ex?.setup || ''} ${ex?.players || ''}`);
// Por qué un ejercicio no se puede hoy (o null si sí se puede).
export function whyNot(ex, n, cond) {
  if (!ex) return null;
  const p = parsePlayers(ex), m = ex.material || [];
  if (n && n < p.min) return `pide ${p.min} jugadores y hay ${n}`;
  if (cond.red === false && m.includes('red')) return 'necesita red';
  if (cond.pared === false && m.includes('pared')) return 'necesita pared';
  if (cond.espacio === 'media' && needsFull(ex)) return 'necesita la cancha completa';
  if (cond.balones === 'pocos' && manyBalls(ex)) return 'necesita un balón por jugador o pareja';
  return null;
}
// Un ejercicio parecido (mismo fundamento y tipo, nivel cercano) que sí se pueda.
export function replacementFor(ex, n, cond, used = new Set()) {
  if (!ex) return null;
  const mid = (e) => (e.levels[0] + e.levels[1]) / 2, m0 = mid(ex);
  const same = (e) => e.skills[0] === ex.skills[0] && (e.kind === ex.kind || (['tecnica', 'juego'].includes(e.kind) && ['tecnica', 'juego'].includes(ex.kind)));
  return allExercises(state.data.customEx).filter((e) => !e.lab && e.id !== ex.id && !used.has(e.id) && same(e) && Math.abs(mid(e) - m0) <= 1.5 && !whyNot(e, n, cond))
    .sort((a, b) => Math.abs(mid(a) - m0) - Math.abs(mid(b) - m0) + (a.kind === ex.kind ? 0 : 0.5) - (b.kind === ex.kind ? 0 : 0.5) + Math.abs(a.min - ex.min) / 30 - Math.abs(b.min - ex.min) / 30)[0] || null;
}
// Los problemas del plan con lo que hay hoy. g: 'T' (todos), 'A' o 'B' (con dos grupos, cada grupo con su número).
export function planIssues(s, counts, cond = condOf(s)) {
  const out = [];
  (s.plan || []).forEach((b, i) => {
    const check = (id, g, n) => { const ex = id ? getEx(id) : null; if (!ex || ex.kind === 'calentamiento' || ex.kind === 'cierre') return; const why = whyNot(ex, n, cond); if (why) out.push({ i, g, ex, why, n }); };
    if (counts.A != null && counts.B != null) { check(b.ex, 'A', counts.A); check(b.alt?.ex || b.ex, 'B', counts.B); }
    else check(b.ex, 'T', counts.T);
  });
  return out;
}
export function fixPlan(s, counts, cond = condOf(s)) {
  const plan = structuredClone(s.plan || []), used = new Set(plan.flatMap((b) => [b.ex, b.alt?.ex].filter(Boolean)));
  let fixed = 0, left = 0;
  for (const it of planIssues(s, counts, cond)) {
    const r = replacementFor(it.ex, it.n, cond, used); if (!r) { left++; continue; }
    used.add(r.id); const b = plan[it.i];
    if (it.g === 'B') b.alt = { ex: r.id };
    else if (it.g === 'A' && !b.alt?.ex) { b.alt = { ex: b.ex }; b.ex = r.id; }
    else b.ex = r.id;
    if (b.res) delete b.res[it.g === 'B' ? 'B' : it.g];
    fixed++;
  }
  return { plan, fixed, left };
}

// Panel en el entrenamiento: «Hoy tengo…» y lo que no se puede con lo que hay.
export function hoyTengoBox(s, groups) {
  const cond = condOf(s), pres = presentOf(s);
  const counts = groups && groups.rA && groups.rB ? { A: groups.A.length, B: groups.B.length } : { T: pres.list.length };
  const issues = planIssues(s, counts, cond);
  const seg = (k, opts) => h('div', { class: 'seg', role: 'group', 'aria-label': k }, opts.map(([v, t]) => h('button', { type: 'button', 'aria-pressed': cond[k] === v ? 'true' : 'false', onclick: () => saveCond(s, { [k]: v }) }, t)));
  return h('section', { class: 'panel stack hoy-tengo' },
    h('div', { class: 'split' }, h('h3', { style: { margin: 0 } }, 'Hoy tengo…'),
      h('span', { class: 'row-sub' }, counts.T != null ? `${counts.T} ${pres.by === 'lista' ? 'sin contar faltas' : 'convocados'}` : `A: ${counts.A} · B: ${counts.B}${pres.by === 'lista' ? ' (sin faltas)' : ''}`)),
    h('div', { class: 'ht-grid' },
      seg('espacio', [['completa', 'Cancha completa'], ['media', 'Media cancha']]),
      seg('red', [[true, 'Con red'], [false, 'Sin red']]),
      seg('balones', [['suficientes', 'Balones de sobra'], ['pocos', 'Pocos balones']]),
      seg('pared', [[true, 'Con pared'], [false, 'Sin pared']])),
    issues.length ? h('div', { class: 'stack', style: { gap: '6px' } },
      ...issues.map((it) => { const r = replacementFor(it.ex, it.n, cond, new Set((s.plan || []).flatMap((b) => [b.ex, b.alt?.ex].filter(Boolean))));
        return h('div', { class: 'ht-issue' }, h('span', {}, h('strong', {}, `${it.i + 1}. ${it.ex.name}`), it.g !== 'T' ? ` (grupo ${it.g})` : '', h('span', { class: 'row-sub' }, ` — ${it.why}.`)),
          r ? h('button', { type: 'button', class: 'btn sm ghost', onclick: () => {
            const plan = structuredClone(s.plan), b = plan[it.i];
            if (it.g === 'B') b.alt = { ex: r.id }; else if (it.g === 'A' && !b.alt?.ex) { b.alt = { ex: b.ex }; b.ex = r.id; } else b.ex = r.id;
            if (b.res) delete b.res[it.g];
            patch('sessions', s.id, { plan }); toast(`Cambiado por «${r.name}»`);
          } }, ic('replace', 14), `Cambiar por «${r.name}» (${levelLabel(r)})`) : h('small', { class: 'row-sub' }, 'No encontré otro parecido: ajústalo a mano.')); }),
      issues.length > 1 ? h('button', { type: 'button', class: 'btn sm primary', onclick: () => { const f = fixPlan(s, counts, cond); if (f.fixed) patch('sessions', s.id, { plan: f.plan }); toast(f.fixed ? `Ajusté ${f.fixed === 1 ? '1 bloque' : `${f.fixed} bloques`}${f.left ? `; ${f.left} sin cambio` : ''}` : 'No encontré cambios'); } }, ic('sparkles', 16), 'Ajustar todo') : null)
      : (s.plan || []).length ? h('p', { class: 'row-sub', style: { margin: 0 } }, 'Todo el plan se puede con lo que hay hoy.') : null);
}
