// "Más": todo lo que no cabe en la barra de abajo del celular. También aquí vive "Mi perfil de jugador".
import { h, ic, openSheet, toast } from '../util.js';
import { state, pendingClaims, players, myPlayer, saveSettings, getPlayer } from '../store.js';
import { VERSION } from '../version.js';
import { unseenUpdate } from './ayuda.js';
import { field, options, note } from './ui.js';
import { playerFormSheet } from './sheets-player.js';

// ---------- perfil de jugador del entrenador ----------
// Entra como jugador con tu propia ficha: a diferencia de la vista previa, aquí sí puedes registrar, pedir retos y estudiar.
export function enterSelf(id = myPlayer()?.id, replace = false) {
  if (!id || !getPlayer(id)) return;
  state.viewAs = id; state.self = true;
  if (replace) location.replace('#/inicio'); else location.hash = '#/inicio';
}
export function leaveSelf(to = '#/mas') {
  state.viewAs = null; state.self = false;
  location.hash = to;
}
export function selfSheet() {
  const me = myPlayer();
  if (me) {
    openSheet({ title: 'Mi perfil de jugador', body: h('div', { class: 'stack' },
      h('p', { style: { margin: 0 } }, `Tu ficha de jugador es «${me.name}». Sales en la lista, en la alineación y en la captura como cualquier jugador.`),
      note('En tu perfil ves tu tarjeta y radar, estudias Teoría con tu propio avance, registras En casa, pides retos y contestas convocatorias. Para volver a entrenador, toca «Volver a entrenador» arriba.')),
    actions: [
      { label: 'Ya no jugar', onClick: () => { saveSettings({ me_player: null }); toast('Listo. Tu ficha sigue en Jugadores por si la quieres borrar.'); } },
      { label: 'Editar mis datos', onClick: () => { setTimeout(() => playerFormSheet(me, { self: true }), 50); } },
      { label: 'Entrar', kind: 'primary', onClick: () => enterSelf(me.id) }] });
    return;
  }
  const list = players();
  const pick = list.length ? h('select', { 'aria-label': 'Tu ficha en la lista' }, options([['', 'Elige tu nombre'], ...list.map((p) => [p.id, p.name])], '')) : null;
  openSheet({ title: 'Mi perfil de jugador', body: h('div', { class: 'stack' },
    h('p', { style: { margin: 0 } }, '¿Juegas con tu equipo, por ejemplo en un torneo mixto? Ten tu propia ficha de jugador: sales en la lista, la alineación y la captura, y tienes tu tarjeta, radar, Teoría con tu avance, En casa y retos.'),
    note('Tu ficha cuenta como un jugador más del grupo (rama, posición, nivel y equipo). Siempre puedes volver a tu vista de entrenador.'),
    pick ? field('Si ya te agregaste a la lista', pick) : null),
  actions: [
    pick ? { label: 'Soy yo', onClick: () => { if (!pick.value) { toast('Elige tu nombre de la lista'); return false; } saveSettings({ me_player: pick.value }); toast('Listo: esa es tu ficha'); setTimeout(() => enterSelf(pick.value), 50); return true; } } : { label: 'Cancelar' },
    { label: 'Crear mi ficha', kind: 'primary', onClick: () => { setTimeout(() => playerFormSheet(null, { self: true, onSaved: (np) => { saveSettings({ me_player: np.id }); setTimeout(() => enterSelf(np.id), 50); } }), 50); } }] });
}

export default function mas() {
  const item = (href, icon, title, text, badge) => h('a', { class: 'labcard', href },
    h('span', { class: 'lc-ic' }, ic(icon, 26)), h('span', { class: 'lc-t' }, h('strong', {}, title), h('span', {}, text)), badge ? h('span', { class: 'chip ball' }, badge) : null, ic('chevron-right', 20));
  const claims = pendingClaims().length;
  const ideasPending = state.data.ideas.filter((x) => ['idea', 'lista'].includes(x.status)).length;
  const me = myPlayer();
  return { title: 'Más', el: h('div', { class: 'page' }, h('div', { class: 'labcards' },
    item('#/lab', 'zap', 'Laboratorio', 'Tu salto vertical, tu visión de juego y tu coaching. Solo tú lo ves.'),
    item('#/yo', 'user-check', 'Mi perfil de jugador', me ? `Entra como ${me.name}: tu tarjeta, radar, Teoría, En casa y retos.` : 'Si juegas con ellos (por ejemplo en un equipo mixto), ten tu propia ficha.'),
    item('#/ejercicios', 'book-open', 'Ejercicios', 'La biblioteca con diagramas, progresiones y tus ejercicios propios.'),
    item('#/ruta', 'flag', 'Ruta', 'Los 6 niveles, exámenes y retos de tus jugadores.', claims ? `${claims} por revisar` : null),
    item('#/reportes', 'file-text', 'Reportes', 'Reportes imprimibles por jugador y del grupo.'),
    item('#/teoria', 'notebook-pen', 'Teoría', 'Lecciones, quizzes, repaso general y tus errores. Para tus jugadores y para ti.'),
    item('#/casa', 'house', 'En casa', 'Rutinas opcionales para tus jugadores y quién está entrenando en casa.'),
    item('#/gym', 'dumbbell', 'Gym', 'Rutinas de pesas según lo que quieren lograr, quién va al gym y sus cargas.'),
    item('#/mejoras', 'lightbulb', 'Mejoras de la app', 'Tu lista privada de cambios e ideas para Remate.', ideasPending ? `${ideasPending} pendientes` : null),
    item('#/ajustes', 'settings', 'Ajustes', 'Equipo, días de entrenamiento, respaldo y cuenta.'),
    item('#/ayuda', 'circle-help', 'Ayuda y fuentes', 'Cómo funciona Remate y de dónde viene la información.'),
    item('#/novedades', 'sparkles', 'Novedades', `Qué cambió en cada versión. Estás en la ${VERSION}.`, unseenUpdate() ? 'Nuevo' : null)),
    h('p', { class: 'row-sub', style: { textAlign: 'center' } }, `Remate v${VERSION}`)) };
}
