// Reportes imprimibles: uno por jugador (para la familia o la escuela) y uno del grupo.
import { h, ic, toast, fmtDate, todayStr, plural } from '../util.js';
import { state, players, getPlayer, group, settings, profile, saveProfile, labReady } from '../store.js';
import { currentRatings, levelGap, radarValues, attendanceFor, xpFor, levelCounts } from '../calc.js';
import { SKILLS, PHASES, POSITION_NAME, BRANCHES } from '../content/skills.js';
import { LEVELS } from '../content/levels.js';
import { radarSVG } from '../radar.js';
import { metrics, addCounts, result, fmtEff } from '../match-calc.js';
import { sectionTitle, note, empty, dots, playerRow } from './ui.js';

const printBtn = () => h('button', { class: 'btn primary', type: 'button', onclick: () => window.print() }, ic('printer', 18), 'Imprimir o guardar PDF');
const seasonMatches = () => state.data.matches.filter((m) => m.status === 'terminado');
const lastEval = (pid) => state.data.ratings.filter((r) => r.player_id === pid).map((r) => r.rated_at).sort().pop() || null;

function head(title, sub) {
  const g = group(), st = settings();
  return h('header', { class: 'rp-head' },
    h('div', {}, h('span', { class: 'rp-brand' }, 'Remate'), h('h2', {}, title), sub ? h('p', { style: { margin: 0 } }, sub) : null),
    h('div', { class: 'rp-meta' }, h('span', {}, g?.name || 'Mi equipo'), st.season ? h('span', {}, `Temporada ${st.season}`) : null, h('span', {}, `Fecha: ${fmtDate(todayStr(), { day: 'numeric', month: 'long', year: 'numeric' })}`)));
}

export default function reportes(ctx) {
  if (ctx.args[0] === 'grupo') return groupReport();
  if (ctx.args[0]) return playerReport(ctx.args[0]);
  const list = players();
  return { title: 'Reportes', back: '#/mas', el: h('div', { class: 'page' },
    h('p', { style: { margin: 0 } }, 'Reportes listos para imprimir o guardar en PDF desde tu celular o computadora. Útiles para juntas con familias, la escuela o el cierre de temporada.'),
    h('a', { class: 'labcard', href: '#/reportes/grupo' }, h('span', { class: 'lc-ic' }, ic('chart-column', 26)), h('span', { class: 'lc-t' }, h('strong', {}, 'Reporte del grupo'), h('span', {}, 'Niveles, asistencia, XP y resultados de la temporada.')), ic('chevron-right', 20)),
    sectionTitle('Reporte por jugador'),
    list.length ? h('div', { class: 'rows' }, list.map((p) => playerRow(p, { href: `#/reportes/${p.id}` }))) : empty('Sin jugadores', 'Agrega jugadores para generar sus reportes.')) };
}

function playerReport(id) {
  const p = getPlayer(id);
  if (!p) return { title: 'Reporte', back: '#/reportes', el: h('div', { class: 'page' }, empty('No encontré a ese jugador', null, h('a', { class: 'btn', href: '#/reportes' }, 'Ver reportes'))) };
  const d = state.data, st = settings();
  const cur = currentRatings(p.id, d.ratings), gap = levelGap(p, d.ratings), rv = radarValues(p, d.ratings);
  const att = attendanceFor(p.id, d.sessions, d.attendance, st), xp = xpFor(p, d);
  const exams = d.exams.filter((e) => e.player_id === p.id).sort((a, b) => b.taken_at.localeCompare(a.taken_at));
  const retos = d.claims.filter((c) => c.player_id === p.id && c.status === 'aprobada').length;
  const ms = d.matchStats.filter((s) => s.player_id === p.id && seasonMatches().some((m) => m.id === s.match_id));
  const mm = metrics(addCounts(...ms.map((s) => s.counts)));
  const notes = profile().reportNotes || {};
  const comment = h('textarea', { class: 'no-print', rows: 4, maxlength: 1500, placeholder: 'Fortalezas, en qué trabajar y cómo puede apoyar la familia. Se imprime en el reporte.', 'aria-label': 'Comentario del entrenador' }, notes[p.id] || '');
  const printed = h('p', { class: 'print-only', style: { whiteSpace: 'pre-wrap' } }, notes[p.id] || '');
  // Se guarda al salir del cuadro (guardar mientras escribes redibujaría la pantalla y perderías el cursor).
  comment.addEventListener('input', () => { printed.textContent = comment.value; });
  comment.addEventListener('change', () => { if (!labReady()) return; saveProfile({ reportNotes: { ...(profile().reportNotes || {}), [p.id]: comment.value.trim() } }); toast('Comentario guardado', 1200); });
  const next = gap.top ? [] : gap.rows.filter((r) => !r.na && !r.ok);
  const meta = [POSITION_NAME[p.position], p.branch ? BRANCHES[p.branch] : null, p.jersey != null ? `Número ${p.jersey}` : null].filter(Boolean).join(' · ');

  const el = h('div', { class: 'page report' },
    h('div', { class: 'cluster no-print' }, printBtn(), h('a', { class: 'btn', href: `#/jugador/${p.id}` }, 'Ver ficha')),
    h('article', { class: 'sheet-print stack' },
      head(`Reporte de ${p.name}`, meta),
      h('section', { class: 'rp-two' },
        h('div', { class: 'stack' },
          h('div', { class: 'rp-level' }, h('span', { class: 'lvl big' }, String(p.level)), h('div', {}, h('strong', {}, `Nivel ${p.level}: ${LEVELS[p.level - 1].name}`), h('span', {}, LEVELS[p.level - 1].tag))),
          h('table', { class: 'stbl' }, h('tbody', {},
            h('tr', {}, h('th', { scope: 'row' }, 'Asistencia'), h('td', {}, att.pct == null ? 'Sin registros' : `${att.pct}% (${att.presente} presentes, ${att.retardo} retardos, ${att.falta} faltas, ${att.justificada} justificadas)`)),
            h('tr', {}, h('th', { scope: 'row' }, 'Puntos XP'), h('td', {}, `${xp} (${plural(retos, 'reto aprobado', 'retos aprobados')})`)),
            h('tr', {}, h('th', { scope: 'row' }, 'Exámenes de nivel'), h('td', {}, exams.length ? exams.map((e) => `Nivel ${e.level} ${e.passed ? 'aprobado' : 'no aprobado'} (${fmtDate(e.taken_at, { day: 'numeric', month: 'short' })})`).join('; ') : 'Ninguno todavía')),
            h('tr', {}, h('th', { scope: 'row' }, 'Última evaluación'), h('td', {}, lastEval(p.id) ? fmtDate(lastEval(p.id), { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin evaluar'))))),
        rv.values.some((v) => v > 0) ? h('figure', { class: 'rp-radar', style: { margin: 0 } }, h('div', { html: radarSVG(rv, `Radar de habilidades de ${p.name}`) }),
          h('figcaption', {}, gap.top ? 'Relleno: fases actuales.' : `Relleno: fases actuales. Línea punteada: lo que pide el nivel ${gap.target}.`)) : null),
      h('section', { class: 'stack' }, h('h3', {}, 'Habilidades'),
        h('table', { class: 'stbl' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Habilidad'), h('th', { scope: 'col' }, 'Fase actual'), gap.top ? null : h('th', { scope: 'col' }, `Pide el nivel ${gap.target}`))),
          h('tbody', {}, SKILLS.map((s) => { const g = gap.rows.find((r) => r.skill === s.id), n = cur[s.id] || 0;
            return h('tr', {}, h('th', { scope: 'row' }, s.name), h('td', {}, dots(n), ` ${n ? PHASES[n - 1].name : 'Sin evaluar'}`), gap.top ? null : h('td', {}, g.na ? 'No aplica' : `${PHASES[g.need - 1]?.name || '—'}${g.ok ? ' (cumple)' : ''}`)); })))),
      next.length ? h('section', { class: 'stack' }, h('h3', {}, 'Para subir de nivel'),
        h('ul', { class: 'plain' }, next.map((r) => h('li', {}, `${r.name}: pasar de ${r.have ? PHASES[r.have - 1].name.toLowerCase() : 'sin evaluar'} a ${PHASES[r.need - 1].name.toLowerCase()}.`)))) : null,
      ms.length ? h('section', { class: 'stack' }, h('h3', {}, `Partidos (${plural(ms.length, 'partido con estadística', 'partidos con estadística')})`),
        h('table', { class: 'stbl' }, h('tbody', {},
          h('tr', {}, h('th', { scope: 'row' }, 'Puntos'), h('td', {}, `${mm.points} (${plural(mm.aces, 'ace', 'aces')}, ${plural(mm.kills, 'remate', 'remates')}, ${plural(mm.blocks, 'bloqueo', 'bloqueos')})`)),
          mm.serves ? h('tr', {}, h('th', { scope: 'row' }, 'Saque'), h('td', {}, `${mm.svIn}% dentro de ${mm.serves}`)) : null,
          mm.recs ? h('tr', {}, h('th', { scope: 'row' }, 'Recepción'), h('td', {}, `Promedio ${mm.recAvg} de 3, ${mm.recPos}% buena o perfecta (${mm.recs} recepciones)`)) : null,
          mm.atts ? h('tr', {}, h('th', { scope: 'row' }, 'Ataque'), h('td', {}, `Eficiencia ${fmtEff(mm.atEff)}, ${mm.kills} puntos en ${mm.atts} remates`)) : null))) : null,
      h('section', { class: 'stack' }, h('h3', {}, 'Comentario del entrenador'), comment, printed,
        !labReady() ? note('Para guardar comentarios, corre el SQL actualizado en Supabase.', 'warn') : null),
      h('footer', { class: 'rp-foot' }, 'Las fases van de 1 (Iniciación) a 4 (Refinamiento). Los niveles van de 1 a 6 y solo se suben con examen. Generado con Remate.')));
  return { title: `Reporte de ${p.name}`, back: '#/reportes', el };
}

function groupReport() {
  const d = state.data, st = settings(), list = players();
  const counts = levelCounts(list);
  const done = seasonMatches().slice().sort((a, b) => a.match_date.localeCompare(b.match_date));
  const wins = done.filter((m) => result(m).win).length;
  const team = metrics(addCounts(...d.matchStats.filter((s) => done.some((m) => m.id === s.match_id)).map((s) => s.counts)));
  const rows = list.map((p) => {
    const att = attendanceFor(p.id, d.sessions, d.attendance, st);
    const mm = metrics(addCounts(...d.matchStats.filter((s) => s.player_id === p.id && done.some((m) => m.id === s.match_id)).map((s) => s.counts)));
    return { p, att, xp: xpFor(p, d), mm, ev: lastEval(p.id) };
  });
  const el = h('div', { class: 'page report' },
    h('div', { class: 'cluster no-print' }, printBtn()),
    h('article', { class: 'sheet-print stack' },
      head('Reporte del grupo', `${plural(list.length, 'jugador activo', 'jugadores activos')}`),
      h('section', { class: 'stack' }, h('h3', {}, 'Niveles'),
        h('table', { class: 'stbl' }, h('tbody', {}, LEVELS.map((l, i) => h('tr', {}, h('th', { scope: 'row' }, `${l.n}. ${l.name}`), h('td', {}, plural(counts[i], 'jugador', 'jugadores'))))))),
      h('section', { class: 'stack' }, h('h3', {}, 'Jugadores'),
        h('div', { class: 'tablewrap' }, h('table', { class: 'stbl' },
          h('thead', {}, h('tr', {}, ['Jugador', 'Nivel', 'Asistencia', 'XP', 'Puntos en partidos', 'Última evaluación'].map((t) => h('th', { scope: 'col' }, t)))),
          h('tbody', {}, rows.map((r) => h('tr', {}, h('th', { scope: 'row' }, r.p.name), h('td', {}, String(r.p.level)), h('td', {}, r.att.pct == null ? '—' : `${r.att.pct}%`),
            h('td', {}, String(r.xp)), h('td', {}, String(r.mm.points)), h('td', {}, r.ev ? fmtDate(r.ev, { day: 'numeric', month: 'short' }) : '—'))))))),
      done.length ? h('section', { class: 'stack' }, h('h3', {}, `Partidos: ${wins} ganados, ${done.length - wins} perdidos`),
        h('table', { class: 'stbl' }, h('tbody', {}, done.map((m) => { const r = result(m);
          return h('tr', {}, h('th', { scope: 'row' }, `${fmtDate(m.match_date, { day: 'numeric', month: 'short' })} contra ${m.rival}`), h('td', {}, `${r.win ? 'Ganado' : 'Perdido'} ${r.text} (${r.detail})`)); }))),
        h('p', { style: { margin: 0 } }, `Equipo: eficiencia de ataque ${fmtEff(team.atEff)}, recepción buena o perfecta ${team.recPos ?? '—'}%, saques dentro ${team.svIn ?? '—'}%, ${team.aces} aces y ${team.blocks} puntos de bloqueo.`)) : null,
      h('footer', { class: 'rp-foot' }, 'Asistencia: los retardos se convierten en faltas según tus Ajustes; las justificadas no restan. Generado con Remate.')));
  return { title: 'Reporte del grupo', back: '#/reportes', el };
}
