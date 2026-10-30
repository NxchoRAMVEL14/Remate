// Ayuda: cómo usar Remate, cómo funcionan niveles y asistencia, y de dónde sale cada cosa.
import { h } from '../util.js';
import { XP_RULES } from '../calc.js';

const link = (href, text) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text);
const list = (items) => h('ul', { class: 'plain' }, items.map((x) => h('li', {}, x)));

const COACH_STEPS = [
  'Entra a Ajustes y elige tus días y hora de entrenamiento.',
  'Agrega a tus jugadores (solo nombre o apodo) y márcales la autorización de su madre, padre o tutor. Al guardar, Remate te muestra su código: se lo das y ellos entran con “Soy jugador”.',
  'Evalúa a cada jugador con la rúbrica de cuatro fases. Así aparece su radar y se sabe qué le falta para subir.',
  'Crea un entrenamiento (o programa varias semanas), aplica una plantilla y ajusta los bloques. Publícalo para que los jugadores lo vean.',
  'El día del entrenamiento usa Modo cancha para llevar el tiempo de cada bloque y pasa lista con un toque por jugador.',
  'Cuando un jugador cumple las fases de su siguiente nivel, aparece en Hoy como “listo para examen”. El nivel solo sube cuando apruebas el examen.',
  'En Partidos crea cada partido y captura en vivo: toca al jugador y luego lo que hizo. El marcador por set se lleva solo.',
  'En Más → Laboratorio está tu espacio: tu programa de salto vertical, tu entrenador de visión de juego y tu bitácora de coaching. Nadie más lo ve.',
  'En Más → Reportes imprimes o guardas en PDF el reporte de cada jugador o del grupo.',
  'El foco de arriba (en cualquier pantalla) anota una mejora para la app en tu lista privada de Mejoras. Cuando quieras pedirlas, cópialas y pégalas en el chat.',
  'En Ejercicios → Para hacer en casa ves las rutinas opcionales que tienen tus jugadores y quién está entrenando en casa.',
];
const PLAYER_STEPS = [
  'En Inicio ves tu tarjeta: tu nivel, tu radar de habilidades y lo que falta para subir.',
  'En Entrenos ves el plan de cada entrenamiento que tu entrenador publica y tu asistencia.',
  'En Ejercicios hay una explicación de cada ejercicio, con diagrama. Filtra por “Mi nivel” para ver los que te tocan.',
  'En Ruta ves los seis niveles y los retos. Cuando cumplas un reto, pide la aprobación; tu entrenador lo revisa.',
  'En Partidos ves los resultados de tu equipo y tus propios números en cada partido. Los de tus compañeros no se muestran.',
  'En Inicio → Entrena en casa hay rutinas opcionales de físico y de técnica con y sin balón, a tu nivel. Si quieres, registra lo que hiciste: solo tú y tu entrenador lo ven.',
];

export default function ayuda(ctx) {
  const coach = ctx.role === 'coach';
  const el = h('div', { class: 'page help' },
    h('section', {}, h('h2', {}, coach ? 'Primeros pasos' : 'Cómo usar Remate'), h('ol', { class: 'plain' }, (coach ? COACH_STEPS : PLAYER_STEPS).map((x) => h('li', {}, x)))),
    h('section', {}, h('h2', {}, 'Cómo funcionan los niveles'),
      h('p', {}, 'Cada habilidad (saque, recepción, colocación, remate, bloqueo, defensa, físico y juego) se evalúa en cuatro fases: iniciación, adquisición, consolidación y refinamiento. Cada nivel pide una fase mínima por habilidad y un examen práctico.'),
      h('p', {}, 'Las fases dicen cuándo conviene presentar el examen; el examen decide si se sube. Así el nivel no cambia solo por cumplir una lista, sino por demostrarlo jugando.'),
      h('p', {}, 'Las exigencias se ajustan a la posición: un líbero no se mide en remate ni bloqueo, y se le pide una fase más en recepción y defensa; un central, una más en bloqueo.')),
    h('section', {}, h('h2', {}, 'Asistencia y puntos XP'),
      list(['Presente suma asistencia completa, retardo también cuenta como asistencia, falta resta y justificada no resta.',
        'Cada cierto número de retardos (lo eliges en Ajustes) se cuenta como una falta.',
        `Los puntos XP son un reconocimiento al compromiso: ${XP_RULES.presente} por entrenamiento a tiempo, ${XP_RULES.retardo} con retardo, los de cada reto aprobado y ${XP_RULES.examen} por cada examen aprobado. No cambian el nivel.`])),
    h('section', {}, h('h2', {}, 'Partidos y estadística'),
      list(['Recepción: 3 perfecta (el colocador puede elegir cualquier opción), 2 buena, 1 mala (solo una bola alta), 0 error. El promedio va de 0 a 3.',
        'Eficiencia de ataque = (remates punto − errores − bloqueados) ÷ remates totales. Un número positivo significa que tu ataque gana más puntos de los que regala.',
        'Con el marcador automático, cada ace, remate punto, bloqueo punto o error suma el punto solo. Si lo apagas, usa los botones +1.',
        'Los sets van a 25 con diferencia de 2 y el decisivo a 15, como en las reglas FIVB. Si tu liga usa otro formato, cierra el set cuando corresponda y termina el partido a mano.',
        coach ? 'Tus jugadores ven el marcador y solo sus propios números. El registro jugada por jugada es solo tuyo.' : 'Tu entrenador captura tus acciones durante el partido; tú ves solo las tuyas.'])),
    coach ? h('section', {}, h('h2', {}, 'Tu laboratorio'),
      list(['Salto vertical: mide tu salto antes de empezar (semana 1) y en las semanas 5, 9 y 12. El programa es de 12 semanas, dos sesiones por semana, con peso corporal, conos, un escalón y tus polainas.',
        'Tus polainas de 5 kg por tobillo son solo para ejercicios de fuerza de cadera y pierna sin impacto. Nunca saltes con ellas: el peso en el tobillo aumenta la carga en rodillas y tobillos al aterrizar.',
        'Visión de juego: rondas cortas de situaciones de partido. Primero busca acertar; después, decidir más rápido. Lleva las mismas preguntas a tus jugadores.',
        'Coaching: escribe en tu bitácora después de cada entrenamiento y haz tu autoevaluación una vez al mes con un solo foco.'])) : null,
    h('section', {}, h('h2', {}, 'Sin internet'),
      h('p', {}, 'Remate guarda tus cambios en el celular y los envía cuando vuelve la conexión. Si ves “por enviar” arriba, no cierres sesión hasta que desaparezca.')),
    h('section', {}, h('h2', {}, 'Qué tan firmes son los números'),
      h('p', {}, 'Los ejercicios, las plantillas y los criterios de examen son propuestas de Remate basadas en las fuentes de abajo y en práctica de entrenamiento. Las cifras concretas (cuántos aciertos de 10, cuántas series o minutos) no salen de un estudio: son un punto de partida para ajustar a tu grupo.'),
      coach ? h('p', {}, 'Puedes cambiar niveles, exámenes y retos editando los archivos de la carpeta js/content; el LEEME explica cómo. Los ejercicios propios se crean desde la pantalla Ejercicios.') : null),
    h('section', {}, h('h2', {}, 'Fuentes'),
      h('ul', { class: 'plain srcs' },
        h('li', {}, 'Fases de aprendizaje (iniciación, adquisición, consolidación, refinamiento): federación de voleibol de Luxemburgo, ', link('https://flvb.lu/federation/ltad', 'modelo de desarrollo a largo plazo del atleta (LTAD)'), '. Los descriptores de cada fase en Remate son propuesta propia.'),
        h('li', {}, 'Salto con pliometría en voleibolistas: Ramirez-Campillo et al., J Sports Sci Med, 2020, ', link('https://pmc.ncbi.nlm.nih.gov/articles/PMC7429440', 'revisión sistemática con metaanálisis'), '. Base para usar poco volumen y adaptarlo a cada jugador.'),
        h('li', {}, 'Medición de salto con el celular: ', link('https://pmc.ncbi.nlm.nih.gov/articles/PMC10656545', '“Validity and reliability of My Jump app to assess vertical jump performance”'), ', revisión metaanalítica de 2023.'),
        h('li', {}, 'Entrenar la toma de decisiones: ', link('https://pmc.ncbi.nlm.nih.gov/articles/PMC7277643', '“The Effect of Decision Training, from a Cognitive Perspective, on Decision-Making in Volleyball”'), ', revisión con metaanálisis de 2020.'),
        h('li', {}, 'Fuerza en menores de edad: ', link('https://pubmed.ncbi.nlm.nih.gov/19620931/', 'declaración de posición de la NSCA sobre entrenamiento de fuerza en jóvenes (2009)'), '. Por eso los ejercicios usan peso corporal, técnica y progresión, con supervisión.'),
        h('li', {}, 'Lesiones frecuentes en jóvenes voleibolistas (tobillo, rodilla, espalda baja, hombro): ', link('https://www.childrenscolorado.org/just-ask-childrens/articles/common-volleyball-injuries-in-young-athletes/', 'Children’s Hospital Colorado'), '. Base de los ejercicios de aterrizaje y prevención.'),
        h('li', {}, 'Reglas de juego: ', link('https://www.fivb.com/volleyball/the-game/official-volleyball-rules/', 'reglas oficiales FIVB 2025-2028'), '.'),
        h('li', {}, 'Pruebas de reglas de la FIVB para 2026 (por ejemplo, ocho sustituciones por set en algunas competencias): ', link('https://norceca.info/fivb-board-of-administration-approves-rule-tests-for-2026-competitions/', 'NORCECA'), '.'),
        h('li', {}, 'Escala de recepción de 0 a 3 y eficiencia de ataque: son las medidas más comunes en la estadística de voleibol; la forma exacta de capturarlas en Remate es propia.'))),
    h('section', { class: 'note warn' }, h('strong', {}, 'Importante: '), 'Remate no sustituye a un médico ni a un entrenador titulado. Si un jugador siente dolor, se detiene. Si dudas de una carga o de una lesión, consulta a un profesional.'));
  return { title: 'Ayuda', el };
}
