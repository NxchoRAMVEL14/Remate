// Programa de salto vertical del entrenador: 12 semanas, 4 bloques de 3 semanas, dos sesiones por semana (A y B).
// Las series, repeticiones y el tope de saltos por sesión son una propuesta de Remate (ver Ayuda), no cifras de un estudio.
import LAB from './lab-ex.js';

export const LAB_EXERCISES = LAB;
export const LAB_BY_ID = Object.fromEntries(LAB.map((e) => [e.id, e]));

// sets: series por cada semana del bloque [semana 1, semana 2, semana 3]. reps: repeticiones (o segundos) por serie.
// unit: lo que significa "reps". sides: 2 si cada serie se hace de los dos lados (cuenta doble en saltos).
const it = (ex, sets, reps, rest, note = '', extra = {}) => ({ ex, sets, reps, rest, note, ...extra });

export const PROGRAM = [
  { id: 'base', name: 'Base', weeks: '1 a 3', cap: 30,
    goal: 'Aprender los movimientos, ganar movilidad y empezar a fortalecer sin saltos fuertes.',
    feel: 'Termina cada sesión con ganas de hacer una serie más. Aquí se construye el cimiento.',
    A: { title: 'Sesión A: fuerza de pierna', items: [
      it('lab-mobility', [1, 1, 1], 1, '—', 'Una ronda completa.', { unit: 'ronda' }),
      it('lab-sq-tempo', [3, 3, 4], 8, '90 s', 'Baja en 3 segundos, pausa de 1 segundo.'),
      it('lab-split', [2, 3, 3], 6, '90 s', 'Por pierna. Empieza por la pierna más débil.', { unit: 'por pierna' }),
      it('lab-calf', [2, 3, 3], 10, '60 s', 'Por pierna, bajada de 3 segundos.', { unit: 'por pierna' }),
      it('lab-hipflex-polaina', [2, 2, 3], 8, '45 s', 'Por pierna, con polaina solo si el tronco no se mueve.', { unit: 'por pierna' }),
    ] },
    B: { title: 'Sesión B: aterrizaje y cadera', items: [
      it('lab-mobility', [1, 1, 1], 1, '—', 'Una ronda completa.', { unit: 'ronda' }),
      it('lab-land', [3, 4, 5], 5, '45 s', 'Aterriza en silencio y sostén 2 segundos.'),
      it('lab-sl-rdl', [2, 3, 3], 8, '60 s', 'Por pierna.', { unit: 'por pierna' }),
      it('lab-iso-split', [2, 3, 3], 30, '60 s', 'Segundos por pierna.', { unit: 'segundos por pierna' }),
      it('lab-abd-polaina', [2, 3, 3], 10, '45 s', 'Por lado, sin girar la cadera.', { unit: 'por lado' }),
    ] },
    weekNotes: ['Semana 1: aprende la técnica y mide tu punto de partida (pruebas).', 'Semana 2: sube una serie en lo que se sienta fácil.', 'Semana 3: la última de la fase; cuida el sueño y la comida.'] },

  { id: 'fuerza', name: 'Fuerza', weeks: '4 a 6', cap: 50,
    goal: 'Más fuerza en una pierna y primeros saltos rígidos y cortos.',
    feel: 'Debes sentir las piernas trabajadas pero poder caminar normal al día siguiente.',
    A: { title: 'Sesión A: fuerza', items: [
      it('lab-mobility', [1, 1, 1], 1, '—', 'Una ronda completa.', { unit: 'ronda' }),
      it('lab-sq-tempo', [3, 4, 4], 6, '2 min', 'Baja en 4 segundos. Si te sobra, usa una mochila con peso.'),
      it('lab-split', [3, 3, 4], 6, '2 min', 'Por pierna, pausa de 2 segundos abajo.', { unit: 'por pierna' }),
      it('lab-nordic', [2, 2, 3], 4, '90 s', 'Frena la caída lo más posible. Empieza con pocas.'),
      it('lab-calf', [3, 3, 3], 10, '60 s', 'Por pierna, bajada de 4 segundos.', { unit: 'por pierna' }),
    ] },
    B: { title: 'Sesión B: rigidez y control', items: [
      it('lab-mobility', [1, 1, 1], 1, '—', 'Una ronda completa.', { unit: 'ronda' }),
      it('lab-land', [3, 3, 3], 5, '45 s', 'Sube a 30 cm si los 20 cm salen silenciosos.'),
      it('lab-pogo', [3, 3, 4], 8, '45 s', 'Contacto corto, rodillas casi estiradas.'),
      it('lab-sl-rdl', [3, 3, 3], 8, '60 s', 'Por pierna, bajada de 4 segundos.', { unit: 'por pierna' }),
      it('lab-iso-split', [3, 3, 3], 40, '60 s', 'Segundos por pierna.', { unit: 'segundos por pierna' }),
      it('lab-curl-polaina', [2, 3, 3], 10, '45 s', 'Por pierna, bajada de 4 segundos.', { unit: 'por pierna' }),
    ] },
    weekNotes: ['Semana 4: cambia de bloque; baja un poco la ambición del primer día.', 'Semana 5: la semana más exigente de fuerza. Mide tu salto (pruebas).', 'Semana 6: igual que la 5; si el cuerpo se queja, quédate con las series de la semana 4.'] },

  { id: 'potencia', name: 'Potencia', weeks: '7 a 9', cap: 70,
    goal: 'Convertir la fuerza en velocidad: saltos máximos, saltos sobre conos y reactividad.',
    feel: 'Pocas repeticiones, buena calidad y descanso completo. Si ya no saltas alto, termina.',
    A: { title: 'Sesión A: salto máximo', items: [
      it('lab-mobility', [1, 1, 1], 1, '—', 'Una ronda completa.', { unit: 'ronda' }),
      it('lab-cmj', [4, 5, 5], 3, '60 s', 'Máxima intención en cada salto.'),
      it('lab-hurdle', [3, 3, 4], 5, '90 s', 'Conos bajos, contacto corto.'),
      it('lab-split', [3, 3, 3], 5, '2 min', 'Por pierna, con mochila con peso.', { unit: 'por pierna' }),
      it('lab-nordic', [3, 3, 3], 4, '90 s', 'Frena la caída lo más posible.'),
    ] },
    B: { title: 'Sesión B: reactividad', items: [
      it('lab-mobility', [1, 1, 1], 1, '—', 'Una ronda completa.', { unit: 'ronda' }),
      it('lab-dj', [3, 3, 4], 3, '60 s', 'Desde 20 a 30 cm. Contacto corto y sube lo más alto posible.'),
      it('lab-bound', [3, 3, 4], 4, '60 s', 'Por lado, estabiliza 1 segundo al aterrizar.', { unit: 'por lado', sides: 2 }),
      it('lab-pogo', [3, 3, 3], 8, '45 s', 'Contacto corto.'),
      it('lab-calf', [3, 3, 3], 8, '60 s', 'Por pierna, bajada de 4 segundos.', { unit: 'por pierna' }),
      it('lab-abd-polaina', [2, 3, 3], 10, '45 s', 'Por lado.', { unit: 'por lado' }),
    ] },
    weekNotes: ['Semana 7: empieza la pliometría de verdad. Mantén las series bajas.', 'Semana 8: sube una serie solo si los saltos salen limpios.', 'Semana 9: la más exigente del bloque. Mide tu salto (pruebas).'] },

  { id: 'transferencia', name: 'Transferencia', weeks: '10 a 12', cap: 60,
    goal: 'Llevar el salto al juego: remate con aproximación y bloqueo, y bajar la carga antes de la prueba final.',
    feel: 'Menos volumen y más calidad. La semana 12 es de descarga: llegas fresco a la prueba final.',
    A: { title: 'Sesión A: remate y bloqueo', items: [
      it('lab-mobility', [1, 1, 1], 1, '—', 'Una ronda completa.', { unit: 'ronda' }),
      it('lab-approach', [4, 5, 3], 4, '90 s', 'Con balón si puedes. Descansa completo.'),
      it('lab-cmj', [3, 4, 3], 3, '60 s', 'Calidad antes que cantidad.'),
      it('lab-block', [3, 4, 3], 6, '90 s', 'Seis saltos seguidos con desplazamiento.'),
      it('lab-sq-tempo', [3, 3, 2], 5, '2 min', 'Con mochila con peso, bajada de 3 segundos.'),
    ] },
    B: { title: 'Sesión B: reactividad y mantenimiento', items: [
      it('lab-mobility', [1, 1, 1], 1, '—', 'Una ronda completa.', { unit: 'ronda' }),
      it('lab-dj', [3, 3, 2], 3, '60 s', 'Mide el tiempo de contacto si usas My Jump.'),
      it('lab-hurdle', [3, 3, 2], 5, '90 s', 'Conos un poco más altos si salen limpios.'),
      it('lab-nordic', [3, 3, 2], 4, '90 s', 'Mantenimiento.'),
      it('lab-sl-rdl', [3, 3, 2], 8, '60 s', 'Por pierna.', { unit: 'por pierna' }),
      it('lab-iso-split', [2, 2, 2], 40, '60 s', 'Segundos por pierna.', { unit: 'segundos por pierna' }),
    ] },
    weekNotes: ['Semana 10: aprende el ritmo de la aproximación; no busques el récord todavía.', 'Semana 11: la semana de más volumen del bloque.', 'Semana 12: descarga. Menos series, y al final haz la prueba final (pruebas).'] },
];

// Semanas del programa en las que se sugiere medir el salto.
export const TEST_WEEKS = [1, 5, 9, 12];

export const sessionOf = (blockIdx, which) => PROGRAM[blockIdx]?.[which] || null;
export const itemSets = (item, weekInBlock) => item.sets[Math.min(2, Math.max(0, weekInBlock - 1))];
export const itemContacts = (item, weekInBlock) => {
  const ex = LAB_BY_ID[item.ex];
  return ex?.contacts ? itemSets(item, weekInBlock) * item.reps * (item.sides || 1) : 0;
};
export const sessionContacts = (session, weekInBlock) => session.items.reduce((a, i) => a + itemContacts(i, weekInBlock), 0);
export const sessionMinutes = (session, weekInBlock) => Math.round(session.items.reduce((a, i) => a + (LAB_BY_ID[i.ex]?.min || 6) * (itemSets(i, weekInBlock) > 1 ? 0.8 + 0.1 * itemSets(i, weekInBlock) : 1), 0));
export const repsText = (item) => `${item.reps}${item.unit && item.unit !== 'ronda' ? ` ${item.unit}` : ''}`;

export const RULES = [
  'Descansa al menos 48 horas entre sesiones. Dos sesiones por semana bastan.',
  'No saltes con las polainas puestas. Con 5 kg en cada tobillo, son para fuerza de cadera, nunca para saltar.',
  'Calienta siempre (la ronda de movilidad). Los saltos máximos van al inicio de la sesión, con las piernas frescas.',
  'Si una molestia llega a 4 o más dos sesiones seguidas en la misma zona, baja los saltos y consúltalo.',
  'Duerme y come bien en las 48 horas siguientes: ahí es donde se construye la mejora.',
  'Si tu partido o entrenamiento de voleibol ya tuvo muchos saltos esa semana, quita una serie de pliometría. Los saltos del juego también cuentan.',
];

// Cómo medir, paso a paso, con cada método.
export const PROTOCOLS = {
  myjump: ['Pon el celular firme, a la altura de tus pies, a 1 o 2 metros.', 'Graba a la mayor cámara lenta posible y marca el despegue y el aterrizaje en la app.', 'Aterriza con las piernas casi estiradas, en el mismo lugar donde despegaste.', 'Haz 3 intentos con 1 minuto de descanso y anota el mejor.'],
  sargent: ['Marca en la pared tu alcance de pie: brazo estirado hacia arriba, talones en el piso. Anótalo en "Mis datos".', 'Con tiza en los dedos, párate de lado a la pared y salta lo más alto que puedas; marca el punto más alto.', 'La altura que anotas es la marca más alta, no el salto. Remate calcula tu salto restando tu alcance de pie.', 'Haz 3 intentos con 1 minuto de descanso y anota el mejor.'],
  mat: ['Usa siempre el mismo tapete o plataforma, sobre piso firme.', 'Anota la altura que marca el aparato.', 'Haz 3 intentos con 1 minuto de descanso y anota el mejor.'],
  otro: ['Usa siempre el mismo método para poder comparar.', 'Haz 3 intentos con 1 minuto de descanso y anota el mejor.'],
};

// Fuentes del laboratorio de salto (las mismas que aparecen en Ayuda).
export const SOURCES = [
  { t: 'Ramirez-Campillo et al. (2020), Efectos del entrenamiento pliométrico en jugadores de voleibol: metaanálisis. J Sports Sci Med', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7429440/', d: 'Programas con poco volumen y poca frecuencia ya mejoran el salto; conviene individualizar.' },
  { t: 'Validez y confiabilidad de la app My Jump para medir el salto vertical (revisión metaanalítica, 2023)', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10656545/', d: 'Para saber qué tan confiable es medir el salto con el celular.' },
  { t: 'Federación Luxemburguesa de Voleibol, desarrollo a largo plazo del jugador', u: 'https://www.flvb.lu/federation/ltad', d: 'De donde viene la idea de fases por las que pasa cada habilidad.' },
];
