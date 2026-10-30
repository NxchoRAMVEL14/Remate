// Coaching: autoevaluación del entrenador y caja de herramientas.
// La rúbrica y los guiones son propuestas de Remate basadas en principios generales del aprendizaje motor y del trabajo con adolescentes.

// Cada aspecto se califica de 1 a 4 (como las fases de los jugadores).
export const ASSESS = [
  { id: 'plan', name: 'Planeación', q: '¿Cada entrenamiento tiene un objetivo claro y un plan escrito?',
    lv: ['Improviso casi siempre', 'Tengo una idea, pero no la escribo', 'Plan escrito con objetivo en la mayoría', 'Plan escrito, objetivo claro y lo ajusto por lo que veo'] },
  { id: 'instr', name: 'Instrucción', q: '¿Tus explicaciones son cortas, con demostración y una clave a la vez?',
    lv: ['Explico mucho y largo', 'A veces demuestro', 'Corto, con demostración casi siempre', 'Menos de 30 segundos, una clave, y los pongo a jugar'] },
  { id: 'feed', name: 'Retroalimentación', q: '¿Tu retroalimentación es específica y les ayuda a corregirse solos?',
    lv: ['Sobre todo "bien" o "mal"', 'Específica, pero casi siempre la doy yo', 'Específica y a veces pregunto primero', 'Pregunto, doy una clave y la retiro poco a poco'] },
  { id: 'active', name: 'Tiempo activo', q: '¿Los jugadores pasan la mayor parte del entrenamiento tocando el balón?',
    lv: ['Mucho tiempo en filas', 'Filas cortas en algunos ejercicios', 'Casi todo en grupos pequeños', 'Casi nadie espera; muchos contactos por jugador'] },
  { id: 'game', name: 'Juego y decisiones', q: '¿Entrenas con rival, lectura del juego y decisiones, no solo técnica aislada?',
    lv: ['Casi solo técnica sin rival', 'Juego al final, como premio', 'Juego reducido en casi todos los entrenos', 'Diseño ejercicios para que decidan y les pregunto qué vieron'] },
  { id: 'climate', name: 'Clima y relación', q: '¿Conoces a cada jugador, eres justo y el error se vale para aprender?',
    lv: ['Me cuesta conectar con varios', 'Buena relación con algunos', 'Conozco a la mayoría y corrijo sin humillar', 'Cada uno se siente visto; el error se usa para aprender'] },
  { id: 'match', name: 'Manejo de partido', q: '¿Preparas el partido, usas bien los tiempos fuera y controlas tus emociones?',
    lv: ['Reacciono sobre la marcha', 'Tengo rotaciones listas', 'Plan de partido y tiempos fuera con una idea clara', 'Plan, datos, calma visible y ajustes a tiempo'] },
  { id: 'safety', name: 'Seguridad y carga', q: '¿Cuidas calentamiento, saltos por semana, hidratación y molestias?',
    lv: ['No lo controlo', 'Calentamiento siempre', 'Controlo saltos y pregunto por molestias', 'Ajusto la carga por jugador y documento'] },
  { id: 'family', name: 'Escuela y familias', q: '¿Las familias y la escuela saben cómo trabajas, horarios y reglas?',
    lv: ['Casi no hay comunicación', 'Aviso cuando hay partido', 'Reunión de inicio y canal de avisos', 'Reglas claras por escrito, autorizaciones y seguimiento'] },
];

export const TOOLBOX = [
  { id: 'feedback', title: 'Retroalimentación que sí ayuda', items: [
    'Una sola clave por repetición: "codo alto", no una lista de cinco cosas.',
    'Pregunta antes de corregir: "¿qué viste?", "¿a dónde iba el balón?". Si lo encuentran ellos, se les queda.',
    'Di lo que sí hicieron bien con detalle ("tu plataforma estaba quieta") antes de la siguiente clave.',
    'Con el tiempo, corrige menos seguido: si siempre les dices qué hacer, dependen de ti en el partido.',
    'Corrige al grupo cuando el error es de varios y en privado cuando es de uno.',
  ] },
  { id: 'teens', title: 'Comunicación con adolescentes', items: [
    'Usa su nombre y ten al menos una plática corta 1 a 1 con cada jugador al mes.',
    'Reglas pocas, claras y por escrito, que se apliquen igual a todos (también al mejor).',
    'Dales voz: capitanes, que propongan un ejercicio o el calentamiento.',
    'Nunca humilles ni uses el ejercicio físico como castigo; separa la conducta de la persona.',
    'Reconoce el esfuerzo y la mejora, no solo el resultado.',
  ] },
  { id: 'families', title: 'Escuela y familias', items: [
    'Reunión al inicio de temporada: horarios, reglas, cómo se decide quién juega y cómo te contactan.',
    'Un solo canal oficial de avisos, con horario para responder.',
    'Autorización por escrito de madre, padre o tutor antes de dar de alta a un menor (Remate te lo recuerda en cada ficha).',
    'Los minutos de juego se platican con el jugador, no con la familia en la tribuna.',
  ] },
  { id: 'season', title: 'Planeación de la temporada', items: [
    'Pretemporada (4 a 6 semanas): base física, técnica y reglas del equipo.',
    'Temporada: mantén lo físico con menos volumen, más juego, sistemas y estrategia.',
    'Antes de un torneo importante: baja el volumen la última semana y conserva la intensidad.',
    'Bloques de 3 a 4 semanas con un enfoque (por ejemplo: recepción y transición), y revisa con datos al cerrar cada bloque.',
    'Al cerrar la temporada: examen de nivel, reporte por jugador y descanso.',
  ] },
  { id: 'pregame', title: 'Charla antes del partido (2 minutos)', items: [
    'Un objetivo táctico: "sacamos a su zona 1".',
    'Un objetivo de actitud: "hablamos en cada balón".',
    'Recuerda la rotación inicial y quién sustituye a quién.',
    'Cierra con algo que dependa de ellos, no del marcador.',
  ] },
  { id: 'timeout', title: 'Tiempo fuera (30 segundos)', items: [
    'Primero respiran y toman agua, tú observas. Calma en tu voz.',
    'Un dato: "su opuesto pega siempre en diagonal".',
    'Una instrucción concreta: "bloqueo cierra diagonal, defensa en la línea".',
    'Cierra con energía y un objetivo para los próximos 3 puntos.',
  ] },
  { id: 'after', title: 'Después del partido', items: [
    'En caliente: reconoce el esfuerzo y deja el análisis para el siguiente entrenamiento.',
    'Al día siguiente: revisa la estadística del partido en Remate y elige 1 o 2 cosas para entrenar.',
    'Escribe en tu bitácora qué funcionó y qué cambiarías. Es la mejor forma de mejorar como entrenador.',
  ] },
  { id: 'rules', title: 'Reglas que conviene tener a la mano', items: [
    'Reglas FIVB: dos tiempos fuera por set y seis sustituciones por set. En 2026 la FIVB está probando ocho sustituciones en algunas de sus competencias.',
    'Sets a 25 puntos con diferencia de 2; el quinto set a 15.',
    'Tu liga escolar puede usar reglas propias (sustituciones, líbero, tiempos): revisa su reglamento antes de la temporada.',
  ] },
];

export const CLIMATE = { 1: 'Muy tenso', 2: 'Tenso', 3: 'Normal', 4: 'Bueno', 5: 'Excelente' };
export const LOG_KINDS = { entrenamiento: 'Entrenamiento', partido: 'Partido', general: 'General' };
