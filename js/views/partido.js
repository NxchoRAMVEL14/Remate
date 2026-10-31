// Un partido: captura en vivo y resumen (entrenador y ayudantes) o la vista del jugador.
import { h, fmtDate } from '../util.js';
import { state, labReady, isStaff } from '../store.js';
import { KINDS, result } from '../match-calc.js';
import { empty } from './ui.js';
import { matchSheet } from './partidos.js';
import { capture } from './partido-capture.js';
import { summaryView, playerMatchView } from './partido-summary.js';
import { torneoById } from './torneos.js';

export default function partido(ctx) {
  const m = state.data.matches.find((x) => x.id === ctx.args[0]);
  if (!m) return { title: 'Partido', back: '#/partidos', el: h('div', { class: 'page' }, empty('No encontré ese partido', 'Puede que se haya borrado.', h('a', { class: 'btn', href: '#/partidos' }, 'Ver partidos'))) };
  const r = result(m);
  const tor = torneoById(m.tournament_id);
  const sub = `${fmtDate(m.match_date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${tor ? tor.name : KINDS[m.kind]}${m.status === 'terminado' ? ` · ${r.win ? 'Ganado' : 'Perdido'} ${r.text}` : ''}`;
  const backTo = tor ? `#/torneo/${tor.id}` : '#/partidos';
  const coach = ctx.role === 'coach';
  const canEdit = (coach || (isStaff() && !ctx.readonly)) && labReady();
  if (!coach && !canEdit) return { title: `Contra ${m.rival}`, sub, back: backTo, el: playerMatchView(m, ctx) };
  const ui = ctx.ui;
  ui.tab = ui.tab || (m.status === 'terminado' || !canEdit ? 'resumen' : 'captura');
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, [['captura', m.status === 'terminado' ? 'Corregir captura' : 'Captura'], ['resumen', 'Resumen']].map(([id, label]) =>
    h('button', { type: 'button', role: 'tab', 'aria-selected': ui.tab === id ? 'true' : 'false', disabled: id === 'captura' && !canEdit ? true : null, onclick: () => { ui.tab = id; ctx.rerender(); } }, label)));
  const body = ui.tab === 'captura' && canEdit ? capture(m, ctx) : summaryView(m, ctx, { canEdit, coach });
  return { title: `Contra ${m.rival}`, sub, back: backTo,
    actions: canEdit ? [{ icon: 'pencil', label: 'Editar partido', onClick: () => matchSheet(m) }] : [], el: h('div', { class: 'page' }, tabs, body) };
}
