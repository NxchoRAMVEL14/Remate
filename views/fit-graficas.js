// Remate Fit · Progreso con gráficas de todo (v3.16): pasos, cardio, peso, grasa y músculo, medidas,
// gym (sesiones, horas, volumen y esfuerzo), voleibol y comida. Por semana, mes, 3 meses o año,
// con flechas para ver periodos anteriores y un resumen de tendencias contra el periodo anterior.
import { h, ic, toast, confirmSheet, fmtDate, todayStr, addDays, diffDays, parseDate, plural } from '../util.js';
import { state, remove } from '../store.js';
import { note } from './ui.js';
import { periodChart } from './chart.js';
import { fitLogsOf, specOf, saveActivity, activityOf } from './fit.js';
import { planOf, dayTotals } from './fit-comida.js';
import { activitySheet } from './fit-bascula.js';
import { FIT_BY_ID } from '../content/fit.js';

const r1 = (x) => Math.round(x * 10) / 10;
const fmtN = (v, d = 0) => Number(v).toLocaleString('es-MX', { maximumFractionDigits: d });
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const pos = (v) => Number(v) > 0;

export const PERIODS = [['sem', 'Semana'], ['mes', 'Mes'], ['tri', '3 meses'], ['ano', 'Año']];
const short = (d) => fmtDate(d, { day: 'numeric', month: 'short' });
const longD = (d) => fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' });
const ymd = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// Las cubetas del periodo: días (semana y mes), semanas (3 meses) o meses (año). off = cuántos periodos atrás.
export function windowOf(p, off = 0, today = todayStr()) {
  let bk = [];
  if (p === 'sem' || p === 'mes') {
    const n = p === 'sem' ? 7 : 30, end = addDays(today, -n * off);
    bk = Array.from({ length: n }, (_, i) => { const d = addDays(end, i - n + 1); return { from: d, to: d, label: p === 'sem' ? fmtDate(d, { weekday: 'short' }) : String(parseDate(d).getDate()), long: longD(d) }; });
  } else if (p === 'tri') {
    const end = addDays(today, -91 * off);
    bk = Array.from({ length: 13 }, (_, i) => { const to = addDays(end, -7 * (12 - i)), from = addDays(to, -6); return { from, to, label: short(from), long: `Semana del ${short(from)} al ${short(to)}` }; });
  } else {
    const t = parseDate(today), base = t.getFullYear() * 12 + t.getMonth() - 12 * off;
    bk = Array.from({ length: 12 }, (_, i) => {
      const k = base - 11 + i, y = Math.floor(k / 12), m = (k % 12) + 1;
      const from = ymd(y, m, 1), last = ymd(y, m, new Date(y, m, 0).getDate());
      return { from, to: last > today ? today : last, label: fmtDate(from, { month: 'short' }), long: fmtDate(from, { month: 'long', year: 'numeric' }) };
    });
  }
  const from = bk[0].from, to = bk[bk.length - 1].to;
  const unit = p === 'tri' ? 'semana' : p === 'ano' ? 'mes' : 'dia';
  const title = p === 'ano' ? `${fmtDate(from, { month: 'short', year: 'numeric' })} – ${fmtDate(to, { month: 'short', year: 'numeric' })}` : `${short(from)} – ${fmtDate(to, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return { bk, from, to, unit, days: diffDays(to, from) + 1, title };
}

// Todo lo que se grafica, por día (mapas día → dato) para no recorrer los registros muchas veces.
function dataOf(me) {
  const byDay = (kind) => { const m = new Map(); for (const l of fitLogsOf(me.id, kind)) if (!m.has(l.day)) m.set(l.day, l.data || {}); return m; };
  const steps = byDay('steps'), body = byDay('body'), meals = byDay('meal');
  const gym = fitLogsOf(me.id, 'gym');
  // Voleibol: entrenos a los que fue (presente o retardo) y partidos en los que jugó.
  const ses = new Map((state.data.sessions || []).filter((x) => x.status !== 'cancelada').map((x) => [x.id, x]));
  const vb = new Map();
  for (const a of state.data.attendance || []) {
    const se = ses.get(a.session_id);
    if (a.player_id === me.id && se && (a.status === 'presente' || a.status === 'retardo')) { const o = vb.get(se.session_date) || []; o.push('Entreno'); vb.set(se.session_date, o); }
  }
  const mt = new Map((state.data.matches || []).map((m) => [m.id, m]));
  const seenM = new Set();
  for (const x of state.data.matchStats || []) {
    const m = mt.get(x.match_id);
    if (x.player_id === me.id && m && !seenM.has(m.id)) { seenM.add(m.id); const o = vb.get(m.match_date) || []; o.push(m.rival ? `Partido vs ${m.rival}` : 'Partido'); vb.set(m.match_date, o); }
  }
  return { steps, body, meals, gym, vb };
}
const daysIn = (b) => { const out = []; for (let d = b.from; d <= b.to; d = addDays(d, 1)) out.push(d); return out; };
const vals = (map, b, key, ok = pos) => daysIn(b).map((d) => map.get(d)?.[key]).filter((v) => v != null && ok(v)).map(Number);
const gymIn = (gym, b) => gym.filter((l) => l.day >= b.from && l.day <= b.to);
const volOf = (l) => sum((l.data?.sets || []).filter((e) => FIT_BY_ID[e.ex]?.unit === 'kg').flatMap((e) => (e.s || []).map(([kg, reps]) => (Number(kg) || 0) * (Number(reps) || 0))));

// Promedio de 7 días hacia atrás (para la línea de tendencia en las vistas por día).
const rolling = (map, key, bk, ok = pos) => bk.map((b) => { const xs = vals(map, { from: addDays(b.to, -6), to: b.to }, key, ok); return xs.length ? r1(avg(xs)) : null; });

// Resumen del periodo (y del anterior, para comparar).
function summary(D, w) {
  const all = { from: w.from, to: w.to };
  const st = vals(D.steps, all, 'n'), pc = vals(D.steps, all, 'pc', (v) => v >= 0), cm = vals(D.steps, all, 'cmin');
  const kg = vals(D.body, all, 'kg'), g = gymIn(D.gym, all), wk = w.days / 7;
  const vbDays = daysIn(all).filter((d) => D.vb.has(d)).length;
  return {
    steps: st.length ? avg(st) : null, stepsN: st.length,
    pc: pc.length ? sum(pc) / wk : null, cmin: cm.length ? sum(cm) / wk : null,
    kg: kg.length ? avg(kg) : null,
    gym: g.length / wk, gymH: sum(g.map((l) => Number(l.data?.minutes) || 0)) / 60 / wk,
    vb: vbDays / wk,
  };
}

export function chartsTab(ctx, me, canEdit, extra = {}) {
  const ui = ctx.ui;
  ui.gp = PERIODS.some(([k]) => k === ui.gp) ? ui.gp : 'sem';
  ui.go = Math.max(0, Number(ui.go) || 0);
  const today = todayStr(), spec = specOf(me.id), D = dataOf(me);
  const w = windowOf(ui.gp, ui.go, today), prev = windowOf(ui.gp, ui.go + 1, today);
  const daily = w.unit === 'dia', bk = w.bk;
  const per = w.unit === 'semana' ? 'por semana' : w.unit === 'mes' ? 'por mes' : 'por día';
  const each = w.unit === 'semana' ? 'cada semana' : 'cada mes';
  const go = (k, off) => { ui.gp = k; ui.go = off; ctx.rerender(); };

  // ----- selector de periodo -----
  const bar = h('div', { class: 'fg-period' },
    h('div', { class: 'seg', role: 'group', 'aria-label': 'Periodo' }, PERIODS.map(([k, t]) => h('button', { type: 'button', 'aria-pressed': ui.gp === k ? 'true' : 'false', onclick: () => go(k, 0) }, t))),
    h('div', { class: 'fg-nav' },
      h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Periodo anterior', onclick: () => go(ui.gp, ui.go + 1) }, ic('chevron-left', 20)),
      h('strong', { 'aria-live': 'polite' }, w.title),
      h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Periodo siguiente', disabled: ui.go ? null : true, onclick: () => go(ui.gp, ui.go - 1) }, ic('chevron-right', 20))));

  // ----- tendencias: este periodo contra el anterior -----
  const a = summary(D, w), b = summary(D, prev);
  const change = (x, y, { pct = true, unit = '', digits = 0 } = {}) => {
    if (x == null || y == null || (pct && !y)) return 'sin datos antes';
    const d = pct ? ((x - y) / y) * 100 : x - y;
    if (Math.abs(d) < (pct ? 1 : digits ? 0.05 : 0.5)) return 'igual que antes';
    return `${d > 0 ? '▲' : '▼'} ${d > 0 ? '+' : '−'}${fmtN(Math.abs(d), pct ? 0 : digits)}${pct ? '%' : unit} vs. antes`;
  };
  const tile = (value, label, sub) => h('div', { class: 'kpi fg-tile' }, h('span', { class: 'n' }, value), h('span', { class: 'l' }, label), h('span', { class: 'fg-chg' }, sub));
  const tiles = [
    tile(a.steps != null ? fmtN(a.steps) : '—', 'Pasos al día', change(a.steps, b.steps)),
    a.pc != null || b.pc != null ? tile(a.pc != null ? fmtN(a.pc) : '—', 'Puntos cardio por semana', change(a.pc, b.pc)) : null,
    a.cmin != null || b.cmin != null ? tile(a.cmin != null ? fmtN(a.cmin) : '—', 'Min de cardio por semana', change(a.cmin, b.cmin)) : null,
    tile(a.kg != null ? `${fmtN(a.kg, 1)} kg` : '—', 'Peso promedio', change(a.kg, b.kg, { pct: false, unit: ' kg', digits: 1 })),
    tile(fmtN(a.gym, 1), 'Sesiones de gym por semana', change(a.gym, b.gym)),
    tile(fmtN(a.gymH, 1), 'Horas de gym por semana', change(a.gymH, b.gymH)),
    a.vb || b.vb ? tile(fmtN(a.vb, 1), 'Días de voleibol por semana', change(a.vb, b.vb)) : null,
  ].filter(Boolean);

  // ----- pasos -----
  const stepB = bk.map((x) => {
    if (daily) { const n = D.steps.get(x.from)?.n; return { ...x, y: n ?? null }; }
    const xs = vals(D.steps, x, 'n');
    return { ...x, y: xs.length ? Math.round(avg(xs)) : null, tip: xs.length ? `promedio de ${plural(xs.length, 'día', 'días')} con registro · total ${fmtN(sum(xs))}` : null };
  });
  const goalDays = daily ? stepB.filter((x) => x.y != null && x.y >= spec.stepsGoal).length : null;
  const stepsSec = section('pasos', 'Pasos', daily ? 'Cada barra es un día.' : `Cada barra es el promedio al día de ${each}.`,
    periodChart(stepB, { type: 'bar', unit: 'pasos', label: 'Pasos', goal: spec.stepsGoal, goalLabel: 'Meta', trend: daily ? rolling(D.steps, 'n', bk) : null, trendLabel: 'Promedio de 7 días', seriesLabel: 'Pasos del día' }),
    h('p', { class: 'row-sub', style: { margin: 0 } }, [a.steps != null ? `Promedio: ${fmtN(a.steps)} al día en ${plural(a.stepsN, 'día', 'días')} con registro` : 'Sin pasos en este periodo', goalDays != null && a.stepsN ? `${goalDays} de ${a.stepsN} llegaron a la meta` : null].filter(Boolean).join(' · ') + '.'),
    extra.steps || null,
    canEdit ? editDays(me, D, w, daily, today) : null);

  // ----- cardio -----
  const anyPc = [...D.steps.values()].some((x) => x.pc != null), anyCm = [...D.steps.values()].some((x) => Number(x.cmin) > 0);
  const cardioB = (key) => bk.map((x) => {
    if (daily) { const v = D.steps.get(x.from)?.[key]; return { ...x, y: v ?? null, tip: key === 'cmin' && D.steps.get(x.from)?.ctipo ? D.steps.get(x.from).ctipo : null }; }
    const xs = vals(D.steps, x, key, (v) => v >= 0), wk = (diffDays(x.to, x.from) + 1) / 7;
    return { ...x, y: xs.length ? Math.round(w.unit === 'mes' ? sum(xs) / wk : sum(xs)) : null, tip: xs.length ? `total ${fmtN(sum(xs))} en ${plural(xs.length, 'día', 'días')}` : null };
  });
  const cGoal = daily ? r1(150 / 7) : 150;
  const cardioSec = section('cardio', 'Cardio',
    daily ? 'Por día. La meta de 150 por semana son unos 21 al día.' : w.unit === 'semana' ? 'Total de cada semana. Meta: 150 por semana.' : 'Promedio por semana de cada mes. Meta: 150 por semana.',
    anyPc ? [h('h4', {}, 'Puntos cardio (Google Fit)'), periodChart(cardioB('pc'), { type: 'bar', unit: 'pts', label: 'Puntos cardio', goal: cGoal, goalLabel: 'Meta', digits: 0 })] : null,
    anyCm ? [h('h4', {}, 'Minutos de cardio'), periodChart(cardioB('cmin'), { type: 'bar', unit: 'min', label: 'Minutos de cardio', goal: cGoal, goalLabel: 'Meta', digits: 0 })] : null,
    !anyPc && !anyCm ? note('Todavía no hay cardio. Anótalo en Hoy → «Cardio», o lee la captura de Google Fit en «Puntos cardio» (Mi actividad → Semana).') : null,
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'La OMS recomienda de 150 a 300 minutos a la semana de actividad moderada, o la mitad si es intensa. Google Fit da 1 punto cardio por minuto moderado y 2 por minuto intenso; 150 puntos a la semana cumplen la recomendación.'));

  // ----- peso, grasa y músculo -----
  const bodyB = (key) => bk.map((x) => { const xs = vals(D.body, x, key); return { ...x, y: xs.length ? r1(avg(xs)) : null, tip: !daily && xs.length ? plural(xs.length, 'medición', 'mediciones') : null }; });
  const kgB = bodyB('kg'), nKg = kgB.filter((x) => x.y != null).length;
  const weightSec = section('peso', 'Peso', daily ? 'Cada punto es una pesada; la línea dorada es el promedio de 7 días.' : `Promedio de ${each}.`,
    nKg ? periodChart(kgB, { type: 'line', unit: 'kg', label: 'Peso', digits: 1, trend: daily ? rolling(D.body, 'kg', bk) : null, trendLabel: 'Promedio de 7 días', seriesLabel: 'Pesada' }) : note('Sin pesadas en este periodo.'),
    extra.weight || null);
  const fatB = bodyB('grasa'), musB = bodyB('musculo'), musPB = bodyB('musculoPct'), ffmB = bodyB('ffm'), viscB = bodyB('visc'), smmB = bodyB('smm');
  const has = (xs) => xs.some((x) => x.y != null);
  const compSec = has(fatB) || has(musB) || has(musPB) || has(ffmB) ? section('grasa', 'Grasa y músculo (báscula)', null,
    has(fatB) ? [h('h4', {}, 'Grasa corporal'), periodChart(fatB, { type: 'line', unit: '%', label: 'Grasa corporal', digits: 1 })] : null,
    has(musB) ? [h('h4', {}, 'Masa muscular'), periodChart(musB, { type: 'line', unit: 'kg', label: 'Masa muscular', digits: 1 })] : has(musPB) ? [h('h4', {}, 'Masa muscular'), periodChart(musPB, { type: 'line', unit: '%', label: 'Masa muscular', digits: 1 })] : null,
    // v3.19: peso sin grasa (lo que quieres conservar al bajar), músculo esquelético y grasa visceral.
    has(ffmB) ? [h('h4', {}, 'Peso sin grasa'), periodChart(ffmB, { type: 'line', unit: 'kg', label: 'Peso sin grasa', digits: 1 }),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Músculo, huesos, órganos y agua. Al bajar de peso, lo ideal es que esta línea se quede plana mientras baja el peso.')] : null,
    has(smmB) ? [h('h4', {}, 'Músculo esquelético'), periodChart(smmB, { type: 'line', unit: 'kg', label: 'Músculo esquelético', digits: 1 })] : null,
    has(viscB) ? [h('h4', {}, 'Grasa visceral'), periodChart(viscB, { type: 'line', unit: '', label: 'Grasa visceral', digits: 1 }),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Es un índice de la báscula, no kilos. Cada marca usa su propia escala; lo que importa es que baje.')] : null,
    note('La báscula calcula grasa y músculo con bioimpedancia: el número de un día puede estar varios puntos arriba o abajo y cambia con el agua. Mira la tendencia de semanas.')) : null;

  // ----- medidas -----
  const MEAS = [['cintura', 'Cintura'], ['cadera', 'Cadera'], ['brazo', 'Brazo'], ['muslo', 'Muslo']];
  const measCharts = MEAS.map(([k, t]) => { const xs = bodyB(k); return xs.filter((x) => x.y != null).length >= 2 ? [h('h4', {}, t), periodChart(xs, { type: 'line', unit: 'cm', label: t, digits: 1 })] : null; }).filter(Boolean);
  const measSec = section('medidas', 'Medidas', null, measCharts.length ? measCharts : h('p', { class: 'row-sub', style: { margin: 0 } }, 'Para ver la gráfica de una medida necesitas 2 o más en este periodo (prueba «3 meses» o «Año»).'), extra.measures || null);

  // ----- gym -----
  const gymB = bk.map((x) => {
    const g = gymIn(D.gym, x), min = sum(g.map((l) => Number(l.data?.minutes) || 0));
    return { ...x, n: g.length, min, vol: sum(g.map(volOf)), rpe: avg(g.map((l) => Number(l.data?.rpe)).filter(pos)), names: g.map((l) => (l.data?.key === 'L' ? 'Sesión libre' : `Día ${l.data?.key}`)).join(', ') };
  });
  const gymSec = section('gym', 'Gym', null,
    daily ? [h('h4', {}, 'Minutos de gym por día'), periodChart(gymB.map((x) => ({ ...x, y: x.min, tip: x.names || null })), { type: 'bar', unit: 'min', label: 'Minutos de gym' }),
      h('p', { class: 'row-sub', style: { margin: 0 } }, `${plural(sum(gymB.map((x) => x.n)), 'sesión', 'sesiones')} en el periodo · ${fmtN(sum(gymB.map((x) => x.min)) / 60, 1)} horas · tu meta: ${spec.days} por semana.`)]
      : [h('h4', {}, `Sesiones ${per}`), periodChart(gymB.map((x) => ({ ...x, y: x.n })), { type: 'bar', unit: '', label: `Sesiones de gym ${per}`, goal: w.unit === 'semana' ? spec.days : null, goalLabel: 'Meta', int: true, fmtV: (v) => plural(v, 'sesión', 'sesiones') }),
        h('h4', {}, `Horas de gym ${per}`), periodChart(gymB.map((x) => ({ ...x, y: r1(x.min / 60) })), { type: 'bar', unit: 'h', label: `Horas de gym ${per}`, digits: 1 })],
    gymB.some((x) => x.vol > 0) ? [h('h4', {}, `Volumen ${per} (kg × repeticiones)`), periodChart(gymB.map((x) => ({ ...x, y: Math.round(x.vol) })), { type: 'bar', unit: 'kg', label: `Volumen ${per}` }),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Suma de peso × repeticiones de los ejercicios con carga. Sube si cargas más o haces más series.')] : null,
    gymB.some((x) => x.rpe) ? [h('h4', {}, 'Esfuerzo promedio (1 a 10)'), periodChart(gymB.map((x) => ({ ...x, y: x.rpe ? r1(x.rpe) : null })), { type: 'line', unit: '', label: 'Esfuerzo promedio', digits: 1, zero: false })] : null,
    extra.gym || null);

  // ----- voleibol -----
  const vbB = bk.map((x) => { const ds = daysIn(x).filter((d) => D.vb.has(d)); return { ...x, y: ds.length, tip: ds.length ? ds.flatMap((d) => D.vb.get(d)).join(', ') : null }; });
  const vbSec = vbB.some((x) => x.y) || [...D.vb.keys()].length ? section('voleibol', 'Voleibol', daily ? 'Días con entreno o partido (de tu asistencia y tus partidos en Remate).' : `Días con entreno o partido ${per}.`,
    periodChart(vbB, { type: 'bar', label: 'Días de voleibol', int: true, fmtV: daily ? (v) => (v ? 'entreno o partido' : 'sin voleibol') : (v) => plural(v, 'día', 'días') })) : null;

  // ----- comida -----
  const plan = planOf(me);
  let foodSec = null;
  if (plan) {
    const tot = (d) => { const l = D.meals.get(d); if (!l) return null; const m = dayTotals(plan, { data: l }).m; return m.kcal > 0 ? m : null; };
    const fB = (key) => bk.map((x) => { const xs = daysIn(x).map(tot).filter(Boolean).map((m) => m[key]); return { ...x, y: xs.length ? Math.round(avg(xs)) : null, tip: !daily && xs.length ? `promedio de ${plural(xs.length, 'día', 'días')} registrados` : null }; });
    foodSec = section('comida', 'Comida', daily ? 'Lo que palomeaste cada día en «Comida».' : `Promedio al día de ${each} (solo días que registraste).`,
      plan.n.hide ? periodChart(bk.map((x) => ({ ...x, y: daysIn(x).filter((d) => tot(d)).length })), { type: 'bar', label: 'Días con comida registrada', int: true, fmtV: daily ? (v) => (v ? 'registrado' : 'sin registro') : (v) => plural(v, 'día', 'días') })
        : [h('h4', {}, 'Calorías'), periodChart(fB('kcal'), { type: 'bar', unit: 'kcal', label: 'Calorías', goal: plan.t.kcal, goalLabel: 'Plan' }),
          h('h4', {}, 'Proteína'), periodChart(fB('p'), { type: 'bar', unit: 'g', label: 'Proteína', goal: plan.t.p, goalLabel: 'Plan' })]);
  }

  const secs = [stepsSec, cardioSec, weightSec, compSec, measSec, gymSec, vbSec, foodSec].filter(Boolean);
  const jump = h('nav', { class: 'cluster fg-jump', 'aria-label': 'Ir a' }, secs.map((x) => h('button', { type: 'button', class: 'chip', onclick: () => x.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, x.dataset.title)));
  return h('div', { class: 'stack' },
    h('section', { class: 'panel stack' }, h('h3', {}, 'Tendencias'), bar,
      h('div', { class: 'kpis fit-kpis fg-tiles' }, tiles),
      h('p', { class: 'row-sub', style: { margin: 0 } }, `«Antes» es el periodo anterior: ${prev.title}. Toca una gráfica para ver el número de cada barra o punto.`)),
    jump, secs);
}

function section(id, title, sub, ...kids) {
  const el = h('section', { class: 'panel stack fg-sec', id: `fg-${id}` }, h('h3', {}, title), sub ? h('p', { class: 'row-sub', style: { margin: 0 } }, sub) : null, ...kids);
  el.dataset.title = title;
  return el;
}

// Corregir pasos y cardio día por día (los días del periodo; en 3 meses y año, los últimos 30).
function editDays(me, D, w, daily, today) {
  const days = daily ? daysIn({ from: w.from, to: w.to }).reverse() : Array.from({ length: 30 }, (_, i) => addDays(today, -i));
  const cur = (d) => activityOf(me.id, d);
  const open = (d) => activitySheet({ day: d, cur, title: 'Corregir un día', onSave: (dd, data) => { saveActivity(me.id, dd, data); toast(`Guardado (${fmtDate(dd)})`); },
    onDelete: (dd) => { const l = fitLogsOf(me.id, 'steps').find((x) => x.day === dd); if (!l) { toast('Ese día no tiene nada'); return false; }
      confirmSheet({ title: `¿Borrar los pasos y el cardio del ${fmtDate(dd)}?`, ok: 'Borrar', danger: true }).then((ok) => { if (ok) { remove('fitLogs', l.id); toast('Borrado'); } }); return true; } });
  return h('details', { class: 'fg-days' }, h('summary', {}, daily ? 'Corregir día por día' : 'Corregir día por día (últimos 30 días)'),
    h('div', { class: 'rows' }, days.map((d) => {
      const x = D.steps.get(d) || {};
      const txt = [x.n != null ? `${fmtN(x.n)} pasos` : null, x.pc != null ? `${x.pc} pts cardio` : null, x.cmin ? `${x.cmin} min de cardio` : null].filter(Boolean).join(' · ');
      return h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' })), h('span', { class: 'row-sub' }, txt || 'Sin registro')),
        h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Editar el ${fmtDate(d)}`, onclick: () => open(d) }, ic('pencil', 18)));
    })),
    h('button', { type: 'button', class: 'btn sm', onclick: () => open(addDays(today, -1)) }, ic('calendar-days', 16), 'Otro día'));
}
