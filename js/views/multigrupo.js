// Varios grupos (v3.37): por ejemplo tu equipo del CETAC y el de una telesecundaria a la que vas a dar clases.
// Cada grupo tiene sus jugadores, entrenos, partidos, torneos y ajustes (días, hora, temporada…).
// Cambias de grupo arriba en Hoy o en Ajustes → Tus grupos. No necesita SQL: la base de datos ya permite varios grupos.
import { h, ic, toast, openSheet, confirmSheet, plural } from '../util.js';
import { groupsAll, group, setActiveGroup, createGroup, allData, remove } from '../store.js';
import { field, note, sectionTitle } from './ui.js';

const countOf = (g) => (allData().players || []).filter((p) => p.group_id === g.id && p.active !== false).length;

export function switchSheet() {
  const cur = group();
  let sh;
  const body = h('div', { class: 'stack' },
    h('div', { class: 'rows' }, groupsAll().map((g) => h('button', { type: 'button', class: `row ${g.id === cur?.id ? 'on' : ''}`, onclick: () => {
      sh?.close?.(); if (g.id !== cur?.id) { setActiveGroup(g.id); toast(`Ahora ves: ${g.name}`); location.hash = '#/hoy'; } } },
      h('span', { class: 'row-main' }, h('strong', {}, g.name), h('span', { class: 'row-sub' }, plural(countOf(g), 'jugador', 'jugadores'))),
      g.id === cur?.id ? h('span', { class: 'chip ok' }, 'Activo') : ic('chevron-right', 18)))),
    h('button', { type: 'button', class: 'btn', onclick: () => { sh?.close?.(); setTimeout(newGroupSheet, 50); } }, ic('plus', 18), 'Nuevo grupo'));
  sh = openSheet({ title: 'Cambiar de grupo', body, actions: [{ label: 'Cerrar' }] });
}

export function newGroupSheet() {
  const name = h('input', { type: 'text', maxlength: 60, placeholder: 'Por ejemplo: Telesecundaria 560' });
  const copy = h('input', { type: 'checkbox', checked: true });
  openSheet({ title: 'Nuevo grupo', body: h('div', { class: 'stack' },
    field('Nombre', name),
    h('label', { class: 'check' }, copy, ` Copiar días, hora y duración de «${group()?.name || 'tu grupo'}»`),
    note('El grupo nuevo empieza vacío: sus propios jugadores, entrenos, partidos y torneos. Tu grupo actual no cambia. Cambias entre grupos arriba en Hoy.')),
  actions: [{ label: 'Cancelar' }, { label: 'Crear grupo', kind: 'primary', onClick: () => {
    const n = name.value.trim(); if (!n) { toast('Ponle un nombre'); return false; }
    if (groupsAll().some((g) => g.name.toLowerCase() === n.toLowerCase())) { toast('Ya tienes un grupo con ese nombre'); return false; }
    createGroup(n, copy.checked); toast(`Grupo «${n}» creado. Ahora agrega a sus jugadores.`); location.hash = '#/jugadores';
  } }] });
}

// Ajustes → Tus grupos
export function groupsSection() {
  const gs = groupsAll(), cur = group();
  return h('section', { class: 'stack' }, sectionTitle('Tus grupos'),
    h('p', { class: 'row-sub', style: { margin: 0 } }, gs.length > 1 ? 'Cada grupo tiene sus jugadores, entrenos, partidos, torneos y ajustes. Lo que haces es en el grupo activo.' : 'Si das clases en otra escuela, crea otro grupo: sus jugadores y entrenos quedan aparte de los de este.'),
    h('div', { class: 'rows' }, gs.map((g) => h('div', { class: 'row' },
      h('span', { class: 'row-main' }, h('strong', {}, g.name), h('span', { class: 'row-sub' }, plural(countOf(g), 'jugador', 'jugadores'))),
      h('span', { class: 'cluster', style: { gap: '6px' } },
        g.id === cur?.id ? h('span', { class: 'chip ok' }, 'Activo') : h('button', { type: 'button', class: 'btn sm', onclick: () => { setActiveGroup(g.id); toast(`Ahora ves: ${g.name}`); } }, 'Usar este'),
        g.id !== cur?.id && gs.length > 1 ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Borrar ${g.name}`, onclick: async () => {
          const n = countOf(g);
          if (!(await confirmSheet({ title: `¿Borrar «${g.name}»?`, text: `Se borran también ${plural(n, 'su jugador', 'sus jugadores')}, sus entrenos, partidos y torneos. No se puede deshacer.`, ok: 'Borrar grupo', danger: true }))) return;
          remove('groups', g.id); toast('Grupo borrado');
        } }, ic('trash-2', 18)) : null)))),
    h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn', onclick: newGroupSheet }, ic('plus', 18), 'Nuevo grupo')));
}

// Arriba en Hoy (y en Más) cuando hay más de un grupo.
export const groupChip = () => (groupsAll().length > 1 ? h('button', { type: 'button', class: 'group-chip', onclick: switchSheet, 'aria-label': `Grupo activo: ${group()?.name}. Cambiar de grupo` },
  ic('users', 16), h('strong', {}, group()?.name || 'Mi grupo'), h('span', {}, 'Cambiar'), ic('chevron-down', 16)) : null);
