// Remate Fit · Menú de la semana (v3.19). Arma 7 días de comidas con las recetas de Remate a la medida del plan:
// cada comida busca la receta (y las raciones) que más se acerca a las calorías y la proteína de esa comida,
// respeta cómo come cada quien y lo que no le gusta, prefiere lo que le gusta y lo económico, no repite de más
// y, si cocina un día antes, repite la comida 2 días seguidos. Cualquier comida se puede cambiar por otra equivalente.
import { macrosOf, groupTotals, checksToEq, GROUPS } from './nutricion.js';
import { RECIPES, RECIPE_BY_ID } from './recetas.js';

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WD_SHORT = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D'];
const nrm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const stem = (w) => (w.length > 5 && /es$/.test(w) ? w.slice(0, -2) : /s$/.test(w) ? w.slice(0, -1) : w);
// «fresa, kiwi y guayaba» → ['fresa', 'kiwi', 'guayaba']
export const wordsOf = (txt) => nrm(txt).split(/[,;/\n]+|\s+y\s+|\s+o\s+/).map((s) => stem(s.trim())).filter((s) => s.length >= 3);
const textOf = (r) => nrm(`${r.name} ${r.ing.map((i) => i[2]).join(' ')}`);
export const hasAny = (r, ws) => { const t = textOf(r); return ws.some((w) => t.includes(w)); };
const tagOf = (key) => (key === 'col1' || key === 'col2' ? 'col' : key);
const half = (x) => Math.round(x * 2) / 2;

// Números pseudoaleatorios con semilla (el mismo menú si no se pide otro).
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Lo que pide cada comida del plan. «main» es el plato fuerte (sin fruta, leche ni azúcar, que van de complemento).
const SIDE = ['fru', 'lec', 'azu'];
export function slotTargets(plan) {
  return plan.meals.map((m) => {
    const main = Object.fromEntries(Object.entries(m.g).filter(([g]) => !SIDE.includes(g)));
    return { key: m.key, name: m.name, g: m.g, ...macrosOf(checksToEq({ x: m.g }, plan.mix)), main: macrosOf(checksToEq({ x: main }, plan.mix)) };
  });
}
const dietOk = (r, d) => (!d.veg || r.diet.includes('veg')) && (!d.noDairy || r.diet.includes('sl')) && (!d.noGluten || r.diet.includes('sg'));
export function candidates(key, prefs) {
  const tag = tagOf(key), dis = wordsOf(prefs.dislikes);
  return RECIPES.filter((r) => (r.meals.includes(tag) || (tag === 'col' && r.meals.includes('pre'))) && dietOk(r, prefs.diet) && !hasAny(r, dis));
}
// Qué tan bien queda una receta en una comida: raciones a la medida, error de calorías y de proteína.
export function fitOf(r, slot) {
  const T = slot.main || slot;
  const n = Math.min(2, Math.max(0.5, half(T.kcal / (r.per.kcal || 1))));
  const kcal = r.per.kcal * n, p = r.per.p * n;
  const err = Math.abs(kcal - T.kcal) / (T.kcal || 1) + 0.8 * Math.max(0, (T.p - p) / (T.p || 1)) + 0.08 * Math.abs(n - 1);
  return { n, kcal: Math.round(kcal), p: Math.round(p), err };
}
function baseScore(r, T, prefs, likes) {
  const f = fitOf(r, T);
  return { r, ...f, s: 3 * f.err - (likes.length && hasAny(r, likes) ? 0.35 : 0) - (prefs.eco && r.eco ? 0.15 : 0) };
}

// Arma la semana. prefs: { diet, likes, dislikes, eco, batch }.
export function buildMenu(plan, prefs, seed = Date.now() % 1e9, made = '') {
  const rnd = rng(seed), T = slotTargets(plan), likes = wordsOf(prefs.likes);
  const used = {};
  const days = [];
  for (let d = 0; d < 7; d++) {
    const day = {}, today = new Set();
    for (const t of T) {
      const prev = days[d - 1]?.[t.key];
      // Cocina un día antes: la comida del lunes se repite el martes, la del miércoles el jueves, la del viernes el sábado.
      if (prefs.batch && t.key === 'com' && d % 2 === 1 && d < 6 && prev?.id && RECIPE_BY_ID[prev.id] && (RECIPE_BY_ID[prev.id].prep || RECIPE_BY_ID[prev.id].serv > 1)) {
        day[t.key] = { ...prev }; today.add(prev.id); used[prev.id] = (used[prev.id] || 0) + 1; continue;
      }
      const list = candidates(t.key, prefs).map((r) => {
        const b = baseScore(r, t, prefs, likes);
        b.s += (used[r.id] || 0) * 0.45 + (prev?.id === r.id ? 0.8 : 0) + (today.has(r.id) ? 1 : 0) + rnd() * 0.3;
        return b;
      }).sort((a, b) => a.s - b.s);
      const best = list[0];
      if (!best || best.err > 0.6) { day[t.key] = { p: 1 }; continue; }   // ninguna receta se acerca: porciones del plan
      day[t.key] = { id: best.r.id, n: best.n };
      today.add(best.r.id); used[best.r.id] = (used[best.r.id] || 0) + 1;
    }
    days.push(day);
  }
  return { v: 1, seed, made, meals: plan.n.meals, days };
}

// Otras opciones para una comida (las más parecidas en calorías y proteína).
export function alternatives(plan, prefs, key, exceptId = null, k = 6) {
  const t = slotTargets(plan).find((x) => x.key === key);
  if (!t) return [];
  const likes = wordsOf(prefs.likes);
  return candidates(key, prefs).filter((r) => r.id !== exceptId).map((r) => baseScore(r, t, prefs, likes)).filter((x) => x.err < 0.8).sort((a, b) => a.s - b.s).slice(0, k);
}

// Porciones del día según el menú (para comparar con el plan).
export function dayEq(plan, day) {
  const e = {};
  for (const m of plan.meals) {
    const s = day?.[m.key];
    const r = s?.id && RECIPE_BY_ID[s.id];
    if (r) for (const [k, v] of Object.entries(r.eq)) e[k] = (e[k] || 0) + v * s.n;
    else for (const [k, v] of Object.entries(checksToEq({ x: m.g }, plan.mix))) e[k] = (e[k] || 0) + v;
  }
  return e;
}
// Lo que se agrega a una comida: la fruta y la leche del plan (las recetas casi no las traen) y, si la receta se queda
// corta de proteína, proteína magra (pollo, atún, claras). Lo demás ya va en el plato.
export function slotComplete(plan, key, s) {
  const m = plan.meals.find((x) => x.key === key), r = s?.id && RECIPE_BY_ID[s.id];
  if (!m || !r) return [];
  const got = groupTotals(Object.fromEntries(Object.entries(r.eq).map(([k, v]) => [k, v * s.n])));
  const out = SIDE.map((g) => [g, half((m.g[g] || 0) - (got[g] || 0))]).filter(([, x]) => x >= 0.5);
  const T = slotTargets(plan).find((x) => x.key === key)?.main;
  const short = T ? T.p - r.per.p * s.n : 0;
  if (short >= 6) out.push(['aoa', half(short / 7)]);
  return out;
}
const sideEq = (plan, g, x) => (g === 'aoa' ? { aoa1: x } : Object.fromEntries(Object.entries(plan.mix[g] || {}).map(([k, w]) => [k, x * w])));
// Calorías y proteína del día según el menú, con lo que se agrega.
export function dayMacros(plan, day) {
  const e = dayEq(plan, day);
  for (const m of plan.meals) for (const [g, x] of slotComplete(plan, m.key, day?.[m.key])) for (const [k, v] of Object.entries(sideEq(plan, g, x))) e[k] = (e[k] || 0) + v;
  return macrosOf(e);
}
// Lo que falta para completar el día (grupos con 1 porción o más de diferencia).
export function toComplete(plan, day) {
  const want = groupTotals(plan.eq), got = groupTotals(dayEq(plan, day));
  return GROUPS.map(([g]) => [g, half((want[g] || 0) - (got[g] || 0))]).filter(([, x]) => x >= 1);
}
// Raciones de cada receta en la semana (para la lista del súper), redondeadas hacia arriba.
export function menuPicks(menu) {
  const p = {};
  for (const d of menu?.days || []) for (const s of Object.values(d)) if (s?.id && RECIPE_BY_ID[s.id]) p[s.id] = (p[s.id] || 0) + s.n;
  // La comida que se cocina un día antes cuenta una vez por cada día que se come.
  return Object.fromEntries(Object.entries(p).map(([id, n]) => [id, Math.ceil(n - 0.01)]));
}
// ¿El menú guardado sigue sirviendo con el plan de hoy? (mismo número de comidas)
export const menuFits = (menu, plan) => !!menu?.days?.length && menu.days.length === 7 && menu.meals === plan.n.meals;
