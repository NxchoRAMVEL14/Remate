// Datos de ejemplo para el modo demo: 12 jugadores ficticios, 14 entrenamientos hechos y 4 por venir.
import { SKILL_IDS } from './content/skills.js';
import { LEVELS } from './content/levels.js';
import { TEMPLATES } from './content/templates.js';
import { todayStr, addDays, parseDate, newJoinCode } from './util.js';

function rng(seed) { // generador determinista, para que el demo siempre se vea igual
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const ROSTER = [
  ['Valeria R.', 'F', 'colocador', 'der', 165, 5, 3, 0.95], ['Dani M.', 'M', 'opuesto', 'izq', 182, 9, 4, 0.9],
  ['Sofi L.', 'F', 'punta', 'der', 168, 7, 3, 0.85], ['Memo G.', 'M', 'central', 'der', 188, 12, 3, 0.8],
  ['Camila T.', 'F', 'libero', 'der', 158, 1, 4, 0.95], ['Santi V.', 'M', 'punta', 'der', 175, 10, 2, 0.75],
  ['Reni P.', 'F', 'central', 'der', 176, 14, 2, 0.7], ['Leo A.', 'M', 'colocador', 'der', 172, 4, 2, 0.85],
  ['Ximena O.', 'F', 'punta', 'izq', 170, 8, 1, 0.55], ['Beto C.', 'M', 'libero', 'der', 169, 2, 1, 0.5],
  ['Aranza H.', 'F', 'opuesto', 'der', 174, 11, 2, 0.8], ['Checo B.', 'M', 'central', 'der', 183, 15, 1, 0.6],
];
const TITLES = ['Fundamentos y juego', 'Saque y recepción', 'Colocación y ataque', 'Defensa y bloqueo', 'Físico y prevención', 'Juego situacional'];

export function makeDemoData() {
  const R = rng(2026);
  const iso = (d) => new Date(d).toISOString();
  const today = todayStr();
  const gid = 'demo-group';
  const groups = [{ id: gid, owner_id: 'demo', name: 'Prepa demo · Voleibol', created_at: iso(Date.now() - 90 * 864e5),
    settings: { days: [2, 4], start: '16:00', minutes: 90, late_per_absence: 3, season: 'Ago 2026 a Ene 2027' } }];

  const players = ROSTER.map(([name, branch, position, hand, height_cm, jersey, level], i) => ({
    id: `demo-p${i + 1}`, owner_id: 'demo', group_id: gid, user_id: null, name, branch, position, hand, height_cm, jersey, level,
    join_code: newJoinCode(), active: true, consent_at: iso(Date.now() - 80 * 864e5), joined_at: null, created_at: iso(Date.now() - 85 * 864e5),
  }));

  // evaluaciones: una hace ~50 días y otra reciente
  const ratings = [];
  for (const p of players) {
    const goal = LEVELS[p.level - 1].profile;
    for (const s of SKILL_IDS) {
      const base = Math.min(4, Math.max(1, (goal[s] || 1) + (R() < 0.3 ? -1 : 0) + (R() < 0.12 ? 1 : 0)));
      if ((p.position === 'libero') && (s === 'remate' || s === 'bloqueo')) continue;
      ratings.push({ id: `demo-r-${p.id}-${s}-0`, owner_id: 'demo', player_id: p.id, skill: s, score: Math.max(1, base - 1), note: '', rated_at: addDays(today, -50), created_at: iso(Date.now() - 50 * 864e5) });
      ratings.push({ id: `demo-r-${p.id}-${s}-1`, owner_id: 'demo', player_id: p.id, skill: s, score: base, note: '', rated_at: addDays(today, -9), created_at: iso(Date.now() - 9 * 864e5) });
    }
  }

  // sesiones hechas (martes y jueves hacia atrás) y futuras
  const sessions = [], attendance = [];
  const days = [];
  for (let d = -1, n = 0; n < 14; d--) { const dt = addDays(today, d); const wd = parseDate(dt).getDay(); if (wd === 2 || wd === 4) { days.push(dt); n++; } }
  days.reverse().forEach((date, i) => {
    const t = TEMPLATES[i % TEMPLATES.length];
    const sid = `demo-s${i + 1}`;
    sessions.push({ id: sid, owner_id: 'demo', group_id: gid, session_date: date, start_time: '16:00', minutes: 90, title: TITLES[i % TITLES.length],
      focus: t.focus, plan: t.blocks.map((b) => ({ ...b, note: '' })), notes: '', status: 'hecha', published: true, created_at: iso(Date.now() - 100 * 864e5) });
    ROSTER.forEach((r, k) => {
      const x = R(); const reliab = r[7];
      const status = x < reliab * 0.82 ? 'presente' : x < reliab * 0.82 + 0.08 ? 'retardo' : x < 0.97 ? 'falta' : 'justificada';
      attendance.push({ id: `demo-a-${i}-${k}`, owner_id: 'demo', session_id: sid, player_id: `demo-p${k + 1}`, status, note: '', created_at: iso(Date.now()) });
    });
  });
  // Ximena y Beto con faltas seguidas recientes (para que "Hoy" tenga algo que mostrar)
  for (const pid of ['demo-p9', 'demo-p10']) for (const s of sessions.slice(-2)) {
    const a = attendance.find((x) => x.session_id === s.id && x.player_id === pid); if (a) a.status = 'falta';
  }
  const future = [];
  for (let d = 0, n = 0; n < 4; d++) { const dt = addDays(today, d); const wd = parseDate(dt).getDay(); if (wd === 2 || wd === 4) { future.push(dt); n++; } }
  future.forEach((date, i) => {
    const t = TEMPLATES[(i + 2) % TEMPLATES.length];
    sessions.push({ id: `demo-f${i + 1}`, owner_id: 'demo', group_id: gid, session_date: date, start_time: '16:00', minutes: t.minutes,
      title: t.name, focus: t.focus, plan: t.blocks.map((b) => ({ ...b, note: '' })), notes: '', status: 'planeada', published: i < 2, created_at: iso(Date.now()) });
  });

  const claims = [
    { id: 'demo-c1', owner_id: 'demo', player_id: 'demo-p9', challenge_id: 'r-plancha60', status: 'solicitada', note: '', claimed_at: iso(Date.now() - 864e5), resolved_at: null },
    { id: 'demo-c2', owner_id: 'demo', player_id: 'demo-p6', challenge_id: 'r-saque8', status: 'solicitada', note: '', claimed_at: iso(Date.now() - 2 * 864e5), resolved_at: null },
    { id: 'demo-c3', owner_id: 'demo', player_id: 'demo-p1', challenge_id: 'r-dedos50', status: 'aprobada', note: '', claimed_at: iso(Date.now() - 20 * 864e5), resolved_at: iso(Date.now() - 19 * 864e5) },
    { id: 'demo-c4', owner_id: 'demo', player_id: 'demo-p2', challenge_id: 'r-remz', status: 'aprobada', note: '', claimed_at: iso(Date.now() - 15 * 864e5), resolved_at: iso(Date.now() - 14 * 864e5) },
    { id: 'demo-c5', owner_id: 'demo', player_id: 'demo-p5', challenge_id: 'r-aterriza', status: 'aprobada', note: '', claimed_at: iso(Date.now() - 12 * 864e5), resolved_at: iso(Date.now() - 11 * 864e5) },
  ];
  const exams = [
    { id: 'demo-e1', owner_id: 'demo', player_id: 'demo-p2', level: 4, passed: true, results: {}, note: '', taken_at: addDays(today, -30), created_at: iso(Date.now() - 30 * 864e5) },
    { id: 'demo-e2', owner_id: 'demo', player_id: 'demo-p5', level: 4, passed: true, results: {}, note: '', taken_at: addDays(today, -26), created_at: iso(Date.now() - 26 * 864e5) },
    { id: 'demo-e3', owner_id: 'demo', player_id: 'demo-p1', level: 4, passed: false, results: {}, note: 'Le faltó consistencia en la colocación a zona 2.', taken_at: addDays(today, -12), created_at: iso(Date.now() - 12 * 864e5) },
  ];
  return { groups, players, sessions, attendance, ratings, exams, claims, notes: [
    { id: 'demo-n1', owner_id: 'demo', player_id: 'demo-p9', body: 'Platicar con ella: ha faltado dos veces seguidas.', created_at: iso(Date.now() - 864e5) },
  ], customEx: [] };
}
