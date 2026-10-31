// Medir con video: salto vertical, salto en profundidad y pruebas de tiempo, cuadro por cuadro con la cámara lenta del celular.
// Mismo principio que My Jump (tiempo de vuelo), sin pagar suscripción. Nada del video sale del celular: solo se guarda el resultado.
import { h, ic, toast, openSheet, todayStr, shareText, plural } from '../util.js';
import { state, add, players, labReady, teamReady, torneosReady, sql37Ready } from '../store.js';
import { flightHeightCm, heightErrorCm, rsi, round1 } from '../lab-calc.js';
import { PTESTS, TEST_GUIDE, MARKS, FILM_TIPS, MEDIR_SOURCES } from '../content/gym.js';
import { sectionTitle, note, field, options } from './ui.js';

const SPEEDS = [[1, 'Se ve a velocidad normal'], [2, 'Cámara lenta ×2 (60 cps)'], [4, 'Cámara lenta ×4 (120 cps)'], [8, 'Cámara lenta ×8 (240 cps)'], [16, 'Cámara lenta ×16 (480 cps)']];
const FPS_LIST = [24, 25, 30, 48, 50, 60, 90, 100, 120, 240];
const snapFps = (x) => FPS_LIST.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a), 30);
const fmtS = (s, d = 2) => `${s.toFixed(d)} s`;
const fill = (el, ...kids) => el.replaceChildren(...kids.flat().filter((x) => x != null && x !== false));

// Detecta los cuadros por segundo del video reproduciéndolo lento unos instantes (requestVideoFrameCallback).
function detectFps(video) {
  if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) return Promise.resolve(null);
  return new Promise((res) => {
    const times = []; let done = false;
    const stop = () => {
      if (done) return; done = true; video.pause();
      const d = []; for (let i = 1; i < times.length; i++) { const x = times[i] - times[i - 1]; if (x > 0.0005) d.push(x); }
      d.sort((a, b) => a - b);
      const q = d.length >= 3 ? d[Math.floor(d.length * 0.25)] : null;
      res(q ? snapFps(1 / q) : null);
    };
    const cb = (now, meta) => { times.push(meta.mediaTime); if (times.length >= 14) stop(); else video.requestVideoFrameCallback(cb); };
    video.requestVideoFrameCallback(cb);
    video.muted = true; video.playbackRate = 0.25;
    video.play().catch(stop);
    setTimeout(stop, 5000);
  });
}

// ---------- el banco de medición (se conserva aunque la pantalla se vuelva a dibujar) ----------
let W = null;
function bench(role) {
  const st = { kind: 'cmj', url: null, fps: 30, fpsAuto: null, speed: 1, frame: 0, maxFrame: 0, zoom: 1, ox: 50, oy: 85, marks: {}, tries: [], drop: 30, name: '' };
  const video = h('video', { playsinline: true, muted: true, preload: 'auto', class: 'md-video', 'aria-label': 'Video para medir' });
  video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
  const stage = h('div', { class: 'md-stage' }, video, h('div', { class: 'md-empty' }, ic('video', 36), h('span', {}, 'Graba o elige un video para empezar')));
  const frameTxt = h('span', { class: 'md-frame', 'aria-live': 'polite' });
  const scrub = h('input', { type: 'range', min: 0, max: 0, step: 1, value: 0, class: 'md-scrub', 'aria-label': 'Mover el video' });
  const kindSel = h('select', { 'aria-label': 'Prueba' });
  const groups = [['Salto vertical', ['cmj', 'cmj_arms', 'sj', 'block', 'spike']], ['Fuerza reactiva', ['drop']], ['Tiempo', ['vel10', 'agilidad']]];
  for (const [label, ids] of groups) kindSel.append(h('optgroup', { label }, ids.map((id) => h('option', { value: id }, TEST_GUIDE[id].name))));
  const speedSel = h('select', { 'aria-label': 'Velocidad del video' }, options(SPEEDS.map(([v, t]) => [String(v), t]), '1'));
  const fpsSel = h('select', { 'aria-label': 'Cuadros por segundo del archivo' });
  const howBox = h('div');
  const marksBox = h('div', { class: 'md-marks' });
  const result = h('div', { class: 'md-result', 'aria-live': 'polite' });
  const triesBox = h('div', { class: 'stack' });
  const saveBox = h('div', { class: 'stack' });
  const fileCam = h('input', { type: 'file', accept: 'video/*', capture: 'environment', hidden: true });
  const fileLib = h('input', { type: 'file', accept: 'video/*', hidden: true });

  const G = () => TEST_GUIDE[st.kind];
  const dtTimeline = () => 1 / st.fps;
  const dtReal = () => 1 / (st.fps * st.speed);
  const realFps = () => Math.round(st.fps * st.speed);

  // ----- video -----
  const showFrame = () => {
    frameTxt.textContent = st.url ? `Cuadro ${st.frame} de ${st.maxFrame} · ${(st.frame * dtTimeline()).toFixed(3)} s` : '';
    scrub.value = String(st.frame);
    for (const b of marksBox.querySelectorAll('[data-mark]')) b.classList.toggle('here', st.marks[b.dataset.mark] === st.frame);
  };
  const seek = (f) => {
    if (!st.url) return;
    st.frame = Math.max(0, Math.min(st.maxFrame, Math.round(f)));
    video.pause();
    video.currentTime = Math.min(video.duration || 0, (st.frame + 0.5) * dtTimeline());
    showFrame();
  };
  const step = (n) => seek(st.frame + n);
  const setFps = (fps) => {
    const t = st.frame * dtTimeline();
    st.fps = fps; st.maxFrame = Math.max(0, Math.floor((video.duration || 0) * fps) - 1);
    scrub.max = String(st.maxFrame);
    st.marks = {}; seek(t * fps); drawMarks(); drawResult();
  };
  const drawFpsSel = () => fpsSel.replaceChildren(...FPS_LIST.map((f) => h('option', { value: String(f), selected: f === st.fps ? true : null }, `${f}${st.fpsAuto === f ? ' (detectado)' : ''}`)));
  async function load(file) {
    if (!file) return;
    if (st.url) URL.revokeObjectURL(st.url);
    st.url = URL.createObjectURL(file); st.name = file.name || 'video'; st.marks = {}; st.frame = 0;
    stage.classList.add('has');
    video.src = st.url;
    await new Promise((r) => { video.onloadedmetadata = r; video.onerror = r; });
    if (!video.duration || !Number.isFinite(video.duration)) { toast('No pude abrir ese video. Prueba con otro o grábalo de nuevo.'); return; }
    frameTxt.textContent = 'Revisando el video…';
    const auto = await detectFps(video);
    st.fpsAuto = auto; st.fps = auto || 30; video.playbackRate = 1;
    drawFpsSel(); setFps(st.fps);
    if (!auto) toast('No pude detectar los cuadros por segundo. Revisa que «Cuadros por segundo del archivo» sea correcto.');
  }
  fileCam.addEventListener('change', () => { load(fileCam.files[0]); fileCam.value = ''; });
  fileLib.addEventListener('change', () => { load(fileLib.files[0]); fileLib.value = ''; });
  scrub.addEventListener('input', () => seek(Number(scrub.value)));
  speedSel.addEventListener('change', () => { st.speed = Number(speedSel.value) || 1; drawResult(); });
  fpsSel.addEventListener('change', () => setFps(Number(fpsSel.value) || 30));
  kindSel.addEventListener('change', () => { st.kind = kindSel.value; st.marks = {}; st.tries = []; drawAll(); });
  // Zoom: toca el video para acercar ese punto (por ejemplo, los pies).
  stage.addEventListener('click', (e) => {
    if (!st.url || e.target !== video) return;
    const r = video.getBoundingClientRect();
    st.ox = Math.round(((e.clientX - r.left) / r.width) * 100); st.oy = Math.round(((e.clientY - r.top) / r.height) * 100);
    st.zoom = st.zoom >= 3 ? 1 : st.zoom + 1; applyZoom();
  });
  const zoomBtn = h('button', { type: 'button', class: 'btn sm', onclick: () => { st.zoom = st.zoom >= 3 ? 1 : st.zoom + 1; applyZoom(); } });
  const applyZoom = () => { video.style.transformOrigin = `${st.ox}% ${st.oy}%`; video.style.transform = `scale(${st.zoom})`; zoomBtn.replaceChildren(ic('zoom-in', 16), ` Zoom ×${st.zoom}`); };
  applyZoom();
  // Reproducir lento para encontrar el salto; luego afinar cuadro por cuadro.
  const playSlow = () => { if (!st.url) return; if (!video.paused) { video.pause(); seek(Math.floor(video.currentTime / dtTimeline())); return; } video.playbackRate = 0.25; video.play().catch(() => {}); tick(); };
  const tick = () => { if (video.paused) return; st.frame = Math.min(st.maxFrame, Math.floor(video.currentTime / dtTimeline())); showFrame(); requestAnimationFrame(tick); };
  video.addEventListener('pause', () => { if (st.url) { st.frame = Math.min(st.maxFrame, Math.floor(video.currentTime / dtTimeline())); showFrame(); } });

  // ----- marcas y resultado -----
  const calc = () => {
    const m = st.marks, type = G().type;
    if (type === 'time') {
      if (m.start == null || m.end == null || m.end <= m.start) return null;
      const t = (m.end - m.start) * dtReal();
      return { value: round1(t * 100) / 100, t, err: dtReal() };
    }
    if (m.off == null || m.land == null || m.land <= m.off) return null;
    const t = (m.land - m.off) * dtReal();
    const out = { t, value: flightHeightCm(t), err: heightErrorCm(t, dtReal()) };
    if (type === 'drop') {
      if (m.touch == null || m.off <= m.touch) return { ...out, needTouch: true };
      out.contact = Math.round((m.off - m.touch) * dtReal() * 1000);
      out.rsi = rsi(out.value, out.contact);
    }
    return out;
  };
  // ¿Es creíble? Si el vuelo es demasiado largo, casi seguro es cámara lenta.
  const sanity = (c) => {
    const type = G().type, tl = c.t * st.speed;   // tiempo tal como dura en el video
    if (type !== 'time' && c.t > 1.0) {
      const sug = SPEEDS.find(([f]) => f > st.speed && tl / f >= 0.3 && tl / f <= 0.9);
      return `En el video ese vuelo dura ${tl.toFixed(2)} s: demasiado para un salto.${sug ? ` ¿Lo grabaste en cámara lenta? Prueba «${sug[1]}» en «Velocidad del video».` : ' Revisa las marcas y la velocidad del video.'}`;
    }
    if (type !== 'time' && c.t < 0.2) return 'Ese vuelo es muy corto (menos de 0.2 s). Revisa que el despegue y el aterrizaje estén en el salto correcto.';
    if (type === 'drop' && c.contact > 400) return `El contacto duró ${c.contact} ms. Un salto en profundidad reactivo dura menos de unos 250 ms: rebota más rápido o revisa las marcas.`;
    if (st.kind === 'vel10' && (c.t < 1.2 || c.t > 4)) return 'Ese tiempo no parece de 10 m (lo normal está entre 1.5 y 3 s). Revisa la velocidad del video y las marcas.';
    if (st.kind === 'agilidad' && (c.t < 7 || c.t > 20)) return 'Ese tiempo no parece de una prueba T (lo normal está entre 8 y 15 s). Revisa la velocidad del video y las marcas.';
    return null;
  };
  function drawMarks() {
    fill(marksBox, ...MARKS[G().type].map(([k, label, hint]) => h('div', { class: 'md-mark' },
      h('button', { type: 'button', class: `btn ${st.marks[k] != null ? 'ok' : 'primary'}`, 'data-mark': k, disabled: st.url ? null : true,
        onclick: () => { st.marks[k] = st.frame; drawMarks(); drawResult(); } }, ic(st.marks[k] != null ? 'check' : 'crosshair', 16), `${label}${st.marks[k] != null ? `: cuadro ${st.marks[k]}` : ''}`),
      st.marks[k] != null ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => seek(st.marks[k]) }, 'Ir') : null,
      h('span', { class: 'row-sub' }, hint))));
    showFrame();
  }
  function drawResult() {
    const c = calc(), type = G().type;
    if (!st.url) { fill(result, ); return; }
    if (!c) { fill(result, h('p', { class: 'row-sub', style: { margin: 0 } }, type === 'time' ? 'Marca la salida y la llegada.' : 'Marca el despegue y el aterrizaje.')); return; }
    if (c.needTouch) { fill(result, h('p', { class: 'row-sub', style: { margin: 0 } }, 'Marca también el contacto (cuando toca el piso al caer del cajón), antes del despegue.')); return; }
    const warn = sanity(c);
    const main = type === 'time'
      ? h('div', { class: 'md-big' }, h('b', {}, fmtS(c.t)), h('span', {}, `±${(c.err).toFixed(3)} s · un cuadro = ${(dtReal() * 1000).toFixed(1)} ms`))
      : h('div', { class: 'md-big' }, h('b', {}, `${c.value} cm`), h('span', {}, `Vuelo ${(c.t * 1000).toFixed(0)} ms · ±${c.err} cm por cuadro (${realFps()} cps)`));
    fill(result, main,
      type === 'drop' ? h('p', { style: { margin: 0 } }, `Contacto: ${c.contact} ms. Índice de fuerza reactiva: `, h('strong', {}, c.rsi != null ? String(c.rsi) : '—'), '.') : null,
      warn ? note(warn, 'warn') : null,
      h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn ball', onclick: () => {
        st.tries.push({ ...c, fps: realFps() }); st.marks = {}; drawMarks(); drawResult(); drawTries();
        toast(`Intento ${st.tries.length} guardado`);
      } }, ic('plus', 16), `Guardar intento ${st.tries.length + 1}`),
      h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { st.marks = {}; drawMarks(); drawResult(); } }, 'Borrar marcas')));
  }
  const bestOf = () => {
    if (!st.tries.length) return null;
    const time = G().type === 'time';
    return st.tries.reduce((a, b) => (time ? (b.t < a.t ? b : a) : (b.value > a.value ? b : a)));
  };
  function drawTries() {
    const time = G().type === 'time', b = bestOf();
    fill(triesBox, 
      st.tries.length ? h('div', { class: 'cluster' }, st.tries.map((x, i) => h('span', { class: `chip ${x === b ? 'ok' : ''}` },
        `${i + 1}: ${time ? fmtS(x.t) : `${x.value} cm`}${x.rsi ? ` · IFR ${x.rsi}` : ''}`,
        h('button', { type: 'button', class: 'chip-x', 'aria-label': `Quitar intento ${i + 1}`, onclick: () => { st.tries.splice(i, 1); drawTries(); } }, '×')))) : null,
      st.tries.length ? h('p', { style: { margin: 0 } }, 'Mejor: ', h('strong', {}, time ? fmtS(b.t) : `${b.value} cm`), b.rsi ? ` (índice de fuerza reactiva ${b.rsi}, contacto ${b.contact} ms)` : '', '.') : null);
    drawSave();
  }
  function drawSave() {
    const b = bestOf(), g = G(), time = g.type === 'time';
    if (!b) { fill(saveBox, ); return; }
    const text = `Medí con video en Remate: ${g.name}. Mejor: ${time ? fmtS(b.t) : `${b.value} cm`}${b.rsi ? `, índice de fuerza reactiva ${b.rsi}` : ''}. Intentos: ${st.tries.map((x) => (time ? x.t.toFixed(2) : x.value)).join(', ')}${time ? ' s' : ' cm'} (video a ${b.fps} cps).`;
    const coach = role === 'coach';
    const canLab = coach && g.lab && labReady();
    const ptKind = g.ptest && (g.ptest !== 'vel10' || torneosReady()) ? g.ptest : null;
    const canPlayer = coach && ptKind && teamReady() && players().length;
    fill(saveBox, sectionTitle('Guardar el resultado'),
      coach ? null : note('Tu entrenador guarda las pruebas. Mándale tu resultado y cómo lo mediste.'),
      h('div', { class: 'cluster' },
        canLab ? h('button', { type: 'button', class: 'btn primary', onclick: () => saveLab(b) }, ic('zap', 16), 'En mi laboratorio') : null,
        canPlayer ? h('button', { type: 'button', class: 'btn primary', onclick: () => savePlayer(b, ptKind) }, ic('user', 16), 'En las pruebas de un jugador') : null,
        h('button', { type: 'button', class: 'btn', onclick: () => shareText(text) }, ic('share-2', 16), coach ? 'Compartir' : 'Mandar a mi entrenador')),
      coach && g.lab && !labReady() ? note('Para guardar en tu laboratorio, primero corre el SQL del laboratorio (instalar.sql).', 'warn') : null);
  }
  function saveLab(b) {
    const g = G(), date = h('input', { type: 'date', max: todayStr(), value: todayStr() });
    const txt = h('input', { type: 'text', maxlength: 300, placeholder: 'Opcional', value: '' });
    const dropIn = h('input', { type: 'number', inputmode: 'numeric', min: 10, max: 80, step: 1, value: st.drop ?? '' });
    openSheet({ title: 'Guardar en mi laboratorio', body: h('div', { class: 'stack' },
      h('p', { style: { margin: 0 } }, `${g.name}: `, h('strong', {}, `${b.value} cm`), ` (mejor de ${plural(st.tries.length, 'intento', 'intentos')}).`),
      field('Fecha', date), g.type === 'drop' ? field('Altura del cajón (cm)', dropIn) : null, field('Nota', txt),
      sql37Ready() ? null : note('Se guarda con el método «Otro» porque tu base de datos todavía no tiene el SQL de la versión 3.7.', 'warn')),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      const d = g.type === 'drop' ? Math.round(Number(dropIn.value)) || null : null;
      if (d) st.drop = d;
      if (g.type === 'drop' && d != null && (d < 10 || d > 80)) { toast('La altura del cajón debe estar entre 10 y 80 cm'); return false; }
      add('jumpTests', { test_date: date.value || todayStr(), kind: g.lab, method: sql37Ready() ? 'remate' : 'otro', height_cm: b.value,
        attempts: st.tries.map((x) => x.value), touch_cm: null, contact_ms: g.type === 'drop' ? b.contact : null, drop_cm: d, body_kg: null,
        note: [txt.value.trim(), `Video a ${b.fps} cps`].filter(Boolean).join(' · ') });
      toast(`Guardado en tu laboratorio: ${b.value} cm`); return true;
    } }] });
  }
  function savePlayer(b, kind) {
    const list = players(), date = h('input', { type: 'date', max: todayStr(), value: todayStr() });
    const who = h('select', {}, options([['', 'Elige al jugador'], ...list.map((p) => [p.id, p.name])], ''));
    const d = PTESTS[kind], v = d.unit === 's' ? Math.round(b.t * 100) / 100 : b.value;
    openSheet({ title: `Guardar: ${d.name}`, body: h('div', { class: 'stack' },
      h('p', { style: { margin: 0 } }, 'Resultado: ', h('strong', {}, `${v} ${d.unit}`), '.'), field('Jugador', who), field('Fecha', date),
      st.kind !== 'cmj' && kind === 'cmj' ? note('Se guarda como «Salto vertical». Para comparar, mídelo siempre igual (manos en la cadera).', 'warn') : null),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      if (!who.value) { toast('Elige al jugador'); return false; }
      if (!(v >= d.min && v <= d.max)) { toast(`El resultado debe estar entre ${d.min} y ${d.max} ${d.unit}`); return false; }
      add('playerTests', { player_id: who.value, kind, value: v, test_date: date.value || todayStr(), note: `Video en Remate (${b.fps} cps)` });
      toast('Prueba guardada'); return true;
    } }] });
  }
  function drawHow() {
    const g = G();
    fill(howBox, h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, `Cómo hacer y grabar: ${g.short}`)),
      h('ol', { class: 'plain', style: { marginTop: '8px' } }, g.how.map((x) => h('li', {}, x))),
      h('p', { class: 'row-sub', style: { margin: '6px 0 0' } }, 'Errores comunes: ', g.errors.join(' '))));
  }
  function drawAll() { kindSel.value = st.kind; drawHow(); drawMarks(); drawResult(); drawTries(); }

  const el = h('div', { class: 'stack medir' },
    field('¿Qué vas a medir?', kindSel), howBox,
    h('div', { class: 'cluster' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => fileLib.click() }, ic('film', 18), 'Elegir video'),
      h('button', { type: 'button', class: 'btn', onclick: () => fileCam.click() }, ic('video', 18), 'Grabar ahora'), fileCam, fileLib),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Lo más preciso: graba con la cámara del celular en cámara lenta y luego toca «Elegir video». El video no se sube a ningún lado.'),
    stage,
    h('div', { class: 'md-bar' }, frameTxt, zoomBtn),
    scrub,
    h('div', { class: 'md-ctrl', role: 'group', 'aria-label': 'Mover cuadro por cuadro' },
      h('button', { type: 'button', class: 'btn', onclick: () => step(-10), 'aria-label': '10 cuadros atrás' }, '−10'),
      h('button', { type: 'button', class: 'btn', onclick: () => step(-1), 'aria-label': 'Un cuadro atrás' }, ic('chevron-left', 20)),
      h('button', { type: 'button', class: 'btn ball', onclick: playSlow, 'aria-label': 'Reproducir lento o pausar' }, ic('play', 18), 'Lento'),
      h('button', { type: 'button', class: 'btn', onclick: () => step(1), 'aria-label': 'Un cuadro adelante' }, ic('chevron-right', 20)),
      h('button', { type: 'button', class: 'btn', onclick: () => step(10), 'aria-label': '10 cuadros adelante' }, '+10')),
    h('div', { class: 'grid' }, field('Velocidad del video', speedSel, 'Si grabaste en cámara lenta y así se ve, elige cuántas veces más lento.'),
      field('Cuadros por segundo del archivo', fpsSel, 'Remate lo detecta solo. Cámbialo solo si sabes que es otro.')),
    sectionTitle('Marca los cuadros'), marksBox, result, triesBox, saveBox);
  drawFpsSel(); drawAll();
  const setKind = (k) => { if (!TEST_GUIDE[k] || k === st.kind) return; st.kind = k; st.marks = {}; st.tries = []; drawAll(); };
  return { el, st, video, setKind };
}

// ---------- guía ----------
function guide() {
  const t = 0.5, rows = [30, 60, 120, 240].map((f) => [f, heightErrorCm(t, 1 / f)]);
  return h('div', { class: 'stack' },
    h('section', { class: 'panel stack' }, h('h2', {}, 'Mide como My Jump, sin pagar'),
      h('p', { style: { margin: 0 } }, 'Apps como My Jump calculan el salto con el tiempo que pasas en el aire: marcas en el video el cuadro del despegue y el del aterrizaje, y con la física sale la altura. Remate hace exactamente eso con la cámara lenta de tu celular. Ese método está estudiado y es válido y confiable si se graba y se marca bien (ver fuentes).'),
      h('p', { style: { margin: 0 } }, h('strong', {}, 'Altura = g × t² ÷ 8'), ', donde g = 9.81 m/s² y t es el tiempo en el aire. Por ejemplo, 0.50 s en el aire = 30.7 cm.')),
    h('section', { class: 'stack' }, sectionTitle('Cómo grabar'), h('ol', { class: 'plain' }, FILM_TIPS.map((x) => h('li', {}, x)))),
    h('section', { class: 'stack' }, sectionTitle('Qué tan preciso es'),
      h('p', { style: { margin: 0 } }, 'Si marcas un cuadro antes o después, la altura cambia más o menos esto (en un salto de 0.5 s en el aire):'),
      h('div', { class: 'tablewrap' }, h('table', { class: 'stbl' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Video'), h('th', { scope: 'col' }, 'Un cuadro dura'), h('th', { scope: 'col' }, 'Error por cuadro'))),
        h('tbody', {}, rows.map(([f, e]) => h('tr', {}, h('th', { scope: 'row' }, `${f} cps${f >= 120 ? ' (cámara lenta)' : ''}`), h('td', {}, `${(1000 / f).toFixed(1)} ms`), h('td', {}, `±${e} cm`)))))),
      note('Por eso conviene la cámara lenta: a 240 cuadros por segundo el error es de medio centímetro; a 30, de unos 4 cm.')),
    h('section', { class: 'stack' }, sectionTitle('Las pruebas'),
      Object.values(TEST_GUIDE).map((g) => h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, g.name)),
        h('div', { class: 'stack', style: { marginTop: '8px' } },
          h('p', { style: { margin: 0 } }, h('strong', {}, 'Qué mide: '), g.what),
          h('div', {}, h('strong', {}, 'Cómo se hace'), h('ol', { class: 'plain' }, g.how.map((x) => h('li', {}, x)))),
          h('div', {}, h('strong', {}, 'Qué cuadros marcar'), h('ul', { class: 'plain' }, MARKS[g.type].map(([, l, d]) => h('li', {}, `${l}: ${d.charAt(0).toLowerCase()}${d.slice(1)}`)))),
          h('div', {}, h('strong', {}, 'Errores comunes'), h('ul', { class: 'plain' }, g.errors.map((x) => h('li', {}, x)))),
          g.type === 'drop' ? h('p', { style: { margin: 0 } }, 'Índice de fuerza reactiva = altura del rebote (en metros) ÷ tiempo de contacto (en segundos). Por ejemplo, 0.30 m ÷ 0.20 s = 1.5. Compáralo contigo mismo, siempre desde el mismo cajón.') : null,
          h('p', { class: 'row-sub', style: { margin: 0 } }, [g.lab ? 'Se guarda en el laboratorio del entrenador' : null, g.ptest ? `en las pruebas físicas de un jugador («${PTESTS[g.ptest].name}»)` : null].filter(Boolean).join(' o ') + '.'))))),
    h('section', { class: 'stack' }, sectionTitle('Otras pruebas que ya tiene Remate'),
      h('ul', { class: 'plain' },
        h('li', {}, 'Marca en la pared (Sargent): con tiza, salta junto a una pared y resta tu alcance de pie. En Laboratorio > Registrar prueba.'),
        h('li', {}, 'Alcance de remate, plancha y estatura: en Pruebas físicas de cada jugador.'),
        h('li', {}, 'Para cualquier prueba: mismo piso, mismos tenis, misma hora y mismo calentamiento. Compara a cada quien consigo mismo.'))),
    h('section', { class: 'stack' }, sectionTitle('Fuentes'),
      h('ul', { class: 'plain sources' }, MEDIR_SOURCES.map(([t, u]) => h('li', {}, t, ' ', h('a', { href: u, target: '_blank', rel: 'noopener' }, 'Ver fuente'))))));
}

export default function medir(ctx) {
  const ui = ctx.ui; ui.tab ||= ctx.args.includes('guia') ? 'guia' : 'medir';
  if (!W || W.role !== ctx.role) W = { role: ctx.role, ...bench(ctx.role) };
  // #/medir/<prueba>/<de dónde vienes>: abre con esa prueba elegida.
  if (ctx.args[0] && !ui.kindSet) { ui.kindSet = true; W.setKind(ctx.args[0]); }
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, [['medir', 'Medir'], ['guia', 'Guía de pruebas']].map(([id, label]) =>
    h('button', { type: 'button', role: 'tab', 'aria-selected': ui.tab === id ? 'true' : 'false', onclick: () => { ui.tab = id; ctx.rerender(); } }, label)));
  const from = ctx.args[1] || ctx.args[0];
  const back = from === 'jugadores' ? '#/jugadores' : from === 'pruebas' || ctx.role !== 'coach' ? '#/pruebas' : from === 'mas' ? '#/mas' : '#/lab/salto';
  return { title: 'Medir con video', sub: 'Cuadro por cuadro, sin apps de paga', back, el: h('div', { class: 'page' }, tabs, ui.tab === 'guia' ? guide() : W.el) };
}
