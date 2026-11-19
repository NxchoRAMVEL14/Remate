// Remate Fit · Cardio (v3.25): qué te sirve, tus zonas de esfuerzo, tu semana de cardio según tu objetivo y tu rutina,
// un cronómetro de intervalos y el «Cardio de hoy». Lo que anotas se guarda como el cardio del día (fit_logs «steps»: cmin y ctipo),
// así que no necesita nada nuevo en la nube.
import { h, ic, toast, confirmSheet, openSheet, todayStr, addDays } from '../util.js';
import { ageFrom } from '../calc.js';
import { note, field, options } from './ui.js';
import { ZONES, ZONE_BY, zoneBpm, hrMax, KINDS, KIND_BY, SESSIONS, GOAL_CARDIO, VB_MIN, cardioWeek, CARDIO_RULES, TIMER_PRESETS, CARDIO_SOURCES } from '../content/cardio.js';
import { CARDIO_TYPES, activitySheet } from './fit-bascula.js';

const WD_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WD_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const link = (href, text) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text);
const kindName = (s) => SESSIONS[s].kinds.map((k) => KIND_BY[k]?.name.toLowerCase()).filter(Boolean).slice(0, 2).join(' o ');
const itemText = (it) => `${it.min} min · ${SESSIONS[it.s].name}${it.after ? ', después de las pesas' : ''}`;

// La edad para las zonas: la de tu ficha o la que escribas aquí (se guarda en tu perfil Fit).
const ageOf = (me, spec) => ageFrom(me.birth_date) || (Number(spec.cAge) >= 14 ? Number(spec.cAge) : null);

// Lo que dice el plan para hoy (o null).
export function cardioFor(spec, r, vbWd, wd) {
  const plan = cardioWeek({ goal: spec.goal, days: r.days, vbWd, vbDays: vbWd.length || 0 });
  return plan ? plan.week.find((d) => d.wd === wd) || null : null;
}
// «Cardio de hoy» para la pestaña Hoy.
export function cardioTodayCard(spec, r, vbWd, wd, canEdit) {
  const d = cardioFor(spec, r, vbWd, wd);
  if (!d) return null;
  const it = d.items[0];
  return h('section', { class: 'panel stack cd-today' },
    h('div', { class: 'split' }, h('h3', {}, 'Cardio de hoy'), it ? h('span', { class: `chip cd-${SESSIONS[it.s].zone}` }, ZONE_BY[SESSIONS[it.s].zone][1].split(' · ')[0]) : null),
    it ? h('p', { style: { margin: 0 } }, h('strong', {}, itemText(it)), `. ${SESSIONS[it.s].text} Sugerido: ${kindName(it.s)}.`)
      : h('p', { style: { margin: 0 } }, d.vb ? 'Hoy tienes voleibol: ese es tu cardio.' : 'Hoy no toca cardio: descansa o camina para sumar pasos.'),
    h('div', { class: 'cluster' },
      it && canEdit && (it.s === 'hiit' || it.s === 'sprint') ? h('button', { type: 'button', class: 'btn sm', onclick: () => openTimer(TIMER_PRESETS.find((p) => p.id === (it.s === 'sprint' ? 'sprints' : 'hiit30')), {}) }, ic('timer', 16), 'Cronómetro') : null,
      h('a', { class: 'btn sm ghost', href: '#/fit/cardio' }, ic('heart-pulse', 16), 'Ver mi semana de cardio')));
}

export function cardioTab(ctx, me, canEdit, { spec, r, vbWd, vbDays, saveProf, saveActivity, activityOf, fitLogsOf }) {
  const today = todayStr(), from = addDays(today, -6);
  const logs = fitLogsOf(me.id, 'steps').filter((l) => l.day >= from && l.day <= today);
  const mins = logs.reduce((a, l) => a + (Number(l.data?.cmin) || 0), 0);
  const pts = logs.reduce((a, l) => a + (Number(l.data?.pc) || 0), 0);
  const g = GOAL_CARDIO[spec.goal] || GOAL_CARDIO.salud;
  const plan = cardioWeek({ goal: spec.goal, days: r.days, vbWd, vbDays });
  const vbMin = vbDays * VB_MIN;
  const week = mins + vbMin;
  const age = ageOf(me, spec), max = hrMax(age);
  const wdToday = new Date(`${today}T12:00:00`).getDay();
  const logBtn = canEdit ? h('button', { type: 'button', class: 'btn', onclick: () => activitySheet({ day: today, cur: (d) => activityOf(me.id, d), title: 'Anotar cardio', onSave: (d, data) => { saveActivity(me.id, d, data); toast('Cardio guardado'); } }) }, ic('plus', 18), 'Anotar cardio') : null;

  const ageIn = h('input', { type: 'number', min: 14, max: 90, inputmode: 'numeric', value: age ?? '', placeholder: 'Edad', 'aria-label': 'Tu edad' });
  const zones = h('div', { class: 'cd-zones' }, ZONES.map(([k, name, pct, talk, rpe, what]) => {
    const bpm = zoneBpm(max, pct);
    return h('div', { class: `cd-zone cd-${k}` },
      h('div', { class: 'split' }, h('strong', {}, name), h('span', { class: 'cd-bpm' }, bpm ? `${bpm[0]}–${bpm[1]} lpm` : `${pct[0]}–${pct[1]}%`)),
      h('div', { class: 'row-sub' }, `${talk} Esfuerzo ${rpe} de 10.`),
      h('div', {}, what));
  }));

  return h('div', { class: 'stack' },
    h('section', { class: 'band next fit-band' },
      h('div', { class: 'when' }, 'Cardio · últimos 7 días'),
      h('h2', {}, `${mins} min de cardio${vbDays ? ` + ${vbMin} de voleibol` : ''}`),
      h('div', {}, `La OMS recomienda de 150 a 300 minutos de actividad moderada por semana. Llevas ≈ ${week}${pts ? ` (y ${pts} puntos cardio de Google Fit)` : ''}.`),
      h('div', { class: 'fit-bar cd-bar', 'aria-hidden': 'true' }, h('i', { style: { width: `${Math.min(100, (week / 300) * 100)}%` } })),
      h('div', { class: 'cluster' }, logBtn, canEdit ? h('button', { type: 'button', class: 'btn', onclick: () => presetsSheet(me, saveActivity, activityOf) }, ic('timer', 18), 'Cronómetro de intervalos') : null)),

    h('section', { class: 'panel stack' }, h('h3', {}, 'Lo que te sirve según tu objetivo'),
      h('p', { style: { margin: 0 } }, g.text),
      h('p', { class: 'row-sub', style: { margin: 0 } }, `Para ti: ${g.z2[0]} a ${g.z2[1]} min de zona 2 por semana${g.hiit ? ', y 1 día de intervalos' : ''}${g.sprint ? ', y 1 día de sprints cortos' : ''}, además del voleibol (cuento ${VB_MIN} min por cada día de voleibol).`)),

    h('section', { class: 'panel stack' }, h('h3', {}, 'Tu semana de cardio'),
      plan ? [
        h('div', { class: 'cd-week', role: 'list' }, plan.week.map((d) => h('div', { class: `cd-day${d.wd === wdToday ? ' today' : ''}${d.rest ? ' rest' : ''}`, role: 'listitem' },
          h('b', {}, WD_SHORT[d.wd]),
          h('div', { class: 'cd-what' },
            h('small', {}, [d.gym ? d.gym.name : null, d.vb ? 'Voleibol' : null].filter(Boolean).join(' · ') || 'Sin gym'),
            d.items.length ? d.items.map((it) => h('span', { class: `cd-pill cd-${SESSIONS[it.s].zone}` }, itemText(it))) : h('span', { class: 'cd-rest' }, d.vb ? 'El voleibol es tu cardio' : 'Descanso o caminar'),
            d.items[0] ? h('small', {}, `Sugerido: ${kindName(d.items[0].s)}`) : null)))),
        h('p', { class: 'row-sub', style: { margin: 0 } }, `Plan: ≈ ${plan.z2} min de cardio suave${plan.hard === 'hiit' ? ' + 1 día de intervalos' : plan.hard === 'sprint' ? ' + 1 día de sprints' : ''}. Los intervalos nunca caen el día antes de pierna ni de voleibol. Tus días de voleibol los marcas en Perfil → Tu semana.`),
      ] : note('Tus días de gym no tienen día de la semana. Elige la rutina «Cambia cada semana» en Perfil, o ponle día a cada uno en «Personalizar», y aquí verás qué cardio hacer cada día. Mientras: zona 2 de 20 a 30 min después de los días de torso, 10 min suaves después de pierna y los intervalos lejos de pierna y del voleibol.')),

    h('section', { class: 'panel stack' }, h('h3', {}, 'Tus zonas de esfuerzo'),
      max ? h('p', { style: { margin: 0 } }, `Con ${age} años tu frecuencia cardiaca máxima estimada es ${max} latidos por minuto (208 − 0.7 × edad).`)
        : h('div', { class: 'fit-quick' }, h('label', { class: 'field' }, h('span', { class: 'label' }, 'Tu edad, para calcular tus zonas'), ageIn),
          canEdit ? h('button', { type: 'button', class: 'btn', onclick: () => { const a = Math.round(Number(ageIn.value)); if (!(a >= 14 && a <= 90)) { toast('Escribe una edad de 14 a 90'); return; } saveProf(me.id, { cAge: a }); toast('Listo'); } }, 'Guardar') : null),
      zones,
      note('La fórmula se equivoca hasta 10 latidos en muchas personas. Si tu reloj y cómo te sientes no coinciden, hazle caso a la «prueba de hablar»: en zona 2 puedes platicar en frases completas.', 'info')),

    h('section', { class: 'panel stack' }, h('h3', {}, 'Tipos de cardio: para qué sirve cada uno'),
      h('div', { class: 'rows' }, KINDS.map((k) => h('details', { class: 'hx cd-kind' },
        h('summary', {}, h('span', { class: 'cd-ico', 'aria-hidden': 'true' }, ic(k.icon, 20)), h('span', { class: 'row-main' }, h('strong', {}, k.name), h('span', { class: 'row-sub' }, `${ZONE_BY[k.zone][1].split(' · ')[0]} · impacto ${k.impact.toLowerCase()} · piernas: ${k.legs.toLowerCase()}`))),
        h('div', { class: 'stack', style: { padding: '0 4px 8px' } },
          h('p', { style: { margin: 0 } }, k.good),
          h('p', { style: { margin: 0 } }, h('strong', {}, 'Cómo: '), k.how),
          k.care ? note(k.care, 'warn') : null))))),

    h('section', { class: 'panel stack' }, h('h3', {}, 'Cardio y pesas sin pelearse'), h('ul', { class: 'plain' }, CARDIO_RULES.map((x) => h('li', {}, x)))),

    h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'De dónde sale')),
      h('ul', { class: 'plain' }, CARDIO_SOURCES.map(([t, u]) => h('li', {}, link(u, t)))),
      h('p', { class: 'row-sub' }, 'Los minutos y cómo se reparten en tu semana son propuestas de Remate basadas en estas fuentes. Si tienes una enfermedad del corazón, presión alta o tomas medicamentos que cambian el pulso, consulta antes de hacer intervalos.')));
}

// ---------- cronómetro de intervalos ----------
function presetsSheet(me, saveActivity, activityOf) {
  const sel = h('select', { 'aria-label': 'Tipo de intervalos' }, options(TIMER_PRESETS.map((p) => [p.id, p.name]), 'hiit30'));
  const num = (v, min, max, label) => h('input', { type: 'number', inputmode: 'numeric', min, max, value: v, 'aria-label': label });
  const p0 = TIMER_PRESETS[0];
  const work = num(p0.work, 5, 3600, 'Segundos de esfuerzo'), rest = num(p0.rest, 0, 600, 'Segundos de pausa'), rounds = num(p0.rounds, 1, 40, 'Rondas'), warm = num(Math.round(p0.warm / 60), 0, 15, 'Minutos de calentamiento');
  const tipo = h('select', { 'aria-label': 'Tipo de cardio' }, options(CARDIO_TYPES, 'bici'));
  sel.addEventListener('change', () => { const p = TIMER_PRESETS.find((x) => x.id === sel.value); work.value = p.work; rest.value = p.rest; rounds.value = p.rounds; warm.value = Math.round(p.warm / 60); tipo.value = p.id === 'cuerda' ? 'cuerda' : p.id === 'sprints' ? 'correr' : p.id === 'z2' ? 'caminadora' : 'bici'; });
  const sheetBody = h('div', { class: 'stack' }, field('Tipo', sel),
    h('div', { class: 'grid' }, field('Esfuerzo (segundos)', work), field('Pausa (segundos)', rest)),
    h('div', { class: 'grid' }, field('Rondas', rounds), field('Calentamiento (min)', warm)),
    field('Lo haces en', tipo, 'Para anotarlo al terminar.'),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Pita y vibra en cada cambio. Al terminar te pregunta si lo guardas como cardio del día.'));
  openSheet({ title: 'Cronómetro de intervalos', body: sheetBody, actions: [{ label: 'Cancelar' }, { label: 'Empezar', kind: 'primary', onClick: () => {
    const cfg = { name: TIMER_PRESETS.find((x) => x.id === sel.value).name, work: Number(work.value), rest: Number(rest.value), rounds: Number(rounds.value), warm: Number(warm.value) * 60, every: sel.value === 'z2' ? 300 : 0 };
    if (!(cfg.work >= 5 && cfg.rounds >= 1 && cfg.rest >= 0)) { toast('Revisa los tiempos'); return false; }
    openTimer(cfg, { onDone: (secs) => saveAsk(me, secs, tipo.value, saveActivity, activityOf) });
    return true;
  } }] });
}
async function saveAsk(me, secs, ctipo, saveActivity, activityOf) {
  const m = Math.round(secs / 60); if (!me || m < 1 || !saveActivity) return;
  if (await confirmSheet({ title: `¿Guardar ${m} min de cardio?`, text: 'Se suman al cardio de hoy.', ok: 'Guardar' })) {
    const d = todayStr(), a = activityOf(me.id, d);
    saveActivity(me.id, d, { cmin: (Number(a.cmin) || 0) + m, ctipo });
    toast('Cardio guardado');
  }
}
const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// Pantalla completa: calentamiento → (esfuerzo → pausa) × rondas. Usa el estilo del modo activo.
export function openTimer(cfg, { onDone } = {}) {
  if (!cfg) return null;
  const steps = [];
  if (cfg.warm) steps.push({ ph: 'prep', label: 'Calentamiento', s: cfg.warm });
  for (let i = 0; i < cfg.rounds; i++) {
    steps.push({ ph: 'work', label: cfg.rounds > 1 ? `Esfuerzo ${i + 1} de ${cfg.rounds}` : 'Zona 2', s: cfg.work });
    if (cfg.rest && i < cfg.rounds - 1) steps.push({ ph: 'rest', label: 'Pausa suave', s: cfg.rest });
  }
  const total = steps.reduce((a, x) => a + x.s, 0);
  let i = 0, left = steps[0].s, running = true, last = 0, raf = 0, spent = 0, audio = null, wake = null, done = false, lastEvery = 0;
  const tone = (f, d, at = 0) => { try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = f; g.gain.value = 0.3; o.connect(g); g.connect(audio.destination); o.start(audio.currentTime + at); o.stop(audio.currentTime + at + d); } catch { /* sin sonido */ } };
  const buzz = (p) => { try { navigator.vibrate?.(p); } catch { /* sin vibración */ } };
  const phase = h('div', { class: 'act-phase' }), name = h('h2', { class: 'act-name' }), time = h('div', { class: 'act-time', role: 'timer', 'aria-live': 'off' });
  const nextEl = h('div', { class: 'act-next' }), bar = h('i'), prog = h('div', { class: 'act-prog' });
  const playBtn = h('button', { type: 'button', class: 'act-play', 'aria-label': 'Pausar o seguir', onclick: () => { running = !running; last = 0; paint(); } });
  const ov = h('div', { class: 'actv cd-timer', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Cronómetro: ${cfg.name}` },
    h('div', { class: 'act-top' }, prog, h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Cerrar', onclick: () => close(false) }, ic('x'))),
    h('div', { class: 'act-bar' }, bar),
    h('div', { class: 'act-main' }, phase, name, time, nextEl),
    h('div', { class: 'act-ctrl' },
      h('button', { type: 'button', class: 'act-btn', 'aria-label': 'Saltar', onclick: () => go(i + 1) }, ic('skip-forward', 24)), playBtn,
      h('button', { type: 'button', class: 'act-btn', 'aria-label': 'Terminar', onclick: () => close(true) }, ic('square', 22))),
    h('div', { class: 'act-extra' }, h('span', {}, cfg.name), h('span', {}, `Total ${fmt(total)}`)));
  function paint() {
    const st = steps[i] || steps[steps.length - 1];
    ov.dataset.phase = st.ph === 'work' ? 'work' : st.ph;
    ov.classList.toggle('paused', !running);
    phase.textContent = running ? (st.ph === 'work' ? '¡Fuerte!' : st.ph === 'rest' ? 'Suave' : 'Prepárate') : 'En pausa';
    name.textContent = st.label; time.textContent = fmt(left);
    time.classList.toggle('low', left <= 3 && st.ph !== 'prep');
    const nx = steps[i + 1]; nextEl.textContent = nx ? `Sigue: ${nx.label} (${fmt(nx.s)})` : 'Última';
    const doneS = steps.slice(0, i).reduce((a, x) => a + x.s, 0) + (st.s - left);
    bar.style.width = `${Math.min(100, (doneS / total) * 100)}%`;
    prog.textContent = `${fmt(doneS)} de ${fmt(total)}`;
    playBtn.replaceChildren(ic(running ? 'pause' : 'play', 30));
  }
  function go(n) {
    if (n >= steps.length) { tone(880, 0.25); tone(1175, 0.35, 0.25); buzz([200, 100, 200, 100, 300]); close(true); return; }
    i = n; left = steps[i].s; lastEvery = 0;
    if (steps[i].ph === 'work') { tone(1047, 0.3); buzz([250]); } else { tone(660, 0.25); buzz([120, 80, 120]); }
    paint();
  }
  function tick(now) {
    if (done) return;
    if (running) {
      const dt = last ? Math.min(0.25, (now - last) / 1000) : 0; last = now;
      const before = Math.ceil(left);
      left -= dt; spent += dt;
      const after = Math.ceil(left);
      if (after !== before && after <= 3 && after >= 1) { tone(740, 0.08); }
      if (cfg.every && steps[i].ph === 'work') { const el = steps[i].s - left; if (Math.floor(el / cfg.every) > lastEvery) { lastEvery = Math.floor(el / cfg.every); tone(880, 0.15); buzz(80); } }
      if (left <= 0) go(i + 1); else paint();
    } else last = 0;
    raf = requestAnimationFrame(tick);
  }
  const onVis = () => { if (document.visibilityState === 'visible') keepAwake(); };
  async function keepAwake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wake = await navigator.wakeLock.request('screen'); } catch { /* sin wake lock */ } }
  async function close(finished) {
    if (done) return;
    if (!finished && spent > 20) { const was = running; running = false; paint(); if (!(await confirmSheet({ title: '¿Salir del cronómetro?', text: 'Puedes guardar lo que llevas.', ok: 'Salir' }))) { running = was; return; } }
    done = true; cancelAnimationFrame(raf);
    try { wake?.release?.(); } catch { /* nada */ }
    try { audio?.close?.(); } catch { /* nada */ }
    document.removeEventListener('visibilitychange', onVis);
    ov.remove(); document.body.classList.remove('act-on');
    onDone?.(spent);
  }
  document.body.append(ov); document.body.classList.add('act-on');
  document.addEventListener('visibilitychange', onVis);
  keepAwake(); tone(660, 0.2); paint();
  raf = requestAnimationFrame(tick);
  playBtn.focus();
  return { close };
}
export const _cardioTest = { cardioWeek };
