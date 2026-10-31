// Detalle de un ejercicio: diagrama, organización, pasos, progresiones, puntos clave y cómo medirlo.
import { h, ic, toast, openSheet, confirmSheet, relDay, todayStr, isUrl, ytId } from '../util.js';
import { state, sessions, patch, remove, settings, saveSettings } from '../store.js';
import { SKILL_BY_ID } from '../content/skills.js';
import { getExercise, KINDS, MATERIAL, levelLabel } from '../content/exercises.js';
import { courtSVG } from '../court.js';
import { empty, note, field } from './ui.js';
import { customExerciseSheet } from './sheets-session.js';

const chip = (t, cls = '') => h('span', { class: `chip ${cls}` }, t);

export function exerciseDetail(ex) {
  const sec = (title, node) => (node ? h('section', {}, h('h3', {}, title), node) : null);
  const p = (t) => (t ? h('p', { style: { margin: 0 } }, t) : null);
  const list = (tag, arr) => (arr?.length ? h(tag, {}, arr.map((x) => h('li', {}, x))) : null);
  return h('div', { class: 'ex-body' },
    h('div', { class: 'ex-meta' }, chip(`${ex.min} min`, 'ball'), chip(levelLabel(ex), 'info'), chip(KINDS[ex.kind] || ex.kind),
      ex.players && ex.players !== '—' ? chip(`${ex.players} jugadores`) : null,
      ex.skills.map((k) => chip(SKILL_BY_ID[k]?.name || k)), ex.material.map((m) => chip(MATERIAL[m] || m)), ex.custom ? chip('Propio', 'ok') : null),
    ex.diagram ? h('figure', { class: 'court-wrap', style: { margin: 0 } }, h('div', { html: courtSVG(ex.diagram, `Diagrama de ${ex.name}`) }),
      h('figcaption', {}, 'Cancha vista desde tu lado de la red. Círculos: jugadores. Flecha blanca: movimiento. Flecha amarilla: balón. Punteada coral: salto. Triángulos: conos.')) : null,
    sec('Objetivo', p(ex.goal)),
    sec('Organización', p(ex.setup)),
    sec('Cómo se hace', list('ol', ex.how)),
    ex.easier || ex.harder ? h('div', { class: 'versus' },
      ex.easier ? h('div', {}, h('h3', {}, 'Más fácil'), p(ex.easier)) : null, ex.harder ? h('div', {}, h('h3', {}, 'Más difícil'), p(ex.harder)) : null) : null,
    sec('Puntos clave', list('ul', ex.cues)),
    sec('Errores comunes', list('ul', ex.errors)),
    sec('Cómo saber si salió bien', p(ex.measure)),
    ex.safety ? note(`Seguridad: ${ex.safety}`, 'warn') : null);
}

export function exerciseSheet(ex) {
  return openSheet({ title: ex.name, body: exerciseDetail(ex), actions: [{ label: 'Cerrar', kind: 'primary' }] });
}

// Agrega el ejercicio al plan de un entrenamiento por venir.
export function addToSessionSheet(ex) {
  const t = todayStr();
  const list = sessions().filter((s) => s.status === 'planeada' && s.session_date >= t).slice(0, 12);
  openSheet({
    title: 'Agregar a un entrenamiento',
    body: list.length
      ? h('div', { class: 'rows' }, list.map((s) => h('button', { type: 'button', class: 'row', onclick: (e) => {
        patch('sessions', s.id, { plan: [...(s.plan || []), { ex: ex.id, min: ex.min, note: '' }] });
        toast(`Agregado a ${s.title || 'el entrenamiento'} (${relDay(s.session_date)})`); e.target.closest('dialog')?.querySelector('[aria-label="Cerrar"]')?.click();
      } }, h('span', { class: 'row-main' }, h('strong', {}, s.title || 'Entrenamiento'), h('span', { class: 'row-sub' }, `${relDay(s.session_date)}, ${(s.plan || []).length} bloques`)), h('span', { class: 'row-end' }, ic('plus', 18)))))
      : note('No hay entrenamientos por venir. Crea uno en la sección Entrenamientos y vuelve aquí.'),
    actions: [{ label: 'Cerrar' }],
  });
}

// Video de un ejercicio: los propios lo guardan en su ficha; los de Remate, en los ajustes del equipo.
const exVideo = (ex) => (ex.custom ? ex.video : settings().ex_videos?.[ex.id]) || '';
function videoExSheet(ex) {
  const url = h('input', { type: 'url', inputmode: 'url', value: exVideo(ex), placeholder: 'https://youtu.be/...' });
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  const saveUrl = (v) => {
    if (ex.custom) { const row = state.data.customEx.find((r) => r.id === ex.dbId); if (row) patch('customEx', ex.dbId, { data: { ...row.data, video: v } }); }
    else { const all = { ...(settings().ex_videos || {}) }; if (v) all[ex.id] = v; else delete all[ex.id]; saveSettings({ ex_videos: all }); }
  };
  openSheet({ title: 'Video del ejercicio', body: h('div', { class: 'stack' }, field('Enlace de YouTube o Google Drive', url, 'Tus jugadores también lo ven. Puede ser tuyo o de un canal que te guste.'), err),
    actions: [{ label: 'Cancelar' }, exVideo(ex) ? { label: 'Quitar', kind: 'danger', onClick: () => { saveUrl(''); toast('Video quitado'); } } : null,
      { label: 'Guardar', kind: 'primary', onClick: () => { if (!isUrl(url.value)) { err.textContent = 'Pega un enlace que empiece con https://'; err.hidden = false; return false; } saveUrl(url.value.trim()); toast('Video guardado'); return true; } }].filter(Boolean) });
}

export default function ejercicio(ctx) {
  let ex = getExercise(ctx.args[0], state.data.customEx);
  if (ex?.lab && ctx.role !== 'coach') ex = null;                       // los del laboratorio son solo del entrenador
  const back = ex?.lab ? '#/lab/salto/programa' : '#/ejercicios';
  if (!ex) return { title: 'Ejercicio', back: '#/ejercicios', el: h('div', { class: 'page' }, empty('No encontré ese ejercicio', 'Puede que se haya borrado.', h('a', { class: 'btn', href: '#/ejercicios' }, 'Ver ejercicios'))) };
  const coach = ctx.role === 'coach';
  const tools = coach && !ex.lab ? h('div', { class: 'cluster' },
    h('button', { class: 'btn primary', type: 'button', onclick: () => addToSessionSheet(ex) }, ic('plus', 18), 'Agregar a un entrenamiento'),
    ex.custom ? h('button', { class: 'btn', type: 'button', onclick: () => customExerciseSheet(ex) }, ic('pencil', 18), 'Editar') : null,
    ex.custom ? h('button', { class: 'btn danger', type: 'button', onclick: async () => {
      if (await confirmSheet({ title: '¿Borrar este ejercicio?', text: 'Si está en algún plan, ese bloque quedará sin ejercicio.', ok: 'Borrar', danger: true })) { remove('customEx', ex.dbId); toast('Ejercicio borrado'); location.hash = '#/ejercicios'; }
    } }, ic('trash-2', 18), 'Borrar') : null) : null;
  const vid = exVideo(ex);
  const video = vid || (coach && !ex.lab) ? h('div', { class: 'cluster' },
    vid ? h('a', { class: 'btn ball', href: vid, target: '_blank', rel: 'noopener' }, ic('video', 18), ytId(vid) ? 'Ver video en YouTube' : 'Ver video') : null,
    coach && !ex.lab ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => videoExSheet(ex) }, ic(vid ? 'pencil' : 'plus', 16), vid ? 'Cambiar video' : 'Agregar video') : null) : null;
  return { title: ex.name, back, el: h('div', { class: 'page' }, ex.lab ? note('Ejercicio de tu laboratorio de salto. Tus jugadores no lo ven.') : null, tools, video, exerciseDetail(ex)) };
}
