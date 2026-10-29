// "Hoy": lo próximo que viene y lo que necesita tu atención.
import { h, ic, plural, toast, todayStr, fmtDate, sum } from '../util.js';
import { state, players, sessions, pendingClaims, getPlayer, settings, resolveClaim } from '../store.js';
import { levelGap, attendanceFor, nextSession, planMinutes, focusOf, levelCounts, hasRatings, doneSessions } from '../calc.js';
import { SKILL_BY_ID } from '../content/skills.js';
import { LEVELS } from '../content/levels.js';
import { CHALLENGE_BY_ID } from '../content/challenges.js';
import { getExercise } from '../content/exercises.js';
import { sectionTitle, note, playerRow, sessionWhen, jersey } from './ui.js';
import { sessionFormSheet, attendanceSheet } from './sheets-session.js';
import { playerFormSheet, examSheet, evaluateSheet } from './sheets-player.js';
import { openCourtMode } from './court-mode.js';

const getEx = (id) => getExercise(id, state.data.customEx);

export default function hoy() {
  const list = players();
  const st = settings();
  const all = sessions();
  const el = h('div', { class: 'page' });

  // ---- sin jugadores: primeros pasos ----
  if (!list.length) {
    el.append(
      h('section', { class: 'band' }, h('h2', {}, 'Bienvenido a Remate'),
        h('p', { style: { margin: '6px 0 0' } }, 'Cuatro pasos y ya puedes entrenar con orden. Cada paso se hace en un minuto.')),
      h('ol', { class: 'plain panel', style: { listStylePosition: 'inside', padding: '16px' } },
        h('li', {}, 'Revisa tus días y tu hora de entrenamiento en Ajustes.'),
        h('li', {}, 'Agrega a tus jugadores: solo nombre o apodo, posición y rama.'),
        h('li', {}, 'Crea tu primer entrenamiento a partir de una plantilla.'),
        h('li', {}, 'Evalúa a cada jugador con la rúbrica de cuatro fases; su radar aparece solo.')),
      h('div', { class: 'cluster' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => playerFormSheet() }, ic('plus', 18), 'Agregar jugador'),
        h('a', { class: 'btn', href: '#/ajustes' }, ic('settings', 18), 'Ir a Ajustes'),
        h('a', { class: 'btn', href: '#/ruta' }, ic('flag', 18), 'Ver la ruta de 6 niveles')));
    return { title: 'Hoy', el };
  }

  // ---- próximo entrenamiento ----
  const next = nextSession(all);
  const overdue = all.filter((s) => s.status === 'planeada' && s.session_date < todayStr());
  if (next) {
    const blocks = (next.plan || []).length;
    const focus = focusOf(next, getEx);
    el.append(h('section', { class: 'band next' },
      h('div', { class: 'when' }, sessionWhen(next)),
      h('h2', {}, next.title || 'Entrenamiento'),
      h('div', {}, `${next.minutes} min`, blocks ? `, plan de ${planMinutes(next)} min en ${plural(blocks, 'bloque', 'bloques')}` : ', todavía sin plan'),
      focus.length ? h('div', { class: 'cluster', style: { marginTop: '10px' } }, focus.map((k) => h('span', { class: 'chip' }, SKILL_BY_ID[k].name))) : null,
      h('div', { class: 'cluster' },
        h('button', { class: 'btn ball', type: 'button', onclick: () => attendanceSheet(next) }, ic('clipboard-check', 18), 'Pasar lista'),
        h('a', { class: 'btn', href: `#/sesion/${next.id}` }, ic('book-open', 18), blocks ? 'Ver plan' : 'Armar plan'),
        blocks ? h('button', { class: 'btn', type: 'button', onclick: () => openCourtMode(next) }, ic('timer', 18), 'Modo cancha') : null)));
  } else {
    el.append(h('section', { class: 'panel stack' },
      h('h2', {}, 'No hay entrenamientos por venir'),
      h('p', { style: { margin: 0 } }, `Tus días configurados son ${(st.days || []).length ? 'los marcados en Ajustes' : 'ninguno todavía'}. Crea el siguiente y arma el plan con una plantilla.`),
      h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: () => sessionFormSheet(null, (s) => { location.hash = `#/sesion/${s.id}`; }) }, ic('plus', 18), 'Nuevo entrenamiento'))));
  }
  if (overdue.length) {
    el.append(note(`${plural(overdue.length, 'entrenamiento pasado sigue', 'entrenamientos pasados siguen')} sin lista. Pasa lista o cancélalos para que la asistencia sea correcta.`, 'warn'),
      h('a', { class: 'btn sm', href: '#/sesiones', style: { justifySelf: 'start' } }, 'Ir a entrenamientos'));
  }

  // ---- cifras del grupo ----
  const done = doneSessions(all);
  const pcts = list.map((p) => attendanceFor(p.id, all, state.data.attendance, st).pct).filter((x) => x != null);
  const avg = pcts.length ? Math.round(sum(pcts) / pcts.length) : null;
  el.append(h('div', { class: 'kpis', role: 'group', 'aria-label': 'Cifras del grupo' },
    kpi(list.length, plural(list.length, 'jugador', 'jugadores').replace(/^\d+ /, '')),
    kpi(avg == null ? '—' : `${avg}%`, 'asistencia del grupo'),
    kpi(done.length, done.length === 1 ? 'entreno hecho' : 'entrenos hechos')));

  // ---- por resolver ----
  const claims = pendingClaims();
  const faltas = list.map((p) => ({ p, a: attendanceFor(p.id, all, state.data.attendance, st) })).filter((x) => x.a.faltasSeguidas >= 2);
  const ready = list.filter((p) => levelGap(p, state.data.ratings).ready);
  const unrated = list.filter((p) => !hasRatings(p.id, state.data.ratings));
  const todo = h('div', { class: 'stack' });

  if (claims.length) {
    todo.append(h('div', { class: 'rows', 'aria-label': 'Retos por aprobar' }, claims.map((c) => {
      const p = getPlayer(c.player_id), ch = CHALLENGE_BY_ID[c.challenge_id];
      if (!p || !ch) return null;
      return h('div', { class: 'row', style: { flexWrap: 'wrap' } }, jersey(p),
        h('span', { class: 'row-main', style: { flex: '1 1 200px' } }, h('strong', {}, p.name), h('span', { class: 'row-sub' }, `Pide aprobar: ${ch.name} (${ch.xp} XP). ${ch.verify}`)),
        h('span', { class: 'row-end', style: { marginLeft: 'auto' } },
          h('button', { class: 'btn sm primary', type: 'button', onclick: () => { resolveClaim(c.id, true); toast(`Reto aprobado: +${ch.xp} XP para ${p.name}`); } }, 'Aprobar'),
          h('button', { class: 'btn sm', type: 'button', onclick: () => { resolveClaim(c.id, false); toast('Reto rechazado'); } }, 'Rechazar')));
    })));
  }
  if (ready.length) {
    todo.append(h('div', { class: 'rows', 'aria-label': 'Listos para examen' }, ready.map((p) => {
      const g = levelGap(p, state.data.ratings);
      return h('div', { class: 'row' }, jersey(p),
        h('a', { class: 'row-main', href: `#/jugador/${p.id}`, style: { textDecoration: 'none', color: 'inherit' } }, h('strong', {}, p.name),
          h('span', { class: 'row-sub' }, `Cumple las fases del nivel ${g.target}: ${g.targetLevel.name}`)),
        h('span', { class: 'row-end' }, h('button', { class: 'btn sm ball', type: 'button', onclick: () => examSheet(p) }, 'Examen')));
    })));
  }
  if (faltas.length) {
    todo.append(h('div', { class: 'rows', 'aria-label': 'Faltas seguidas' }, faltas.map(({ p, a }) =>
      playerRow(p, { href: `#/jugador/${p.id}`, end: h('span', { class: 'chip bad' }, `${a.faltasSeguidas} faltas`) }))));
  }
  if (unrated.length) {
    todo.append(note(`${plural(unrated.length, 'jugador no tiene', 'jugadores no tienen')} evaluación todavía. Sin ella no se dibuja su radar ni se sabe qué le falta para subir.`),
      h('div', { class: 'rows' }, unrated.slice(0, 4).map((p) => h('div', { class: 'row' }, jersey(p), h('span', { class: 'row-main' }, h('strong', {}, p.name)),
        h('span', { class: 'row-end' }, h('button', { class: 'btn sm', type: 'button', onclick: () => evaluateSheet(p) }, 'Evaluar'))))));
  }
  el.append(h('section', {}, sectionTitle('Por resolver'),
    todo.children.length ? todo : note('Todo al día: no hay retos por aprobar, faltas seguidas ni exámenes pendientes.', '')));

  // ---- niveles del grupo ----
  const counts = levelCounts(list), top = Math.max(1, ...counts);
  el.append(h('section', {}, sectionTitle('Tu grupo por nivel', h('a', { class: 'btn ghost sm', href: '#/ruta' }, 'Ver la ruta')),
    h('div', { class: 'panel dist' }, LEVELS.map((l, i) => h('div', { class: 'dist-row' },
      h('span', { class: 'lvl' }, String(l.n)),
      h('div', {}, h('div', { class: 'name' }, l.name), h('div', { class: 'bar', style: { marginTop: '4px' }, role: 'img', 'aria-label': `${counts[i]} jugadores` }, h('i', { style: { width: `${(counts[i] / top) * 100}%` } }))),
      h('span', { class: 'count' }, String(counts[i])))))));

  el.append(h('div', { class: 'cluster' },
    h('button', { class: 'btn', type: 'button', onclick: () => playerFormSheet() }, ic('plus', 18), 'Agregar jugador'),
    h('button', { class: 'btn', type: 'button', onclick: () => sessionFormSheet(null, (s) => { location.hash = `#/sesion/${s.id}`; }) }, ic('calendar-days', 18), 'Nuevo entrenamiento')));
  return { title: 'Hoy', sub: fmtDate(todayStr(), { weekday: 'long', day: 'numeric', month: 'long' }), el };
}

function kpi(n, label) { return h('div', { class: 'kpi' }, h('span', { class: 'n' }, String(n)), h('span', { class: 'l' }, label)); }
