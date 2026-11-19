// Conoce a tus jugadores (v3.26): mapa del equipo con la posición ideal de cada uno, quién ya contestó sus tests,
// y lo que opinan de tus entrenos (después de cada entreno y la encuesta del mes, con nombre).
import { h, ic, fmtDate, todayStr, addDays, plural, shareText } from '../util.js';
import { state, players, sql326Ready, group } from '../store.js';
import { note, empty, sectionTitle, jersey } from './ui.js';
import { BRANCHES } from '../content/skills.js';
import { TESTS, TEST_BY, teamMap, POS_INFO, FACES, RETRO_TAG, MES_CATS, MES_OPEN, monthSummary, scoreMes, PERFIL_SOURCES } from '../content/perfiles.js';
import { profileOf, resultOf, positionCard, surveysOf, isStale } from './conoceme.js';

const appLink = (hash = '') => `${location.origin}${location.pathname}${hash}`;
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r1 = (x) => (x == null ? '—' : (Math.round(x * 10) / 10).toFixed(1));
const faceOf = (v) => FACES[Math.max(0, Math.min(4, Math.round(v) - 1))][0];
const nameOf = (pid) => state.data.players.find((p) => p.id === pid)?.name || 'Jugador';
const sqlNote = () => note('Para usar «Conocer a mis jugadores», corre en Supabase el bloque «v3.26» de sql/instalar.sql (SQL Editor → pega → Run). No borra nada.', 'warn');

export default function perfiles(ctx) {
  const ui = ctx.ui; ui.tab ||= ctx.args[0] === 'retro' ? 'retro' : 'equipo';
  if (!sql326Ready()) return { title: 'Conocer a mis jugadores', back: '#/mas', el: h('div', { class: 'page' }, sqlNote()) };
  const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Secciones' }, [['equipo', 'Mis jugadores'], ['retro', 'Lo que opinan de mí']].map(([k, t]) =>
    h('button', { type: 'button', role: 'tab', 'aria-selected': ui.tab === k ? 'true' : 'false', onclick: () => { ui.tab = k; ctx.rerender(); } }, t)));
  return { title: 'Conocer a mis jugadores', back: '#/mas', el: h('div', { class: 'page' }, tabs, ui.tab === 'retro' ? retroTab(ctx) : teamTab(ctx)) };
}

// ---------- mis jugadores ----------
function inviteText() {
  return `Equipo ${group()?.name || ''}: en Remate ya están los tests «Conóceme» (tu posición ideal, tu mente en la cancha, por qué juegas, tu rol y más). Son cortos y no son examen. Ábrelos aquí: ${appLink('#/conoceme')}`;
}
function teamTab(ctx) {
  const ui = ctx.ui, all = players();
  if (!all.length) return empty('Sin jugadores', 'Agrega jugadores para ver su perfil.');
  const branches = [...new Set(all.map((p) => p.branch).filter(Boolean))];
  ui.branch ||= branches.length > 1 ? branches[0] : 'todos';
  const list = all.filter((p) => ui.branch === 'todos' || p.branch === ui.branch).map((p) => ({ player: p, pf: profileOf(p) }));
  // En el mapa solo cuentan los que tienen datos suficientes (confianza media o alta).
  const map = teamMap(list.map((x) => ({ player: x.player, pos: x.pf.pos.ranking.length && x.pf.pos.confidence !== 'baja' ? x.pf.pos : null, current: x.player.position })));
  const done = list.filter((x) => TESTS.every((t) => x.pf.rows[t.kind])).length, none = list.filter((x) => !TESTS.some((t) => x.pf.rows[t.kind])).length;
  const stale = list.filter((x) => TESTS.some((t) => isStale(x.pf.rows[t.kind]))).length;
  const STATE = { falta: ['bad', 'Falta'], justo: ['warn', 'Justo'], ok: ['ok', 'Cubierto'], sobra: ['info', 'De sobra'] };
  return h('div', { class: 'stack' },
    h('section', { class: 'band next' }, h('div', { class: 'when' }, 'Conoce a tus jugadores'), h('h2', {}, `${done} de ${list.length} con todos sus tests`),
      h('div', {}, `${none ? `${plural(none, 'no ha', 'no han')} empezado. ` : ''}${stale ? `${plural(stale, 'jugador ya toca', 'jugadores ya tocan')} repetir (cada 3 meses).` : 'Ellos contestan en su celular, en Inicio → Conóceme.'}`),
      h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn', onclick: () => shareText(inviteText()) }, ic('send', 18), 'Pedir que contesten'),
        h('a', { class: 'btn ghost', href: '#/pruebas' }, ic('ruler', 18), 'Medir alcance y envergadura'))),
    branches.length > 1 ? h('div', { class: 'seg', role: 'group', 'aria-label': 'Rama' }, [...branches.map((b) => [b, BRANCHES[b]]), ['todos', 'Todos']].map(([k, t]) =>
      h('button', { type: 'button', 'aria-pressed': ui.branch === k ? 'true' : 'false', onclick: () => { ui.branch = k; ctx.rerender(); } }, t))) : null,
    h('section', { class: 'panel stack' }, h('h3', {}, 'Mapa del equipo (sistema 5-1)'),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Según la posición ideal de cada quien (solo los que ya tienen datos suficientes): en negritas su mejor opción y en gris la segunda. Un 5-1 pide 1 a 2 colocadores, 2 a 3 centrales, 2 a 3 puntas, 1 a 2 opuestos y 1 a 2 líberos.'),
      h('div', { class: 'pf-map' }, map.map((m) => h('div', { class: `pf-mrow s-${m.state}` },
        h('div', { class: 'split' }, h('strong', {}, m.name), h('span', { class: `chip ${STATE[m.state][0]}` }, `${STATE[m.state][1]} · ${m.first.length}`)),
        h('div', { class: 'pf-names' }, m.first.map((x) => h('b', {}, x.player.name.split(' ')[0])), m.second.map((x) => h('span', {}, x.player.name.split(' ')[0])),
          !m.first.length && !m.second.length ? h('span', { class: 'row-sub' }, 'Nadie todavía') : null),
        m.now.length ? h('small', { class: 'row-sub' }, `Hoy juegan aquí: ${m.now.map((x) => x.player.name.split(' ')[0]).join(', ')}`) : null)))),
    sectionTitle('Cada jugador'),
    h('div', { class: 'rows' }, list.map(({ player: p, pf }) => {
      const n = TESTS.filter((t) => pf.rows[t.kind]).length, top = pf.pos.top[0];
      return h('a', { class: 'row', href: `#/jugador/${p.id}/perfil` }, jersey(p),
        h('span', { class: 'row-main' }, h('strong', {}, p.name), h('span', { class: 'row-sub' }, [top ? `Ideal: ${top.name} (${top.score}%)` : 'Sin posición calculada', pf.rol ? pf.rol.top.name : null, pf.motivo ? `juega por ${pf.motivo.name.toLowerCase()}` : null].filter(Boolean).join(' · '))),
        h('span', { class: 'row-end' }, h('span', { class: `chip ${n === TESTS.length ? 'ok' : n ? 'warn' : ''}` }, `${n}/${TESTS.length}`), TESTS.some((t) => isStale(pf.rows[t.kind])) ? h('span', { class: 'chip warn' }, 'Repetir') : null, ic('chevron-right', 18)));
    })),
    h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'De dónde sale')),
      h('ul', { class: 'plain' }, PERFIL_SOURCES.map(([t, u]) => h('li', {}, h('a', { href: u, target: '_blank', rel: 'noopener noreferrer' }, t)))),
      h('p', { class: 'row-sub' }, 'La posición ideal es una propuesta de Remate: combina medidas, pruebas, tu evaluación y los gustos del jugador con pesos por posición. Los tests de mente y motivación usan preguntas propias inspiradas en el ACSI-28 y el TEOSQ; no son diagnósticos. Son menores: avisa a las familias para qué sirven.')));
}

// Pestaña «Perfil» en la ficha del jugador.
export function profileTab(p) {
  if (!sql326Ready()) return sqlNote();
  const pf = profileOf(p);
  const any = TESTS.some((t) => pf.rows[t.kind]);
  const retro = surveysOf(p.id).filter((r) => (r.kind === 'retro_entreno' || r.kind === 'retro_mes') && (r.comment || r.answers?.face)).slice(0, 5);
  return h('div', { class: 'stack' },
    positionCard(pf, p, { coach: true }),
    ...TESTS.filter((t) => t.kind !== 'posicion').map((t) => resultOf(t.kind, pf, p, { coach: true })).filter(Boolean),
    !any ? note(`${p.name} aún no contesta sus tests. Los encuentra en su Inicio → Conóceme.`, 'info') : null,
    h('p', { class: 'row-sub', style: { margin: 0 } }, `Tests: ${TESTS.map((t) => `${TEST_BY[t.kind].name} ${pf.rows[t.kind] ? (isStale(pf.rows[t.kind]) ? '(repetir)' : '✓') : '—'}`).join(' · ')}`),
    retro.length ? h('section', { class: 'panel stack' }, h('h3', {}, 'Lo que te ha dicho'),
      h('div', { class: 'rows' }, retro.map((r) => h('div', { class: 'row' }, h('span', { class: 'row-main' },
        h('span', { class: 'row-sub' }, `${fmtDate(String(r.created_at).slice(0, 10), { day: 'numeric', month: 'short' })} · ${r.kind === 'retro_mes' ? 'Encuesta del mes' : `Entreno ${r.answers?.face ? faceOf(r.answers.face) : ''}`}`),
        r.comment ? h('span', { style: { whiteSpace: 'pre-line' } }, r.comment) : h('span', { class: 'row-sub' }, (r.answers?.tags || []).map((k) => RETRO_TAG[k]).filter(Boolean).join(', ') || 'Sin comentario')))))) : null);
}

// ---------- lo que opinan de mí ----------
function retroTab(ctx) {
  const ui = ctx.ui, rows = state.data.surveys || [];
  const per = rows.filter((r) => r.kind === 'retro_entreno' && r.session_id);
  const sess = state.data.sessions.filter((s) => per.some((r) => r.session_id === s.id)).sort((a, b) => b.session_date.localeCompare(a.session_date));
  const months = [...new Set(rows.filter((r) => r.kind === 'retro_mes').map((r) => r.period))].sort().reverse();
  ui.month ||= months[0] || todayStr().slice(0, 7);
  const mrows = rows.filter((r) => r.kind === 'retro_mes' && r.period === ui.month);
  const prevMonth = months[months.indexOf(ui.month) + 1];
  const ms = monthSummary(mrows), pms = prevMonth ? monthSummary(rows.filter((r) => r.kind === 'retro_mes' && r.period === prevMonth)) : null;
  const recent = per.filter((r) => String(r.created_at).slice(0, 10) >= addDays(todayStr(), -30));
  const recentAvg = avg(recent.map((r) => Number(r.answers?.face)).filter((x) => x > 0));
  const active = players();
  const missing = active.filter((p) => !mrows.some((r) => r.player_id === p.id));
  const reminder = () => shareText(`Equipo: ya está la encuesta de ${fmtDate(`${ui.month}-01`, { month: 'long' })} en Remate. Son 5 minutos para decirme qué les gusta y qué cambiarían de los entrenos. Me ayuda mucho: ${appLink('#/conoceme/mes')}`);
  return h('div', { class: 'stack' },
    h('section', { class: 'band next' }, h('div', { class: 'when' }, 'Después de cada entreno · últimos 30 días'),
      h('h2', {}, recentAvg ? `${faceOf(recentAvg)} ${r1(recentAvg)} de 5` : 'Sin respuestas todavía'),
      h('div', {}, recent.length ? `${plural(recent.length, 'respuesta', 'respuestas')} de tus jugadores. Ellos contestan en su Inicio al terminar el entreno.` : 'Al terminar cada entreno, tus jugadores ven en su Inicio «¿Qué tal estuvo el entreno?».')),
    sess.length ? h('section', { class: 'panel stack' }, h('h3', {}, 'Por entreno'),
      h('div', { class: 'rows' }, sess.slice(0, ui.allS ? 40 : 8).map((s) => {
        const rs = per.filter((r) => r.session_id === s.id), a = avg(rs.map((r) => Number(r.answers?.face)).filter((x) => x > 0));
        const tags = {}; rs.forEach((r) => (r.answers?.tags || []).forEach((k) => { tags[k] = (tags[k] || 0) + 1; }));
        const topT = Object.entries(tags).sort((x, y) => y[1] - x[1]).slice(0, 3);
        const coms = rs.filter((r) => r.comment);
        return h('details', { class: 'hx' }, h('summary', {}, h('span', { class: 'pf-face' }, a ? faceOf(a) : '·'),
          h('span', { class: 'row-main' }, h('strong', {}, `${s.title || 'Entreno'} · ${fmtDate(s.session_date, { weekday: 'short', day: 'numeric', month: 'short' })}`),
            h('span', { class: 'row-sub' }, `${r1(a)} de 5 · ${plural(rs.length, 'respuesta', 'respuestas')}${topT.length ? ` · ${topT.map(([k, n]) => `${RETRO_TAG[k]} (${n})`).join(', ')}` : ''}${coms.length ? ` · ${plural(coms.length, 'comentario', 'comentarios')}` : ''}`))),
          h('div', { class: 'rows' }, rs.map((r) => h('div', { class: 'row' }, h('span', { class: 'pf-face' }, faceOf(r.answers?.face || 3)), h('span', { class: 'row-main' }, h('strong', {}, nameOf(r.player_id)),
            h('span', { class: 'row-sub' }, [(r.answers?.tags || []).map((k) => RETRO_TAG[k]).join(', '), r.comment].filter(Boolean).join(' — ') || 'Sin comentario'))))));
      })),
      sess.length > 8 && !ui.allS ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { ui.allS = true; ctx.rerender(); } }, 'Ver más') : null) : null,
    h('section', { class: 'panel stack' },
      h('div', { class: 'split' }, h('h3', {}, 'Encuesta del mes'),
        months.length > 1 ? h('select', { 'aria-label': 'Mes', onchange: (e) => { ui.month = e.target.value; ctx.rerender(); } }, months.map((m) => h('option', { value: m, selected: m === ui.month }, fmtDate(`${m}-01`, { month: 'long', year: 'numeric' })))) : null),
      ms.n ? [
        h('p', { style: { margin: 0 } }, h('strong', {}, `${r1(ms.avg)} de 5 en promedio`), ` · ${plural(ms.n, 'respuesta', 'respuestas')}${ms.nps != null ? ` · Recomendarían el equipo: ${ms.nps > 0 ? '+' : ''}${ms.nps}` : ''}`),
        h('div', { class: 'pf-rank' }, ms.cats.filter((c) => c.avg != null).map((c) => { const pc = pms?.cats.find((x) => x.k === c.k)?.avg, d = pc != null ? c.avg - pc : null;
          return h('div', { class: 'pf-row w' }, h('span', {}, c.name), h('span', { class: `pf-bar ${c.avg >= 4 ? 'ok' : c.avg >= 3 ? 'mid' : 'low'}` }, h('i', { style: { width: `${((c.avg - 1) / 4) * 100}%` } })),
            h('b', {}, `${r1(c.avg)}${d != null && Math.abs(d) >= 0.2 ? (d > 0 ? ' ▲' : ' ▼') : ''}`)); })),
        h('p', { class: 'row-sub', style: { margin: 0 } }, `1 = nada de acuerdo, 5 = totalmente.${pms ? ' ▲▼ contra el mes anterior.' : ''} La recomendación va de −100 a +100 (los que darían 9 o 10 menos los que darían 0 a 6).`),
        lowest(ms),
        ...MES_OPEN.map(([k, q]) => { const ans = mrows.filter((r) => r.answers?.[k]); return ans.length ? h('details', { class: 'hx' }, h('summary', {}, h('strong', {}, q), h('span', { class: 'row-sub' }, ` (${ans.length})`)),
          h('ul', { class: 'plain' }, ans.map((r) => h('li', {}, h('b', {}, `${nameOf(r.player_id).split(' ')[0]}: `), r.answers[k])))) : null; }),
        h('details', { class: 'hx' }, h('summary', {}, h('strong', {}, 'Por jugador')), h('div', { class: 'rows' }, mrows.map((r) => { const s = scoreMes(r.answers), a = avg(s.cats.map((c) => c.avg));
          return h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, nameOf(r.player_id)), h('span', { class: 'row-sub' }, s.cats.map((c) => `${c.name} ${r1(c.avg)}`).join(' · '))), h('span', { class: 'row-end' }, h('b', {}, r1(a)))); }))),
      ] : note('Todavía nadie contesta la encuesta de este mes. Se les recuerda en su Inicio desde el día 20, y siempre está en Conóceme.'),
      missing.length && ui.month === todayStr().slice(0, 7) ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Faltan: ${missing.map((p) => p.name.split(' ')[0]).join(', ')}.`) : null,
      h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn', onclick: reminder }, ic('send', 18), 'Recordarles por WhatsApp'))),
    note('Va con nombre, como lo elegiste. Tip: agradece en el siguiente entreno lo que te dijeron y cuéntales qué vas a cambiar; así siguen contestando con honestidad.', 'info'));
}
function lowest(ms) {
  const c = ms.cats.filter((x) => x.avg != null).sort((a, b) => a.avg - b.avg)[0];
  if (!c || c.avg >= 4) return h('p', { style: { margin: 0 } }, '👏 Todo arriba de 4: tus jugadores están contentos con los entrenos.');
  const TIP = { entrenos: 'Varía los ejercicios, mete más juego y competencias cortas, y reduce las filas largas.', explica: 'Una sola instrucción a la vez, demuéstralo y pregunta «¿qué vas a cambiar?».', trato: 'Reparte la atención: habla con cada jugador al menos una vez por entreno, no solo con los titulares.', motiva: 'Señala avances concretos y pon metas cortas que puedan lograr.', orden: 'Publica el plan antes y avisa los cambios con tiempo desde Avisos.' };
  return h('p', { style: { margin: 0 } }, h('strong', {}, `Lo más bajo: ${c.name.toLowerCase()} (${r1(c.avg)}). `), TIP[c.k]);
}
// Línea para el Hoy del entrenador: cómo les pareció el último entreno.
export function retroHoyLine() {
  if (!sql326Ready()) return null;
  const per = (state.data.surveys || []).filter((r) => r.kind === 'retro_entreno' && String(r.created_at).slice(0, 10) >= addDays(todayStr(), -7));
  if (!per.length) return null;
  const last = state.data.sessions.filter((s) => per.some((r) => r.session_id === s.id)).sort((a, b) => b.session_date.localeCompare(a.session_date))[0];
  if (!last) return null;
  const rs = per.filter((r) => r.session_id === last.id), a = avg(rs.map((r) => Number(r.answers?.face)).filter((x) => x > 0)), c = rs.filter((r) => r.comment).length;
  return h('a', { class: 'panel', href: '#/perfiles/retro', style: { textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' } },
    h('span', { class: 'pf-face', 'aria-hidden': 'true' }, faceOf(a || 3)),
    h('span', { class: 'row-main' }, h('strong', {}, `Tu entreno del ${fmtDate(last.session_date, { weekday: 'long' })}: ${r1(a)} de 5`), h('span', { class: 'row-sub' }, `${plural(rs.length, 'jugador opinó', 'jugadores opinaron')}${c ? `, ${plural(c, 'comentario', 'comentarios')}` : ''}.`)),
    ic('chevron-right', 18));
}
export const _perfCoach = { teamTab };
