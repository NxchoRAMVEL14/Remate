// Ayuda: cómo usar Remate, cómo funcionan niveles y asistencia, y de dónde sale cada cosa.
import { h, ic, fmtDate } from '../util.js';
import { ls } from '../store.js';
import { sectionTitle } from './ui.js';
import { XP_RULES } from '../calc.js';
import { VERSION, CHANGELOG } from '../version.js';

const link = (href, text) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text);
const list = (items) => h('ul', { class: 'plain' }, items.filter(Boolean).map((x) => h('li', {}, x)));

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
  'En Ejercicios → Para hacer en casa ves las rutinas opcionales que tienen tus jugadores y quién está entrenando en casa. Desde ahí (o la ficha) le dejas a cada uno su tarea de casa.',
  'Ayudantes: marca a un jugador como Capitán en su ficha, o invita a un asistente adulto en Ajustes → Equipo de apoyo. Pueden pasar lista y capturar partidos; nunca ven notas, evaluaciones, reportes ni tu laboratorio.',
  'En un partido, pon la alineación de cada set: Remate sigue la rotación y te dice side-out, break point y en qué rotación pierden más puntos.',
  'En Entrenamientos → Planear temporada divides la temporada en bloques con enfoque; cada bloque crea sus entrenamientos con las plantillas que elijas.',
  'Avisos: desde Hoy publicas un aviso que aparece en el Inicio de tus jugadores, se puede mandar por WhatsApp y llega como notificación a quien la activó.',
];
const PLAYER_STEPS = [
  'En Inicio ves tu tarjeta: tu nivel, tu radar de habilidades y lo que falta para subir.',
  'En Entrenos ves el plan de cada entrenamiento que tu entrenador publica y tu asistencia.',
  'En Ejercicios hay una explicación de cada ejercicio, con diagrama. Filtra por “Mi nivel” para ver los que te tocan.',
  'En Ruta ves los seis niveles y los retos. Cuando cumplas un reto, pide la aprobación; tu entrenador lo revisa.',
  'En Partidos ves los resultados de tu equipo y tus propios números en cada partido. Los de tus compañeros no se muestran.',
  'En Inicio → Entrena en casa hay rutinas opcionales de físico y de técnica con y sin balón, a tu nivel. Si quieres, registra lo que hiciste: solo tú y tu entrenador lo ven.',
  'En Partidos contestas la convocatoria (Voy, En duda, No voy) y ves el video y tus números de cada partido.',
  'En Inicio ves tus insignias, tus pruebas físicas y los avisos del entrenador. En Ajustes puedes activar las notificaciones.',
];

export default function ayuda(ctx) {
  const coach = ctx.role === 'coach';
  const el = h('div', { class: 'page help' },
    h('section', {}, h('h2', {}, coach ? 'Primeros pasos' : 'Cómo usar Remate'), h('ol', { class: 'plain' }, (coach ? COACH_STEPS : PLAYER_STEPS).map((x) => h('li', {}, x)))),
    h('section', {}, h('h2', {}, 'Cómo funcionan los niveles'),
      h('p', {}, 'Cada habilidad (saque, recepción, colocación, remate, bloqueo, defensa, físico y juego) se evalúa en cuatro fases: iniciación, adquisición, consolidación y refinamiento. Cada nivel pide una fase mínima por habilidad y un examen práctico.'),
      h('p', {}, 'Las fases dicen cuándo conviene presentar el examen; el examen decide si se sube. Así el nivel no cambia solo por cumplir una lista, sino por demostrarlo jugando.'),
      h('p', {}, 'Las exigencias se ajustan a la posición: un líbero no se mide en remate ni bloqueo, y se le pide una fase más en recepción y defensa; un central, una más en bloqueo.')),
    h('section', {}, h('h2', {}, coach ? 'El radar de cada jugador' : 'Tu radar'),
      h('p', {}, 'El radar dibuja las 8 habilidades. Del centro a la orilla van las 4 fases; el relleno amarillo es la última evaluación y la línea punteada, lo que pide el siguiente nivel según la posición.'),
      h('p', {}, coach ? 'Cada jugador tiene en su tarjeta el botón «¿Qué dice mi radar?», con la explicación detallada de dónde va, qué le falta y cómo mejorar. Desde la ficha del jugador puedes ver exactamente lo que él lee.'
        : h('span', {}, 'En tu tarjeta de Inicio está el botón ', h('a', { href: '#/radar' }, '«¿Qué dice mi radar?»'), ': te explica habilidad por habilidad en qué vas, qué te falta para el siguiente nivel y qué hacer para mejorar.'))),
    h('section', {}, h('h2', {}, 'Teoría'),
      h('p', {}, coach ? 'En Entrenamientos (y en Más) está Teoría: 24 lecciones cortas con quiz para tus jugadores. Al aprobar el examen de un módulo con 8 de 10, el jugador te pide su reto de teoría y tú lo apruebas como cualquier reto. El avance de cada quiz se guarda en el celular de cada jugador.'
        : h('span', {}, 'En Entrenos está ', h('a', { href: '#/teoria' }, 'Teoría'), ': lecciones cortas de reglas, técnica, sistemas y táctica. Cada una cierra con un quiz. Con 8 de 10 en el examen de un módulo, puedes pedirle a tu entrenador tu reto de teoría.')),
      h('p', {}, 'Para volver a estudiar todo: «Repaso general» trae 20 preguntas mezcladas de los 4 módulos y «Mis errores» junta las preguntas que fallaste hasta que las contestes bien. «Empezar de nuevo» borra el avance de Teoría en ese celular (los retos aprobados se quedan).'),
      coach ? h('p', {}, 'Antes y después: en la ficha del jugador compara dos fechas de evaluación. La hoja se imprime o se guarda en PDF para las juntas con familias.') : null,
      coach ? h('p', {}, 'Mi perfil de jugador (en Más o en Jugadores): si juegas con ellos, por ejemplo en un equipo mixto, crea tu ficha o elige la tuya de la lista. Al entrar tienes tu tarjeta, radar, Teoría con tu propio avance, En casa, retos y convocatorias, como cualquier jugador. «Volver a entrenador» te regresa a tu vista.') : null),
    h('section', {}, h('h2', {}, 'Asistencia y puntos XP'),
      list(['Presente suma asistencia completa, retardo también cuenta como asistencia, falta resta y justificada no resta.',
        'Cada cierto número de retardos (lo eliges en Ajustes) se cuenta como una falta.',
        `Los puntos XP son un reconocimiento al compromiso: ${XP_RULES.presente} por entrenamiento a tiempo, ${XP_RULES.retardo} con retardo, los de cada reto aprobado y ${XP_RULES.examen} por cada examen aprobado. No cambian el nivel.`])),
    h('section', {}, h('h2', {}, 'Partidos y estadística'),
      list(['Recepción: 3 perfecta (el colocador puede elegir cualquier opción), 2 buena, 1 mala (solo una bola alta), 0 error. El promedio va de 0 a 3.',
        'Eficiencia de ataque = (remates punto − errores − bloqueados) ÷ remates totales. Un número positivo significa que tu ataque gana más puntos de los que regala.',
        'Con el marcador automático, cada ace, remate punto, bloqueo punto o error suma el punto solo. Si lo apagas, usa los botones +1.',
        'Los sets van a 25 con diferencia de 2 y el decisivo a 15, como en las reglas FIVB. Si tu liga usa otro formato, cierra el set cuando corresponda y termina el partido a mano.',
        coach ? 'Hoja para la mesa: en un partido, el ícono de impresora arma una hoja por set con las posiciones I a VI, el líbero y el orden de saque. Si recibes primero, tu primer saque es de la posición II. Puedes dejar listas las alineaciones de todos los sets antes del partido.' : null,
        coach ? 'Scouting de rivales (en Partidos): una ficha privada por rival con sus jugadores clave, a dónde sacan, su sistema, su rotación débil y tu plan, más tu side-out, tu rotación más débil y dónde les haces daño en tus partidos contra ellos.' : null,
        'Calendario en el celular (en Entrenos): suscríbete una vez y los entrenamientos publicados, partidos y torneos llegan a tu calendario con aviso, aunque no abras Remate. También puedes descargar un archivo .ics.',
        coach ? 'Torneos (en Partidos): crea el torneo con sede, fechas y rama, elige a los convocados y ellos confirman desde su celular. Agrega los partidos del torneo, escribe la tabla (tu fila se llena con tus partidos) y al final pon el lugar. Puedes filtrar por rama.' : 'Torneos: en Partidos ves los torneos de tu equipo. Si estás convocado, contesta si vas.',
        coach ? 'Equipos A y B (en Ajustes → Equipos): divide tu grupo en dos o más equipos, por ejemplo «CETAC A» y «CETAC B». Cada jugador y cada partido es de un equipo; en Jugadores y Partidos filtras por equipo y en un torneo eliges cuáles de tus equipos juegan.' : null,
        coach ? 'Eliminación directa: al crear el torneo elige «Eliminación directa» y arma el cuadro con la primera ronda y los pases directos. Remate arma semifinales y final; toca al ganador de cada partido o captura los tuyos y el ganador avanza solo.' : 'Eliminación directa: en el torneo ves el cuadro con quién va ganando cada partido y quién avanza.',
        coach ? 'Leer de una imagen (en Partidos → Torneos): sube la foto o captura del cartel o del rol de juegos. El lector de texto corre en tu celular, es gratis y la primera vez descarga unos 5 MB. Propone nombre, rama, partidos, horarios y pases directos; revisa y corrige antes de crear, porque el lector se puede equivocar con letras decoradas.' : null,
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
        h('li', {}, 'Reglas de juego: ', link('https://www.fivb.com/volleyball/the-game/official-volleyball-rules/', 'reglas oficiales FIVB 2025-2028'), ' (', link('https://www.fivb.com/wp-content/uploads/2025/01/FIVB-Volleyball_Rules2025_2028-SP-v02.pdf', 'versión en español'), '). Las lecciones de reglas de Teoría citan el número de cada regla; por ejemplo, desde 2025 solo el equipo que recibe tiene que estar en orden de rotación al momento del saque (regla 7.4).'),
        h('li', {}, 'Tiempos de ataque (primer, segundo y tercer tiempo) y complejos de juego (K1 y K2): J. Bellendier, ', link('https://efdeportes.com/efd51/ataque1.htm', '«Ataque de rotación en el voleibol, un enfoque actualizado»'), ', EFDeportes, 2002.'),
        h('li', {}, 'Lecciones de técnica, sistemas, táctica y su quiz, y la hoja de antes y después: propuestas de Remate basadas en práctica común de entrenamiento.'),
        h('li', {}, 'Pruebas de reglas de la FIVB para 2026 (por ejemplo, ocho sustituciones por set en algunas competencias): ', link('https://norceca.info/fivb-board-of-administration-approves-rule-tests-for-2026-competitions/', 'NORCECA'), '.'),
        h('li', {}, 'Escala de recepción de 0 a 3 y eficiencia de ataque: son las medidas más comunes en la estadística de voleibol; la forma exacta de capturarlas en Remate es propia.'),
        h('li', {}, 'Calentamiento preventivo: el calentamiento VolleyVeilig redujo las lesiones agudas y de brazo en voleibolistas jóvenes (Verhagen y cols., ', link('https://repository.up.ac.za/items/2d4f3fb9-f759-42d4-beae-174527228417', 'British Journal of Sports Medicine, 2023'), '); el entrenamiento de equilibrio redujo los esguinces de tobillo repetidos en voleibol (', link('https://pubmed.ncbi.nlm.nih.gov/15310562/', 'Verhagen y cols., 2004'), '); y el programa de hombro del OSTRC redujo los problemas de hombro en deportes de lanzamiento (', link('https://bjsm.bmj.com/content/51/14/1073', 'Andersson y cols., 2017'), '). Los tres calentamientos de Remate toman ideas de ellos; no son copia exacta de ningún programa.'),
        h('li', {}, 'Calendario: formato iCalendar (.ics). En iPhone, un calendario suscrito avisa si no activas «Quitar alarmas»; en Google Calendar, los avisos de un calendario suscrito se eligen en su configuración.'),
        h('li', {}, 'Prueba de velocidad de 10 m (salida parada, tres intentos con descanso; mejor con fotoceldas que con cronómetro): ', link('https://www.scienceforsport.com/10m-sprint-test/', 'Science for Sport, «10m Sprint Test»'), '.'),
        h('li', {}, 'Prueba de agilidad T: ', link('https://www.topendsports.com/testing/tests/t-test.htm', 'descripción del protocolo'), ', con la referencia de Pauole y colaboradores (J Strength Cond Res, 2000) sobre su confiabilidad.'),
        h('li', {}, 'Notificaciones: usan Web Push con una función de Supabase (', link('https://supabase.com/docs/guides/functions', 'Edge Functions'), '). En iPhone solo llegan con la app instalada en la pantalla de inicio.'),
        h('li', {}, 'Side-out, break point, insignias, bloques de temporada y tareas de casa: propuestas de Remate basadas en práctica común de entrenamiento, no en un estudio.'),
        h('li', {}, 'Leer de una imagen: ', link('https://github.com/naptha/tesseract.js', 'Tesseract.js'), ' (licencia Apache 2.0), el motor de texto Tesseract compilado para el navegador; corre en tu celular y la imagen no se manda a ningún servidor. Los datos de idioma español se descargan de ', link('https://www.jsdelivr.com/package/npm/@tesseract.js-data/spa', 'jsDelivr'), '. La forma de reconocer partidos, horarios y pases directos es propia de Remate.'))),
    h('section', {}, h('h2', {}, 'Versión'),
      h('p', {}, `Estás usando Remate ${VERSION}. `, h('a', { href: '#/novedades' }, 'Ver qué cambió en cada versión'), '.')),
    h('section', { class: 'note warn' }, h('strong', {}, 'Importante: '), 'Remate no sustituye a un médico ni a un entrenador titulado. Si un jugador siente dolor, se detiene. Si dudas de una carga o de una lesión, consulta a un profesional.'));
  return { title: 'Ayuda', el };
}

// ---------- Novedades: versión actual y qué cambió en cada versión (antes js/views/novedades.js) ----------
// Última versión que este celular ya vio. Sirve para avisar una sola vez cuando Remate se actualiza.
export const SEEN_KEY = 'remate.version.vista';
export const markSeen = () => ls.set(SEEN_KEY, VERSION);
export const unseenUpdate = () => { const v = ls.get(SEEN_KEY); return !!v && v !== VERSION; };
export const firstRun = () => !ls.get(SEEN_KEY);

const when = (f) => fmtDate(f, { day: 'numeric', month: 'long', year: 'numeric' });

// Bloque "Acerca de Remate" para Ajustes (todos los roles).
export const aboutSection = () => h('section', { class: 'stack' }, sectionTitle('Acerca de Remate'),
  h('div', { class: 'rows' }, h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, `Versión ${VERSION}`), h('span', { class: 'row-sub' }, `Actualizada el ${when(CHANGELOG[0].f)}`)),
    h('a', { class: 'btn sm', href: '#/novedades' }, ic('sparkles', 18), 'Ver novedades'))));

// Aviso de una sola vez después de una actualización.
export function updateBanner(onClose) {
  const close = () => { markSeen(); onClose(); };
  return h('div', { class: 'updbar', role: 'status' },
    h('span', {}, ic('sparkles', 18), ` Remate se actualizó a la versión ${VERSION}.`),
    h('span', { class: 'cluster' }, h('a', { class: 'btn sm', href: '#/novedades', onclick: () => markSeen() }, 'Ver novedades'),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Cerrar aviso', onclick: close }, ic('x', 20))));
}

export function novedades(ctx) {
  markSeen();
  const back = ctx.role === 'coach' ? '#/ajustes' : null;
  const el = h('div', { class: 'page' },
    h('section', { class: 'band next stack' }, h('span', { class: 'when' }, 'Estás usando'), h('h2', {}, `Remate ${VERSION}`),
      h('p', { style: { margin: 0 } }, 'Cuando subes una versión nueva a GitHub, cada celular la descarga sola al abrir Remate con internet. Si no la ves, cierra la app por completo y vuelve a abrirla.')),
    h('section', { class: 'stack' }, sectionTitle('Qué cambió'),
      h('ol', { class: 'changelog' }, CHANGELOG.map((c, i) => h('li', { class: 'panel' },
        h('div', { class: 'cl-head' }, h('strong', {}, `Versión ${c.v}`), i === 0 ? h('span', { class: 'chip ball' }, 'Actual') : null, h('span', { class: 'row-sub' }, when(c.f))),
        h('p', {}, c.t))))),
    h('p', { class: 'row-sub' }, 'Las versiones siguen la forma mayor.menor.corrección: el primer número cambia con funciones grandes, el segundo con mejoras y el tercero con arreglos.'));
  return { title: 'Novedades', back, el };
}
