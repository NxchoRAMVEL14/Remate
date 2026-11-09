// Reportes imprimibles: uno por jugador (para la familia o la escuela) y uno del grupo.
import { h, ic, toast, fmtDate, todayStr, plural, shareText } from '../util.js';
import { state, players, getPlayer, group, settings, profile, saveProfile, labReady } from '../store.js';
import { currentRatings, levelGap, radarValues, attendanceFor, xpFor, levelCounts, positionsOf } from '../calc.js';
import { SKILLS, SKILL_BY_ID, PHASES, POSITION_NAME, BRANCHES } from '../content/skills.js';
import { LEVELS } from '../content/levels.js';
import { metrics, addCounts, result, fmtEff } from '../match-calc.js';
import { sectionTitle, note, empty, dots, playerRow, radarSVG } from './ui.js';
import { PTESTS, testTrend } from '../content/gym.js';
import { badgesFor } from '../badges.js';
import { FUND } from '../content/aprende.js';
import { HOME_BY_ID } from '../content/casa.js';

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
  if (ctx.args[0] === 'familias') return familiesReport();
  if (ctx.args[0] && ctx.args[1] === 'familia') return familyReport(ctx.args[0]);
  if (ctx.args[0]) return playerReport(ctx.args[0]);
  const list = players();
  return { title: 'Reportes', back: '#/mas', el: h('div', { class: 'page' },
    h('p', { style: { margin: 0 } }, 'Reportes listos para imprimir o guardar en PDF desde tu celular o computadora. Útiles para juntas con familias, la escuela o el cierre de temporada.'),
    h('a', { class: 'labcard', href: '#/reportes/grupo' }, h('span', { class: 'lc-ic' }, ic('chart-column', 26)), h('span', { class: 'lc-t' }, h('strong', {}, 'Reporte del grupo'), h('span', {}, 'Niveles, asistencia, XP y resultados de la temporada.')), ic('chevron-right', 20)),
    h('a', { class: 'labcard', href: '#/reportes/familias' }, h('span', { class: 'lc-ic' }, ic('house', 26)), h('span', { class: 'lc-t' }, h('strong', {}, 'Reportes para las familias'), h('span', {}, 'Una hoja por jugador en palabras sencillas: cómo va, qué hace bien, en qué trabaja y cómo apoyarlo en casa. Todos de una vez.')), ic('chevron-right', 20)),
    sectionTitle('Reporte por jugador'),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Toca a un jugador para su reporte completo. En «Familia» está el de su familia.'),
    list.length ? h('div', { class: 'rows' }, list.map((p) => h('div', { class: 'row' }, h('a', { class: 'row-main', href: `#/reportes/${p.id}`, style: { textDecoration: 'none', color: 'inherit' } }, h('strong', {}, p.name), h('span', { class: 'row-sub' }, 'Reporte completo')),
      h('a', { class: 'btn sm', href: `#/reportes/${p.id}/familia` }, ic('house', 16), 'Familia')))) : empty('Sin jugadores', 'Agrega jugadores para generar sus reportes.')) };
}

function playerReport(id) {
  const p = getPlayer(id);
  if (!p) return { title: 'Reporte', back: '#/reportes', el: h('div', { class: 'page' }, empty('No encontré a ese jugador', null, h('a', { class: 'btn', href: '#/reportes' }, 'Ver reportes'))) };
  const d = state.data, st = settings();
  const cur = currentRatings(p.id, d.ratings), gap = levelGap(p, d.ratings), rv = radarValues(p, d.ratings);
  const att = attendanceFor(p.id, d.sessions, d.attendance, st), xp = xpFor(p, d, st);
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
  const meta = [POSITION_NAME[p.position], positionsOf(p).length > 1 ? `también ${positionsOf(p).slice(1).map((x) => POSITION_NAME[x].toLowerCase()).join(', ')}` : null, p.branch ? BRANCHES[p.branch] : null, p.jersey != null ? `Número ${p.jersey}` : null].filter(Boolean).join(' · ');

  const el = h('div', { class: 'page report' },
    h('div', { class: 'cluster no-print' }, printBtn(), h('a', { class: 'btn', href: `#/reportes/${p.id}/familia` }, ic('house', 18), 'Versión para la familia'), h('a', { class: 'btn', href: `#/jugador/${p.id}` }, 'Ver ficha')),
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
      (() => { const pt = d.playerTests.filter((t) => t.player_id === p.id), ks = Object.keys(PTESTS).filter((x) => pt.some((t) => t.kind === x));
        return ks.length ? h('section', { class: 'stack' }, h('h3', {}, 'Pruebas físicas'),
          h('table', { class: 'stbl' }, h('tbody', {}, ks.map((x) => { const tr = testTrend(pt, x);
            return h('tr', {}, h('th', { scope: 'row' }, PTESTS[x].name), h('td', {}, `${Number(tr.last)} ${PTESTS[x].unit}${tr.n > 1 ? ` (primera: ${Number(tr.first)} ${PTESTS[x].unit}; cambio ${tr.d > 0 ? '+' : ''}${tr.d})` : ''}`)); })))) : null; })(),
      (() => { const { earned } = badgesFor(p, d, st); return earned.length ? h('section', { class: 'stack' }, h('h3', {}, 'Insignias'), h('p', { style: { margin: 0 } }, earned.map((b) => `${b.name} (${b.desc})`).join(' · '))) : null; })(),
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
    return { p, att, xp: xpFor(p, d, st), mm, ev: lastEval(p.id) };
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


// ---------- Reporte para la familia (v3.22) ----------
// Palabras sencillas, sin estadística técnica: cómo va, qué hace bien, en qué trabaja y cómo apoyarlo en casa.
const first = (name) => String(name || '').split(' ')[0];
const attWord = (pct) => (pct == null ? 'Sin registros todavía' : pct >= 90 ? 'Excelente' : pct >= 75 ? 'Buena' : pct >= 60 ? 'Puede mejorar' : 'Necesitamos que venga más');
function familyData(p) {
  const d = state.data, st = settings(), t = todayStr();
  const cur = currentRatings(p.id, d.ratings), gap = levelGap(p, d.ratings);
  const att = attendanceFor(p.id, d.sessions, d.attendance, st);
  const evaluated = Object.keys(cur).length > 0;
  const strong = SKILLS.filter((s) => (cur[s.id] || 0) >= 2 && !gap.rows.find((r) => r.skill === s.id)?.na).sort((a, b) => (cur[b.id] || 0) - (cur[a.id] || 0)).slice(0, 2)
    .map((s) => ({ name: s.name, text: s.phases[(cur[s.id] || 1) - 1] }));
  const work = gap.top ? [] : gap.rows.filter((r) => !r.na && !r.ok).sort((a, b) => (b.need - b.have) - (a.need - a.have)).slice(0, 3)
    .map((r) => ({ skill: r.skill, name: r.name, text: SKILL_BY_ID[r.skill]?.phases?.[r.need - 1] || '' }));
  const home = [...new Set(work.flatMap((w) => FUND[w.skill]?.casa || []))].map((id) => HOME_BY_ID[id]).filter(Boolean).slice(0, 3);
  const { earned } = badgesFor(p, d, st);
  const retos = d.claims.filter((c) => c.player_id === p.id && c.status === 'aprobada').length;
  const exams = d.exams.filter((e) => e.player_id === p.id && e.passed).length;
  const nextS = d.sessions.filter((s) => s.status === 'planeada' && s.published && s.session_date >= t).sort((a, b) => a.session_date.localeCompare(b.session_date)).slice(0, 2);
  const nextM = d.matches.filter((m) => m.status !== 'terminado' && m.match_date >= t).sort((a, b) => a.match_date.localeCompare(b.match_date)).slice(0, 2);
  const comment = (profile().reportNotes || {})[p.id] || '';
  return { att, evaluated, strong, work, home, earned, retos, exams, nextS, nextM, comment, gap, xp: xpFor(p, d, st) };
}
function familyArticle(p) {
  const f = familyData(p), L = LEVELS[p.level - 1], n = first(p.name);
  const tile = (big, label, sub) => h('div', { class: 'fam-tile' }, h('span', { class: 'fam-big' }, big), h('strong', {}, label), sub ? h('span', {}, sub) : null);
  return h('article', { class: 'sheet-print stack fam' },
    head(`Cómo va ${p.name}`, 'Reporte para la familia'),
    h('p', { style: { margin: 0 } }, `Este reporte es para que sepan cómo va ${n} en voleibol y cómo pueden apoyarle. Sale de lo que registramos en cada entrenamiento.`),
    h('div', { class: 'fam-tiles' },
      tile(f.att.pct == null ? '—' : `${f.att.pct}%`, 'Asistencia', attWord(f.att.pct)),
      tile(String(p.level), `Nivel ${p.level} de 6`, L?.name || ''),
      tile(String(f.earned.length + f.retos + f.exams), 'Logros', [f.earned.length ? plural(f.earned.length, 'insignia', 'insignias') : '', f.retos ? plural(f.retos, 'reto', 'retos') : '', f.exams ? plural(f.exams, 'examen aprobado', 'exámenes aprobados') : ''].filter(Boolean).join(', ') || 'Vienen pronto')),
    f.att.faltasSeguidas >= 2 ? h('p', { class: 'fam-warn' }, `Faltó a los últimos ${f.att.faltasSeguidas} entrenamientos. Si pasa algo, avísenos: queremos ayudar.`) : null,
    h('section', { class: 'stack' }, h('h3', {}, 'Lo que hace bien'),
      !f.evaluated ? h('p', { style: { margin: 0 } }, `Todavía no tenemos su primera evaluación. En el siguiente reporte les contamos.`)
        : f.strong.length ? h('ul', { class: 'plain' }, f.strong.map((x) => h('li', {}, h('strong', {}, `${x.name}: `), x.text))) : h('p', { style: { margin: 0 } }, `${n} está construyendo sus bases: cada entrenamiento suma.`)),
    h('section', { class: 'stack' }, h('h3', {}, f.gap.top ? 'Su reto ahora' : `En qué está trabajando para llegar al nivel ${f.gap.target}`),
      f.gap.top ? h('p', { style: { margin: 0 } }, 'Ya está en el nivel más alto: ahora se trata de mantenerlo y ayudar a sus compañeros.')
        : !f.evaluated ? h('p', { style: { margin: 0 } }, 'Lo sabremos con su primera evaluación.')
        : f.work.length ? h('ul', { class: 'plain' }, f.work.map((x) => h('li', {}, h('strong', {}, `${x.name}: `), x.text))) : h('p', { style: { margin: 0 } }, `Ya tiene lo que pide su siguiente nivel: le toca presentar el examen.`)),
    h('section', { class: 'stack' }, h('h3', {}, 'Cómo apoyarle en casa'),
      h('ul', { class: 'plain' },
        ...f.home.map((x) => h('li', {}, h('strong', {}, `${x.name} (${x.min} min): `), x.goal)),
        h('li', {}, h('strong', {}, 'Descanso y agua: '), 'dormir de 8 a 10 horas y llegar al entrenamiento con agua y algo ligero en el estómago.'),
        h('li', {}, h('strong', {}, 'Llegar a tiempo: '), 'el calentamiento del inicio es el que más cuida de lesiones.'),
        h('li', {}, h('strong', {}, 'Su ánimo: '), 'pregúntenle qué aprendió hoy más que cuánto ganaron. El esfuerzo se nota.')),
      f.home.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, `${n} tiene estos ejercicios explicados en Remate, en «En casa».`) : null),
    f.nextS.length || f.nextM.length ? h('section', { class: 'stack' }, h('h3', {}, 'Lo que viene'),
      h('ul', { class: 'plain' },
        ...f.nextS.map((s) => h('li', {}, `Entrenamiento: ${fmtDate(s.session_date, { weekday: 'long', day: 'numeric', month: 'long' })}${s.start_time ? `, ${s.start_time.slice(0, 5)}` : ''}`)),
        ...f.nextM.map((m) => h('li', {}, `Partido contra ${m.rival}: ${fmtDate(m.match_date, { weekday: 'long', day: 'numeric', month: 'long' })}${m.venue ? ` en ${m.venue}` : ''}`)))) : null,
    h('section', { class: 'stack' }, h('h3', {}, 'Mensaje del entrenador'),
      h('p', { class: 'fam-msg', style: { margin: 0, whiteSpace: 'pre-wrap' } }, f.comment || 'Gracias por apoyar a su hija o hijo. Cualquier duda, platiquemos.')),
    h('footer', { class: 'rp-foot' }, 'Los niveles van del 1 (primer toque) al 6 y se suben con un examen práctico. Generado con Remate.'));
}
export function familyText(p) {
  const f = familyData(p), n = first(p.name), g = group();
  return [`*Cómo va ${p.name}* (${g?.name || 'voleibol'})`,
    `• Asistencia: ${f.att.pct == null ? 'sin registros' : `${f.att.pct}% (${attWord(f.att.pct).toLowerCase()})`}`,
    `• Nivel ${p.level} de 6: ${LEVELS[p.level - 1]?.name || ''}`,
    f.strong.length ? `• Lo que hace bien: ${f.strong.map((x) => x.name.toLowerCase()).join(' y ')}` : '',
    f.work.length ? `• Está trabajando en: ${f.work.map((x) => x.name.toLowerCase()).join(', ')}` : '',
    f.home.length ? `• En casa le ayuda: ${f.home.map((x) => `${x.name.toLowerCase()} (${x.min} min)`).join(', ')}` : '',
    f.comment ? `\n${f.comment}` : '', `\n¡Gracias por apoyar a ${n}!`].filter(Boolean).join('\n');
}
function familyReport(id) {
  const p = getPlayer(id);
  if (!p) return { title: 'Reporte para la familia', back: '#/reportes', el: h('div', { class: 'page' }, empty('No encontré a ese jugador', null, h('a', { class: 'btn', href: '#/reportes' }, 'Ver reportes'))) };
  const notes = profile().reportNotes || {};
  const comment = h('textarea', { rows: 4, maxlength: 1500, placeholder: 'Un mensaje corto para la familia: un logro, algo en qué apoyar. Se imprime en el reporte (es el mismo comentario del reporte completo).', 'aria-label': 'Mensaje del entrenador' }, notes[p.id] || '');
  comment.addEventListener('change', () => { if (!labReady()) return; saveProfile({ reportNotes: { ...(profile().reportNotes || {}), [p.id]: comment.value.trim() } }); toast('Mensaje guardado', 1200); });
  comment.addEventListener('input', () => { const m = el.querySelector('.fam-msg'); if (m) m.textContent = comment.value.trim() || 'Gracias por apoyar a su hija o hijo. Cualquier duda, platiquemos.'; });
  const el = h('div', { class: 'page report' },
    h('div', { class: 'cluster no-print' }, printBtn(),
      h('button', { class: 'btn', type: 'button', onclick: () => shareText(familyText(p)) }, ic('message-circle', 18), 'Mandar por WhatsApp'),
      h('a', { class: 'btn', href: `#/reportes/${p.id}` }, 'Reporte completo')),
    h('label', { class: 'field no-print' }, h('span', { class: 'label' }, 'Tu mensaje para la familia'), comment),
    familyArticle(p));
  return { title: 'Reporte para la familia', sub: p.name, back: '#/reportes', el };
}
function familiesReport() {
  const list = players();
  const el = h('div', { class: 'page report' },
    h('div', { class: 'cluster no-print' }, printBtn()),
    h('p', { class: 'no-print', style: { margin: 0 } }, `${plural(list.length, 'reporte', 'reportes')}, uno por hoja. Al imprimir (o guardar en PDF) cada jugador sale en su propia hoja. Tu mensaje de cada uno se escribe en su reporte («Familia»).`),
    ...list.map((p, i) => { const a = familyArticle(p); if (i) a.classList.add('fam-break'); return a; }));
  return { title: 'Reportes para las familias', back: '#/reportes', el };
}
