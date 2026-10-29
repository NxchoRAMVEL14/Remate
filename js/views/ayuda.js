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
];
const PLAYER_STEPS = [
  'En Inicio ves tu tarjeta: tu nivel, tu radar de habilidades y lo que falta para subir.',
  'En Entrenos ves el plan de cada entrenamiento que tu entrenador publica y tu asistencia.',
  'En Ejercicios hay una explicación de cada ejercicio, con diagrama. Filtra por “Mi nivel” para ver los que te tocan.',
  'En Ruta ves los seis niveles y los retos. Cuando cumplas un reto, pide la aprobación; tu entrenador lo revisa.',
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
        h('li', {}, 'Reglas de juego: ', link('https://www.fivb.com/volleyball/the-game/official-volleyball-rules/', 'reglas oficiales FIVB 2025-2028'), '.'))),
    h('section', { class: 'note warn' }, h('strong', {}, 'Importante: '), 'Remate no sustituye a un médico ni a un entrenador titulado. Si un jugador siente dolor, se detiene. Si dudas de una carga o de una lesión, consulta a un profesional.'));
  return { title: 'Ayuda', el };
}
