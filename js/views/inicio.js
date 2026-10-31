// Inicio del jugador: su tarjeta, el próximo entrenamiento, qué le falta para subir y su asistencia.
import { h, ic, plural, fmtDate, todayStr } from '../util.js';
import { state, settings, sessions } from '../store.js';
import { nextSession, planMinutes, focusOf } from '../calc.js';
import { SKILL_BY_ID } from '../content/skills.js';
import { CHALLENGES } from '../content/challenges.js';
import { getExercise } from '../content/exercises.js';
import { dots, sectionTitle, empty, note, statusChip, sessionWhen } from './ui.js';
import { playerCard, playerStats, badgesEl } from './card.js';
import { homeWeek, planOf } from './casa.js';
import { gymVisible, gymLine, coachPlanOf } from './gym.js';
import { unseenBanner } from './avisos.js';
import { isStaff } from '../store.js';
import { PTESTS, testTrend } from '../content/gym.js';

const getEx = (id) => getExercise(id, state.data.customEx);

export default function inicio(ctx) {
  const me = ctx.me;
  if (!me) return { title: 'Inicio', el: h('div', { class: 'page' }, empty('Tu cuenta ya no está ligada a un jugador', 'Pasa cuando tu entrenador generó un código nuevo o cambió tus datos. Pídele tu código actual y vuelve a entrar.',
    h('a', { class: 'btn primary', href: '#/ajustes' }, 'Ir a Ajustes'))) };
  const stats = playerStats(me), { gap, att } = stats;
  const el = h('div', { class: 'page' }, unseenBanner(ctx),
    isStaff() ? h('a', { class: 'labcard', href: '#/asistir' }, h('span', { class: 'lc-ic' }, ic('clipboard-check', 26)),
      h('span', { class: 'lc-t' }, h('strong', {}, 'Modo capitán'), h('span', {}, 'Pasa lista y captura los partidos del equipo.')), ic('chevron-right', 20)) : null,
    playerCard(me, stats));

  // próximo entrenamiento publicado
  const next = nextSession(sessions());
  if (next) {
    const plan = next.plan || [], focus = focusOf(next, getEx);
    el.append(h('section', { class: 'panel stack' },
      h('div', {}, h('div', { class: 'row-sub' }, 'Tu próximo entrenamiento'), h('h2', {}, next.title || 'Entrenamiento'), h('div', {}, `${sessionWhen(next)}, ${next.minutes} min`)),
      focus.length ? h('div', { class: 'cluster' }, focus.map((k) => h('span', { class: 'chip info' }, SKILL_BY_ID[k].name))) : null,
      plan.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Vamos a trabajar: ${plan.map((b) => (b.ex ? getEx(b.ex)?.name : b.text)).filter(Boolean).slice(0, 4).join(', ')}${plan.length > 4 ? ' y más' : ''}.`) : null,
      h('a', { class: 'btn', href: '#/entrenos' }, ic('calendar-days', 18), 'Ver el plan completo')));
  } else {
    el.append(note('Tu entrenador todavía no publica el siguiente entrenamiento. Cuando lo haga, lo verás aquí.'));
  }

  // camino al siguiente nivel
  if (gap.top) {
    el.append(note('Estás en el nivel más alto. Mantén tu nivel, cuida tu cuerpo y ayuda a tus compañeros.'));
  } else {
    el.append(h('section', {}, sectionTitle(`Para llegar al nivel ${gap.target}`, h('a', { class: 'btn ghost sm', href: '#/ruta' }, 'Ver la ruta')),
      gap.ready ? note(`Ya cumples las fases que pide el nivel ${gap.target}, ${gap.targetLevel.name}. Pídele a tu entrenador el examen.`) : null,
      h('div', { class: 'rows', style: { marginTop: gap.ready ? '10px' : 0 } }, gap.rows.filter((r) => !r.na).map((r) => h('div', { class: 'row' },
        h('span', { class: 'row-main' }, h('strong', {}, r.name), h('span', { class: 'row-sub' }, r.have ? `Vas en fase ${r.have}, se pide fase ${r.need || 1}` : 'Aún sin evaluar')),
        h('span', { class: 'row-end' }, dots(r.have, r.need), h('span', { class: `chip ${r.ok ? 'ok' : 'warn'}` }, r.ok ? 'Listo' : r.have ? `Falta ${r.need - r.have}` : 'Pendiente')))))));
  }

  // insignias
  el.append(badgesEl(me));

  // pruebas físicas
  const myTests = state.data.playerTests.filter((t) => t.player_id === me.id);
  if (myTests.length) {
    const kinds = Object.keys(PTESTS).filter((k) => k !== 'estatura' && myTests.some((t) => t.kind === k));
    el.append(h('a', { class: 'panel', href: '#/pruebas', style: { textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' } },
      ic('ruler', 26), h('span', { class: 'row-main' }, h('strong', {}, 'Tus pruebas físicas'),
        h('span', { class: 'row-sub' }, kinds.map((k) => { const tr = testTrend(myTests, k); return `${PTESTS[k].short}: ${Number(tr.last)} ${PTESTS[k].unit}${tr.n > 1 && tr.d ? ` (${tr.d > 0 ? '+' : ''}${tr.d})` : ''}`; }).join(' · ') || 'Ver tus resultados')), ic('chevron-right', 18)));
  }

  // en casa (opcional)
  const hw = homeWeek(me.id), hp = planOf(me);
  el.append(h('a', { class: 'panel', href: '#/casa', style: { textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' } },
    ic('house', 26), h('span', { class: 'row-main' }, h('strong', {}, 'Entrena en casa (opcional)'),
      h('span', { class: 'row-sub' }, hp.items.length ? `Tu entrenador te dejó tarea de casa (${plural(hp.items.length, 'cosa', 'cosas')}).${hw.days ? ` Esta semana llevas ${plural(hw.days, 'día', 'días')}.` : ''}` : hw.days ? `Esta semana llevas ${plural(hw.days, 'día', 'días')}. ¡Sigue así!` : 'Rutinas cortas de físico y técnica, con o sin balón.')),
      hp.items.length ? h('span', { class: 'chip ball' }, 'Tarea') : null, ic('chevron-right', 18)));

  // gym (si el entrenador lo tiene activado)
  if (gymVisible() || ctx.self) {
    el.append(h('a', { class: 'panel', href: '#/gym', style: { textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' } },
      ic('dumbbell', 26), h('span', { class: 'row-main' }, h('strong', {}, 'Físico en el gym'), h('span', { class: 'row-sub' }, gymLine(me))),
      coachPlanOf(me) ? h('span', { class: 'chip ball' }, 'Rutina') : null, ic('chevron-right', 18)));
  }

  // retos
  const pend = state.data.claims.filter((c) => c.player_id === me.id && c.status === 'solicitada').length;
  const avail = CHALLENGES.filter((c) => c.levels[0] <= me.level && me.level <= c.levels[1]).length;
  el.append(h('a', { class: 'panel', href: '#/ruta/retos', style: { textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' } },
    ic('trophy', 26), h('span', { class: 'row-main' }, h('strong', {}, 'Retos para ganar puntos XP'),
      h('span', { class: 'row-sub' }, pend ? `${plural(pend, 'reto espera', 'retos esperan')} la aprobación de tu entrenador.` : `${plural(avail, 'reto disponible', 'retos disponibles')} para tu nivel.`)), ic('chevron-right', 18)));

  // asistencia reciente
  const recent = [...att.line].reverse().slice(0, 5);
  if (recent.length) {
    el.append(h('section', {}, sectionTitle('Tu asistencia', h('span', { class: 'chip' }, att.pct == null ? 'Sin dato' : `${att.pct}%`)),
      h('div', { class: 'rows' }, recent.map(({ session: s, status }) => h('div', { class: 'row' },
        h('span', { class: 'row-main' }, h('strong', {}, s.title || 'Entrenamiento'), h('span', { class: 'row-sub' }, fmtDate(s.session_date))), h('span', { class: 'row-end' }, statusChip(status)))))));
  }
  return { title: 'Inicio', el };
}
