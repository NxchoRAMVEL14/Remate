// Ajustes: equipo, días de entrenamiento, apariencia, respaldo, privacidad y cuenta.
import { h, ic, toast, confirmSheet, download, DAYS, DAYS_LONG, plural } from '../util.js';
import { state, group, settings, saveSettings, patch, players, sessions, exportBackup, importBackup, refresh, pendingCount } from '../store.js';
import { attendanceFor, doneSessions } from '../calc.js';
import { leave, restartDemo } from '../auth.js';
import { THEMES, getTheme, setTheme } from '../theme.js';
import { sectionTitle, note, field, options } from './ui.js';

function attendanceCsv() {
  const done = doneSessions(sessions()), list = players(), st = settings();
  const code = { presente: 'P', retardo: 'R', falta: 'F', justificada: 'J' };
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Jugador', ...done.map((s) => s.session_date), 'Presentes', 'Retardos', 'Faltas', 'Justificadas', 'Asistencia %'];
  const rows = list.map((p) => { const a = attendanceFor(p.id, state.data.sessions, state.data.attendance, st);
    return [p.name, ...a.line.map((l) => (l.status ? code[l.status] : '')), a.presente, a.retardo, a.falta, a.justificada, a.pct ?? '']; });
  return `﻿${[head, ...rows].map((r) => r.map(q).join(',')).join('\r\n')}`;
}

async function signOut(label) {
  let r = await leave();
  if (r.blocked) {
    if (!(await confirmSheet({ title: 'Hay cambios sin enviar', text: `${plural(r.pending, 'cambio no se ha enviado', 'cambios no se han enviado')} a la nube porque no hay internet. Si sales ahora se pierden. ¿Salir de todos modos?`, ok: 'Salir y perderlos', danger: true }))) return;
    r = await leave({ force: true });
  }
  location.hash = ''; location.reload();
}

const themeField = () => {
  const sel = h('select', { 'aria-label': 'Tema' }, options(Object.entries(THEMES), getTheme()));
  sel.addEventListener('change', () => setTheme(sel.value));
  return field('Apariencia', sel, 'Útil para entrenar de noche o en gimnasios oscuros.');
};

export default function ajustes(ctx) {
  return ctx.role === 'coach' ? coach(ctx) : jugador(ctx);
}

function coach() {
  const g = group(), st = settings();
  const name = h('input', { type: 'text', maxlength: 60, value: g?.name || '', onchange: (e) => { if (g && e.target.value.trim()) { patch('groups', g.id, { name: e.target.value.trim() }); toast('Guardado'); } } });
  const days = h('div', { class: 'daypick', role: 'group', 'aria-label': 'Días de entrenamiento' }, [1, 2, 3, 4, 5, 6, 0].map((d) =>
    h('label', {}, h('input', { type: 'checkbox', checked: (st.days || []).includes(d) ? true : null, 'aria-label': DAYS_LONG[d],
      onchange: () => { saveSettings({ days: [...days.querySelectorAll('input')].map((i, k) => (i.checked ? [1, 2, 3, 4, 5, 6, 0][k] : null)).filter((x) => x !== null) }); toast('Días guardados'); } }), h('span', {}, DAYS[d]))));
  const start = h('input', { type: 'time', value: st.start, onchange: (e) => { if (e.target.value) { saveSettings({ start: e.target.value }); toast('Guardado'); } } });
  const mins = h('input', { type: 'number', min: 20, max: 240, step: 5, inputmode: 'numeric', value: st.minutes, onchange: (e) => { saveSettings({ minutes: Math.min(240, Math.max(20, Number(e.target.value) || 90)) }); toast('Guardado'); } });
  const late = h('input', { type: 'number', min: 0, max: 10, inputmode: 'numeric', value: st.late_per_absence, onchange: (e) => { saveSettings({ late_per_absence: Math.min(10, Math.max(0, Number(e.target.value) || 0)) }); toast('Guardado'); } });
  const season = h('input', { type: 'text', maxlength: 40, value: st.season || '', placeholder: 'Por ejemplo: Ago 2026 a Ene 2027', onchange: (e) => { saveSettings({ season: e.target.value.trim() }); toast('Guardado'); } });
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { importBackup(await f.text()); toast('Respaldo restaurado'); } catch (err) { toast(err.message || 'No se pudo restaurar'); }
    e.target.value = ''; } });

  const el = h('div', { class: 'page' },
    h('section', { class: 'stack' }, sectionTitle('Tu equipo'),
      field('Nombre del equipo', name), field('Temporada', season, 'Aparece en reportes y en tu ayuda memoria. Es opcional.')),
    h('section', { class: 'stack' }, sectionTitle('Entrenamientos'),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Días de entrenamiento'), days),
      h('div', { class: 'grid' }, field('Hora de inicio', start), field('Duración (min)', mins)),
      field('Retardos que cuentan como 1 falta', late, 'Pon 0 para que los retardos nunca se conviertan en faltas. Las faltas justificadas no restan.')),
    h('section', { class: 'stack' }, sectionTitle('Pantalla'), themeField()),
    h('section', { class: 'stack' }, sectionTitle('Tus datos'),
      state.mode === 'cloud' ? h('p', { style: { margin: 0 } }, pendingCount() ? `${plural(pendingCount(), 'cambio espera', 'cambios esperan')} conexión para enviarse.` : state.online ? 'Todo está guardado en la nube.' : 'Sin internet: los cambios se guardan en este celular y se envían al volver la conexión.') : note('Modo demo: los datos son de ejemplo y viven solo en este navegador. Para usar Remate con tus jugadores, conéctalo a Supabase (el LEEME explica cómo).', 'warn'),
      h('div', { class: 'cluster' },
        h('button', { class: 'btn', type: 'button', onclick: () => { download(`remate-asistencia-${new Date().toISOString().slice(0, 10)}.csv`, attendanceCsv(), 'text/csv;charset=utf-8'); toast('Asistencia descargada'); } }, ic('download', 18), 'Descargar asistencia (Excel)'),
        h('button', { class: 'btn', type: 'button', onclick: () => { download(`remate-respaldo-${new Date().toISOString().slice(0, 10)}.json`, exportBackup()); toast('Respaldo descargado'); } }, ic('download', 18), 'Descargar respaldo'),
        state.mode === 'cloud' ? h('button', { class: 'btn', type: 'button', onclick: async () => { toast((await refresh()) ? 'Datos actualizados' : 'No se pudo actualizar'); } }, ic('refresh-cw', 18), 'Actualizar ahora') : null,
        state.mode === 'demo' ? [h('button', { class: 'btn', type: 'button', onclick: () => file.click() }, ic('upload', 18), 'Restaurar respaldo'), file,
          h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (await confirmSheet({ title: '¿Reiniciar el demo?', text: 'Vuelven los datos de ejemplo y se pierde lo que hayas cambiado.', ok: 'Reiniciar', danger: true })) { restartDemo(); toast('Demo reiniciado'); } } }, ic('refresh-cw', 18), 'Reiniciar demo')] : null)),
    h('section', { class: 'stack' }, sectionTitle('Privacidad con menores de edad'),
      h('p', { style: { margin: 0 } }, 'Remate guarda solo lo necesario: nombre o apodo, rama, posición, mano de ataque, estatura, número de playera, evaluaciones, asistencia y tus notas. No pide teléfono, domicilio, fotos ni apellidos completos.'),
      h('ul', { class: 'plain' },
        h('li', {}, 'Antes de dar de alta a un menor de edad, pide autorización por escrito a su madre, padre o tutor y marca la casilla en su ficha.'),
        h('li', {}, 'Cada jugador solo ve lo suyo: su tarjeta, su asistencia y los entrenamientos que publiques. Tus notas privadas nunca se muestran.'),
        h('li', {}, 'Si cambia de celular o se comparte su código, genera uno nuevo en su ficha: el celular anterior pierde el acceso.'),
        h('li', {}, 'Puedes eliminar a un jugador en cualquier momento; se borra todo su historial.'))),
    h('section', { class: 'stack' }, sectionTitle('Cuenta'),
      state.mode === 'demo' ? h('p', { style: { margin: 0 } }, 'Estás en modo demo, sin cuenta.') : h('p', { style: { margin: 0 } }, `Entraste como ${state.email || 'entrenador'}.`),
      h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', onclick: () => signOut() }, ic('log-out', 18), state.mode === 'demo' ? 'Salir del demo' : 'Cerrar sesión'),
        h('a', { class: 'btn ghost', href: '#/ayuda' }, ic('circle-help', 18), 'Ayuda y fuentes'))));
  return { title: 'Ajustes', back: null, el };
}

function jugador(ctx) {
  const me = ctx.me;
  return { title: 'Ajustes', el: h('div', { class: 'page' },
    h('section', { class: 'stack' }, sectionTitle('Pantalla'), themeField()),
    h('section', { class: 'stack' }, sectionTitle('Tu información'),
      h('p', { style: { margin: 0 } }, `Tu entrenador guarda tu nombre o apodo${me ? ` (${me.name})` : ''}, tu posición, tus evaluaciones y tu asistencia. No guarda teléfono, domicilio ni fotos. Solo tú y tu entrenador ven tu avance. Si quieres que se corrija o se borre algo, pídeselo a tu entrenador.`)),
    ctx.readonly ? note('Vista previa: aquí no se cierra la sesión del jugador.', 'warn') : h('section', { class: 'stack' }, sectionTitle('Este celular'),
      h('p', { style: { margin: 0 } }, 'Si sales, vas a necesitar tu código otra vez para volver a entrar.'),
      h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', onclick: async () => { if (await confirmSheet({ title: '¿Salir de Remate en este celular?', text: 'Para volver a entrar necesitarás tu código.', ok: 'Salir', danger: true })) signOut(); } }, ic('log-out', 18), 'Salir'),
        h('a', { class: 'btn ghost', href: '#/ayuda' }, ic('circle-help', 18), 'Ayuda')))) };
}
