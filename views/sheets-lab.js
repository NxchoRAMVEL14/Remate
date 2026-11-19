// Hojas del laboratorio de salto: registrar una prueba, registrar una sesión y "Mis datos".
import { h, toast, openSheet, confirmSheet, todayStr } from '../util.js';
import { add, patch, remove, profile, saveProfile, sql37Ready } from '../store.js';
import { TEST_KINDS, METHODS, isTouch, num, best, round1, rsi } from '../lab-calc.js';
import { PROTOCOLS, LAB_BY_ID, itemContacts, repsText } from '../content/lab-salto.js';
import { field, options, note } from './ui.js';

export const FOCUS = { fuerza: 'Fuerza', pliometria: 'Pliometría', aterrizaje: 'Aterrizaje', potencia: 'Potencia', movilidad: 'Movilidad', mixto: 'Mixto' };
export const PAIN_ZONES = { rodilla: 'Rodilla', tobillo: 'Tobillo', espalda: 'Espalda', hombro: 'Hombro', cadera: 'Cadera', otra: 'Otra' };
// Escala de esfuerzo percibido de 1 a 10 (cómo se sintió la sesión completa).
export const RPE = { 1: 'Muy, muy fácil', 2: 'Fácil', 3: 'Moderado', 4: 'Algo difícil', 5: 'Difícil', 6: 'Difícil, sostenido', 7: 'Muy difícil', 8: 'Muy difícil, casi al límite', 9: 'Casi máximo', 10: 'Máximo' };

const numInput = (value, attrs = {}) => h('input', { type: 'number', inputmode: 'decimal', step: '0.1', value: value ?? '', ...attrs });
const errBox = () => h('div', { class: 'note bad', role: 'alert', hidden: true });
const fail = (box, msg) => { box.textContent = msg; box.hidden = false; return false; };
const inRange = (v, a, b) => v == null || (v >= a && v <= b);
// «Video en Remate» necesita el SQL de la v3.7 (la base de datos solo acepta los métodos que conoce).
const methodOpts = (cur) => Object.entries(METHODS).filter(([k]) => k !== 'remate' || sql37Ready() || cur === 'remate');
const REMATE_HOW = ['Abre «Medir con video» (Laboratorio o Pruebas físicas) y elige la prueba.', 'Graba en cámara lenta, de lado y con los pies a la vista; marca el despegue y el aterrizaje cuadro por cuadro.', 'Guarda los 3 intentos desde ahí: se registran aquí solos. Si lo mediste antes, anota aquí las alturas que te dio.'];

// ---------- prueba de salto ----------
export function testSheet(t = null) {
  const pr = profile();
  const date = h('input', { type: 'date', max: todayStr(), value: t?.test_date || todayStr() });
  const kind = h('select', {}, options(Object.entries(TEST_KINDS), t?.kind || 'cmj'));
  const method = h('select', {}, options(methodOpts(t?.method), t?.method || (pr.method === 'remate' && !sql37Ready() ? 'myjump' : pr.method) || 'myjump'));
  const tries = [0, 1, 2].map((i) => numInput(t?.attempts?.[i], { 'aria-label': `Intento ${i + 1}`, placeholder: `Intento ${i + 1}` }));
  const reach = numInput(pr.reach_cm, { min: 150, max: 300, placeholder: 'Por ejemplo 232' });
  const dropCm = numInput(t?.drop_cm, { min: 10, max: 80, step: '1', placeholder: '30' });
  const contact = numInput(t?.contact_ms, { min: 50, max: 1500, step: '1', placeholder: '220' });
  const body = numInput(t?.body_kg, { min: 25, max: 200, placeholder: 'Opcional' });
  const text = h('textarea', { rows: 2, maxlength: 500, placeholder: 'Cansado, otra cancha, otros tenis...' }, t?.note || '');
  const live = h('p', { class: 'live', 'aria-live': 'polite', style: { margin: 0, fontWeight: 700 } });
  const err = errBox();
  const triesLabel = h('span', { class: 'label' });
  const reachRow = field('Tu alcance de pie (cm)', reach, 'Brazo estirado hacia arriba, de pie, con los talones en el piso. Se guarda en Mis datos.');
  const dropRow = h('div', { class: 'grid' }, field('Altura del escalón (cm)', dropCm), field('Tiempo de contacto (ms)', contact, 'Lo da My Jump. Sirve para el índice de fuerza reactiva.'));
  const how = h('ol', { class: 'plain' });

  const compute = () => {
    const vals = tries.map((x) => num(x.value)).filter((v) => v != null);
    const touch = isTouch(method.value), r = num(reach.value);
    const top = best(vals);
    const height = top == null ? null : touch ? (r ? round1(top - r) : null) : round1(top);
    return { vals, touch, r, top, height };
  };
  const sync = () => {
    const touch = isTouch(method.value);
    triesLabel.textContent = touch ? 'Marca más alta en cada intento (cm)' : 'Altura de cada intento (cm)';
    reachRow.hidden = !touch; dropRow.hidden = kind.value !== 'drop';
    how.replaceChildren(...(method.value === 'remate' ? REMATE_HOW : PROTOCOLS[method.value] || []).map((x) => h('li', {}, x)));
    const c = compute();
    if (c.height == null) live.textContent = c.touch && c.top != null && !c.r ? 'Anota tu alcance de pie para calcular el salto.' : '';
    else {
      const ri = kind.value === 'drop' ? rsi(c.height, num(contact.value)) : null;
      live.textContent = `Tu mejor salto: ${c.height} cm${c.touch ? ` (marca ${c.top} cm menos alcance ${c.r} cm)` : ''}${ri ? `. Índice de fuerza reactiva: ${ri}` : ''}`;
    }
  };
  [kind, method, reach, contact, ...tries].forEach((x) => x.addEventListener('input', sync));
  sync();

  const save = () => {
    err.hidden = true;
    const c = compute();
    if (!c.vals.length) return fail(err, 'Anota al menos un intento.');
    if (c.touch && !c.r) return fail(err, 'Con la marca en la pared necesito tu alcance de pie para calcular el salto.');
    if (c.touch && !inRange(c.r, 150, 300)) return fail(err, 'El alcance de pie debe estar entre 150 y 300 cm.');
    if (c.height == null || c.height < 5 || c.height > 150) return fail(err, c.touch ? 'La marca menos tu alcance da un salto fuera de 5 a 150 cm. Revisa los números.' : 'La altura debe estar entre 5 y 150 cm.');
    const d = kind.value === 'drop' ? num(dropCm.value) : null, ct = kind.value === 'drop' ? num(contact.value) : null, kg = num(body.value);
    if (!inRange(d, 10, 80)) return fail(err, 'La altura del escalón debe estar entre 10 y 80 cm.');
    if (!inRange(ct, 50, 1500)) return fail(err, 'El tiempo de contacto debe estar entre 50 y 1500 ms.');
    if (!inRange(kg, 25, 200)) return fail(err, 'El peso debe estar entre 25 y 200 kg.');
    if (c.touch && !inRange(c.top, 100, 450)) return fail(err, 'La marca en la pared debe estar entre 100 y 450 cm.');
    const row = { test_date: date.value || todayStr(), kind: kind.value, method: method.value, height_cm: c.height, attempts: c.vals,
      touch_cm: c.touch ? c.top : null, contact_ms: ct != null ? Math.round(ct) : null, drop_cm: d != null ? Math.round(d) : null, body_kg: kg, note: text.value.trim() };
    if (t) patch('jumpTests', t.id, row); else add('jumpTests', row);
    const pc = {};
    if (method.value !== pr.method) pc.method = method.value;
    if (c.touch && c.r !== num(pr.reach_cm)) pc.reach_cm = c.r;
    if (Object.keys(pc).length) saveProfile(pc);
    toast(t ? 'Prueba actualizada' : `Prueba guardada: ${c.height} cm`);
    return true;
  };

  openSheet({
    title: t ? 'Editar prueba' : 'Registrar prueba de salto',
    body: h('div', { class: 'stack' },
      h('div', { class: 'grid' }, field('Fecha', date), field('Prueba', kind)),
      field('Cómo mediste', method),
      reachRow,
      h('div', { class: 'field' }, triesLabel, h('div', { class: 'tries' }, tries)),
      dropRow,
      live,
      field('Peso corporal (kg)', body, 'Opcional. Ayuda a interpretar cambios.'),
      field('Nota', text),
      h('details', {}, h('summary', {}, 'Cómo medir con este método'), how,
        h('a', { class: 'btn sm', href: '#/medir/cmj/lab', onclick: (e) => { e.currentTarget.closest('dialog')?.close(); e.currentTarget.closest('dialog')?.remove(); } }, 'Medir con video en Remate')),
      err),
    actions: [
      { label: 'Cancelar' },
      t ? { label: 'Borrar', kind: 'danger', onClick: async () => {
        if (!(await confirmSheet({ title: '¿Borrar esta prueba?', text: 'No se puede deshacer.', ok: 'Borrar', danger: true }))) return false;
        remove('jumpTests', t.id); toast('Prueba borrada'); return true; } } : null,
      { label: 'Guardar', kind: 'primary', onClick: () => save() },
    ].filter(Boolean),
  });
}

// ---------- sesión de entrenamiento de salto ----------
// prefill: { focus, contacts, minutes, items: [{ex, sets, reps, unit, sides}], weekInBlock, note }
export function jumpLogSheet(s = null, prefill = {}) {
  const items = (s?.blocks?.length ? s.blocks : prefill.items || []).map((b) => ({ ...b }));
  const date = h('input', { type: 'date', max: todayStr(), value: s?.session_date || todayStr() });
  const focus = h('select', {}, options(Object.entries(FOCUS), s?.focus || prefill.focus || 'mixto'));
  const contacts = h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 1000, step: 1, value: s?.contacts ?? prefill.contacts ?? 0 });
  const minutes = h('input', { type: 'number', inputmode: 'numeric', min: 5, max: 240, step: 5, value: s?.minutes ?? prefill.minutes ?? '' , placeholder: '40' });
  const rpe = h('select', {}, options([['', 'Sin anotar'], ...Object.entries(RPE).map(([k, v]) => [k, `${k}: ${v}`])], s?.rpe ?? ''));
  const zone = h('select', {}, options([['', 'Ninguna'], ...Object.entries(PAIN_ZONES)], s?.pain_zone || ''));
  const level = h('select', {}, options([...Array(11).keys()].map((k) => [k, k === 0 ? '0: nada' : k >= 7 ? `${k}: fuerte` : k >= 4 ? `${k}: moderada` : `${k}: leve`]), s?.pain_level ?? 3));
  const levelRow = field('Qué tanto (0 a 10)', level);
  const text = h('textarea', { rows: 2, maxlength: 500, placeholder: 'Cómo te sentiste, qué cambiaste...' }, s?.note ?? prefill.note ?? '');
  const err = errBox();
  const syncPain = () => { levelRow.hidden = !zone.value; };
  zone.addEventListener('change', syncPain); syncPain();

  const checks = items.map((b) => {
    const ex = LAB_BY_ID[b.ex];
    const cb = h('input', { type: 'checkbox', checked: b.done === false ? null : true });
    cb.addEventListener('change', () => {
      b.done = cb.checked;
      if (prefill.weekInBlock) contacts.value = items.filter((x) => x.done !== false).reduce((a, x) => a + itemContacts(x, prefill.weekInBlock), 0);
    });
    return h('label', { class: 'check' }, cb, h('span', {}, `${ex?.name || b.ex} (${b.setsDone ?? b.sets?.[prefill.weekInBlock - 1] ?? b.sets} × ${repsText(b)})`));
  });

  const save = () => {
    err.hidden = true;
    const c = Number(contacts.value) || 0, m = minutes.value === '' ? null : Number(minutes.value);
    if (c < 0 || c > 1000) return fail(err, 'Los saltos deben estar entre 0 y 1000.');
    if (m != null && (m < 5 || m > 240)) return fail(err, 'Los minutos deben estar entre 5 y 240.');
    const row = { session_date: date.value || todayStr(), focus: focus.value, contacts: Math.round(c), minutes: m != null ? Math.round(m) : null,
      rpe: rpe.value ? Number(rpe.value) : null, pain_zone: zone.value || null, pain_level: zone.value ? Number(level.value) : null, note: text.value.trim(),
      blocks: items.filter((b) => b.done !== false).map((b) => ({ ex: b.ex, sets: Array.isArray(b.sets) ? b.sets[(prefill.weekInBlock || 1) - 1] : b.sets, reps: b.reps, unit: b.unit || null, sides: b.sides || null })) };
    if (s) patch('jumpSessions', s.id, row); else add('jumpSessions', row);
    toast(s ? 'Sesión actualizada' : 'Sesión registrada');
    return true;
  };

  openSheet({
    title: s ? 'Editar sesión' : 'Registrar sesión de salto',
    body: h('div', { class: 'stack' },
      h('div', { class: 'grid' }, field('Fecha', date), field('Enfoque', focus)),
      checks.length ? h('div', { class: 'field' }, h('span', { class: 'label' }, 'Marca lo que sí hiciste'), h('div', { class: 'checks' }, checks)) : null,
      h('div', { class: 'grid' }, field('Saltos (contactos con el piso)', contacts, 'Cada aterrizaje cuenta como uno.'), field('Minutos', minutes)),
      field('Esfuerzo de la sesión', rpe, 'Qué tan dura se sintió en total, de 1 a 10.'),
      h('div', { class: 'grid' }, field('Molestia', zone), levelRow),
      field('Nota', text),
      err),
    actions: [
      { label: 'Cancelar' },
      s ? { label: 'Borrar', kind: 'danger', onClick: async () => {
        if (!(await confirmSheet({ title: '¿Borrar esta sesión?', text: 'No se puede deshacer.', ok: 'Borrar', danger: true }))) return false;
        remove('jumpSessions', s.id); toast('Sesión borrada'); return true; } } : null,
      { label: 'Guardar', kind: 'primary', onClick: () => save() },
    ].filter(Boolean),
  });
}

// ---------- Mis datos ----------
export function profileSheet() {
  const pr = profile();
  const reach = numInput(pr.reach_cm, { min: 150, max: 300, placeholder: 'Por ejemplo 232' });
  const net = h('select', {}, options([['M', 'Varonil, 2.43 m'], ['F', 'Femenil, 2.24 m']], pr.net || 'M'));
  const method = h('select', {}, options(methodOpts(pr.method), pr.method || 'myjump'));
  const start = h('input', { type: 'date', value: pr.program_start || '' });
  const err = errBox();
  openSheet({
    title: 'Mis datos',
    body: h('div', { class: 'stack' },
      note('Solo tú ves esta información.'),
      field('Alcance de pie (cm)', reach, 'De pie junto a la pared, brazo estirado hacia arriba y talones en el piso. Con esto se calcula tu alcance de remate.'),
      field('Altura de red para comparar', net),
      field('Método habitual para medir', method),
      field('Inicio del programa de 12 semanas', start, 'Déjalo vacío si todavía no empiezas.'),
      err),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      const r = num(reach.value);
      if (r != null && (r < 150 || r > 300)) return fail(err, 'El alcance de pie debe estar entre 150 y 300 cm.');
      saveProfile({ reach_cm: r, net: net.value, method: method.value, program_start: start.value || null });
      toast('Datos guardados'); return true;
    } }],
  });
}
