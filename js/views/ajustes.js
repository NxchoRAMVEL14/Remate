// Ajustes: equipo, días de entrenamiento, apariencia, respaldo, privacidad y cuenta.
import { h, ic, toast, confirmSheet, openSheet, download, copyText, shareText, fmtDate, newJoinCode, DAYS, DAYS_LONG, plural, THEMES, getTheme, setTheme } from '../util.js';
import { state, group, settings, saveSettings, add, patch, remove, players, sessions, exportBackup, importBackup, refresh, pendingCount, teamReady, equiposReady, teams } from '../store.js';
import { pushSettings } from './avisos.js';
import { disablePush } from '../push.js';
import { attendanceFor, doneSessions } from '../calc.js';
import { leave, restartDemo } from '../auth.js';
import { sectionTitle, note, field, options } from './ui.js';
import { aboutSection } from './ayuda.js';

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
  try { await disablePush(); } catch { /* sin notificaciones */ }
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
  return ctx.role === 'coach' ? coach(ctx) : ctx.role === 'assistant' ? asistente() : jugador(ctx);
}

// ---------- Equipo de apoyo: asistentes adultos y capitanes ----------
const inviteText = (st) => `Te invito como asistente de ${group()?.name || 'mi equipo'} en Remate (para pasar lista y capturar partidos). Abre ${location.origin}${location.pathname}, elige "Soy asistente", entra o crea tu cuenta con tu correo y escribe el código ${st.invite_code}.`;
function inviteSheet(st) {
  openSheet({ title: `Invitación de ${st.name}`, body: h('div', { class: 'stack' },
    h('div', { class: 'code' }, st.invite_code),
    h('p', { style: { margin: 0 } }, 'Dale este código a tu asistente. Lo usa una sola vez: elige "Soy asistente", entra con su correo y escribe el código.'),
    h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', onclick: () => copyText(st.invite_code) }, ic('copy', 18), 'Copiar código'),
      h('button', { class: 'btn', type: 'button', onclick: () => shareText(inviteText(st)) }, ic('share-2', 18), 'Compartir invitación'))),
    actions: [{ label: 'Listo', kind: 'primary' }] });
}
function newStaffSheet() {
  const name = h('input', { type: 'text', maxlength: 60, placeholder: 'Por ejemplo: Profe Luis' });
  openSheet({ title: 'Invitar asistente', body: h('div', { class: 'stack' }, field('Nombre del asistente', name),
    note('Podrá pasar lista y capturar partidos. No verá notas privadas, evaluaciones, reportes ni tu laboratorio. Puedes quitarle el acceso cuando quieras.')),
    actions: [{ label: 'Cancelar' }, { label: 'Crear invitación', kind: 'primary', onClick: () => {
      if (!name.value.trim()) { toast('Escribe su nombre'); return false; }
      const st = add('staff', { group_id: group()?.id, name: name.value.trim() });
      setTimeout(() => inviteSheet(st), 50); return true;
    } }] });
}
// Elegir capitanes desde aquí (también se puede en la ficha de cada jugador).
function captainsSheet() {
  const sel = new Set(players().filter((p) => p.captain).map((p) => p.id));
  const count = h('span', { class: 'chip ball' }, `${sel.size} capitanes`);
  const list = h('div', { class: 'rows roster-pick' }, players().map((p) => h('label', { class: 'row check-row' },
    h('span', { class: 'row-main' }, h('strong', {}, p.name), h('span', { class: 'row-sub' }, p.user_id ? 'Ya entra a Remate con su código' : 'Todavía no usa su código')),
    h('input', { type: 'checkbox', checked: sel.has(p.id) ? true : null, 'aria-label': `Capitán: ${p.name}`, onchange: (e) => { if (e.target.checked) sel.add(p.id); else sel.delete(p.id); count.textContent = `${sel.size} capitanes`; } }))));
  openSheet({ title: 'Capitanes', body: h('div', { class: 'stack' }, count, list,
    note('El capitán entra con su mismo código y además puede pasar lista y capturar partidos. No ve notas, evaluaciones de otros, reportes ni tu laboratorio.')),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      let n = 0;
      for (const p of players()) { const want = sel.has(p.id); if (!!p.captain !== want) { patch('players', p.id, { captain: want }); n++; } }
      toast(n ? 'Capitanes guardados' : 'Sin cambios'); return true; } }] });
}
// ---------- Equipos del grupo (v3.5): por ejemplo «CETAC A» y «CETAC B» ----------
const newTeamId = () => `t${Math.random().toString(36).slice(2, 7)}`;
function teamsSection() {
  const list = teams(), g = group();
  const save = (next) => { saveSettings({ teams: next }); toast('Equipos guardados'); };
  const ro = !equiposReady();
  return h('section', { class: 'stack' }, sectionTitle('Equipos'),
    ro ? note('Para separar en equipos, corre en Supabase el sql/instalar.sql de la versión 3.5 (SQL Editor → pega todo → Run). No borra nada.', 'bad') : null,
    h('p', { style: { margin: 0 } }, list.length > 1
      ? 'Cada jugador y cada partido pertenecen a uno de tus equipos. Lo eliges en la ficha del jugador y al crear el partido. Los que no tienen equipo quedan en el primero de la lista.'
      : 'Si tu escuela juega con más de un equipo (por ejemplo A y B), sepáralos aquí. Mientras tengas uno solo, todo funciona igual que antes.'),
    list.length ? h('div', { class: 'rows' }, list.map((t, i) => h('div', { class: 'row team-row' },
      h('input', { type: 'text', maxlength: 40, value: t.name, 'aria-label': `Nombre del equipo ${i + 1}`, disabled: ro ? true : null,
        onchange: (e) => { const v = e.target.value.trim(); if (v) save(list.map((x) => (x.id === t.id ? { ...x, name: v } : x))); } }),
      h('select', { 'aria-label': 'Rama', disabled: ro ? true : null, onchange: (e) => save(list.map((x) => (x.id === t.id ? { ...x, branch: e.target.value } : x))) },
        options([['X', 'Mixto'], ['F', 'Femenil'], ['M', 'Varonil']], t.branch || 'X')),
      list.length > 1 && !ro ? h('button', { class: 'iconbtn', type: 'button', 'aria-label': `Quitar ${t.name}`, onclick: async () => {
        if (!(await confirmSheet({ title: `¿Quitar ${t.name}?`, text: i === 0 ? 'Sus jugadores y partidos pasarán al siguiente equipo de la lista.' : `Sus jugadores y partidos pasarán a ${list[0].name}.`, ok: 'Quitar', danger: true }))) return;
        save(list.filter((x) => x.id !== t.id)); } }, ic('trash-2', 16)) : null))) : null,
    ro ? null : h('div', { class: 'cluster' },
      list.length ? h('button', { class: 'btn', type: 'button', onclick: () => save([...list, { id: newTeamId(), name: `${g?.name || 'Equipo'} ${String.fromCharCode(65 + list.length)}`, branch: 'X' }]) }, ic('plus', 18), 'Agregar equipo')
        : h('button', { class: 'btn', type: 'button', onclick: () => save([{ id: newTeamId(), name: `${g?.name || 'Equipo'} A`, branch: 'X' }, { id: newTeamId(), name: `${g?.name || 'Equipo'} B`, branch: 'X' }]) }, ic('users', 18), 'Separar en equipos A y B')));
}
function supportSection() {
  const staff = state.data.staff.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const caps = players().filter((p) => p.captain);
  return h('section', { class: 'stack' }, sectionTitle('Equipo de apoyo'),
    !teamReady() ? note('Para tener asistentes y capitanes, corre en Supabase el instalar.sql de esta versión.', 'warn') : null,
    h('p', { style: { margin: 0 } }, 'Ayudantes que pueden pasar lista y capturar partidos. Nunca ven notas privadas, evaluaciones, reportes ni tu laboratorio.'),
    h('h3', {}, 'Capitanes'),
    caps.length ? h('div', { class: 'rows' }, caps.map((p) => h('a', { class: 'row', href: `#/jugador/${p.id}` }, h('span', { class: 'row-main' }, h('strong', {}, p.name), h('span', { class: 'row-sub' }, 'Entra con su mismo código')), ic('chevron-right', 18))))
      : h('p', { class: 'row-sub', style: { margin: 0 } }, 'Ninguno todavía.'),
    h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', disabled: teamReady() ? null : true, onclick: captainsSheet }, ic('shield', 18), 'Elegir capitanes')),
    h('h3', {}, 'Asistentes adultos'),
    staff.length ? h('div', { class: 'rows' }, staff.map((st) => h('div', { class: 'row', style: { flexWrap: 'wrap' } },
      h('span', { class: 'row-main', style: { flex: '1 1 180px' } }, h('strong', {}, st.name),
        h('span', { class: 'row-sub' }, !st.active ? 'Sin acceso' : st.user_id ? `Activo desde el ${fmtDate(String(st.joined_at || st.created_at).slice(0, 10), { day: 'numeric', month: 'short' })}` : `Invitación pendiente: ${st.invite_code}`)),
      h('span', { class: 'row-end', style: { marginLeft: 'auto' } },
        st.active && !st.user_id ? h('button', { class: 'btn sm', type: 'button', onclick: () => inviteSheet(st) }, 'Invitación') : null,
        h('button', { class: 'btn sm', type: 'button', onclick: () => { patch('staff', st.id, { active: !st.active }); toast(st.active ? 'Acceso quitado' : 'Acceso devuelto'); } }, st.active ? 'Quitar acceso' : 'Devolver acceso'),
        h('button', { class: 'btn sm', type: 'button', title: 'Genera un código nuevo; el celular anterior pierde el acceso', onclick: async () => {
          if (!(await confirmSheet({ title: '¿Código nuevo?', text: `${st.name} tendrá que volver a entrar con el código nuevo.`, ok: 'Generar' }))) return;
          patch('staff', st.id, { invite_code: newJoinCode(), user_id: null, joined_at: null, active: true }); setTimeout(() => inviteSheet(state.data.staff.find((x) => x.id === st.id)), 50);
        } }, 'Código nuevo'),
        h('button', { class: 'iconbtn', type: 'button', 'aria-label': `Quitar a ${st.name}`, onclick: async () => { if (await confirmSheet({ title: `¿Quitar a ${st.name}?`, text: 'Pierde el acceso. Lo que capturó se queda.', ok: 'Quitar', danger: true })) remove('staff', st.id); } }, ic('trash-2', 16))))))
      : h('p', { class: 'row-sub', style: { margin: 0 } }, 'Ninguno todavía.'),
    h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', disabled: teamReady() ? null : true, onclick: newStaffSheet }, ic('user-plus', 18), 'Invitar asistente')));
}

function asistente() {
  return { title: 'Ajustes', el: h('div', { class: 'page' },
    h('section', { class: 'stack' }, sectionTitle('Pantalla'), themeField()),
    h('section', { class: 'stack' }, sectionTitle('Notificaciones'), pushSettings()),
    aboutSection(),
    h('section', { class: 'stack' }, sectionTitle('Cuenta'),
      h('p', { style: { margin: 0 } }, `Entraste como asistente${state.email ? ` (${state.email})` : ''} de ${group()?.name || 'tu equipo'}. Ves la lista del equipo, pasas lista y capturas partidos; no ves datos privados de los jugadores.`),
      h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', onclick: () => signOut() }, ic('log-out', 18), 'Cerrar sesión'),
        h('a', { class: 'btn ghost', href: '#/ayuda' }, ic('circle-help', 18), 'Ayuda')))) };
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
      field('Retardos que cuentan como 1 falta', late, 'Pon 0 para que los retardos nunca se conviertan en faltas. Las faltas justificadas no restan.'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.warmup_prev !== false ? true : null, onchange: (e) => { saveSettings({ warmup_prev: e.target.checked }); toast(e.target.checked ? 'Calentamiento preventivo activado' : 'Calentamiento preventivo desactivado'); } }),
        h('span', {}, 'Empezar cada entrenamiento con el calentamiento preventivo (tobillo, rodilla y hombro). Se turnan las versiones A, B y C por semana.')),
      field('Pruebas físicas cada (semanas)', h('input', { type: 'number', min: 4, max: 26, inputmode: 'numeric', value: st.tests_every || 10, onchange: (e) => { saveSettings({ tests_every: Math.min(26, Math.max(4, Number(e.target.value) || 10)) }); toast('Guardado'); } }), 'Cada cuánto te recuerdo en Hoy medir salto, velocidad de 10 m y plancha. 8 a 13 semanas son 2 a 3 meses.')),
    teamsSection(),
    supportSection(),
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
    aboutSection(),
    h('section', { class: 'stack' }, sectionTitle('Cuenta'),
      state.mode === 'demo' ? h('p', { style: { margin: 0 } }, 'Estás en modo demo, sin cuenta.') : h('p', { style: { margin: 0 } }, `Entraste como ${state.email || 'entrenador'}.`),
      h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', onclick: () => signOut() }, ic('log-out', 18), state.mode === 'demo' ? 'Salir del demo' : 'Cerrar sesión'),
        h('a', { class: 'btn ghost', href: '#/ayuda' }, ic('circle-help', 18), 'Ayuda y fuentes'))));
  return { title: 'Ajustes', back: null, el };
}

function jugador(ctx) {
  const me = ctx.me;
  if (ctx.self) return { title: 'Ajustes', el: h('div', { class: 'page' },
    h('section', { class: 'stack' }, sectionTitle('Pantalla'), themeField()),
    h('section', { class: 'stack' }, sectionTitle('Tu perfil de jugador'),
      h('p', { style: { margin: 0 } }, `Estás usando Remate con tu ficha de jugador (${me.name}). Lo que registres aquí (En casa, retos, convocatorias y Teoría) cuenta como de ese jugador.`),
      h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', onclick: () => import('./sheets-player.js').then((m) => m.playerFormSheet(me, { self: true })) }, ic('pencil', 18), 'Editar mis datos'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => import('./mas.js').then((m) => m.leaveSelf('#/ajustes')) }, ic('undo-2', 18), 'Volver a entrenador'))),
    aboutSection()) };
  return { title: 'Ajustes', el: h('div', { class: 'page' },
    h('section', { class: 'stack' }, sectionTitle('Pantalla'), themeField()),
    ctx.readonly ? null : h('section', { class: 'stack' }, sectionTitle('Notificaciones'), pushSettings()),
    h('section', { class: 'stack' }, sectionTitle('Tu información'),
      h('p', { style: { margin: 0 } }, `Tu entrenador guarda tu nombre o apodo${me ? ` (${me.name})` : ''}, tu posición, tus evaluaciones y tu asistencia. No guarda teléfono, domicilio ni fotos. Solo tú y tu entrenador ven tu avance. Si quieres que se corrija o se borre algo, pídeselo a tu entrenador.`)),
    aboutSection(),
    ctx.readonly ? note('Vista previa: aquí no se cierra la sesión del jugador.', 'warn') : h('section', { class: 'stack' }, sectionTitle('Este celular'),
      h('p', { style: { margin: 0 } }, 'Si sales, vas a necesitar tu código otra vez para volver a entrar.'),
      h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', onclick: async () => { if (await confirmSheet({ title: '¿Salir de Remate en este celular?', text: 'Para volver a entrar necesitarás tu código.', ok: 'Salir', danger: true })) signOut(); } }, ic('log-out', 18), 'Salir'),
        h('a', { class: 'btn ghost', href: '#/ayuda' }, ic('circle-help', 18), 'Ayuda')))) };
}
