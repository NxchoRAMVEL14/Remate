// Remate Fit · Cardio (v3.25): qué tipo de cardio sirve para qué, zonas de esfuerzo por edad y la «prueba de hablar»,
// y cómo acomodarlo en tu semana según tu objetivo, tus días de pierna y tu voleibol.
// Los minutos y la forma de repartirlos son propuestas de Remate basadas en CARDIO_SOURCES, no cifras de un estudio en particular.

// Frecuencia cardiaca máxima estimada (Tanaka y cols., 2001): 208 − 0.7 × edad. Se equivoca ±10 latidos en muchas personas.
export const hrMax = (age) => (age >= 14 && age <= 90 ? Math.round(208 - 0.7 * age) : null);

// [clave, nombre, % de la FC máxima, prueba de hablar, esfuerzo del 1 al 10, para qué sirve]
export const ZONES = [
  ['z1', 'Zona 1 · Recuperación', [50, 60], 'Hablas sin problema; casi no te agitas.', '2 a 3', 'Calentar, enfriar y recuperarte al día siguiente de pierna o de un partido.'],
  ['z2', 'Zona 2 · Base («puedo platicar»)', [60, 70], 'Puedes platicar en frases completas, pero ya no podrías cantar.', '4 a 5', 'Corazón y pulmones sanos, aguantar más el partido y recuperarte entre puntos. Es la que más minutos aguantas sin cansar tus piernas para las pesas.'],
  ['z3', 'Zona 3 · Ritmo', [70, 80], 'Solo frases cortas.', '6 a 7', 'Mejora la resistencia, pero cansa más que la 2 sin dar mucho más. Úsala poco.'],
  ['z4', 'Zona 4 · Intervalos', [80, 90], 'Solo palabras sueltas.', '8 a 9', 'Intervalos: suben tu capacidad aeróbica en menos tiempo. Cansan: 1 o 2 veces por semana como máximo.'],
  ['z5', 'Zona 5 · Sprint', [90, 100], 'No puedes hablar.', '10', 'Sprints cortos con descanso completo: velocidad, como el esfuerzo de un punto largo. No es para quemar grasa.'],
];
export const ZONE_BY = Object.fromEntries(ZONES.map((z) => [z[0], z]));
export const zoneBpm = (max, [lo, hi]) => (max ? [Math.round((max * lo) / 100), Math.round((max * hi) / 100)] : null);

// Tipos de cardio. log: con qué tipo se anota en «Cardio» (los mismos de fit-bascula.js). legs: qué tanto cansa las piernas.
export const KINDS = [
  { id: 'caminadora', log: 'caminadora', icon: 'footprints', name: 'Caminadora inclinada', zone: 'z2', impact: 'Bajo', legs: 'Poco (pantorrilla)',
    good: 'La más fácil de sumar después de las pesas. Sube el pulso sin impacto y sin cansar las piernas para el día siguiente. Buena para bajar grasa.',
    how: 'Inclinación de 8 a 12% y 5 a 6 km/h, 20 a 40 min. Ajusta para quedarte en zona 2.', care: 'No te detengas del pasamanos: si lo necesitas, baja la inclinación.' },
  { id: 'caminar', log: 'caminar', icon: 'footprints', name: 'Caminar rápido (afuera)', zone: 'z1', impact: 'Bajo', legs: 'Muy poco',
    good: 'Suma pasos y recuperación. Ideal el domingo o el día después de pierna o de un partido.', how: '30 a 60 min a paso rápido; zona 1 o 2.', care: '' },
  { id: 'bici', log: 'bici', icon: 'bike', name: 'Bici fija o spinning', zone: 'z2', impact: 'Ninguno', legs: 'Medio (cuádriceps)',
    good: 'Sin impacto en rodillas ni tobillos: buena para zona 2 y para intervalos. Cuida tus articulaciones si ya saltas mucho en el voleibol.',
    how: 'Zona 2: 20 a 40 min a ritmo de platicar. Intervalos: 30 s a 1 min fuerte y la misma pausa suave.', care: 'El día de pierna, solo suave: carga los cuádriceps.' },
  { id: 'eliptica', log: 'eliptica', icon: 'activity', name: 'Elíptica', zone: 'z2', impact: 'Bajo', legs: 'Poco',
    good: 'Mueve brazos y piernas sin impacto. Buena opción para zona 2 larga.', how: '20 a 40 min en zona 2; empuja y jala con los brazos.', care: '' },
  { id: 'escaladora', log: 'eliptica', icon: 'trending-up', name: 'Escaladora (escaleras)', zone: 'z3', impact: 'Bajo', legs: 'Alto (glúteo y pantorrilla)',
    good: 'Sube el pulso rápido y trabaja glúteo y pantorrilla. Quema mucho en poco tiempo.', how: '10 a 20 min; empieza lento.', care: 'Cansa las piernas: no la hagas larga el día antes de pierna ni de voleibol.' },
  { id: 'remo', log: 'remo', icon: 'waves', name: 'Remo (máquina)', zone: 'z2', impact: 'Ninguno', legs: 'Medio',
    good: 'Trabaja piernas, espalda y brazos. Excelente para intervalos sin impacto.', how: 'Zona 2: 15 a 30 min. Intervalos: 250 m fuerte, 1 min suave.', care: 'Empuja primero con las piernas y luego jala; espalda recta.' },
  { id: 'trote', log: 'correr', icon: 'activity', name: 'Trote suave o correr', zone: 'z2', impact: 'Alto', legs: 'Medio',
    good: 'Mejora la resistencia y sirve en cualquier lugar.', how: 'Trote de 20 a 30 min a ritmo de platicar.',
    care: 'Más impacto en rodillas y tobillos, que ya trabajan con los saltos. Si juegas 3 o más días, mejor bici, elíptica o caminadora.' },
  { id: 'cuerda', log: 'cuerda', icon: 'repeat', name: 'Cuerda', zone: 'z4', impact: 'Medio', legs: 'Medio (pantorrilla)',
    good: 'Se parece al trabajo de pies del voleibol y fortalece pantorrilla y tobillo. Cuenta como saltos.', how: '10 rondas de 30 s saltando y 30 s de pausa.', care: 'No la sumes los días de mucho salto.' },
  { id: 'intervalos', log: 'bici', icon: 'zap', name: 'Intervalos (HIIT)', zone: 'z4', impact: 'Según la máquina', legs: 'Alto',
    good: 'Mejoran tu capacidad aeróbica y queman parecido a una zona 2 larga en mucho menos tiempo. Cansan: 1 o 2 veces por semana.',
    how: 'En bici o remo: 8 a 10 rondas de 30 s a 1 min fuerte (zona 4) y la misma pausa suave. Usa el cronómetro.', care: 'Nunca el día antes de pierna ni de un partido.' },
  { id: 'sprints', log: 'correr', icon: 'zap', name: 'Sprints cortos', zone: 'z5', impact: 'Alto', legs: 'Alto',
    good: 'Velocidad y arranques para la cancha. Para «Fuerza y salto».', how: '6 a 8 sprints de 10 a 20 m; descanso completo (1 a 1.5 min).', care: 'Calienta bien. Nada de sprints con molestia en el muslo de atrás.' },
];
export const KIND_BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));

// Sesiones que propone el plan. kinds: qué tipos sirven, en orden.
export const SESSIONS = {
  z2: { name: 'Zona 2', zone: 'z2', kinds: ['caminadora', 'eliptica', 'bici', 'remo'], text: 'Constante, a ritmo de platicar.' },
  z2long: { name: 'Zona 2 larga', zone: 'z2', kinds: ['caminar', 'bici', 'eliptica'], text: 'Caminata, bici o elíptica larga y suave.' },
  z1: { name: 'Suave para enfriar', zone: 'z1', kinds: ['bici', 'caminadora'], text: 'Muy suave: ayuda a recuperarte, no a cansarte.' },
  hiit: { name: 'Intervalos', zone: 'z4', kinds: ['bici', 'remo', 'intervalos'], text: '8 a 10 rondas de 30 s a 1 min fuerte y la misma pausa suave.' },
  sprint: { name: 'Sprints', zone: 'z5', kinds: ['sprints'], text: '6 a 8 sprints de 10 a 20 m con descanso completo.' },
};

// Cuánto cardio por semana según tu objetivo (además del voleibol). z2: minutos de zona 2; hiit: sesiones de intervalos.
export const GOAL_CARDIO = {
  grasa: { z2: [150, 200], hiit: 1, text: 'Para bajar grasa, lo que más pesa es comer un poco menos y moverte más todos los días. El cardio ayuda a gastar más: sobre todo zona 2 (caminadora inclinada), y un día de intervalos si tus piernas lo aguantan.' },
  musculo: { z2: [60, 90], hiit: 0, text: 'Para ganar músculo, poco cardio y suave: cuida tu corazón y te recupera, sin quitarle energía a las pesas. Mejor sin impacto (caminadora, elíptica o bici) y después de las pesas.' },
  fuerza: { z2: [40, 60], hiit: 0, sprint: 1, text: 'Para fuerza y salto, el cardio es para recuperarte (zona 1 y 2) y unos sprints cortos con descanso completo. Los intervalos largos le quitan potencia a tus piernas.' },
  salud: { z2: [120, 180], hiit: 1, text: 'Para la salud, la meta de la OMS es de 150 a 300 minutos de actividad moderada por semana (o 75 a 150 de intensa). El voleibol cuenta. Zona 2 casi todo, y un día de intervalos si te gustan.' },
};
export const VB_MIN = 45;   // minutos de actividad que Remate cuenta por cada día de voleibol (no todo el entreno es movimiento)

// Reparte el cardio en tu semana. days: los de tu rutina (con wd si van en días de la semana); vbWd: días de voleibol.
// Devuelve 7 días (lunes a domingo) con lo que toca, o null si tus días no tienen día de la semana.
export function cardioWeek({ goal = 'salud', days = [], vbWd = [], vbDays = 0 }) {
  const g = GOAL_CARDIO[goal] || GOAL_CARDIO.salud;
  if (!days.some((d) => Number.isInteger(d.wd))) return null;
  const WD = [1, 2, 3, 4, 5, 6, 0];
  const gymOf = (wd) => days.find((d) => d.wd === wd) || null;
  const isLeg = (d) => d && (d.kind === 'lower' || d.kind === 'full' || /pierna/i.test(d.name || ''));
  const vb = new Set(vbWd);
  const week = WD.map((wd) => {
    const gym = gymOf(wd), next = (wd + 1) % 7, nextGym = gymOf(next);
    return { wd, gym, leg: isLeg(gym), vb: vb.has(wd), beforeLeg: isLeg(nextGym), beforeVb: vb.has(next), items: [] };
  });
  // 1) Intervalos o sprints: en un día de torso o de descanso, que no sea antes de pierna ni de voleibol.
  const hard = g.sprint ? 'sprint' : g.hiit && vbDays < 4 ? 'hiit' : null;
  if (hard) {
    const ok = week.filter((d) => !d.leg && !d.vb && !d.beforeLeg && !d.beforeVb);
    const pick = ok.find((d) => d.gym) || ok[0];
    if (pick) pick.items.push({ s: hard, min: hard === 'sprint' ? 10 : 20 });
  }
  // 2) Zona 2: después de las pesas en los días de torso; en los de pierna, solo suave para enfriar.
  const [lo, hi] = g.z2;
  const target = Math.round((lo + hi) / 2);
  const upper = week.filter((d) => d.gym && !d.leg && !d.items.length);
  const per = upper.length ? Math.min(40, Math.max(15, Math.round(target / upper.length / 5) * 5)) : 0;
  let sum = 0;
  for (const d of upper) { if (sum >= hi) break; const m = d.vb ? Math.min(per, 15) : per; d.items.push({ s: 'z2', min: m, after: true }); sum += m; }
  for (const d of week.filter((x) => x.leg)) { d.items.push({ s: 'z1', min: 10, after: true }); sum += 10; }
  // 3) Si falta, un día de descanso con zona 2 larga (domingo primero).
  const rest = [...week].reverse().filter((d) => !d.gym && !d.vb && !d.items.length);
  if (sum < lo && rest.length) { const m = Math.min(60, Math.max(30, Math.round((lo - sum) / 5) * 5)); rest[0].items.push({ s: 'z2long', min: m }); sum += m; }
  for (const d of week) if (!d.items.length) d.rest = true;
  const vbMin = vbDays * VB_MIN;
  return { week, z2: sum, vbMin, total: sum + vbMin + (hard === 'hiit' ? 20 : hard === 'sprint' ? 10 : 0), goal: g, hard };
}

export const CARDIO_RULES = [
  'Haz el cardio después de las pesas, no antes: así llegas con energía a lo pesado.',
  'Si puedes, sepáralos unas horas (pesas en la mañana, cardio en la tarde). Hacerlos juntos funciona; lo que más estorba es el cardio largo e intenso, sobre todo para la potencia y el salto.',
  'Nada de intervalos ni sprints el día antes de pierna ni el día antes de un partido.',
  'El día de pierna, solo cardio suave para enfriar (bici o caminadora plana, 10 min).',
  'Si juegas voleibol 3 o más días, el voleibol ya es tu cardio intenso: suma solo zona 2 sin impacto.',
  'Si un día estás muy cansado o con agujetas fuertes, cambia el cardio por una caminata suave.',
];

export const TIMER_PRESETS = [
  { id: 'hiit30', name: 'Intervalos 30/30', work: 30, rest: 30, rounds: 10, warm: 180 },
  { id: 'hiit60', name: 'Intervalos 1/1 min', work: 60, rest: 60, rounds: 8, warm: 180 },
  { id: 'cuerda', name: 'Cuerda 30/30', work: 30, rest: 30, rounds: 10, warm: 120 },
  { id: 'tabata', name: 'Tabata 20/10', work: 20, rest: 10, rounds: 8, warm: 180 },
  { id: '4x4', name: '4 × 4 min', work: 240, rest: 180, rounds: 4, warm: 300 },
  { id: 'sprints', name: 'Sprints', work: 8, rest: 80, rounds: 8, warm: 300 },
  { id: 'z2', name: 'Zona 2 continua', work: 30 * 60, rest: 0, rounds: 1, warm: 0, every: 300 },
];

export const CARDIO_SOURCES = [
  ['OMS (2020): actividad física para adultos (150 a 300 minutos moderados o 75 a 150 intensos por semana)', 'https://www.ncbi.nlm.nih.gov/books/NBK566048/'],
  ['Tanaka, Monahan y Seals (2001): frecuencia cardiaca máxima = 208 − 0.7 × edad', 'https://doi.org/10.1016/s0735-1097(00)01054-8'],
  ['Foster y cols. (2018): la prueba de hablar para guiar la intensidad', 'https://hrcak.srce.hr/192696'],
  ['Wewege y cols. (2017): intervalos y cardio continuo bajan grasa parecido; los intervalos toman ~40% menos tiempo', 'https://doi.org/10.1111/obr.12532'],
  ['Schumann y cols. (2022): fuerza y cardio juntos; el músculo y la fuerza máxima no se afectan, la potencia sí puede', 'https://doi.org/10.1007/s40279-021-01587-7'],
];
