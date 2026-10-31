// Scouting del rival: una ficha por rival con lo que anotas tú (jugadores clave, a dónde sacan, sistema, rotación débil, plan)
// y lo que Remate calcula solo con tus partidos contra ellos. Se guarda en tu perfil privado: solo tú lo ves.
import { h, ic, toast, openSheet, confirmSheet, fmtDate, todayStr, rivalKey } from '../util.js';
import { state, profile, saveProfile, players, labReady } from '../store.js';
import { result, replay, phaseStats, byRotation, rotLabel, zoneCounts, addCounts, metrics, fmtEff } from '../match-calc.js';
import { sectionTitle, note, empty, field, options } from './ui.js';
import { zoneMapEl } from './partido-summary.js';
import { missingSqlNote } from './lab.js';

export { rivalKey };
const scouting = () => profile().scouting || {};
const SYSTEMS = [['', 'No sé'], ['5-1', '5-1 (un colocador)'], ['6-2', '6-2'], ['4-2', '4-2'], ['otro', 'Otro']];
const POS = [['', 'Posición'], ['punta', 'Punta'], ['opuesto', 'Opuesto'], ['central', 'Central'], ['colocador', 'Colocador'], ['libero', 'Líbero']];
const POS_NAME = Object.fromEntries(POS.filter(([k]) => k));
const ZONES_OURS = [[4, 3, 2], [5, 6, 1]];   // nuestra cancha vista desde la banca (red arriba)

// Todos los rivales: los de tus partidos y los que tienen ficha aunque todavía no jueguen contra ti.
export function rivals() {
  const map = new Map();
  for (const m of state.data.matches) {
    const k = rivalKey(m.rival); if (!k) continue;
    const x = map.get(k) || { key: k, name: m.rival, last: '', matches: [] };
    x.matches.push(m); if (m.match_date >= x.last) { x.last = m.match_date; x.name = m.rival; }   // el nombre como lo escribiste la última vez
    map.set(k, x);
  }
  for (const [k, sc] of Object.entries(scouting())) if (!map.has(k)) map.set(k, { key: k, name: sc.name || k, matches: [] });
  return [...map.values()].map((x) => {
    const done = x.matches.filter((m) => m.status === 'terminado'), wins = done.filter((m) => result(m).win).length;
    const next = x.matches.filter((m) => m.status !== 'terminado' && m.match_date >= todayStr()).sort((a, b) => a.match_date.localeCompare(b.match_date))[0] || null;
    return { ...x, done, wins, losses: done.length - wins, next, sc: scouting()[x.key] || null };
  }).sort((a, b) => (a.next ? 0 : 1) - (b.next ? 0 : 1) || (a.next?.match_date || '').localeCompare(b.next?.match_date || '') || b.matches.length - a.matches.length || a.name.localeCompare(b.name, 'es'));
}

// ---------- hoja para editar la ficha ----------
function scoutSheet(rv) {
  const sc = { name: rv.name, system: '', weakRot: '', weakNote: '', serveZones: [], players: [], strengths: '', weaknesses: '', plan: '', ...(rv.sc || {}) };
  const zones = new Set(sc.serveZones || []);
  const list = (sc.players || []).map((p) => ({ ...p }));
  const system = h('select', {}, options(SYSTEMS, sc.system));
  const weak = h('select', {}, options([['', 'No sé'], ...[1, 2, 3, 4, 5, 6].map((z) => [String(z), `Con su colocador en zona ${z}`])], sc.weakRot ? String(sc.weakRot) : ''));
  const weakNote = h('input', { type: 'text', maxlength: 120, value: sc.weakNote || '', placeholder: 'Opcional. Por ejemplo: les cuesta recibir con 3' });
  const ta = (v, ph) => h('textarea', { rows: 2, maxlength: 600, placeholder: ph }, v || '');
  const strengths = ta(sc.strengths, 'Por ejemplo: bloqueo alto por zona 4, defensa muy ordenada');
  const weaknesses = ta(sc.weaknesses, 'Por ejemplo: recepción débil en zona 5, su opuesto falla mucho el saque');
  const plan = ta(sc.plan, 'Qué vamos a hacer: a quién sacarle, a dónde atacar, cómo bloquear');
  const zoneGrid = h('div', { class: 'sc-zones', role: 'group', 'aria-label': 'Zonas de tu cancha a donde sacan' });
  const drawZones = () => zoneGrid.replaceChildren(h('span', { class: 'sc-net' }, 'Red'), ...ZONES_OURS.flat().map((z) => h('button', { type: 'button', class: 'sc-zone', 'aria-pressed': zones.has(z) ? 'true' : 'false',
    onclick: () => { if (zones.has(z)) zones.delete(z); else zones.add(z); drawZones(); } }, `Zona ${z}`)));
  drawZones();
  const plBox = h('div', { class: 'stack' });
  const drawPlayers = () => plBox.replaceChildren(...list.map((p, i) => h('div', { class: 'sc-player' },
    h('input', { type: 'text', inputmode: 'numeric', maxlength: 3, value: p.num || '', placeholder: '#', 'aria-label': 'Número', oninput: (e) => { p.num = e.target.value.replace(/\D/g, ''); } }),
    h('select', { 'aria-label': 'Posición', onchange: (e) => { p.pos = e.target.value; } }, options(POS, p.pos || '')),
    h('label', { class: 'check', title: 'Ataca mucho' }, h('input', { type: 'checkbox', checked: p.attacks ? true : null, onchange: (e) => { p.attacks = e.target.checked; } }), h('span', {}, 'Ataca mucho')),
    h('input', { type: 'text', maxlength: 140, value: p.note || '', placeholder: 'Nota: qué hace, a dónde ataca', 'aria-label': 'Nota', class: 'sc-note', oninput: (e) => { p.note = e.target.value; } }),
    h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Quitar jugador', onclick: () => { list.splice(i, 1); drawPlayers(); } }, ic('trash-2', 16)))));
  drawPlayers();
  openSheet({
    title: `Scouting: ${rv.name}`,
    body: h('div', { class: 'stack' },
      note('Solo tú ves esta ficha. Anota por número y posición; evita datos personales o de salud de jugadores de otros equipos.'),
      h('div', { class: 'grid' }, field('Su sistema', system), field('Su rotación más débil', weak)), field('Sobre esa rotación', weakNote),
      h('div', { class: 'field' }, h('span', { class: 'label' }, '¿A dónde sacan? (tu cancha)'), zoneGrid),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Jugadores clave'), plBox,
        h('button', { class: 'btn sm', type: 'button', onclick: () => { list.push({ num: '', pos: '', attacks: false, note: '' }); drawPlayers(); } }, ic('plus', 16), 'Agregar jugador')),
      field('Fortalezas', strengths), field('Debilidades', weaknesses), field('Plan para el siguiente partido', plan)),
    actions: [{ label: 'Cancelar' },
      rv.sc ? { label: 'Borrar ficha', kind: 'danger', onClick: async () => {
        if (!(await confirmSheet({ title: '¿Borrar la ficha?', text: 'Se borran tus notas de este rival. Sus partidos no se tocan.', ok: 'Borrar', danger: true }))) return false;
        const all = { ...scouting() }; delete all[rv.key]; saveProfile({ scouting: all }); toast('Ficha borrada'); return true; } } : null,
      { label: 'Guardar', kind: 'primary', onClick: () => {
        const row = { name: rv.name, system: system.value, weakRot: weak.value ? Number(weak.value) : null, weakNote: weakNote.value.trim(), serveZones: [...zones].sort(),
          players: list.filter((p) => p.num || p.note).map((p) => ({ num: String(p.num || '').slice(0, 3), pos: p.pos || '', attacks: !!p.attacks, note: String(p.note || '').trim().slice(0, 140) })),
          strengths: strengths.value.trim(), weaknesses: weaknesses.value.trim(), plan: plan.value.trim(), updated: todayStr() };
        saveProfile({ scouting: { ...scouting(), [rv.key]: row } }); toast('Scouting guardado'); return true;
      } }].filter(Boolean),
  });
}

// ---------- pantallas ----------
function list(ctx) {
  const all = rivals(), ro = !labReady();
  const el = h('div', { class: 'page' },
    ro ? missingSqlNote() : null,
    h('p', { style: { margin: 0 } }, 'Una ficha por rival: lo que observas tú y lo que dicen tus partidos contra ellos. Solo tú la ves.'),
    all.length ? h('div', { class: 'rows' }, all.map((r) => h('a', { class: 'row', href: `#/rival/${r.key}` },
      h('span', { class: 'jersey off', 'aria-hidden': 'true' }, ic('eye', 20)),
      h('span', { class: 'row-main' }, h('strong', {}, r.name),
        h('span', { class: 'row-sub' }, [r.done.length ? `${r.wins}-${r.losses} contra ellos` : 'Sin partidos jugados', r.next ? `próximo: ${fmtDate(r.next.match_date, { weekday: 'short', day: 'numeric', month: 'short' })}` : null].filter(Boolean).join(' · '))),
      h('span', { class: 'row-end' }, r.sc ? h('span', { class: 'chip ok' }, 'Con ficha') : h('span', { class: 'chip' }, 'Sin ficha'), ic('chevron-right', 18)))))
      : empty('Sin rivales todavía', 'Cuando crees partidos, aquí aparece cada rival. También puedes empezar una ficha antes de jugar contra ellos.'),
    ro ? null : h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', onclick: () => newRivalSheet() }, ic('plus', 18), 'Ficha de un rival nuevo')));
  return { title: 'Scouting de rivales', back: '#/partidos', el };
}
function newRivalSheet() {
  const name = h('input', { type: 'text', maxlength: 60, placeholder: 'Nombre del equipo rival' });
  openSheet({ title: 'Rival nuevo', body: h('div', { class: 'stack' }, field('Nombre', name, 'Escríbelo igual que en tus partidos para que se junten.')),
    actions: [{ label: 'Cancelar' }, { label: 'Crear ficha', kind: 'primary', onClick: () => {
      const n = name.value.trim(), k = rivalKey(n); if (!k) { toast('Escribe el nombre'); return false; }
      setTimeout(() => { location.hash = `#/rival/${k}`; const rv = rivals().find((x) => x.key === k) || { key: k, name: n, matches: [], sc: null }; scoutSheet(rv); }, 60); return true; } }] });
}

function ficha(ctx, key) {
  const rv = rivals().find((r) => r.key === key);
  if (!rv) return { title: 'Rival', back: '#/rivales', el: h('div', { class: 'page' }, empty('No encontré ese rival', 'Puede que se haya cambiado el nombre del partido.', h('a', { class: 'btn', href: '#/rivales' }, 'Ver rivales'))) };
  const sc = rv.sc, ro = !labReady();
  // De tus partidos contra ellos.
  const logs = rv.done.map((m) => ({ m, log: state.data.matchLogs.find((l) => l.match_id === m.id)?.log || [] }));
  const rallies = logs.flatMap(({ m, log }) => replay(log, m.lineups || [], players()).rallies);
  const ph = phaseStats(rallies), rots = byRotation(rallies).filter((r) => r.n >= 4);
  const worst = rots.length > 1 ? rots.reduce((a, b) => (b.diff < a.diff ? b : a)) : null;
  const allLog = logs.flatMap((x) => x.log);
  const sv = zoneCounts(allLog, 'sv'), at = zoneCounts(allLog, 'at');
  const hasZones = Object.values(sv).some((c) => c.n) || Object.values(at).some((c) => c.n);
  const team = metrics(addCounts(...state.data.matchStats.filter((s) => rv.done.some((m) => m.id === s.match_id)).map((s) => s.counts)));
  const ours = (z) => (sc?.serveZones || []).includes(z);
  const el = h('div', { class: 'page rival' },
    ro ? missingSqlNote() : null,
    h('section', { class: 'band next stack' }, h('span', { class: 'when' }, 'Scouting del rival'), h('h2', {}, rv.name),
      h('p', { style: { margin: 0 } }, rv.done.length ? `Contra ellos: ${rv.wins} ${rv.wins === 1 ? 'ganado' : 'ganados'} y ${rv.losses} ${rv.losses === 1 ? 'perdido' : 'perdidos'}.` : 'Todavía no hay partidos terminados contra ellos.'),
      rv.next ? h('p', { style: { margin: 0 } }, h('a', { href: `#/partido/${rv.next.id}`, style: { color: 'inherit' } }, `Próximo partido: ${fmtDate(rv.next.match_date, { weekday: 'long', day: 'numeric', month: 'long' })}`)) : null),
    // Lo que anotas tú
    h('section', { class: 'stack' }, sectionTitle('Tu scouting', ro ? null : h('button', { class: 'btn sm primary', type: 'button', onclick: () => scoutSheet(rv) }, ic('pencil', 16), sc ? 'Editar' : 'Llenar ficha')),
      sc ? h('div', { class: 'stack' },
        h('div', { class: 'grid sc-facts' },
          h('div', { class: 'panel' }, h('span', { class: 'row-sub' }, 'Sistema'), h('strong', {}, SYSTEMS.find(([k]) => k === sc.system)?.[1] || 'No sé')),
          h('div', { class: 'panel' }, h('span', { class: 'row-sub' }, 'Su rotación débil'), h('strong', {}, sc.weakRot ? `Colocador en zona ${sc.weakRot}` : 'No sé'), sc.weakNote ? h('span', { class: 'row-sub' }, sc.weakNote) : null)),
        h('div', { class: 'panel stack' }, h('strong', {}, '¿A dónde sacan?'),
          (sc.serveZones || []).length ? h('div', { class: 'sc-zones view', role: 'img', 'aria-label': `Sacan a las zonas ${sc.serveZones.join(', ')} de tu cancha` }, h('span', { class: 'sc-net' }, 'Red'),
            ZONES_OURS.flat().map((z) => h('span', { class: `sc-zone ${ours(z) ? 'on' : ''}` }, `Zona ${z}`))) : h('p', { class: 'row-sub', style: { margin: 0 } }, 'Sin anotar.'),
          h('span', { class: 'row-sub' }, 'Tu cancha vista desde tu banca. Pon a recibir ahí a tus mejores receptores.')),
        (sc.players || []).length ? h('div', { class: 'rows' }, sc.players.slice().sort((a, b) => (b.attacks ? 1 : 0) - (a.attacks ? 1 : 0)).map((p) => h('div', { class: 'row' },
          h('span', { class: 'jersey', 'aria-hidden': 'true' }, p.num || '?'),
          h('span', { class: 'row-main' }, h('strong', {}, `#${p.num || '?'}${p.pos ? ` · ${POS_NAME[p.pos]}` : ''}`), p.note ? h('span', { class: 'row-sub' }, p.note) : null),
          p.attacks ? h('span', { class: 'row-end' }, h('span', { class: 'chip warn' }, 'Ataca mucho')) : null))) : null,
        sc.strengths ? h('div', { class: 'panel' }, h('strong', {}, 'Fortalezas'), h('p', { style: { margin: '4px 0 0' } }, sc.strengths)) : null,
        sc.weaknesses ? h('div', { class: 'panel' }, h('strong', {}, 'Debilidades'), h('p', { style: { margin: '4px 0 0' } }, sc.weaknesses)) : null,
        sc.plan ? h('div', { class: 'panel sc-plan' }, h('strong', {}, 'Plan para el siguiente partido'), h('p', { style: { margin: '4px 0 0' } }, sc.plan)) : null,
        sc.updated ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Actualizada el ${fmtDate(sc.updated, { day: 'numeric', month: 'long' })}.`) : null)
        : h('p', { class: 'row-sub', style: { margin: 0 } }, 'Anota sus jugadores clave, a dónde sacan, su sistema, su rotación débil y tu plan. Remate no captura las acciones del rival, así que esto lo llenas tú al verlos jugar o en video.')),
    // Lo que calcula Remate
    h('section', { class: 'stack' }, sectionTitle('De tus partidos contra ellos'),
      rv.matches.length ? h('div', { class: 'rows' }, rv.matches.slice().sort((a, b) => b.match_date.localeCompare(a.match_date)).map((m) => { const r = result(m);
        return h('a', { class: 'row', href: `#/partido/${m.id}` }, h('span', { class: 'row-main' }, h('strong', {}, fmtDate(m.match_date, { day: 'numeric', month: 'short', year: 'numeric' })), h('span', { class: 'row-sub' }, [m.venue, r.detail].filter(Boolean).join(' · '))),
          h('span', { class: 'row-end' }, m.status === 'terminado' ? h('span', { class: `chip ${r.win ? 'ok' : 'bad'}` }, `${r.win ? 'Ganado' : 'Perdido'} ${r.text}`) : h('span', { class: 'chip info' }, 'Próximo'), ic('chevron-right', 18))); })) : null,
      rv.done.length ? h('div', { class: 'kpis' },
        h('div', { class: 'kpi' }, h('span', { class: 'n' }, ph.so != null ? `${ph.so}%` : '—'), h('span', { class: 'l' }, 'Side-out (ganamos recibiendo)')),
        h('div', { class: 'kpi' }, h('span', { class: 'n' }, ph.bp != null ? `${ph.bp}%` : '—'), h('span', { class: 'l' }, 'Break point (ganamos sacando)')),
        h('div', { class: 'kpi' }, h('span', { class: 'n' }, fmtEff(team.atEff)), h('span', { class: 'l' }, 'Nuestra eficiencia de ataque'))) : null,
      worst ? note(`Nuestra rotación más débil contra ellos: ${rotLabel(worst.key)} (${worst.won} de ${worst.n} puntos). Prepárala en el entrenamiento antes de volver a jugarles.`, 'warn') : null,
      hasZones ? h('div', { class: 'grid' }, zoneMapEl(sv, { caption: 'Dónde caen nuestros saques' }), zoneMapEl(at, { caption: 'Dónde caen nuestros ataques' })) : null,
      rv.done.length && !rallies.length && !hasZones ? h('p', { class: 'row-sub', style: { margin: 0 } }, 'Para ver side-out, rotaciones y zonas, captura los partidos con alineación y con «Marcar zona».') : null,
      !rv.done.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, 'Cuando termines un partido contra ellos, aquí aparece qué tan bien recibes y sacas, tu rotación más débil y dónde les haces daño.') : null));
  return { title: 'Scouting', sub: rv.name, back: '#/rivales', el };
}

export default function rivales(ctx) {
  return ctx.args[0] ? ficha(ctx, ctx.args[0]) : list(ctx);
}
