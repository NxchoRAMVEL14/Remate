// Partidos: lista de la temporada, récord y alta de un partido nuevo. El jugador ve resultados y sus propios números.
import { h, ic, toast, openSheet, fmtDate, todayStr, plural } from '../util.js';
import { state, add, patch, group, labReady } from '../store.js';
import { KINDS, result, metrics, addCounts, fmtEff } from '../match-calc.js';
import { sectionTitle, note, empty, field, options } from './ui.js';
import { missingSqlNote } from './lab.js';

export const matchesSorted = () => state.data.matches.slice().sort((a, b) => `${b.match_date}${b.created_at}`.localeCompare(`${a.match_date}${a.created_at}`));

export function matchSheet(m = null, onSaved) {
  const rival = h('input', { type: 'text', maxlength: 60, value: m?.rival || '', placeholder: 'Nombre del equipo rival', required: true });
  const date = h('input', { type: 'date', value: m?.match_date || todayStr() });
  const venue = h('input', { type: 'text', maxlength: 80, value: m?.venue || '', placeholder: 'Opcional' });
  const kind = h('select', {}, options(Object.entries(KINDS), m?.kind || 'amistoso'));
  const bestOf = h('select', {}, options([[3, 'A ganar 2 de 3 sets'], [5, 'A ganar 3 de 5 sets']], m?.best_of || 3));
  const text = h('textarea', { rows: 2, maxlength: 1000, placeholder: 'Opcional. El jugador ve esta nota.' }, m?.note || '');
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  openSheet({
    title: m ? 'Editar partido' : 'Nuevo partido',
    body: h('div', { class: 'stack' }, field('Rival', rival), h('div', { class: 'grid' }, field('Fecha', date), field('Tipo', kind)),
      field('Lugar', venue), field('Formato', bestOf, 'El último set (el decisivo) va a 15 puntos; los demás a 25, con diferencia de 2.'), field('Nota', text), err),
    actions: [{ label: 'Cancelar' }, { label: m ? 'Guardar' : 'Crear partido', kind: 'primary', onClick: () => {
      if (!rival.value.trim()) { err.textContent = 'Escribe el nombre del rival.'; err.hidden = false; return false; }
      const row = { rival: rival.value.trim(), match_date: date.value || todayStr(), venue: venue.value.trim(), kind: kind.value, best_of: Number(bestOf.value), note: text.value.trim() };
      if (m) { patch('matches', m.id, row); toast('Partido actualizado'); onSaved?.(m); return true; }
      const g = group();
      const nm = add('matches', { ...row, group_id: g?.id, status: row.match_date > todayStr() ? 'planeado' : 'en_juego' });
      toast('Partido creado'); onSaved?.(nm); return true;
    } }],
  });
}

const resultChip = (m) => {
  if (m.status === 'planeado') return h('span', { class: 'chip info' }, 'Próximo');
  const r = result(m);
  if (m.status === 'en_juego') return h('span', { class: 'chip warn' }, `En juego ${r.text}`);
  return h('span', { class: `chip ${r.win ? 'ok' : 'bad'}` }, `${r.win ? 'Ganado' : 'Perdido'} ${r.text}`);
};

export default function partidos(ctx) {
  return ctx.role === 'coach' ? coach() : jugador(ctx);
}

function coach() {
  const list = matchesSorted(), ro = !labReady();
  const done = list.filter((m) => m.status === 'terminado');
  const wins = done.filter((m) => result(m).win).length;
  const sets = done.reduce((a, m) => { const r = result(m); return { us: a.us + r.us, them: a.them + r.them }; }, { us: 0, them: 0 });
  const team = metrics(addCounts(...state.data.matchStats.filter((s) => done.some((m) => m.id === s.match_id)).map((s) => s.counts)));
  const el = h('div', { class: 'page' },
    ro ? missingSqlNote() : null,
    ro ? null : h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: () => matchSheet(null, (m) => { location.hash = `#/partido/${m.id}`; }) }, ic('plus', 18), 'Nuevo partido')),
    done.length ? h('div', { class: 'kpis' },
      h('div', { class: 'kpi' }, h('span', { class: 'n' }, `${wins}-${done.length - wins}`), h('span', { class: 'l' }, 'Ganados y perdidos')),
      h('div', { class: 'kpi' }, h('span', { class: 'n' }, `${sets.us}-${sets.them}`), h('span', { class: 'l' }, 'Sets a favor y en contra')),
      h('div', { class: 'kpi' }, h('span', { class: 'n' }, fmtEff(team.atEff)), h('span', { class: 'l' }, 'Eficiencia de ataque'))) : null,
    list.length ? h('div', { class: 'rows' }, list.map((m) => { const r = result(m);
      return h('a', { class: 'row', href: `#/partido/${m.id}` },
        h('span', { class: 'jersey off', 'aria-hidden': 'true' }, ic('volleyball', 22)),
        h('span', { class: 'row-main' }, h('strong', {}, `Contra ${m.rival}`), h('span', { class: 'row-sub' }, [fmtDate(m.match_date, { weekday: 'short', day: 'numeric', month: 'short' }), KINDS[m.kind], r.detail || null].filter(Boolean).join(' · '))),
        h('span', { class: 'row-end' }, resultChip(m), ic('chevron-right', 18)));
    })) : empty('Sin partidos todavía', 'Crea un partido para llevar el marcador por set y capturar en vivo lo que hace cada jugador: saques, recepciones, ataques, bloqueos y defensas.'),
    note('Tus jugadores ven el resultado de cada partido y solo sus propios números. El registro jugada por jugada es solo tuyo.'));
  return { title: 'Partidos', el };
}

function jugador(ctx) {
  const me = ctx.me, list = matchesSorted().filter((m) => m.status !== 'planeado' || m.match_date >= todayStr());
  const mine = state.data.matchStats.filter((s) => s.player_id === me?.id);
  const tot = metrics(addCounts(...mine.map((s) => s.counts)));
  const el = h('div', { class: 'page' },
    mine.length ? h('section', { class: 'stack' }, sectionTitle('Tu temporada'),
      h('div', { class: 'kpis' },
        h('div', { class: 'kpi' }, h('span', { class: 'n' }, String(tot.points)), h('span', { class: 'l' }, 'Puntos (ace, remate y bloqueo)')),
        h('div', { class: 'kpi' }, h('span', { class: 'n' }, tot.recPos != null ? `${tot.recPos}%` : '—'), h('span', { class: 'l' }, 'Recepción buena o perfecta')),
        h('div', { class: 'kpi' }, h('span', { class: 'n' }, tot.svIn != null ? `${tot.svIn}%` : '—'), h('span', { class: 'l' }, 'Saques dentro')))) : null,
    list.length ? h('div', { class: 'rows' }, list.map((m) => {
      const s = mine.find((x) => x.match_id === m.id), mm = s ? metrics(s.counts) : null, r = result(m);
      return h('div', { class: 'row' }, h('span', { class: 'jersey off', 'aria-hidden': 'true' }, ic('volleyball', 22)),
        h('span', { class: 'row-main' }, h('strong', {}, `Contra ${m.rival}`),
          h('span', { class: 'row-sub' }, [fmtDate(m.match_date, { weekday: 'short', day: 'numeric', month: 'short' }), r.detail || null].filter(Boolean).join(' · ')),
          mm ? h('span', { class: 'row-sub' }, `Tú: ${plural(mm.points, 'punto', 'puntos')}, ${plural(mm.aces, 'ace', 'aces')}, ${plural(mm.kills, 'remate', 'remates')}, ${plural(mm.blocks, 'bloqueo', 'bloqueos')}${mm.recs ? `, recepción ${mm.recAvg} de 3` : ''}`) : null,
          m.note ? h('span', { class: 'row-sub' }, m.note) : null),
        h('span', { class: 'row-end' }, resultChip(m)));
    })) : empty('Sin partidos todavía', 'Aquí verás los resultados de tu equipo y tus números en cada partido.'));
  return { title: 'Partidos', el };
}
