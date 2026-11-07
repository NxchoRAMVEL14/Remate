// Modo activo (v3.20): la sesión a pantalla completa. El ejercicio en grande con su dibujo, el tiempo, y solo va
// pasando de ejercicio a descanso y de descanso al siguiente. Tiene pausa, regresar y saltar; se pueden cambiar series,
// repeticiones y kilos sobre la marcha. Pita, vibra, dice en voz lo que sigue y deja la pantalla encendida.
// Lo que haces se va anotando en el registro de la sesión (el mismo borrador de «Registrar»): al terminar solo revisas y guardas.
import { h, ic, toast, confirmSheet, plural, openSheet } from '../util.js';
import { buildCircuit, CIRCUIT_LEVELS, CIRCUIT_MINUTES } from '../content/gym.js';
import { figure } from '../figura.js';
import { figFor } from '../content/movimientos.js';

const LS_SOUND = 'remate.activo.sonido', LS_AUTO = 'remate.activo.auto', LS_VOICE = 'remate.activo.voz';
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const TEMPO = 3;          // segundos por repetición para el avance automático
const PREP = 5;                  // «prepárate» al empezar cada ejercicio
const firstNum = (x) => { const m = String(x ?? '').match(/\d+/); return m ? Number(m[0]) : null; };

// opts:
//   title       nombre de la sesión
//   entries     las del borrador: [{ ex, s: [[kg, reps], …], rx? }] (se modifican aquí)
//   byId        ejercicios por id
//   rxOf(e)     dosis del ejercicio (sets, reps, rest)
//   persist()   guarda el borrador
//   circuit     { work, rest, rounds, roundRest } para el circuito exprés (todo por tiempo)
//   onClose(r)  al salir: r = { done, secs }
export function openActive({ title = 'Sesión', entries, byId, rxOf, persist = () => {}, circuit = null, onClose = () => {} }) {
  if (!entries?.length) { toast('Agrega por lo menos un ejercicio'); return; }
  const returnTo = document.activeElement, root = document.getElementById('root');
  let sound = lsGet(LS_SOUND, '1') !== '0', voice = lsGet(LS_VOICE, '1') !== '0', auto = lsGet(LS_AUTO, '1') !== '0';
  let steps = [], idx = 0, phase = 'prep', left = PREP, total = 0, running = true, last = 0, raf = 0, wake = null, audio = null;
  let started = Date.now(), spent = 0, beepedAt = -1, finished = false;

  // ---------- los pasos: trabajo y descanso ----------
  const timed = (ex) => !!circuit || ex?.unit === 's';
  function workSecs(st) {
    const e = entries[st.k], ex = byId[e.ex], rx = rxOf(e) || {};
    if (circuit) return circuit.work;
    if (ex?.unit === 's') return firstNum(e.s[st.i]?.[1]) || firstNum(rx.reps) || 30;
    const reps = firstNum(e.s[st.i]?.[1]) || firstNum(rx.reps) || 10;
    return Math.max(15, reps * TEMPO * (ex?.side ? 2 : 1));
  }
  function build() {
    const out = [];
    if (circuit) {
      for (let r = 0; r < circuit.rounds; r++) entries.forEach((e, k) => {
        out.push({ k, i: r, round: r, kind: 'work' });
        const lastOfRound = k === entries.length - 1;
        if (!(lastOfRound && r === circuit.rounds - 1)) out.push({ k, i: r, round: r, kind: 'rest', secs: lastOfRound ? circuit.roundRest : circuit.rest, roundEnd: lastOfRound });
      });
    } else {
      entries.forEach((e, k) => {
        const rx = rxOf(e) || {};
        e.s.forEach((_, i) => {
          out.push({ k, i, kind: 'work' });
          const lastAll = k === entries.length - 1 && i === e.s.length - 1;
          if (!lastAll) out.push({ k, i, kind: 'rest', secs: Number(rx.rest) || 60 });
        });
      });
    }
    return out;
  }
  steps = build();
  // Las series de circuito van en el registro como una serie por ronda.
  if (circuit) entries.forEach((e) => { while (e.s.length < circuit.rounds) e.s.push(['', '']); });

  // ---------- pantalla ----------
  const prog = h('span', { class: 'act-prog' });
  const bar = h('i'), barWrap = h('div', { class: 'act-bar', 'aria-hidden': 'true' }, bar);
  const phaseEl = h('div', { class: 'act-phase', 'aria-live': 'polite' });
  const nameEl = h('h2', { class: 'act-name' });
  const figBox = h('div', { class: 'act-fig' });
  const clock = h('div', { class: 'act-time', role: 'timer' });
  const target = h('div', { class: 'act-target' });
  const cue = h('p', { class: 'act-cue' });
  const nextEl = h('div', { class: 'act-next' });
  const playBtn = h('button', { type: 'button', class: 'act-play', 'aria-label': 'Pausa', onclick: () => toggle() });
  const doneBtn = h('button', { type: 'button', class: 'btn ball act-done', onclick: () => finishStep() }, ic('check', 20), 'Terminé');
  const soundBtn = h('button', { type: 'button', class: 'iconbtn', onclick: () => { sound = !sound; voice = sound; lsSet(LS_SOUND, sound ? '1' : '0'); lsSet(LS_VOICE, voice ? '1' : '0'); paintTop(); if (!sound) speechSynthesis?.cancel?.(); } });
  const closeBtn = h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Salir del modo activo', onclick: () => close() }, ic('x', 26));
  const ctrl = h('div', { class: 'act-ctrl' },
    h('button', { type: 'button', class: 'act-btn', 'aria-label': 'Anterior', onclick: () => go(idx - 1, true) }, ic('skip-back', 26)),
    playBtn,
    h('button', { type: 'button', class: 'act-btn', 'aria-label': 'Saltar', onclick: () => go(idx + 1, true) }, ic('skip-forward', 26)));
  const extra = h('div', { class: 'act-extra' });
  const ov = h('div', { class: 'act', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Modo activo: ${title}` },
    h('div', { class: 'act-top' }, prog, h('span', { class: 'cluster', style: { gap: '4px', flexWrap: 'nowrap' } }, soundBtn, closeBtn)),
    barWrap,
    h('div', { class: 'act-main' }, phaseEl, nameEl, figBox, clock, target, doneBtn, cue, nextEl),
    ctrl, extra);

  function paintTop() {
    soundBtn.replaceChildren(ic(sound ? 'volume-2' : 'volume-x', 24));
    soundBtn.setAttribute('aria-label', sound ? 'Quitar el sonido y la voz' : 'Poner el sonido y la voz');
  }
  const exOf = (st) => byId[entries[st.k]?.ex];
  let figKey = '';
  function setFig(ex) {
    const key = ex?.id || '';
    if (key === figKey) return;
    figKey = key;
    const mv = ex ? figFor(ex) : [];
    figBox.replaceChildren(mv.length ? figure(mv, { size: 'lg', label: ex.name }) : h('div', { class: 'act-nofig' }, ic('dumbbell', 64)));
  }
  const stepper = (label, value, onMinus, onPlus, unit = '') => h('div', { class: 'act-step' },
    h('button', { type: 'button', class: 'act-sbtn', 'aria-label': `Menos ${label}`, onclick: onMinus }, ic('minus', 22)),
    h('span', { class: 'act-sval' }, h('strong', {}, String(value)), h('small', {}, unit || label)),
    h('button', { type: 'button', class: 'act-sbtn', 'aria-label': `Más ${label}`, onclick: onPlus }, ic('plus', 22)));
  // Lo que se anota de una serie: repeticiones (o segundos) y kilos.
  const repsOf = (st) => { const e = entries[st.k], rx = rxOf(e) || {}; return firstNum(e.s[st.i]?.[1]) ?? (circuit && byId[e.ex]?.unit === 's' ? circuit.work : firstNum(rx.reps)) ?? 10; };
  const setReps = (st, n) => { const e = entries[st.k]; e.s[st.i] = e.s[st.i] || ['', '']; e.s[st.i][1] = String(Math.max(1, Math.min(600, n))); persist(); };
  const kgOf = (st) => { const e = entries[st.k]; return e.s[st.i]?.[0] ?? ''; };
  const setKg = (st, v) => { const e = entries[st.k]; e.s[st.i] = e.s[st.i] || ['', '']; e.s[st.i][0] = v; for (let j = st.i + 1; j < e.s.length; j++) if (e.s[j][0] === '' || e.s[j][0] == null) e.s[j][0] = v; persist(); };
  function kgBox(st, label = 'Kilos') {
    const ex = exOf(st); if (!ex || ex.unit !== 'kg' || circuit) return null;
    const inp = h('input', { type: 'number', inputmode: 'decimal', min: 0, max: 500, step: 0.5, value: kgOf(st), 'aria-label': `${label} de ${ex.name}`, class: 'act-kg',
      oninput: (e) => setKg(st, e.target.value) });
    return h('label', { class: 'act-kgl' }, inp, h('small', {}, ex.each ? 'kg c/u' : 'kg'));
  }
  function setsBox(st) {
    if (circuit) return null;
    const e = entries[st.k];
    return stepper('series', e.s.length, () => changeSets(st, -1), () => changeSets(st, 1), plural(e.s.length, 'serie', 'series').replace(/^\d+ /, ''));
  }
  function changeSets(st, d) {
    const e = entries[st.k], n = e.s.length + d;
    if (n < 1 || n > 8) return;
    if (d > 0) e.s.push([e.s[e.s.length - 1]?.[0] ?? '', '']); else { if (st.i >= n) { toast('Ya vas en la última serie'); return; } e.s.pop(); }
    persist();
    const cur = steps[idx]; steps = build();
    idx = Math.max(0, steps.findIndex((x) => x.k === cur.k && x.i === cur.i && x.kind === cur.kind));
    paint(); toast(`${byId[e.ex]?.name}: ${plural(n, 'serie', 'series')}`);
  }

  function paint() {
    const st = steps[idx];
    if (!st) return;
    const ex = exOf(st), e = entries[st.k], rx = rxOf(e) || {};
    const exNum = st.k + 1, setNum = st.i + 1, nSets = circuit ? circuit.rounds : e.s.length;
    prog.textContent = circuit ? `Ronda ${st.round + 1} de ${circuit.rounds} · estación ${exNum} de ${entries.length}` : `Ejercicio ${exNum} de ${entries.length} · serie ${setNum} de ${nSets}`;
    const doneW = steps.slice(0, idx).filter((x) => x.kind === 'work').length, allW = steps.filter((x) => x.kind === 'work').length;
    bar.style.width = `${Math.round((doneW / Math.max(1, allW)) * 100)}%`;
    ov.dataset.phase = phase;
    playBtn.replaceChildren(ic(running ? 'pause' : 'play', 36)); playBtn.setAttribute('aria-label', running ? 'Pausa' : 'Seguir');
    ov.classList.toggle('paused', !running);
    if (phase === 'rest') {
      const nx = steps[idx + 1], nex = nx ? exOf(nx) : null;
      phaseEl.textContent = st.roundEnd ? `Descanso entre rondas · ${running ? 'respira' : 'en pausa'}` : running ? 'Descanso' : 'Descanso · en pausa';
      nameEl.textContent = nex ? `Sigue: ${nex.name}` : 'Último esfuerzo';
      setFig(nex);
      // Lo que acabas de hacer (para corregirlo) y lo que sigue.
      const prevEx = ex, unitTxt = prevEx?.unit === 's' || circuit && prevEx?.unit !== 'pc' ? 's' : prevEx?.repsLabel?.toLowerCase() || 'reps';
      target.replaceChildren(
        h('div', { class: 'act-row' }, h('span', { class: 'act-lbl' }, circuit ? `Hiciste (${prevEx?.name || ''})` : `Serie ${setNum}: hiciste`),
          stepper('repeticiones', repsOf(st), () => { setReps(st, repsOf(st) - 1); paint(); }, () => { setReps(st, repsOf(st) + 1); paint(); }, unitTxt), kgBox(st)),
        h('div', { class: 'act-row' }, stepper('15 segundos de descanso', '15 s', () => adjust(-15), () => adjust(15), 'descanso')));
      doneBtn.hidden = false; doneBtn.replaceChildren(ic('skip-forward', 20), 'Ya estoy listo');
      const tipRx = nx ? rxOf(entries[nx.k]) || {} : null;
      cue.textContent = nx ? (circuit ? `${circuit.work} s${nex?.side ? ' (cambia de lado a la mitad)' : ''}` : `${nex?.unit === 's' ? `${repsOf(nx)} s` : `${repsOf(nx)} ${nex?.repsLabel?.toLowerCase() || 'repeticiones'}${nex?.side ? ' por lado' : ''}`}${tipRx?.rir != null ? ` · que te sobren ${tipRx.rir}` : ''}`) : '';
      nextEl.textContent = nx && nex?.cues?.length ? nex.cues.join(' · ') : '';
    } else {
      phaseEl.textContent = phase === 'prep' ? (running ? 'Prepárate' : 'Prepárate · en pausa') : running ? (timed(ex) ? '¡Dale!' : auto ? '¡Dale! (avanza solo)' : '¡Dale!') : 'En pausa';
      nameEl.textContent = ex?.name || 'Ejercicio';
      setFig(ex);
      const isTime = timed(ex);
      target.replaceChildren(
        h('div', { class: 'act-row' }, circuit ? h('span', { class: 'act-step act-fixed' }, h('span', { class: 'act-sval' }, h('strong', {}, `${circuit.work} s`), h('small', {}, ex?.side ? 'cambia de lado a la mitad' : 'de trabajo'))) : isTime
          ? stepper('segundos', circuit ? circuit.work : repsOf(st), () => { if (!circuit) { setReps(st, repsOf(st) - 5); resetWork(); } }, () => { if (!circuit) { setReps(st, repsOf(st) + 5); resetWork(); } }, `segundos${ex?.side ? ' (cambia de lado a la mitad)' : ''}`)
          : stepper('repeticiones', repsOf(st), () => { setReps(st, repsOf(st) - 1); resetWork(); }, () => { setReps(st, repsOf(st) + 1); resetWork(); }, `${ex?.repsLabel?.toLowerCase() || 'reps'}${ex?.side ? ' por lado' : ''}`),
        kgBox(st), setsBox(st)));
      doneBtn.hidden = phase === 'prep' ? true : false;
      doneBtn.replaceChildren(ic('check', 20), isTime ? 'Terminé antes' : 'Terminé la serie');
      cue.textContent = ex?.cues?.join(' · ') || '';
      const nx = steps.slice(idx + 1).find((x) => x.kind === 'work');
      nextEl.textContent = nx ? `Luego: ${exOf(nx)?.name || ''}${nx.k === st.k && !circuit ? `, serie ${nx.i + 1}` : ''}` : 'Es el último. ¡Con todo!';
    }
    clock.textContent = fmt(left);
    clock.classList.toggle('low', left <= 3 && phase !== 'work' ? true : left <= 3 && timed(ex));
    paintExtra();
  }
  function paintExtra() {
    extra.replaceChildren(
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: auto ? true : null, onchange: (e) => { auto = e.target.checked; lsSet(LS_AUTO, auto ? '1' : '0'); paint(); } }),
        h('span', {}, `Avance solo en repeticiones (${TEMPO} s cada una)`)),
      h('span', { class: 'act-elapsed' }, `Llevas ${fmt(spent / 1000)}`));
  }

  // ---------- reloj ----------
  function resetWork() { const st = steps[idx]; if (st?.kind === 'work' && phase === 'work') { left = workSecs(st); total = left; beepedAt = -1; } paint(); }
  function enter(i, { prep = false } = {}) {
    idx = Math.max(0, Math.min(steps.length - 1, i));
    const st = steps[idx];
    if (st.kind === 'rest') { phase = 'rest'; left = st.secs; }
    else if (prep) { phase = 'prep'; left = PREP; }
    else { phase = 'work'; left = workSecs(st); }
    total = left; beepedAt = -1;
    paint();
    announce();
  }
  function announce() {
    const st = steps[idx]; if (!st) return;
    const ex = exOf(st);
    if (phase === 'prep') say(`${ex?.name}. ${circuit ? `${circuit.work} segundos` : timed(ex) ? `${repsOf(st)} segundos` : `${repsOf(st)} repeticiones`}${ex?.side && !timed(ex) ? ' por lado' : ''}`);
    else if (phase === 'work') say(circuit || st.i === 0 ? '¡Dale!' : `Serie ${st.i + 1}. ¡Dale!`);
    else if (phase === 'rest') { const nx = steps[idx + 1]; say(st.roundEnd ? `Ronda terminada. Descanso de ${st.secs} segundos` : nx ? `Descanso. Sigue ${exOf(nx)?.name}` : 'Descanso'); }
  }
  function finishStep() {
    const st = steps[idx]; if (!st) return;
    if (phase === 'prep') { phase = 'work'; left = workSecs(st); total = left; paint(); announce(); return; }
    if (phase === 'work') {
      // Se anota lo hecho: en tiempo, los segundos que llevabas (o todos); en repeticiones, las que marcaste.
      const ex = exOf(st);
      if (timed(ex)) { const did = Math.round(total - Math.max(0, left)); const e = entries[st.k]; if (!circuit || ex?.unit === 's') setReps(st, Math.max(1, did)); else if (!firstNum(e.s[st.i]?.[1])) setReps(st, Math.max(1, Math.round(did / TEMPO))); }
      else setReps(st, repsOf(st));
      chirp();
    }
    next();
  }
  function next() {
    if (idx >= steps.length - 1) { done(); return; }
    const cur = steps[idx], nx = steps[idx + 1];
    // Al cambiar de ejercicio (después del descanso), unos segundos para acomodarte.
    const newEx = cur.kind === 'rest' && nx.kind === 'work' && (circuit ? false : nx.k !== steps.slice(0, idx).reverse().find((x) => x.kind === 'work')?.k);
    enter(idx + 1, { prep: newEx });
  }
  function go(i, manual = false) {
    if (i < 0) { enter(0, { prep: true }); return; }
    if (i >= steps.length) { done(); return; }
    enter(i, { prep: manual && steps[i].kind === 'work' && !circuit && (steps[i].i === 0) });
  }
  function adjust(d) { if (phase !== 'rest') return; left = Math.max(5, left + d); total = Math.max(total, left); paint(); }
  function tick(now) {
    raf = 0;
    if (finished) return;
    const dt = last ? Math.min(1000, now - last) : 0; last = now;
    if (running) {
      spent += dt;
      left -= dt / 1000;
      const st = steps[idx], ex = st ? exOf(st) : null;
      const counts = phase === 'rest' || phase === 'prep' || timed(ex) || auto;
      const s = Math.ceil(left);
      if (counts && s <= 3 && s >= 1 && s !== beepedAt) { beepedAt = s; tickBeep(); }
      if (left <= 0) {
        if (phase === 'work' && !timed(ex) && !auto) left = 0;       // en repeticiones sin avance solo: espera a «Terminé»
        else if (phase === 'work') { finishStep(); }
        else { beep(); if (phase === 'prep') { phase = 'work'; left = workSecs(st); total = left; beepedAt = -1; paint(); announce(); } else next(); }
      }
      clock.textContent = fmt(left);
      clock.classList.toggle('low', s <= 3 && counts);
      if (Math.floor(spent / 1000) !== Math.floor((spent - dt) / 1000)) extra.querySelector('.act-elapsed')?.replaceChildren(`Llevas ${fmt(spent / 1000)}`);
    }
    raf = requestAnimationFrame(tick);
  }
  function toggle() { running = !running; last = 0; if (running) { keepAwake(); say('Seguimos'); } paint(); }

  // ---------- sonido, voz, vibración y pantalla ----------
  function tone(freq, dur, at = 0, vol = 0.35) {
    if (!sound) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + at;
      o.frequency.value = freq; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.02);
    } catch { /* sin audio */ }
  }
  function tickBeep() { tone(660, 0.12, 0, 0.25); try { navigator.vibrate?.(60); } catch { /* sin vibración */ } }
  function beep() { tone(880, 0.22); tone(1175, 0.3, 0.22); try { navigator.vibrate?.([200, 100, 200]); } catch { /* sin vibración */ } }
  function chirp() { tone(988, 0.18); try { navigator.vibrate?.(120); } catch { /* sin vibración */ } }
  let esVoice = null;
  function say(text) {
    if (!voice || !text || !('speechSynthesis' in window)) return;
    try {
      esVoice ??= speechSynthesis.getVoices().find((v) => /^es[-_]MX/i.test(v.lang)) || speechSynthesis.getVoices().find((v) => /^es/i.test(v.lang)) || null;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = esVoice?.lang || 'es-MX'; if (esVoice) u.voice = esVoice; u.rate = 1.05;
      speechSynthesis.speak(u);
    } catch { /* sin voz */ }
  }
  async function keepAwake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener?.('release', () => { wake = null; }); } } catch { /* no disponible */ } }
  const onVis = () => { if (document.visibilityState === 'visible') { last = 0; keepAwake(); } };
  const onKey = (e) => { if (e.key === 'Escape') close(); else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); toggle(); } };
  const onHash = () => { if (ov.isConnected) close(true, true); };   // si cambias de pantalla, se cierra (lo hecho se queda anotado)

  // ---------- fin ----------
  function done() {
    finished = true; running = false;
    cancelAnimationFrame(raf);
    beep(); say('¡Terminaste! Muy bien.');
    const sets = entries.reduce((a, e) => a + e.s.filter((x) => firstNum(x[1])).length, 0);
    ov.dataset.phase = 'done';
    ov.replaceChildren(
      h('div', { class: 'act-top' }, h('span', { class: 'act-prog' }, title), closeBtn),
      h('div', { class: 'act-main act-end' },
        h('div', { class: 'act-trophy', 'aria-hidden': 'true' }, ic('trophy', 72)),
        h('h2', { class: 'act-name' }, '¡Terminaste!'),
        h('p', { class: 'act-cue' }, `${fmt(spent / 1000)} de trabajo · ${plural(sets, 'serie anotada', 'series anotadas')}${circuit ? ` · ${plural(circuit.rounds, 'ronda', 'rondas')}` : ''}`),
        h('p', { class: 'act-next' }, 'Todo quedó anotado. Revisa los números, di qué tan pesada fue y toca «Guardar sesión».'),
        h('button', { type: 'button', class: 'btn ball act-done', onclick: () => close(true) }, ic('check', 20), 'Revisar y guardar')));
  }
  async function close(fromDone = false, quiet = false) {
    if (!ov.isConnected) return;
    if (!fromDone && !finished && !quiet) {
      const was = running; running = false; paint();
      const ok = await confirmSheet({ title: '¿Salir del modo activo?', text: 'Lo que llevas se queda anotado en el registro de la sesión. Puedes volver a entrar cuando quieras.', ok: 'Salir' });
      if (!ok) { running = was; last = 0; paint(); return; }
    }
    finished = true; cancelAnimationFrame(raf);
    try { speechSynthesis?.cancel?.(); } catch { /* nada */ }
    try { wake?.release?.(); } catch { /* nada */ }
    try { audio?.close?.(); } catch { /* nada */ }
    document.removeEventListener('visibilitychange', onVis); document.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', onHash);
    try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch { /* nada */ }
    ov.remove(); if (root) root.inert = false; document.body.classList.remove('act-on');
    try { returnTo?.focus(); } catch { /* nada */ }
    persist();
    if (!quiet) onClose({ done: fromDone, secs: Math.round(spent / 1000) }); else onClose({ done: false, secs: Math.round(spent / 1000), quiet: true });
  }

  paintTop();
  document.body.append(ov); document.body.classList.add('act-on'); if (root) root.inert = true;
  document.addEventListener('visibilitychange', onVis); document.addEventListener('keydown', onKey); window.addEventListener('hashchange', onHash);
  try { ov.requestFullscreen?.().catch(() => {}); } catch { /* sin pantalla completa */ }
  keepAwake();
  started = Date.now();
  enter(0, { prep: true });
  raf = requestAnimationFrame(tick);
  playBtn.focus();
  return { close };
}

// Botón grande para entrar.
export const activeButton = (onClick, label = 'Modo activo') => h('button', { type: 'button', class: 'btn ball act-launch', onclick: onClick }, ic('play', 18), label);

// v3.20: circuito exprés con tu peso (para los días que no llegas al gym).
export function circuitSheet({ tierMax, places, defPlace, ok, byId, onStart }) {
  const st = { place: defPlace, minutes: 20, level: 'normal' };
  const prev = h('div', { class: 'stack' });
  let cur = null;
  const seg = (label, list, key) => h('div', { class: 'field' }, h('span', { class: 'label' }, label), h('div', { class: 'seg', role: 'group', 'aria-label': label },
    list.map(([k, t]) => h('button', { type: 'button', 'aria-pressed': String(st[key]) === String(k) ? 'true' : 'false', onclick: (e) => { st[key] = typeof st[key] === 'number' ? Number(k) : k; [...e.currentTarget.parentNode.children].forEach((b) => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false')); paint(true); } }, t))));
  const paint = (fresh = false) => {
    if (fresh || !cur) cur = buildCircuit({ ok: (id) => ok(id, st.place), tierMax, minutes: st.minutes, level: st.level, seed: Math.floor(Math.random() * 1e9), byId });
    const c = cur, mins = Math.round((c.rounds * (c.items.length * (c.work + c.rest) - c.rest) + (c.rounds - 1) * c.roundRest) / 60);
    prev.replaceChildren(
      h('strong', {}, `${plural(c.rounds, 'ronda', 'rondas')} de ${c.items.length} estaciones · ${c.work} s de trabajo y ${c.rest} s de descanso · ≈ ${mins} min`),
      h('ol', { class: 'plain act-list' }, c.items.map((id) => h('li', {}, h('strong', {}, byId[id].name), h('span', { class: 'row-sub' }, ` · ${byId[id].body}`)))),
      h('p', { class: 'row-sub', style: { margin: 0 } }, `Entre rondas, ${c.roundRest} s para respirar. Calienta 5 minutos antes (trote suave, círculos de brazos y sentadillas lentas).`));
  };
  paint(true);
  let sh;
  sh = openSheet({ title: 'Circuito exprés', body: h('div', { class: 'stack' },
    h('p', { style: { margin: 0 } }, 'Con tu peso, por tiempo y sin pensar: Remate arma las estaciones, cuenta el trabajo y el descanso y te va diciendo qué sigue.'),
    seg('¿Dónde?', places, 'place'),
    seg('¿Cuánto tiempo tienes?', CIRCUIT_MINUTES.map((m) => [m, `${m} min`]), 'minutes'),
    seg('¿Qué tan fuerte?', Object.entries(CIRCUIT_LEVELS).map(([k, [t, w, r]]) => [k, `${t} ${w}/${r}`]), 'level'),
    prev,
    h('div', { class: 'cluster' },
      h('button', { type: 'button', class: 'btn', onclick: () => paint(true) }, ic('shuffle', 18), 'Otros ejercicios'),
      h('button', { type: 'button', class: 'btn ball', onclick: () => { if (!cur.items.length) { toast('No hay ejercicios para ese lugar'); return; } sh?.close(); onStart(cur, st.place); } }, ic('play', 18), 'Empezar'))) });
}
export function circuitDraft(c, base) {
  return { ...base, key: 'L', name: 'Circuito exprés', circuit: { work: c.work, rest: c.rest, rounds: c.rounds, roundRest: c.roundRest }, note: `Circuito exprés: ${c.rounds} rondas, ${c.work} s / ${c.rest} s`,
    entries: c.items.map((id) => ({ ex: id, rx: { ex: id, role: 'core', sets: c.rounds, reps: `${c.work} s`, rir: null, rest: c.rest }, s: Array.from({ length: c.rounds }, () => ['', '']) })) };
}
