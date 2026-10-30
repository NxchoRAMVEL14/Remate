// Planeador de temporada: bloques de 3 o 4 semanas con un enfoque, que generan los entrenamientos en tus días.
import { h, ic, toast, openSheet, confirmSheet, fmtDate, todayStr, addDays, parseDate, plural, uid, DAYS_LONG } from '../util.js';
import { state, settings, saveSettings, group, add } from '../store.js';
import { SKILLS, SKILL_BY_ID } from '../content/skills.js';
import { TEMPLATES, TEMPLATE_BY_ID } from '../content/templates.js';
import { sectionTitle, note, empty, field, options } from './ui.js';
import { weekStart } from '../lab-calc.js';

const plan = () => (settings().season_plan || []).slice().sort((a, b) => a.start.localeCompare(b.start));
const endOf = (b) => addDays(b.start, b.weeks * 7 - 1);
const save = (list) => saveSettings({ season_plan: list });

// Fechas de entrenamiento del bloque desde hoy (las pasadas no se tocan).
function blockDates(b, days) {
  const out = [], t = todayStr();
  for (let i = 0; i < b.weeks * 7; i++) { const d = addDays(b.start, i); if (d >= t && days.includes(parseDate(d).getDay())) out.push(d); }
  return out;
}

function generate(b) {
  const st = settings(), days = st.days || [];
  if (!days.length) { toast('Primero elige tus días de entrenamiento en Ajustes'); return; }
  const have = new Set(state.data.sessions.map((s) => s.session_date));
  const dates = blockDates(b, days).filter((d) => !have.has(d));
  if (!dates.length) { toast('Ya hay entrenamiento en todos los días de este bloque'); return; }
  const tpls = (b.templates || []).map((id) => TEMPLATE_BY_ID[id]).filter(Boolean);
  dates.forEach((date, i) => {
    const tp = tpls.length ? tpls[i % tpls.length] : null;
    add('sessions', { group_id: group()?.id, session_date: date, start_time: st.start, minutes: tp?.minutes || st.minutes, title: tp ? `${b.name}: ${tp.name}` : b.name,
      focus: b.focus?.length ? b.focus : tp?.focus || [], plan: tp ? tp.blocks.map((x) => ({ ...x, note: '' })) : [], status: 'planeada', published: false });
  });
  toast(`${plural(dates.length, 'entrenamiento creado', 'entrenamientos creados')} para ${b.name}`);
}

function blockSheet(b = null) {
  const list = plan(), last = list[list.length - 1];
  const nextMonday = () => { const ws = weekStart(todayStr()); return addDays(ws, 7); };
  const name = h('input', { type: 'text', maxlength: 40, value: b?.name || '', placeholder: 'Por ejemplo: Fundamentos' });
  const start = h('input', { type: 'date', value: b?.start || (last ? addDays(endOf(last), 1) : nextMonday()) });
  const weeks = h('select', {}, options([2, 3, 4, 5, 6].map((n) => [n, `${n} semanas`]), b?.weeks || 4));
  const chosen = new Set(b?.focus || []);
  const focus = h('div', { class: 'cluster' }, SKILLS.map((s) => { const cb = h('input', { type: 'checkbox', checked: chosen.has(s.id) ? true : null, onchange: (e) => { if (e.target.checked) chosen.add(s.id); else chosen.delete(s.id); } });
    return h('label', { class: 'check chipcheck' }, cb, h('span', {}, s.name)); }));
  const t1 = h('select', {}, options([['', 'Sin plantilla'], ...TEMPLATES.map((t) => [t.id, `${t.name} (${t.minutes} min)`])], b?.templates?.[0] || ''));
  const t2 = h('select', {}, options([['', 'Ninguna'], ...TEMPLATES.map((t) => [t.id, `${t.name} (${t.minutes} min)`])], b?.templates?.[1] || ''));
  const text = h('input', { type: 'text', maxlength: 200, value: b?.note || '', placeholder: 'Opcional: objetivo del bloque' });
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  openSheet({
    title: b ? 'Editar bloque' : 'Nuevo bloque',
    body: h('div', { class: 'stack' }, field('Nombre', name), h('div', { class: 'grid' }, field('Empieza', start), field('Duración', weeks)),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Enfoque (habilidades)'), focus),
      h('div', { class: 'grid' }, field('Plantilla', t1), field('Alternar con', t2, 'Si eliges dos, los entrenamientos se alternan.')), field('Objetivo', text), err),
    actions: [{ label: 'Cancelar' },
      b ? { label: 'Borrar bloque', kind: 'danger', onClick: async () => { if (!(await confirmSheet({ title: '¿Borrar este bloque?', text: 'Los entrenamientos que ya creó se quedan.', ok: 'Borrar', danger: true }))) return false; save(plan().filter((x) => x.id !== b.id)); toast('Bloque borrado'); return true; } } : null,
      { label: 'Guardar', kind: 'primary', onClick: () => {
        if (!name.value.trim()) { err.textContent = 'Ponle nombre al bloque.'; err.hidden = false; return false; }
        if (!start.value) { err.textContent = 'Elige la fecha de inicio.'; err.hidden = false; return false; }
        const row = { id: b?.id || uid().slice(0, 8), name: name.value.trim(), start: start.value, weeks: Number(weeks.value), focus: [...chosen], templates: [t1.value, t2.value].filter(Boolean), note: text.value.trim() };
        save([...plan().filter((x) => x.id !== row.id), row]); toast('Bloque guardado'); return true;
      } }].filter(Boolean),
  });
}

// Una temporada sugerida de 16 semanas para empezar (se puede editar todo).
function suggest() {
  let s = addDays(weekStart(todayStr()), 7);
  const B = (name, weeks, focus, templates, note) => { const b = { id: uid().slice(0, 8), name, start: s, weeks, focus, templates, note }; s = addDays(s, weeks * 7); return b; };
  save([
    B('Fundamentos', 4, ['saque', 'recepcion', 'colocacion'], ['t-saque-recepcion-90', 't-rally-90'], 'Técnica estable de saque, recepción y colocación.'),
    B('Ataque y bloqueo', 4, ['remate', 'bloqueo'], ['t-colocacion-ataque-90', 't-defensa-bloqueo-90'], 'Aproximación, remate y bloqueo en pareja.'),
    B('Sistema y transición', 4, ['defensa', 'juego'], ['t-sistema-90', 't-defensa-bloqueo-90'], 'Defensa por zonas y paso de defensa a ataque.'),
    B('Competencia', 4, ['juego', 'saque'], ['t-situacional-90', 't-saque-recepcion-90'], 'Juego situacional, side-out y saque con intención.'),
  ]);
  toast('Temporada sugerida creada. Ajusta lo que quieras.');
}

export default function temporada(ctx) {
  const list = plan(), st = settings(), t = todayStr();
  const sessFor = (b) => state.data.sessions.filter((s) => s.session_date >= b.start && s.session_date <= endOf(b));
  const el = h('div', { class: 'page' },
    h('p', { style: { margin: 0 } }, `Divide la temporada en bloques de 3 o 4 semanas con un enfoque. Cada bloque crea los entrenamientos en tus días (${(st.days || []).map((d) => DAYS_LONG[d]).join(', ') || 'sin días elegidos'}) con las plantillas que elijas; después ajustas cada uno.`),
    h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: () => blockSheet() }, ic('plus', 18), 'Nuevo bloque'),
      !list.length ? h('button', { class: 'btn', type: 'button', onclick: suggest }, ic('lightbulb', 18), 'Sugerir una temporada') : null),
    list.length ? h('div', { class: 'stack' }, list.map((b, i) => {
      const end = endOf(b), now = b.start <= t && t <= end, ss = sessFor(b);
      const pending = blockDates(b, st.days || []).filter((d) => !state.data.sessions.some((s) => s.session_date === d)).length;
      const done = ss.filter((s) => s.status === 'hecha').length;
      return h('section', { class: `panel stack block-card ${now ? 'now' : ''}` },
        h('div', { class: 'split' }, h('div', {}, h('span', { class: 'row-sub' }, `Bloque ${i + 1} · ${fmtDate(b.start, { day: 'numeric', month: 'short' })} al ${fmtDate(end, { day: 'numeric', month: 'short' })}`), h('h3', {}, b.name)),
          now ? h('span', { class: 'chip ball' }, 'Esta semana') : end < t ? h('span', { class: 'chip ok' }, 'Terminado') : null),
        b.note ? h('p', { style: { margin: 0 } }, b.note) : null,
        h('div', { class: 'cluster' }, (b.focus || []).map((k) => h('span', { class: 'chip info' }, SKILL_BY_ID[k]?.name || k)),
          (b.templates || []).map((id) => h('span', { class: 'chip' }, TEMPLATE_BY_ID[id]?.name || id))),
        h('p', { class: 'row-sub', style: { margin: 0 } }, `${plural(ss.length, 'entrenamiento', 'entrenamientos')} en estas fechas, ${done} ${done === 1 ? 'hecho' : 'hechos'}${pending ? `; faltan ${pending} por crear` : ''}.`),
        h('div', { class: 'cluster' },
          pending ? h('button', { class: 'btn primary sm', type: 'button', onclick: () => generate(b) }, ic('calendar-days', 16), `Crear ${plural(pending, 'entrenamiento', 'entrenamientos')}`) : null,
          h('button', { class: 'btn sm', type: 'button', onclick: () => blockSheet(b) }, ic('pencil', 16), 'Editar')));
    })) : empty('Sin plan de temporada', 'Crea tu primer bloque o pide una temporada sugerida de 16 semanas.'),
    note('Los bloques de 3 o 4 semanas con un enfoque son una propuesta de Remate. Al cerrar cada bloque, revisa evaluaciones y estadística para decidir el siguiente.'));
  return { title: 'Temporada', sub: 'Planeador por bloques', back: '#/sesiones', el };
}

// Bloque actual (para mostrarlo en Entrenamientos y en Hoy).
export function currentBlock() {
  const t = todayStr();
  return plan().find((b) => b.start <= t && t <= endOf(b)) || null;
}
