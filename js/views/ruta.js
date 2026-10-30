// La ruta de 6 niveles y los retos (entrenador y jugador).
import { h, ic, toast, fmtDate, plural } from '../util.js';
import { state, players, getPlayer, add, remove, resolveClaim } from '../store.js';
import { levelGap, xpFor, XP_RULES, currentRatings } from '../calc.js';
import { SKILLS, SKILL_BY_ID, POSITION_NAME } from '../content/skills.js';
import { LEVELS, required } from '../content/levels.js';
import { CHALLENGES } from '../content/challenges.js';
import { dots, sectionTitle, note, jersey } from './ui.js';

export default function ruta(ctx) {
  const ui = ctx.ui; ui.tab ??= 'niveles';
  if (!ui.init) { ui.init = true; if (['niveles', 'retos'].includes(ctx.args[0])) ui.tab = ctx.args[0]; }
  const tabs = [['niveles', 'Niveles'], ['retos', 'Retos']];
  const panel = h('div', { class: 'stack', role: 'tabpanel' });
  const bar = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Ruta' }, tabs.map(([id, t]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(ui.tab === id), onclick: () => { ui.tab = id; paint(); } }, t)));
  function paint() {
    [...bar.children].forEach((b, i) => b.setAttribute('aria-selected', String(tabs[i][0] === ui.tab)));
    panel.replaceChildren(ui.tab === 'niveles' ? niveles(ctx) : retos(ctx));
  }
  paint();
  return { title: 'Ruta', el: h('div', { class: 'page' }, h('p', { style: { margin: 0, color: 'var(--ink-2)' } },
    'Seis niveles, de “primer toque” a “élite”. Se sube con un examen práctico; las fases de cada habilidad dicen cuándo conviene presentarlo.'), bar, panel) };
}

// ---------- niveles ----------
function niveles(ctx) {
  const me = ctx.role === 'player' ? ctx.me : null;
  const list = ctx.role === 'coach' ? players() : [];
  const cur = me ? currentRatings(me.id, state.data.ratings) : {};
  const gap = me ? levelGap(me, state.data.ratings) : null;
  const out = h('div', { class: 'stack' });
  if (me) out.append(note(`Las fases se ajustan a tu posición (${POSITION_NAME[me.position]}): por ejemplo, un líbero no se mide en remate ni bloqueo. Los puntos amarillos marcan lo que pide tu siguiente nivel.`));
  out.append(h('div', { class: 'ladder' }, LEVELS.map((l) => {
    const isNow = me && me.level === l.n, isNext = gap && !gap.top && gap.target === l.n;
    const here = list.filter((p) => p.level === l.n);
    const body = h('div', { class: 'lv-body' },
      h('p', { style: { margin: 0 } }, l.desc),
      h('div', {}, h('h3', {}, 'Qué se trabaja'), h('ul', {}, l.focus.map((f) => h('li', {}, f)))),
      h('div', {}, h('h3', {}, l.n === 1 ? 'Fases' : 'Fases que se piden para entrar'),
        l.n === 1 ? h('p', { style: { margin: 0 } }, 'Es el punto de partida: no se pide ninguna fase.') :
          h('div', { class: 'profile' }, SKILLS.map((s) => {
            const need = required(me?.position, s.id, l.n);
            return h('div', {}, h('span', {}, s.name), need === null ? h('span', { class: 'chip' }, 'No aplica') : me ? dots(cur[s.id] || 0, need) : dots(need, 0));
          }))),
      l.n === 1 ? null : h('div', {}, h('h3', {}, 'Examen para entrar'),
        h('ul', {}, l.exam.map((c) => h('li', {}, c.text, c.kind === 'ratio' ? `. Mínimo ${c.min} de ${c.total}.` : '.')))),
      ctx.role === 'coach' ? h('div', {}, h('h3', {}, 'Jugadores en este nivel'),
        here.length ? h('div', { class: 'avatars' }, here.map((p) => h('a', { href: `#/jugador/${p.id}` }, jersey(p, 'sm'), p.name))) : h('p', { style: { margin: 0 }, class: 'muted' }, 'Nadie por ahora.')) : null);
    return h('details', { class: `lv-item ${isNow ? 'now' : ''}`, open: isNext || isNow ? true : null },
      h('summary', {}, h('span', { class: 'big' }, String(l.n)),
        h('span', { class: 'tt' }, h('strong', {}, l.name), h('span', {}, l.tag)),
        isNow ? h('span', { class: 'chip ball' }, 'Tu nivel') : isNext ? h('span', { class: 'chip info' }, 'Siguiente') : ctx.role === 'coach' ? h('span', { class: 'chip' }, plural(here.length, 'jugador', 'jugadores')) : null,
        h('span', { class: 'chev' }, ic('chevron-right', 20))), body);
  })));
  return out;
}

// ---------- retos ----------
function retos(ctx) {
  const d = state.data, out = h('div', { class: 'stack' });
  const me = ctx.role === 'player' ? ctx.me : null;
  const readonly = !!ctx.readonly;
  if (me) {
    const xp = xpFor(me, d);
    out.append(h('div', { class: 'panel stack' }, h('div', { class: 'split' }, h('h2', {}, 'Tus puntos XP'), h('span', { class: 'num', style: { fontSize: '2.4rem', color: 'var(--court)' } }, String(xp))),
      h('p', { style: { margin: 0 }, class: 'muted' }, `Ganas ${XP_RULES.presente} XP por entrenamiento al que llegas a tiempo, ${XP_RULES.retardo} si llegas tarde, los puntos de cada reto aprobado y ${XP_RULES.examen} al aprobar un examen de nivel. Los puntos no cambian tu nivel: el nivel solo sube con el examen.`)));
    if (readonly) out.append(note('Vista previa: así lo ve el jugador. Aquí no se piden retos por él.', 'warn'));
  } else {
    const pend = d.claims.filter((c) => c.status === 'solicitada');
    out.append(sectionTitle('Por aprobar'), pend.length ? h('div', { class: 'rows' }, pend.map((c) => {
      const p = getPlayer(c.player_id), ch = CHALLENGES.find((x) => x.id === c.challenge_id); if (!p || !ch) return null;
      return h('div', { class: 'row', style: { flexWrap: 'wrap' } }, jersey(p), h('span', { class: 'row-main', style: { flex: '1 1 200px' } }, h('strong', {}, `${p.name}: ${ch.name}`), h('span', { class: 'row-sub' }, `${ch.xp} XP. ${ch.verify}`)),
        h('span', { class: 'row-end', style: { marginLeft: 'auto' } }, h('button', { class: 'btn sm primary', type: 'button', onclick: () => { resolveClaim(c.id, true); toast('Reto aprobado'); } }, 'Aprobar'),
          h('button', { class: 'btn sm', type: 'button', onclick: () => { resolveClaim(c.id, false); toast('Reto rechazado'); } }, 'Rechazar')));
    })) : note('No hay retos por aprobar.'));
  }
  const claimOf = (cid) => me ? d.claims.filter((c) => c.player_id === me.id && c.challenge_id === cid).sort((a, b) => String(b.claimed_at).localeCompare(String(a.claimed_at)))[0] : null;
  const row = (c) => {
    const claim = claimOf(c.id), done = claim?.status === 'aprobada';
    const doneBy = ctx.role === 'coach' ? new Set(d.claims.filter((x) => x.challenge_id === c.id && x.status === 'aprobada').map((x) => x.player_id)).size : 0;
    let end = null;
    if (me) {
      if (done) end = h('span', { class: 'chip ok' }, 'Hecho');
      else if (claim?.status === 'solicitada') end = [h('span', { class: 'chip warn' }, 'Esperando a tu entrenador'), readonly ? null : h('button', { class: 'btn sm', type: 'button', onclick: () => { remove('claims', claim.id); toast('Solicitud cancelada'); } }, 'Cancelar')];
      else if (!readonly) end = h('button', { class: 'btn sm primary', type: 'button', onclick: () => { add('claims', { player_id: me.id, challenge_id: c.id }); toast('Listo: tu entrenador lo revisará'); } }, claim?.status === 'rechazada' ? 'Intentar otra vez' : 'Pedir aprobación');
    } else end = doneBy ? h('span', { class: 'chip ok' }, plural(doneBy, 'jugador lo logró', 'jugadores lo lograron')) : null;
    return h('div', { class: `reto ${done ? 'done' : ''}` },
      h('div', { class: 'head' }, h('div', {}, h('strong', {}, c.name), h('div', { class: 'row-sub' }, `${SKILL_BY_ID[c.skill].name}, niveles ${c.levels[0]} a ${c.levels[1]}`)), h('span', { class: 'xp' }, `${c.xp} XP`)),
      h('p', { style: { margin: 0 } }, c.desc), h('p', { class: 'row-sub', style: { margin: 0 } }, `Cómo se aprueba: ${c.verify}`),
      claim?.status === 'rechazada' ? h('p', { class: 'row-sub', style: { margin: 0, color: 'var(--bad)' } }, 'Tu último intento no se aprobó. Puedes volver a intentarlo.') : null,
      end ? h('div', { class: 'cluster' }, end) : null);
  };
  const mine = me ? CHALLENGES.filter((c) => c.levels[0] <= me.level && me.level <= c.levels[1]) : [];
  if (me) {
    out.append(sectionTitle(`Para tu nivel (${me.level})`), h('div', { class: 'rows' }, mine.length ? mine.map(row) : note('No hay retos para tu nivel.')));
    const rest = CHALLENGES.filter((c) => !mine.includes(c));
    if (rest.length) out.append(sectionTitle('Otros retos'), h('div', { class: 'rows' }, rest.map(row)));
  } else {
    for (const s of SKILLS) { const l = CHALLENGES.filter((c) => c.skill === s.id); if (l.length) out.append(sectionTitle(s.name), h('div', { class: 'rows' }, l.map(row))); }
  }
  return out;
}
