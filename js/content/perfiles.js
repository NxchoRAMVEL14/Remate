// Conoce a tus jugadores (v3.26): tests que contesta el jugador, cómo se califican, su posición ideal, el mapa del equipo
// y la retroalimentación al entrenador. Todo se calcula en el celular; la nube solo guarda las respuestas (player_surveys).
// Las preguntas son de Remate, inspiradas en las dimensiones de cuestionarios con respaldo (ver PERFIL_SOURCES);
// no son esos cuestionarios ni sirven como diagnóstico: son para conocerse y platicar.

export const SCALE5 = ['Nada', 'Poco', 'A veces', 'Bastante', 'Totalmente'];
export const RETEST_DAYS = 90;   // se sugiere repetir cada 3 meses (crecen y cambian rápido)

// ---------- Mi mente en la cancha (dimensiones del ACSI-28; preguntas propias; r = se califica al revés) ----------
export const MENTE_DIMS = {
  presion: { name: 'Juego bajo presión', tip: 'Practica puntos con marcador apretado (20-20 o 23-23) y una rutina corta antes de sacar: respira, mira el punto, saca.', coach: 'Ponle situaciones de marcador cerrado en el entreno y dale una sola instrucción, no varias.' },
  adversidad: { name: 'Levantarse de los errores', tip: 'Después de un error: una palmada, una palabra clave («siguiente») y vuelves a la posición. El error ya pasó.', coach: 'Corrige después del punto, no en caliente, y reconoce cuando se levanta rápido de un error.' },
  concentracion: { name: 'Concentración', tip: 'Antes de cada saque del rival, di en tu mente tu tarea: «leo al sacador, recibo al colocador».', coach: 'Dale tareas concretas por rotación; las instrucciones largas le dispersan.' },
  confianza: { name: 'Confianza y ganas', tip: 'Anota cada semana 3 cosas que hiciste bien. Las ganas crecen cuando ves que mejoras.', coach: 'Señálale avances concretos («hoy recibiste 7 de 10»). Funciona mejor que un «bien» general.' },
  metas: { name: 'Metas y preparación', tip: 'Ponte una meta pequeña por entreno («hoy: 8 de 10 saques adentro») y revisa al final si la cumpliste.', coach: 'Ayúdale a poner metas de proceso, medibles y cortas.' },
  calma: { name: 'Calma (sin preocuparse de más)', tip: 'Concéntrate en lo que depende de ti (tu esfuerzo, tu posición), no en lo que piensen los demás.', coach: 'Evita comparaciones con compañeros; háblale de su propio avance.' },
  correccion: { name: 'Aceptar corrección', tip: 'Cuando te corrijan, repite la instrucción con tus palabras y pruébala en la siguiente jugada.', coach: 'Explícale el porqué de cada corrección; suele aceptarla mejor.' },
};
export const MENTE_Q = [
  ['presion', 'Cuando el marcador está cerrado, juego igual o mejor que en el entreno.'],
  ['presion', 'Me gusta que me toque sacar o rematar en los puntos importantes.'],
  ['presion', 'Cuando hay mucha presión me bloqueo y no hago lo que sé.', 'r'],
  ['adversidad', 'Después de un error, me olvido rápido y me concentro en la siguiente jugada.'],
  ['adversidad', 'Si vamos perdiendo, sigo intentándolo con la misma energía.'],
  ['adversidad', 'Un error me afecta varias jugadas seguidas.', 'r'],
  ['concentracion', 'Durante el partido me concentro en el balón y en mi tarea.'],
  ['concentracion', 'Me distraigo con lo que pasa fuera de la cancha (gente, ruido, celular).', 'r'],
  ['concentracion', 'Sé qué tengo que hacer en cada rotación.'],
  ['confianza', 'Confío en que puedo hacer bien mis fundamentos en un partido.'],
  ['confianza', 'Tengo ganas de mejorar aunque me cueste.'],
  ['confianza', 'Dudo de mí cuando juego contra equipos buenos.', 'r'],
  ['metas', 'Me pongo metas para mejorar en el voleibol.'],
  ['metas', 'Antes de un partido me preparo (descanso, como bien, pienso en el juego).'],
  ['metas', 'Sé en qué fundamento tengo que mejorar y qué hago para lograrlo.'],
  ['calma', 'Me preocupa mucho lo que piensen de mí cuando fallo.', 'r'],
  ['calma', 'Antes de un partido me pongo tan nervioso que me cuesta jugar.', 'r'],
  ['calma', 'Puedo calmarme si me pongo nervioso.'],
  ['correccion', 'Cuando el entrenador me corrige, lo tomo para mejorar, no como regaño.'],
  ['correccion', 'Me molesta que me corrijan frente al equipo.', 'r'],
  ['correccion', 'Pruebo lo que me dicen aunque al principio no me salga.'],
];

// ---------- ¿Por qué juego? (orientación a la tarea y al ego, del TEOSQ; preguntas propias) ----------
export const MOTIVO_Q = [
  ['tarea', 'Me siento bien cuando aprendo una técnica nueva.'],
  ['tarea', 'Me siento bien cuando algo que antes no me salía, ahora sí.'],
  ['tarea', 'Lo que más disfruto es mejorar, aunque no gane.'],
  ['tarea', 'Me gusta cuando entreno duro y veo que avancé.'],
  ['tarea', 'Me siento bien cuando ayudo al equipo con mi esfuerzo.'],
  ['tarea', 'Me gusta que un ejercicio me cueste porque así aprendo.'],
  ['ego', 'Me siento bien cuando soy el mejor del equipo.'],
  ['ego', 'Me siento bien cuando hago algo que los demás no pueden.'],
  ['ego', 'Lo que más me importa es ganarles a los demás.'],
  ['ego', 'Me gusta demostrar que soy mejor que mis compañeros.'],
  ['ego', 'Me siento exitoso cuando los demás se equivocan y yo no.'],
  ['ego', 'Me siento bien cuando me eligen primero.'],
];
export const MOTIVO_TYPES = {
  ambos: { name: 'Mejorar y ganar', text: 'Te mueve aprender y también destacar. Es una buena combinación: aprovecha la competencia para medir tu avance.', coach: 'Retos con marcador y metas personales a la vez. Reconoce el esfuerzo además del resultado.' },
  tarea: { name: 'Mejorar', text: 'Te mueve aprender y sentir que avanzas. Es lo que más ayuda a seguir en el deporte por años.', coach: 'Metas de aprendizaje y retroalimentación de su avance. No hace falta compararlo con otros.' },
  ego: { name: 'Ganar y destacar', text: 'Te mueve ser el mejor. Úsalo a tu favor: compite contigo mismo para no frustrarte cuando alguien es mejor.', coach: 'Ayúdale a ver su progreso personal; las comparaciones lo motivan, pero también lo frustran si pierde.' },
  bajo: { name: 'Todavía buscando', text: 'Aún no tienes claro qué te mueve del voleibol. Platícalo con tu entrenador: encontrar tu razón ayuda mucho.', coach: 'Platica con él qué le gusta del equipo; a veces la razón es estar con sus amigos, y está bien.' },
};

// ---------- Mi rol en el equipo (dinámica; no es un test científico) ----------
export const ROLES = {
  voz: { name: 'La voz', text: 'Hablas, organizas y das indicaciones. El equipo te escucha.', coach: 'Buen candidato a capitán: dale espacio para hablar en los tiempos fuera.' },
  motor: { name: 'El motor', text: 'Contagias energía y ánimo; levantas al equipo cuando va abajo.', coach: 'Úsalo para subir la energía en los calentamientos y en los momentos bajos.' },
  estratega: { name: 'El estratega', text: 'Lees el juego, ves los huecos del rival y piensas la jugada.', coach: 'Pregúntale qué ve del rival; puede ayudarte con el scouting.' },
  ancla: { name: 'El ancla', text: 'Das calma y confianza; eres constante cuando todo se complica.', coach: 'Ponlo junto a jugadores nerviosos; su calma ayuda a los demás.' },
};
export const ROL_Q = [
  ['voz', 'En la cancha hablo mucho y digo quién toma el balón.'],
  ['voz', 'Me gusta organizar al equipo y decir dónde ponerse.'],
  ['voz', 'Si algo no está funcionando, lo digo.'],
  ['motor', 'Animo a mis compañeros aunque vayamos perdiendo.'],
  ['motor', 'Celebro los puntos con el equipo.'],
  ['motor', 'Cuando el equipo está apagado, intento prenderlo.'],
  ['estratega', 'Me fijo en dónde se paran los rivales y por dónde atacan.'],
  ['estratega', 'Pienso a dónde mandar el balón antes de tocarlo.'],
  ['estratega', 'Después del partido me acuerdo de jugadas y por qué salieron.'],
  ['ancla', 'Cuando hay nervios, mantengo la calma.'],
  ['ancla', 'Mis compañeros me buscan cuando las cosas se complican.'],
  ['ancla', 'Juego parejo, sin altibajos grandes.'],
];

// ---------- Cómo me gusta que me corrijan (preferencias; opción única) ----------
export const CORR_Q = [
  { id: 'donde', q: '¿Dónde prefieres que te corrijan?', opts: [['privado', 'En privado, solo a mí'], ['grupo', 'Frente al equipo está bien'], ['igual', 'Me da igual']] },
  { id: 'como', q: '¿Cómo entiendes mejor una corrección?', opts: [['ver', 'Que me lo enseñen (demostración)'], ['oir', 'Que me lo expliquen con palabras'], ['video', 'Verme en video'], ['hacer', 'Probarlo y sentirlo']] },
  { id: 'cuando', q: '¿Cuándo prefieres la corrección?', opts: [['ya', 'En el momento'], ['ejercicio', 'Al terminar el ejercicio'], ['final', 'Al final del entreno']] },
  { id: 'tono', q: '¿Qué tono te funciona mejor?', opts: [['directo', 'Directo, sin rodeos'], ['positivo', 'Primero algo que hice bien'], ['pregunta', 'Que me pregunte qué noté yo']] },
  { id: 'cuantas', q: '¿Cuántas cosas a la vez?', opts: [['una', 'Una sola cosa'], ['dos', 'Dos o tres'], ['todas', 'Todas las que vea']] },
  { id: 'animo', q: 'Cuando me sale bien, me gusta que…', opts: [['dicho', 'Me lo digan en el momento'], ['privado', 'Me lo digan después, en corto'], ['nada', 'No hace falta decirlo']] },
];
export const CORR_BY = Object.fromEntries(CORR_Q.map((x) => [x.id, x]));

// ---------- Autoevaluación (misma escala de fases 1 a 4 que usa el entrenador) ----------
export const AUTO_SKILLS = ['saque', 'recepcion', 'colocacion', 'remate', 'bloqueo', 'defensa', 'fisico', 'juego'];
export const AUTO_LEVELS = ['', 'Fase 1: empiezo', 'Fase 2: me sale a veces', 'Fase 3: me sale casi siempre', 'Fase 4: lo domino en partido'];

// ---------- Mi posición ideal: gustos del jugador ----------
export const GUSTO_Q = [
  ['organizar', 'Me gusta tocar el balón en cada jugada y decidir quién ataca.'],
  ['rematar', 'Lo que más disfruto es rematar y terminar el punto.'],
  ['bloquear', 'Me gusta estar en la red bloqueando.'],
  ['recibir', 'Me gusta recibir el saque del rival.'],
  ['defender', 'Me gusta tirarme por balones difíciles y defender.'],
  ['atras', 'Prefiero jugar atrás que en la red.'],
  ['rapido', 'Me gusta moverme rápido y cambiar de dirección.'],
  ['saltar', 'Me gusta saltar alto; siento que es mi fuerte.'],
];
export const MANO = [['derecha', 'Diestro'], ['izquierda', 'Zurdo'], ['ambas', 'Las dos']];
export const POS_IDS = ['colocador', 'central', 'punta', 'opuesto', 'libero'];
export const POS_INFO = {
  colocador: { name: 'Colocador(a)', why: 'Organiza el ataque: toca el segundo balón casi siempre y decide quién remata.' },
  central: { name: 'Central', why: 'Bloquea en el centro y ataca rápido. Aquí pesan la estatura, el alcance y el salto.' },
  punta: { name: 'Punta', why: 'Recibe, defiende y remata por la zona 4. Es la posición más completa.' },
  opuesto: { name: 'Opuesto(a)', why: 'Rematador principal por la zona 2 y bloqueador; casi no recibe. Ser zurdo ayuda.' },
  libero: { name: 'Líbero', why: 'Especialista en recibir y defender; juega atrás. Pesan la rapidez y la lectura del juego.' },
};
// Pesos de cada factor por posición (propuesta de Remate a partir de las diferencias por posición de PERFIL_SOURCES).
const POS_W = {
  colocador: { colocacion: 3, juego: 1.5, defensa: 0.5, g_organizar: 2.5, g_rapido: 1, agilidad: 1, m_concentracion: 0.8, m_presion: 0.7, r_voz: 0.8, r_estratega: 0.7 },
  central: { bloqueo: 2.5, remate: 1.5, estatura: 2.5, alcance_pie: 2, envergadura: 1, cmj: 1.5, alcance: 1.5, g_bloquear: 2, g_saltar: 1 },
  punta: { recepcion: 2, remate: 2, defensa: 1, saque: 0.8, cmj: 1, alcance: 0.8, g_rematar: 1.5, g_recibir: 1.5, m_adversidad: 0.5 },
  opuesto: { remate: 2.5, bloqueo: 1.5, saque: 0.5, alcance: 1.5, cmj: 1.2, estatura: 1, g_rematar: 2, g_bloquear: 1, zurdo: 1.5, m_presion: 0.6 },
  libero: { recepcion: 2.5, defensa: 2.5, agilidad: 1.5, vel10: 1, g_defender: 2, g_recibir: 1.5, g_atras: 1.5, bajo: 1, m_adversidad: 0.6, r_ancla: 0.5 },
};
const FACTOR_NAME = {
  colocacion: 'colocación', juego: 'lectura del juego', defensa: 'defensa', recepcion: 'recepción', remate: 'remate', bloqueo: 'bloqueo', saque: 'saque',
  estatura: 'estatura', alcance_pie: 'alcance de pie', envergadura: 'envergadura', cmj: 'salto', alcance: 'alcance de remate', agilidad: 'agilidad', vel10: 'velocidad', bajo: 'moverse cerca del piso',
  g_organizar: 'gusto por organizar', g_rematar: 'gusto por rematar', g_bloquear: 'gusto por bloquear', g_recibir: 'gusto por recibir', g_defender: 'gusto por defender',
  g_atras: 'preferir jugar atrás', g_rapido: 'gusto por moverse rápido', g_saltar: 'gusto por saltar', zurdo: 'ser zurdo',
  m_concentracion: 'concentración', m_presion: 'juego bajo presión', m_adversidad: 'levantarse de los errores', r_voz: 'hablar y organizar', r_estratega: 'leer el juego', r_ancla: 'calma',
};

// ---------- utilidades de calificación ----------
const val = (ans, i, rev) => { const v = Number(ans?.[i]); if (!(v >= 1 && v <= 5)) return null; return rev ? 6 - v : v; };
const pct = (xs) => (xs.length ? Math.round(((xs.reduce((a, b) => a + b, 0) / xs.length - 1) / 4) * 100) : null);
export const answered = (ans, n) => Array.from({ length: n }, (_, i) => ans?.[i]).filter((v) => v != null && v !== '').length;

export function scoreMente(ans) {
  const by = {};
  MENTE_Q.forEach(([d, , r], i) => { const v = val(ans, i, r); if (v != null) (by[d] ||= []).push(v); });
  const dims = Object.keys(MENTE_DIMS).map((k) => ({ k, name: MENTE_DIMS[k].name, v: pct(by[k] || []) })).filter((x) => x.v != null);
  const sorted = [...dims].sort((a, b) => b.v - a.v);
  return { dims, strong: sorted.slice(0, 2), work: sorted.slice(-2).reverse().filter((x) => x.v < 70), total: pct(Object.values(by).flat()) };
}
export function scoreMotivo(ans) {
  const t = [], e = [];
  MOTIVO_Q.forEach(([d], i) => { const v = val(ans, i); if (v != null) (d === 'tarea' ? t : e).push(v); });
  const tarea = pct(t), ego = pct(e);
  if (tarea == null || ego == null) return null;
  const hi = (x) => x >= 60;
  const type = hi(tarea) && hi(ego) ? 'ambos' : hi(tarea) ? 'tarea' : hi(ego) ? 'ego' : 'bajo';
  return { tarea, ego, type, ...MOTIVO_TYPES[type] };
}
export function scoreRol(ans) {
  const by = {};
  ROL_Q.forEach(([r], i) => { const v = val(ans, i); if (v != null) (by[r] ||= []).push(v); });
  const list = Object.keys(ROLES).map((k) => ({ k, ...ROLES[k], v: pct(by[k] || []) })).filter((x) => x.v != null).sort((a, b) => b.v - a.v);
  return list.length ? { top: list[0], second: list[1] && list[1].v >= list[0].v - 8 ? list[1] : null, list } : null;
}
export function corrSummary(ans) {
  return CORR_Q.map((q) => { const o = q.opts.find(([k]) => k === ans?.[q.id]); return o ? { id: q.id, q: q.q, a: o[1] } : null; }).filter(Boolean);
}
// Autoevaluación vs. entrenador. coach: { skill: fase 1-4 }
export function autoGap(ans, coach = {}) {
  return AUTO_SKILLS.map((s) => {
    const me = Number(ans?.[s]) || null, c = Number(coach[s]) || null;
    return { s, me, c, d: me && c ? me - c : null };
  }).filter((x) => x.me || x.c);
}

// ---------- Mi posición ideal ----------
// tests: { kind: último valor } del jugador; team: lista de { kind: valor } de compañeros de la misma rama (para comparar);
// ratings: { skill: fase 1-4 }; gustos: respuestas del test «posicion»; mente y rol: resultados ya calculados (pueden faltar).
const LOWER_BETTER = new Set(['agilidad', 'vel10']);
function rel(kind, v, team, branch) {
  const xs = team.map((t) => Number(t[kind])).filter((x) => x > 0);
  if (v == null || !(v > 0)) return null;
  if (xs.length >= 4) {   // percentil dentro del equipo (misma rama)
    const below = xs.filter((x) => (LOWER_BETTER.has(kind) ? x > v : x < v)).length, same = xs.filter((x) => x === v).length;
    return (below + same / 2) / xs.length;
  }
  // pocos datos: contra rangos de referencia amplios de prepa (propuesta de Remate)
  const R = branch === 'F'
    ? { estatura: [145, 180], alcance_pie: [180, 232], envergadura: [145, 185], cmj: [15, 45], alcance: [215, 295], agilidad: [14, 10.5], vel10: [2.6, 2] }
    : { estatura: [150, 190], alcance_pie: [190, 245], envergadura: [150, 195], cmj: [20, 55], alcance: [230, 320], agilidad: [13, 9.5], vel10: [2.4, 1.8] };
  const [a, b] = R[kind] || [0, 1];
  return Math.max(0, Math.min(1, (v - a) / (b - a)));
}
export function scorePosition({ tests = {}, team = [], ratings = {}, gustos = null, mente = null, rol = null, branch = null, hand = null }) {
  const f = {}, missing = [];
  for (const s of ['colocacion', 'juego', 'defensa', 'recepcion', 'remate', 'bloqueo', 'saque']) if (ratings[s]) f[s] = (ratings[s] - 1) / 3;
  for (const k of ['estatura', 'alcance_pie', 'envergadura', 'cmj', 'alcance', 'agilidad', 'vel10']) { const r = rel(k, tests[k], team, branch); if (r != null) f[k] = r; else missing.push(k); }
  if (f.estatura != null) f.bajo = 1 - f.estatura;
  if (gustos) GUSTO_Q.forEach(([k], i) => { const v = val(gustos, i); if (v != null) f[`g_${k}`] = (v - 1) / 4; });
  const mano = gustos?.mano || hand;
  if (mano) f.zurdo = mano === 'izquierda' ? 1 : mano === 'ambas' ? 0.5 : 0;
  if (mente) for (const d of mente.dims) f[`m_${d.k}`] = d.v / 100;
  if (rol) for (const r of rol.list) f[`r_${r.k}`] = r.v / 100;
  const ranking = POS_IDS.map((p) => {
    let sum = 0, wsum = 0; const parts = [];
    for (const [k, w] of Object.entries(POS_W[p])) if (f[k] != null) { sum += f[k] * w; wsum += w; parts.push({ k, c: f[k] * w, f: f[k] }); }
    const total = Object.values(POS_W[p]).reduce((a, b) => a + b, 0);
    const score = wsum ? Math.round((sum / wsum) * 100) : null;
    const reasons = parts.filter((x) => x.f >= 0.6).sort((a, b) => b.c - a.c).slice(0, 3).map((x) => FACTOR_NAME[x.k]);
    return { p, ...POS_INFO[p], score, coverage: wsum / total, reasons };
  }).filter((x) => x.score != null).sort((a, b) => b.score - a.score);
  const coverage = ranking.length ? ranking.reduce((a, b) => a + b.coverage, 0) / ranking.length : 0;
  const fav = gustos?.fav && POS_IDS.includes(gustos.fav) ? gustos.fav : null;
  return {
    ranking, top: ranking.slice(0, 2), fav, hand: mano || null,
    confidence: coverage >= 0.75 ? 'alta' : coverage >= 0.45 ? 'media' : 'baja',
    missing: [...missing, ...(gustos ? [] : ['gustos']), ...(Object.keys(ratings).length ? [] : ['ratings'])],
  };
}
export const MISSING_NAME = { estatura: 'estatura', alcance_pie: 'alcance de pie', envergadura: 'envergadura', cmj: 'salto vertical', alcance: 'alcance de remate', agilidad: 'agilidad', vel10: 'velocidad 10 m', gustos: 'el test «Mi posición ideal» del jugador', ratings: 'tu evaluación de fundamentos' };

// ---------- Mapa del equipo (sistema 5-1) ----------
export const NEED_51 = { colocador: [1, 2], central: [2, 3], punta: [2, 3], opuesto: [1, 2], libero: [1, 2] };
export function teamMap(list) {
  // list: [{ player, pos: resultado de scorePosition, current: posición actual }]
  return POS_IDS.map((p) => {
    const first = list.filter((x) => x.pos?.top[0]?.p === p), second = list.filter((x) => x.pos?.top[1]?.p === p), now = list.filter((x) => x.current === p);
    const [lo, hi] = NEED_51[p], n = first.length;
    return { p, name: POS_INFO[p].name, first, second, now, need: [lo, hi], state: n >= lo ? (n > hi ? 'sobra' : 'ok') : n + second.length >= lo ? 'justo' : 'falta' };
  });
}

// ---------- Retroalimentación al entrenador ----------
export const FACES = [['😞', 'Muy mal'], ['🙁', 'Mal'], ['😐', 'Regular'], ['🙂', 'Bien'], ['😄', 'Excelente']];
export const RETRO_TAGS = [['aprendi', 'Aprendí algo nuevo'], ['divertido', 'Me divertí'], ['claro', 'Se explicó claro'], ['pesado', 'Fue muy pesado'], ['facil', 'Fue muy fácil'], ['esperas', 'Mucho tiempo parado'], ['repetido', 'Ya lo habíamos hecho mucho'], ['juego', 'Faltó jugar']];
export const RETRO_TAG = Object.fromEntries(RETRO_TAGS);
export const MES_CATS = { entrenos: 'Entrenos', explica: 'Cómo explica', trato: 'Trato', motiva: 'Motivación', orden: 'Organización' };
export const MES_Q = [
  ['entrenos', 'Los entrenos son variados y no aburren.'],
  ['entrenos', 'El nivel de los ejercicios es adecuado para mí.'],
  ['entrenos', 'Aprovechamos bien el tiempo del entreno.'],
  ['entrenos', 'Me divierto en los entrenos.'],
  ['explica', 'Mi entrenador explica claro lo que hay que hacer.'],
  ['explica', 'Me enseña con ejemplos o demostraciones.'],
  ['explica', 'Cuando me corrige, entiendo qué cambiar.'],
  ['trato', 'Me trata con respeto.'],
  ['trato', 'Es justo con todos, no solo con los mejores.'],
  ['trato', 'Me escucha cuando quiero decirle algo.'],
  ['motiva', 'Me motiva a dar lo mejor.'],
  ['motiva', 'Siento que estoy mejorando con él.'],
  ['motiva', 'Confío en sus decisiones (alineación, cambios, posiciones).'],
  ['orden', 'Los entrenos empiezan a tiempo y están organizados.'],
  ['orden', 'Avisa a tiempo de cambios, partidos y torneos.'],
];
export const MES_OPEN = [['gusta', '¿Qué es lo que más te gusta de los entrenos?'], ['cambia', '¿Qué cambiarías o mejorarías?'], ['aprender', '¿Qué te gustaría aprender o practicar más?']];
export const NPS_Q = '¿Qué tanto le recomendarías el equipo a un amigo? (0 a 10)';
export function scoreMes(ans) {
  const by = {};
  MES_Q.forEach(([c], i) => { const v = val(ans, i); if (v != null) (by[c] ||= []).push(v); });
  const cats = Object.keys(MES_CATS).map((k) => ({ k, name: MES_CATS[k], avg: by[k]?.length ? by[k].reduce((a, b) => a + b, 0) / by[k].length : null })).filter((x) => x.avg != null);
  return { cats, nps: Number.isFinite(Number(ans?.nps)) && ans?.nps !== '' ? Number(ans.nps) : null };
}
// Promedio por categoría de un conjunto de encuestas mensuales y NPS (promotores 9-10 menos detractores 0-6).
export function monthSummary(rows) {
  const by = {}, nps = [];
  for (const r of rows) { const s = scoreMes(r.answers); for (const c of s.cats) (by[c.k] ||= []).push(c.avg); if (s.nps != null) nps.push(s.nps); }
  const cats = Object.keys(MES_CATS).map((k) => ({ k, name: MES_CATS[k], avg: by[k]?.length ? by[k].reduce((a, b) => a + b, 0) / by[k].length : null }));
  const npsScore = nps.length ? Math.round(((nps.filter((x) => x >= 9).length - nps.filter((x) => x <= 6).length) / nps.length) * 100) : null;
  const all = cats.filter((c) => c.avg != null);
  return { n: rows.length, cats, nps: npsScore, npsN: nps.length, avg: all.length ? all.reduce((a, b) => a + b.avg, 0) / all.length : null };
}

// ---------- catálogo de tests ----------
export const TESTS = [
  { kind: 'posicion', name: 'Mi posición ideal', icon: 'target', min: 3, desc: 'Lo que te gusta en la cancha. Junto con tus pruebas físicas y tus fundamentos, te dice tus 2 mejores posiciones.' },
  { kind: 'mente', name: 'Mi mente en la cancha', icon: 'brain', min: 5, desc: 'Presión, errores, concentración, confianza, metas, calma y cómo tomas las correcciones.' },
  { kind: 'motivo', name: '¿Por qué juego?', icon: 'flame', min: 3, desc: 'Qué te mueve: mejorar, ganar o las dos. Ayuda a tu entrenador a saber cómo motivarte.' },
  { kind: 'autoeval', name: 'Cómo me veo', icon: 'scale', min: 2, desc: 'Califícate en cada fundamento y compáralo con lo que ve tu entrenador.' },
  { kind: 'rol', name: 'Mi rol en el equipo', icon: 'users', min: 2, desc: '¿Eres la voz, el motor, el estratega o el ancla del equipo?' },
  { kind: 'correccion', name: 'Cómo me gusta que me corrijan', icon: 'message-circle', min: 1, desc: 'Para que tu entrenador te corrija como mejor te funciona.' },
];
export const TEST_BY = Object.fromEntries(TESTS.map((t) => [t.kind, t]));

export const PERFIL_SOURCES = [
  ['Milić y cols. (2017): estatura y forma del cuerpo distinguen posiciones en voleibolistas de 13 a 15 años', 'https://www.pubmed.gov/28416892/'],
  ['Milić y cols. (2024): alcance, envergadura, salto y lanzamiento distinguen posiciones en la selección U17 de Serbia', 'https://doi.org/10.3390/app142311197'],
  ['Características físicas de 562 voleibolistas de 14 años según su posición (2019)', 'https://acikerisim.baskent.edu.tr/items/27595762-1eee-4a99-bc6f-1cd0dad36e47'],
  ['Graupera y cols. (2011): versión española del ACSI-28 (habilidades psicológicas del deportista)', 'https://www.psicothema.com/pi?pii=3914'],
  ['López-Walle y cols. (2011): el TEOSQ (orientación a la tarea y al ego) en jóvenes deportistas mexicanos y españoles', 'https://core.ac.uk/download/76591683.pdf'],
];
