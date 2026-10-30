// Ideas sugeridas para seguir mejorando Remate. El entrenador las agrega a su lista de Mejoras si le sirven.
export const AREAS = {
  hoy: 'Hoy', jugadores: 'Jugadores', entrenos: 'Entrenos', partidos: 'Partidos', casa: 'En casa', laboratorio: 'Laboratorio',
  reportes: 'Reportes', ruta: 'Ruta y retos', ejercicios: 'Ejercicios', ajustes: 'Ajustes', otra: 'Otra',
};
export const PRIORITY = { alta: 'Alta', media: 'Media', baja: 'Baja' };
export const STATUS = { idea: 'Idea', lista: 'Lista para pedir', hecha: 'Hecha', descartada: 'Descartada' };

export const SUGGESTED = [
  { title: 'Alineación y rotaciones en cada set', area: 'partidos', priority: 'alta',
    body: 'Armar la rotación inicial de cada set. La captura muestra solo a los 6 que están en cancha y calcula cuántos puntos ganamos en cada rotación, para saber cuál es la más débil.' },
  { title: 'Side-out y break point', area: 'partidos', priority: 'alta',
    body: 'Porcentaje de puntos ganados cuando recibimos (side-out) y cuando sacamos (break point). Son los dos números que más explican por qué se gana o se pierde un partido.' },
  { title: 'Mapa de saque y de ataque', area: 'partidos', priority: 'media',
    body: 'Tocar en un dibujo de la cancha dónde cayó el saque o el remate y ver un mapa por zonas, de cada jugador y del rival.' },
  { title: 'Convocatoria y confirmación de asistencia a partidos', area: 'partidos', priority: 'media',
    body: 'Que cada jugador confirme desde su celular si va al partido o torneo, y yo vea la lista de quién va.' },
  { title: 'Pruebas físicas de los jugadores', area: 'jugadores', priority: 'media',
    body: 'Cada 2 o 3 meses: salto con My Jump, velocidad de 10 m y plancha. Con gráfica de avance en la tarjeta del jugador.' },
  { title: 'Rol de asistente o capitán', area: 'ajustes', priority: 'media',
    body: 'Un asistente o capitán puede pasar lista o capturar estadística del partido, sin ver mis notas privadas ni el laboratorio.' },
  { title: 'Video en partidos y ejercicios', area: 'partidos', priority: 'media',
    body: 'Pegar un enlace de YouTube o Drive a un partido o ejercicio, con marcas de tiempo de las jugadas importantes.' },
  { title: 'Planeador de temporada', area: 'entrenos', priority: 'media',
    body: 'Definir bloques de 3 o 4 semanas con un enfoque (por ejemplo, recepción y transición) y que se generen los entrenamientos con las plantillas.' },
  { title: 'Insignias y rachas', area: 'ruta', priority: 'baja',
    body: 'Medallas por rachas de asistencia, retos aprobados y semanas entrenando en casa, visibles en la tarjeta del jugador.' },
  { title: 'Radar antes y después', area: 'jugadores', priority: 'baja',
    body: 'Comparar en el radar dos fechas (inicio y fin de temporada) para las juntas con familias.' },
  { title: 'Torneos', area: 'partidos', priority: 'baja',
    body: 'Agrupar partidos por torneo, con sede, fechas, tabla y resultado final.' },
  { title: 'Avisos en el celular', area: 'entrenos', priority: 'baja',
    body: 'Notificar a los jugadores cuando publico un entrenamiento o cambia un horario. En iPhone solo funciona si la app está instalada en la pantalla de inicio.' },
];
