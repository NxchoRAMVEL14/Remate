// Ficha de un jugador (vista del entrenador): tarjeta, acciones y cuatro pestañas.
import { h, ic, toast, fmtDate, plural, confirmSheet } from '../util.js';
import { state, getPlayer, settings, remove, resolveClaim, patch, teamReady } from '../store.js';
import { testsPanel } from './pruebas.js';
import { homePlanSheet, planOf } from './casa.js';
import { refName } from '../content/casa.js';
import { currentRatings, ratingHistory } from '../calc.js';
import { SKILLS, PHASES } from '../content/skills.js';
import { required } from '../content/levels.js';
import { CHALLENGE_BY_ID } from '../content/challenges.js';
import { dots, statusChip, sectionTitle, empty, note } from './ui.js';
import { playerCard, playerStats, badgesEl } from './card.js';
import { playerFormSheet, deletePlayer, evaluateSheet, examSheet, codeSheet, noteSheet } from './sheets-player.js';

const TABS = [['resumen', 'Resumen'], ['habilidades', 'Habilidades'], ['pruebas', 'Pruebas'], ['asistencia', 'Asistencia'], ['notas', 'Notas']];

export default function jugador(ctx) {
  const p = getPlayer(ctx.args[0]);
  if (!p) return { title: 'Jugador', back: '#/jugadores', el: h('div', { class: 'page' }, empty('No encontré a ese jugador', 'Puede que se haya eliminado.', h('a', { class: 'btn', href: '#/jugadores' }, 'Ver jugadores'))) };
  const ui = ctx.ui; ui.tab ??= 'resumen';
  if (!ui.init) { ui.init = true; if (TABS.some(([id]) => id === ctx.args[1])) ui.tab = ctx.args[1]; }
  const stats = playerStats(p);
  const { gap, att } = stats;

  const actions = h('div', { class: 'stack' },
    h('div', { class: 'cluster' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => evaluateSheet(p) }, ic('clipboard-check', 18), 'Evaluar'),
      p.level < 6 ? h('button', { class: `btn ${gap.ready ? 'ball' : ''}`, type: 'button', onclick: () => examSheet(p) }, ic('flag', 18), gap.ready ? `Examen al nivel ${gap.target} (listo)` : `Examen al nivel ${gap.target}`) : null),
    h('div', { class: 'cluster' },
      h('button', { class: 'btn sm', type: 'button', onclick: () => codeSheet(p) }, ic('lock', 16), p.user_id ? 'Código de acceso' : 'Código (sin usar)'),
      h('button', { class: 'btn sm', type: 'button', onclick: () => noteSheet(p) }, ic('pencil', 16), 'Nota'),
      h('button', { class: 'btn sm', type: 'button', onclick: () => playerFormSheet(p) }, ic('settings', 16), 'Editar datos'),
      h('a', { class: 'btn sm', href: `#/ver/${p.id}` }, ic('eye', 16), 'Ver como jugador'),
      h('a', { class: 'btn sm', href: `#/comparar/${p.id}` }, ic('arrow-left-right', 16), 'Antes y después'),
      h('button', { class: 'btn sm', type: 'button', disabled: teamReady() ? null : true, onclick: () => homePlanSheet(p) }, ic('house', 16), planOf(p).items.length ? 'Tarea de casa' : 'Dejar tarea de casa'),
      h('label', { class: 'check captain', title: 'El capitán puede pasar lista y capturar partidos desde su celular' },
        h('input', { type: 'checkbox', checked: p.captain ? true : null, disabled: teamReady() ? null : true,
          onchange: (e) => { patch('players', p.id, { captain: e.target.checked }); toast(e.target.checked ? `${p.name} ahora es capitán: puede pasar lista y capturar partidos` : `${p.name} ya no es capitán`, 3200); } }),
        h('span', {}, 'Capitán (ayudante)')),
      h('button', { class: 'btn sm danger', type: 'button', onclick: async () => { if (await deletePlayer(p)) location.hash = '#/jugadores'; } }, ic('trash-2', 16), 'Eliminar')));

  const panel = h('div', { class: 'stack', role: 'tabpanel' });
  const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Secciones del jugador' }, TABS.map(([id, label]) =>
    h('button', { type: 'button', role: 'tab', 'aria-selected': String(ui.tab === id), onclick: () => { ui.tab = id; paint(); } }, label)));
  function paint() {
    [...tabs.children].forEach((b, i) => b.setAttribute('aria-selected', String(TABS[i][0] === ui.tab)));
    panel.replaceChildren(({ resumen, habilidades, pruebas: (pp) => testsPanel(pp, { canEdit: true }), asistencia, notas })[ui.tab](p, stats));
  }
  paint();
  return { title: p.name, back: '#/jugadores', el: h('div', { class: 'page' }, playerCard(p, stats), actions, h('div', { class: 'stack' }, tabs, panel)) };
}

// ---------- pestañas ----------
function resumen(p, { gap }) {
  const d = state.data, out = h('div', { class: 'stack' });
  const plan = planOf(p);
  if (plan.items.length) out.append(note(`Tarea de casa: ${plan.items.map((x) => `${refName(x.ref)} (${x.times || 2} por semana)`).join(', ')}.`));
  const b = badgesEl(p, { you: false });
  if (b) out.append(b);
  if (gap.top) out.append(note('Está en el nivel más alto de la ruta. Lo que sigue es mantener su nivel, cuidar su cuerpo y ayudar a los demás.'));
  else {
    out.append(sectionTitle(`Camino al nivel ${gap.target}, ${gap.targetLevel.name}`, h('span', { class: `chip ${gap.ready ? 'ball' : ''}` }, `${gap.met} de ${gap.total} fases`)),
      h('div', { class: 'rows' }, gap.rows.map((r) => h('div', { class: 'row' },
        h('span', { class: 'row-main' }, h('strong', {}, r.name),
          h('span', { class: 'row-sub' }, r.na ? 'No se exige a su posición' : r.have ? `Va en fase ${r.have}, se pide fase ${r.need || 1}` : 'Sin evaluar')),
        h('span', { class: 'row-end' }, r.na ? null : dots(r.have, r.need), r.na ? h('span', { class: 'chip' }, 'N/A') : h('span', { class: `chip ${r.ok ? 'ok' : 'warn'}` }, r.ok ? 'Cumple' : r.have ? `Falta ${r.need - r.have}` : 'Pendiente'))))),
      gap.ready ? note(`Cumple todas las fases del nivel ${gap.target}. Puede presentar el examen.`) : note('El nivel solo sube con el examen práctico. Las fases dicen cuándo conviene presentarlo.'));
  }
  const claims = d.claims.filter((c) => c.player_id === p.id).sort((a, b) => String(b.claimed_at).localeCompare(String(a.claimed_at)));
  out.append(sectionTitle('Retos'), claims.length
    ? h('div', { class: 'rows' }, claims.slice(0, 8).map((c) => { const ch = CHALLENGE_BY_ID[c.challenge_id]; if (!ch) return null;
      return h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, ch.name), h('span', { class: 'row-sub' }, `${ch.xp} XP, ${fmtDate(String(c.claimed_at).slice(0, 10), { day: 'numeric', month: 'short' })}`)),
        h('span', { class: 'row-end' }, c.status === 'solicitada'
          ? [h('button', { class: 'btn sm primary', type: 'button', onclick: () => { resolveClaim(c.id, true); toast('Reto aprobado'); } }, 'Aprobar'), h('button', { class: 'btn sm', type: 'button', onclick: () => { resolveClaim(c.id, false); toast('Reto rechazado'); } }, 'Rechazar')]
          : h('span', { class: `chip ${c.status === 'aprobada' ? 'ok' : 'bad'}` }, c.status === 'aprobada' ? 'Aprobado' : 'Rechazado')));
    }))
    : note('Todavía no ha pedido ningún reto.'));
  const exams = d.exams.filter((e) => e.player_id === p.id).sort((a, b) => `${b.taken_at}${b.created_at}`.localeCompare(`${a.taken_at}${a.created_at}`));
  out.append(sectionTitle('Exámenes'), exams.length
    ? h('div', { class: 'rows' }, exams.map((e) => h('div', { class: 'row' },
      h('span', { class: 'row-main' }, h('strong', {}, `Examen al nivel ${e.level}`), h('span', { class: 'row-sub' }, [fmtDate(e.taken_at, { day: 'numeric', month: 'short', year: 'numeric' }), e.note].filter(Boolean).join('. '))),
      h('span', { class: 'row-end' }, h('span', { class: `chip ${e.passed ? 'ok' : 'warn'}` }, e.passed ? 'Aprobado' : 'Aún no')))))
    : note('Todavía no ha presentado exámenes.'));
  return out;
}

function habilidades(p) {
  const d = state.data, cur = currentRatings(p.id, d.ratings);
  return h('div', { class: 'rows' }, SKILLS.map((s) => {
    const need = required(p.position, s.id, Math.min(6, p.level + 1)), have = cur[s.id] || 0;
    const hist = ratingHistory(p.id, s.id, d.ratings);
    const last = hist[hist.length - 1];
    return h('div', { class: 'skill' },
      h('div', { class: 'head' }, h('strong', {}, s.name),
        need === null ? h('span', { class: 'chip' }, 'No se exige a su posición') : [dots(have, need || 0), h('span', { class: 'chip' }, have ? `Fase ${have}, ${PHASES[have - 1].name}` : 'Sin evaluar')]),
      have ? h('div', { class: 'phase' }, s.phases[have - 1]) : h('div', { class: 'phase' }, s.desc),
      hist.length > 1 ? h('div', { class: 'phase' }, `Historial: ${hist.map((r) => `fase ${r.score} (${fmtDate(r.rated_at, { day: 'numeric', month: 'short' })})`).join(', ')}`) : last ? h('div', { class: 'phase' }, `Evaluada el ${fmtDate(last.rated_at, { day: 'numeric', month: 'short' })}`) : null);
  }));
}

function asistencia(p, { att }) {
  const st = settings(), out = h('div', { class: 'stack' });
  if (!att.line.length) return note('Todavía no hay entrenamientos con lista. Cuando pases lista, aquí aparece su historial.');
  out.append(h('div', { class: 'cluster' },
    h('span', { class: 'chip ok' }, `Presente ${att.presente}`), h('span', { class: 'chip warn' }, `Retardo ${att.retardo}`),
    h('span', { class: 'chip bad' }, `Falta ${att.falta}`), h('span', { class: 'chip info' }, `Justificada ${att.justificada}`)));
  out.append(note(att.pct == null ? 'Aún no hay base para calcular el porcentaje.' :
    `Asistencia ${att.pct}%${att.converted ? `. ${plural(att.retardo, 'retardo cuenta', 'retardos cuentan')}: cada ${st.late_per_absence} retardos suman 1 falta (${plural(att.converted, 'falta extra', 'faltas extra')}).` : '.'} Las faltas justificadas no restan.`));
  out.append(h('div', { class: 'rows' }, [...att.line].reverse().slice(0, 40).map(({ session: s, status }) =>
    h('a', { class: 'row', href: `#/sesion/${s.id}` }, h('span', { class: 'row-main' }, h('strong', {}, s.title || 'Entrenamiento'), h('span', { class: 'row-sub' }, fmtDate(s.session_date))), h('span', { class: 'row-end' }, statusChip(status), ic('chevron-right', 18))))));
  return out;
}

function notas(p) {
  const list = state.data.notes.filter((n) => n.player_id === p.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  if (!list.length) return note('Sin notas. Las notas son privadas: el jugador no las ve.');
  return h('div', { class: 'rows' }, list.map((n) => h('div', { class: 'row', style: { alignItems: 'flex-start' } },
    h('span', { class: 'row-main' }, h('span', {}, n.body), h('span', { class: 'row-sub' }, fmtDate(String(n.created_at).slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }))),
    h('span', { class: 'row-end' }, h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Borrar nota', onclick: async () => {
      if (await confirmSheet({ title: '¿Borrar esta nota?', text: 'No se puede deshacer.', ok: 'Borrar', danger: true })) { remove('notes', n.id); toast('Nota borrada'); }
    } }, ic('trash-2', 18))))));
}
