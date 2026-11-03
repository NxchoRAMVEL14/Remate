// Editor de rutina (v3.13): personalizar los días y ejercicios de una rutina de gym (Gym de menores y Remate Fit).
// También el buscador de ejercicios que usan el editor y el registro de una sesión (para agregar uno en el momento).
import { h, ic, toast, openSheet, confirmSheet } from '../util.js';
import { field, options, note } from './ui.js';

const clone = (x) => JSON.parse(JSON.stringify(x));
const LET = 'ABCDEFG';
// Grupo de un ejercicio para el buscador, a partir de la zona del cuerpo que trabaja.
export function exGroup(ex) {
  const b = ex.body || '', p = ex.pat || '';
  if (['salto', 'lanzamiento', 'lateral', 'pow', 'sprint'].includes(p) || ex.unit === 'saltos') return 'Saltos y potencia';
  if (/^Pecho|^Hombro, pecho/.test(b)) return 'Pecho';
  if (/^Espalda/.test(b)) return 'Espalda';
  if (/^(Hombro|Manguito|Serrato)/.test(b)) return 'Hombro';
  if (/^(Bíceps|Tríceps)/.test(b)) return 'Brazos';
  if (/^(Abdomen|Costados|Tronco)/.test(b)) return 'Tronco y abdomen';
  return 'Pierna y glúteo';
}
export const GROUP_ORDER = ['Pecho', 'Espalda', 'Hombro', 'Brazos', 'Pierna y glúteo', 'Tronco y abdomen', 'Saltos y potencia'];
const restText = (s) => (s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s / 60} min`);
export const rxLine = (rx, ex) => [`${rx.sets} × ${rx.reps}${ex?.side ? ' por lado' : ''}`, rx.rir != null ? (rx.rir === 0 ? 'al fallo técnico' : `te sobran ${rx.rir}`) : null, `descanso ${restText(rx.rest)}`].filter(Boolean).join(' · ');

// Buscador de ejercicios: lib = { list: [ejercicios], byId }. exclude: ids que ya están.
export function pickExercise({ lib, title = 'Agregar ejercicio', exclude = [], onPick }) {
  const st = { q: '', g: '' };
  const listEl = h('div', { class: 'rows ed-pick' });
  const q = h('input', { type: 'search', placeholder: 'Buscar: press, sentadilla, bíceps…', 'aria-label': 'Buscar ejercicio' });
  const seg = h('div', { class: 'cluster' });
  const paintSeg = () => seg.replaceChildren(...[['', 'Todos'], ...GROUP_ORDER.map((g) => [g, g])].map(([k, t]) => h('button', { type: 'button', class: 'chipbtn', 'aria-pressed': st.g === k ? 'true' : 'false', onclick: () => { st.g = k; paintSeg(); paint(); } }, t)));
  let sheet;
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const paint = () => {
    const s = norm(st.q.trim());
    const xs = lib.list.filter((e) => (!st.g || exGroup(e) === st.g) && (!s || norm(`${e.name} ${e.body}`).includes(s)));
    listEl.replaceChildren(...(xs.length ? xs.slice(0, 80).map((e) => h('button', { type: 'button', class: 'row', disabled: exclude.includes(e.id) ? true : null, onclick: () => { onPick(e.id); sheet?.close(); } },
      h('span', { class: 'row-main' }, h('strong', {}, e.name), h('span', { class: 'row-sub' }, exclude.includes(e.id) ? 'Ya está' : `${exGroup(e)} · ${e.body}`)), ic('plus', 18)))
      : [h('p', { class: 'row-sub' }, 'Ningún ejercicio con eso.')]));
  };
  q.addEventListener('input', () => { st.q = q.value; paint(); });
  paintSeg(); paint();
  sheet = openSheet({ title, body: h('div', { class: 'stack' }, q, seg, listEl) });
}

// Cambiar series, repeticiones, descanso y «te sobran» de un ejercicio.
function rxSheet(rx, ex, onDone) {
  const sets = h('select', {}, options([1, 2, 3, 4, 5, 6, 7, 8].map((n) => [n, String(n)]), rx.sets));
  const reps = h('input', { type: 'text', maxlength: 12, value: rx.reps, placeholder: '8-10, 12 o 30 s' });
  const rest = h('select', {}, options([0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map((n) => [n, n ? restText(n) : 'Sin descanso']), [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300].includes(rx.rest) ? rx.rest : 60));
  const rir = h('select', {}, options([['', 'No aplica'], [0, '0 (al fallo técnico)'], [1, '1'], [2, '2'], [3, '3'], [4, '4']], rx.rir ?? ''));
  openSheet({ title: ex?.name || 'Ejercicio', body: h('div', { class: 'stack' },
    h('div', { class: 'grid' }, field('Series', sets), field(ex?.unit === 's' ? 'Segundos (ej. 30 s)' : 'Repeticiones', reps, 'Un número o un rango, como 8-10.')),
    h('div', { class: 'grid' }, field('Descanso', rest), field('Te sobran', rir, 'Repeticiones que podrías hacer de más al terminar.'))),
  actions: [{ label: 'Cancelar' }, { label: 'Listo', kind: 'primary', onClick: () => {
    if (!reps.value.trim()) { toast('Escribe las repeticiones'); return false; }
    Object.assign(rx, { sets: Number(sets.value), reps: reps.value.trim().slice(0, 12), rest: Number(rest.value), rir: rir.value === '' ? null : Number(rir.value) });
    onDone(); return true;
  } }] });
}

// Página del editor. days: los días de la rutina actual [{ name, items:[rx] }]. lib = { list, byId, defaultRx(id) }.
// onSave(custom) guarda; onReset() vuelve a la automática (solo si ya estaba personalizada).
export function editorPage(ctx, { title, back, days, lib, onSave, onReset, custom }) {
  const ui = ctx.ui;
  if (!ui.ed) ui.ed = clone(days.map((d) => ({ name: d.name, items: d.items.map(({ ex, role, sets, reps, rir, rest, pat }) => ({ ex, role, sets, reps, rir, rest, pat })) })));
  const D = ui.ed;
  const box = h('div', { class: 'stack' });
  const paint = () => box.replaceChildren(...D.map((d, i) => h('section', { class: 'panel stack ed-day' },
    h('div', { class: 'split' }, h('h3', {}, `Día ${LET[i]}`),
      h('span', { class: 'cluster' },
        i > 0 ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Subir el día ${LET[i]}`, onclick: () => { [D[i - 1], D[i]] = [D[i], D[i - 1]]; paint(); } }, ic('arrow-up', 18)) : null,
        D.length > 1 ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Quitar el día ${LET[i]}`, onclick: async () => { if (await confirmSheet({ title: `¿Quitar el día ${LET[i]}?`, text: d.name, ok: 'Quitar', danger: true })) { D.splice(i, 1); paint(); } } }, ic('trash-2', 18)) : null)),
    field('Nombre del día', h('input', { type: 'text', maxlength: 40, value: d.name, placeholder: 'Por ejemplo: Pecho y hombro', oninput: (e) => { d.name = e.target.value; } })),
    d.items.length ? h('div', { class: 'rows' }, d.items.map((rx, k) => {
      const ex = lib.byId[rx.ex];
      return h('div', { class: 'row ed-item' },
        h('span', { class: 'gx-n', 'aria-hidden': 'true' }, String(k + 1)),
        h('button', { type: 'button', class: 'row-main ed-open', onclick: () => rxSheet(rx, ex, paint) }, h('strong', {}, ex?.name || rx.ex), h('span', { class: 'row-sub' }, rxLine(rx, ex))),
        h('span', { class: 'ed-ctl' },
          k > 0 ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Subir ${ex?.name}`, onclick: () => { [d.items[k - 1], d.items[k]] = [d.items[k], d.items[k - 1]]; paint(); } }, ic('arrow-up', 16)) : null,
          h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Cambiar ${ex?.name} por otro`, onclick: () => pickExercise({ lib, title: `Cambiar ${ex?.name || 'ejercicio'} por…`, exclude: d.items.map((x) => x.ex), onPick: (id) => { d.items[k] = { ...lib.defaultRx(id), sets: rx.sets }; paint(); } }) }, ic('refresh-cw', 16)),
          h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Quitar ${ex?.name}`, onclick: () => { d.items.splice(k, 1); paint(); } }, ic('x', 16))));
    })) : h('p', { class: 'row-sub', style: { margin: 0 } }, 'Este día no tiene ejercicios.'),
    h('button', { type: 'button', class: 'btn sm', onclick: () => pickExercise({ lib, exclude: d.items.map((x) => x.ex), onPick: (id) => { d.items.push(lib.defaultRx(id)); paint(); } }) }, ic('plus', 16), 'Agregar ejercicio'))));
  paint();
  const save = () => {
    const out = D.map((d, i) => ({ name: (d.name || '').trim() || `Día ${LET[i]}`, items: d.items })).filter((d) => d.items.length);
    if (!out.length) { toast('Deja por lo menos un día con un ejercicio'); return; }
    onSave(out); ui.ed = null;
  };
  const el = h('div', { class: 'page fit' },
    note('Toca un ejercicio para cambiar sus series, repeticiones y descanso. Con ⟳ lo cambias por otro; con ✕ lo quitas.'),
    box,
    D.length < 7 ? h('button', { type: 'button', class: 'btn', onclick: () => { D.push({ name: '', items: [] }); paint(); setTimeout(() => box.lastElementChild?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50); } }, ic('plus', 18), 'Agregar un día') : null,
    h('div', { class: 'cluster' },
      h('button', { type: 'button', class: 'btn primary', disabled: ctx.readonly ? true : null, onclick: save }, ic('check', 18), 'Guardar mi rutina'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { ui.ed = null; location.hash = back; } }, 'Cancelar')),
    custom && onReset ? h('button', { type: 'button', class: 'btn ghost', onclick: async () => {
      if (await confirmSheet({ title: '¿Volver a la rutina de Remate?', text: 'Se borran tus cambios y Remate arma otra vez la rutina con tu objetivo, días y lugar.', ok: 'Volver a la de Remate', danger: true })) { ui.ed = null; onReset(); }
    } }, ic('rotate-ccw', 18), 'Volver a la de Remate') : null);
  return { title, sub: 'Personalizar', back, el };
}
