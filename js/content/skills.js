// Habilidades, fases de aprendizaje y posiciones.
// Las cuatro fases (iniciación, adquisición, consolidación, refinamiento) siguen la terminología de la
// federación de voleibol de Luxemburgo (modelo LTAD). Los descriptores de cada fase son propuesta de Remate.

export const PHASES = [
  { n: 1, name: 'Iniciación', desc: 'Primer contacto con el gesto. Sale con ayuda, sin oposición y con balón controlado.' },
  { n: 2, name: 'Adquisición', desc: 'El gesto ya se reconoce y funciona en situaciones controladas.' },
  { n: 3, name: 'Consolidación', desc: 'El gesto es estable y repetible con oposición, cansancio y juego real.' },
  { n: 4, name: 'Refinamiento', desc: 'El gesto es eficiente y se adapta al rival; decide con lectura de juego.' },
];

export const SKILLS = [
  { id: 'saque', name: 'Saque', desc: 'Poner el balón en juego desde detrás de la línea de fondo.',
    phases: [
      'Saque por abajo o de lado desde cerca de la red; el balón pasa con ayuda de la distancia.',
      'Saque por abajo o por arriba desde la línea de fondo; pasa la red con regularidad, aún sin dirección.',
      'Saque flotado dirigido a zonas; falla poco y mantiene la técnica en juego.',
      'Saque flotado o con salto adaptado al receptor, al marcador y a la rotación; presiona la recepción.',
    ] },
  { id: 'recepcion', name: 'Recepción', desc: 'Controlar el saque rival y dirigirlo al colocador.',
    phases: [
      'Plataforma de antebrazos estable; controla un balón lanzado suave, de frente y sin desplazarse.',
      'Se desplaza uno o dos pasos y dirige el balón hacia el colocador en saques controlados.',
      'Recibe saques flotados en formación (3 o 4 receptores); la mayoría llegan a la zona del colocador.',
      'Recibe saques fuertes o con salto, comunica y se ajusta; mantiene la calidad aun en posiciones incómodas.',
    ] },
  { id: 'colocacion', name: 'Colocación', desc: 'Preparar el balón para el atacante, normalmente con los dedos.',
    phases: [
      'Toque de dedos sobre la frente con base estable; pasa corto a un compañero cercano.',
      'Coloca a distancia media, de frente y de espaldas, llegando con los pies debajo del balón.',
      'Coloca tras recepción real a las zonas 4 y 2 con altura y velocidad adecuadas.',
      'Distribuye con variedad (alto, rápido, atrás, salto), disimula y resuelve balones fuera de sistema leyendo al bloqueo.',
    ] },
  { id: 'remate', name: 'Remate', desc: 'Atacar el balón por encima de la red.',
    phases: [
      'Aproximación de dos o tres pasos y golpe con la mano abierta a un balón sostenido o lanzado.',
      'Aproximación completa con salto sobre un pase alto controlado; el balón cae dentro de la cancha.',
      'Remata desde zona 4 contra bloqueo simple variando la dirección (diagonal y línea).',
      'Ataca con variedad (potencia, ritmo, finta, uso del bloqueo) desde distintas zonas y con combinaciones.',
    ] },
  { id: 'bloqueo', name: 'Bloqueo', desc: 'Frenar el ataque rival con las manos sobre la red.',
    phases: [
      'Posición frente a la red con las manos arriba; salta recto sin tocar la red.',
      'Se desplaza de lado y salta con las manos penetrando sobre la red, sin tocarla.',
      'Bloqueo individual leyendo al colocador; cierra diagonal o línea; inicia el bloqueo en pareja.',
      'Bloqueo en pareja o trío coordinado; decide cuándo bloquear y cuándo retirarse a defender.',
    ] },
  { id: 'defensa', name: 'Defensa', desc: 'Controlar el remate rival para poder contraatacar.',
    phases: [
      'Posición baja de defensa; controla con plataforma un balón lanzado con fuerza moderada.',
      'Se desplaza y defiende remates suaves del entrenador; se levanta rápido.',
      'Defiende remates de potencia media en su zona (6, 5 o 1) con cobertura básica y recuperación.',
      'Defiende leyendo al atacante y al bloqueo; rollos y planchas controladas; cubre el ataque propio.',
    ] },
  { id: 'fisico', name: 'Físico', desc: 'Salto, fuerza, velocidad, movilidad y cuidado del cuerpo.',
    phases: [
      'Aterriza a dos pies amortiguando, con las rodillas alineadas; se mueve y salta con control.',
      'Sentadilla, zancada y plancha con buena técnica; aterrizajes controlados en saltos continuos.',
      'Sigue un plan de fuerza y saltos con progresión; controla rodilla y tronco al aterrizar a una pierna.',
      'Fuerza y potencia especializadas; salto con aproximación eficiente; se calienta y se cuida por su cuenta.',
    ] },
  { id: 'juego', name: 'Juego', desc: 'Reglas, rotación, lectura del juego y comunicación.',
    phases: [
      'Conoce las reglas básicas, las zonas y la rotación; juega 2 contra 2 o 3 contra 3 con ayuda.',
      'Juega 4 contra 4 usando tres contactos; llama el balón ("mía") y se coloca según la rotación.',
      'Juega 6 contra 6 con sistema básico (4-2 o 6-2); cubre el ataque y lee dónde caerá el balón.',
      'Aplica un plan táctico, reconoce patrones del rival y decide bajo presión; comunica y lidera.',
    ] },
];
export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const SKILL_IDS = SKILLS.map((s) => s.id);

export const POSITIONS = [
  { id: 'sin_definir', name: 'Sin definir' },
  { id: 'colocador', name: 'Colocador(a)' },
  { id: 'opuesto', name: 'Opuesto(a)' },
  { id: 'central', name: 'Central' },
  { id: 'punta', name: 'Punta' },
  { id: 'libero', name: 'Líbero' },
];
export const POSITION_NAME = Object.fromEntries(POSITIONS.map((p) => [p.id, p.name]));

// Ajuste de lo que se exige a cada posición. null = no aplica; número = suma o resta de fases.
// Propuesta de Remate; es normal que un líbero no remate ni bloquee, o que un central bloquee más.
export const POSITION_ADJUST = {
  libero:    { remate: null, bloqueo: null, recepcion: 1, defensa: 1 },
  colocador: { colocacion: 1, remate: -1, bloqueo: -1 },
  central:   { bloqueo: 1, recepcion: -1, defensa: -1, colocacion: -1 },
  opuesto:   { recepcion: -1 },
};

export const BRANCHES = { F: 'Femenil', M: 'Varonil' };
export const HANDS = { der: 'Derecha', izq: 'Izquierda' };
