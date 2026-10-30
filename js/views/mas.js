// "Más": todo lo que no cabe en la barra de abajo del celular.
import { h, ic } from '../util.js';
import { state, pendingClaims } from '../store.js';

export default function mas() {
  const item = (href, icon, title, text, badge) => h('a', { class: 'labcard', href },
    h('span', { class: 'lc-ic' }, ic(icon, 26)), h('span', { class: 'lc-t' }, h('strong', {}, title), h('span', {}, text)), badge ? h('span', { class: 'chip ball' }, badge) : null, ic('chevron-right', 20));
  const claims = pendingClaims().length;
  const ideasPending = state.data.ideas.filter((x) => ['idea', 'lista'].includes(x.status)).length;
  return { title: 'Más', el: h('div', { class: 'page' }, h('div', { class: 'labcards' },
    item('#/lab', 'zap', 'Laboratorio', 'Tu salto vertical, tu visión de juego y tu coaching. Solo tú lo ves.'),
    item('#/ejercicios', 'book-open', 'Ejercicios', 'La biblioteca con diagramas, progresiones y tus ejercicios propios.'),
    item('#/ruta', 'flag', 'Ruta', 'Los 6 niveles, exámenes y retos de tus jugadores.', claims ? `${claims} por revisar` : null),
    item('#/reportes', 'file-text', 'Reportes', 'Reportes imprimibles por jugador y del grupo.'),
    item('#/casa', 'house', 'En casa', 'Rutinas opcionales para tus jugadores y quién está entrenando en casa.'),
    item('#/mejoras', 'lightbulb', 'Mejoras de la app', 'Tu lista privada de cambios e ideas para Remate.', ideasPending ? `${ideasPending} pendientes` : null),
    item('#/ajustes', 'settings', 'Ajustes', 'Equipo, días de entrenamiento, respaldo y cuenta.'),
    item('#/ayuda', 'circle-help', 'Ayuda y fuentes', 'Cómo funciona Remate y de dónde viene la información.'))) };
}
