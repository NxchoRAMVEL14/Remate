// Pruebas físicas: registro por jugador o de todo el equipo, y la gráfica de avance de cada quien.
import { h, ic, toast, openSheet, confirmSheet, fmtDate, todayStr } from '../util.js';
import { state, add, patch, remove, players, teamReady, torneosReady, settings } from '../store.js';
import { PTESTS, testTrend } from '../content/gym.js';
import { sectionTitle, note, empty, field, options, jersey } from './ui.js';
import { lineChart } from './chart.js';

const fmtV = (v, kind) => `${Number(v).toFixed(PTESTS[kind].step < 1 ? (PTESTS[kind].step < 0.1 ? 2 : 1) : 0).replace(/\.0+$/, '')} ${PTESTS[kind].unit}`;
const testsOf = (pid) => state.data.playerTests.filter((t) => t.player_id === pid);
// Pruebas que se pueden capturar: la de 10 m necesita el SQL de la v3.3.
export const testKinds = () => Object.keys(PTESTS).filter((k) => k !== 'vel10' || torneosReady());
// Recordatorio: cada cuántas semanas medir (Ajustes) y cuándo fue la última prueba del equipo.
export const testsEvery = () => Number(settings().tests_every) || 10;
export function testsDue() {
  const last = state.data.playerTests.map((t) => String(t.test_date)).sort().pop() || null;
  const days = last ? Math.round((Date.now() - new Date(`${last}T12:00:00`).getTime()) / 864e5) : null;
  return { last, days, due: !last || days >= testsEvery() * 7 };
}

export function testSheet(p, t = null, kind0 = 'cmj') {
  const date = h('input', { type: 'date', max: todayStr(), value: t?.test_date || todayStr() });
  const kind = h('select', {}, options(testKinds().map((k) => [k, `${PTESTS[k].name} (${PTESTS[k].unit})`]), t?.kind || kind0));
  const val = h('input', { type: 'number', inputmode: 'decimal', step: 'any', value: t?.value ?? '' });
  const text = h('input', { type: 'text', maxlength: 300, value: t?.note || '', placeholder: 'Opcional' });
  const how = h('ol', { class: 'plain' });
  const syncHow = () => how.replaceChildren(...PTESTS[kind.value].how.map((x) => h('li', {}, x)));
  kind.addEventListener('change', syncHow); syncHow();
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  openSheet({
    title: t ? 'Editar prueba' : `Prueba de ${p.name}`,
    body: h('div', { class: 'stack' }, h('div', { class: 'grid' }, field('Fecha', date), field('Prueba', kind)), field('Resultado', val), field('Nota', text),
      h('details', {}, h('summary', {}, 'Cómo se mide'), how), err),
    actions: [{ label: 'Cancelar' },
      t ? { label: 'Borrar', kind: 'danger', onClick: async () => { if (!(await confirmSheet({ title: '¿Borrar esta prueba?', text: 'No se puede deshacer.', ok: 'Borrar', danger: true }))) return false; remove('playerTests', t.id); toast('Prueba borrada'); return true; } } : null,
      { label: 'Guardar', kind: 'primary', onClick: () => {
        const d = PTESTS[kind.value], v = Number(String(val.value).replace(',', '.'));
        if (!val.value || !(v >= d.min && v <= d.max)) { err.textContent = `Escribe un resultado entre ${d.min} y ${d.max} ${d.unit}.`; err.hidden = false; return false; }
        const row = { test_date: date.value || todayStr(), kind: kind.value, value: v, note: text.value.trim() };
        if (t) patch('playerTests', t.id, row); else add('playerTests', { ...row, player_id: p.id });
        toast('Prueba guardada'); return true;
      } }].filter(Boolean),
  });
}

// Panel con la última marca, el cambio y la gráfica de cada prueba de un jugador.
export function testsPanel(p, { canEdit = false } = {}) {
  const list = testsOf(p.id);
  const kinds = Object.keys(PTESTS).filter((k) => list.some((t) => t.kind === k));
  return h('div', { class: 'stack' },
    canEdit ? h('div', { class: 'cluster' }, h('button', { class: 'btn primary sm', type: 'button', disabled: teamReady() ? null : true, onclick: () => testSheet(p) }, ic('plus', 16), 'Registrar prueba'),
      h('a', { class: 'btn sm', href: '#/pruebas' }, ic('users', 16), 'Pruebas de todo el equipo')) : null,
    kinds.length ? kinds.map((k) => {
      const tr = testTrend(list, k), d = PTESTS[k];
      return h('section', { class: 'panel stack' },
        h('div', { class: 'split' }, h('h3', {}, d.name), h('span', { class: 'cluster' },
          h('strong', {}, fmtV(tr.last, k)),
          tr.n > 1 && tr.d ? h('span', { class: `chip ${tr.better === true ? 'ok' : tr.better === false ? 'warn' : ''}` }, `${tr.d > 0 ? '+' : ''}${fmtV(tr.d, k)}`) : null)),
        tr.n > 1 ? lineChart(tr.list.map((t) => ({ x: t.test_date, y: Number(t.value), tip: t.note || '' })), { unit: d.unit, label: d.name, digits: d.step < 1 ? 1 : 0, lowerBetter: d.better === 'down' }) : null,
        h('div', { class: 'cluster' }, tr.list.slice().reverse().map((t) => canEdit
          ? h('button', { class: 'chip', type: 'button', onclick: () => testSheet(p, t) }, `${fmtDate(t.test_date, { day: 'numeric', month: 'short' })}: ${fmtV(t.value, k)}`)
          : h('span', { class: 'chip' }, `${fmtDate(t.test_date, { day: 'numeric', month: 'short' })}: ${fmtV(t.value, k)}`))));
    }) : empty('Sin pruebas físicas', canEdit ? 'Cada 2 o 3 meses mide salto, velocidad de 10 m, alcance de remate, agilidad y plancha. Así ves su avance con datos.' : 'Tu entrenador registra aquí tus pruebas de salto, velocidad, alcance, agilidad y plancha.'));
}

export default function pruebas(ctx) {
  if (ctx.role !== 'coach') {
    const me = ctx.me;
    return { title: 'Mis pruebas físicas', back: '#/inicio', el: h('div', { class: 'page' }, me ? testsPanel(me) : null,
      note('Las pruebas se repiten cada 2 o 3 meses, siempre igual, para comparar contigo mismo. Lo que importa es tu avance, no compararte con otros.')) };
  }
  // Entrenador: captura rápida de una prueba para todo el equipo.
  const ui = ctx.ui; ui.kind ||= 'cmj'; ui.date ||= todayStr();
  const list = players(), d = PTESTS[ui.kind];
  const kind = h('select', { 'aria-label': 'Prueba' }, options(testKinds().map((k) => [k, `${PTESTS[k].name} (${PTESTS[k].unit})`]), ui.kind));
  kind.addEventListener('change', () => { ui.kind = kind.value; ctx.rerender(); });
  const date = h('input', { type: 'date', max: todayStr(), value: ui.date, 'aria-label': 'Fecha' });
  date.addEventListener('change', () => { ui.date = date.value || todayStr(); });
  const inputs = new Map();
  const rows = list.map((p) => {
    const tr = testTrend(testsOf(p.id), ui.kind);
    const inp = h('input', { type: 'number', inputmode: 'decimal', step: 'any', class: 'tst-in', 'aria-label': `${d.name} de ${p.name}`, placeholder: d.unit });
    inputs.set(p.id, inp);
    return h('div', { class: 'row' }, jersey(p, 'sm'), h('span', { class: 'row-main' }, h('strong', {}, p.name), h('span', { class: 'row-sub' }, tr ? `Última: ${fmtV(tr.last, ui.kind)} (${fmtDate(tr.list[tr.list.length - 1].test_date, { day: 'numeric', month: 'short' })})` : 'Sin registro')),
      inp, h('a', { class: 'iconbtn', href: `#/jugador/${p.id}/pruebas`, 'aria-label': `Ver pruebas de ${p.name}` }, ic('chart-line', 18)));
  });
  const save = () => {
    let n = 0, bad = 0;
    for (const [pid, inp] of inputs) {
      if (!inp.value) continue;
      const v = Number(String(inp.value).replace(',', '.'));
      if (!(v >= d.min && v <= d.max)) { bad++; inp.classList.add('bad'); continue; }
      add('playerTests', { player_id: pid, kind: ui.kind, value: v, test_date: date.value || todayStr() }); n++;
    }
    toast(bad ? `${n} guardadas. Revisa ${bad}: fuera de ${d.min} a ${d.max} ${d.unit}.` : n ? `${n} pruebas guardadas` : 'Escribe al menos un resultado');
  };
  const due = testsDue();
  const el = h('div', { class: 'page' },
    !teamReady() ? note('Para guardar pruebas, corre en Supabase el instalar.sql de esta versión.', 'bad') : null,
    teamReady() && !torneosReady() ? note('La prueba de velocidad de 10 m aparece cuando corras en Supabase el sql/instalar.sql de la versión 3.3.', 'warn') : null,
    h('p', { class: 'row-sub', style: { margin: 0 } }, due.last ? `Última toma del equipo: ${fmtDate(due.last, { day: 'numeric', month: 'long' })} (hace ${due.days} días). Te recuerdo en Hoy cada ${testsEvery()} semanas; lo cambias en Ajustes.` : `Te recuerdo en Hoy cada ${testsEvery()} semanas; lo cambias en Ajustes.`),
    h('div', { class: 'grid' }, field('Prueba', kind), field('Fecha', date)),
    h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, `Cómo se mide: ${d.name}`)), h('ol', { class: 'plain', style: { marginTop: '10px' } }, d.how.map((x) => h('li', {}, x)))),
    list.length ? h('div', { class: 'rows tests-entry' }, rows) : empty('Sin jugadores', 'Agrega jugadores primero.'),
    list.length ? h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', disabled: teamReady() ? null : true, onclick: save }, ic('check', 18), 'Guardar resultados')) : null,
    note('Deja en blanco a quien no hizo la prueba. Cada jugador ve sus propias pruebas y su avance, nunca las de los demás.'));
  return { title: 'Pruebas físicas', sub: 'Todo el equipo', back: '#/jugadores', el };
}
