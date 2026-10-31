// "¿Qué dice mi radar?": explicación detallada y personal del radar de habilidades, para el jugador (y su entrenador).
import { h, ic, fmtDate } from '../util.js';
import { state, getPlayer, settings, group } from '../store.js';
import { levelGap, radarValues, currentRatings, ratingHistory, attendanceFor } from '../calc.js';
import { LESSONS } from '../content/teoria.js';
import { SKILLS, PHASES, POSITION_NAME, POSITION_ADJUST } from '../content/skills.js';
import { LEVELS } from '../content/levels.js';
import { CHALLENGES } from '../content/challenges.js';
import { allExercises, filterExercises } from '../content/exercises.js';
import { HOME_BY_ID } from '../content/casa.js';
import { radarSVG } from '../radar.js';
import { sectionTitle, note, empty, dots } from './ui.js';

// Consejos prácticos por habilidad (propuesta de Remate) y ejercicios de casa que la trabajan.
const TIPS = {
  saque: ['Lanza el balón siempre igual: a la misma altura y frente al hombro con el que golpeas.', 'Antes de sacar, elige a dónde va. Cuenta cuántos de 10 caen en esa zona y trata de mejorar tu número.'],
  recepcion: ['Llega antes que el balón: muévete primero y para tu cuerpo, después recibe.', 'Inclina la plataforma (los antebrazos) hacia donde quieres mandar el balón; los brazos casi no se mueven.'],
  colocacion: ['Ponte debajo del balón con los pies; las manos en triángulo arriba de la frente.', 'Empuja con piernas, brazos y muñecas a la vez. Practica colocar alto y a la misma zona.'],
  remate: ['Cuida el ritmo de la aproximación: el penúltimo paso es largo y el último corto.', 'Codo arriba de la oreja y golpe arriba y adelante del cuerpo, con la mano abierta encima del balón.'],
  bloqueo: ['Manos arriba antes de saltar y hombros de frente a la red.', 'Mira primero al colocador y después al atacante: así sabes a dónde moverte.'],
  defensa: ['Posición baja y peso adelante en cada balón del rival, aunque parezca que no te va a tocar.', 'Lee al atacante (su brazo y su cuerpo) para dar el primer paso antes.'],
  fisico: ['Calienta siempre y aterriza con las rodillas sobre los pies, nunca hacia adentro.', 'La fuerza de piernas y tronco se gana con constancia: dos o tres rutinas por semana bastan.'],
  juego: ['Habla en cada balón: «mía», «tuya», «libre».', 'Antes de cada saque del rival, pregúntate dónde vas a estar y a quién le pueden colocar.'],
};
const HOME_BY_SKILL = {
  saque: ['h-saque-pared'], recepcion: ['h-antebrazos-pared', 'h-antebrazos-aire', 'h-postura'], colocacion: ['h-dedos-acostado', 'h-dedos-pared'],
  remate: ['h-pared-piso', 'h-aproximacion', 'h-brazo-toalla'], bloqueo: ['h-bloqueo'], defensa: ['h-sombra', 'h-postura'],
  fisico: ['h-sentadilla', 'h-saltitos', 'h-plancha', 'h-equilibrio'], juego: ['h-video'],
};
const phaseName = (n) => (n ? `fase ${n}, ${PHASES[n - 1].name.toLowerCase()}` : 'sin evaluar');

// Cambio de la última evaluación contra la anterior (por fecha distinta).
function change(pid, skill) {
  const hist = ratingHistory(pid, skill, state.data.ratings);
  if (!hist.length) return null;
  const last = hist[hist.length - 1];
  const prev = [...hist].reverse().find((r) => r.rated_at !== last.rated_at);
  return { last, prev, d: prev ? last.score - prev.score : null };
}

function skillCard(p, row, s, open, you) {
  const have = row.have, need = row.na ? null : row.need, ch = change(p.id, s.id);
  const target = levelGap(p, state.data.ratings).target;
  const exs = filterExercises(allExercises(state.data.customEx), { skill: s.id, level: p.level }).slice(0, 3);
  const home = (HOME_BY_SKILL[s.id] || []).map((id) => HOME_BY_ID[id]).filter(Boolean).slice(0, 2);
  const done = new Set(state.data.claims.filter((c) => c.player_id === p.id && c.status === 'aprobada').map((c) => c.challenge_id));
  const retos = CHALLENGES.filter((c) => c.skill === s.id && c.levels[0] <= p.level && p.level <= c.levels[1] && !done.has(c.id)).slice(0, 2);
  const teo = LESSONS.filter((l) => l.skill === s.id).slice(0, 3);
  const chip = row.na ? h('span', { class: 'chip' }, 'No se exige') : !have ? h('span', { class: 'chip' }, 'Sin evaluar')
    : row.ok ? h('span', { class: 'chip ok' }, 'Cumple') : h('span', { class: 'chip warn' }, `Falta ${need - have} ${need - have === 1 ? 'fase' : 'fases'}`);
  const tu = you ? 'tu' : 'su', te = you ? 'te' : 'le';
  return h('details', { class: 'panel rg-skill', open: open ? true : null },
    h('summary', {}, h('span', { class: 'row-main' }, h('strong', {}, s.name), h('span', { class: 'row-sub' }, `Hoy: ${phaseName(have)}${need ? ` · se pide ${need}` : ''}`)),
      h('span', { class: 'row-end' }, row.na ? null : dots(have, need || 0), chip)),
    h('div', { class: 'stack rg-body' },
      have ? h('div', {}, h('h4', {}, you ? 'Lo que ya haces' : 'Lo que ya hace'), h('p', {}, s.phases[have - 1]))
        : h('p', {}, you ? 'Tu entrenador todavía no evalúa esta habilidad. En cuanto lo haga, aquí verás en qué fase vas.' : 'Todavía no evalúas esta habilidad.'),
      row.na ? note(`En ${tu} posición (${POSITION_NAME[p.position]}) esta habilidad no se exige para subir de nivel. Igual sirve practicarla.`)
        : !row.ok && have < 4 ? h('div', {}, h('h4', {}, `Para el nivel ${target} ${te} falta llegar a ${phaseName(need)}`),
          h('p', {}, `El siguiente paso (${phaseName(have + 1)}): ${s.phases[have]}`),
          need > have + 1 ? h('p', {}, `Y después (${phaseName(need)}): ${s.phases[need - 1]}`) : null)
          : have < 4 ? h('div', {}, h('h4', {}, `${you ? 'Ya cumples' : 'Ya cumple'} lo que pide el nivel ${target}. ${you ? 'Tu' : 'Su'} siguiente reto`), h('p', {}, `${phaseName(have + 1)}: ${s.phases[have]}`))
            : h('p', {}, 'Está en la fase más alta. Lo que sigue es mantenerla en partidos difíciles y ayudar a los demás.'),
      ch?.prev ? h('p', { class: 'row-sub' }, ch.d > 0 ? `Mejoró: de fase ${ch.prev.score} a fase ${ch.last.score} (evaluación del ${fmtDate(ch.last.rated_at, { day: 'numeric', month: 'short' })}).`
        : ch.d === 0 ? `Igual que en la evaluación anterior (fase ${ch.last.score}).` : `En la última evaluación quedó en fase ${ch.last.score} (antes ${ch.prev.score}).${you ? ' Pregúntale a tu entrenador qué observó.' : ''}`) : null,
      h('div', {}, h('h4', {}, 'Cómo mejorar'), h('ul', { class: 'plain' }, (TIPS[s.id] || []).map((t) => h('li', {}, t)))),
      exs.length ? h('div', {}, h('h4', {}, 'En el entrenamiento'), h('div', { class: 'cluster' }, exs.map((e) => h('a', { class: 'chip info', href: `#/ejercicio/${e.id}` }, e.name)))) : null,
      home.length ? h('div', {}, h('h4', {}, 'En casa (opcional)'), h('div', { class: 'cluster' }, home.map((e) => h('a', { class: 'chip', href: '#/casa' }, e.name)))) : null,
      teo.length ? h('div', {}, h('h4', {}, 'Para entenderla (Teoría)'), h('div', { class: 'cluster' }, teo.map((l) => h('a', { class: 'chip info', href: `#/teoria/${l.id}` }, l.name)))) : null,
      retos.length ? h('div', {}, h('h4', {}, 'Retos de esta habilidad'), h('div', { class: 'cluster' }, retos.map((c) => h('a', { class: 'chip ball', href: c.teo ? `#/teoria/examen/${c.teo}` : '#/ruta/retos' }, `${c.name} (+${c.xp} XP)`)))) : null));
}

export default function radarGuia(ctx) {
  const coach = ctx.role === 'coach';
  const p = coach ? getPlayer(ctx.args[0]) : ctx.me;
  const back = coach ? (p ? `#/jugador/${p.id}` : '#/jugadores') : '#/inicio';
  if (!p) return { title: 'Tu radar', back, el: h('div', { class: 'page' }, empty('No encontré al jugador', null)) };
  const you = !coach;
  const d = state.data, gap = levelGap(p, d.ratings), rv = radarValues(p, d.ratings), cur = currentRatings(p.id, d.ratings);
  const rated = rv.values.some((v) => v > 0);
  const lastDate = d.ratings.filter((r) => r.player_id === p.id).map((r) => r.rated_at).sort().pop();
  const rows = gap.rows.map((r) => ({ ...r, s: SKILLS.find((x) => x.id === r.skill) }));
  const pending = rows.filter((r) => !r.na && !r.ok).sort((a, b) => (b.need - b.have) - (a.need - a.have) || SKILLS.indexOf(a.s) - SKILLS.indexOf(b.s));
  const top = Math.max(0, ...rows.map((r) => r.have));
  const strong = top ? rows.filter((r) => r.have === top) : [];
  const even = strong.length === rows.filter((r) => r.have > 0).length && strong.length > 2;   // todas en la misma fase
  const adj = POSITION_ADJUST[p.position] || {};
  const adjText = Object.entries(adj).map(([k, v]) => { const n = SKILLS.find((x) => x.id === k)?.name.toLowerCase(); return v === null ? `${n} no se exige` : v > 0 ? `${n} pide una fase más` : `${n} pide una fase menos`; });
  const lvl = LEVELS[p.level - 1];

  const el = h('div', { class: 'page radar-guide' },
    coach ? note(`Así le explica Remate su radar a ${p.name.replace(/\.+$/, '')}. Lo ve desde la tarjeta de su Inicio, con el botón «¿Qué dice mi radar?».`) : null,
    h('section', { class: 'band next stack' },
      h('span', { class: 'when' }, `Nivel ${p.level}: ${lvl.name}${lastDate ? ` · última evaluación: ${fmtDate(lastDate, { day: 'numeric', month: 'long' })}` : ''}`),
      h('h2', {}, rated ? (gap.top ? (you ? 'Estás en el nivel más alto' : 'Está en el nivel más alto') : `${you ? 'Cumples' : 'Cumple'} ${gap.met} de ${gap.total} habilidades para el nivel ${gap.target}`) : (you ? 'Todavía no te evalúan' : 'Todavía no tiene evaluación')),
      rated ? h('p', { style: { margin: 0 } }, gap.top ? `Lo que sigue es mantener ${you ? 'tu' : 'su'} nivel en partidos difíciles y ayudar a ${you ? 'tus' : 'sus'} compañeros.`
        : gap.ready ? `${you ? 'Ya cumples' : 'Ya cumple'} todas las fases del nivel ${gap.target} (${gap.targetLevel.name}). ${you ? 'Pídele a tu entrenador el examen: el nivel solo sube aprobándolo.' : 'Puede presentar el examen.'}`
          : `${even ? `${you ? 'Vas' : 'Va'} parejo: todas ${you ? 'tus' : 'sus'} habilidades evaluadas están en ${phaseName(top)}. ` : strong.length ? `${you ? 'Tu fuerte' : 'Su fuerte'}: ${strong.map((r) => r.name.toLowerCase()).join(', ')} (${phaseName(top)}). ` : ''}${pending.length ? `${you ? 'Donde más te falta' : 'Donde más le falta'}: ${pending.slice(0, 2).map((r) => r.name.toLowerCase()).join(' y ')}.` : ''}`)
        : h('p', { style: { margin: 0 } }, you ? 'Tu entrenador te evalúa durante los entrenamientos. Cuando lo haga, aquí aparece tu radar con la explicación de cada habilidad.' : 'Evalúalo desde su ficha con el botón Evaluar. En cuanto lo hagas, aquí aparece su radar con la explicación de cada habilidad.')),
    rated ? h('figure', { class: 'rp-radar', style: { margin: 0 } }, h('div', { html: radarSVG(rv, `Radar de habilidades de ${p.name}`) }),
      h('figcaption', {}, gap.top ? 'Amarillo: fases de hoy.' : `Amarillo: fases de hoy. Línea punteada: lo que pide el nivel ${gap.target}.`)) : null,
    h('section', { class: 'panel stack' }, h('h3', {}, 'Cómo se lee el radar'),
      h('ul', { class: 'plain' },
        h('li', {}, 'Cada punta es una de las 8 habilidades: saque, recepción, colocación, remate, bloqueo, defensa, físico y juego.'),
        h('li', {}, 'Del centro hacia afuera van las 4 fases. Cerca del centro es fase 1 (iniciación) y la orilla es fase 4 (refinamiento).'),
        h('li', {}, you ? 'El relleno amarillo es dónde estás hoy, según la última evaluación de tu entrenador.' : 'El relleno amarillo es dónde está hoy, según tu última evaluación.'),
        gap.top ? null : h('li', {}, `La línea punteada blanca es lo que pide el nivel ${gap.target}${adjText.length ? `, ajustado a ${you ? 'tu' : 'su'} posición` : ''}.`),
        h('li', {}, 'Donde el amarillo no llega a la línea punteada, ahí está lo que falta. Donde la toca o la pasa, ya se cumple.'),
        h('li', {}, you ? 'Una figura grande y pareja es de un jugador completo. No es para compararte con otros: es para compararte contigo mismo de una evaluación a la siguiente.'
          : 'Una figura grande y pareja es de un jugador completo. No es para comparar jugadores entre sí: es para comparar a cada uno consigo mismo de una evaluación a la siguiente.')),
      adjText.length ? note(`Como ${POSITION_NAME[p.position].toLowerCase()}: ${adjText.join('; ')}.`) : null),
    h('section', { class: 'stack' }, sectionTitle('Las 4 fases'),
      h('div', { class: 'rows' }, PHASES.map((ph) => h('div', { class: 'row' }, dots(ph.n), h('span', { class: 'row-main' }, h('strong', {}, `${ph.n}. ${ph.name}`), h('span', { class: 'row-sub' }, ph.desc)))))),
    rated && pending.length && !gap.top ? h('section', { class: 'panel stack rg-plan' }, h('h3', {}, you ? `Tu plan para llegar al nivel ${gap.target}` : `Su plan para el nivel ${gap.target}`),
      h('ol', { class: 'plain' }, pending.slice(0, 3).map((r) => h('li', {}, h('strong', {}, `${r.name}: `), `pasar de ${phaseName(r.have)} a ${phaseName(r.have + 1)}. ${r.s.phases[r.have] || ''}`))),
      h('p', { class: 'row-sub', style: { margin: 0 } }, you ? `Enfócate en una o dos a la vez. Cuando cumplas las ${gap.total}, pide el examen.` : `Conviene trabajar una o dos a la vez. Cuando cumpla las ${gap.total}, puede presentar el examen.`)) : null,
    h('section', { class: 'stack' }, sectionTitle('Habilidad por habilidad'),
      rows.map((r) => skillCard(p, r, r.s, pending.slice(0, 2).some((x) => x.skill === r.skill), you))),
    note(you ? 'Las fases las pone tu entrenador al observarte en los entrenamientos y partidos. Los consejos y la selección de ejercicios son propuesta de Remate; tu entrenador puede indicarte otros.'
      : 'Las fases salen de tus evaluaciones. Los consejos y la selección de ejercicios son propuesta de Remate, según la habilidad y el nivel del jugador.'));
  return { title: you ? 'Mi radar' : 'Radar explicado', sub: you ? 'Qué dice y cómo mejorar' : p.name, back, el };
}

// ---------- Antes y después: el radar en dos fechas, para juntas con familias (solo entrenador) ----------
// Fases que tenía el jugador en una fecha: la última evaluación de cada habilidad hasta ese día.
function phasesAt(pid, date) {
  const best = {};
  for (const r of state.data.ratings) {
    if (r.player_id !== pid || String(r.rated_at) > date) continue;
    const k = `${r.rated_at}|${r.created_at || ''}`;
    if (!best[r.skill] || k >= best[r.skill].k) best[r.skill] = { k, score: r.score };
  }
  return SKILLS.map((s) => best[s.id]?.score || 0);
}
// Nivel en una fecha: el de hoy menos los exámenes aprobados después de esa fecha.
const levelAt = (p, date) => Math.max(1, p.level - state.data.exams.filter((e) => e.player_id === p.id && e.passed && String(e.taken_at) > date).length);
const longD = (s) => fmtDate(s, { day: 'numeric', month: 'long', year: 'numeric' });
const joinY = (arr) => (arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')} y ${arr[arr.length - 1]}`);

export function comparar(ctx) {
  const p = getPlayer(ctx.args[0]);
  const back = p ? `#/jugador/${p.id}` : '#/jugadores';
  if (!p) return { title: 'Antes y después', back, el: h('div', { class: 'page' }, empty('No encontré al jugador', null)) };
  const dates = [...new Set(state.data.ratings.filter((r) => r.player_id === p.id).map((r) => String(r.rated_at)))].sort();
  if (dates.length < 2) {
    return { title: 'Antes y después', sub: p.name, back, el: h('div', { class: 'page' }, empty('Hace falta otra evaluación',
      dates.length ? `${p.name} tiene evaluaciones de una sola fecha (${longD(dates[0])}). Cuando lo evalúes otro día, aquí podrás comparar las dos fechas.` : `${p.name} todavía no tiene evaluaciones. Evalúalo al inicio y al final de la temporada para comparar.`,
      h('a', { class: 'btn primary', href: back }, 'Ir a su ficha'))) };
  }
  const ui = ctx.ui;
  if (!dates.includes(ui.a)) ui.a = dates[0];
  if (!dates.includes(ui.b)) ui.b = dates[dates.length - 1];
  let [a, b] = [ui.a, ui.b];
  if (a > b) [a, b] = [b, a];
  const before = phasesAt(p.id, a), after = phasesAt(p.id, b);
  const rows = SKILLS.map((s, i) => ({ s, x: before[i], y: after[i], d: after[i] - before[i] }));
  const rated = rows.filter((r) => r.x || r.y);
  const up = rated.filter((r) => r.d > 0), same = rated.filter((r) => r.d === 0 && r.y), down = rated.filter((r) => r.d < 0);
  const maxUp = Math.max(0, ...up.map((r) => r.d)), best = up.filter((r) => r.d === maxUp);
  const sum = (arr) => arr.reduce((n, v) => n + v, 0);
  const lvA = levelAt(p, a), lvB = levelAt(p, b);
  const inRange = state.data.sessions.filter((s) => s.session_date >= a && s.session_date <= b);
  const att = attendanceFor(p.id, inRange, state.data.attendance, settings());
  const pick = (key, label) => h('div', { class: 'field' }, h('label', { for: `cmp-${key}` }, label),
    h('select', { id: `cmp-${key}`, onchange: (e) => { ui[key] = e.target.value; ctx.rerender(); } },
      dates.map((dt) => h('option', { value: dt, selected: dt === ui[key] ? true : null }, longD(dt)))));
  const chg = (d) => (d > 0 ? h('span', { class: 'chip ok' }, `+${d} ${d === 1 ? 'fase' : 'fases'}`) : d < 0 ? h('span', { class: 'chip warn' }, `${d} ${d === -1 ? 'fase' : 'fases'}`) : h('span', { class: 'chip' }, 'Igual'));
  const comment = h('textarea', { rows: 3, maxlength: 600, placeholder: 'Por ejemplo: mejoró mucho su recepción; el siguiente paso es el saque por arriba.', 'aria-label': 'Comentario para la familia' });
  const printComment = h('p', { class: 'print-only cmp-comment' });
  const syncComment = () => { ui.comment = comment.value; printComment.textContent = comment.value.trim() ? `Comentario del entrenador: ${comment.value.trim()}` : ''; };
  comment.value = ui.comment || ''; syncComment();
  comment.addEventListener('input', syncComment);
  const name = p.name.replace(/\.+$/, '');

  const el = h('div', { class: 'page compare' },
    h('section', { class: 'panel stack no-print' }, h('div', { class: 'grid' }, pick('a', 'Antes'), pick('b', 'Después')),
      a === b ? note('Elegiste la misma fecha en los dos lados. Escoge fechas distintas para ver el cambio.', 'warn') : null),
    h('section', { class: 'band next stack' }, h('span', { class: 'when' }, `${group()?.name || 'Remate'} · avance de habilidades`),
      h('h2', {}, p.name), h('p', { style: { margin: 0 } }, `Del ${longD(a)} al ${longD(b)}.`),
      h('p', { style: { margin: 0 } }, a === b ? '' : up.length
        ? `Subió en ${up.length} de ${rated.length} habilidades (${sum(up.map((r) => r.d))} ${sum(up.map((r) => r.d)) === 1 ? 'fase' : 'fases'} en total). ${best.length === up.length && maxUp === 1 ? `Avanzó una fase en ${joinY(best.map((r) => r.s.name.toLowerCase()))}.` : `Lo que más avanzó: ${joinY(best.map((r) => r.s.name.toLowerCase()))} (+${maxUp}).`}`
        : 'En este periodo sus fases se mantuvieron. Mantener lo aprendido también cuenta; el siguiente paso está en el cuadro de abajo.')),
    h('figure', { class: 'rp-radar', style: { margin: 0 } }, h('div', { html: radarSVG({ values: after, before, labels: SKILLS.map((s) => s.name) }, `Radar de ${name}: antes y después`) }),
      h('figcaption', {}, h('span', { class: 'cmp-key before' }), ` Antes (${fmtDate(a, { day: 'numeric', month: 'short' })})   `, h('span', { class: 'cmp-key after' }), ` Después (${fmtDate(b, { day: 'numeric', month: 'short' })})`)),
    h('section', { class: 'grid cmp-facts' },
      h('div', { class: 'panel' }, h('span', { class: 'row-sub' }, 'Nivel'), h('strong', { class: 'num' }, lvA === lvB ? `${lvB}` : `${lvA} → ${lvB}`), h('span', { class: 'row-sub' }, LEVELS[lvB - 1].name)),
      h('div', { class: 'panel' }, h('span', { class: 'row-sub' }, 'Asistencia en el periodo'), h('strong', { class: 'num' }, att.pct == null ? '—' : `${att.pct}%`), h('span', { class: 'row-sub' }, att.counted ? `${att.presente + att.retardo} de ${att.counted} entrenamientos` : 'Sin listas en esas fechas')),
      h('div', { class: 'panel' }, h('span', { class: 'row-sub' }, 'Habilidades que subieron'), h('strong', { class: 'num' }, `${up.length} de ${rated.length}`), h('span', { class: 'row-sub' }, down.length ? `${down.length} bajaron` : `${same.length} se mantuvieron`))),
    h('section', { class: 'stack' }, sectionTitle('Habilidad por habilidad'),
      h('div', { class: 'tablewrap' }, h('table', { class: 'stbl cmp-table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Habilidad'), h('th', {}, 'Antes'), h('th', {}, 'Después'), h('th', {}, 'Cambio'))),
        h('tbody', {}, rows.map((r) => h('tr', {}, h('th', { scope: 'row' }, r.s.name),
          h('td', {}, r.x ? [dots(r.x), h('span', { class: 'cmp-ph' }, PHASES[r.x - 1].name)] : 'Sin evaluar'),
          h('td', {}, r.y ? [dots(r.y), h('span', { class: 'cmp-ph' }, PHASES[r.y - 1].name)] : 'Sin evaluar'),
          h('td', {}, r.x && r.y ? chg(r.d) : '—'))))))),
    h('section', { class: 'panel stack' }, h('h3', {}, 'Cómo leer esta hoja'),
      h('ul', { class: 'plain' },
        h('li', {}, 'Cada punta del radar es una habilidad del voleibol. Del centro a la orilla van 4 fases de aprendizaje: iniciación, adquisición, consolidación y refinamiento.'),
        h('li', {}, 'La figura azul claro es cómo estaba al inicio; la amarilla, cómo está ahora. Donde la amarilla sale más, hubo avance.'),
        h('li', {}, 'Subir una fase lleva semanas de práctica: es un avance real. Las fases las pone el entrenador al observar entrenamientos y partidos.'))),
    h('section', { class: 'stack no-print' }, h('div', { class: 'field' }, h('label', {}, 'Comentario para la familia (se imprime, no se guarda)'), comment)),
    printComment,
    h('div', { class: 'cluster no-print' }, h('button', { class: 'btn primary', type: 'button', onclick: () => window.print() }, ic('printer', 18), 'Imprimir o guardar PDF'),
      h('a', { class: 'btn ghost', href: `#/radar/${p.id}` }, 'Ver su radar explicado')));
  return { title: 'Antes y después', sub: p.name, back, actions: [{ icon: 'printer', label: 'Imprimir o guardar PDF', onClick: () => window.print() }], el };
}
