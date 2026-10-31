// Torneos: agrupan partidos, con sede, fechas, rama, convocados (y su confirmación), tabla de posiciones y resultado final.
import { h, ic, toast, openSheet, confirmSheet, fmtDate, todayStr, plural } from '../util.js';
import { state, add, patch, remove, group, players, playerById, torneosReady, labReady, isStaff } from '../store.js';
import { result, KINDS } from '../match-calc.js';
import { sectionTitle, note, empty, field, options, jersey } from './ui.js';
import { noticeSheet, waLink } from './avisos.js';

export const RAMAS = { F: 'Femenil', M: 'Varonil', X: 'Mixto' };
const RSVP = { voy: ['Voy', 'ok'], duda: ['En duda', 'warn'], no: ['No voy', 'bad'] };
export const torneoById = (id) => state.data.tournaments.find((t) => t.id === id) || null;
export const tournamentsSorted = () => state.data.tournaments.slice().sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));
export const matchesOf = (t) => state.data.matches.filter((m) => m.tournament_id === t.id).sort((a, b) => `${a.match_date}${a.created_at}`.localeCompare(`${b.match_date}${b.created_at}`));
const endOf = (t) => t.end_date || t.start_date;
export function phase(t) {
  const today = todayStr();
  if (t.place || endOf(t) < today) return 'fin';
  return t.start_date > today ? 'prox' : 'curso';
}
const PHASE = { prox: ['Próximo', 'info'], curso: ['En curso', 'warn'], fin: ['Terminado', ''] };
export const missingSql6Note = () => note('Para usar Torneos y la prueba de 10 m, corre en Supabase el sql/instalar.sql de la versión 3.3 (SQL Editor → pega todo → Run). No borra nada.', 'bad');
const placeText = (n) => (n === 1 ? 'Campeones' : n ? `${n}° lugar` : '');
const dates = (t) => (t.end_date && t.end_date !== t.start_date
  ? `${fmtDate(t.start_date, { day: 'numeric', month: 'short' })} al ${fmtDate(t.end_date, { day: 'numeric', month: 'short' })}`
  : fmtDate(t.start_date, { weekday: 'short', day: 'numeric', month: 'short' }));
const branchOk = (p, b) => b === 'X' || !p.branch || p.branch === b;

// ---------- convocatoria ----------
export function tRsvpCounts(t) {
  const roster = new Set(t.roster || []);
  const list = state.data.tRsvps.filter((r) => r.tournament_id === t.id && roster.has(r.player_id));
  const c = { voy: 0, duda: 0, no: 0 }; list.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
  return { ...c, list, missing: [...roster].filter((id) => !list.some((r) => r.player_id === id)) };
}
export function tRsvpControl(t, me, readonly) {
  const mine = state.data.tRsvps.find((r) => r.tournament_id === t.id && r.player_id === me.id);
  const set = (st) => {
    if (readonly) return;
    if (mine) { if (mine.status !== st) patch('tRsvps', mine.id, { status: st, updated_at: new Date().toISOString() }); }
    else add('tRsvps', { tournament_id: t.id, player_id: me.id, status: st });
    toast(st === 'voy' ? '¡Te esperamos en el torneo!' : st === 'no' ? 'Gracias por avisar' : 'Avísale a tu entrenador cuando sepas');
  };
  return h('div', { class: 'seg rsvp', role: 'group', 'aria-label': '¿Vas al torneo?' }, Object.entries(RSVP).map(([k, [txt]]) =>
    h('button', { type: 'button', 'aria-pressed': mine?.status === k ? 'true' : 'false', disabled: readonly ? true : null, onclick: () => set(k) }, txt)));
}

// ---------- hojas ----------
export function tournamentSheet(t = null, onSaved) {
  const name = h('input', { type: 'text', maxlength: 80, value: t?.name || '', placeholder: 'Por ejemplo: Copa Interprepas' });
  const venue = h('input', { type: 'text', maxlength: 120, value: t?.venue || '', placeholder: 'Opcional' });
  const start = h('input', { type: 'date', value: t?.start_date || todayStr() });
  const end = h('input', { type: 'date', value: t?.end_date || '' });
  const branch = h('select', {}, options(Object.entries(RAMAS), t?.branch || 'X'));
  const place = h('select', {}, options([['', 'Todavía no'], ...Array.from({ length: 16 }, (_, i) => [String(i + 1), i === 0 ? '1° (campeones)' : `${i + 1}°`])], t?.place ? String(t.place) : ''));
  const res = h('input', { type: 'text', maxlength: 120, value: t?.result || '', placeholder: 'Opcional. Por ejemplo: perdimos la final 2-1' });
  const text = h('textarea', { rows: 2, maxlength: 1000, placeholder: 'Opcional. Tus jugadores ven esta nota.' }, t?.note || '');
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  openSheet({
    title: t ? 'Editar torneo' : 'Nuevo torneo',
    body: h('div', { class: 'stack' }, field('Nombre', name), field('Sede', venue), h('div', { class: 'grid' }, field('Empieza', start), field('Termina', end, 'Déjalo vacío si es de un solo día.')),
      field('Rama', branch, 'Sirve para separar los torneos y para sugerir a quién convocar.'),
      t ? h('div', { class: 'grid' }, field('Lugar final', place), field('Resultado', res)) : null, field('Nota', text), err),
    actions: [{ label: 'Cancelar' },
      t ? { label: 'Borrar', kind: 'danger', onClick: async () => {
        if (!(await confirmSheet({ title: `¿Borrar ${t.name}?`, text: 'Sus partidos no se borran: se quedan sin torneo. La convocatoria del torneo sí se borra.', ok: 'Borrar', danger: true }))) return false;
        remove('tournaments', t.id); toast('Torneo borrado'); location.hash = '#/partidos'; return true; } } : null,
      { label: t ? 'Guardar' : 'Crear torneo', kind: 'primary', onClick: () => {
        if (!name.value.trim()) { err.textContent = 'Escribe el nombre del torneo.'; err.hidden = false; return false; }
        if (end.value && end.value < start.value) { err.textContent = 'La fecha final no puede ser antes de la de inicio.'; err.hidden = false; return false; }
        const row = { name: name.value.trim(), venue: venue.value.trim(), start_date: start.value || todayStr(), end_date: end.value || null, branch: branch.value, note: text.value.trim() };
        if (t) { patch('tournaments', t.id, { ...row, place: place.value ? Number(place.value) : null, result: res.value.trim() }); toast('Torneo guardado'); onSaved?.(t); return true; }
        const nt = add('tournaments', { ...row, group_id: group()?.id });
        toast('Torneo creado'); onSaved?.(nt); return true;
      } }].filter(Boolean),
  });
}

function rosterSheet(t) {
  let all = false;
  const sel = new Set(t.roster || []);
  const list = h('div', { class: 'rows roster-pick' }), count = h('span', { class: 'chip ball' });
  const draw = () => {
    const ps = players().filter((p) => all || branchOk(p, t.branch) || sel.has(p.id));
    list.replaceChildren(...ps.map((p) => h('label', { class: 'row check-row' }, jersey(p, 'sm'),
      h('span', { class: 'row-main' }, h('strong', {}, p.name), h('span', { class: 'row-sub' }, [p.branch ? RAMAS[p.branch] : null, `nivel ${p.level}`].filter(Boolean).join(' · '))),
      h('input', { type: 'checkbox', checked: sel.has(p.id) ? true : null, 'aria-label': `Convocar a ${p.name}`, onchange: (e) => { if (e.target.checked) sel.add(p.id); else sel.delete(p.id); count.textContent = `${sel.size} convocados`; } }))));
    count.textContent = `${sel.size} convocados`;
  };
  draw();
  const toggle = t.branch !== 'X' ? h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e) => { all = e.target.checked; draw(); } }), h('span', {}, `Mostrar también a quienes no son de rama ${RAMAS[t.branch].toLowerCase()}`)) : null;
  openSheet({
    title: `Convocados: ${t.name}`,
    body: h('div', { class: 'stack' }, h('div', { class: 'cluster' }, count,
      h('button', { class: 'btn sm', type: 'button', onclick: () => { players().filter((p) => all || branchOk(p, t.branch)).forEach((p) => sel.add(p.id)); draw(); } }, 'Todos'),
      h('button', { class: 'btn sm', type: 'button', onclick: () => { sel.clear(); draw(); } }, 'Ninguno')), toggle, list,
      note('Los convocados confirman desde su celular si van. Los demás ven el torneo como «no convocado».')),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar convocados', kind: 'primary', onClick: () => {
      const ids = [...sel]; patch('tournaments', t.id, { roster: ids }); toast(`${plural(ids.length, 'jugador convocado', 'jugadores convocados')}`); return true; } }],
  });
}

// Fila de nuestro equipo con los partidos del torneo que ya terminaron.
export function ourRow(t) {
  const done = matchesOf(t).filter((m) => m.status === 'terminado');
  const r = done.map(result);
  return { pj: done.length, pg: r.filter((x) => x.win).length, pp: r.filter((x) => !x.win).length, sf: r.reduce((n, x) => n + x.us, 0), sc: r.reduce((n, x) => n + x.them, 0) };
}
const COLS = [['pj', 'PJ', 'Partidos jugados'], ['pg', 'PG', 'Ganados'], ['pp', 'PP', 'Perdidos'], ['sf', 'SF', 'Sets a favor'], ['sc', 'SC', 'Sets en contra'], ['pts', 'Pts', 'Puntos']];
export const sortStandings = (rows) => rows.slice().sort((a, b) => (b.pts || 0) - (a.pts || 0) || ((b.sf || 0) - (b.sc || 0)) - ((a.sf || 0) - (a.sc || 0)) || (b.sf || 0) - (a.sf || 0));

function standingsSheet(t) {
  const rows = (t.standings?.length ? t.standings : [{ team: group()?.name || 'Nosotros', us: true }]).map((r) => ({ ...r }));
  const box = h('div', { class: 'stack' });
  const num = (r, k, label) => h('label', { class: 'st-num' }, h('span', {}, label), h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 99, value: r[k] ?? '', oninput: (e) => { r[k] = e.target.value === '' ? null : Math.max(0, Math.min(99, Number(e.target.value) || 0)); } }));
  const draw = () => box.replaceChildren(...rows.map((r, i) => h('div', { class: `panel st-edit ${r.us ? 'us' : ''}` },
    h('div', { class: 'split' }, h('input', { type: 'text', maxlength: 60, value: r.team || '', placeholder: 'Equipo', 'aria-label': 'Equipo', oninput: (e) => { r.team = e.target.value; } }),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Quitar equipo', onclick: () => { rows.splice(i, 1); draw(); } }, ic('trash-2', 16))),
    h('div', { class: 'st-grid' }, COLS.map(([k, label]) => num(r, k, label))),
    h('div', { class: 'cluster' }, h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: r.us ? true : null, onchange: (e) => { rows.forEach((x) => { x.us = false; }); r.us = e.target.checked; draw(); } }), h('span', {}, 'Somos nosotros')),
      r.us ? h('button', { class: 'btn sm', type: 'button', onclick: () => { Object.assign(r, ourRow(t)); draw(); toast('Llené PJ, PG, PP y sets con tus partidos del torneo'); } }, ic('refresh-cw', 16), 'Usar mis partidos') : null))));
  draw();
  openSheet({
    title: 'Tabla de posiciones',
    body: h('div', { class: 'stack' }, note('Escribe los equipos de tu grupo o del torneo. Tu fila se puede llenar con tus partidos; los puntos los pones según las reglas del torneo.'), box,
      h('button', { class: 'btn', type: 'button', onclick: () => { rows.push({ team: '' }); draw(); } }, ic('plus', 18), 'Agregar equipo')),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar tabla', kind: 'primary', onClick: () => {
      const clean = rows.filter((r) => String(r.team || '').trim()).map((r) => ({ team: r.team.trim().slice(0, 60), us: !!r.us, ...Object.fromEntries(COLS.map(([k]) => [k, r[k] == null ? null : Number(r[k])])) }));
      patch('tournaments', t.id, { standings: clean }); toast('Tabla guardada'); return true; } }],
  });
}

// ---------- piezas de pantalla ----------
export function standingsTable(t) {
  const rows = sortStandings(t.standings || []);
  if (!rows.length) return null;
  return h('div', { class: 'tablewrap' }, h('table', { class: 'stbl st-table' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, '#'), h('th', { scope: 'col' }, 'Equipo'), COLS.map(([, label, title]) => h('th', { scope: 'col', title, class: 'num' }, label)))),
    h('tbody', {}, rows.map((r, i) => h('tr', { class: r.us ? 'us' : null }, h('td', {}, String(i + 1)), h('th', { scope: 'row' }, r.team), COLS.map(([k]) => h('td', { class: 'num' }, r[k] == null ? '—' : String(r[k]))))))));
}

function card(t, ctx) {
  const ph = phase(t), c = tRsvpCounts(t), coachish = ctx.role === 'coach' || ctx.role === 'assistant' || isStaff();
  const me = ctx.me, conv = me && (t.roster || []).includes(me.id), mine = me && state.data.tRsvps.find((r) => r.tournament_id === t.id && r.player_id === me.id);
  const n = matchesOf(t).length;
  const sub = [dates(t), t.venue, RAMAS[t.branch]].filter(Boolean).join(' · ');
  let end;
  if (ph === 'fin') end = t.place ? h('span', { class: `chip ${t.place <= 3 ? 'ball' : ''}` }, ic('medal', 14), ` ${placeText(t.place)}`) : h('span', { class: 'chip' }, 'Terminado');
  else if (coachish) end = (t.roster || []).length ? h('span', { class: 'chip' }, `Van ${c.voy} de ${(t.roster || []).length}`) : h('span', { class: `chip ${PHASE[ph][1]}` }, PHASE[ph][0]);
  else end = conv ? h('span', { class: `chip ${mine ? RSVP[mine.status][1] : 'info'}` }, mine ? RSVP[mine.status][0] : 'Convocado: contesta') : h('span', { class: 'chip' }, 'No convocado');
  return h('a', { class: 'row', href: `#/torneo/${t.id}` }, h('span', { class: 'jersey off', 'aria-hidden': 'true' }, ic('trophy', 20)),
    h('span', { class: 'row-main' }, h('strong', {}, t.name), h('span', { class: 'row-sub' }, sub), n ? h('span', { class: 'row-sub' }, plural(n, 'partido', 'partidos')) : null),
    h('span', { class: 'row-end' }, end, ic('chevron-right', 18)));
}

// Sección de torneos para la pantalla Partidos, con filtro por rama.
export function tournamentsSection(ctx) {
  const ui = ctx.ui; ui.rama ??= 'todas';
  const coach = ctx.role === 'coach';
  if (!torneosReady()) return coach ? h('section', { class: 'stack' }, sectionTitle('Torneos'), missingSql6Note()) : null;
  const all = tournamentsSorted();
  if (!all.length && !coach) return null;
  const used = ['F', 'M', 'X'].filter((b) => all.some((t) => t.branch === b));
  const list = all.filter((t) => ui.rama === 'todas' || t.branch === ui.rama);
  const seg = used.length > 1 ? h('div', { class: 'seg', role: 'group', 'aria-label': 'Rama' }, [['todas', 'Todas'], ...used.map((b) => [b, RAMAS[b]])].map(([k, txt]) =>
    h('button', { type: 'button', 'aria-pressed': ui.rama === k ? 'true' : 'false', onclick: () => { ui.rama = k; ctx.rerender(); } }, txt))) : null;
  return h('section', { class: 'stack' },
    sectionTitle('Torneos', coach ? h('button', { class: 'btn sm primary', type: 'button', onclick: () => tournamentSheet(null, (t) => { location.hash = `#/torneo/${t.id}`; }) }, ic('plus', 16), 'Nuevo torneo') : null),
    seg, list.length ? h('div', { class: 'rows' }, list.map((t) => card(t, ctx)))
      : coach ? h('p', { class: 'row-sub', style: { margin: 0 } }, all.length ? 'No hay torneos de esa rama.' : 'Agrupa tus partidos por torneo: sede, fechas, rama, convocados, tabla y resultado final.') : null);
}

// ---------- pantalla del torneo ----------
export default function torneo(ctx) {
  const t = torneoById(ctx.args[0]);
  if (!t) return { title: 'Torneo', back: '#/partidos', el: h('div', { class: 'page' }, empty('No encontré ese torneo', 'Puede que se haya borrado.', h('a', { class: 'btn', href: '#/partidos' }, 'Ver partidos'))) };
  const coach = ctx.role === 'coach', staff = ctx.role === 'assistant' || (ctx.role === 'player' && isStaff() && !ctx.readonly);
  const me = ctx.me, ph = phase(t), roster = t.roster || [], c = tRsvpCounts(t);
  const ms = matchesOf(t);
  const canCapture = (coach || staff) && labReady();
  const newMatch = () => import('./partidos.js').then(({ matchSheet }) => matchSheet(null, (m) => { location.hash = `#/partido/${m.id}`; }, { tournament: t }));
  const nameOf = (id) => playerById(id)?.name || 'Jugador';
  const by = (st) => c.list.filter((r) => r.status === st).map((r) => nameOf(r.player_id)).sort((a, b) => a.localeCompare(b, 'es'));
  const notRoster = (coach || staff) ? players().filter((p) => !roster.includes(p.id) && branchOk(p, t.branch)) : [];
  const our = ourRow(t);

  const el = h('div', { class: 'page torneo' },
    !torneosReady() ? missingSql6Note() : null,
    h('section', { class: 'band next stack' }, h('span', { class: 'when' }, `${PHASE[ph][0]} · ${RAMAS[t.branch]}`), h('h2', {}, t.name),
      h('p', { style: { margin: 0 } }, [dates(t), t.venue].filter(Boolean).join(' · ')),
      t.place || t.result ? h('p', { class: 'tr-result' }, ic('medal', 20), ` ${[placeText(t.place), t.result].filter(Boolean).join('. ')}`) : null,
      t.note ? h('p', { style: { margin: 0 } }, t.note) : null),
    // Jugador: su convocatoria
    !coach && !staff && me ? (roster.includes(me.id)
      ? h('section', { class: 'panel stack' }, h('strong', {}, ph === 'fin' ? 'Estuviste convocado a este torneo.' : 'Estás convocado. ¿Vas al torneo?'), ph === 'fin' ? null : tRsvpControl(t, me, ctx.readonly))
      : note('No estás convocado a este torneo. Si crees que es un error, platícalo con tu entrenador.')) : null,
    // Entrenador y ayudantes: convocados y confirmación
    coach || staff ? h('section', { class: 'stack' }, sectionTitle('Convocatoria', coach && torneosReady() ? h('button', { class: 'btn sm', type: 'button', onclick: () => rosterSheet(t) }, ic('users', 16), roster.length ? 'Editar convocados' : 'Elegir convocados') : null),
      roster.length ? [
        h('div', { class: 'cluster' }, Object.entries(RSVP).map(([k, [txt, tone]]) => h('span', { class: `chip ${tone}` }, `${txt}: ${c[k]}`)), h('span', { class: 'chip' }, `Sin respuesta: ${c.missing.length}`)),
        h('div', { class: 'rows' },
          Object.entries(RSVP).map(([k, [txt]]) => (by(k).length ? h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, txt), h('span', { class: 'row-sub' }, by(k).join(', ')))) : null)),
          c.missing.length ? h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, 'Sin respuesta'), h('span', { class: 'row-sub' }, c.missing.map(nameOf).sort((a, b) => a.localeCompare(b, 'es')).join(', ')))) : null,
          notRoster.length ? h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, 'No convocados'), h('span', { class: 'row-sub' }, notRoster.map((p) => p.name).join(', ')))) : null),
        coach && ph !== 'fin' ? h('div', { class: 'cluster' },
          h('button', { class: 'btn sm', type: 'button', onclick: () => noticeSheet({ title: `Convocatoria: ${t.name}`, body: `${dates(t)}${t.venue ? `, ${t.venue}` : ''}. Si estás convocado, contesta en Remate si vas.`, url: `#/torneo/${t.id}` }) }, ic('megaphone', 16), 'Avisar a los convocados'),
          h('a', { class: 'btn sm', href: waLink(`Convocatoria: ${t.name}`, `${dates(t)}${t.venue ? `, ${t.venue}` : ''}. Convocados: ${roster.map(nameOf).join(', ')}. Contesten en Remate si van.${c.missing.length ? ` Faltan ${c.missing.length} por contestar.` : ''}`, `#/torneo/${t.id}`), target: '_blank', rel: 'noopener' }, ic('message-circle', 16), 'Recordar por WhatsApp')) : null]
        : h('p', { class: 'row-sub', style: { margin: 0 } }, coach ? 'Todavía no eliges a quién convocar.' : 'El entrenador todavía no elige a los convocados.')) : null,
    // Partidos del torneo
    h('section', { class: 'stack' }, sectionTitle('Partidos', canCapture && torneosReady() ? h('button', { class: 'btn sm primary', type: 'button', onclick: newMatch }, ic('plus', 16), 'Partido del torneo') : null),
      ms.length ? h('div', { class: 'rows' }, ms.map((m) => { const r = result(m);
        return h('a', { class: 'row', href: `#/partido/${m.id}` }, h('span', { class: 'jersey off', 'aria-hidden': 'true' }, ic('volleyball', 20)),
          h('span', { class: 'row-main' }, h('strong', {}, `Contra ${m.rival}`), h('span', { class: 'row-sub' }, [fmtDate(m.match_date, { weekday: 'short', day: 'numeric', month: 'short' }), KINDS[m.kind], r.detail || null].filter(Boolean).join(' · '))),
          h('span', { class: 'row-end' }, m.status === 'terminado' ? h('span', { class: `chip ${r.win ? 'ok' : 'bad'}` }, `${r.win ? 'Ganado' : 'Perdido'} ${r.text}`) : m.status === 'en_juego' ? h('span', { class: 'chip warn' }, `En juego ${r.text}`) : h('span', { class: 'chip info' }, 'Próximo'), ic('chevron-right', 18)));
      })) : h('p', { class: 'row-sub', style: { margin: 0 } }, canCapture ? 'Agrega los partidos del torneo. También puedes asignar un partido que ya existe desde «Editar partido».' : 'Todavía no hay partidos de este torneo.'),
      our.pj ? h('div', { class: 'kpis' },
        h('div', { class: 'kpi' }, h('span', { class: 'n' }, `${our.pg}-${our.pp}`), h('span', { class: 'l' }, 'Ganados y perdidos')),
        h('div', { class: 'kpi' }, h('span', { class: 'n' }, `${our.sf}-${our.sc}`), h('span', { class: 'l' }, 'Sets a favor y en contra'))) : null),
    // Tabla
    h('section', { class: 'stack' }, sectionTitle('Tabla de posiciones', coach && torneosReady() ? h('button', { class: 'btn sm', type: 'button', onclick: () => standingsSheet(t) }, ic('pencil', 16), (t.standings || []).length ? 'Editar tabla' : 'Escribir tabla') : null),
      standingsTable(t) || h('p', { class: 'row-sub', style: { margin: 0 } }, coach ? 'Escribe los equipos y sus resultados. Tu fila se puede llenar con tus partidos.' : 'Todavía no hay tabla.')),
    coach ? h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', disabled: torneosReady() ? null : true, onclick: () => tournamentSheet(t) }, ic('pencil', 18), ph === 'fin' || ph === 'curso' ? 'Editar y poner resultado final' : 'Editar torneo')) : null);
  return { title: 'Torneo', sub: t.name, back: '#/partidos', actions: coach && torneosReady() ? [{ icon: 'pencil', label: 'Editar torneo', onClick: () => tournamentSheet(t) }] : [], el };
}

// Torneos por venir en los que un jugador está convocado (para su pantalla de Partidos).
export const myUpcomingTournaments = (me) => (me ? tournamentsSorted().filter((t) => phase(t) !== 'fin' && (t.roster || []).includes(me.id)).reverse() : []);
// Para Hoy: torneos que empiezan en los próximos 14 días con convocados sin contestar.
export function tournamentsNeedingAnswers() {
  const today = todayStr(), lim = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  return state.data.tournaments.filter((t) => t.start_date >= today && t.start_date <= lim && (t.roster || []).length).map((t) => ({ t, c: tRsvpCounts(t) })).filter((x) => x.c.missing.length);
}
