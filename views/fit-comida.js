// Remate Fit · Comida (v3.12): plan del día en porciones del SMAE con calorías y macros, registro de comidas
// (palomear porciones del plan y agregar recetas o alimentos), recetas, lista del súper, antes y después de entrenar y suplementos.
import { h, ic, toast, confirmSheet, openSheet, shareText, todayStr, addDays, fmtDate, plural } from '../util.js';
import { state, ls } from '../store.js';
import { ageFrom } from '../calc.js';
import { num } from '../lab-calc.js';
import { weeklyAverages, weeklyRate, FIT_GOALS } from '../content/fit.js';
import { EQ, GROUPS, GROUP_OF, GROUP_NAME, FOODS, macrosOf, targets, dailyEq, mealPlan, groupMix, checksToEq, groupTotals, weeklySuggestion, OCCUPATIONS,
  MEAL_SETS, RATES, weeklyHours, TIMING, TIMING_NOTE, SUPPS, SUPP_NOTE, SAFETY, NUTRI_SOURCES, PROTEIN } from '../content/nutricion.js';
import { RECIPES, RECIPE_BY_ID, MEAL_TAGS, DIET_TAGS, HIGH_PROTEIN, filterRecipes, shoppingList, shoppingText, amountText, qtyText } from '../content/recetas.js';
import { note, field, options, empty } from './ui.js';
import { profOf, saveProf, upsertDay, fitLogsOf, specOf, vbOf } from './fit.js';
import { shareSheet, shareBtn, firstName } from './compartir.js';
import { buildMenu, alternatives, slotComplete, dayMacros, menuPicks, menuFits, WEEKDAYS, WD_SHORT, wordsOf, hasAny } from '../content/menu.js';

const link = (href, text) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text);
const fmtN = (n) => Math.round(n).toLocaleString('es-MX');
const eqText = (n) => qtyText(n) || '0';
const r1 = (x) => Math.round(x * 10) / 10;
const ONE = { ver: 'verdura', fru: 'fruta', cer: 'cereal', leg: 'leguminosa', aoa: 'proteína animal', lec: 'leche o yogur', gra: 'grasa', azu: 'azúcar' };
const gName = (g, x) => (x > 1 ? GROUP_NAME[g].toLowerCase() : ONE[g]);

// ---------- datos de nutrición del adulto ----------
export const DEFAULT_TIMES = { des: '07:00', col1: '10:30', com: '15:30', col2: '18:00', cen: '20:30' };
export function nutriOf(me) {
  const d = profOf(me.id)?.data || {};
  return { set: !!d.nutri, sex: d.sex || (me.branch === 'F' ? 'F' : me.branch === 'M' ? 'M' : ''), cm: Number(d.cm) || Number(me.height_cm) || null,
    meals: [3, 4, 5].includes(Number(d.meals)) ? Number(d.meals) : 4, occupation: OCCUPATIONS[d.occupation] ? d.occupation : 'sentado',
    diet: { veg: !!d.diet?.veg, noDairy: !!d.diet?.noDairy, noGluten: !!d.diet?.noGluten }, adj: Number(d.kcalAdj) || 0, hide: !!d.hideNumbers, picks: d.picks || {},
    // v3.19
    rate: RATES[d.rate] ? d.rate : 'normal', fatGoal: Number(d.fatGoal) || null, likes: String(d.likes || ''), dislikes: String(d.dislikes || ''), eco: d.eco !== false,
    times: { ...DEFAULT_TIMES, ...(d.mealTimes || {}) }, batch: d.batch !== false };
}
// Peso: el promedio de la última semana con pesadas; si no hay, la última pesada.
export function weightOf(me) {
  const body = fitLogsOf(me.id, 'body').filter((b) => Number(b.data?.kg) > 0);
  const avgs = weeklyAverages(body, 2).filter((a) => a.avg != null);
  if (avgs.length) return r1(avgs[avgs.length - 1].avg);
  return body.length ? Number(body[0].data.kg) : null;
}
function stepsAvg(me) {
  const from = addDays(todayStr(), -6);
  const xs = fitLogsOf(me.id, 'steps').filter((l) => l.day >= from && Number(l.data?.n) > 0);
  return xs.length ? xs.reduce((a, l) => a + Number(l.data.n), 0) / xs.length : null;
}
// v3.19: minutos de cardio por semana (promedio de las últimas 2 semanas, de lo que anotaste o leyó Remate).
function cardioWeek(me) {
  const from = addDays(todayStr(), -13);
  const xs = fitLogsOf(me.id, 'steps').filter((l) => l.day >= from && l.day <= todayStr());
  return Math.round(xs.reduce((a, l) => a + (Number(l.data?.cmin) || 0), 0) / 2);
}
// v3.19: masa libre de grasa: la de la báscula (o peso × (1 − % de grasa)) de los últimos 45 días.
export function ffmOf(me) {
  const from = addDays(todayStr(), -45);
  for (const b of fitLogsOf(me.id, 'body')) {
    if (b.day < from) break;
    const d = b.data || {};
    if (Number(d.ffm) > 0) return { ffm: Number(d.ffm), day: b.day, from: 'báscula' };
    if (Number(d.kg) > 0 && Number(d.grasa) > 0) return { ffm: r1(Number(d.kg) * (1 - Number(d.grasa) / 100)), day: b.day, from: 'grasa', grasa: Number(d.grasa) };
  }
  return null;
}
// Todo el cálculo del plan. null si falta algo (sexo, estatura, peso o edad).
export function planOf(me) {
  const n = nutriOf(me), spec = specOf(me.id), vb = vbOf(me, spec), kg = weightOf(me), age = ageFrom(me.birth_date);
  if (!n.set || !n.sex || !n.cm || !kg || !age) return null;
  // v3.18: los entrenos que das cuentan como actividad ligera (medio entreno cada uno, si duran 2.5 h o más).
  const coachDays = (spec.week?.coach || []).length, coachMin = Number(spec.week?.coachMin) || 150;
  const coach = coachDays * 0.5 * Math.min(1, coachMin / 150);
  const sessions = spec.days + vb.days + coach;
  // v3.19: la actividad se mide en horas a la semana (fuerza, cardio, voleibol y entrenos que das) y el gasto en reposo
  // usa también tu masa libre de grasa si tu báscula la da.
  const cardioWk = cardioWeek(me);
  const hours = weeklyHours({ gymDays: spec.days, gymMin: spec.minutes, cardioWk, vbDays: vb.days, coachDays, coachMin });
  const ff = ffmOf(me);
  const t = targets({ sex: n.sex, kg, cm: n.cm, age, goal: spec.goal, sessions, occupation: n.occupation, steps: stepsAvg(me), adj: n.adj, hours, ffm: ff?.ffm, rate: n.rate });
  const eq = dailyEq(t, n.diet);
  return { n, spec, vb, kg, age, sessions, hours, cardioWk, coachDays, coachMin, ff, t, eq, got: macrosOf(eq), meals: mealPlan(eq, n.meals), mix: groupMix(eq) };
}
const mealLog = (me, day) => fitLogsOf(me.id, 'meal').find((l) => l.day === day) || null;
export function dayTotals(plan, log) {
  const e = checksToEq(log?.data?.checks, plan.mix);
  for (const x of log?.data?.extra || []) {
    if (x.t === 'r') { const r = RECIPE_BY_ID[x.id]; if (r) for (const [k, v] of Object.entries(r.eq)) e[k] = (e[k] || 0) + v * x.n; }
    else if (x.t === 'f' && EQ[x.g]) e[x.g] = (e[x.g] || 0) + x.n;
  }
  return { eq: e, m: macrosOf(e) };
}

// ---------- pestaña Comida (con sus 3 secciones) ----------
const SUBS = [['comida', 'Mi plan'], ['menu', 'Menú'], ['recetas', 'Recetas'], ['super', 'Súper']];
const subNav = (cur) => h('div', { class: 'seg fit-sub', role: 'tablist' }, SUBS.map(([k, t]) => h('button', { type: 'button', role: 'tab', 'aria-selected': k === cur ? 'true' : 'false', onclick: () => { location.hash = `#/fit/${k}`; } }, t)));

export function foodTab(ctx, me, canEdit, sub = 'comida') {
  const n = nutriOf(me);
  if (!n.set) return canEdit ? h('div', { class: 'stack' }, setupIntro(), setupForm(me, null, () => { location.hash = '#/fit/comida'; })) : note('Todavía no arma su plan de comida.');
  const body = sub === 'menu' ? menuView(ctx, me, canEdit) : sub === 'recetas' ? recipesView(ctx, me, canEdit) : sub === 'super' ? shopView(ctx, me, canEdit) : planView(ctx, me, canEdit);
  return h('div', { class: 'stack' }, subNav(sub), body);
}

const setupIntro = () => h('section', { class: 'panel stack' }, h('h2', {}, 'Tu plan de comida'),
  h('p', { style: { margin: 0 } }, 'Remate calcula tus calorías y macros con tu peso, estatura, edad, objetivo y cuánto entrenas (gym + voleibol), y los reparte en porciones del Sistema Mexicano de Alimentos Equivalentes: «2 tortillas», «1/2 taza de frijoles», «90 g de pollo».'),
  note('Es una estimación (puede fallar ±10 a 20%). Lo que la afina es tu peso de cada semana: si no vas al ritmo de tu objetivo, Remate te sugiere ajustar.'),
  note(SAFETY, 'warn'));

function setupForm(me, cur, done) {
  const n = cur || nutriOf(me);
  const sex = h('select', {}, options([['', 'Elige'], ['F', 'Mujer'], ['M', 'Hombre']], n.sex));
  const cm = h('input', { type: 'number', inputmode: 'numeric', min: 130, max: 230, value: n.cm ?? '', 'aria-label': 'Estatura en cm' });
  const kgNow = weightOf(me);
  const kg = h('input', { type: 'number', inputmode: 'decimal', min: 30, max: 250, step: 0.1, value: kgNow ?? '', 'aria-label': 'Peso en kg' });
  const meals = h('select', {}, options([[3, '3: desayuno, comida y cena'], [4, '4: más una colación'], [5, '5: más dos colaciones']], n.meals));
  const occ = h('select', {}, options(Object.entries(OCCUPATIONS).map(([k, [t]]) => [k, t]), n.occupation));
  const chk = (on, label, hint) => { const i = h('input', { type: 'checkbox', checked: on ? true : null }); return [i, h('label', { class: 'check' }, i, h('span', {}, label, hint ? h('span', { class: 'row-sub' }, ` ${hint}`) : null))]; };
  const [veg, vegL] = chk(n.diet.veg, 'Vegetariano', '(sin carne ni pescado; con huevo y lácteos)');
  const [nd, ndL] = chk(n.diet.noDairy, 'Sin lácteos');
  const [ng, ngL] = chk(n.diet.noGluten, 'Sin gluten', '(trigo, avena común, pan, pasta)');
  const [hide, hideL] = chk(n.hide, 'Solo porciones, sin calorías', '(si contar números te estresa)');
  // v3.19: ritmo, meta de grasa, gustos, horarios y menú.
  const rate = h('select', {}, options(Object.entries(RATES).map(([k, [t, d, cap]]) => [k, `${t}: ${Math.round(d * 100)}% menos (máx. ${cap} kcal)`]), n.rate));
  const fatGoal = h('input', { type: 'number', inputmode: 'decimal', min: 6, max: 40, step: 0.5, value: n.fatGoal ?? '', placeholder: n.sex === 'F' ? 'Ej. 28' : 'Ej. 20', 'aria-label': 'Meta de % de grasa' });
  const likes = h('input', { type: 'text', value: n.likes, placeholder: 'Ej. huevo, frijoles, lentejas, cacahuates', 'aria-label': 'Lo que te gusta' });
  const dislikes = h('input', { type: 'text', value: n.dislikes, placeholder: 'Ej. fresa, kiwi, guayaba', 'aria-label': 'Lo que no te gusta' });
  const [eco, ecoL] = chk(n.eco, 'Prefiero recetas económicas', '(el menú les da prioridad)');
  const [batch, batchL] = chk(n.batch, 'Cocino un día antes', '(la comida se repite 2 días seguidos en el menú)');
  const timesBox = h('div', { class: 'grid' });
  const timeIns = {};
  const drawTimes = () => {
    timesBox.replaceChildren(...MEAL_SETS[Number(meals.value)].map(([k, t]) => {
      timeIns[k] = timeIns[k] || h('input', { type: 'time', value: n.times[k] || DEFAULT_TIMES[k], 'aria-label': `Hora de ${t}` });
      return field(t, timeIns[k]);
    }));
  };
  meals.addEventListener('change', drawTimes); drawTimes();
  const age = ageFrom(me.birth_date);
  return h('section', { class: 'panel stack' },
    h('div', { class: 'grid' }, field('Sexo', sex, 'La ecuación es distinta para mujer y hombre.'), field('Estatura (cm)', cm)),
    h('div', { class: 'grid' }, field('Peso de hoy (kg)', kg, kgNow ? 'Tomado de tus pesadas.' : 'En ayunas.'), field('Comidas al día', meals)),
    field('El resto del día', occ, 'Sin contar el gym ni el voleibol.'),
    h('div', { class: 'field' }, h('span', { class: 'label' }, 'Cómo comes'), vegL, ndL, ngL),
    hideL,
    field('Qué tan rápido', rate, 'Para bajar grasa (para ganar músculo: 5, 10 o 15% más). Más rápido = más hambre y más riesgo de perder músculo: con «Rápido», come toda tu proteína y no dejes las pesas.'),
    field('Meta de % de grasa (opcional)', fatGoal, 'Con ella Remate calcula a qué peso llegarías sin perder músculo.'),
    h('div', { class: 'grid' }, field('Me gusta', likes, 'Separado por comas.'), field('No me gusta', dislikes, 'El menú no los usa.')),
    ecoL, batchL,
    h('div', { class: 'field' }, h('span', { class: 'label' }, 'A qué hora comes'), timesBox, h('span', { class: 'row-sub' }, 'Si entrenas a mediodía, la comida después del gym es tu comida de recuperación.')),
    h('p', { class: 'row-sub', style: { margin: 0 } }, `Edad: ${age} años (de tu fecha de nacimiento). Entrenos: los de tu rutina, tu cardio, tu voleibol y los entrenos que das.`),
    h('button', { type: 'button', class: 'btn primary', onclick: () => {
      const c = num(cm.value), k = num(kg.value);
      if (!sex.value) { toast('Elige tu sexo'); return; }
      if (c == null || c < 130 || c > 230) { toast('Escribe tu estatura en cm (130 a 230)'); return; }
      if (k == null || k < 30 || k > 250) { toast('Escribe tu peso en kg (30 a 250)'); return; }
      if (!kgNow || Math.abs(k - kgNow) >= 0.1) upsertDay(me.id, 'body', todayStr(), { kg: r1(k) });
      const fg = fatGoal.value === '' ? null : num(fatGoal.value);
      if (fg != null && !(fg >= 6 && fg <= 40)) { toast('La meta de grasa va de 6 a 40%'); return; }
      const mealTimes = {}; for (const [k] of MEAL_SETS[Number(meals.value)]) if (timeIns[k]?.value) mealTimes[k] = timeIns[k].value;
      saveProf(me.id, { nutri: true, sex: sex.value, cm: Math.round(c), meals: Number(meals.value), occupation: occ.value, diet: { veg: veg.checked, noDairy: nd.checked, noGluten: ng.checked }, hideNumbers: hide.checked,
        rate: rate.value, fatGoal: fg, likes: likes.value.trim().slice(0, 200), dislikes: dislikes.value.trim().slice(0, 200), eco: eco.checked, batch: batch.checked, mealTimes: { ...(profOf(me.id)?.data?.mealTimes || {}), ...mealTimes } });
      toast('Listo: ya tienes tu plan de comida'); done?.();
    } }, ic('check', 18), cur ? 'Guardar' : 'Armar mi plan'));
}

// ---------- Mi plan del día ----------
function planView(ctx, me, canEdit) {
  const plan = planOf(me);
  if (!plan) return h('div', { class: 'stack' }, note('Falta tu peso o tu estatura para calcular el plan.', 'warn'), canEdit ? setupForm(me, null) : null);
  const ui = ctx.ui; const today = todayStr();
  ui.day = ui.day && ui.day <= today && ui.day >= addDays(today, -14) ? ui.day : today;
  const day = ui.day, log = mealLog(me, day);
  const checks = structuredClone(log?.data?.checks || {}), extra = [...(log?.data?.extra || [])];
  const save = () => upsertDay(me.id, 'meal', day, { checks, extra });
  const { t, n } = plan, hide = n.hide;
  const tot = dayTotals(plan, log);
  const sug = weeklySuggestion(plan.spec.goal, ratesOf(me));

  const bar = (label, val, goal, unit) => { const pct = goal ? Math.min(100, (val / goal) * 100) : 0;
    return h('div', { class: 'fit-vol-row fit-macro' }, h('span', {}, label), h('span', { class: 'fit-bar' }, h('i', { style: { width: `${pct}%` } })), h('strong', {}, `${fmtN(val)} de ${fmtN(goal)}${unit}`)); };
  const daySel = h('input', { type: 'date', min: addDays(today, -14), max: today, value: day, 'aria-label': 'Día', onchange: (e) => { ui.day = e.target.value || today; ctx.rerender(); } });

  const mealCard = (m) => {
    const c = checks[m.key] || {};
    const groups = Object.entries(m.g);
    const all = groups.every(([g, x]) => (c[g] || 0) >= x);
    const set = (g, v) => { checks[m.key] = { ...(checks[m.key] || {}), [g]: Math.max(0, Math.round(v * 2) / 2) }; if (!checks[m.key][g]) delete checks[m.key][g]; save(); };
    const mine = extra.map((x, i) => [x, i]).filter(([x]) => x.meal === m.key);
    return h('section', { class: 'panel stack fit-meal' },
      h('div', { class: 'split' }, h('h3', {}, m.name),
        canEdit ? h('button', { type: 'button', class: `btn sm ${all ? '' : 'ball'}`, onclick: () => { checks[m.key] = all ? {} : { ...m.g }; save(); } }, ic(all ? 'rotate-ccw' : 'check', 16), all ? 'Desmarcar' : 'Me lo comí') : null),
      h('div', { class: 'rows' }, groups.map(([g, x]) => {
        const v = c[g] || 0;
        return h('div', { class: `row fit-portion ${v >= x ? 'done' : ''}` },
          h('span', { class: 'row-main' }, h('strong', {}, `${eqText(x)} ${gName(g, x)}`), h('span', { class: 'row-sub' }, examplesOf(g, plan.n.diet))),
          canEdit ? h('span', { class: 'fit-step' },
            h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Quitar media porción de ${GROUP_NAME[g]}`, disabled: v ? null : true, onclick: () => set(g, v - 0.5) }, ic('minus', 18)),
            h('b', { 'aria-live': 'polite' }, eqText(v)),
            h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Agregar media porción de ${GROUP_NAME[g]}`, onclick: () => set(g, v + 0.5) }, ic('plus', 18)))
            : h('b', {}, eqText(v)));
      })),
      mine.length ? h('div', { class: 'rows' }, mine.map(([x, i]) => h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, extraName(x)), h('span', { class: 'row-sub' }, hide ? 'Agregado' : `${fmtN(extraMacros(x).kcal)} kcal · ${fmtN(extraMacros(x).p)} g de proteína`)),
        canEdit ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Quitar', onclick: () => { extra.splice(i, 1); save(); } }, ic('x', 18)) : null))) : null,
      canEdit ? h('div', { class: 'cluster' },
        h('button', { type: 'button', class: 'btn sm ghost', onclick: () => addRecipeSheet(m.key, (x) => { extra.push(x); save(); }) }, ic('chef-hat', 16), 'Receta'),
        h('button', { type: 'button', class: 'btn sm ghost', onclick: () => addFoodSheet(m.key, (x) => { extra.push(x); save(); }) }, ic('plus', 16), 'Otro alimento')) : null);
  };

  return h('div', { class: 'stack' },
    h('section', { class: 'band next fit-band' },
      h('div', { class: 'when' }, `${FIT_GOALS[plan.spec.goal].name} · ${plural(n.meals, 'comida', 'comidas')} al día`),
      hide ? h('h2', {}, 'Tu plan en porciones') : h('h2', {}, `${fmtN(t.kcal)} kcal al día`),
      hide ? null : h('div', {}, `Proteína ${t.p} g · grasa ${t.f} g · carbohidratos ${t.c} g`),
      h('div', {}, `Al día: ${Object.entries(groupTotals(plan.eq)).map(([g, x]) => `${eqText(x)} ${gName(g, x)}`).join(', ')}.`)),
    canEdit ? h('div', { class: 'cluster' }, shareBtn(() => foodShare(me, plan), 'Compartir o imprimir mi plan')) : null,
    sug && canEdit ? h('div', { class: 'note info stack' }, h('span', {}, `${sug.why} Sugerencia: ${sug.kcal > 0 ? 'sube' : 'baja'} ${Math.abs(sug.kcal)} kcal al día.`),
      h('button', { type: 'button', class: 'btn sm', onclick: () => { saveProf(me.id, { kcalAdj: n.adj + sug.kcal }); toast('Plan ajustado'); } }, `Ajustar ${sug.kcal > 0 ? '+' : ''}${sug.kcal} kcal`)) : null,
    goalNote(plan, ratesOf(me)),
    t.floored ? note('Tu plan quedó en el mínimo seguro de calorías. Bajar más rápido te quitaría músculo y energía.', 'warn') : null,
    t.cPerKg < 3 && !hide ? note(`Tus carbohidratos quedan en ${t.cPerKg} g por kilo. Para entrenar fuerte conviene 3 a 5: si te sientes sin energía, súbelos (más cereal) aunque bajes más lento.`, 'warn') : null,
    h('section', { class: 'panel stack' },
      h('div', { class: 'split' }, h('h3', {}, day === today ? 'Hoy' : fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' })), daySel),
      hide ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Porciones palomeadas: ${eqText(Object.values(checks).reduce((a, m) => a + Object.values(m).reduce((x, y) => x + y, 0), 0))} de ${eqText(Object.values(groupTotals(plan.eq)).reduce((a, b) => a + b, 0))}.`)
        : h('div', { class: 'fit-vol' }, bar('Calorías', tot.m.kcal, t.kcal, ''), bar('Proteína', tot.m.p, t.p, ' g'), bar('Carbohidratos', tot.m.c, t.c, ' g'), bar('Grasa', tot.m.f, t.f, ' g')),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Palomea lo que comiste de tu plan. Si comiste otra cosa, agrégala como receta o alimento. No tiene que ser exacto: con acercarte basta.')),
    plan.meals.map(mealCard),
    h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, '¿Qué es una porción?')), portionsGuide(plan.n.diet, plan.n.dislikes)),
    timingPanel(plan), suppPanel(plan), hide ? null : howPanel(plan),
    canEdit ? h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'Mis datos de comida')), setupForm(me, n, () => ctx.rerender()),
      n.adj ? h('button', { type: 'button', class: 'btn ghost', onclick: () => { saveProf(me.id, { kcalAdj: 0 }); toast('Ajuste quitado'); } }, `Quitar mi ajuste (${n.adj > 0 ? '+' : ''}${n.adj} kcal)`) : null) : null,
    sourcesPanel());
}
// v3.17: el plan como texto (WhatsApp) y la hoja para imprimir.
function foodShare(me, plan) {
  const { t, n } = plan, who = firstName(me);
  const L = [`🍽️ *Plan de comida*${who ? ` de ${who}` : ''} (Remate Fit)`, `${FIT_GOALS[plan.spec.goal].name} · ${plural(n.meals, 'comida', 'comidas')} al día`];
  if (!n.hide) L.push(`${fmtN(t.kcal)} kcal · proteína ${t.p} g · grasa ${t.f} g · carbohidratos ${t.c} g`);
  for (const m of plan.meals) L.push('', `*${m.name}:* ${Object.entries(m.g).map(([g, x]) => `${eqText(x)} ${gName(g, x)}`).join(', ')}`);
  L.push('', '*1 porción es, por ejemplo:*');
  for (const g of Object.keys(groupTotals(plan.eq))) L.push(`• ${GROUP_NAME[g]}: ${examplesOf(g, n.diet)}`);
  L.push('', 'Es una estimación con el Sistema Mexicano de Alimentos Equivalentes; no sustituye a un nutriólogo.', 'Hecho con Remate Fit');
  shareSheet({ title: 'Compartir o imprimir mi plan', print: '#/imprimir/comida', text: L.join('\n'), printSub: 'Tus comidas en porciones, la lista de porciones y, si tienes, las recetas de la semana y la lista del súper. En el celular, «Imprimir» → «Guardar como PDF».' });
}
// v3.19: a qué peso llegarías con tu meta de grasa (sin perder músculo) y aviso si bajas demasiado rápido.
function goalNote(plan, rates) {
  const out = [];
  const last = rates[rates.length - 1];
  if (plan.spec.goal === 'grasa' && last && last.pct < -1.2) out.push(note(`La última semana bajaste ${r1(-last.pct)}% de tu peso (${r1(-last.kg)} kg). Más de 1% por semana seguido se lleva músculo: si pasa otra semana, sube un poco tus calorías o cambia a ritmo «Normal».`, 'warn'));
  const ff = plan.ff, g = plan.n.fatGoal;
  if (ff && g) {
    const now = Math.round((1 - ff.ffm / plan.kg) * 1000) / 10, target = r1(ff.ffm / (1 - g / 100)), left = r1(plan.kg - target);
    const wk = plan.t.delta < 0 ? (-plan.t.delta * 7) / 7700 : 0;
    out.push(h('div', { class: 'note info' }, left > 0.5
      ? `Hoy: ${now}% de grasa. Con tu meta de ${g}% y sin perder músculo (${ff.ffm} kg sin grasa), llegarías a unos ${target} kg: te faltan ${left} kg${wk ? `, unas ${Math.ceil(left / wk)} semanas a este ritmo` : ''}. Es aproximado: la báscula puede fallar 3 a 5 puntos de grasa, así que guíate por la tendencia.`
      : `Hoy: ${now}% de grasa, ya en tu meta de ${g}% o cerca. Si quieres seguir, baja la meta.`));
  }
  return out;
}
function ratesOf(me) {
  const avgs = weeklyAverages(fitLogsOf(me.id, 'body'), 4);
  const out = [];
  for (let i = 2; i <= avgs.length; i++) { const r = weeklyRate(avgs.slice(i - 2, i)); if (r) out.push(r); }
  return out;
}
// Ejemplos cortos de 1 porción para cada renglón del plan (según cómo come cada quien).
function examplesOf(g, d) {
  switch (g) {
    case 'ver': return '1/2 taza cocida o 1 taza cruda';
    case 'fru': return '1/2 plátano, 1 manzana chica o 1 taza de papaya';
    case 'cer': return d.noGluten ? '1 tortilla, 1/4 taza de arroz o 1/2 papa' : '1 tortilla, 1/4 taza de arroz o 1/2 bolillo';
    case 'leg': return '1/2 taza de frijoles, lentejas o garbanzos';
    case 'aoa': return d.veg ? (d.noDairy ? '1 huevo o 2 claras' : '1 huevo, 2 claras o 40 g de panela') : d.noDairy ? '30 g de pollo o atún, o 1 huevo' : '30 g de pollo o atún, 1 huevo o 40 g de panela';
    case 'lec': return '1 taza de leche o 3/4 de taza de yogur natural';
    case 'gra': return '1 cucharadita de aceite, 1/3 de aguacate o 10 almendras';
    case 'azu': return '2 cucharaditas de azúcar o miel';
    default: return '';
  }
}
export { eqText, gName, examplesOf };
// v3.17: la lista de porciones (para imprimir) según cómo come cada quien.
const nrmTxt = (x) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const foodOk = (f, diet, dis = []) => !Object.entries(diet).some(([k, on]) => on && DIET_SKIP[k].test(f[1])) && !dis.some((w) => nrmTxt(f[1]).includes(w));
export const portionsOf = (diet, dislikes = '') => { const dis = wordsOf(dislikes); return GROUPS.map(([g, name, subs]) => [name, FOODS.filter((f) => subs.includes(f[0]) && foodOk(f, diet, dis)).map((f) => [f[1], f[2]])]); };
const DIET_SKIP = { veg: /pollo|pavo|res|cerdo|atún|pescado|camarón|jamón|chorizo/i, noDairy: /leche|yogur|queso|requesón|crema$/i, noGluten: /bolillo|pan de caja|pasta|avena|galletas/i };
function portionsGuide(diet, dislikes = '') {
  return h('div', { class: 'stack' },
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Una porción (un «equivalente») de cada grupo. Puedes cambiar un alimento por otro del mismo grupo.'),
    portionsOf(diet, dislikes).map(([name, foods]) => h('div', {}, h('strong', {}, name),
      h('ul', { class: 'plain fit-foods' }, foods.map(([f, q]) => h('li', {}, `${f}: ${q}`))))));
}
const extraName = (x) => (x.t === 'r' ? `${RECIPE_BY_ID[x.id]?.name || 'Receta'} (${eqText(x.n)} ${x.n <= 1 ? 'ración' : 'raciones'})` : `${x.name} (${eqText(x.n)} ${x.n <= 1 ? 'porción' : 'porciones'})`);
const extraMacros = (x) => (x.t === 'r' ? macrosOf(Object.fromEntries(Object.entries(RECIPE_BY_ID[x.id]?.eq || {}).map(([k, v]) => [k, v * x.n]))) : macrosOf({ [x.g]: x.n }));

function addRecipeSheet(meal, onAdd, preset) {
  const pick = h('select', { 'aria-label': 'Receta' }, options(RECIPES.map((r) => [r.id, r.name]), preset || RECIPES.find((r) => r.meals.includes(meal === 'col1' || meal === 'col2' ? 'col' : meal))?.id));
  const n = h('select', { 'aria-label': 'Raciones' }, options([[0.5, '1/2 ración'], [1, '1 ración'], [1.5, '1 1/2 raciones'], [2, '2 raciones']], 1));
  const mealSel = h('select', { 'aria-label': 'Comida' }, options(MEAL_SETS[5].map(([k, t]) => [k, t]), meal));
  openSheet({ title: 'Agregar una receta', body: h('div', { class: 'stack' }, field('Receta', pick), h('div', { class: 'grid' }, field('Cuánto', n), field('En', mealSel))),
    actions: [{ label: 'Cancelar' }, { label: 'Agregar', kind: 'primary', onClick: () => { onAdd({ t: 'r', id: pick.value, n: Number(n.value), meal: mealSel.value }); toast('Agregado'); } }] });
}
function addFoodSheet(meal, onAdd) {
  const pick = h('select', { 'aria-label': 'Alimento' }, FOODS.map((f, i) => h('option', { value: i }, `${f[1]} (1 porción = ${f[2]})`)));
  const n = h('select', { 'aria-label': 'Porciones' }, options([0.5, 1, 1.5, 2, 3, 4].map((x) => [x, `${eqText(x)} ${x === 1 ? 'porción' : 'porciones'}`]), 1));
  openSheet({ title: 'Agregar un alimento', body: h('div', { class: 'stack' }, field('Alimento', pick), field('Cuánto', n, 'Por ejemplo: 3 tortillas son 3 porciones.')),
    actions: [{ label: 'Cancelar' }, { label: 'Agregar', kind: 'primary', onClick: () => { const f = FOODS[Number(pick.value)]; onAdd({ t: 'f', g: f[0], name: f[1].split(' (')[0], n: Number(n.value), meal }); toast('Agregado'); } }] });
}

function timingPanel(plan) {
  const lo = Math.round(plan.kg * 0.25), pre = [Math.round(plan.kg), Math.round(plan.kg * 2)];
  return h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'Antes y después de entrenar')),
    h('dl', { class: 'gx-dl' }, TIMING.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
    plan.n.hide ? null : note(`Para ti: unos ${pre[0]} a ${pre[1]} g de carbohidrato en las 1 a 2 horas antes de un entreno fuerte, y unos ${Math.max(20, lo)} a ${Math.max(30, lo + 10)} g de proteína después.`),
    h('p', { class: 'row-sub' }, TIMING_NOTE),
    h('p', { class: 'row-sub' }, 'Recetas para antes y después: en Recetas, filtra por «Antes de entrenar» o «Después de entrenar».'));
}
function suppPanel(plan) {
  return h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'Suplementos (solo los que funcionan)')),
    h('p', { class: 'row-sub' }, 'Ninguno es obligatorio. Primero comida, sueño y entrenamiento; estos ayudan un poco encima de eso.'),
    SUPPS.map((s) => h('div', { class: 'stack fit-supp' }, h('h4', {}, s.name), h('p', { style: { margin: 0 } }, s.what),
      h('ul', { class: 'plain' }, s.dose.map((x) => h('li', {}, x)),
        s.id === 'cafeina' ? h('li', {}, `Para tu peso (${plan.kg} kg): de ${Math.round(plan.kg * 3)} a ${Math.round(plan.kg * 6)} mg.`) : null,
        s.id === 'creatina' ? h('li', {}, `Carga para tu peso, si la haces: ${r1(plan.kg * 0.3)} g al día por 5 a 7 días.`) : null),
      h('ul', { class: 'plain fit-warn' }, s.warn.map((x) => h('li', {}, x))),
      h('p', { class: 'row-sub', style: { margin: 0 } }, link(s.src[1], s.src[0])))),
    note(SUPP_NOTE, 'warn'));
}
function howPanel(plan) {
  const { t, n, spec } = plan;
  return h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'Cómo se calculó')),
    h('dl', { class: 'gx-dl' },
      h('dt', {}, 'En reposo'), h('dd', {}, t.kat
        ? `${fmtN(t.bmr)} kcal: el promedio de Mifflin-St Jeor (${fmtN(t.mif)} kcal, con ${plan.kg} kg, ${n.cm} cm, ${plan.age} años) y Katch-McArdle (${fmtN(t.kat)} kcal, con ${plan.ff.ffm} kg de masa libre de grasa${plan.ff.from === 'grasa' ? ` sacada de tu ${plan.ff.grasa}% de grasa` : ' de tu báscula'}). Cuando hay mucha grasa o mucho músculo, la que usa la masa libre de grasa se acerca más; como la báscula también se equivoca, se usa el promedio.`
        : `${fmtN(t.bmr)} kcal (Mifflin-St Jeor: ${plan.kg} kg, ${n.cm} cm, ${plan.age} años, ${n.sex === 'F' ? 'mujer' : 'hombre'}). Si anotas tu % de grasa o tu peso sin grasa, Remate lo afina.`),
      h('dt', {}, 'Con actividad'), h('dd', {}, `× ${t.pal} = ${fmtN(t.tdee)} kcal. Unas ${plan.hours.toLocaleString('es-MX')} horas de ejercicio real a la semana: ${spec.days} de gym de ${spec.minutes} min (cuenta el 60%, por los descansos)${plan.cardioWk ? `, ${plan.cardioWk} min de cardio` : ''}${plan.vb.days ? `, ${plan.vb.days} de voleibol` : ''}${plan.coachDays ? `, ${plan.coachDays} ${plan.coachDays === 1 ? 'entreno que das' : 'entrenos que das'} (al 30%)` : ''}; ${OCCUPATIONS[n.occupation][0].toLowerCase()}.`),
      h('dt', {}, 'Tu objetivo'), h('dd', {}, `${FIT_GOALS[spec.goal].name}: ${spec.goal === 'grasa' ? `ritmo ${RATES[t.rate][0].toLowerCase()}, ${fmtN(-t.delta)} kcal menos al día (unos ${r1((-t.delta * 7) / 7700)} kg de grasa por semana)` : spec.goal === 'musculo' ? `ritmo ${RATES[t.rate][0].toLowerCase()}, ${fmtN(t.delta)} kcal más al día` : spec.goal === 'fuerza' ? 'un poco más para rendir' : 'las mismas calorías que gastas'}${n.adj ? `, con tu ajuste de ${n.adj > 0 ? '+' : ''}${n.adj} kcal` : ''}.`),
      h('dt', {}, 'Proteína'), h('dd', {}, `${PROTEIN[spec.goal]} g por kilo${t.pk < plan.kg ? ` de ${t.pk} kg (el peso de un IMC de 25; con todo tu peso saldría de más)` : ''} = ${t.p} g.`),
      h('dt', {}, 'Grasa'), h('dd', {}, `25% de las calorías = ${t.f} g.`),
      h('dt', {}, 'Carbohidratos'), h('dd', {}, `El resto = ${t.c} g (${t.cPerKg} g por kilo).`),
      h('dt', {}, 'Porciones'), h('dd', {}, `Con las porciones redondeadas a medias, tu plan da ${fmtN(plan.got.kcal)} kcal, ${plan.got.p} g de proteína, ${plan.got.f} g de grasa y ${plan.got.c} g de carbohidratos.`)),
    note('Es una estimación: el gasto real de una persona puede ser 10 a 20% distinto. Pésate 3 o más mañanas por semana y ajusta según tu promedio.'));
}
const sourcesPanel = () => h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'De dónde sale')),
  h('ul', { class: 'plain' }, NUTRI_SOURCES.map(([t, u]) => h('li', {}, link(u, t)))),
  h('p', { class: 'row-sub' }, 'Las recetas son de Remate: sus porciones se calcularon con el SMAE. ' + SAFETY));

// ---------- Menú de la semana (v3.19) ----------
const prefsOf = (n) => ({ diet: n.diet, likes: n.likes, dislikes: n.dislikes, eco: n.eco, batch: n.batch });
const wdOf = (d) => (new Date(`${d}T12:00:00`).getDay() + 6) % 7;   // lunes = 0
const servText = (x) => `${eqText(x)} ${x <= 1 ? 'ración' : 'raciones'}`;
const timeText = (t) => { if (!t) return ''; const [hh, mm] = t.split(':').map(Number); return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'a. m.' : 'p. m.'}`; };
// Lo que se agrega a una comida del menú, en palabras.
const addText = (plan, g, x) => (g === 'aoa' ? `${eqText(x)} de proteína magra (${Math.round(x * 30)} g de pollo o atún, o ${eqText(x * 2)} claras)` : `${eqText(x)} ${gName(g, x)} (1 = ${examplesOf(g, plan.n.diet).split(/,| o /)[0]})`);
// El texto de una comida del menú (para la pantalla, WhatsApp y la hoja impresa).
export function slotInfo(plan, key, s) {
  const r = s?.id && RECIPE_BY_ID[s.id];
  if (!r) { const m = plan.meals.find((x) => x.key === key); return { r: null, title: 'Porciones de tu plan', sub: Object.entries(m?.g || {}).map(([g, x]) => `${eqText(x)} ${gName(g, x)}`).join(', '), add: [] }; }
  const k = Math.round(r.per.kcal * s.n), p = Math.round(r.per.p * s.n);
  return { r, title: r.name, sub: plan.n.hide ? servText(s.n) : `${servText(s.n)} · ${fmtN(k)} kcal · ${p} g de proteína`, add: slotComplete(plan, key, s).map(([g, x]) => addText(plan, g, x)) };
}
export const menuOf = (me, plan) => { const m = profOf(me.id)?.data?.menu; return plan && menuFits(m, plan) ? m : null; };

function menuView(ctx, me, canEdit) {
  const plan = planOf(me);
  if (!plan) return h('div', { class: 'stack' }, note('Falta tu peso o tu estatura para calcular el plan.', 'warn'));
  const n = plan.n, ui = ctx.ui, raw = profOf(me.id)?.data?.menu, menu = menuOf(me, plan);
  const make = () => { saveProf(me.id, { menu: buildMenu(plan, prefsOf(n), Math.floor(Math.random() * 1e9), todayStr()) }); toast('Menú listo'); };
  if (!menu) return h('div', { class: 'stack' }, h('section', { class: 'panel stack' }, h('h2', {}, 'Tu menú de la semana'),
    h('p', { style: { margin: 0 } }, 'Remate arma 7 días de comidas con sus recetas a la medida de tu plan: elige las raciones para tus calorías y tu proteína, no usa lo que no te gusta, prefiere lo que te gusta y lo económico, y si cocinas un día antes, repite la comida 2 días seguidos.'),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Cualquier comida la cambias por otra equivalente con «Cambiar». Lo que no te gusta y la hora de cada comida van en «Mi plan → Mis datos de comida».'),
    raw ? note('Cambiaste el número de comidas al día: arma tu menú otra vez.', 'warn') : null,
    canEdit ? h('button', { type: 'button', class: 'btn primary', onclick: make }, ic('chef-hat', 18), 'Armar mi menú') : note('Todavía no arma su menú.')));
  const today = todayStr(), wdT = wdOf(today);
  ui.md = Number.isInteger(ui.md) ? ui.md : wdT;
  const md = ui.md, date = addDays(today, md - wdT), day = menu.days[md];
  const log = mealLog(me, date), extra = log?.data?.extra || [];
  const tot = dayMacros(plan, day);
  const tabs = h('div', { class: 'seg fit-sub menu-days', role: 'tablist', 'aria-label': 'Día de la semana' }, WD_SHORT.map((d, i) => h('button', { type: 'button', role: 'tab', 'aria-selected': i === md ? 'true' : 'false', 'aria-label': WEEKDAYS[i], class: i === wdT ? 'is-today' : null, onclick: () => { ui.md = i; ctx.rerender(); } }, d)));
  const eaten = (key) => extra.some((x) => x.mn && x.meal === key) || (!day[key]?.id && Object.keys(log?.data?.checks?.[key] || {}).length > 0);
  const toggleEat = (m) => {
    const L = mealLog(me, date), ex = [...(L?.data?.extra || [])], checks = structuredClone(L?.data?.checks || {}), s = day[m.key];
    if (eaten(m.key)) { for (let i = ex.length - 1; i >= 0; i--) if (ex[i].mn && ex[i].meal === m.key) ex.splice(i, 1); if (!s?.id) delete checks[m.key]; toast('Desmarcado'); }
    else if (s?.id) {
      ex.push({ t: 'r', id: s.id, n: s.n, meal: m.key, mn: 1 });
      const lec = Object.keys(plan.mix.lec || {})[0] || 'lec1';
      for (const [g, x] of slotComplete(plan, m.key, s)) ex.push({ t: 'f', g: g === 'aoa' ? 'aoa1' : g === 'lec' ? lec : g, name: g === 'aoa' ? 'Proteína magra' : g === 'lec' ? 'Leche o yogur' : g === 'fru' ? 'Fruta' : GROUP_NAME[g], n: x, meal: m.key, mn: 1 });
      toast(`${m.name}: anotado en «Mi plan»`);
    } else { checks[m.key] = { ...m.g }; toast(`${m.name}: anotado`); }
    upsertDay(me.id, 'meal', date, { checks, extra: ex });
  };
  const pairOf = (key) => [md - 1, md + 1].filter((i) => i >= 0 && i < 7 && key === 'com' && menu.days[i]?.[key]?.id && menu.days[i][key].id === day[key]?.id);
  const card = (m) => {
    const s = day[m.key], info = slotInfo(plan, m.key, s), done = eaten(m.key), pair = pairOf(m.key);
    return h('section', { class: `panel stack fit-meal menu-slot ${done ? 'done' : ''}` },
      h('div', { class: 'split' }, h('h3', {}, m.name, n.times[m.key] ? h('span', { class: 'row-sub' }, ` · ${timeText(n.times[m.key])}`) : null),
        done ? h('span', { class: 'chip ok' }, ic('check', 14), 'Comido') : null),
      info.r ? h('a', { class: 'fit-link menu-dish', href: `#/fit/receta/${info.r.id}` }, h('strong', {}, info.title), ic('chevron-right', 16)) : h('strong', {}, info.title),
      h('p', { class: 'row-sub', style: { margin: 0 } }, info.sub),
      pair.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, ic('refresh-cw', 14), pair.includes(md - 1) ? ` Es la que cocinaste el ${WEEKDAYS[md - 1].toLowerCase()}.` : ` Cocina doble: alcanza para el ${WEEKDAYS[md + 1].toLowerCase()}.`) : null,
      info.add.length ? h('p', { style: { margin: 0 } }, h('strong', {}, 'Agrega: '), info.add.join('; '), '.') : null,
      canEdit ? h('div', { class: 'cluster' },
        h('button', { type: 'button', class: 'btn sm ghost', onclick: () => swapSheet(me, plan, menu, md, m) }, ic('shuffle', 16), 'Cambiar'),
        date <= today ? h('button', { type: 'button', class: `btn sm ${done ? '' : 'ball'}`, onclick: () => toggleEat(m) }, ic(done ? 'rotate-ccw' : 'check', 16), done ? 'Desmarcar' : 'Me lo comí') : null) : null);
  };
  return h('div', { class: 'stack' },
    tabs,
    h('section', { class: 'band next fit-band' },
      h('div', { class: 'when' }, `${WEEKDAYS[md]}${md === wdT ? ' · hoy' : ''} · ${fmtDate(date, { day: 'numeric', month: 'long' })}`),
      n.hide ? h('h2', {}, 'Tu menú') : h('h2', {}, `${fmtN(tot.kcal)} kcal · ${tot.p} g de proteína`),
      n.hide ? null : h('div', {}, `Tu plan: ${fmtN(plan.t.kcal)} kcal y ${plan.t.p} g de proteína. Con lo que agregas en cada comida, el día queda cerca.`)),
    plan.meals.map(card),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Verdura cruda (lechuga, pepino, jícama, nopal) y agua natural, las que quieras. Las salsas de molcajete también son libres.'),
    canEdit ? h('div', { class: 'cluster' },
      h('button', { type: 'button', class: 'btn', onclick: async () => {
        const has = Object.values(n.picks || {}).some((x) => x > 0);
        if (has && !(await confirmSheet({ title: '¿Usar el menú para la lista del súper?', text: 'Se reemplazan las recetas que tenías en «Mi semana» por las del menú.', ok: 'Usar el menú' }))) return;
        ls.del(SHOP_KEY(me.id)); saveProf(me.id, { picks: menuPicks(menu) }); location.hash = '#/fit/super';
      } }, ic('shopping-cart', 18), 'Lista del súper del menú'),
      shareBtn(() => menuShare(me, plan, menu), 'Compartir o imprimir'),
      h('button', { type: 'button', class: 'btn ghost', onclick: async () => { if (await confirmSheet({ title: '¿Armar otra semana?', text: 'Se arma un menú nuevo. Lo que ya anotaste como comido se queda.', ok: 'Armar otra' })) make(); } }, ic('refresh-cw', 18), 'Armar otra semana')) : null,
    note('No calcula precios: con presupuesto ajustado, deja palomeado «Prefiero recetas económicas» y cambia lo caro (pescado, res) por pollo, huevo, lentejas o frijol.'));
}
function swapSheet(me, plan, menu, md, m) {
  const n = plan.n, cur = menu.days[md][m.key];
  const alts = alternatives(plan, prefsOf(n), m.key, cur?.id, 6);
  const pair = m.key === 'com' && cur?.id ? [md - 1, md + 1].filter((i) => i >= 0 && i < 7 && menu.days[i]?.com?.id === cur.id) : [];
  const both = pair.length ? h('input', { type: 'checkbox', checked: true }) : null;
  let sheet;
  const set = (val) => {
    const days = structuredClone(menu.days);
    days[md][m.key] = val;
    if (both?.checked) for (const i of pair) days[i][m.key] = { ...val };
    saveProf(me.id, { menu: { ...menu, days } }); sheet?.close(); toast('Cambiado');
  };
  sheet = openSheet({ title: `Cambiar ${m.name.toLowerCase()} del ${WEEKDAYS[md].toLowerCase()}`, body: h('div', { class: 'stack' },
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Opciones con calorías y proteína parecidas, ya en las raciones que te tocan.'),
    both ? h('label', { class: 'check' }, both, h('span', {}, `Cambiar también el ${pair.map((i) => WEEKDAYS[i].toLowerCase()).join(' y el ')} (es la misma que cocinas)`)) : null,
    alts.length ? h('div', { class: 'rows' }, alts.map((a) => h('button', { type: 'button', class: 'row menu-alt', onclick: () => set({ id: a.r.id, n: a.n }) },
      h('span', { class: 'row-main' }, h('strong', {}, a.r.name), h('span', { class: 'row-sub' }, [servText(a.n), n.hide ? null : `${fmtN(a.kcal)} kcal · ${a.p} g de proteína`, `${a.r.min} min`, a.r.eco ? 'económica' : null].filter(Boolean).join(' · '))),
      ic('chevron-right', 18)))) : note('No hay otra receta que se acerque. Usa las porciones de tu plan.'),
    h('button', { type: 'button', class: 'btn ghost', onclick: () => set({ p: 1 }) }, ic('utensils', 16), 'Sin receta: las porciones de mi plan')) });
}
function menuLines(plan, menu) {
  const L = [];
  menu.days.forEach((d, i) => {
    L.push('', `*${WEEKDAYS[i]}*`);
    for (const m of plan.meals) { const x = slotInfo(plan, m.key, d[m.key]); L.push(`• ${m.name}: ${x.title}${x.r ? ` (${servText(d[m.key].n)})` : `: ${x.sub}`}${x.add.length ? ` + ${x.add.join('; ')}` : ''}`); }
  });
  return L;
}
function menuShare(me, plan, menu) {
  const who = firstName(me), n = plan.n;
  const L = [`🍽️ *Menú de la semana*${who ? ` de ${who}` : ''} (Remate Fit)`, n.hide ? '' : `${fmtN(plan.t.kcal)} kcal y ${plan.t.p} g de proteína al día`, ...menuLines(plan, menu), '', 'Verdura cruda y agua natural, las que quieras.', 'Hecho con Remate Fit'];
  shareSheet({ title: 'Compartir o imprimir el menú', print: '#/imprimir/comida', text: L.filter((x, i) => x !== '' || i > 0).join('\n'), printSub: 'El menú de los 7 días, tu plan en porciones y la lista del súper. En el celular, «Imprimir» → «Guardar como PDF».' });
}
export { menuLines, servText };

// ---------- Recetas ----------
function recipesView(ctx, me, canEdit) {
  const ui = ctx.ui, n = nutriOf(me);
  if (!ui.rf) ui.rf = { meal: '', diet: [n.diet.veg && 'veg', n.diet.noDairy && 'sl', n.diet.noGluten && 'sg'].filter(Boolean), quick: false, prep: false, pro: false, q: '' };
  const f = ui.rf;
  // v3.19: se ocultan las recetas con algo que no te gusta (salvo que lo busques).
  const dis = wordsOf(n.dislikes), all = filterRecipes(f);
  const list = f.q.trim() ? all : all.filter((r) => !hasAny(r, dis)), hidden = all.length - list.length;
  const chip = (on, label, toggle) => h('button', { type: 'button', class: 'chipbtn', 'aria-pressed': on ? 'true' : 'false', onclick: () => { toggle(); ctx.rerender(); } }, label);
  const q = h('input', { type: 'search', placeholder: 'Buscar (pollo, frijol, avena…)', value: f.q, 'aria-label': 'Buscar receta' });
  q.addEventListener('change', () => { f.q = q.value; ctx.rerender(); });
  const meal = h('select', { 'aria-label': 'Tipo de comida' }, options([['', 'Todas'], ...Object.entries(MEAL_TAGS)], f.meal));
  meal.addEventListener('change', () => { f.meal = meal.value; ctx.rerender(); });
  const picks = n.picks, nPicks = Object.values(picks).filter((x) => x > 0).length;
  return h('div', { class: 'stack' },
    nPicks ? h('a', { class: 'labcard', href: '#/fit/super' }, h('span', { class: 'lc-ic' }, ic('shopping-cart', 24)),
      h('span', { class: 'lc-t' }, h('strong', {}, `Mi semana: ${plural(nPicks, 'receta', 'recetas')}`), h('span', {}, 'Ver la lista del súper')), ic('chevron-right', 20)) : null,
    h('section', { class: 'panel stack' },
      h('div', { class: 'grid' }, field('Para', meal), field('Buscar', q)),
      h('div', { class: 'cluster' },
        Object.entries(DIET_TAGS).map(([k, t]) => chip(f.diet.includes(k), t, () => { f.diet = f.diet.includes(k) ? f.diet.filter((x) => x !== k) : [...f.diet, k]; })),
        chip(f.quick, 'Rápidas (15 min)', () => { f.quick = !f.quick; }), chip(f.prep, 'Para varios días', () => { f.prep = !f.prep; }), chip(f.pro, `Altas en proteína (${HIGH_PROTEIN} g+)`, () => { f.pro = !f.pro; }))),
    h('p', { class: 'row-sub', style: { margin: 0 } }, `${plural(list.length, 'receta', 'recetas')}. Calorías y proteína por ración.${hidden ? ` ${hidden === 1 ? 'Oculté 1 que lleva' : `Oculté ${hidden} que llevan`} algo que no te gusta.` : ''}`),
    list.length ? h('div', { class: 'rows' }, list.map((r) => h('a', { class: 'row', href: `#/fit/receta/${r.id}` },
      h('span', { class: 'row-main' }, h('strong', {}, r.name),
        h('span', { class: 'row-sub' }, [n.hide ? null : `${fmtN(r.per.kcal)} kcal · ${r.per.p} g proteína`, `${r.min} min`, r.prep ? `rinde ${r.serv}` : null].filter(Boolean).join(' · '))),
      picks[r.id] ? h('span', { class: 'chip ok' }, ic('check', 14), 'En mi semana') : null, ic('chevron-right', 18)))) : empty('Sin recetas con esos filtros', 'Quita alguno.'));
}

export function recipePage(ctx, me, canEdit) {
  const r = RECIPE_BY_ID[ctx.args[1]];
  const back = '#/fit/recetas';
  if (!r) return { title: 'Receta', back, el: h('div', { class: 'page' }, empty('No encontré esa receta', '')) };
  const ui = ctx.ui, n = nutriOf(me);
  ui.serv = ui.serv || r.serv;
  const f = ui.serv / r.serv;
  const picks = { ...n.picks };
  const servSel = h('select', { 'aria-label': 'Raciones' }, options([1, 2, 3, 4, 5, 6, 8].map((x) => [x, plural(x, 'ración', 'raciones')]), ui.serv));
  servSel.addEventListener('change', () => { ui.serv = Number(servSel.value); ctx.rerender(); });
  const eqLine = Object.entries(r.eq).map(([k, v]) => `${eqText(v)} ${EQ[k].short.toLowerCase()}`).join(', ');
  const el = h('div', { class: 'page fit' },
    h('section', { class: 'panel stack' },
      h('div', { class: 'cluster' }, r.meals.map((m) => h('span', { class: 'chip' }, MEAL_TAGS[m])), r.diet.map((d) => h('span', { class: 'chip ok' }, DIET_TAGS[d])), r.prep ? h('span', { class: 'chip info' }, 'Para varios días') : null),
      n.hide ? null : h('div', { class: 'kpis fit-kpis' }, kpi('kcal por ración', fmtN(r.per.kcal)), kpi('Proteína', `${r.per.p} g`), kpi('Carbohidratos', `${r.per.c} g`), kpi('Grasa', `${r.per.f} g`)),
      h('p', { style: { margin: 0 } }, h('strong', {}, 'Por ración: '), eqLine, '.'),
      h('p', { class: 'row-sub', style: { margin: 0 } }, `${r.min} min · la receta rinde ${plural(r.serv, 'ración', 'raciones')}.`)),
    h('section', { class: 'panel stack' }, h('div', { class: 'split' }, h('h3', {}, 'Ingredientes'), servSel),
      h('ul', { class: 'plain' }, r.ing.map(([q, u, name]) => h('li', {}, `${name}: ${q == null ? 'al gusto' : amountText(q * f, u)}`)))),
    h('section', { class: 'panel stack' }, h('h3', {}, 'Preparación'), h('ol', { class: 'plain' }, r.steps.map((x) => h('li', {}, x)))),
    r.tip ? note(r.tip) : null,
    canEdit ? h('div', { class: 'cluster' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => addRecipeSheet(r.meals.includes('des') ? 'des' : r.meals.includes('com') ? 'com' : r.meals.includes('cen') ? 'cen' : 'col1', (x) => {
        const log = mealLog(me, todayStr()); upsertDay(me.id, 'meal', todayStr(), { checks: log?.data?.checks || {}, extra: [...(log?.data?.extra || []), x] });
      }, r.id) }, ic('check', 18), 'Lo comí hoy'),
      h('button', { type: 'button', class: 'btn', onclick: () => {
        if (picks[r.id]) delete picks[r.id]; else picks[r.id] = ui.serv;
        saveProf(me.id, { picks }); toast(picks[r.id] ? `En tu semana: ${plural(ui.serv, 'ración', 'raciones')}` : 'Quitada de tu semana');
      } }, ic(picks[r.id] ? 'x' : 'shopping-cart', 18), picks[r.id] ? 'Quitar de mi semana' : `Agregar a mi semana (${ui.serv})`)) : null);
  return { title: r.name, back, el };
}
const kpi = (label, value) => h('div', { class: 'kpi' }, h('span', { class: 'n' }, value), h('span', { class: 'l' }, label));

// ---------- Lista del súper ----------
const SHOP_KEY = (pid) => `remate.fit.super.${pid}`;
function shopView(ctx, me, canEdit) {
  const n = nutriOf(me), picks = { ...n.picks };
  const ids = Object.keys(picks).filter((id) => RECIPE_BY_ID[id] && picks[id] > 0);
  if (!ids.length) return h('div', { class: 'stack' }, empty('Tu semana está vacía', 'En Recetas, abre una y toca «Agregar a mi semana». Aquí se arma la lista del súper.', h('a', { class: 'btn', href: '#/fit/recetas' }, 'Ver recetas')));
  let got = {}; try { got = JSON.parse(ls.get(SHOP_KEY(me.id)) || '{}'); } catch { got = {}; }
  const list = shoppingList(picks);
  const setN = (id, v) => { if (v <= 0) delete picks[id]; else picks[id] = v; saveProf(me.id, { picks }); };
  return h('div', { class: 'stack' },
    h('section', { class: 'panel stack' }, h('h3', {}, 'Recetas de la semana'),
      h('div', { class: 'rows' }, ids.map((id) => h('div', { class: 'row' },
        h('a', { class: 'row-main fit-link', href: `#/fit/receta/${id}` }, h('strong', {}, RECIPE_BY_ID[id].name), h('span', { class: 'row-sub' }, plural(picks[id], 'ración', 'raciones'))),
        canEdit ? h('span', { class: 'fit-step' },
          h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Una ración menos', onclick: () => setN(id, picks[id] - 1) }, ic('minus', 18)),
          h('b', {}, String(picks[id])),
          h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Una ración más', onclick: () => setN(id, Math.min(14, picks[id] + 1)) }, ic('plus', 18))) : null)))),
    h('section', { class: 'panel stack' }, h('div', { class: 'split' }, h('h3', {}, 'Lista del súper'),
      h('span', { class: 'cluster' }, h('a', { class: 'btn sm', href: '#/imprimir/comida' }, ic('printer', 16), 'Imprimir'),
        h('button', { type: 'button', class: 'btn sm ball', onclick: () => shareText(shoppingText(picks)) }, ic('share-2', 16), 'Compartir'))),
      list.map(([cat, xs]) => h('div', { class: 'stack fit-shop' }, h('h4', {}, cat), xs.map((x) => {
        const k = `${x.name}|${x.u}`;
        const box = h('input', { type: 'checkbox', checked: got[k] ? true : null, onchange: (e) => { if (e.target.checked) got[k] = 1; else delete got[k]; ls.set(SHOP_KEY(me.id), JSON.stringify(got)); e.target.closest('label').classList.toggle('done', e.target.checked); } });
        return h('label', { class: `check fit-shop-item ${got[k] ? 'done' : ''}`, title: x.from.join(', ') }, box, h('span', {}, h('strong', {}, x.name), `: ${x.text}`));
      }))),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Lo que palomeas se queda solo en este celular. Las cantidades se redondean hacia arriba en piezas.')),
    canEdit ? h('button', { type: 'button', class: 'btn ghost', onclick: async () => {
      if (await confirmSheet({ title: '¿Empezar otra semana?', text: 'Se quitan las recetas de tu semana y lo palomeado.', ok: 'Empezar de nuevo', danger: true })) { ls.del(SHOP_KEY(me.id)); saveProf(me.id, { picks: {} }); }
    } }, ic('refresh-cw', 18), 'Empezar otra semana') : null);
}

// ---------- resumen para Hoy y para el entrenador ----------
export function foodSummary(me, canEdit) {
  const n = nutriOf(me);
  if (!n.set) return canEdit ? h('section', { class: 'panel stack' }, h('h3', {}, 'Comida'),
    h('p', { style: { margin: 0 } }, `Arma tu plan: calorías, macros y porciones del Sistema Mexicano de Equivalentes, con ${RECIPES.length} recetas mexicanas, menú de la semana y lista del súper.`),
    h('a', { class: 'btn ball', href: '#/fit/comida' }, ic('utensils', 18), 'Armar mi plan de comida')) : null;
  const plan = planOf(me);
  if (!plan) return h('section', { class: 'panel stack' }, h('h3', {}, 'Comida'), note('Falta tu peso para calcular el plan. Anótalo arriba.'));
  const tot = dayTotals(plan, mealLog(me, todayStr()));
  const pct = (a, b) => Math.min(100, (a / b) * 100);
  // v3.19: lo que toca hoy en el menú.
  const menu = menuOf(me, plan), md = menu ? menu.days[wdOf(todayStr())] : null;
  return h('section', { class: 'panel stack' }, h('div', { class: 'split' }, h('h3', {}, 'Comida de hoy'), h('a', { class: 'btn sm', href: menu ? '#/fit/menu' : '#/fit/comida' }, canEdit ? 'Registrar' : 'Ver')),
    md ? h('ul', { class: 'plain' }, plan.meals.map((m) => h('li', {}, h('strong', {}, `${m.name}: `), slotInfo(plan, m.key, md[m.key]).title))) : null,
    plan.n.hide ? h('p', { style: { margin: 0 } }, 'Palomea tus porciones en «Comida».')
      : h('div', { class: 'fit-vol' },
        h('div', { class: 'fit-vol-row fit-macro' }, h('span', {}, 'Calorías'), h('span', { class: 'fit-bar' }, h('i', { style: { width: `${pct(tot.m.kcal, plan.t.kcal)}%` } })), h('strong', {}, `${fmtN(tot.m.kcal)} de ${fmtN(plan.t.kcal)}`)),
        h('div', { class: 'fit-vol-row fit-macro' }, h('span', {}, 'Proteína'), h('span', { class: 'fit-bar' }, h('i', { style: { width: `${pct(tot.m.p, plan.t.p)}%` } })), h('strong', {}, `${tot.m.p} de ${plan.t.p} g`))));
}
export function foodShared(me) {
  const plan = planOf(me);
  if (!plan) return null;
  const from = addDays(todayStr(), -6);
  const logs = fitLogsOf(me.id, 'meal').filter((l) => l.day >= from && l.day <= todayStr());
  const days = logs.map((l) => dayTotals(plan, l).m).filter((m) => m.kcal > 0);
  const avg = (k) => Math.round(days.reduce((a, m) => a + m[k], 0) / (days.length || 1));
  return h('section', { class: 'panel stack' }, h('h3', {}, 'Comida'),
    h('p', { style: { margin: 0 } }, plan.n.hide ? 'Usa su plan en porciones.' : `Plan: ${fmtN(plan.t.kcal)} kcal, ${plan.t.p} g de proteína.`),
    h('p', { class: 'row-sub', style: { margin: 0 } }, days.length ? `Registró ${plural(days.length, 'día', 'días')} de los últimos 7${plan.n.hide ? '' : `: en promedio ${fmtN(avg('kcal'))} kcal y ${avg('p')} g de proteína`}.` : 'No registró comidas en los últimos 7 días.'));
}
