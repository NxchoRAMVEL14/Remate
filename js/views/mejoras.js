// Mejoras: la lista privada del entrenador con lo que quiere cambiar o agregar a Remate.
import { h, ic, toast, openSheet, confirmSheet, copyText, fmtDate, plural } from '../util.js';
import { state, add, patch, remove, casaReady, group } from '../store.js';
import { AREAS, PRIORITY, STATUS, SUGGESTED } from '../content/ideas.js';
import { sectionTitle, note, empty, field, options } from './ui.js';

const PRI_ORDER = { alta: 0, media: 1, baja: 2 }, ST_ORDER = { lista: 0, idea: 1, hecha: 2, descartada: 3 };
const FILTERS = [['pendientes', 'Pendientes'], ['hecha', 'Hechas'], ['descartada', 'Descartadas'], ['todas', 'Todas']];
const sorted = () => state.data.ideas.slice().sort((a, b) => ST_ORDER[a.status] - ST_ORDER[b.status] || PRI_ORDER[a.priority] - PRI_ORDER[b.priority] || b.created_at.localeCompare(a.created_at));
const norm = (s) => String(s || '').trim().toLowerCase();

export const missingSql3Note = () => note('Para guardar aquí, corre en Supabase el archivo instalar.sql de esta versión (SQL Editor → pega todo → Run). No borra nada.', 'bad');

export function ideaSheet(idea = null, prefill = {}) {
  const v = { priority: 'media', status: 'idea', area: 'otra', ...prefill, ...(idea || {}) };
  const title = h('input', { type: 'text', maxlength: 120, value: v.title || '', placeholder: 'Por ejemplo: pasar lista por posición' });
  const body = h('textarea', { rows: 5, maxlength: 2000, placeholder: 'Qué quieres que haga, en qué pantalla y para qué te sirve. Si puedes, un ejemplo: "Cuando paso lista, quiero ver primero a los que faltaron la vez pasada".' }, v.body || '');
  const area = h('select', {}, options(Object.entries(AREAS), v.area));
  const status = h('select', {}, options(Object.entries(STATUS), v.status));
  let pri = v.priority;
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Prioridad' });
  const draw = () => seg.replaceChildren(...Object.entries(PRIORITY).map(([k, t]) => h('button', { type: 'button', 'aria-pressed': pri === k ? 'true' : 'false', onclick: () => { pri = k; draw(); } }, t)));
  draw();
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  openSheet({
    title: idea ? 'Editar mejora' : 'Nueva mejora',
    body: h('div', { class: 'stack' }, field('Título', title), field('Detalle', body, 'Mientras más concreto, más fácil pedirlo después.'),
      h('div', { class: 'grid' }, field('Pantalla o sección', area), field('Estado', status)),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Prioridad'), seg), err),
    actions: [
      { label: 'Cancelar' },
      idea ? { label: 'Borrar', kind: 'danger', onClick: async () => { if (!(await confirmSheet({ title: '¿Borrar esta mejora?', text: 'No se puede deshacer.', ok: 'Borrar', danger: true }))) return false; remove('ideas', idea.id); toast('Mejora borrada'); return true; } } : null,
      { label: 'Guardar', kind: 'primary', onClick: () => {
        if (!title.value.trim()) { err.textContent = 'Escribe un título.'; err.hidden = false; return false; }
        const row = { title: title.value.trim(), body: body.value.trim(), area: area.value, priority: pri, status: status.value,
          done_at: status.value === 'hecha' ? (idea?.done_at || new Date().toISOString()) : null };
        if (idea) patch('ideas', idea.id, row); else add('ideas', row);
        toast('Mejora guardada'); return true;
      } },
    ].filter(Boolean),
  });
}

// Texto listo para pegar en el chat cuando quieras pedir los cambios.
export function requestText(list) {
  const g = group();
  const lines = list.map((x, i) => `${i + 1}. [${PRIORITY[x.priority]}] ${AREAS[x.area] || x.area}: ${x.title}${x.body ? `\n   ${x.body.replace(/\n+/g, '\n   ')}` : ''}`);
  return `Quiero estos cambios en Remate, mi app de voleibol${g?.name ? ` (${g.name})` : ''}. Está publicada en GitHub Pages y usa Supabase; la subo arrastrando archivos en GitHub, sin terminal.\n\n${lines.join('\n\n')}\n\nAntes de empezar, dime qué archivos cambian, si hay que correr SQL nuevo en Supabase y si algo de esto choca con lo que ya existe. Entrégame todo junto en un solo ZIP.`;
}

export default function mejoras(ctx) {
  const ui = ctx.ui; ui.f ||= 'pendientes';
  const ro = !casaReady();
  const all = sorted();
  const list = all.filter((x) => ui.f === 'todas' || (ui.f === 'pendientes' ? ['idea', 'lista'].includes(x.status) : x.status === ui.f));
  const pending = all.filter((x) => ['idea', 'lista'].includes(x.status)), ready = all.filter((x) => x.status === 'lista');
  const toCopy = ready.length ? ready : pending;
  const have = new Set(all.map((x) => norm(x.title)));
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Filtro' }, FILTERS.map(([k, t]) =>
    h('button', { type: 'button', 'aria-pressed': ui.f === k ? 'true' : 'false', onclick: () => { ui.f = k; ctx.rerender(); } }, t)));
  const el = h('div', { class: 'page' },
    ro ? missingSql3Note() : null,
    h('p', { style: { margin: 0 } }, 'Tu lista privada de cambios para Remate. Anota aquí lo que se te ocurra en la cancha; cuando quieras pedirlos, copia la lista y pégala en el chat. Tus jugadores no ven esta sección.'),
    h('div', { class: 'cluster' },
      ro ? null : h('button', { class: 'btn primary', type: 'button', onclick: () => ideaSheet() }, ic('plus', 18), 'Nueva mejora'),
      toCopy.length ? h('button', { class: 'btn', type: 'button', onclick: () => copyText(requestText(toCopy)) }, ic('copy', 18),
        ready.length ? `Copiar ${plural(ready.length, 'lista para pedir', 'listas para pedir')}` : `Copiar ${plural(pending.length, 'pendiente', 'pendientes')}`) : null),
    all.length ? seg : null,
    list.length ? h('div', { class: 'rows' }, list.map((x) => h(ro ? 'div' : 'button', { type: ro ? null : 'button', class: 'row', onclick: ro ? null : () => ideaSheet(x) },
      h('span', { class: 'row-main' }, h('strong', { style: x.status === 'hecha' || x.status === 'descartada' ? { textDecoration: 'line-through', opacity: .75 } : null }, x.title),
        h('span', { class: 'row-sub' }, [AREAS[x.area] || x.area, `prioridad ${PRIORITY[x.priority].toLowerCase()}`, x.status === 'hecha' && x.done_at ? `hecha el ${fmtDate(x.done_at.slice(0, 10), { day: 'numeric', month: 'short' })}` : null].filter(Boolean).join(' · ')),
        x.body ? h('span', { class: 'row-sub' }, x.body.length > 110 ? `${x.body.slice(0, 109)}…` : x.body) : null),
      h('span', { class: 'row-end' }, h('span', { class: `chip ${x.status === 'lista' ? 'ball' : x.status === 'hecha' ? 'ok' : x.status === 'descartada' ? '' : 'info'}` }, STATUS[x.status])))))
      : empty(all.length ? 'Nada en este filtro' : 'Tu lista está vacía', all.length ? null : 'Escribe la primera mejora o agrega alguna de las ideas sugeridas de abajo.'),
    h('section', { class: 'stack' }, sectionTitle('Ideas sugeridas'),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Ideas para las siguientes versiones. Agrega a tu lista las que te sirvan; las demás ignóralas.'),
      h('div', { class: 'rows' }, SUGGESTED.map((s) => { const added = have.has(norm(s.title));
        return h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, s.title), h('span', { class: 'row-sub' }, `${AREAS[s.area]} · ${s.body}`)),
          h('span', { class: 'row-end' }, added ? h('span', { class: 'chip ok' }, 'En tu lista')
            : ro ? null : h('button', { class: 'btn sm', type: 'button', onclick: () => { add('ideas', { ...s }); toast('Agregada a tu lista'); } }, ic('plus', 16), 'Agregar')));
      }))),
    note('Consejo para pedir cambios: marca como "Lista para pedir" solo lo que de verdad quieres en la siguiente versión. Pedir de 3 a 5 cosas a la vez, cada una con pantalla, qué y para qué, sale mejor que una lista larga.'));
  return { title: 'Mejoras', sub: 'Solo tú lo ves', back: '#/mas', el };
}
