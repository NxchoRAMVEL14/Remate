// Datos de ejemplo de la fase 2: partidos con captura, laboratorio de salto, bitácora, autoevaluación y decisiones.
import { addDays, todayStr } from './util.js';
import { score, storedSets, countsFor, playersIn } from './match-calc.js';
import { weekStart } from './lab-calc.js';
import { SCENARIOS } from './content/vision.js';

// Simula un partido jugada por jugada (determinista). edge > 0 favorece a tu equipo.
function simulate(R, starters, bestOf, edges) {
  const log = []; let n = 0, serveUs = true, rot = 0;
  const ev = (a, p, pt, set) => log.push({ id: `ev${++n}`, set, p, a, pt });
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const receivers = starters.filter((p) => ['libero', 'punta'].includes(p.position));
  const attackers = starters.filter((p) => ['punta', 'opuesto', 'central'].includes(p.position));
  const blockers = starters.filter((p) => ['central', 'opuesto'].includes(p.position));
  const diggers = starters.filter((p) => p.position !== 'central');
  for (let guard = 0; guard < 600; guard++) {
    const sc = score(log, bestOf);
    if (sc.over) break;
    if (sc.canClose) { ev('set_end', null, null, sc.idx); continue; }
    const set = sc.idx, edge = edges[set] || 0;
    let winner;
    const attack = () => {
      const a = pick(attackers), x = R() + edge;
      if (x > 0.62) { ev('at_k', a.id, 'us', set); return 'us'; }
      if (x < 0.1) { ev('at_err', a.id, 'them', set); return 'them'; }
      if (x < 0.17) { ev('at_blk', a.id, 'them', set); return 'them'; }
      ev('at_in', a.id, null, set);
      const y = R() + edge;
      if (y > 0.85) { ev('bk_pt', pick(blockers).id, 'us', set); return 'us'; }
      if (y > 0.55) { ev('opp_err', null, 'us', set); return 'us'; }
      if (y > 0.35) { ev('dg_ok', pick(diggers).id, null, set); return attack(); }
      ev(R() < 0.5 ? 'dg_err' : 'opp_pt', R() < 0.5 ? pick(diggers).id : null, 'them', set);
      return 'them';
    };
    if (serveUs) {
      const s = starters[rot % starters.length], x = R() + edge * 0.5;
      if (x > 0.93) { ev('sv_ace', s.id, 'us', set); winner = 'us'; }
      else if (x < 0.1) { ev('sv_err', s.id, 'them', set); winner = 'them'; }
      else { ev('sv_in', s.id, null, set); winner = R() + edge < 0.42 ? (ev('opp_pt', null, 'them', set), 'them') : attack(); }
    } else {
      const r = pick(receivers), x = R() + edge * 0.5;
      if (x < 0.07) { ev('rc_0', r.id, 'them', set); winner = 'them'; }
      else { ev(x > 0.68 ? 'rc_3' : x > 0.36 ? 'rc_2' : 'rc_1', r.id, null, set); winner = attack(); }
    }
    if (winner === 'us' && !serveUs) { serveUs = true; rot++; } else if (winner === 'them') serveUs = false;
  }
  return log;
}

export function makeDemoPhase2({ R, players, sessions, gid }) {
  const today = todayStr();
  const iso = (daysAgo) => new Date(Date.now() - daysAgo * 864e5).toISOString();
  const own = 'demo';
  const starters = ['demo-p1', 'demo-p2', 'demo-p3', 'demo-p4', 'demo-p5', 'demo-p6', 'demo-p7'].map((id) => players.find((p) => p.id === id));

  // ---------- partidos ----------
  const defs = [
    { id: 'demo-m1', rival: 'Prepa Las Lomas', d: -16, kind: 'liga', edges: [0.04, 0.0, 0.05], venue: 'Gimnasio municipal' },
    { id: 'demo-m2', rival: 'Colegio del Valle', d: -5, kind: 'liga', edges: [-0.06, -0.05, -0.03], venue: 'Visita' },
  ];
  const matches = [], matchLogs = [], matchStats = [];
  for (const m of defs) {
    const log = simulate(R, starters, 3, m.edges);
    const sc = score(log, 3);
    matches.push({ id: m.id, owner_id: own, group_id: gid, match_date: addDays(today, m.d), rival: m.rival, venue: m.venue, kind: m.kind, best_of: 3,
      sets: storedSets(sc), status: 'terminado', note: '', created_at: iso(-m.d) });
    matchLogs.push({ id: `${m.id}-log`, owner_id: own, match_id: m.id, log, created_at: iso(-m.d) });
    for (const pid of playersIn(log)) matchStats.push({ id: `${m.id}-${pid}`, owner_id: own, match_id: m.id, player_id: pid, counts: countsFor(log, pid), created_at: iso(-m.d) });
  }
  matches.push({ id: 'demo-m3', owner_id: own, group_id: gid, match_date: addDays(today, 9), rival: 'Instituto Juárez', venue: 'Casa', kind: 'torneo', best_of: 3, sets: [], status: 'planeado', note: 'Llegar 45 minutos antes para calentar.', created_at: iso(0) });

  // ---------- laboratorio de salto ----------
  const start = addDays(weekStart(today), -28);                     // hace 4 semanas: hoy cae en la semana 5
  const coachProfile = [{ id: 'demo-prof', owner_id: own, data: { reach_cm: 232, net: 'M', method: 'myjump', program_start: start, auto_score: true,
    reportNotes: { 'demo-p1': 'Valeria organiza muy bien el juego y es la primera en llegar. Siguiente paso: colocación a zona 2 con pase lejos de la red.' } }, updated_at: iso(0) }];
  const T = (d, kind, h, att, extra = {}) => ({ id: `demo-jt-${kind}-${d}`, owner_id: own, test_date: addDays(today, d), kind, method: 'myjump', height_cm: h, attempts: att,
    touch_cm: null, contact_ms: null, drop_cm: null, body_kg: 78, note: '', created_at: iso(-d), ...extra });
  const jumpTests = [
    T(-30, 'cmj', 41.2, [40.1, 41.2, 40.6]), T(-21, 'cmj', 41.9, [41.9, 41.0, 41.5]), T(-10, 'cmj', 43.0, [42.2, 43.0, 42.8]), T(-2, 'cmj', 43.8, [43.8, 43.1, 42.9]),
    T(-30, 'spike', 58.0, [286, 290, 288], { method: 'sargent', touch_cm: 290 }), T(-2, 'spike', 61.0, [291, 293, 289], { method: 'sargent', touch_cm: 293 }),
    T(-2, 'drop', 33.5, [32.0, 33.5], { contact_ms: 248, drop_cm: 30 }),
  ];
  const S = (d, focus, contacts, minutes, rpe, note, pain = null) => ({ id: `demo-js-${d}`, owner_id: own, session_date: addDays(today, d), focus, blocks: [], contacts, minutes, rpe,
    pain_zone: pain?.[0] || null, pain_level: pain?.[1] ?? null, note, created_at: iso(-d) });
  const jumpSessions = [
    S(-27, 'fuerza', 0, 40, 5, 'Semana 1, sesión A'), S(-25, 'aterrizaje', 15, 35, 4, 'Semana 1, sesión B'),
    S(-20, 'fuerza', 0, 45, 6, 'Semana 2, sesión A'), S(-18, 'aterrizaje', 20, 35, 5, 'Semana 2, sesión B'),
    S(-13, 'fuerza', 0, 45, 6, 'Semana 3, sesión A'), S(-11, 'aterrizaje', 25, 40, 6, 'Semana 3, sesión B', ['rodilla', 2]),
    S(-6, 'fuerza', 0, 45, 7, 'Semana 4, sesión A'), S(-4, 'pliometria', 39, 40, 6, 'Semana 4, sesión B'),
  ];

  // ---------- coaching ----------
  const done = sessions.filter((s) => s.status === 'hecha');
  const L = (s, climate, worked, change) => ({ id: `demo-cl-${s.id}`, owner_id: own, session_id: s.id, match_id: null, log_date: s.session_date, kind: 'entrenamiento', climate, worked, change, note: '', created_at: iso(0) });
  const coachLogs = [
    L(done[done.length - 3], 4, 'El 3 contra 3 con puntos dobles por recepción perfecta los tuvo muy metidos.', 'Expliqué demasiado al inicio; la próxima, menos de 30 segundos y a jugar.'),
    L(done[done.length - 2], 3, 'Los centrales ya llegan a tiempo al bloqueo doble.', 'Mucha fila en el ejercicio de saque; usar las dos mitades de la cancha.'),
    { id: 'demo-cl-m2', owner_id: own, session_id: null, match_id: 'demo-m2', log_date: addDays(today, -5), kind: 'partido', climate: 2, worked: 'Buena actitud después de perder el primer set.', change: 'La recepción se cayó con su saque flotante: entrenar recepción de flotante esta semana.', note: '', created_at: iso(5) },
  ];
  const coachAssess = [{ id: 'demo-ca1', owner_id: own, assessed_on: addDays(today, -34), goal: 'Explicar en menos de 30 segundos y dejarlos jugar', note: '',
    scores: { plan: 3, instr: 2, feed: 2, active: 2, game: 3, climate: 3, match: 2, safety: 3, family: 2 }, created_at: iso(34) }];
  const decisions = SCENARIOS.slice(0, 14).map((s, i) => ({ id: `demo-d${i}`, owner_id: own, scenario_id: s.id, category: s.cat, chosen: R() < 0.7 ? s.answer : 'a', correct: false,
    ms: Math.round(2500 + R() * 5000), created_at: iso(14 - i) })).map((d) => ({ ...d, correct: d.chosen === SCENARIOS.find((s) => s.id === d.scenario_id).answer }));

  // ---------- en casa y mejoras ----------
  const H = (pid, d, ref, minutes, feeling) => ({ id: `demo-h-${pid}-${d}-${ref}`, owner_id: own, player_id: pid, done_on: addDays(today, d), kind: ref.startsWith('r-') ? 'rutina' : 'ejercicio', ref, minutes, feeling, note: '', created_at: iso(-d) });
  const homeLogs = [
    H('demo-p1', -1, 'r-balon', 15, 4), H('demo-p1', -4, 'r-fisico', 20, 3), H('demo-p1', -8, 'r-balon', 15, 4), H('demo-p1', -11, 'r-fisico', 20, 4),
    H('demo-p3', -2, 'r-fisico', 20, 3), H('demo-p3', -6, 'h-pared-piso', 10, 5),
    H('demo-p5', 0, 'r-sinbalon', 15, 4), H('demo-p5', -3, 'h-equilibrio', 5, null), H('demo-p5', -5, 'r-fisico', 25, 3),
    H('demo-p9', -9, 'h-dedos-acostado', 10, 4),
  ];
  const ideas = [
    { id: 'demo-i1', owner_id: own, title: 'Pasar lista por posición', body: 'En la lista de asistencia, agrupar a los jugadores por posición para ver rápido si faltan centrales o líberos.', area: 'entrenos', priority: 'media', status: 'idea', done_at: null, created_at: iso(3) },
    { id: 'demo-i2', owner_id: own, title: 'Side-out y break point', body: 'Porcentaje de puntos ganados cuando recibimos y cuando sacamos, en el resumen del partido.', area: 'partidos', priority: 'alta', status: 'lista', done_at: null, created_at: iso(1) },
  ];

  return { matches, matchLogs, matchStats, coachProfile, jumpTests, jumpSessions, coachLogs, coachAssess, decisions, homeLogs, ideas };
}
