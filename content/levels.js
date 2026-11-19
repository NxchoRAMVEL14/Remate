// Los 6 niveles de la ruta. Cada nivel pide una fase mínima por habilidad ("perfil") y un examen práctico.
// Todos los números son una propuesta de partida: ajústalos a tu grupo (se editan aquí mismo).
import { POSITION_ADJUST } from './skills.js';

const P = (saque, recepcion, colocacion, remate, bloqueo, defensa, fisico, juego) =>
  ({ saque, recepcion, colocacion, remate, bloqueo, defensa, fisico, juego });
const R = (id, skill, text, total, min) => ({ id, skill, text, kind: 'ratio', total, min });
const C = (id, skill, text) => ({ id, skill, text, kind: 'check' });

export const LEVELS = [
  { n: 1, name: 'Primer toque', tag: 'Aprender a controlar el balón',
    desc: 'Todo empieza aquí: plataforma, dedos, primer saque y aterrizar bien. Se juega mucho en parejas y en equipos chicos.',
    focus: ['Plataforma y toque de dedos', 'Saque por abajo', 'Aterrizar y moverse con control', 'Reglas y zonas de la cancha'],
    profile: P(0, 0, 0, 0, 0, 0, 0, 0), exam: [] },

  { n: 2, name: 'Rally', tag: 'Mantener el balón en juego',
    desc: 'Pasa de controlar el balón solo a controlarlo con otros: tres contactos, comunicación y saque que cruza la red.',
    focus: ['Saque desde la línea de fondo', 'Recepción con desplazamiento', 'Colocación a un compañero', 'Juego 3 contra 3 y 4 contra 4'],
    profile: P(2, 2, 1, 1, 1, 1, 1, 1),
    exam: [
      R('n2-saque', 'saque', 'Saque desde la línea de fondo: balones que pasan la red y caen dentro', 10, 6),
      R('n2-recep', 'recepcion', 'Recepción de saques suaves del entrenador: balones que llegan a la zona del colocador (2 × 2 m junto a la red)', 10, 6),
      R('n2-coloc', 'colocacion', 'Pases de dedos a un compañero a 4 m: controlados y a menos de 1 m del compañero', 10, 8),
      C('n2-fis', 'fisico', 'Aterriza 5 saltos seguidos a dos pies, con las rodillas alineadas y sin hacer ruido'),
      C('n2-rot', 'juego', 'Se acomoda sin error en las 6 rotaciones y nombra las zonas 1 a 6'),
    ] },

  { n: 3, name: 'Rotación', tag: 'Jugar 6 contra 6 con orden',
    desc: 'Entra el juego completo: rotación, recepción en formación, ataque con aproximación y defensa de remates suaves.',
    focus: ['Saque por arriba a zonas', 'Recepción en formación', 'Remate con aproximación completa', 'Defensa de remate suave'],
    profile: P(2, 2, 2, 2, 1, 2, 2, 2),
    exam: [
      R('n3-saque', 'saque', 'Saque por arriba desde la línea de fondo: dentro de la cancha', 10, 6),
      R('n3-recep', 'recepcion', 'Recepción de saque por arriba, velocidad media: balones a la zona del colocador', 10, 6),
      R('n3-coloc', 'colocacion', 'Colocaciones a zona 4 tras recepción simulada: altas y a menos de 1 m de la red', 10, 7),
      R('n3-rem', 'remate', 'Remate con aproximación completa sobre pase alto: dentro de la cancha', 10, 6),
      R('n3-def', 'defensa', 'Defensa de remate suave del entrenador: balones controlados', 10, 6),
      C('n3-fis', 'fisico', 'Sentadilla (15 repeticiones) y plancha (45 s) con buena técnica'),
      C('n3-jue', 'juego', 'Juega un set completo 6 contra 6 sin errores de rotación'),
    ] },

  { n: 4, name: 'Ataque', tag: 'Atacar y bloquear con intención',
    desc: 'El juego gana ritmo: saque dirigido, ataque contra bloqueo, primeros bloqueos coordinados y sistema de juego básico.',
    focus: ['Saque flotado a zonas', 'Remate contra bloqueo', 'Bloqueo individual y lectura del colocador', 'Sistema 4-2 o 6-2'],
    profile: P(3, 3, 2, 3, 2, 2, 2, 2),
    exam: [
      R('n4-saque', 'saque', 'Saque flotado: dentro de la cancha', 10, 6),
      R('n4-saquez', 'saque', 'Saque flotado: a la zona indicada por el entrenador', 10, 3),
      R('n4-recep', 'recepcion', 'Recepción de saque flotado: balones a la zona del colocador', 10, 7),
      R('n4-coloc', 'colocacion', 'Colocaciones a zona 4 y zona 2 con altura: a menos de 1 m de la red', 10, 8),
      R('n4-rem', 'remate', 'Remate contra bloqueo simple: dentro de la cancha', 10, 7),
      R('n4-remz', 'remate', 'Remate a la zona indicada (diagonal o línea)', 10, 4),
      R('n4-blo', 'bloqueo', 'Saltos de bloqueo coordinados con el colocador: manos sobre la red, sin tocarla', 10, 7),
      R('n4-def', 'defensa', 'Defensa de remate de potencia media: balones controlados', 10, 6),
      C('n4-fis', 'fisico', 'Aterrizaje a una pierna: 5 por pierna sin que la rodilla se vaya hacia adentro'),
      C('n4-jue', 'juego', 'Juega un set aplicando el sistema del equipo y cubre el ataque'),
    ] },

  { n: 5, name: 'Sistema', tag: 'Jugar como equipo organizado',
    desc: 'Cada quien domina su rol: bloqueo en pareja, defensa organizada, balones fuera de sistema y comunicación constante.',
    focus: ['Bloqueo en pareja', 'Defensa con lectura', 'Colocar fuera de sistema', 'Saque con intención táctica'],
    profile: P(3, 3, 3, 3, 3, 3, 3, 3),
    exam: [
      R('n5-saque', 'saque', 'Saque a la zona indicada contra receptores reales', 10, 5),
      R('n5-recep', 'recepcion', 'Recepción de saque fuerte: balones a la zona del colocador', 10, 7),
      R('n5-coloc', 'colocacion', 'Colocaciones desde balones fuera de sistema: altas hacia zona 4', 10, 6),
      R('n5-rem', 'remate', 'Remate contra bloqueo en pareja: puntos o balón que sigue en juego', 10, 6),
      R('n5-blo', 'bloqueo', 'Bloqueo en pareja coordinado: toques o frenos del ataque', 10, 5),
      R('n5-def', 'defensa', 'Defensa de remate fuerte: balones controlados que permiten contraatacar', 10, 6),
      C('n5-fis', 'fisico', 'Completa el plan de fuerza y prevención del nivel y mejora o mantiene su salto base con buena técnica'),
      C('n5-jue', 'juego', 'Cumple su rol y comunica durante un set completo (lista de verificación del entrenador)'),
    ] },

  { n: 6, name: 'Élite', tag: 'Competir con plan',
    desc: 'Rendimiento: saque y ataque con variedad, decisiones bajo presión, estadística y liderazgo. Se entrena y se cuida como atleta.',
    focus: ['Saque con salto o flotado con intención', 'Ataque con variedad', 'Estadística y análisis del rival', 'Liderazgo y comunicación'],
    profile: P(4, 3, 3, 4, 3, 3, 4, 4),
    exam: [
      R('n6-saque', 'saque', 'Saque con presión (marcador simulado): dentro y a la zona indicada', 10, 6),
      R('n6-recep', 'recepcion', 'Recepción de saque con salto o muy fuerte: balones a la zona del colocador', 10, 7),
      R('n6-coloc', 'colocacion', 'Distribución con variedad (alto, rápido, atrás): balones que el atacante puede rematar', 10, 7),
      R('n6-rem', 'remate', 'Remate con variedad contra bloqueo y defensa organizados: puntos o balón que sigue en juego', 10, 7),
      R('n6-blo', 'bloqueo', 'Bloqueo con lectura: decide bloquear o retirarse a defender, con acierto', 10, 6),
      R('n6-def', 'defensa', 'Defensa leyendo al atacante y al bloqueo: balones que permiten contraatacar', 10, 7),
      C('n6-fis', 'fisico', 'Plan de fuerza, saltos y recuperación llevado de forma autónoma durante el ciclo; sin molestias que limiten'),
      C('n6-jue', 'juego', 'Presenta el análisis de un rival (3 patrones y cómo jugarles) y lidera un calentamiento del equipo'),
    ] },
];
export const LEVEL_BY_N = Object.fromEntries(LEVELS.map((l) => [l.n, l]));

// Fase mínima que se pide a un jugador en una habilidad, según su posición. null = no aplica.
export function required(position, skillId, level) {
  const base = LEVELS[Math.min(6, Math.max(1, level)) - 1].profile[skillId] || 0;
  const adj = POSITION_ADJUST[position]?.[skillId];
  if (adj === null) return null;
  if (typeof adj === 'number' && base > 0) return Math.min(4, Math.max(1, base + adj));
  return base;
}
