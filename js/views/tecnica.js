// Videos de técnica (v3.9): el jugador sube un video corto; solo lo ven él y su entrenador.
// El entrenador lo ve lento o cuadro por cuadro y deja comentarios con el segundo exacto. Solo el entrenador lo borra.
// Los videos viven en Supabase Storage (carpeta privada «tecnica»); en la tabla solo va la ruta y los comentarios.
import { h, ic, toast, openSheet, confirmSheet, fmtDate, plural, uid } from '../util.js';
import { state, add, patch, remove, players, getPlayer, group, sql39Ready } from '../store.js';
import { client, isNetworkError, friendly } from '../cloud.js';
import { SKILLS } from '../content/skills.js';
import { sectionTitle, note, empty, field, options, jersey } from './ui.js';
import { drawLayer, snapshot } from './video-dibujo.js';

export const MAX_MB = 45, MAX_SECS = 60, MAX_PER_PLAYER = 10, QUOTA_MB = 1024;
const BUCKET = 'tecnica';
const DEMO_URLS = new Map();                  // en el demo los videos viven solo en esta pestaña
const skillName = (k) => SKILLS.find((s) => s.id === k)?.name || (k === 'otra' ? 'Otra' : k || 'Técnica');
const mb = (b) => Math.round(((Number(b) || 0) / 1048576) * 10) / 10;
const fmtT = (t) => (t == null ? '' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`);
export const videosFor = (pid) => (state.data.techVideos || []).filter((v) => v.player_id === pid).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
export const unseenVideos = () => (state.role === 'coach' && !state.viewAs ? (state.data.techVideos || []).filter((v) => !v.seen_at).length : 0);
export const usedMB = () => mb((state.data.techVideos || []).reduce((a, v) => a + (Number(v.size_bytes) || 0), 0));

// Duración del video sin subirlo.
function probe(file) {
  return new Promise((res) => {
    const v = document.createElement('video'), url = URL.createObjectURL(file);
    v.preload = 'metadata'; v.muted = true;
    v.onloadedmetadata = () => { res(Number.isFinite(v.duration) ? v.duration : null); URL.revokeObjectURL(url); };
    v.onerror = () => { res(null); URL.revokeObjectURL(url); };
    setTimeout(() => res(null), 6000);
    v.src = url;
  });
}

async function signedUrl(v) {
  if (state.mode !== 'cloud') return DEMO_URLS.get(v.path) || null;
  const c = await client();
  const { data, error } = await c.storage.from(BUCKET).createSignedUrl(v.path, 3600);
  if (error) throw error;
  return data?.signedUrl || null;
}

// ---------- el jugador manda un video ----------
export function uploadSheet(me) {
  if (!sql39Ready()) { toast('Tu entrenador todavía no activa los videos de técnica.'); return; }
  if (videosFor(me.id).length >= MAX_PER_PLAYER) { toast(`Ya tienes ${MAX_PER_PLAYER} videos. Pídele a tu entrenador que borre los que ya revisó.`); return; }
  const skill = h('select', {}, options([...SKILLS.filter((s) => s.id !== 'fisico').map((s) => [s.id, s.name]), ['fisico', 'Físico o gym'], ['otra', 'Otra']], 'remate'));
  const txt = h('input', { type: 'text', maxlength: 200, placeholder: 'Por ejemplo: ¿mi brazo está bien al rematar?' });
  const file = h('input', { type: 'file', accept: 'video/*' });
  const info = h('p', { class: 'row-sub', style: { margin: 0 } }, `Máximo ${MAX_SECS} segundos y ${MAX_MB} MB. Graba de lado o de frente, con buena luz, que se vea todo tu cuerpo.`);
  const bar = h('progress', { max: 100, value: 0, hidden: true, style: { width: '100%' } });
  openSheet({ title: 'Mandar un video de técnica', body: h('div', { class: 'stack' },
    field('¿Qué quieres que revise?', skill), field('Tu pregunta (opcional)', txt), field('Video', file), info, bar,
    note('Solo lo ven tú y tu entrenador. Tu entrenador lo borra cuando ya no haga falta.')),
  actions: [{ label: 'Cancelar' }, { label: 'Mandar', kind: 'primary', onClick: async () => {
    const f = file.files?.[0];
    if (!f) { toast('Elige el video'); return false; }
    if (!/^video\//.test(f.type || 'video/')) { toast('Ese archivo no es un video'); return false; }
    if (f.size > MAX_MB * 1048576) { toast(`El video pesa ${mb(f.size)} MB; el máximo es ${MAX_MB}. Grábalo más corto o en 720p.`); return false; }
    const secs = await probe(f);
    if (secs != null && secs > MAX_SECS + 1) { toast(`El video dura ${Math.round(secs)} s; el máximo es ${MAX_SECS}. Recórtalo en tu galería.`); return false; }
    const ext = (f.name.match(/\.(\w{2,4})$/)?.[1] || 'mp4').toLowerCase();
    const path = `${group()?.owner_id || 'demo'}/${me.id}/${uid()}.${ext}`;
    bar.hidden = false; bar.value = 30;
    try {
      if (state.mode === 'cloud') {
        const c = await client();
        const { error } = await c.storage.from(BUCKET).upload(path, f, { contentType: f.type || 'video/mp4', upsert: false });
        if (error) throw error;
      } else DEMO_URLS.set(path, URL.createObjectURL(f));
      bar.value = 90;
      add('techVideos', { player_id: me.id, path, skill: skill.value, note: txt.value.trim(), size_bytes: f.size, seconds: secs ? Math.round(secs * 10) / 10 : null, comments: [] });
      toast(state.mode === 'cloud' ? 'Video mandado a tu entrenador' : 'Video agregado (en el demo no se guarda al recargar)');
      return true;
    } catch (e) {
      bar.hidden = true;
      toast(isNetworkError(e) ? 'Sin internet. El video no se mandó.' : /exceeded|too large|413/i.test(e?.message || '') ? `El video es muy grande (máximo ${MAX_MB} MB).` : friendly(e));
      return false;
    }
  } }] });
}

// Tarjeta en el Inicio del jugador.
export function videoCardFor(me, ctx) {
  if (!me || !sql39Ready()) return null;
  const vs = videosFor(me.id), fresh = vs.filter((v) => (v.comments || []).length).length;
  return h('a', { class: 'panel', href: '#/tecnica', style: { textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' } },
    ic('video', 26), h('span', { class: 'row-main' }, h('strong', {}, 'Videos de técnica'),
      h('span', { class: 'row-sub' }, vs.length ? `${plural(vs.length, 'video', 'videos')}${fresh ? `, ${plural(fresh, 'con comentarios', 'con comentarios')}` : ''}.` : 'Mándale a tu entrenador un video corto de tu técnica para que te diga qué mejorar.')),
    ic('chevron-right', 18));
}

// ---------- ver un video, ir lento y comentar ----------
export function viewerSheet(v, { coach }) {
  const p = getPlayer(v.player_id) || players().find((x) => x.id === v.player_id);
  const vid = h('video', { controls: true, playsinline: true, preload: 'metadata', class: 'tv-video' });
  vid.setAttribute('playsinline', ''); vid.setAttribute('webkit-playsinline', '');
  vid.crossOrigin = 'anonymous';                 // v3.23: para poder copiar el cuadro con el dibujo (si Supabase lo permite)
  vid.addEventListener('error', () => { if (vid.crossOrigin && vid.src) { const u = vid.src; vid.removeAttribute('crossorigin'); vid.src = u; } });   // si no lo permite, se ve igual (la imagen sale solo con el dibujo)
  const layer = drawLayer(vid);
  vid.addEventListener('play', () => { if (!layer.editing) layer.clear(); });
  const status = h('p', { class: 'row-sub', style: { margin: 0 } }, 'Cargando el video…');
  signedUrl(v).then((u) => { if (u) { vid.src = u; status.textContent = ''; } else status.textContent = 'Este video ya no está disponible (en el demo se borra al recargar).'; })
    .catch((e) => { status.textContent = isNetworkError(e) ? 'Sin internet: no se puede ver el video.' : friendly(e); });
  const rate = (r) => { vid.playbackRate = r; toast(`Velocidad ${r === 1 ? 'normal' : `×${r}`}`, 900); };
  const step = (d) => { vid.pause(); vid.currentTime = Math.max(0, Math.min(vid.duration || 0, vid.currentTime + d)); };
  const list = h('div', { class: 'stack' });
  const paint = () => list.replaceChildren(...(v.comments || []).slice().sort((a, b) => (a.t ?? 1e9) - (b.t ?? 1e9)).map((c, i) => h('div', { class: 'row' },
    c.t != null ? h('button', { type: 'button', class: 'btn sm', onclick: () => { vid.pause(); vid.currentTime = c.t; layer.set(c.draw || []); } }, ic('clock', 14), fmtT(c.t)) : null,
    h('span', { class: 'row-main' }, h('span', {}, c.text, c.draw?.length ? h('span', { class: 'chip ball tv-draw' }, ' ✏️ con dibujo') : null), h('span', { class: 'row-sub' }, fmtDate(String(c.at).slice(0, 10)))),
    coach ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Quitar comentario', onclick: () => { v.comments = v.comments.filter((x) => x !== c); patch('techVideos', v.id, { comments: v.comments }); paint(); } }, ic('x', 18)) : null)));
  paint();
  const txt = h('input', { type: 'text', maxlength: 300, placeholder: 'Por ejemplo: el codo baja antes del golpe' });
  const withTime = h('input', { type: 'checkbox', checked: true });
  const addC = () => {
    const draw = layer.shapes();
    const t = txt.value.trim() || (draw.length ? 'Mira el dibujo' : ''); if (!t) { toast('Escribe el comentario o dibuja'); return; }
    const c = { t: (withTime.checked || draw.length) && Number.isFinite(vid.currentTime) ? Math.round(vid.currentTime * 10) / 10 : null, text: t, at: new Date().toISOString(), ...(draw.length ? { draw } : {}) };
    const next = [...(v.comments || []), c];
    if (JSON.stringify(next).length > 11500) { toast('Ya no cabe otro dibujo en este video: borra algún comentario o dibuja con menos trazos.', 5000); return; }
    v.comments = next; patch('techVideos', v.id, { comments: v.comments }); txt.value = ''; layer.on(false); layer.clear(); drawBtn.setAttribute('aria-pressed', 'false'); drawBtn.lastChild.textContent = 'Dibujar'; paint();
  };
  const drawBtn = h('button', { type: 'button', class: 'btn sm primary', 'aria-pressed': 'false', onclick: () => { const on = !layer.editing; layer.on(on); drawBtn.setAttribute('aria-pressed', String(on)); drawBtn.lastChild.textContent = on ? 'Listo' : 'Dibujar'; } }, ic('pencil', 16), h('span', {}, 'Dibujar'));
  if (coach && !v.seen_at) patch('techVideos', v.id, { seen_at: new Date().toISOString() });
  openSheet({ title: `${p?.name || 'Jugador'} · ${skillName(v.skill)}`, body: h('div', { class: 'stack' },
    v.note ? h('p', { style: { margin: 0 } }, h('strong', {}, 'Pregunta: '), v.note) : null,
    layer.el, coach ? layer.bar : null, status,
    h('div', { class: 'cluster' },
      h('button', { type: 'button', class: 'btn sm', onclick: () => step(-1 / 30) }, ic('chevron-left', 16), 'Cuadro'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => step(1 / 30) }, 'Cuadro', ic('chevron-right', 16)),
      h('button', { type: 'button', class: 'btn sm', onclick: () => rate(0.25) }, '×0.25'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => rate(0.5) }, '×0.5'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => rate(1) }, 'Normal'),
      coach ? drawBtn : null,
      h('button', { type: 'button', class: 'btn sm', onclick: () => snapshot(vid, layer.shapes(), `${p?.name || 'video'}-${skillName(v.skill)}`) }, ic('share-2', 16), 'Imagen')),
    sectionTitle(coach ? 'Tus comentarios' : 'Comentarios de tu entrenador'),
    (v.comments || []).length ? list : h('div', {}, list, h('p', { class: 'row-sub', style: { margin: 0 } }, coach ? 'Pausa en el momento que quieras comentar; con «Dibujar» marcas encima del video y escribes abajo.' : 'Tu entrenador todavía no comenta este video.')),
    coach ? h('div', { class: 'stack' }, field('Comentario', txt), h('label', { class: 'check' }, withTime, h('span', {}, 'Marcar el segundo donde está pausado')),
      h('button', { type: 'button', class: 'btn primary', onclick: addC }, ic('plus', 16), 'Agregar comentario')) : null,
    h('p', { class: 'row-sub', style: { margin: 0 } }, `${fmtDate(String(v.created_at).slice(0, 10))}${v.seconds ? ` · ${Math.round(v.seconds)} s` : ''} · ${mb(v.size_bytes)} MB`)),
  actions: [coach ? { label: 'Borrar video', kind: 'danger', onClick: async () => { await deleteVideo(v); } } : null, { label: 'Cerrar', kind: 'primary' }].filter(Boolean) });
}

export async function deleteVideo(v) {
  if (!(await confirmSheet({ title: '¿Borrar este video?', text: 'Se borra el video y sus comentarios. No se puede deshacer.', ok: 'Borrar', danger: true }))) return false;
  try {
    if (state.mode === 'cloud') { const c = await client(); const { error } = await c.storage.from(BUCKET).remove([v.path]); if (error) throw error; }
    else { const u = DEMO_URLS.get(v.path); if (u) URL.revokeObjectURL(u); DEMO_URLS.delete(v.path); }
    remove('techVideos', v.id); toast('Video borrado'); return true;
  } catch (e) { toast(isNetworkError(e) ? 'Sin internet. Intenta de nuevo.' : friendly(e)); return false; }
}

const row = (v, coach, showName) => {
  const p = getPlayer(v.player_id) || players().find((x) => x.id === v.player_id);
  return h('button', { type: 'button', class: 'row', style: { width: '100%', textAlign: 'left' }, onclick: () => viewerSheet(v, { coach }) },
    showName && p ? jersey(p) : h('span', { class: 'jersey off', 'aria-hidden': 'true' }, ic('video', 18)),
    h('span', { class: 'row-main' }, h('strong', {}, showName && p ? `${p.name} · ${skillName(v.skill)}` : skillName(v.skill)),
      h('span', { class: 'row-sub' }, [fmtDate(String(v.created_at).slice(0, 10)), v.note, (v.comments || []).length ? plural(v.comments.length, 'comentario', 'comentarios') : 'sin comentarios'].filter(Boolean).join(' · '))),
    h('span', { class: 'row-end' }, coach && !v.seen_at ? h('span', { class: 'chip ball' }, 'Nuevo') : null, ic('chevron-right', 18)));
};
// Lista de un jugador (en su ficha o en su pantalla).
export function videosOf(p, { coach = false } = {}) {
  if (!sql39Ready()) return note('Para los videos de técnica, corre en Supabase el bloque «v3.9» de sql/instalar.sql.', 'warn');
  const vs = videosFor(p.id);
  return vs.length ? h('div', { class: 'rows' }, vs.map((v) => row(v, coach, false)))
    : empty('Sin videos', coach ? `Cuando ${p.name} mande un video desde su Inicio, aparece aquí.` : 'Manda tu primer video para que tu entrenador te diga qué mejorar.');
}

export default function tecnica(ctx) {
  const coach = ctx.role === 'coach' && !ctx.readonly && !ctx.self;
  if (!sql39Ready()) return { title: 'Videos de técnica', back: coach ? '#/mas' : '#/inicio', el: h('div', { class: 'page' }, note(coach ? 'Para los videos de técnica, corre en Supabase el bloque «v3.9» de sql/instalar.sql (crea la carpeta privada «tecnica»).' : 'Tu entrenador todavía no activa los videos de técnica.', 'bad')) };
  if (!coach) {
    const me = ctx.me;
    return { title: 'Videos de técnica', back: '#/inicio', el: h('div', { class: 'page' },
      h('section', { class: 'panel stack' },
        h('p', { style: { margin: 0 } }, 'Graba un video corto (máximo 60 s) de tu técnica: remate, saque, recepción, colocación, bloqueo o un ejercicio de gym. Tu entrenador lo ve lento y te deja comentarios con el segundo exacto.'),
        h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn primary', disabled: ctx.readonly ? true : null, onclick: () => uploadSheet(me) }, ic('upload', 18), 'Mandar un video')),
        h('p', { class: 'row-sub', style: { margin: 0 } }, 'Solo lo ven tú y tu entrenador. Se queda hasta que tu entrenador lo borra.')),
      me ? videosOf(me) : null) };
  }
  const all = (state.data.techVideos || []).slice().sort((a, b) => Number(!!a.seen_at) - Number(!!b.seen_at) || String(b.created_at).localeCompare(String(a.created_at)));
  const used = usedMB(), pct = Math.min(100, Math.round((used / QUOTA_MB) * 100));
  return { title: 'Videos de técnica', sub: 'Lo que te mandan tus jugadores', back: '#/mas', el: h('div', { class: 'page' },
    h('section', { class: 'panel stack' },
      h('p', { style: { margin: 0 } }, `Espacio usado: ${used} MB de unos ${QUOTA_MB} MB del plan gratis de Supabase (${pct}%). Ver videos también gasta la descarga del mes (5 GB en el plan gratis).`),
      h('div', { class: 'reto-bar', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('span', { style: { width: `${pct}%` }, class: pct > 80 ? '' : 'ok' })),
      pct > 80 ? note('Ya casi llenas el espacio. Borra los videos que ya revisaste.', 'warn') : null,
      h('p', { class: 'row-sub', style: { margin: 0 } }, `Cada jugador puede tener hasta ${MAX_PER_PLAYER} videos de máximo ${MAX_SECS} s y ${MAX_MB} MB. Solo tú los borras.`)),
    all.length ? h('div', { class: 'rows' }, all.map((v) => row(v, true, true))) : empty('Sin videos todavía', 'Tus jugadores mandan sus videos desde su Inicio → Videos de técnica.')) };
}
