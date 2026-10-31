// Hojas emergentes del entrenador sobre un jugador: datos, evaluación, examen, código y notas.
import { h, ic, openSheet, confirmSheet, toast, copyText, shareText, newJoinCode, todayStr, fmtDate } from '../util.js';
import { add, patch, remove, group, rate, recordExam, state, multiTeam, teams, teamOf, teamsOf, equiposReady, gymReady } from '../store.js';
import { SKILLS, PHASES, POSITIONS, BRANCHES, HANDS, POSITION_NAME } from '../content/skills.js';
import { LEVELS, required } from '../content/levels.js';
import { currentRatings, levelGap, nextLevelN } from '../calc.js';
import { field, options, note } from './ui.js';

// ---------- alta y edición ----------
// self: el perfil de jugador del propio entrenador (adulto: no pide autorización ni genera código).
export function playerFormSheet(p = null, { self = false, name: suggested = '', onSaved } = {}) {
  const name = h('input', { type: 'text', maxlength: 40, required: true, value: p?.name || suggested, autocomplete: 'off' });
  const branch = h('select', {}, options([['', 'Sin definir'], ...Object.entries(BRANCHES)], p?.branch || ''));
  const pos = h('select', {}, options(POSITIONS.map((x) => [x.id, x.name]), p?.position || 'sin_definir'));
  const hand = h('select', {}, options([['', 'Sin definir'], ...Object.entries(HANDS)], p?.hand || ''));
  const height = h('input', { type: 'number', min: 120, max: 230, inputmode: 'numeric', value: p?.height_cm ?? '' });
  const jersey = h('input', { type: 'number', min: 0, max: 99, inputmode: 'numeric', value: p?.jersey ?? '' });
  const consent = h('input', { type: 'checkbox', checked: p?.consent_at ? true : null });
  const team = multiTeam() ? h('select', {}, options(teams().map((t) => [t.id, t.name]), p ? teamOf(p) : teams()[0].id)) : null;
  // Comodín: otras posiciones que juega bien (además de la principal). Necesita el SQL de la v3.5.
  const extra = new Set(Array.isArray(p?.positions) ? p.positions : []);
  const extraBox = equiposReady() ? h('div', { class: 'cluster pos-extra' }) : null;
  const drawExtra = () => extraBox?.replaceChildren(...POSITIONS.filter((x) => x.id !== 'sin_definir' && x.id !== pos.value).map((x) =>
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: extra.has(x.id) ? true : null, onchange: (e) => { if (e.target.checked) extra.add(x.id); else extra.delete(x.id); } }), h('span', {}, x.name))));
  pos.addEventListener('change', drawExtra); drawExtra();
  // v3.6: además de su equipo principal, otros equipos donde también juega (por ejemplo varonil y mixto).
  const moreTeams = new Set(p ? teamsOf(p).slice(1) : []);
  const teamsBox = team && gymReady() ? h('div', { class: 'cluster pos-extra' }) : null;
  const drawTeams = () => teamsBox?.replaceChildren(...teams().filter((t) => t.id !== team.value).map((t) =>
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: moreTeams.has(t.id) ? true : null, onchange: (e) => { if (e.target.checked) moreTeams.add(t.id); else moreTeams.delete(t.id); } }), h('span', {}, t.name))));
  team?.addEventListener('change', () => { moreTeams.delete(team.value); drawTeams(); }); drawTeams();
  const num = (el) => (el.value === '' ? null : Number(el.value));
  return openSheet({
    title: self ? 'Mi perfil de jugador' : p ? 'Editar jugador' : 'Nuevo jugador',
    body: h('div', { class: 'stack' },
      self ? note('Es tu ficha para jugar con ellos (por ejemplo en un equipo mixto): sales en la lista, en la alineación y en la captura de partidos, y tienes tu tarjeta, radar, Teoría y retos.') : null,
      field('Nombre o apodo', name, self ? 'Así te verán en la lista y en la alineación.' : 'Solo nombre o apodo. No pidas teléfono, domicilio ni fotos.'),
      h('div', { class: 'grid' }, field('Rama', branch), field('Posición', pos), field('Mano de ataque', hand)),
      extraBox ? field('También juega bien de (comodín)', extraBox, 'Opcional. Su radar se puede ver con cada posición; el nivel y el examen se deciden con la principal.') : null,
      h('div', { class: 'grid' }, field('Estatura (cm)', height), field('Número de playera', jersey), team ? field(teamsBox ? 'Equipo principal' : 'Equipo', team) : null),
      teamsBox ? field('También juega en', teamsBox, 'Opcional. Ve la convocatoria y sale en la lista de cada equipo que marques.') : null,
      self ? null : h('label', { class: 'check' }, consent, 'Ya tengo la autorización de su madre, padre o tutor')),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      const n = name.value.trim();
      if (n.length < 1) { name.focus(); toast('Escribe un nombre o apodo'); return false; }
      const h_ = num(height), j = num(jersey);
      if (h_ != null && (h_ < 120 || h_ > 230)) { toast('La estatura debe estar entre 120 y 230 cm'); return false; }
      if (j != null && (j < 0 || j > 99)) { toast('El número va de 0 a 99'); return false; }
      const data = { name: n, branch: branch.value || null, position: pos.value, hand: hand.value || null, height_cm: h_, jersey: j,
        consent_at: self || consent.checked ? (p?.consent_at || new Date().toISOString()) : null };
      if (team) data.team = team.value;
      if (teamsBox) data.teams = teams().map((t) => t.id).filter((id) => moreTeams.has(id) && id !== team.value);
      if (extraBox) data.positions = POSITIONS.map((x) => x.id).filter((id) => extra.has(id) && id !== pos.value && id !== 'sin_definir');
      if (p) { patch('players', p.id, data); toast('Guardado'); onSaved?.(p); }
      else if (self) { const np = add('players', { ...data, group_id: group()?.id, level: 1 }); toast('Listo: ya tienes tu perfil de jugador'); onSaved?.(np); }
      else { const np = add('players', { ...data, group_id: group()?.id, level: 1 }); toast('Jugador agregado'); setTimeout(() => codeSheet(np), 200); }
    } }],
  });
}

export async function deletePlayer(p) {
  const ok = await confirmSheet({ title: `¿Eliminar a ${p.name}?`, ok: 'Eliminar', danger: true,
    text: 'Se borran también su asistencia, evaluaciones, exámenes, retos y notas. No se puede deshacer.' });
  if (ok) { remove('players', p.id); toast('Jugador eliminado'); }
  return ok;
}

// ---------- evaluación con rúbrica ----------
export function evaluateSheet(p) {
  const cur = currentRatings(p.id, state.data.ratings);
  const sel = { ...cur };
  const target = nextLevelN(p);
  const rows = SKILLS.map((s) => {
    const need = required(p.position, s.id, target);
    const desc = h('p', { class: 'row-sub', 'aria-live': 'polite' });
    const btns = [1, 2, 3, 4].map((n) => h('button', { type: 'button', 'aria-pressed': 'false', 'aria-label': `Fase ${n}, ${PHASES[n - 1].name}`, onclick: () => pick(n) }, String(n)));
    const paint = () => {
      btns.forEach((b, i) => b.setAttribute('aria-pressed', String(sel[s.id] === i + 1)));
      desc.textContent = sel[s.id] ? `Fase ${sel[s.id]}, ${PHASES[sel[s.id] - 1].name}: ${s.phases[sel[s.id] - 1]}` : 'Toca una fase para evaluar.';
    };
    const pick = (n) => { sel[s.id] = n; paint(); };
    paint();
    return h('div', { class: 'stack', style: { gap: '6px' } },
      h('div', { class: 'split' }, h('strong', {}, s.name),
        h('span', { class: `chip ${need === null ? '' : 'info'}` }, need === null ? 'No se exige a su posición' : `Siguiente nivel pide fase ${need || 1}`)),
      h('div', { class: 'seg', role: 'group', 'aria-label': `Fase de ${s.name}` }, btns), desc);
  });
  const comment = h('textarea', { placeholder: 'Opcional: qué viste y qué sigue', maxlength: 400 });
  return openSheet({
    title: `Evaluar a ${p.name}`,
    body: h('div', { class: 'stack' }, note('Evalúa la fase que ves en juego, no la mejor repetición. Solo se guardan las habilidades que cambies.'), ...rows,
      field('Comentario', comment)),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar evaluación', kind: 'primary', onClick: () => {
      let n = 0;
      for (const s of SKILLS) if (sel[s.id] && sel[s.id] !== cur[s.id]) { rate(p.id, s.id, sel[s.id]); n++; }
      const c = comment.value.trim();
      if (c) add('notes', { player_id: p.id, body: `Evaluación del ${fmtDate(todayStr(), { day: 'numeric', month: 'short' })}: ${c}` });
      toast(n ? `Evaluación guardada (${n} ${n === 1 ? 'habilidad' : 'habilidades'})` : 'Sin cambios');
    } }],
  });
}

// ---------- examen de nivel ----------
export function examSheet(p) {
  if (p.level >= 6) { toast(`${p.name} ya está en el nivel máximo`); return null; }
  const gap = levelGap(p, state.data.ratings);
  const lv = LEVELS[gap.target - 1];
  const vals = {};
  const status = h('div', { class: 'note' });
  const verdict = { passed: null };
  const crit = lv.exam.map((c) => {
    const chip = h('span', { class: 'chip' }, '');
    let ctl;
    if (c.kind === 'ratio') {
      ctl = h('input', { type: 'number', min: 0, max: c.total, inputmode: 'numeric', 'aria-label': `Aciertos de ${c.total}`, style: { width: '84px' } });
      ctl.addEventListener('input', () => { vals[c.id] = ctl.value === '' ? null : Number(ctl.value); refresh(); });
    } else {
      ctl = h('input', { type: 'checkbox', 'aria-label': 'Cumple' });
      ctl.addEventListener('change', () => { vals[c.id] = ctl.checked; refresh(); });
    }
    const ok = () => (c.kind === 'ratio' ? vals[c.id] != null && vals[c.id] >= c.min : vals[c.id] === true);
    return { c, chip, ctl, ok, row: h('div', { class: 'row', style: { alignItems: 'flex-start', paddingInline: 0 } },
      h('span', { class: 'row-main' }, h('span', {}, c.text), h('span', { class: 'row-sub' }, c.kind === 'ratio' ? `Mínimo ${c.min} de ${c.total}` : 'Sí o no')),
      h('span', { class: 'row-end' }, ctl, chip)) };
  });
  const pass = h('input', { type: 'radio', name: 'res', id: 'r1' });
  const fail = h('input', { type: 'radio', name: 'res', id: 'r2', checked: true });
  const comment = h('textarea', { maxlength: 400, placeholder: 'Opcional: qué faltó o qué trabajar' });
  function refresh() {
    let all = true;
    for (const x of crit) { const o = x.ok(); if (!o) all = false; x.chip.className = `chip ${vals[x.c.id] == null ? '' : o ? 'ok' : 'bad'}`; x.chip.textContent = vals[x.c.id] == null ? 'Sin dato' : o ? 'Cumple' : 'Aún no'; }
    status.textContent = all ? 'Cumple todos los criterios del examen.' : 'Todavía no cumple todos los criterios.';
    if (verdict.passed === null) { pass.checked = all; fail.checked = !all; }
  }
  refresh();
  pass.addEventListener('change', () => { verdict.passed = true; }); fail.addEventListener('change', () => { verdict.passed = false; });
  return openSheet({
    title: `Examen al nivel ${gap.target}: ${lv.name}`,
    body: h('div', { class: 'stack' },
      gap.ready ? note(`${p.name} ya cumple las ${gap.total} fases que pide este nivel.`) :
        note(`Faltan fases por alcanzar: cumple ${gap.met} de ${gap.total}. Puedes hacer el examen igual si lo ves listo.`, 'warn'),
      ...crit.map((x) => x.row), status,
      h('div', { class: 'cluster' }, h('label', { class: 'check' }, pass, 'Aprobado'), h('label', { class: 'check' }, fail, 'Aún no')),
      field('Comentario', comment)),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar resultado', kind: 'primary', onClick: () => {
      const passed = pass.checked;
      const results = {}; for (const x of crit) results[x.c.id] = { v: vals[x.c.id] ?? null, ok: x.ok() };
      recordExam(p.id, gap.target, passed, results, comment.value.trim());
      toast(passed ? `${p.name} sube al nivel ${gap.target}` : 'Examen guardado: aún no');
    } }],
  });
}

// ---------- código para entrar ----------
export function codeSheet(p) {
  const url = `${location.origin}${location.pathname}`;
  const code = h('div', { class: 'code', 'aria-label': `Código ${p.join_code.split('').join(' ')}` }, p.join_code);
  const msg = () => `Hola ${p.name}, entra a Remate: ${url}\nElige "Soy jugador" y escribe tu código: ${p.join_code}`;
  return openSheet({
    title: `Código de ${p.name}`,
    body: h('div', { class: 'stack' }, code,
      h('p', {}, 'El jugador abre Remate, elige “Soy jugador” y escribe este código. Funciona en un celular a la vez.'),
      state.mode === 'demo' ? note('Estás en modo demo: el código sirve para ver cómo se comparte, pero no abre cuentas reales.') : null,
      h('div', { class: 'cluster' },
        h('button', { class: 'btn', type: 'button', onclick: () => copyText(p.join_code) }, ic('copy', 18), 'Copiar código'),
        h('button', { class: 'btn', type: 'button', onclick: () => shareText(msg()) }, ic('share-2', 18), 'Compartir mensaje'))),
    actions: [{ label: 'Código nuevo', kind: 'danger', onClick: async (close) => {
      const ok = await confirmSheet({ title: '¿Generar un código nuevo?', text: 'El celular que usa el código actual pierde el acceso. Úsalo si cambió de teléfono o si el código se compartió.', ok: 'Generar', danger: true });
      if (!ok) return false;
      const np = patch('players', p.id, { join_code: newJoinCode(), user_id: null, joined_at: null });
      close(); toast('Código nuevo creado'); setTimeout(() => codeSheet(np), 150); return false;
    } }, { label: 'Listo', kind: 'primary' }],
  });
}

// ---------- notas privadas ----------
export function noteSheet(p) {
  const body = h('textarea', { maxlength: 1000, placeholder: 'Solo tú ves esta nota' });
  return openSheet({
    title: `Nota sobre ${p.name}`, body: field('Nota', body),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar nota', kind: 'primary', onClick: () => {
      const t = body.value.trim(); if (!t) { toast('Escribe algo'); return false; }
      add('notes', { player_id: p.id, body: t }); toast('Nota guardada');
    } }],
  });
}
