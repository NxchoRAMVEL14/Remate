// "Más": todo lo que no cabe en la barra de abajo del celular. También aquí vive "Mi perfil de jugador".
import { h, ic, openSheet, toast } from '../util.js';
import { spikes } from './carga.js';
import { unseenVideos } from './tecnica.js';
const spikeCount = () => { try { return spikes().length; } catch { return 0; } };
import { state, pendingClaims, players, myPlayer, saveSettings, getPlayer } from '../store.js';
import { VERSION } from '../version.js';
import { unseenUpdate } from './ayuda.js';
import { field, options, note, brandBand } from './ui.js';
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
  return { title: 'Más', el: h('div', { class: 'page' }, brandBand(), h('div', { class: 'labcards' },
    item('#/lesiones', 'heart-pulse', 'Lesiones', 'Quién está lesionado, su regreso en 5 fases y ejercicios de prevención por zona.'),
    item('#/video', 'video', 'Video con dibujos', 'Analiza un video de tu celular (por ejemplo, el partido): cámara lenta, cuadro por cuadro y dibujar encima. No sube nada.'),
    item('#/panel', 'chart-column', 'Panel del grupo', 'Asistencia por semana, a quién atender, lo que más le falta al grupo y sus niveles.'),
    item('#/lab', 'zap', 'Laboratorio', 'Tu salto vertical, tu visión de juego y tu coaching. Solo tú lo ves.'),
    item('#/yo', 'user-check', 'Mi perfil de jugador', me ? `Entra como ${me.name}: tu tarjeta, radar, Teoría, En casa y retos.` : 'Si juegas con ellos (por ejemplo en un equipo mixto), ten tu propia ficha.'),
    item('#/fit', 'dumbbell', 'Remate Fit', 'Zona de adultos: gym, comida y recetas, peso, medidas y pasos. Solo mayores de 18 que tú actives.'),
    item('#/azar', 'dice-5', 'Azar y equipos', 'El dado para elegir a alguien, equipos parejos de 6 vs 6 o 5 vs 5, cascaritas y duelos de 1 vs 1.'),
    item('#/ejercicios', 'book-open', 'Ejercicios', 'La biblioteca con diagramas, progresiones y tus ejercicios propios.'),
    item('#/ruta', 'flag', 'Ruta', 'Los 6 niveles, exámenes, retos (con los de la semana) y el ranking.', claims ? `${claims} por revisar` : null),
    item('#/reportes', 'file-text', 'Reportes', 'Por jugador, del grupo y para las familias (en palabras sencillas, para imprimir o mandar por WhatsApp).'),
    item('#/aprende', 'graduation-cap', 'Aprende', 'Teoría y práctica juntas, por fundamento (saque, remate…) o por posición (central, líbero…).'),
    item('#/pizarra', 'move', 'Pizarra', 'Una cancha para acomodar a tu equipo y al rival, dibujar flechas, rotar y guardar jugadas.'),
    item('#/teoria', 'notebook-pen', 'Teoría', 'Lecciones, quizzes, repaso general y tus errores. Para tus jugadores y para ti.'),
    item('#/casa', 'house', 'En casa', 'Rutinas opcionales para tus jugadores y quién está entrenando en casa.'),
    item('#/gym', 'dumbbell', 'Gym', 'Rutinas de pesas según lo que quieren lograr, quién va al gym y sus cargas.'),
    item('#/carga', 'activity', 'Carga semanal', 'Qué tan pesado fue cada entreno para cada jugador y quién subió mucho esta semana.', spikeCount() ? `${spikeCount()} subieron` : null),
    item('#/tecnica', 'video', 'Videos de técnica', 'Los videos que te mandan tus jugadores para revisar su técnica.', unseenVideos() ? `${unseenVideos()} sin ver` : null),
    item('#/mejoras', 'lightbulb', 'Mejoras de la app', 'Tu lista privada de cambios e ideas para Remate.', ideasPending ? `${ideasPending} pendientes` : null),
    item('#/ajustes', 'settings', 'Ajustes', 'Equipo, días de entrenamiento, respaldo y cuenta.'),
    item('#/ayuda', 'circle-help', 'Ayuda y fuentes', 'Cómo funciona Remate y de dónde viene la información.'),
    item('#/novedades', 'sparkles', 'Novedades', `Qué cambió en cada versión. Estás en la ${VERSION}.`, unseenUpdate() ? 'Nuevo' : null)),
    h('p', { class: 'row-sub', style: { textAlign: 'center' } }, `Remate v${VERSION}`)) };
}
