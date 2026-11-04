// Editor de rutina (v3.13): personalizar los días y ejercicios de una rutina de gym (Gym de menores y Remate Fit).
// También el buscador de ejercicios que usan el editor y el registro de una sesión (para agregar uno en el momento).
import { h, ic, toast, openSheet, confirmSheet } from '../util.js';
import { field, options, note } from './ui.js';
import { ALIAS, NEED_WORDS, MUS, MUS_BY } from '../content/musculos.js';

const clone = (x) => JSON.parse(JSON.stringify(x));
const LET = 'ABCDEFG';
// Grupo de un ejercicio para el buscador, a partir de la zona del cuerpo que trabaja.
export function exGroup(ex) {
  const b = ex.body || '', p = ex.pat || '';
  if (['salto', 'lanzamiento', 'pow', 'sprint'].includes(p) || ex.unit === 'saltos' || (p === 'lateral' && ex.id.startsWith('g-'))) return 'Saltos y potencia';
  if (/^Pecho|^Hombro, pecho/.test(b)) return 'Pecho';
  if (/^Espalda/.test(b)) return 'Espalda';
  if (/^(Hombro|Manguito|Serrato)/.test(b)) return 'Hombro';
  if (/^(Bíceps|Tríceps)/.test(b)) return 'Brazos';
  if (/^Trapecio/.test(b)) return 'Hombro';
  if (/^(Abdomen|Costados|Tronco)/.test(b)) return 'Tronco y abdomen';
  return 'Pierna y glúteo';
}
export const GROUP_ORDER = ['Pecho', 'Espalda', 'Hombro', 'Brazos', 'Pierna y glúteo', 'Tronco y abdomen', 'Saltos y potencia'];
const restText = (s) => (s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s / 60} min`);
export const rxLine = (rx, ex) => [`${rx.sets} × ${rx.reps}${ex?.side ? ' por lado' : ''}`, rx.rir != null ? (rx.rir === 0 ? 'al fallo técnico' : `te sobran ${rx.rir}`) : null, `descanso ${restText(rx.rest)}`].filter(Boolean).join(' · ');

// Buscador de ejercicios: lib = { list: [ejercicios], byId, recent?: [ids], addOwn?(nombre, alListo) }. exclude: ids que ya están.
// v3.18: entiende nombres del gym («pec deck», «smith», «jalón»), palabras en cualquier orden y errores chicos;
// sin buscar, primero lo que más usas; y si no está, «Agregar mi propio ejercicio» (Remate Fit).
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
const hayOf = (e) => {
  if (!e._hay) { const t = norm(`${e.name} ${e.body || ''} ${exGroup(e)} ${NEED_WORDS[e.need] || ''} ${ALIAS[e.id] || ''} ${e.own ? 'mio propio' : ''}`); e._hay = { t, w: t.split(/[^a-z0-9]+/).filter(Boolean), n: norm(e.name) }; }
  return e._hay;
};
// Puntos de un ejercicio para lo que escribiste (0 = no sale).
export function searchScore(e, q) {
  const toks = norm(q).split(/[^a-z0-9]+/).filter(Boolean);
  if (!toks.length) return 1;
  const H = hayOf(e);
  let sc = 0;
  for (const t0 of toks) {
    const t = t0.length > 5 && t0.endsWith('es') ? t0.slice(0, -2) : t0.length > 4 && t0.endsWith('s') ? t0.slice(0, -1) : t0;
    if (H.w.includes(t0) || H.w.includes(t)) sc += 3;
    else if (H.w.some((w) => w.startsWith(t))) sc += 2;
    else if (H.t.includes(t)) sc += 1;
    else if (t.length >= 4 && H.w.some((w) => lev(t, w) <= (t.length >= 7 ? 2 : 1) || lev(t, w.slice(0, t.length)) <= (t.length >= 7 ? 2 : 1))) sc += 0.5;
    else return 0;
  }
  if (H.n.startsWith(norm(q).trim())) sc += 2;
  return sc;
}
export function pickExercise({ lib, title = 'Agregar ejercicio', exclude = [], onPick }) {
  const st = { q: '', g: '', m: false };
  const listEl = h('div', { class: 'rows ed-pick' });
  const q = h('input', { type: 'search', placeholder: 'Escribe: pec deck, jalón, smith, femoral…', 'aria-label': 'Buscar ejercicio', autocomplete: 'off' });
  const seg = h('div', { class: 'cluster' });
  const paintSeg = () => seg.replaceChildren(...[['', 'Todos'], ...GROUP_ORDER.map((g) => [g, g])].map(([k, t]) => h('button', { type: 'button', class: 'chipbtn', 'aria-pressed': st.g === k ? 'true' : 'false', onclick: () => { st.g = k; paintSeg(); paint(); } }, t)),
    h('button', { type: 'button', class: 'chipbtn', 'aria-pressed': st.m ? 'true' : 'false', onclick: () => { st.m = !st.m; paintSeg(); paint(); } }, 'Solo máquinas y poleas'));
  let sheet;
  const recent = (lib.recent || []).filter((id) => lib.byId[id]);
  const rank = new Map(recent.map((id, i) => [id, recent.length - i]));
  const row = (e) => h('button', { type: 'button', class: 'row', disabled: exclude.includes(e.id) ? true : null, onclick: () => { onPick(e.id); sheet?.close(); } },
    h('span', { class: 'row-main' }, h('strong', {}, e.name), h('span', { class: 'row-sub' }, exclude.includes(e.id) ? 'Ya está' : `${e.own ? 'Tuyo · ' : ''}${e.need === 'maquina' ? 'Máquina' : e.need === 'polea' ? 'Polea' : exGroup(e)} · ${e.body}`)), ic('plus', 18));
  const own = () => (lib.addOwn ? h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { sheet?.close(); lib.addOwn(st.q.trim(), (id) => onPick(id)); } }, ic('plus', 16), st.q.trim() ? `Agregar «${st.q.trim().slice(0, 30)}» como mi ejercicio` : 'Agregar mi propio ejercicio') : null);
  const paint = () => {
    const base = lib.list.filter((e) => (!st.m || e.need === 'maquina' || e.need === 'polea') && (!st.g || exGroup(e) === st.g));
    let xs;
    if (st.q.trim()) xs = base.map((e) => { const sc = searchScore(e, st.q); return [e, sc ? sc + (rank.get(e.id) ? 1 + rank.get(e.id) / 50 : 0) : 0]; }).filter(([, sc]) => sc > 0).sort((a, b) => b[1] - a[1]).map(([e]) => e);
    else { const r = recent.map((id) => lib.byId[id]).filter((e) => base.includes(e)); xs = [...r, ...base.filter((e) => !r.includes(e))]; }
    const nRec = !st.q.trim() ? recent.filter((id) => base.includes(lib.byId[id])).length : 0;
    listEl.replaceChildren(
      ...(nRec ? [h('p', { class: 'row-sub ed-sub' }, 'Los que más usas')] : []),
      ...(xs.length ? xs.slice(0, 90).flatMap((e, i) => (nRec && i === nRec ? [h('p', { class: 'row-sub ed-sub' }, 'Todos'), row(e)] : [row(e)]))
        : [h('p', { class: 'row-sub' }, 'Ningún ejercicio con eso.')]),
      ...(own() ? [own()] : []));
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

// Página del editor. days: los días de la rutina actual [{ name, wd?, items:[rx] }]. lib = { list, byId, defaultRx(id) }.
// onSave(custom) guarda; onReset() vuelve a la automática (solo si ya estaba personalizada).
// v3.18 (Remate Fit): weekdays = cada día va en un día de la semana; muscles = { propose(keys, exclude) } arma un día
// por músculos; templates = plantillas de semana. Para todos: copiar un día y bajar días y ejercicios.
export const WD_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WD_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];
export function editorPage(ctx, { title, back, days, lib, onSave, onReset, custom, weekdays = false, muscles = null, templates = null, week = null }) {
  const ui = ctx.ui;
  if (!ui.ed) ui.ed = clone(days.map((d) => ({ name: d.name, wd: Number.isInteger(d.wd) ? d.wd : null, mus: d.mus || [], items: d.items.map(({ ex, role, sets, reps, rir, rest, pat }) => ({ ex, role, sets, reps, rir, rest, pat })) })));
  const D = ui.ed;
  const box = h('div', { class: 'stack' });
  const weekLine = h('div', { class: 'ed-week' });
  const paintWeek = () => {
    if (!weekdays) return;
    weekLine.replaceChildren(...WD_ORDER.map((wd) => {
      const ds = D.map((d, i) => [d, i]).filter(([d]) => d.wd === wd);
      const extra = week?.(wd) || [];
      return h('div', { class: `ed-wd${ds.length ? ' on' : ''}` }, h('b', {}, WD_SHORT[wd]),
        h('span', {}, ds.length ? ds.map(([d, i]) => `${LET[i]}: ${d.name || 'sin nombre'}`).join(' · ') : extra.length ? '' : 'Descanso'),
        extra.map((x) => h('small', {}, x)));
    }));
  };
  const musSheet = (d, i) => {
    const sel = new Set(d.mus || []);
    let mode = d.items.length ? 'add' : 'new';
    const chips = h('div', { class: 'cluster' });
    const paintChips = () => chips.replaceChildren(...MUS.map(([k, name]) => h('button', { type: 'button', class: 'chipbtn', 'aria-pressed': sel.has(k) ? 'true' : 'false', onclick: () => { if (sel.has(k)) sel.delete(k); else sel.add(k); paintChips(); } }, name)));
    paintChips();
    const modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Qué hacer con los que ya hay' });
    const paintMode = () => modeSeg.replaceChildren(...[['new', 'Cambiar todos'], ['add', 'Agregar a los que hay']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': mode === k ? 'true' : 'false', onclick: () => { mode = k; paintMode(); } }, t)));
    paintMode();
    openSheet({ title: `Armar el día ${LET[i]} por músculos`, body: h('div', { class: 'stack' },
      h('p', { style: { margin: 0 } }, 'Toca los músculos que quieres trabajar, en el orden que te importan más. Remate propone los ejercicios según tus minutos y lo que hay en tu gym; luego los cambias.'),
      chips, d.items.length ? modeSeg : null),
    actions: [{ label: 'Cancelar' }, { label: 'Proponer ejercicios', kind: 'primary', onClick: () => {
      const keys = MUS.map(([k]) => k).filter((k) => sel.has(k));
      if (!keys.length) { toast('Toca por lo menos un músculo'); return false; }
      const order = [...sel].filter((k) => MUS_BY[k]);
      const keep = mode === 'add' ? d.items : [];
      const got = muscles.propose(order, keep.map((x) => x.ex));
      d.items = [...keep, ...got]; d.mus = order;
      const auto = order.map((k) => MUS_BY[k].name.toLowerCase());
      if (!d.name.trim() || d.autoName) { d.name = (auto.length > 1 ? `${auto.slice(0, -1).join(', ')} y ${auto[auto.length - 1]}` : auto[0]).replace(/^./, (c) => c.toUpperCase()).slice(0, 40); d.autoName = true; }
      paint(); toast(`${got.length} ejercicios propuestos`); return true;
    } }] });
  };
  const paint = () => { paintWeek(); box.replaceChildren(...D.map((d, i) => h('section', { class: 'panel stack ed-day' },
    h('div', { class: 'split' }, h('h3', {}, `Día ${LET[i]}`),
      h('span', { class: 'cluster' },
        i > 0 ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Subir el día ${LET[i]}`, onclick: () => { [D[i - 1], D[i]] = [D[i], D[i - 1]]; paint(); } }, ic('arrow-up', 18)) : null,
        i < D.length - 1 ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Bajar el día ${LET[i]}`, onclick: () => { [D[i + 1], D[i]] = [D[i], D[i + 1]]; paint(); } }, ic('arrow-down', 18)) : null,
        D.length < 7 ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Copiar el día ${LET[i]}`, title: 'Copiar este día', onclick: () => { D.splice(i + 1, 0, { ...clone(d), wd: null, name: `${d.name || `Día ${LET[i]}`} (copia)`.slice(0, 40) }); paint(); toast('Día copiado'); } }, ic('copy', 18)) : null,
        D.length > 1 ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Quitar el día ${LET[i]}`, onclick: async () => { if (await confirmSheet({ title: `¿Quitar el día ${LET[i]}?`, text: d.name, ok: 'Quitar', danger: true })) { D.splice(i, 1); paint(); } } }, ic('trash-2', 18)) : null)),
    h('div', { class: weekdays ? 'grid' : '' },
      field('Nombre del día', h('input', { type: 'text', maxlength: 40, value: d.name, placeholder: 'Por ejemplo: Pecho y hombro', oninput: (e) => { d.name = e.target.value; d.autoName = false; paintWeek(); } })),
      weekdays ? field('Día de la semana', h('select', { 'aria-label': `Día de la semana del día ${LET[i]}`, onchange: (e) => { d.wd = e.target.value === '' ? null : Number(e.target.value); paintWeek(); } },
        options([['', 'Sin día fijo'], ...WD_ORDER.map((w) => [w, WD_NAMES[w]])], d.wd ?? ''))) : null),
    d.items.length ? h('div', { class: 'rows' }, d.items.map((rx, k) => {
      const ex = lib.byId[rx.ex];
      return h('div', { class: 'row ed-item' },
        h('span', { class: 'gx-n', 'aria-hidden': 'true' }, String(k + 1)),
        h('button', { type: 'button', class: 'row-main ed-open', onclick: () => rxSheet(rx, ex, paint) }, h('strong', {}, ex?.name || rx.ex), h('span', { class: 'row-sub' }, rxLine(rx, ex))),
        h('span', { class: 'ed-ctl' },
          k > 0 ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Subir ${ex?.name}`, onclick: () => { [d.items[k - 1], d.items[k]] = [d.items[k], d.items[k - 1]]; paint(); } }, ic('arrow-up', 16)) : null,
          k < d.items.length - 1 ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Bajar ${ex?.name}`, onclick: () => { [d.items[k + 1], d.items[k]] = [d.items[k], d.items[k + 1]]; paint(); } }, ic('arrow-down', 16)) : null,
          h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Cambiar ${ex?.name} por otro`, onclick: () => pickExercise({ lib, title: `Cambiar ${ex?.name || 'ejercicio'} por…`, exclude: d.items.map((x) => x.ex), onPick: (id) => { d.items[k] = { ...lib.defaultRx(id), sets: rx.sets }; paint(); } }) }, ic('refresh-cw', 16)),
          h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Quitar ${ex?.name}`, onclick: () => { d.items.splice(k, 1); paint(); } }, ic('x', 16))));
    })) : h('p', { class: 'row-sub', style: { margin: 0 } }, 'Este día no tiene ejercicios.'),
    h('div', { class: 'cluster' },
      muscles ? h('button', { type: 'button', class: 'btn sm ball', onclick: () => musSheet(d, i) }, ic('sparkles', 16), 'Armar por músculos') : null,
      h('button', { type: 'button', class: 'btn sm', onclick: () => pickExercise({ lib, exclude: d.items.map((x) => x.ex), onPick: (id) => { const r = lib.defaultRx(id); if (r) d.items.push(r); paint(); } }) }, ic('plus', 16), 'Agregar ejercicio'))))); };
  paint();
  const useTemplate = () => openSheet({ title: 'Usar una plantilla', body: (close) => h('div', { class: 'stack' },
    h('p', { style: { margin: 0 } }, 'Remate arma cada día con sus músculos y te propone los ejercicios. Después cambias lo que quieras.'),
    h('div', { class: 'rows' }, templates.map((t) => h('button', { type: 'button', class: 'row', onclick: async () => {
      close();
      if (D.some((d) => d.items.length) && !(await confirmSheet({ title: `¿Usar «${t.name}»?`, text: 'Reemplaza los días que tienes aquí (todavía no se guarda hasta que toques «Guardar mi rutina»).', ok: 'Usar la plantilla' }))) return;
      const used = [];
      D.splice(0, D.length, ...t.days.map((x) => { const items = muscles.propose(x.mus, []); used.push(...items.map((it) => it.ex)); return { name: x.name, wd: weekdays ? x.wd : null, mus: [...x.mus], items }; }));
      paint(); toast('Plantilla lista: revisa y guarda');
    } }, h('span', { class: 'row-main' }, h('strong', {}, t.name), h('span', { class: 'row-sub' }, `${t.desc} ${t.days.map((x) => `${WD_SHORT[x.wd]}: ${x.name}`).join(' · ')}`)), ic('chevron-right', 18))))),
  actions: [{ label: 'Cancelar' }] });
  const save = () => {
    const out = D.map((d, i) => ({ name: (d.name || '').trim() || `Día ${LET[i]}`, wd: weekdays && Number.isInteger(d.wd) ? d.wd : null, mus: d.mus || [], items: d.items })).filter((d) => d.items.length);
    if (!out.length) { toast('Deja por lo menos un día con un ejercicio'); return; }
    onSave(out); ui.ed = null;
  };
  const el = h('div', { class: 'page fit' },
    note('Toca un ejercicio para cambiar sus series, repeticiones y descanso. Con ⟳ lo cambias por otro; con ✕ lo quitas; con las flechas lo mueves.'),
    templates && muscles ? h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn', onclick: useTemplate }, ic('layout-grid', 18), 'Usar una plantilla')) : null,
    weekdays ? h('section', { class: 'panel stack' }, h('h3', {}, 'Tu semana'), weekLine,
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Elige el día de la semana de cada día de tu rutina. Si no le pones día, Remate te propone el que sigue en orden.')) : null,
    box,
    D.length < 7 ? h('button', { type: 'button', class: 'btn', onclick: () => { D.push({ name: '', wd: null, mus: [], items: [] }); paint(); setTimeout(() => box.lastElementChild?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50); } }, ic('plus', 18), 'Agregar un día') : null,
    h('div', { class: 'cluster' },
      h('button', { type: 'button', class: 'btn primary', disabled: ctx.readonly ? true : null, onclick: save }, ic('check', 18), 'Guardar mi rutina'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { ui.ed = null; location.hash = back; } }, 'Cancelar')),
    custom && onReset ? h('button', { type: 'button', class: 'btn ghost', onclick: async () => {
      if (await confirmSheet({ title: '¿Volver a la rutina de Remate?', text: 'Se borran tus cambios y Remate arma otra vez la rutina con tu objetivo, días y lugar.', ok: 'Volver a la de Remate', danger: true })) { ui.ed = null; onReset(); }
    } }, ic('rotate-ccw', 18), 'Volver a la de Remate') : null);
  return { title, sub: 'Personalizar', back, el };
}
