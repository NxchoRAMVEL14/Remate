// Leer partidos y torneos desde una imagen (cartel, foto del rol de juegos o captura de pantalla).
// El texto se lee en el celular con Tesseract.js (gratis, sin claves): la primera vez descarga el lector (unos 5 MB)
// y después queda guardado. Remate propone nombre, rama, formato, fecha, sede, partidos, horarios y pases directos,
// y SIEMPRE te deja revisar y corregir antes de guardar.
import { h, ic, toast, openSheet, todayStr } from '../util.js';
import { state, add, patch, group, torneosReady, equiposReady, multiTeam, teams } from '../store.js';
import { field, options, note } from './ui.js';
import { RAMAS, makeBracket, ourTeamId } from './torneos.js';

// ---------- lector de texto (Tesseract.js 5.1.1 desde jsDelivr) ----------
const CDN = 'https://cdn.jsdelivr.net/npm';
const TESS = { script: `${CDN}/tesseract.js@5.1.1/dist/tesseract.min.js`, worker: `${CDN}/tesseract.js@5.1.1/dist/worker.min.js`, core: `${CDN}/tesseract.js-core@5.1.1`, lang: `${CDN}/@tesseract.js-data/spa@1.0.0/4.0.0_best_int` };
let loading = null;
function loadTesseract() {
  if (globalThis.Tesseract) return Promise.resolve(globalThis.Tesseract);
  loading ??= new Promise((ok, bad) => {
    const s = document.createElement('script'); s.src = TESS.script; s.async = true;
    s.onload = () => ok(globalThis.Tesseract); s.onerror = () => { loading = null; bad(new Error('No se pudo descargar el lector. Revisa tu internet.')); };
    document.head.append(s);
  });
  return loading;
}
// Agranda, pasa a gris y sube el contraste: el lector acierta mucho más.
async function prepare(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('No pude abrir esa imagen.')); i.src = url; });
    const scale = Math.max(0.3, Math.min(3, 2200 / img.naturalWidth));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data, hist = new Uint32Array(256);
    for (let i = 0; i < p.length; i += 4) { const g = Math.round(p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114); p[i] = g; hist[g]++; }
    const n = p.length / 4; let lo = 0, hi = 255, acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > n * 0.01) { lo = v; break; } }
    acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > n * 0.01) { hi = v; break; } }
    const k = 255 / Math.max(1, hi - lo);
    for (let i = 0; i < p.length; i += 4) { const g = Math.max(0, Math.min(255, (p[i] - lo) * k)); p[i] = p[i + 1] = p[i + 2] = g; }
    x.putImageData(d, 0, 0);
    return c;
  } finally { URL.revokeObjectURL(url); }
}
const STEP = { 'loading tesseract core': 'Descargando el lector', 'initializing tesseract': 'Preparando el lector', 'loading language traineddata': 'Descargando el idioma español', 'initializing api': 'Preparando el lector', 'recognizing text': 'Leyendo el texto' };
export async function readImage(file, onProgress = () => {}) {
  onProgress('Preparando la imagen', 0);
  const canvas = await prepare(file);
  const T = await loadTesseract();
  const worker = await T.createWorker('spa', 1, { workerPath: TESS.worker, corePath: TESS.core, langPath: TESS.lang, logger: (m) => onProgress(STEP[m.status] || 'Leyendo', m.progress || 0) });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: '3', preserve_interword_spaces: '1' });
    let text = (await worker.recognize(canvas)).data.text;
    // Si casi no encontró partidos, intenta otra forma de leer (texto suelto, como en los carteles con recuadros).
    if (parseSchedule(text).games.length < 2) {
      await worker.setParameters({ tessedit_pageseg_mode: '11' });
      text += `\n${(await worker.recognize(canvas)).data.text}`;
    }
    return text;
  } finally { await worker.terminate(); }
}

// ---------- análisis del texto ----------
const U = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const KEY = (s) => U(s).replace(/[^A-Z0-9]/g, '');
const HEAD = /\b(PARTIDO|PARTIDOS|SEMIFINAL|SEMIFINALES|FINAL|RONDA|CAMPEON|ORDEN|PASE|PASA|DIRECTO|GANADOR|CUARTOS|OCTAVOS|GRUPO|JORNADA|TORNEO|LUEGO|ELIMINACION|DIRECTA|GANE|MEJOR|HORARIO|HORARIOS|SEDE|LLEGAR|ROL|PROGRAMA|VOLEIBOL|VOLLEYBALL|VARONIL|FEMENIL|MIXTO|SABADO|DOMINGO|LUNES|MARTES|MIERCOLES|JUEVES|VIERNES)\b/;
const TIME_RE = /\b(\d{1,2})\s*[:.]\s*(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?|hrs?\.?)?/i;
const MONTHS = { ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, SETIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12 };
function toTime(m) {
  if (!m) return '';
  let hh = Number(m[1]); const mm = Number(m[2]), ap = (m[3] || '').toLowerCase().replace(/[\s.]/g, '');
  if (ap.startsWith('p') && hh < 12) hh += 12;
  if (ap.startsWith('a') && hh === 12) hh = 0;
  if (!ap && hh >= 1 && hh <= 6) hh += 12;          // «4:00» en un rol de juegos casi siempre es en la tarde
  return hh > 23 || mm > 59 ? '' : `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function cleanTeam(s) {
  return String(s || '').replace(/\(.*?\)/g, ' ').replace(new RegExp(TIME_RE.source, 'gi'), ' ')
    .replace(/\b(PARTIDO|P)\s*\d+\b/gi, ' ').replace(/^.{0,6}?\b\d{1,2}[.)]\s+(?=\p{L})/u, '').replace(/^[\s\d.)\-–—:·•*>¡!¿?]+/, '').replace(/[\s.\-–—:·•*,;!¡?]+$/, '')
    .replace(/\s+/g, ' ').trim();
}
function validTeam(s) {
  const u = U(s), letters = (u.match(/[A-Z]/g) || []).length;
  return letters >= 3 && s.length <= 40 && s.split(' ').length <= 5 && !HEAD.test(u) && !/^V\.?\s?S\.?$/.test(u);
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// Devuelve { name, branch, format, date, venue, games: [{ a, b, time }], byes: [] }.
export function parseSchedule(text, ourNames = []) {
  // Cada renglón se parte en columnas cuando hay 3 o más espacios (carteles con varias columnas).
  const segs = String(text || '').split(/\r?\n/).flatMap((l) => l.split(/\s{3,}|\t/))
    .map((l) => l.replace(/[|“”"»«_~^]/g, ' ').replace(/\s+/g, ' ').trim()).filter((l) => l.length > 1);
  const all = U(text);
  const out = { name: '', branch: 'X', format: 'lista', date: '', venue: '', games: [], byes: [] };
  const tl = segs.find((l) => /\b(TORNEO|COPA|LIGA|CAMPEONATO|FESTIVAL|INTERPREPAS|ENCUENTRO|CUADRANGULAR|TRIANGULAR)\b/.test(U(l)));
  if (tl) out.name = tl.replace(/[^\p{L}\p{N}\s·.,\-]/gu, ' ').replace(/\s+/g, ' ').replace(/^[\s\-·.,]+|[\s\-·.,]+$/g, '').slice(0, 80);
  out.branch = /\bVARONIL\b/.test(all) ? 'M' : /\bFEMENIL\b/.test(all) ? 'F' : 'X';
  out.format = /ELIMINACION|SEMIFINAL|CUARTOS DE FINAL|GRAN FINAL|PASE DIRECTO|PASA DIRECTO/.test(all) ? 'eliminacion'
    : /\bGRUPO|TODOS CONTRA TODOS|ROUND ROBIN|JORNADA|TABLA\b/.test(all) ? 'tabla' : 'lista';
  const dm = all.match(/\b(\d{1,2})\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)(?:\s+(?:DE|DEL)\s+(\d{4}))?/);
  const dn = all.match(/\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\b/);
  if (dm) { const y = dm[3] ? Number(dm[3]) : new Date().getFullYear(); out.date = `${y}-${String(MONTHS[dm[2]]).padStart(2, '0')}-${String(Number(dm[1])).padStart(2, '0')}`; }
  else if (dn) { const y = Number(dn[3]) < 100 ? 2000 + Number(dn[3]) : Number(dn[3]); out.date = `${y}-${String(Number(dn[2])).padStart(2, '0')}-${String(Number(dn[1])).padStart(2, '0')}`; }
  const vl = segs.find((l) => /\b(GIMNASIO|UNIDAD DEPORTIVA|AUDITORIO|POLIDEPORTIVO|DOMO|ARENA|DEPORTIVO|CANCHA|SEDE)\b/.test(U(l)) && !/\bVS\b/i.test(l));
  if (vl) out.venue = (vl.split(/\s[·:|\-–—]\s|·/).find((x) => /\b(GIMNASIO|UNIDAD|AUDITORIO|POLIDEPORTIVO|DOMO|ARENA|DEPORTIV|CANCHA|SEDE)/.test(U(x))) || vl).replace(/^SEDE\s*:?\s*/i, '').trim().slice(0, 120);

  // Vocabulario: tus equipos y los nombres que aparecen sueltos, como en los recuadros de un cartel (sirven para corregir errores del lector).
  const vocab = [...ourNames, ...segs.filter((l) => !/\s(?:v\.?\s?s\.?|v\/s|contra)\s/i.test(l)).map(cleanTeam).filter(validTeam)];
  // «REGIONAL A» y «REGIONAL B» son equipos distintos: nunca se corrige solo la última letra.
  const endOnly = (x, y) => x.slice(0, -1) === y.slice(0, -1) || x === y.slice(0, -1) || y === x.slice(0, -1);
  const canon = (name) => {
    const k = KEY(name);
    const same = vocab.filter((v) => KEY(v) === k);
    const own = ourNames.find((v) => KEY(v) === k);
    if (own) return own;
    if (same.length) return same.sort((a, b) => b.split(' ').length - a.split(' ').length)[0];
    if (k.length >= 5) {
      const near = vocab.find((v) => { const kv = KEY(v); return kv !== k && kv.length >= 4 && !endOnly(kv, k) && lev(kv, k) <= 1; });
      if (near) return ourNames.find((v) => KEY(v) === KEY(near)) || near;
    }
    return name;
  };
  const partTimes = {}, pairs = [];
  segs.forEach((l, i) => {
    const u = U(l);
    const pm = u.match(/\bPARTIDO\s*(\d+)/), tm = l.match(TIME_RE);
    if (pm && tm && !/\bV\.?S\.?\b/.test(u)) partTimes[Number(pm[1])] = toTime(tm);
    if (/PAS[EA] DIRECTO|\bBYE\b|DESCANSA/.test(u)) {
      let t = cleanTeam(l.replace(/pas[ea]\s+directo|\bbye\b|descansa/ig, ' '));
      if (!validTeam(t)) t = cleanTeam(segs[i + 1] || '');
      if (validTeam(t)) out.byes.push(t);
      return;
    }
    if (/GANADOR/.test(u)) return;   // semifinales y final: Remate las arma solo
    const sp = l.split(/\s+(?:v\.?\s?s\.?|v\/s|contra)\s+/i);
    if (sp.length === 2) {
      const a = cleanTeam(sp[0]), b = cleanTeam(sp[1]);
      if (validTeam(a) && validTeam(b)) pairs.push({ a, b, time: toTime(tm), card: false });
    } else if (/^v\.?\s?s\.?$/i.test(l)) {                     // recuadro: equipo / vs / equipo
      const a = cleanTeam(segs[i - 1] || ''), b = cleanTeam(segs[i + 1] || '');
      if (validTeam(a) && validTeam(b)) pairs.push({ a, b, time: '', card: true });
    }
  });
  // Sin repetidos (A vs B = B vs A); los de renglón completo mandan sobre los de recuadro.
  const seen = new Set(), used = new Set();
  for (const p of [...pairs.filter((x) => !x.card), ...pairs.filter((x) => x.card)]) {
    const a = canon(p.a), b = canon(p.b), k = [KEY(a), KEY(b)].sort().join('|');
    if (KEY(a) === KEY(b) || seen.has(k) || (p.card && (used.has(KEY(a)) || used.has(KEY(b))))) continue;
    seen.add(k); used.add(KEY(a)); used.add(KEY(b));
    out.games.push({ a, b, time: p.time || partTimes[out.games.length + 1] || '' });
  }
  out.byes = [...new Map(out.byes.map(canon).filter((b) => !out.games.some((g) => KEY(g.a) === KEY(b) || KEY(g.b) === KEY(b))).map((b) => [KEY(b), b])).values()];
  if (out.byes.length && out.format === 'lista') out.format = 'eliminacion';
  return out;
}

// ---------- crear lo revisado ----------
const ourNames = () => (multiTeam() ? teams().map((t) => t.name) : [teams()[0]?.name || group()?.name].filter(Boolean));
function matchRow(game, extra) {
  const ia = ourTeamId(game.a), ib = ourTeamId(game.b);
  const mineA = ia !== null, rival = mineA ? game.b : game.a, team = mineA ? ia : ib;
  const date = extra.date || todayStr();
  const row = { group_id: group()?.id, rival: rival.slice(0, 60), match_date: date, venue: (extra.venue || '').slice(0, 80), kind: extra.tournament_id || extra.name ? 'torneo' : 'amistoso', best_of: 3,
    note: [extra.tournament_id ? '' : (extra.name || '').trim(), game.time ? `Hora: ${game.time}` : ''].filter(Boolean).join(' · '), status: date > todayStr() ? 'planeado' : 'en_juego' };
  if (extra.tournament_id) row.tournament_id = extra.tournament_id;
  if (equiposReady() && multiTeam()) row.team = team || teams()[0].id;
  return row;
}
function createFrom(st) {
  const games = st.games.map((g) => ({ ...g, a: g.a.trim(), b: g.b.trim() })).filter((g) => g.a && g.b);
  const byes = st.byes.map((b) => b.trim()).filter(Boolean);
  const mine = games.filter((g) => ourTeamId(g.a) !== null || ourTeamId(g.b) !== null);
  if (!games.length) { toast('No hay partidos completos'); return false; }
  if (st.format === 'lista' || !torneosReady()) {
    if (!mine.length) { toast('Ninguno de estos partidos es de tus equipos. Revisa los nombres.'); return false; }
    mine.forEach((g) => add('matches', matchRow(g, st)));
    toast(`${mine.length} ${mine.length === 1 ? 'partido creado' : 'partidos creados'}`); location.hash = '#/partidos'; return true;
  }
  const row = { group_id: group()?.id, name: (st.name || 'Torneo').slice(0, 80), venue: st.venue.slice(0, 120), start_date: st.date || todayStr(), end_date: null, branch: st.branch, note: '' };
  const myTeams = [...new Set(games.flatMap((g) => [ourTeamId(g.a), ourTeamId(g.b)]).concat(byes.map(ourTeamId)).filter((x) => x !== null && x !== ''))];
  if (equiposReady()) { row.format = st.format; if (multiTeam()) row.teams = myTeams; if (st.format === 'eliminacion') row.bracket = makeBracket(games, byes); }
  if (st.format === 'tabla' || !equiposReady()) {
    const names = [...new Map(games.flatMap((g) => [g.a, g.b]).concat(byes).map((n) => [n.toUpperCase(), n])).values()];
    row.standings = names.map((n) => { const id = ourTeamId(n); return { team: n.slice(0, 60), us: id !== null, ...(id ? { my: id } : {}), pj: null, pg: null, pp: null, sf: null, sc: null, pts: null }; });
  }
  const t = add('tournaments', row);
  // Los partidos de tus equipos (primera ronda) se crean para capturarlos, salir en el calendario y en la convocatoria.
  const links = {};
  mine.forEach((g) => { const m = add('matches', matchRow(g, { ...st, tournament_id: t.id })); links[`${g.a}|${g.b}`] = m.id; });
  if (row.bracket && Object.keys(links).length) patch('tournaments', t.id, { bracket: row.bracket.map((g) => (links[`${g.a}|${g.b}`] ? { ...g, match_id: links[`${g.a}|${g.b}`] } : g)) });
  toast(`Torneo creado${mine.length ? ` con ${mine.length} ${mine.length === 1 ? 'partido tuyo' : 'partidos tuyos'}` : ''}`);
  location.hash = `#/torneo/${t.id}`; return true;
}

// ---------- pantalla: elegir imagen, leer y revisar ----------
export function importSheet() {
  const st = { name: '', branch: 'X', format: 'lista', date: todayStr(), venue: '', games: [], byes: [], text: '', img: null };
  const body = h('div', { class: 'stack imp' });
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => { const f = e.target.files?.[0]; if (f) run(f); e.target.value = ''; } });
  const apply = (p) => { Object.assign(st, { name: p.name || st.name, branch: p.branch, format: p.format, date: p.date || st.date, venue: p.venue || st.venue, games: p.games.map((g) => ({ ...g })), byes: [...p.byes] }); };
  const start = () => body.replaceChildren(file,
    h('p', { style: { margin: 0 } }, 'Sube la foto o captura del cartel, del rol de juegos o del cuadro del torneo. Remate lee el texto y te propone el torneo y sus partidos para que los revises.'),
    h('button', { class: 'btn primary', type: 'button', onclick: () => file.click() }, ic('upload', 18), 'Elegir imagen'),
    note('Funciona mejor con imágenes nítidas, derechas y con letra grande. La primera vez descarga el lector (unos 5 MB); después queda guardado en el celular.'),
    h('details', {}, h('summary', {}, 'No tengo imagen: pegar el texto'), h('div', { class: 'stack', style: { marginTop: '8px' } },
      (() => { const ta = h('textarea', { rows: 6, placeholder: 'Por ejemplo:\nCopa Interprepas Varonil, 8 de noviembre\n10:30 CECYTEC vs CETAC B\nREGIONAL B vs CETAC A\nCBTIS A pasa directo' });
        return [ta, h('button', { class: 'btn', type: 'button', onclick: () => { st.text = ta.value; apply(parseSchedule(ta.value, ourNames())); review(); } }, 'Analizar texto')]; })())));
  async function run(f) {
    st.img = URL.createObjectURL(f);
    const bar = h('span', { style: { width: '0%' } }), msg = h('p', { class: 'row-sub', style: { margin: 0 }, role: 'status' }, 'Preparando…');
    body.replaceChildren(h('img', { class: 'imp-img', src: st.img, alt: 'Imagen elegida' }), msg, h('div', { class: 'teo-bar imp-bar' }, bar));
    try {
      st.text = await readImage(f, (m, p) => { msg.textContent = `${m}…`; bar.style.width = `${Math.round(p * 100)}%`; });
      apply(parseSchedule(st.text, ourNames()));
      review();
    } catch (e) {
      body.replaceChildren(note(e.message || 'No se pudo leer la imagen.', 'bad'), h('button', { class: 'btn', type: 'button', onclick: start }, 'Intentar otra vez'));
    }
  }
  function review() {
    const inp = (o, k, ph, type = 'text') => h('input', { type, maxlength: 40, value: o[k] || '', placeholder: ph, 'aria-label': ph, oninput: (e) => { o[k] = e.target.value; } });
    const gamesBox = h('div', { class: 'stack' }), byesBox = h('div', { class: 'stack' }), mineBox = h('p', { class: 'row-sub', style: { margin: 0 } });
    const drawMine = () => { const n = [...new Set(st.games.flatMap((g) => [g.a, g.b]).concat(st.byes).filter((x) => x && ourTeamId(x) !== null))];
      mineBox.textContent = n.length ? `Tus equipos encontrados: ${n.join(', ')}.` : `No encontré a tus equipos (${ourNames().join(', ')}). Corrige los nombres para que Remate cree tus partidos.`; };
    const drawGames = () => { gamesBox.replaceChildren(...st.games.map((g, i) => h('div', { class: 'panel br-edit' },
      h('div', { class: 'split' }, h('strong', {}, `Partido ${i + 1}`), h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Quitar partido', onclick: () => { st.games.splice(i, 1); drawGames(); } }, ic('trash-2', 16))),
      h('div', { class: 'br-row', oninput: drawMine }, inp(g, 'a', 'Equipo'), h('span', { class: 'vs' }, 'vs'), inp(g, 'b', 'Equipo')),
      h('label', { class: 'br-time' }, h('span', {}, 'Hora'), inp(g, 'time', 'Hora', 'time'))))); drawMine(); };
    const drawByes = () => { byesBox.replaceChildren(...st.byes.map((b, i) => h('div', { class: 'split' }, h('input', { type: 'text', maxlength: 40, value: b, 'aria-label': 'Pasa directo', oninput: (e) => { st.byes[i] = e.target.value; drawMine(); } }),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Quitar', onclick: () => { st.byes.splice(i, 1); drawByes(); } }, ic('trash-2', 16))))); drawMine(); };
    drawGames(); drawByes();
    const fmt = h('select', { onchange: (e) => { st.format = e.target.value; byesWrap.hidden = st.format !== 'eliminacion'; } },
      options([['eliminacion', 'Torneo de eliminación directa'], ['tabla', 'Torneo con tabla de posiciones'], ['lista', 'Solo crear mis partidos (sin torneo)']], st.format));
    const byesWrap = h('div', { class: 'field', hidden: st.format !== 'eliminacion' ? true : null }, h('span', { class: 'label' }, 'Pasan directo a la siguiente ronda'), byesBox,
      h('button', { class: 'btn sm', type: 'button', onclick: () => { st.byes.push(''); drawByes(); } }, ic('plus', 16), 'Pase directo'));
    const raw = h('textarea', { rows: 8, 'aria-label': 'Texto leído' }, st.text);
    body.replaceChildren(
      st.img ? h('img', { class: 'imp-img', src: st.img, alt: 'Imagen leída' }) : null,
      note(st.games.length ? `Encontré ${st.games.length} ${st.games.length === 1 ? 'partido' : 'partidos'}${st.byes.length ? ` y ${st.byes.length} pase directo` : ''}. Revisa los nombres y horas: el lector puede equivocarse.` : 'No encontré partidos claros. Escríbelos abajo o corrige el texto leído y vuelve a analizarlo.', st.games.length ? '' : 'warn'),
      field('Qué crear', fmt),
      field('Nombre', inp(st, 'name', 'Nombre del torneo')),
      h('div', { class: 'grid' }, field('Fecha', inp(st, 'date', 'Fecha', 'date')), field('Rama', h('select', { onchange: (e) => { st.branch = e.target.value; } }, options(Object.entries(RAMAS), st.branch)))),
      field('Sede', h('input', { type: 'text', maxlength: 120, value: st.venue, oninput: (e) => { st.venue = e.target.value; } })),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Partidos (primera ronda o rol de juegos)'), gamesBox,
        h('button', { class: 'btn sm', type: 'button', onclick: () => { st.games.push({ a: '', b: '', time: '' }); drawGames(); } }, ic('plus', 16), 'Partido')),
      byesWrap, mineBox,
      !torneosReady() ? note('Para crear torneos, corre en Supabase el sql/instalar.sql de esta versión. Mientras, puedes crear solo tus partidos.', 'warn') : null,
      h('details', {}, h('summary', {}, 'Texto que leyó Remate'), h('div', { class: 'stack', style: { marginTop: '8px' } }, raw,
        h('button', { class: 'btn sm', type: 'button', onclick: () => { st.text = raw.value; apply(parseSchedule(raw.value, ourNames())); review(); } }, ic('refresh-cw', 16), 'Volver a analizar este texto'))));
  }
  start();
  openSheet({ title: 'Leer de una imagen', body, actions: [{ label: 'Cancelar' }, { label: 'Crear', kind: 'primary', onClick: () => (st.games.length ? createFrom(st) : (toast('Primero elige una imagen o escribe los partidos'), false)) }],
    onClose: () => { if (st.img) URL.revokeObjectURL(st.img); } });
}
