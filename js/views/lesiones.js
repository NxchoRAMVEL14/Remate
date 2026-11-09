// Lesiones y regreso por fases (v3.23). Solo el entrenador y el propio jugador las ven (ayudantes no).
// El jugador reporta una molestia desde su Inicio; el entrenador la sigue: lesionado → en regreso (5 fases) → alta.
// Remate no diagnostica: si hay una señal de alerta, al médico.
import { h, ic, toast, openSheet, confirmSheet, todayStr, addDays, fmtDate, plural, diffDays } from '../util.js';
import { state, add, patch, remove, players, getPlayer, sql323Ready } from '../store.js';
import { ZONES, ZONE_BY_ID, KINDS, STATUS, STAGES, RED_FLAGS, PREVENT, zoneName, stageOf } from '../content/lesiones.js';
import { sectionTitle, note, empty, field, options, jersey } from './ui.js';

const list = () => state.data.injuries || [];
export const injuriesOf = (pid) => list().filter((x) => x.player_id === pid).sort((a, b) => String(b.started_on).localeCompare(String(a.started_on)));
export const openOf = (pid) => injuriesOf(pid).filter((x) => x.status !== 'alta');
export const openInjuries = () => list().filter((x) => x.status !== 'alta');
export const unseenReports = () => (state.role === 'coach' && !state.viewAs ? list().filter((x) => x.reported_by === 'jugador' && !x.seen_at && x.status !== 'alta') : []);

// ¿Puede jugar? fuera: lesionado o fases 1-2; limitado: fases 3-4; ok.
export function availability(pid) {
  const o = openOf(pid); if (!o.length) return { k: 'ok' };
  const worst = o.reduce((a, x) => (rank(x) < rank(a) ? x : a));
  const r = rank(worst);
  return { k: r < 3 ? 'fuera' : 'limitado', inj: worst, text: worst.status === 'activa' ? `${STATUS.activa}: ${zoneName(worst.zone).toLowerCase()}` : `Regreso fase ${worst.stage}: ${stageOf(worst.stage)?.name.toLowerCase() || ''}` };
}
const rank = (x) => (x.status === 'activa' ? 0 : Number(x.stage) || 1);
export function injuryChip(pid) {
  const a = availability(pid); if (a.k === 'ok') return null;
  return h('span', { class: `chip ${a.k === 'fuera' ? 'bad' : 'warn'} inj-chip`, title: a.text }, '🩹 ', a.k === 'fuera' ? 'Lesión' : `Fase ${a.inj.stage}`);
}

export const redFlagsBox = () => h('details', { class: 'panel inj-flags' }, h('summary', {}, h('strong', {}, '¿Cuándo ir al médico?')),
  h('ul', { class: 'plain' }, RED_FLAGS.map((t) => h('li', {}, t))), h('p', { class: 'row-sub', style: { margin: 0 } }, 'Remate no diagnostica: es una guía para organizar el regreso. Lo que diga el médico manda.'));

const preventList = (zone) => h('ol', { class: 'plain' }, (PREVENT[zone] || PREVENT.otra).map((e) => h('li', {}, h('strong', {}, `${e.name} (${e.dose}): `), e.how)));

// ---------- tarjeta de una lesión ----------
function stageBox(x, coach, rerender) {
  if (x.status === 'alta') return h('p', { class: 'row-sub', style: { margin: 0 } }, `Dado de alta${x.ended_on ? ` el ${fmtDate(x.ended_on, { day: 'numeric', month: 'short' })}` : ''}.`);
  if (x.status === 'activa') return h('div', { class: 'stack' },
    h('p', { style: { margin: 0 } }, coach ? 'Mientras esté así, no salta ni entrena con esa zona. Cuando ya no duela en reposo, empieza el regreso.' : 'Por ahora descansa esa zona. Tu entrenador te dirá cuándo empiezas el regreso.'),
    coach ? h('button', { class: 'btn sm primary', type: 'button', onclick: () => { patch('injuries', x.id, { status: 'regreso', stage: 1, seen_at: x.seen_at || new Date().toISOString() }); toast('Empezó el regreso: fase 1'); rerender(); } }, ic('play', 16), 'Empezar el regreso (fase 1)') : null);
  const st = stageOf(x.stage) || STAGES[0];
  return h('div', { class: 'stack' },
    h('div', { class: 'inj-steps', role: 'img', 'aria-label': `Fase ${st.n} de 5` }, STAGES.map((s) => h('span', { class: s.n < st.n ? 'done' : s.n === st.n ? 'on' : '' }, String(s.n)))),
    h('p', { style: { margin: 0 } }, h('strong', {}, `Fase ${st.n}: ${st.name}`)),
    h('p', { style: { margin: 0 } }, h('strong', {}, 'Puede: '), st.can),
    st.not ? h('p', { style: { margin: 0 } }, h('strong', {}, 'Todavía no: '), st.not) : null,
    h('p', { class: 'row-sub', style: { margin: 0 } }, h('strong', {}, 'Para pasar: '), st.pass, ' Si vuelve el dolor, regresa a la fase anterior.'),
    x.kind === 'lesion' && st.n === 2 ? note('Es una lesión: para pasar a la fase 3 lo ideal es el visto bueno del médico o fisioterapeuta.', 'warn') : null,
    coach ? h('div', { class: 'cluster' },
      st.n > 1 ? h('button', { class: 'btn sm', type: 'button', onclick: () => { patch('injuries', x.id, { stage: st.n - 1 }); toast(`Regresó a la fase ${st.n - 1}`); rerender(); } }, ic('chevron-left', 16), `Fase ${st.n - 1}`) : null,
      st.n < 5 ? h('button', { class: 'btn sm primary', type: 'button', onclick: () => { patch('injuries', x.id, { stage: st.n + 1 }); toast(`Pasó a la fase ${st.n + 1}`); rerender(); } }, `Pasar a fase ${st.n + 1}`, ic('chevron-right', 16))
        : h('button', { class: 'btn sm primary', type: 'button', onclick: () => { patch('injuries', x.id, { status: 'alta', ended_on: todayStr() }); toast('Dado de alta'); rerender(); } }, ic('check', 16), 'Dar de alta')) : null);
}
export function injuryCard(x, { coach, rerender, showName = false } = {}) {
  const p = getPlayer(x.player_id), days = diffDays(todayStr(), x.started_on);
  return h('section', { class: `panel stack inj-card ${x.status}` },
    h('div', { class: 'split' },
      h('div', { class: 'row-main' }, h('strong', {}, `${showName && p ? `${p.name} · ` : ''}${zoneName(x.zone)}`),
        h('span', { class: 'row-sub' }, `${x.kind === 'lesion' ? 'Lesión' : 'Molestia'}${x.pain != null ? ` · dolor ${x.pain}/10` : ''} · desde el ${fmtDate(x.started_on, { day: 'numeric', month: 'short' })} (${days === 0 ? 'hoy' : plural(days, 'día', 'días')})${x.reported_by === 'jugador' ? ' · la reportó el jugador' : ''}`)),
      h('span', { class: `chip ${x.status === 'activa' ? 'bad' : x.status === 'regreso' ? 'warn' : 'ok'}` }, STATUS[x.status])),
    x.note ? h('p', { style: { margin: 0 } }, h('strong', {}, coach ? 'Dice: ' : 'Contaste: '), x.note) : null,
    x.coach_note ? h('p', { style: { margin: 0 } }, h('strong', {}, coach ? 'Tu nota: ' : 'Tu entrenador: '), x.coach_note) : null,
    stageBox(x, coach, rerender),
    h('details', {}, h('summary', {}, `Prevención para ${zoneName(x.zone).toLowerCase()}`), preventList(x.zone)),
    coach ? h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: () => injurySheet({ p, x, onDone: rerender }) }, ic('pencil', 16), 'Editar')) : null);
}

// ---------- entrenador: registrar o editar ----------
export function injurySheet({ p = null, x = null, onDone = () => {} } = {}) {
  if (!sql323Ready()) { toast('Falta correr el bloque v3.23 de sql/instalar.sql en Supabase'); return; }
  const cur = { zone: 'tobillo', kind: 'molestia', pain: 3, started_on: todayStr(), status: 'activa', stage: 0, note: '', coach_note: '', ...(x || {}) };
  if (x && x.reported_by === 'jugador' && !x.seen_at) patch('injuries', x.id, { seen_at: new Date().toISOString() });
  const who = h('select', { 'aria-label': 'Jugador' }, options(players().map((q) => [q.id, q.name]), p?.id || x?.player_id || ''));
  const zone = h('select', {}, options(ZONES.map((z) => [z.id, z.name]), cur.zone));
  const kind = h('select', {}, options(KINDS, cur.kind));
  const pain = h('input', { type: 'range', min: 0, max: 10, step: 1, value: cur.pain ?? 3 });
  const painV = h('strong', {}, `${pain.value}/10`); pain.addEventListener('input', () => { painV.textContent = `${pain.value}/10`; });
  const date = h('input', { type: 'date', value: cur.started_on, max: todayStr() });
  const status = h('select', {}, options([['activa', 'Lesionado (aún no empieza el regreso)'], ['regreso', 'En regreso'], ['alta', 'Dado de alta']], cur.status));
  const stage = h('select', {}, options(STAGES.map((s) => [s.n, `Fase ${s.n}: ${s.name}`]), cur.stage || 1));
  const stageF = field('Fase del regreso', stage);
  const showStage = () => { stageF.hidden = status.value !== 'regreso'; }; status.addEventListener('change', showStage); showStage();
  const cnote = h('textarea', { rows: 3, maxlength: 500, placeholder: 'Qué pasó, qué dijo el médico, qué cuidar' }, cur.coach_note || '');
  let sh;
  sh = openSheet({ title: x ? `Lesión: ${zoneName(cur.zone)}` : 'Registrar lesión o molestia', body: h('div', { class: 'stack' },
    x ? null : field('Jugador', who),
    x?.note ? h('p', { style: { margin: 0 } }, h('strong', {}, 'El jugador dice: '), x.note) : null,
    field('Zona', zone), field('Tipo', kind, 'Molestia: duele pero puede moverse bien. Lesión: le impide jugar o la vio un médico.'),
    h('div', { class: 'field' }, h('label', {}, 'Dolor ', painV), pain),
    field('Desde', date), field('Cómo va', status), stageF, field('Tu nota', cnote),
    redFlagsBox()),
  actions: [x ? { label: 'Borrar', kind: 'danger', onClick: async () => { if (await confirmSheet({ title: '¿Borrar este registro?', text: 'Se borra del historial del jugador.', ok: 'Borrar', danger: true })) { remove('injuries', x.id); toast('Borrado'); onDone(); } } } : null,
    { label: 'Cancelar' },
    { label: 'Guardar', kind: 'primary', onClick: () => {
      const row = { zone: zone.value, kind: kind.value, pain: Number(pain.value), started_on: date.value || todayStr(), status: status.value, stage: status.value === 'regreso' ? Number(stage.value) : status.value === 'alta' ? (Number(cur.stage) || 5) : 0, coach_note: cnote.value.trim(), ended_on: status.value === 'alta' ? (cur.ended_on || todayStr()) : null };
      if (x) patch('injuries', x.id, row);
      else add('injuries', { player_id: who.value, ...row, note: '', reported_by: 'entrenador', seen_at: new Date().toISOString() });
      toast('Guardado'); onDone();
    } }].filter(Boolean) });
  return sh;
}

// ---------- jugador: reportar una molestia ----------
export function reportSheet(me, onDone = () => {}) {
  if (!sql323Ready()) { toast('Tu entrenador todavía no activa esta parte'); return; }
  let zone = null, sh;
  const grid = h('div', { class: 'inj-zones', role: 'group', 'aria-label': 'Dónde te duele' });
  const paint = () => grid.replaceChildren(...ZONES.map((z) => h('button', { type: 'button', class: 'ap-chip', 'aria-pressed': zone === z.id ? 'true' : 'false', onclick: () => { zone = z.id; paint(); } }, z.name)));
  paint();
  const pain = h('input', { type: 'range', min: 0, max: 10, step: 1, value: 3 });
  const painV = h('strong', {}, '3/10'); pain.addEventListener('input', () => { painV.textContent = `${pain.value}/10`; });
  const since = h('select', {}, options([['0', 'Hoy'], ['1', 'Ayer'], ['3', 'Hace unos días'], ['7', 'Hace una semana'], ['14', 'Hace más de una semana']], '0'));
  const txt = h('textarea', { rows: 3, maxlength: 500, placeholder: 'Qué te pasó y cuándo duele (por ejemplo: al saltar, al rematar)' });
  sh = openSheet({ title: 'Reportar una molestia', body: h('div', { class: 'stack' },
    h('p', { style: { margin: 0 } }, 'Le llega a tu entrenador. Decirlo a tiempo evita que una molestia se vuelva lesión.'),
    h('div', { class: 'field' }, h('label', {}, '¿Dónde te duele?'), grid),
    h('div', { class: 'field' }, h('label', {}, '¿Qué tanto? ', painV), pain, h('span', { class: 'hint' }, '0 nada · 5 duele pero aguanto · 10 no puedo')),
    field('¿Desde cuándo?', since), field('Cuéntale', txt),
    note('Si no puedes apoyar o mover la zona, se hinchó mucho o te pegaste en la cabeza: avísale a un adulto y ve al médico.', 'warn')),
  actions: [{ label: 'Cancelar' }, { label: 'Mandar', kind: 'primary', onClick: () => {
    if (!zone) { toast('Elige dónde te duele'); return false; }
    add('injuries', { player_id: me.id, zone, kind: 'molestia', pain: Number(pain.value), started_on: addDays(todayStr(), -Number(since.value)), status: 'activa', stage: 0, note: txt.value.trim(), coach_note: '', reported_by: 'jugador', seen_at: null, ended_on: null });
    toast('Listo, tu entrenador ya lo ve'); onDone();
  } }] });
  return sh;
}

// ---------- sección en la ficha del jugador ----------
export function playerSection(p, ctx) {
  if (!sql323Ready()) return null;
  const all = injuriesOf(p.id), open = all.filter((x) => x.status !== 'alta'), past = all.filter((x) => x.status === 'alta');
  const coach = ctx.role === 'coach' && !ctx.readonly;
  if (!all.length && !coach) return null;
  return h('section', { class: 'stack' },
    sectionTitle('Lesiones'),
    ...open.map((x) => injuryCard(x, { coach, rerender: ctx.rerender })),
    !open.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, past.length ? 'Sin lesiones activas.' : 'Sin lesiones registradas. 👍') : null,
    past.length ? h('details', {}, h('summary', {}, `Historial (${past.length})`), h('div', { class: 'rows' }, past.map((x) => h('div', { class: 'row' },
      h('span', { class: 'row-main' }, h('strong', {}, zoneName(x.zone)), h('span', { class: 'row-sub' }, `${fmtDate(x.started_on, { day: 'numeric', month: 'short', year: 'numeric' })}${x.ended_on ? ` → alta ${fmtDate(x.ended_on, { day: 'numeric', month: 'short' })}` : ''}${x.coach_note ? ` · ${x.coach_note}` : ''}`)),
      coach ? h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Editar', onclick: () => injurySheet({ p, x, onDone: ctx.rerender }) }, ic('pencil', 16)) : null)))) : null,
    coach ? h('button', { class: 'btn sm', type: 'button', style: { justifySelf: 'start' }, onclick: () => injurySheet({ p, onDone: ctx.rerender }) }, ic('plus', 16), 'Registrar lesión o molestia') : null);
}

// ---------- pantalla Lesiones ----------
export default function lesiones(ctx) {
  const ui = ctx.ui; ui.tab ??= 'activas'; ui.zone ??= 'tobillo';
  const coach = ctx.role === 'coach', me = ctx.role === 'player' ? ctx.me : null;
  const el = h('div', { class: 'page' });
  if (!sql323Ready()) el.append(note(coach ? 'Falta correr en Supabase el bloque «v3.23» de sql/instalar.sql (crea la tabla de lesiones). Mientras tanto puedes ver la prevención, pero no guardar lesiones.' : 'Tu entrenador todavía no activa esta parte.', 'bad'));
  const tabs = [['activas', coach ? 'Activas' : 'Mis lesiones'], ...(coach ? [['historial', 'Historial']] : []), ['prevencion', 'Prevención']];
  el.append(h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, t]) => h('button', { type: 'button', role: 'tab', 'aria-selected': ui.tab === k ? 'true' : 'false', onclick: () => { ui.tab = k; ctx.rerender(); } }, t))));
  if (ui.tab === 'prevencion') {
    el.append(h('p', { style: { margin: 0 } }, 'Tres ejercicios por zona, 2 o 3 veces por semana. Caben en el calentamiento o en casa (10 minutos).'),
      h('div', { class: 'ap-chips' }, ZONES.filter((z) => z.id !== 'otra').map((z) => h('button', { type: 'button', class: `ap-chip ${ui.zone === z.id ? 'on' : ''}`, 'aria-pressed': ui.zone === z.id ? 'true' : 'false', onclick: () => { ui.zone = z.id; ctx.rerender(); } }, z.name))),
      h('section', { class: 'panel stack' }, h('h3', { style: { margin: 0 } }, ZONE_BY_ID[ui.zone].name), ZONE_BY_ID[ui.zone].common ? h('p', { class: 'row-sub', style: { margin: 0 } }, ZONE_BY_ID[ui.zone].common) : null, preventList(ui.zone)),
      h('section', { class: 'panel stack' }, h('h3', { style: { margin: 0 } }, 'El regreso en 5 fases'),
        h('ol', { class: 'plain' }, STAGES.map((s) => h('li', {}, h('strong', {}, `${s.name}: `), s.can, ' ', h('span', { class: 'row-sub' }, `Para pasar: ${s.pass}`)))),
        h('p', { class: 'row-sub', style: { margin: 0 } }, 'Si vuelve el dolor, se regresa a la fase anterior. Cada fase dura por lo menos un entreno.')),
      redFlagsBox());
    return { title: 'Lesiones', sub: 'Prevención', back: coach ? '#/hoy' : '#/inicio', el };
  }
  if (coach) {
    const rows = ui.tab === 'activas' ? openInjuries() : list().filter((x) => x.status === 'alta');
    rows.sort((a, b) => (a.seen_at ? 1 : 0) - (b.seen_at ? 1 : 0) || rank(a) - rank(b) || String(b.started_on).localeCompare(String(a.started_on)));
    el.append(h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: () => injurySheet({ onDone: ctx.rerender }) }, ic('plus', 18), 'Registrar')),
      rows.length ? h('div', { class: 'stack' }, rows.map((x) => h('div', { class: 'stack' },
        !x.seen_at && x.reported_by === 'jugador' ? h('span', { class: 'chip ball', style: { justifySelf: 'start' } }, 'Nueva: la reportó hoy o hace poco') : null,
        injuryCard(x, { coach: true, rerender: ctx.rerender, showName: true }))))
        : empty(ui.tab === 'activas' ? 'Nadie lesionado' : 'Sin historial', ui.tab === 'activas' ? 'Cuando alguien reporte una molestia o registres una lesión, sale aquí.' : 'Las lesiones dadas de alta se quedan aquí.'),
      redFlagsBox());
    if (ui.tab === 'activas') for (const x of rows) if (x.reported_by === 'jugador' && !x.seen_at) patch('injuries', x.id, { seen_at: new Date().toISOString() });
    return { title: 'Lesiones', sub: plural(openInjuries().length, 'activa', 'activas'), back: '#/hoy', el };
  }
  // jugador
  const mine = me ? injuriesOf(me.id) : [], open = mine.filter((x) => x.status !== 'alta');
  el.append(me && sql323Ready() ? h('button', { class: 'btn primary', type: 'button', style: { justifySelf: 'start' }, onclick: () => reportSheet(me, ctx.rerender) }, ic('plus', 18), 'Reportar una molestia') : null || h('span'),
    ...(open.length ? open.map((x) => injuryCard(x, { coach: false })) : [empty('Sin lesiones', 'Si algo te duele, repórtalo: así tu entrenador ajusta tu entreno a tiempo.')]),
    mine.length > open.length ? h('details', {}, h('summary', {}, `Lesiones pasadas (${mine.length - open.length})`), h('ul', { class: 'plain' }, mine.filter((x) => x.status === 'alta').map((x) => h('li', {}, `${zoneName(x.zone)} · ${fmtDate(x.started_on, { day: 'numeric', month: 'short', year: 'numeric' })}`)))) : h('span'),
    redFlagsBox());
  return { title: 'Lesiones', sub: open.length ? plural(open.length, 'activa', 'activas') : 'Prevención y regreso', back: '#/inicio', el };
}

// Para Hoy: banda corta.
export function hoyBand() {
  if (!sql323Ready()) return null;
  const open = openInjuries().filter((x) => getPlayer(x.player_id)); if (!open.length) return null;
  const fresh = unseenReports().length;
  return h('a', { class: `panel inj-band ${fresh ? 'fresh' : ''}`, href: '#/lesiones' }, ic('heart-pulse', 22),
    h('span', { class: 'row-main' }, h('strong', {}, fresh ? plural(fresh, 'molestia nueva reportada', 'molestias nuevas reportadas') : plural(open.length, 'jugador lesionado o en regreso', 'jugadores lesionados o en regreso')),
      h('span', { class: 'row-sub' }, open.slice(0, 4).map((x) => `${getPlayer(x.player_id)?.name.split(' ')[0]} (${zoneName(x.zone).toLowerCase()}${x.status === 'regreso' ? `, fase ${x.stage}` : ''})`).join(', '))),
    ic('chevron-right', 18));
}
