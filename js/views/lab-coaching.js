// Coaching: bitácora del entrenador, autoevaluación mensual y caja de herramientas.
import { h, ic, toast, openSheet, confirmSheet, fmtDate, todayStr, diffDays, plural } from '../util.js';
import { state, add, patch, remove, sessions, labReady } from '../store.js';
import { ASSESS, TOOLBOX, CLIMATE, LOG_KINDS } from '../content/coaching.js';
import { sectionTitle, note, empty, field, options, dots } from './ui.js';

const TABS = [['bitacora', 'Bitácora'], ['autoeval', 'Autoevaluación'], ['herramientas', 'Herramientas']];
const byDate = (k) => (a, b) => `${b[k]}${b.created_at}`.localeCompare(`${a[k]}${a.created_at}`);
const short = (s, n = 90) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s || '');

export default function labCoaching(ctx) {
  const ui = ctx.ui;
  if (!ui.init) { ui.init = true; if (TABS.some(([id]) => id === ctx.args[1])) ui.tab = ctx.args[1]; }
  ui.tab = ui.tab || 'bitacora';
  const ro = !labReady();
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([id, label]) =>
    h('button', { type: 'button', role: 'tab', 'aria-selected': ui.tab === id ? 'true' : 'false', onclick: () => { ui.tab = id; ctx.rerender(); } }, label)));
  const body = ui.tab === 'autoeval' ? autoeval(ro) : ui.tab === 'herramientas' ? herramientas() : bitacora(ro);
  return { title: 'Coaching', sub: 'Solo tú lo ves', back: '#/lab', el: h('div', { class: 'page' }, tabs, body) };
}

// ---------- Bitácora ----------
export function coachLogSheet(log = null, prefill = {}) {
  const v = { ...prefill, ...(log || {}) };
  const date = h('input', { type: 'date', max: todayStr(), value: v.log_date || todayStr() });
  const kind = h('select', {}, options(Object.entries(LOG_KINDS), v.kind || 'entrenamiento'));
  const done = sessions().filter((s) => s.status === 'hecha').reverse().slice(0, 20);
  const matches = state.data.matches.slice().sort(byDate('match_date')).slice(0, 20);
  const sess = h('select', {}, options([['', 'Ninguno'], ...done.map((s) => [s.id, `${fmtDate(s.session_date)}: ${s.title || 'Entrenamiento'}`])], v.session_id || ''));
  const match = h('select', {}, options([['', 'Ninguno'], ...matches.map((m) => [m.id, `${fmtDate(m.match_date)}: contra ${m.rival}`])], v.match_id || ''));
  const sessRow = field('¿De qué entrenamiento?', sess), matchRow = field('¿De qué partido?', match);
  let climate = v.climate || null;
  const clim = h('div', { class: 'seg', role: 'group', 'aria-label': 'Clima del grupo' });
  const drawClim = () => clim.replaceChildren(...Object.entries(CLIMATE).map(([k, t]) =>
    h('button', { type: 'button', 'aria-pressed': String(climate) === k ? 'true' : 'false', title: t, onclick: () => { climate = Number(k); drawClim(); } }, k)));
  drawClim();
  const worked = h('textarea', { rows: 3, maxlength: 1000, placeholder: 'El juego reducido 3 contra 3 los tuvo muy activos...' }, v.worked || '');
  const change = h('textarea', { rows: 3, maxlength: 1000, placeholder: 'Expliqué demasiado al inicio; la próxima, menos de 30 segundos...' }, v.change || '');
  const text = h('textarea', { rows: 2, maxlength: 1000, placeholder: 'Opcional' }, v.note || '');
  const sync = () => { sessRow.hidden = kind.value !== 'entrenamiento'; matchRow.hidden = kind.value !== 'partido'; };
  kind.addEventListener('change', sync); sync();
  openSheet({
    title: log ? 'Editar entrada' : 'Nueva entrada de bitácora',
    body: h('div', { class: 'stack' },
      h('div', { class: 'grid' }, field('Fecha', date), field('Tipo', kind)), sessRow, matchRow,
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Clima del grupo (1 muy tenso, 5 excelente)'), clim),
      field('¿Qué funcionó?', worked), field('¿Qué cambiarías la próxima vez?', change), field('Nota', text)),
    actions: [
      { label: 'Cancelar' },
      log ? { label: 'Borrar', kind: 'danger', onClick: async () => { if (!(await confirmSheet({ title: '¿Borrar esta entrada?', text: 'No se puede deshacer.', ok: 'Borrar', danger: true }))) return false; remove('coachLogs', log.id); toast('Entrada borrada'); return true; } } : null,
      { label: 'Guardar', kind: 'primary', onClick: () => {
        const row = { log_date: date.value || todayStr(), kind: kind.value, climate, worked: worked.value.trim(), change: change.value.trim(), note: text.value.trim(),
          session_id: kind.value === 'entrenamiento' ? sess.value || null : null, match_id: kind.value === 'partido' ? match.value || null : null };
        if (log) patch('coachLogs', log.id, row); else add('coachLogs', row);
        toast('Bitácora guardada'); return true;
      } },
    ].filter(Boolean),
  });
}

function bitacora(ro) {
  const logs = state.data.coachLogs.slice().sort(byDate('log_date'));
  const t = todayStr();
  const recent = logs.filter((l) => diffDays(t, l.log_date) <= 30);
  const withClimate = recent.filter((l) => l.climate);
  const lastDone = sessions().filter((s) => s.status === 'hecha').pop();
  const pendingLog = lastDone && !logs.some((l) => l.session_id === lastDone.id) ? lastDone : null;
  return h('div', { class: 'stack' },
    ro ? null : h('div', { class: 'cluster' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => coachLogSheet() }, ic('notebook-pen', 18), 'Nueva entrada'),
      pendingLog ? h('button', { class: 'btn', type: 'button', onclick: () => coachLogSheet(null, { kind: 'entrenamiento', session_id: pendingLog.id, log_date: pendingLog.session_date }) },
        ic('pencil', 18), `Escribir sobre el entreno del ${fmtDate(pendingLog.session_date, { day: 'numeric', month: 'short' })}`) : null),
    logs.length ? h('div', { class: 'kpis' },
      h('div', { class: 'kpi' }, h('span', { class: 'n' }, String(recent.length)), h('span', { class: 'l' }, 'Entradas en 30 días')),
      h('div', { class: 'kpi' }, h('span', { class: 'n' }, withClimate.length ? (withClimate.reduce((a, l) => a + l.climate, 0) / withClimate.length).toFixed(1) : '—'), h('span', { class: 'l' }, 'Clima promedio (1 a 5)')),
      h('div', { class: 'kpi' }, h('span', { class: 'n' }, String(logs.length)), h('span', { class: 'l' }, 'Entradas en total'))) : null,
    logs.length ? h('div', { class: 'rows' }, logs.map((l) => {
      const s = l.session_id ? state.data.sessions.find((x) => x.id === l.session_id) : null, m = l.match_id ? state.data.matches.find((x) => x.id === l.match_id) : null;
      return h(ro ? 'div' : 'button', { type: ro ? null : 'button', class: 'row', onclick: ro ? null : () => coachLogSheet(l) },
        h('span', { class: 'row-main' }, h('strong', {}, `${fmtDate(l.log_date)}: ${m ? `partido contra ${m.rival}` : s ? s.title || 'Entrenamiento' : LOG_KINDS[l.kind]}`),
          l.worked ? h('span', { class: 'row-sub' }, `Funcionó: ${short(l.worked)}`) : null,
          l.change ? h('span', { class: 'row-sub' }, `Cambiaría: ${short(l.change)}`) : null),
        h('span', { class: 'row-end' }, l.climate ? h('span', { class: `chip ${l.climate >= 4 ? 'ok' : l.climate <= 2 ? 'warn' : ''}`, title: 'Clima del grupo' }, `Clima ${l.climate}`) : null));
    })) : empty('Tu bitácora está vacía', 'Dos minutos después de cada entrenamiento: qué funcionó y qué cambiarías. Es la forma más sencilla de mejorar como entrenador, porque te obliga a revisar lo que hiciste.'),
    note('Tu bitácora es privada: tus jugadores no la ven.'));
}

// ---------- Autoevaluación ----------
function assessSheet(prev) {
  const scores = { ...(prev?.scores || {}) };
  const rows = ASSESS.map((a) => {
    const desc = h('span', { class: 'hint' });
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': a.name });
    const draw = () => {
      seg.replaceChildren(...[1, 2, 3, 4].map((n) => h('button', { type: 'button', 'aria-pressed': scores[a.id] === n ? 'true' : 'false', onclick: () => { scores[a.id] = n; draw(); } }, String(n))));
      desc.textContent = scores[a.id] ? a.lv[scores[a.id] - 1] : 'Elige de 1 a 4.';
    };
    draw();
    return h('div', { class: 'field' }, h('span', { class: 'label' }, a.name), h('span', { class: 'hint' }, a.q), seg, desc);
  });
  const goal = h('input', { type: 'text', maxlength: 300, placeholder: 'Por ejemplo: explicar en menos de 30 segundos', value: '' });
  const text = h('textarea', { rows: 2, maxlength: 1000, placeholder: 'Opcional' });
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  openSheet({
    title: 'Autoevaluación del mes',
    body: h('div', { class: 'stack' }, note('Sé honesto: nadie más lo ve. 1 es "apenas empiezo" y 4 es "lo hago siempre y bien".'), ...rows,
      field('Tu foco para este mes (uno solo)', goal), field('Nota', text), err),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      if (Object.keys(scores).length < ASSESS.length) { err.textContent = `Te faltan ${ASSESS.length - Object.keys(scores).length} aspectos por calificar.`; err.hidden = false; return false; }
      add('coachAssess', { scores, goal: goal.value.trim(), note: text.value.trim(), assessed_on: todayStr() });
      toast('Autoevaluación guardada'); return true;
    } }],
  });
}

function autoeval(ro) {
  const list = state.data.coachAssess.slice().sort(byDate('assessed_on'));
  const [last, prev] = list;
  const tools = ro ? null : h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: () => assessSheet(last) }, ic('clipboard-check', 18), last ? 'Nueva autoevaluación' : 'Hacer mi autoevaluación'));
  if (!last) return h('div', { class: 'stack' }, tools, empty('Sin autoevaluaciones', `Califícate de 1 a 4 en ${ASSESS.length} aspectos del trabajo de entrenador y elige un solo foco para el mes. Repítela cada mes para ver tu avance.`));
  const lowest = ASSESS.slice().sort((a, b) => (last.scores[a.id] || 0) - (last.scores[b.id] || 0))[0];
  const days = diffDays(todayStr(), last.assessed_on);
  return h('div', { class: 'stack' }, tools,
    days > 30 ? note(`Tu última autoevaluación fue hace ${plural(days, 'día', 'días')}. Ya toca la del mes.`, 'warn') : null,
    h('section', { class: 'band next stack' },
      h('span', { class: 'when' }, `Autoevaluación del ${fmtDate(last.assessed_on, { day: 'numeric', month: 'long' })}`),
      h('h2', {}, last.goal ? `Tu foco: ${last.goal}` : 'Sin foco elegido'),
      !last.goal ? h('p', { style: { margin: 0 } }, `Sugerencia: tu punto más bajo es ${lowest.name.toLowerCase()}. Elige algo concreto de ahí.`) : null),
    h('div', { class: 'rows' }, ASSESS.map((a) => {
      const n = last.scores[a.id] || 0, p = prev?.scores?.[a.id], d = p != null ? n - p : null;
      return h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, a.name), h('span', { class: 'row-sub' }, n ? a.lv[n - 1] : 'Sin calificar')),
        h('span', { class: 'row-end' }, d ? h('span', { class: `chip ${d > 0 ? 'ok' : 'warn'}` }, `${d > 0 ? '+' : ''}${d}`) : null, dots(n)));
    })),
    list.length > 1 ? h('section', { class: 'stack' }, sectionTitle('Historial'),
      h('div', { class: 'rows' }, list.map((x) => {
        const vals = Object.values(x.scores || {}), avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
        return h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, fmtDate(x.assessed_on, { day: 'numeric', month: 'long', year: 'numeric' })), h('span', { class: 'row-sub' }, x.goal ? `Foco: ${x.goal}` : 'Sin foco')),
          h('span', { class: 'row-end' }, h('span', { class: 'chip' }, `Promedio ${avg}`)));
      }))) : null);
}

// ---------- Herramientas ----------
function herramientas() {
  return h('div', { class: 'stack' },
    TOOLBOX.map((t, i) => h('details', { class: 'panel', open: i === 0 ? true : null }, h('summary', {}, h('strong', {}, t.title)),
      h('ul', { class: 'plain', style: { marginTop: '10px' } }, t.items.map((x) => h('li', {}, x))))),
    note('Estas guías son una propuesta de Remate basada en principios generales del aprendizaje motor y del trabajo con adolescentes. Las reglas de juego vienen del reglamento oficial de la FIVB; las fuentes completas están en Ayuda.'),
    h('a', { class: 'btn ghost', href: '#/ayuda' }, ic('circle-help', 18), 'Ver fuentes en Ayuda'));
}
