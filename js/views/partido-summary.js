// Resumen del partido: marcador, side-out y break point, rotaciones, estadística por jugador, mapa, video y convocatoria.
import { h, ic, toast, openSheet, confirmSheet, fmtDate, todayStr, plural, atTime, isUrl, parseTime, fmtClock, ytId, rivalKey } from '../util.js';
import { state, add, patch, remove, players, playerById, isStaff } from '../store.js';
import { countsFor, playersIn, metrics, teamSummary, addCounts, fmtEff, result, replay, phaseStats, byRotation, rotLabel, RIVAL_GRID, zoneCounts } from '../match-calc.js';
import { note, empty, sectionTitle, field, options } from './ui.js';
import { getLog, nameOf } from './partido-capture.js';
import { coachLogSheet } from './lab-coaching.js';
import { torneoById } from './torneos.js';

const k = (n, l) => h('div', { class: 'kpi' }, h('span', { class: 'n' }, n), h('span', { class: 'l' }, l));
const pctTxt = (x) => (x == null ? '—' : `${x}%`);

// ---------- Mapa de zonas ----------
export function zoneMapEl(counts, { caption = '' } = {}) {
  const max = Math.max(1, ...Object.values(counts).map((c) => c.n));
  const total = Object.values(counts).reduce((a, c) => a + c.n, 0);
  return h('figure', { class: 'zmap', style: { margin: 0 } },
    h('div', { class: 'zm-grid', role: 'img', 'aria-label': `${caption}: ${Object.entries(counts).map(([z, c]) => `zona ${z}, ${c.n}`).join('; ')}` },
      RIVAL_GRID.map((row) => row.map((z) => {
        const c = counts[z], a = c.n ? 0.15 + 0.75 * (c.n / max) : 0;
        return h('div', { class: 'zm-cell', style: `--a:${a.toFixed(2)}` }, h('span', { class: 'zm-z' }, `Zona ${z}`), h('b', {}, String(c.n)),
          h('span', { class: 'zm-p' }, c.n ? `${total ? Math.round((c.n / total) * 100) : 0}% · ${plural(c.pts, 'punto', 'puntos')}` : ''));
      }))),
    h('div', { class: 'zm-net' }, 'Red'),
    h('figcaption', {}, caption ? `${caption}. ` : '', 'Cancha del rival vista desde tu banca. Más intenso = más balones.'));
}

export function zoneSection(log, ctx, { title = 'Mapa de saque y ataque' } = {}) {
  const ui = ctx.ui; ui.zk ||= 'sv'; ui.zp ??= '';
  const withZone = log.filter((e) => e.z);
  if (!withZone.length) return null;
  const ids = [...new Set(withZone.map((e) => e.p).filter(Boolean))];
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Qué ver' }, [['sv', 'Saque'], ['at', 'Ataque']].map(([v, t]) =>
    h('button', { type: 'button', 'aria-pressed': ui.zk === v ? 'true' : 'false', onclick: () => { ui.zk = v; ctx.rerender(); } }, t)));
  const sel = h('select', { 'aria-label': 'Jugador' }, options([['', 'Todo el equipo'], ...ids.map((id) => [id, nameOf(id)])], ui.zp));
  sel.addEventListener('change', () => { ui.zp = sel.value; ctx.rerender(); });
  return h('section', { class: 'stack' }, sectionTitle(title), h('div', { class: 'cluster' }, seg, sel),
    zoneMapEl(zoneCounts(log, ui.zk, ui.zp || null), { caption: `${ui.zk === 'sv' ? 'Saques' : 'Ataques'} de ${ui.zp ? nameOf(ui.zp) : 'todo el equipo'}` }));
}

// ---------- Video ----------
function videoSheet(m) {
  const v = m.video || {};
  const url = h('input', { type: 'url', inputmode: 'url', value: v.url || '', placeholder: 'https://youtu.be/...' });
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  openSheet({ title: 'Video del partido', body: h('div', { class: 'stack' }, field('Enlace de YouTube o Google Drive', url, 'En YouTube ponlo como "No listado" si no quieres que sea público. Tus jugadores ven el enlace.'), err),
    actions: [{ label: 'Cancelar' }, v.url ? { label: 'Quitar video', kind: 'danger', onClick: () => { patch('matches', m.id, { video: {} }); toast('Video quitado'); } } : null,
      { label: 'Guardar', kind: 'primary', onClick: () => {
        if (!isUrl(url.value)) { err.textContent = 'Pega un enlace que empiece con https://'; err.hidden = false; return false; }
        patch('matches', m.id, { video: { ...v, url: url.value.trim(), marks: v.marks || [] } }); toast('Video guardado'); return true;
      } }].filter(Boolean) });
}
function markSheet(m) {
  const v = m.video || {};
  const t = h('input', { type: 'text', inputmode: 'numeric', placeholder: '12:34', 'aria-label': 'Minuto' });
  const text = h('input', { type: 'text', maxlength: 80, placeholder: 'Por ejemplo: bloqueo doble de Memo' });
  const who = h('select', {}, options([['', 'Sin jugador'], ...players().map((p) => [p.id, p.name])], ''));
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  openSheet({ title: 'Marca en el video', body: h('div', { class: 'stack' }, h('div', { class: 'grid' }, field('Minuto (mm:ss)', t), field('Jugador', who)), field('Qué pasa', text), err),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      const s = parseTime(t.value);
      if (s == null) { err.textContent = 'Escribe el minuto como 12:34.'; err.hidden = false; return false; }
      if (!text.value.trim()) { err.textContent = 'Escribe qué pasa en ese momento.'; err.hidden = false; return false; }
      const marks = [...(v.marks || []), { t: s, text: text.value.trim(), p: who.value || null }].sort((a, b) => a.t - b.t).slice(0, 80);
      patch('matches', m.id, { video: { ...v, marks } }); toast('Marca guardada'); return true;
    } }] });
}
export function videoSection(m, canEdit) {
  const v = m.video || {};
  if (!v.url && !canEdit) return null;
  const yt = !!ytId(v.url);
  return h('section', { class: 'stack' }, sectionTitle('Video', canEdit ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => videoSheet(m) }, ic('pencil', 16), v.url ? 'Cambiar' : 'Agregar') : null),
    v.url ? h('div', { class: 'stack' },
      h('a', { class: 'btn', href: v.url, target: '_blank', rel: 'noopener' }, ic('video', 18), 'Ver el video'),
      (v.marks || []).length ? h('div', { class: 'rows' }, v.marks.map((mk, i) => h('div', { class: 'row' },
        h('a', { class: 'chip ball', href: atTime(v.url, mk.t), target: '_blank', rel: 'noopener', title: yt ? 'Abrir el video en este minuto' : 'Abrir el video' }, fmtClock(mk.t)),
        h('span', { class: 'row-main' }, h('strong', {}, mk.text), mk.p ? h('span', { class: 'row-sub' }, nameOf(mk.p)) : null),
        canEdit ? h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Borrar marca', onclick: () => { patch('matches', m.id, { video: { ...v, marks: v.marks.filter((_, j) => j !== i) } }); } }, ic('trash-2', 16)) : null))) : null,
      !yt && (v.marks || []).length ? h('p', { class: 'row-sub', style: { margin: 0 } }, 'Este video no es de YouTube: el enlace abre el video y tú buscas el minuto.') : null,
      canEdit ? h('button', { class: 'btn sm', type: 'button', style: { justifySelf: 'start' }, onclick: () => markSheet(m) }, ic('plus', 16), 'Marca en el video') : null)
      : h('p', { class: 'row-sub', style: { margin: 0 } }, 'Pega el enlace del video (YouTube o Drive) y marca las jugadas importantes con su minuto. Tus jugadores lo ven en su sección Partidos.'));
}

// ---------- Convocatoria ----------
export const RSVP = { voy: ['Voy', 'ok'], duda: ['En duda', 'warn'], no: ['No voy', 'bad'] };
export function rsvpCounts(m) {
  const list = state.data.rsvps.filter((r) => r.match_id === m.id);
  const c = { voy: 0, duda: 0, no: 0 }; list.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
  return { ...c, list };
}
export function rsvpControl(m, me, readonly) {
  const mine = state.data.rsvps.find((r) => r.match_id === m.id && r.player_id === me.id);
  const set = (st) => {
    if (readonly) return;
    if (mine) { if (mine.status !== st) patch('rsvps', mine.id, { status: st, updated_at: new Date().toISOString() }); }
    else add('rsvps', { match_id: m.id, player_id: me.id, status: st });
    toast(st === 'voy' ? '¡Te esperamos!' : st === 'no' ? 'Gracias por avisar' : 'Avísale a tu entrenador cuando sepas');
  };
  return h('div', { class: 'seg rsvp', role: 'group', 'aria-label': '¿Vas al partido?' }, Object.entries(RSVP).map(([kk, [t]]) =>
    h('button', { type: 'button', 'aria-pressed': mine?.status === kk ? 'true' : 'false', disabled: readonly ? true : null, onclick: () => set(kk) }, t)));
}
// Partido de un torneo: la convocatoria se contesta una sola vez, en el torneo.
const tourRsvpNote = (m) => { const t = torneoById(m.tournament_id);
  return h('section', { class: 'stack' }, sectionTitle('Convocatoria'), h('div', { class: 'note' }, 'Este partido es del torneo ', h('a', { href: `#/torneo/${t.id}` }, t.name), '. La convocatoria se contesta en el torneo.')); };
export function rsvpSection(m) {
  const c = rsvpCounts(m), all = players();
  const by = (st) => c.list.filter((r) => r.status === st).map((r) => nameOf(r.player_id)).sort((a, b) => a.localeCompare(b, 'es'));
  const answered = new Set(c.list.map((r) => r.player_id));
  const missing = all.filter((p) => !answered.has(p.id));
  const coach = state.role === 'coach';
  const waText = `Convocatoria: partido contra ${m.rival}, ${fmtDate(m.match_date, { weekday: 'long', day: 'numeric', month: 'long' })}${m.venue ? `, en ${m.venue}` : ''}. Contesta en Remate (Partidos) si vas. ${missing.length ? `Faltan ${missing.length} por contestar.` : ''}`;
  return h('section', { class: 'stack' }, sectionTitle('Convocatoria'),
    h('div', { class: 'cluster' }, Object.entries(RSVP).map(([kk, [t, tone]]) => h('span', { class: `chip ${tone}` }, `${t}: ${c[kk]}`)), h('span', { class: 'chip' }, `Sin respuesta: ${missing.length}`)),
    h('div', { class: 'rows' },
      Object.entries(RSVP).map(([kk, [t]]) => (by(kk).length ? h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, t), h('span', { class: 'row-sub' }, by(kk).join(', ')))) : null)),
      missing.length ? h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, 'Sin respuesta'), h('span', { class: 'row-sub' }, missing.map((p) => p.name).join(', ')))) : null),
    coach ? h('div', { class: 'cluster' }, h('a', { class: 'btn sm', href: `https://wa.me/?text=${encodeURIComponent(waText)}`, target: '_blank', rel: 'noopener' }, ic('message-circle', 16), 'Recordar por WhatsApp')) : null,
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Cada jugador contesta desde su sección Partidos.'));
}

// ---------- Resumen completo (entrenador y ayudantes) ----------
export function summaryView(m, ctx, { canEdit, coach }) {
  const log = getLog(m)?.log || [];
  const r = result(m), team = teamSummary(log);
  const ids = playersIn(log);
  const stats = state.data.matchStats.filter((s) => s.match_id === m.id);
  const rows = (ids.length ? ids.map((id) => ({ id, c: countsFor(log, id) })) : stats.map((s) => ({ id: s.player_id, c: s.counts })))
    .map((x) => ({ ...x, m: metrics(x.c), name: nameOf(x.id) })).sort((a, b) => b.m.points - a.m.points || a.name.localeCompare(b.name, 'es'));
  const tm = ids.length ? team : metrics(addCounts(...rows.map((x) => x.c)));
  const rp = replay(log, m.lineups || [], players());
  const ph = phaseStats(rp.rallies), rots = byRotation(rp.rallies);
  const worst = rots.length > 1 ? rots.reduce((a, b) => (b.diff < a.diff ? b : a)) : null;
  const upcoming = m.status === 'planeado' || m.match_date >= todayStr();
  return h('div', { class: 'stack' },
    h('section', { class: 'panel stack' },
      h('div', { class: 'split' }, h('h2', {}, m.status === 'terminado' ? `${r.win ? 'Ganamos' : 'Perdimos'} ${r.text}` : `Sets ${r.text}`), m.status !== 'terminado' ? h('span', { class: 'chip warn' }, m.status === 'planeado' ? 'Próximo' : 'En juego') : null),
      (m.sets || []).length ? h('div', { class: 'cluster' }, m.sets.map((s, i) => h('span', { class: `chip ${s.us > s.them ? 'ok' : s.them > s.us ? 'bad' : ''}` }, `Set ${i + 1}: ${s.us}-${s.them}`))) : h('p', { style: { margin: 0 } }, 'Todavía no hay puntos.'),
      m.venue ? h('span', { class: 'row-sub' }, m.venue) : null, m.note ? h('p', { style: { margin: 0 } }, m.note) : null,
      coach ? h('div', { class: 'cluster' }, h('a', { class: 'btn sm', href: `#/rival/${rivalKey(m.rival)}` }, ic('eye', 16), `Scouting de ${m.rival}`)) : null),
    torneoById(m.tournament_id) && !state.data.rsvps.some((x) => x.match_id === m.id) ? tourRsvpNote(m)
      : upcoming || state.data.rsvps.some((x) => x.match_id === m.id) ? rsvpSection(m) : null,
    rows.length ? h('div', { class: 'kpis' }, k(fmtEff(tm.atEff), 'Eficiencia de ataque'), k(pctTxt(tm.recPos), 'Recepción buena o perfecta'), k(pctTxt(tm.svIn), 'Saques dentro')) : null,
    ph.soN + ph.bpN ? h('div', { class: 'kpis' }, k(pctTxt(ph.so), `Side-out (${ph.soW} de ${ph.soN} recibiendo)`), k(pctTxt(ph.bp), `Break point (${ph.bpW} de ${ph.bpN} sacando)`), k(String(tm.aces), 'Aces')) : null,
    rows.length && !(ph.soN + ph.bpN) ? h('div', { class: 'kpis' }, k(String(tm.aces), 'Aces'), k(String(tm.blocks), 'Puntos de bloqueo'), k(String(tm.errors), 'Errores nuestros')) : null,
    ids.length && team.oppErr != null ? h('p', { style: { margin: 0 } }, `Puntos nuestros: ${team.ourPts}. De ellos, ${team.points} fueron por ace, remate o bloqueo y ${team.oppErr} por error del rival anotado. Errores nuestros: ${tm.errors}.`) : null,
    rots.length ? h('section', { class: 'stack' }, sectionTitle('Por rotación'),
      worst ? note(`Donde más puntos pierden: ${rotLabel(worst.key).toLowerCase()} (${worst.won} ganados de ${worst.n}). Ahí conviene revisar la recepción y la primera opción de ataque.`, worst.diff < 0 ? 'warn' : '') : null,
      h('div', { class: 'tablewrap' }, h('table', { class: 'stbl' },
        h('thead', {}, h('tr', {}, ['Rotación', 'Rallies', 'Ganados', '+/-', 'Side-out', 'Break point'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, rots.map((x) => h('tr', { class: worst && x.key === worst.key ? 'hl' : null }, h('th', { scope: 'row' }, rotLabel(x.key)), h('td', {}, String(x.n)), h('td', {}, String(x.won)),
          h('td', {}, `${x.diff > 0 ? '+' : ''}${x.diff}`), h('td', {}, x.soN ? `${x.so}% (${x.soW}/${x.soN})` : '—'), h('td', {}, x.bpN ? `${x.bp}% (${x.bpW}/${x.bpN})` : '—'))))))) : null,
    rows.length ? h('section', { class: 'stack' }, sectionTitle('Por jugador'),
      h('div', { class: 'tablewrap' }, h('table', { class: 'stbl' },
        h('thead', {}, h('tr', {}, ['Jugador', 'Pts', 'Saque (ace/err/total)', 'Recepción (prom., % buena)', 'Ataque (pts/err/total, efic.)', 'Bloqueo', 'Defensa'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, rows.map((x) => h('tr', {},
          h('th', { scope: 'row' }, x.name), h('td', {}, String(x.m.points)),
          h('td', {}, x.m.serves ? `${x.m.aces}/${x.m.svErr}/${x.m.serves}` : '—'),
          h('td', {}, x.m.recs ? `${x.m.recAvg} · ${x.m.recPos}%` : '—'),
          h('td', {}, x.m.atts ? `${x.m.kills}/${x.m.atErr}/${x.m.atts} · ${fmtEff(x.m.atEff)}` : '—'),
          h('td', {}, x.m.blocks || x.m.blkTouch ? `${x.m.blocks} pts, ${x.m.blkTouch} toques` : '—'),
          h('td', {}, x.m.digs ? `${x.m.digOk}/${x.m.digs}` : '—'))))))) : empty('Sin estadística', canEdit ? 'Captura las acciones en la pestaña Captura para ver la estadística por jugador.' : 'Este partido no tiene acciones capturadas.'),
    zoneSection(log, ctx),
    videoSection(m, canEdit),
    rows.length ? h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'Cómo leer estos números')),
      h('ul', { class: 'plain', style: { marginTop: '10px' } },
        h('li', {}, 'Side-out: de los rallies en que el rival sacaba, cuántos ganaron. Break point: de los rallies en que ustedes sacaban, cuántos ganaron. Son las dos cifras que mejor explican quién gana un set.'),
        h('li', {}, 'Por rotación: con la alineación de cada set, Remate sigue la rotación. Se nombra por la zona del colocador (o por número si no hay colocador en cancha).'),
        h('li', {}, 'Eficiencia de ataque = (remates punto − errores − bloqueados) ÷ remates totales. Un número positivo significa que tu ataque gana más de lo que regala.'),
        h('li', {}, 'Recepción: 3 perfecta (el colocador elige), 2 buena, 1 mala (solo bola alta), 0 error. El promedio va de 0 a 3.'),
        h('li', {}, 'Puntos del jugador = aces + remates punto + bloqueos punto.'))) : null,
    coach ? h('div', { class: 'cluster' },
      h('button', { class: 'btn', type: 'button', onclick: () => coachLogSheet(null, { kind: 'partido', match_id: m.id, log_date: m.match_date }) }, ic('notebook-pen', 18), 'Escribir en tu bitácora'),
      h('button', { class: 'btn danger', type: 'button', onclick: async () => {
        if (await confirmSheet({ title: '¿Borrar este partido?', text: 'Se borran el marcador, la captura, la convocatoria y la estadística de todos los jugadores en este partido.', ok: 'Borrar', danger: true })) { remove('matches', m.id); toast('Partido borrado'); location.hash = '#/partidos'; }
      } }, ic('trash-2', 18), 'Borrar partido')) : null);
}

// ---------- Lo que ve el jugador ----------
export function playerMatchView(m, ctx) {
  const me = ctx.me, r = result(m);
  const mine = state.data.matchStats.find((s) => s.match_id === m.id && s.player_id === me?.id), mm = mine ? metrics(mine.counts) : null;
  const upcoming = m.status === 'planeado' || (m.status !== 'terminado' && m.match_date >= todayStr());
  return h('div', { class: 'page' },
    h('section', { class: 'panel stack' },
      h('div', { class: 'split' }, h('h2', {}, m.status === 'terminado' ? `${r.win ? 'Ganamos' : 'Perdimos'} ${r.text}` : upcoming ? 'Próximo partido' : `Sets ${r.text}`)),
      h('p', { style: { margin: 0 } }, `${fmtDate(m.match_date, { weekday: 'long', day: 'numeric', month: 'long' })}${m.venue ? `, ${m.venue}` : ''}`),
      (m.sets || []).length ? h('div', { class: 'cluster' }, m.sets.map((s, i) => h('span', { class: `chip ${s.us > s.them ? 'ok' : s.them > s.us ? 'bad' : ''}` }, `Set ${i + 1}: ${s.us}-${s.them}`))) : null,
      m.note ? h('p', { style: { margin: 0 } }, m.note) : null),
    upcoming && me ? (torneoById(m.tournament_id) ? tourRsvpNote(m) : h('section', { class: 'stack' }, sectionTitle('¿Vas?'), rsvpControl(m, me, ctx.readonly))) : null,
    mm ? h('section', { class: 'stack' }, sectionTitle('Tus números'),
      h('div', { class: 'kpis' }, k(String(mm.points), 'Puntos'), k(mm.serves ? `${mm.svIn}%` : '—', `Saques dentro (${mm.serves})`), k(mm.recs ? `${mm.recAvg}` : '—', 'Recepción (0 a 3)')),
      h('div', { class: 'kpis' }, k(String(mm.aces), 'Aces'), k(String(mm.kills), 'Remates punto'), k(String(mm.blocks), 'Bloqueos punto'))) : null,
    videoSection(m, false),
    !mm && !upcoming ? note('En este partido no hay acciones tuyas capturadas.') : null);
}
