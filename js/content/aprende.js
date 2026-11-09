// Aprende (v3.21): la teoría y la práctica juntas, por fundamento y por posición.
// Junta lo que ya existe en Remate: lecciones de Teoría, ejercicios de cancha, En casa y Gym.
// Las listas de cada fundamento y de cada posición son propuesta de Remate (práctica común de entrenamiento);
// para cambiar algo, edita los ids de aquí.
import { LESSONS } from './teoria.js';

export const FUNDS = [
  ['saque', 'Saque'], ['recepcion', 'Recepción'], ['colocacion', 'Colocación'], ['remate', 'Remate'],
  ['bloqueo', 'Bloqueo'], ['defensa', 'Defensa'], ['juego', 'Juego y táctica'], ['fisico', 'Físico'],
];
export const FUND_NAME = Object.fromEntries(FUNDS);

// Por fundamento: lecciones extra (además de las que ya tienen ese fundamento), En casa y Gym que lo apoyan, y 3 claves.
export const FUND = {
  saque: { lessons: ['r-rotacion'], casa: ['h-saque-pared', 'h-brazo-toalla'], gym: ['g-re-liga', 'g-face-pull', 'g-pallof', 'g-lanz-giro'],
    keys: ['Mismo lanzamiento siempre: frente al hombro del brazo que golpea.', 'Golpea con la mano firme en el centro del balón (flotado) o arriba y atrás (con efecto).', 'Primero que entre; luego a zonas; al final, fuerte.'] },
  recepcion: { lessons: [], casa: ['h-antebrazos-pared', 'h-antebrazos-aire', 'h-postura'], gym: ['g-skater', 'g-copenhague', 'g-sent-espanola', 'g-plancha-lat'],
    keys: ['Llega antes que el balón: los pies se mueven, los brazos no.', 'Plataforma quieta y hacia donde quieres mandar el balón.', 'Pide el balón en voz alta: «¡mía!».'] },
  colocacion: { lessons: [], casa: ['h-dedos-acostado', 'h-dedos-pared'], gym: ['g-serrato', 'g-lagartija', 'g-ytw', 'g-pallof'],
    keys: ['Debajo del balón y de frente a donde vas a colocar.', 'Manos en «triángulo» arriba de la frente; empuja con piernas y brazos a la vez.', 'Toque limpio: suave y sin que se te «quede» en las manos.'] },
  remate: { lessons: [], casa: ['h-pared-piso', 'h-brazo-toalla', 'h-aproximacion'], gym: ['g-salto-cajon', 'g-sentadilla-salto', 'g-lanz-arriba', 'g-re-90', 'g-lenador'],
    keys: ['Aproximación de 3 o 4 pasos: lento al principio y rápido al final.', 'Brazos atrás y arriba fuerte al saltar: suben tu salto.', 'Golpea arriba y adelante del hombro, con la muñeca.'] },
  bloqueo: { lessons: [], casa: ['h-bloqueo'], gym: ['g-salto-cajon', 'g-jalon-alto', 'g-skater', 'g-aterrizaje', 'g-press-hombro-m'],
    keys: ['Mira al colocador, luego al balón, luego al atacante.', 'Manos firmes y por encima de la red, invadiendo su lado.', 'Cae en tus dos pies, en tu lado y sin tocar la red.'] },
  defensa: { lessons: ['t-posicion'], casa: ['h-sombra', 'h-postura'], gym: ['g-skater', 'g-aterrizaje', 'g-copenhague', 'g-plancha-lat', 'g-sentadilla-salto'],
    keys: ['Bajito y quieto cuando el rival golpea.', 'Lee el brazo del atacante, no el balón.', 'Si no llegas con los brazos, cualquier parte del cuerpo vale.'] },
  juego: { lessons: [], casa: ['h-video'], gym: [],
    keys: ['Habla en cada punto: quién va, cuántos bloquean, quién cubre.', 'Primero que pase la red; luego dónde y cómo.', 'Después de un error, el siguiente balón es nuevo.'] },
  fisico: { lessons: [], casa: ['h-tobillo', 'h-saltitos', 'h-equilibrio', 'h-hombro', 'h-plancha'], gym: ['g-aterrizaje', 'g-nordico', 'g-copenhague', 'g-talones-1', 'g-re-liga'],
    keys: ['Calienta siempre: tobillos, rodillas y hombro.', 'Aterriza suave y con las rodillas sobre los pies.', 'Dormir bien también es entrenar.'] },
};

// Por posición: sus fundamentos (en orden de importancia), las lecciones que más le sirven, ejercicios extra y qué tiene que dominar.
export const POS = {
  colocador: { name: 'Colocador(a)', funds: ['colocacion', 'defensa', 'saque', 'bloqueo'],
    lessons: ['t-colocacion', 's-tiempos', 's-sistemas', 's-posiciones', 'a-leer', 'r-red'], ex: ['co-04', 'co-05', 'ju-05'],
    casa: ['h-dedos-pared', 'h-dedos-acostado', 'h-sombra'], gym: ['g-serrato', 'g-skater', 'g-pallof', 'g-ytw'],
    why: 'Toca el segundo balón casi siempre: decide quién ataca. Necesita manos limpias, pies rápidos para llegar debajo del balón y leer el bloqueo rival.',
    keys: ['Llega al balón antes y de frente a zona 4.', 'Coloca con la misma postura a todos lados para que no te lean.', 'Si el pase es malo, coloca alto y seguro.'] },
  central: { name: 'Central', funds: ['bloqueo', 'remate', 'saque'],
    lessons: ['t-bloqueo', 's-tiempos', 't-remate', 'r-red', 's-defensa'], ex: ['bl-02', 'bl-03', 'bl-04', 'rm-05'],
    casa: ['h-bloqueo', 'h-aproximacion', 'h-saltitos'], gym: ['g-salto-cajon', 'g-skater', 'g-aterrizaje', 'g-jalon-alto', 'g-copenhague'],
    why: 'Bloquea en toda la red y ataca rápido por el centro. Salta mucho cada partido: pies rápidos a los lados y aterrizajes seguros.',
    keys: ['Desplázate con pasos laterales y cruzados sin perder la red.', 'Ataque rápido: salta antes de que el colocador toque el balón.', 'Después de bloquear, sal a atacar de inmediato.'] },
  punta: { name: 'Punta', funds: ['recepcion', 'remate', 'defensa', 'saque'],
    lessons: ['t-recepcion', 't-remate', 's-recepcion', 'a-k1k2', 't-defensa'], ex: ['re-03', 're-05', 'rm-05', 'rm-06'],
    casa: ['h-antebrazos-pared', 'h-pared-piso', 'h-aproximacion'], gym: ['g-salto-cajon', 'g-re-90', 'g-lanz-giro', 'g-skater', 'g-nordico'],
    why: 'Recibe, ataca por zona 4 y defiende: es la más completa. Ataca muchos balones altos y contra bloqueo doble.',
    keys: ['Recibe primero, ataca después: sin pase no hay ataque.', 'Contra bloqueo doble: golpea la mano de afuera o tira al hueco.', 'Cubre a tus compañeros cuando ellos atacan.'] },
  opuesto: { name: 'Opuesto(a)', funds: ['remate', 'bloqueo', 'saque', 'defensa'],
    lessons: ['t-remate', 't-bloqueo', 's-sistemas', 'a-saque', 'a-k1k2'], ex: ['rm-05', 'rm-06', 'bl-03', 'sa-04'],
    casa: ['h-pared-piso', 'h-brazo-toalla', 'h-bloqueo'], gym: ['g-salto-cajon', 'g-lanz-arriba', 'g-re-90', 'g-pallof', 'g-aterrizaje'],
    why: 'Es quien más ataca, sobre todo los balones difíciles y desde atrás (zona 1). Bloquea a la punta rival.',
    keys: ['Cuando el pase es malo, el balón es tuyo: atácalo con inteligencia.', 'Ataque de zaguero: despega detrás de la línea de 3 m.', 'Bloquea la diagonal de la punta rival.'] },
  libero: { name: 'Líbero', funds: ['recepcion', 'defensa', 'colocacion'],
    lessons: ['r-zagueros', 't-recepcion', 's-recepcion', 't-defensa', 's-defensa', 'a-comunicacion'], ex: ['re-05', 'de-03', 'de-04', 'de-05'],
    casa: ['h-antebrazos-pared', 'h-postura', 'h-sombra', 'h-dedos-pared'], gym: ['g-skater', 'g-copenhague', 'g-sent-espanola', 'g-plancha-lat', 'g-aterrizaje'],
    why: 'Especialista en recibir y defender; no saca, no bloquea ni ataca arriba de la red. Es la voz de atrás.',
    keys: ['Ordena la recepción: dile a cada quien qué zona cubre.', 'Si colocas desde adelante de la línea de 3 m, hazlo de antebrazos.', 'Lee al atacante y llega antes.'] },
};
export const POS_IDS = Object.keys(POS);

// Lecciones de un fundamento (las marcadas con él y las extra) y de una posición.
export const lessonsForFund = (f) => {
  const ids = new Set([...LESSONS.filter((l) => l.skill === f).map((l) => l.id), ...(FUND[f]?.lessons || [])]);
  return LESSONS.filter((l) => ids.has(l.id));
};
export const lessonsForPos = (p) => (POS[p]?.lessons || []).map((id) => LESSONS.find((l) => l.id === id)).filter(Boolean);
