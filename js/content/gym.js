// Físico: pruebas físicas (antes en pruebas.js) y Gym (ejercicios con pesas y máquinas, objetivos y el generador de rutinas).
// Las series, repeticiones y descansos son propuestas de Remate basadas en las fuentes de abajo (GYM_SOURCES), no cifras de un estudio.
import { addDays, diffDays, todayStr } from '../util.js';

// =====================================================================
// Pruebas físicas de los jugadores. Se recomienda repetirlas cada 2 o 3 meses, siempre igual.
// =====================================================================
export const PTESTS = {
  cmj: { name: 'Salto vertical', short: 'Salto', unit: 'cm', better: 'up', min: 5, max: 120, step: 0.1,
    how: ['Manos en la cadera, baja rápido a media sentadilla y salta lo más alto posible.', 'Mídelo con My Jump (celular en cámara lenta) o con un tapete de salto.', 'Tres intentos con 1 minuto de descanso; anota el mejor.'] },
  vel10: { name: 'Velocidad 10 m', short: '10 m', unit: 's', better: 'down', min: 1, max: 6, step: 0.01,
    how: ['Calienta bien. Marca la salida y una línea a 10 m en piso que no resbale.', 'Sale parado, con un pie adelante, a la cuenta de «3, 2, 1, ya». Corre a máxima velocidad hasta pasar la línea.', 'Lo más preciso son las fotoceldas. Sin ellas: graba de lado en cámara lenta y mide del primer movimiento a cuando el tronco cruza la línea, o usa cronómetro, siempre con la misma persona.', 'Tres intentos con 2 a 3 minutos de descanso; anota el mejor (menos segundos es mejor).'] },
  alcance: { name: 'Alcance de remate', short: 'Alcance', unit: 'cm', better: 'up', min: 150, max: 380, step: 1,
    how: ['Con aproximación de remate, toca lo más alto posible una pared marcada (o una regla junto a la red).', 'Anota la marca más alta de tres intentos, en centímetros desde el piso.', 'Compárala con la red: 2.24 m femenil y 2.43 m varonil.'] },
  agilidad: { name: 'Agilidad (prueba T)', short: 'Agilidad', unit: 's', better: 'down', min: 5, max: 30, step: 0.01,
    how: ['Cuatro conos en forma de T: A en la salida, B a 9.14 m al frente, C y D a 4.57 m a cada lado de B.', 'Sprint de A a B, desplazamiento lateral a C, lateral a D, lateral de regreso a B y de espaldas hasta A. Toca la base de cada cono.', 'Sin cruzar los pies en los desplazamientos laterales. Tres intentos, anota el mejor (menos segundos es mejor).'] },
  plancha: { name: 'Plancha frontal', short: 'Plancha', unit: 's', better: 'up', min: 5, max: 600, step: 1,
    how: ['Apoyado en antebrazos y puntas, cuerpo recto de cabeza a talones.', 'Termina cuando la cadera baja o sube y no la puede corregir.', 'Un solo intento.'] },
  estatura: { name: 'Estatura', short: 'Estatura', unit: 'cm', better: 'up', min: 120, max: 230, step: 0.5,
    how: ['Descalzo, talones, glúteos y espalda contra la pared.', 'Útil para entender cambios de salto y alcance mientras crecen.'] },
};

// Cambio entre la primera y la última prueba; "mejor" según si conviene subir o bajar.
export function testTrend(list, kind) {
  const xs = list.filter((t) => t.kind === kind).sort((a, b) => `${a.test_date}${a.created_at}`.localeCompare(`${b.test_date}${b.created_at}`));
  if (!xs.length) return null;
  const first = Number(xs[0].value), last = Number(xs[xs.length - 1].value), d = Math.round((last - first) * 100) / 100;
  const better = PTESTS[kind].better === 'down' ? d < 0 : d > 0;
  return { n: xs.length, first, last, d, better: kind === 'estatura' ? null : (d === 0 ? null : better), list: xs };
}

// =====================================================================
// GYM
// =====================================================================

// Material que pide cada ejercicio y qué hay en cada tipo de gym.
export const NEED = {
  barra: 'Barra, rack o barra fija', maquina: 'Máquina', polea: 'Polea', mancuerna: 'Mancuernas', liga: 'Liga o polea',
  cajon: 'Cajón o banco firme', balon: 'Balón medicinal', nada: 'Tu peso',
};
export const EQUIP = {
  completo: { name: 'Gym completo', desc: 'Barras y rack, mancuernas, poleas y máquinas.' },
  basico: { name: 'Gym básico', desc: 'Mancuernas, poleas y máquinas, sin barra libre ni rack.' },
  mancuernas: { name: 'Solo mancuernas', desc: 'Mancuernas, un banco, ligas y tu peso.' },
};
const EQUIP_HAS = {
  completo: new Set(Object.keys(NEED)),
  basico: new Set(['maquina', 'polea', 'mancuerna', 'liga', 'cajon', 'balon', 'nada']),
  mancuernas: new Set(['mancuerna', 'liga', 'cajon', 'nada']),
};
export const available = (ex, equip) => !!EQUIP_HAS[equip]?.has(ex.need);

export const EXP = {
  nuevo: { name: 'Empiezo', desc: 'Nunca he ido o llevo menos de 3 meses.', tier: 1 },
  medio: { name: 'Ya sé', desc: 'De 3 a 12 meses, con buena técnica.', tier: 2 },
  avanzado: { name: 'Avanzado', desc: 'Más de un año y un instructor ya revisó mi técnica.', tier: 3 },
};
export const TIER = { 1: 'Básico', 2: 'Intermedio', 3: 'Avanzado' };
export const PHASE = {
  pre: { name: 'Pretemporada o vacaciones', desc: 'Sin partidos: el mejor momento para construir fuerza.' },
  temp: { name: 'Temporada', desc: 'Entrenos y partidos cada semana: mantener y seguir ganando, sin llegar cansado.' },
  torneo: { name: 'Semana de partido o torneo', desc: 'Una sola sesión corta para mantener.' },
};
export const MINUTES = [45, 60, 75];

// Grupos de la biblioteca (pat → grupo).
export const GROUPS = {
  potencia: { name: 'Potencia', pats: ['salto', 'lanzamiento', 'lateral', 'aterrizaje'] },
  piernas: { name: 'Piernas', pats: ['rodilla', 'cadera', 'gluteo', 'unipodal', 'isquios', 'pantorrilla', 'aductor'] },
  arriba: { name: 'Tren de arriba', pats: ['empuje', 'jalon'] },
  hombro: { name: 'Hombro sano', pats: ['hombro'] },
  tronco: { name: 'Tronco', pats: ['tronco'] },
};
export const PATS = {
  salto: 'Saltos', lanzamiento: 'Lanzamientos', lateral: 'Lateral', aterrizaje: 'Aterrizaje', rodilla: 'Sentadilla', cadera: 'Cadera',
  gluteo: 'Glúteo', unipodal: 'Una pierna', isquios: 'Isquiotibiales', pantorrilla: 'Pantorrilla y tobillo', aductor: 'Aductores',
  empuje: 'Empuje', jalon: 'Jalón y remo', hombro: 'Hombro sano', tronco: 'Tronco',
};

// unit: 'kg' (peso y repeticiones), 'pc' (tu peso: solo repeticiones), 's' (segundos), 'saltos' (repeticiones sin peso).
// each: el peso es por mano. side: las repeticiones son por lado. dose: dosis propia por experiencia [series, repeticiones].
const X = (o) => ({ safety: '', side: false, each: false, ...o });

export const GYM = [
  // ---------- potencia ----------
  X({ id: 'g-salto-cajon', name: 'Salto al cajón', pat: 'salto', need: 'cajon', tier: 1, unit: 'saltos', body: 'Piernas completas',
    why: 'Practicas el despegue con todo y aterrizas arriba, con menos impacto que en el piso.',
    how: ['Cajón a la altura de tu rodilla o más bajo, que no se mueva.', 'Brazos atrás, baja rápido a media sentadilla y salta llevando los brazos arriba.', 'Aterriza suave arriba con los dos pies, rodillas dobladas y sobre los pies.', 'Bájate caminando, nunca saltando hacia atrás.'],
    cues: ['Brazos fuertes hacia arriba', 'Aterriza en silencio'],
    err: 'Un cajón tan alto que aterrizas en sentadilla profunda: no saltaste más, solo subiste las rodillas.',
    easier: 'Cajón más bajo, o salto al frente en el piso quedándote quieto al caer.',
    harder: 'Salta desde sentado en un banco, sin impulso.',
    safety: 'Bájate caminando. Si el cajón se mueve o resbala, no lo uses.' }),
  X({ id: 'g-salto-cargado', name: 'Salto con mancuernas ligeras', pat: 'salto', need: 'mancuerna', tier: 2, unit: 'kg', each: true, body: 'Piernas y cadera',
    why: 'Enseña a meter fuerza rápido, que es lo que más se pasa al salto de remate y de bloqueo.',
    how: ['Una mancuerna ligera en cada mano, brazos colgando a los lados.', 'Baja a un cuarto de sentadilla y salta lo más alto que puedas.', 'Aterriza suave, acomódate y vuelve a saltar, sin rebotar.'],
    cues: ['Ligero: casi tan alto como sin peso', 'Una repetición a la vez'],
    err: 'Tanto peso que casi no despegas: ya no es potencia.',
    easier: 'El mismo salto sin peso.',
    harder: 'Un poco más de peso, solo si saltas casi igual de alto.',
    safety: 'Nunca con una barra sobre la espalda.' }),
  X({ id: 'g-jalon-alto', name: 'Jalón alto desde colgado', pat: 'salto', need: 'barra', tier: 3, unit: 'kg', body: 'Cadera, piernas y espalda',
    why: 'Viene de la halterofilia: extiendes cadera, rodillas y tobillos con fuerza y rapidez, como en el despegue.',
    how: ['De pie con la barra a la mitad del muslo, manos un poco más abiertas que la cadera, espalda recta.', 'Extiende piernas y cadera de golpe y sube en puntas.', 'La barra sube pegada al cuerpo y los codos van altos, hasta el pecho.', 'Baja controlado a la mitad del muslo.'],
    cues: ['La cadera empuja, los brazos solo guían', 'Barra pegada al cuerpo'],
    err: 'Jalar con los brazos antes de extender la cadera.',
    easier: 'Salto con mancuernas ligeras.',
    harder: 'Más peso, solo con un instructor que revise tu técnica.',
    safety: 'Solo si un instructor ya revisó tu técnica. Peso ligero y técnica perfecta.' }),
  X({ id: 'g-lanz-arriba', name: 'Lanzamiento de balón medicinal por arriba', pat: 'lanzamiento', need: 'balon', tier: 1, unit: 'kg', body: 'Tronco, hombros y piernas',
    why: 'Une piernas, tronco y brazos, como en el remate y el saque.',
    how: ['De frente a una pared, a 2 o 3 metros, con un balón de 2 a 4 kg sobre la cabeza.', 'Da un paso y lánzalo con todo el cuerpo contra la pared, como un saque de banda de fútbol.', 'Atrapa el rebote o recógelo y vuelve a empezar.'],
    cues: ['El tronco arranca, los brazos terminan', 'Cada lanzamiento al máximo'],
    err: 'Lanzar solo con los brazos, sin meter el tronco.',
    easier: 'Balón más ligero, o de rodillas.',
    harder: 'Balón un poco más pesado, sin perder velocidad.' }),
  X({ id: 'g-lanz-giro', name: 'Lanzamiento con giro', pat: 'lanzamiento', need: 'balon', tier: 1, unit: 'kg', side: true, body: 'Tronco y cadera',
    why: 'Potencia de rotación: es la que hace que el remate y el saque salgan rápidos.',
    how: ['De lado a la pared, a 1 o 2 metros, con el balón a la altura de la cadera.', 'Gira la cadera y luego el pecho, y lanza el balón contra la pared.', 'Atrapa, acomódate y repite. Luego cambia de lado.'],
    cues: ['La cadera gira primero', 'Brazos casi estirados'],
    err: 'Girar solo los brazos y dejar la cadera quieta.',
    easier: 'Balón más ligero y más cerca de la pared.',
    harder: 'Da un paso al lanzar.' }),
  X({ id: 'g-slam', name: 'Golpe al piso con balón medicinal', pat: 'lanzamiento', need: 'balon', tier: 1, unit: 'kg', body: 'Tronco y hombros',
    why: 'Potencia de arriba hacia abajo, como el brazo del remate.',
    how: ['De pie, con el balón arriba de la cabeza y en puntas.', 'Azótalo contra el piso frente a tus pies doblando la cadera.', 'Recógelo con la espalda recta y repite.'],
    cues: ['Estírate alto antes de lanzar', 'Golpea con todo el cuerpo'],
    err: 'Encorvar la espalda al recoger el balón.',
    easier: 'Balón más ligero.',
    harder: 'Menos tiempo entre repeticiones, sin perder la postura.',
    safety: 'Usa un balón que no rebote fuerte hacia tu cara.' }),
  X({ id: 'g-skater', name: 'Salto lateral de patinador', pat: 'lateral', need: 'nada', tier: 1, unit: 'saltos', side: true, body: 'Piernas y cadera',
    why: 'Fuerza para empujar y frenar de lado, como al desplazarte al bloqueo o a defender.',
    how: ['Párate en una pierna.', 'Salta de lado hacia la otra pierna y aterriza en ella.', 'Quédate quieto 1 segundo y regresa.'],
    cues: ['Rodilla sobre el pie al aterrizar', 'Pausa de 1 segundo'],
    err: 'Aterrizar con la rodilla hacia adentro.',
    easier: 'Saltos más cortos, apoyando la otra punta al caer.',
    harder: 'Más distancia y rebote más rápido, sin pausa.' }),
  X({ id: 'g-aterrizaje', name: 'Caída desde escalón', pat: 'aterrizaje', need: 'cajon', tier: 1, unit: 'saltos', body: 'Rodillas y tobillos',
    why: 'Aprender a frenar bien protege tus rodillas y tobillos. Practicar el aterrizaje es parte de los programas que bajan las lesiones de rodilla en jóvenes.',
    how: ['Súbete a un escalón o cajón de 20 a 30 cm.', 'Da un paso al frente (no saltes) y cae con los dos pies.', 'Rodillas dobladas y sobre los pies, cadera atrás y pecho al frente.', 'Quédate quieto 2 segundos.'],
    cues: ['Silencio al caer', 'Rodillas hacia afuera, nunca hacia adentro'],
    err: 'Caer con las piernas rígidas o con las rodillas juntándose.',
    easier: 'Desde un escalón más bajo.',
    harder: 'Cae en una sola pierna, desde un escalón bajo.' }),

  // ---------- sentadilla y rodilla ----------
  X({ id: 'g-sent-trasera', name: 'Sentadilla con barra', pat: 'rodilla', need: 'barra', tier: 3, unit: 'kg', body: 'Piernas, glúteos y tronco',
    why: 'El ejercicio rey de fuerza de piernas: más fuerza para empujar el piso en cada salto.',
    how: ['En el rack, barra sobre la parte alta de la espalda (no en el cuello), manos firmes.', 'Saca la barra, pies al ancho de hombros, puntas un poco afuera.', 'Baja con el pecho arriba hasta que el muslo quede paralelo al piso, o un poco más si lo controlas.', 'Sube empujando el piso con todo el pie.'],
    cues: ['Rodillas en la dirección de los pies', 'Espalda neutra, mirada al frente'],
    err: 'Que se te levanten los talones o se te redondee la espalda abajo.',
    easier: 'Sentadilla frontal o goblet.',
    harder: 'Pausa de 2 segundos abajo, con el mismo peso.',
    safety: 'Siempre dentro del rack con las barras de seguridad a la altura correcta, o con alguien que te cuide. Seguros en la barra.' }),
  X({ id: 'g-sent-frontal', name: 'Sentadilla frontal con barra', pat: 'rodilla', need: 'barra', tier: 2, unit: 'kg', body: 'Piernas y tronco',
    why: 'Fuerza de piernas con el tronco más derecho: cuida la espalda baja y te obliga a una buena postura.',
    how: ['Barra apoyada al frente sobre los hombros, codos altos (o brazos cruzados).', 'Pies al ancho de hombros.', 'Baja con el pecho alto y los codos arriba.', 'Sube empujando el piso.'],
    cues: ['Codos altos todo el tiempo', 'Rodillas sobre los pies'],
    err: 'Bajar los codos: la barra se va al frente.',
    easier: 'Sentadilla goblet.',
    harder: 'Pausa de 2 segundos abajo.',
    safety: 'Dentro del rack con barras de seguridad. Si pierdes la barra, suéltala al frente y da un paso atrás.' }),
  X({ id: 'g-goblet', name: 'Sentadilla goblet', pat: 'rodilla', need: 'mancuerna', tier: 1, unit: 'kg', body: 'Piernas y glúteos',
    why: 'La mejor forma de aprender sentadilla con peso: la mancuerna al pecho te mantiene derecho.',
    how: ['Sostén una mancuerna vertical pegada al pecho, con las dos manos.', 'Pies un poco más abiertos que los hombros.', 'Baja entre las rodillas con el pecho alto.', 'Sube empujando el piso.'],
    cues: ['Codos por dentro de las rodillas al bajar', 'Talones en el piso'],
    err: 'Inclinarte al frente y despegar los talones.',
    easier: 'Sentadilla a un banco, con menos peso.',
    harder: 'Más peso, o 3 segundos al bajar.' }),
  X({ id: 'g-prensa', name: 'Prensa de piernas', pat: 'rodilla', need: 'maquina', tier: 1, unit: 'kg', body: 'Piernas',
    why: 'Fuerza de piernas con la espalda apoyada: puedes cargar sin preocuparte del equilibrio.',
    how: ['Espalda y cadera pegadas al respaldo; pies al ancho de hombros, a media plataforma.', 'Quita los seguros y baja hasta que las rodillas lleguen a unos 90 grados.', 'Empuja sin bloquear las rodillas al final.'],
    cues: ['La cadera no se despega del asiento', 'No bloquees las rodillas'],
    err: 'Bajar tanto que la cadera se levanta del asiento.',
    easier: 'Menos peso y menos recorrido.',
    harder: 'Una pierna a la vez, con menos peso.',
    safety: 'Pon los seguros de la máquina al terminar.' }),
  X({ id: 'g-sent-espanola', name: 'Sentadilla española (sostenida)', pat: 'rodilla', need: 'liga', tier: 1, unit: 's', body: 'Tendón de la rodilla',
    why: 'Fortalece el tendón de abajo de la rodilla, el que más sufre con muchos saltos («rodilla del saltador»), sin impacto.',
    how: ['Amarra una liga fuerte a algo fijo y pásala por detrás de tus rodillas.', 'Echa la cadera atrás y baja a media sentadilla con las espinillas verticales; la liga te sostiene.', 'Quédate quieto el tiempo indicado.'],
    cues: ['Espinillas verticales', 'Siente el trabajo arriba de la rodilla'],
    err: 'Dejar que las rodillas se vayan al frente.',
    easier: 'Menos profundo y menos tiempo.',
    harder: 'Más profundo o más tiempo.',
    safety: 'Si ya te duele la rodilla, pregúntale primero a tu entrenador o a un fisioterapeuta.' }),

  // ---------- cadera y glúteo ----------
  X({ id: 'g-hex', name: 'Peso muerto con barra hexagonal', pat: 'cadera', need: 'barra', tier: 2, unit: 'kg', body: 'Glúteos, piernas y espalda',
    why: 'Mucha fuerza de cadera y piernas con una postura más fácil que el peso muerto con barra recta.',
    how: ['Párate en medio de la barra hexagonal, pies al ancho de cadera.', 'Baja la cadera, toma las agarraderas y pon la espalda recta, pecho arriba.', 'Empuja el piso y párate derecho apretando glúteos.', 'Baja controlado por el mismo camino.'],
    cues: ['Espalda recta de principio a fin', 'Empuja el piso, no jales con la espalda'],
    err: 'Redondear la espalda al despegar la barra.',
    easier: 'Peso muerto rumano con mancuernas.',
    harder: 'Pausa de 1 segundo justo después de despegar.',
    safety: 'Si tu gym no tiene barra hexagonal, usa el peso muerto rumano.' }),
  X({ id: 'g-rumano-barra', name: 'Peso muerto rumano con barra', pat: 'cadera', need: 'barra', tier: 2, unit: 'kg', body: 'Isquiotibiales y glúteos',
    why: 'Fortalece la parte de atrás del muslo y la cadera, que dan potencia al salto y cuidan la rodilla.',
    how: ['De pie con la barra a la altura de la cadera, rodillas un poco dobladas.', 'Lleva la cadera atrás y baja la barra pegada a los muslos.', 'Baja hasta un poco abajo de la rodilla o hasta sentir el estirón atrás, sin redondear la espalda.', 'Regresa empujando la cadera al frente.'],
    cues: ['Cadera atrás, como si cerraras una puerta con la cola', 'Barra pegada a las piernas'],
    err: 'Doblar mucho las rodillas (se vuelve sentadilla) o redondear la espalda.',
    easier: 'Con mancuernas y menos recorrido.',
    harder: 'Bajada de 3 segundos.' }),
  X({ id: 'g-rumano-mancuernas', name: 'Peso muerto rumano con mancuernas', pat: 'cadera', need: 'mancuerna', tier: 1, unit: 'kg', each: true, body: 'Isquiotibiales y glúteos',
    why: 'La versión para aprender la bisagra de cadera: atrás del muslo y glúteos fuertes para saltar y frenar.',
    how: ['Una mancuerna en cada mano frente a los muslos, rodillas un poco dobladas.', 'Lleva la cadera atrás y baja las mancuernas pegadas a las piernas.', 'Baja hasta sentir el estirón atrás del muslo, con la espalda recta.', 'Regresa empujando la cadera al frente.'],
    cues: ['Cadera atrás', 'Espalda recta'],
    err: 'Redondear la espalda para bajar más.',
    easier: 'Menos recorrido, hasta las rodillas.',
    harder: 'Peso muerto rumano con barra o a una pierna.' }),
  X({ id: 'g-hipthrust', name: 'Empuje de cadera con barra (hip thrust)', pat: 'gluteo', need: 'barra', tier: 1, unit: 'kg', body: 'Glúteos',
    why: 'Glúteos fuertes: más potencia en el salto y rodillas mejor protegidas.',
    how: ['Espalda alta apoyada en un banco, barra sobre la cadera con un cojín.', 'Pies apoyados al ancho de la cadera, rodillas dobladas.', 'Sube la cadera hasta formar una mesa de hombros a rodillas y aprieta 1 segundo.', 'Baja controlado.'],
    cues: ['Barbilla abajo, costillas abajo', 'Aprieta glúteos arriba'],
    err: 'Arquear la espalda baja en lugar de subir con la cadera.',
    easier: 'Con una mancuerna o sin peso.',
    harder: 'Pausa de 2 segundos arriba, o a una pierna.' }),
  X({ id: 'g-hipthrust-m', name: 'Empuje de cadera con mancuerna', pat: 'gluteo', need: 'mancuerna', tier: 1, unit: 'kg', body: 'Glúteos',
    why: 'Glúteos fuertes con poco equipo: potencia para el salto y rodillas más estables.',
    how: ['Espalda alta apoyada en un banco, una mancuerna sobre la cadera (detenla con las manos).', 'Pies apoyados, rodillas dobladas.', 'Sube la cadera, aprieta 1 segundo y baja lento.'],
    cues: ['Costillas abajo', 'Aprieta arriba'],
    err: 'Subir arqueando la espalda.',
    easier: 'Sin peso, en el piso (puente de glúteo).',
    harder: 'A una pierna.' }),

  // ---------- una pierna ----------
  X({ id: 'g-bulgara', name: 'Sentadilla búlgara', pat: 'unipodal', need: 'mancuerna', tier: 2, unit: 'kg', each: true, side: true, body: 'Piernas y glúteos',
    why: 'Fuerza de una pierna: en la cancha casi todo se hace cargando más una pierna que la otra.',
    how: ['Pie de atrás apoyado en un banco, pie de adelante un paso largo al frente.', 'Una mancuerna en cada mano.', 'Baja recto hasta que la rodilla de atrás casi toque el piso.', 'Sube empujando con la pierna de adelante.'],
    cues: ['Rodilla de adelante sobre el pie', 'Tronco un poco al frente'],
    err: 'Pie de adelante muy cerca del banco: se te despega el talón.',
    easier: 'Zancada hacia atrás, o sin peso.',
    harder: 'Más peso, o 3 segundos al bajar.' }),
  X({ id: 'g-subida', name: 'Subida al cajón con mancuernas', pat: 'unipodal', need: 'cajon', tier: 1, unit: 'kg', each: true, side: true, body: 'Piernas y glúteos',
    why: 'Fuerza de una pierna con poca carga para la rodilla, parecida al último paso de la aproximación.',
    how: ['Cajón o banco firme a la altura de tu rodilla.', 'Pie completo arriba; sube empujando con esa pierna, sin impulsarte con la de abajo.', 'Baja lento con la misma pierna.'],
    cues: ['Empuja con el talón de arriba', 'Rodilla sobre el pie'],
    err: 'Impulsarte con la pierna de abajo.',
    easier: 'Cajón más bajo o sin peso.',
    harder: 'Cajón un poco más alto o más peso.' }),
  X({ id: 'g-zancada', name: 'Zancada hacia atrás con mancuernas', pat: 'unipodal', need: 'mancuerna', tier: 1, unit: 'kg', each: true, side: true, body: 'Piernas y glúteos',
    why: 'Fuerza y equilibrio de una pierna, con frenado controlado como al llegar a la red.',
    how: ['De pie con una mancuerna en cada mano.', 'Da un paso largo hacia atrás y baja hasta que la rodilla de atrás casi toque el piso.', 'Regresa empujando con la pierna de adelante.'],
    cues: ['Tronco erguido', 'Rodilla de adelante sobre el pie'],
    err: 'Que la rodilla de adelante se vaya hacia adentro.',
    easier: 'Sin peso, apoyándote en algo.',
    harder: 'Sentadilla búlgara.' }),
  X({ id: 'g-rumano-1', name: 'Peso muerto rumano a una pierna', pat: 'unipodal', need: 'mancuerna', tier: 2, unit: 'kg', side: true, body: 'Isquiotibiales, glúteo y tobillo',
    why: 'Atrás del muslo, glúteo y equilibrio del tobillo al mismo tiempo.',
    how: ['Una mancuerna en la mano contraria a la pierna de apoyo.', 'Inclínate al frente llevando la otra pierna atrás, en línea con el tronco.', 'Baja hasta sentir el estirón y regresa apretando el glúteo.'],
    cues: ['Cadera nivelada, no la abras', 'Rodilla de apoyo un poco doblada'],
    err: 'Girar la cadera hacia afuera.',
    easier: 'Sin peso, tocando la pared con una mano.',
    harder: 'Más peso o pausa abajo.' }),

  // ---------- isquiotibiales ----------
  X({ id: 'g-nordico', name: 'Nórdico de isquiotibiales', pat: 'isquios', need: 'nada', tier: 2, unit: 'pc', body: 'Parte de atrás del muslo',
    why: 'Los programas que incluyen el nórdico bajaron cerca de la mitad las lesiones de isquiotibiales en varios deportes.',
    how: ['De rodillas sobre un tapete; un compañero te sujeta los talones (o mételos bajo algo firme).', 'Cuerpo recto de rodillas a cabeza.', 'Déjate caer al frente lo más lento que puedas, frenando con la parte de atrás del muslo.', 'Cuando ya no aguantes, cae con las manos y empújate para regresar.'],
    cues: ['Cadera estirada, no te dobles', 'Lo más lento posible'],
    err: 'Doblar la cadera para no caer.',
    easier: 'Recorrido corto, o con una liga en el pecho que te ayude.',
    harder: 'Bajar más y más lento.',
    dose: { nuevo: [2, '3-4'], medio: [2, '4-5'], avanzado: [3, '5-6'] },
    safety: 'Las primeras veces deja agujetas fuertes: empieza con pocas.' }),
  X({ id: 'g-curl-femoral', name: 'Curl femoral en máquina', pat: 'isquios', need: 'maquina', tier: 1, unit: 'kg', body: 'Parte de atrás del muslo',
    why: 'Isquiotibiales fuertes protegen la rodilla y aguantan los arranques y frenos.',
    how: ['Acomoda la máquina para que la rodilla quede alineada con el eje.', 'Dobla las rodillas llevando los talones hacia la cadera.', 'Regresa lento en 3 segundos.'],
    cues: ['Regreso lento', 'Cadera pegada al asiento'],
    err: 'Levantar la cadera para ayudarte.',
    easier: 'Menos peso.',
    harder: 'A una pierna.' }),
  X({ id: 'g-puente-1', name: 'Puente de isquios a una pierna', pat: 'isquios', need: 'cajon', tier: 1, unit: 'pc', side: true, body: 'Isquiotibiales y glúteos',
    why: 'Atrás del muslo y glúteo sin máquinas.',
    how: ['Acostado boca arriba, un talón sobre un banco y la otra pierna arriba.', 'Sube la cadera empujando con el talón.', 'Baja lento.'],
    cues: ['Empuja con el talón', 'Cadera nivelada'],
    err: 'Empujar con la espalda baja.',
    easier: 'Con los dos talones en el banco.',
    harder: 'Pausa de 2 segundos arriba.' }),

  // ---------- pantorrilla, tobillo y aductores ----------
  X({ id: 'g-talones-pie', name: 'Elevación de talones de pie', pat: 'pantorrilla', need: 'mancuerna', tier: 1, unit: 'kg', body: 'Pantorrilla y tendón de Aquiles',
    why: 'Pantorrillas y tendón de Aquiles fuertes aguantan cientos de saltos por semana.',
    how: ['Puntas en el borde de un escalón, una mancuerna en la mano (o en la máquina de pantorrilla).', 'Sube lo más alto que puedas.', 'Baja lento en 3 segundos hasta sentir el estirón.'],
    cues: ['Sube alto, baja despacio', 'Sin rebotar'],
    err: 'Rebotar abajo.',
    easier: 'Sin peso, con las dos piernas.',
    harder: 'A una pierna con peso.' }),
  X({ id: 'g-talones-sentado', name: 'Elevación de talones sentado', pat: 'pantorrilla', need: 'mancuerna', tier: 1, unit: 'kg', body: 'Sóleo (pantorrilla)',
    why: 'Trabaja el sóleo, el músculo de la pantorrilla que más carga al aterrizar y al correr.',
    how: ['Sentado, puntas sobre un disco o escalón, mancuernas sobre las rodillas (o en la máquina).', 'Sube los talones lo más alto que puedas.', 'Baja lento.'],
    cues: ['Rodillas a 90 grados', 'Pausa arriba'],
    err: 'Rebotar.',
    easier: 'Menos peso.',
    harder: 'Pausa de 2 segundos arriba.' }),
  X({ id: 'g-tibial', name: 'Elevación de puntas contra la pared', pat: 'pantorrilla', need: 'nada', tier: 1, unit: 'pc', body: 'Frente de la espinilla',
    why: 'Fortalece el frente de la espinilla: ayuda al tobillo a frenar.',
    how: ['Espalda apoyada en la pared, talones a un pie de distancia.', 'Sube las puntas de los pies lo más alto que puedas.', 'Baja lento.'],
    cues: ['Talones en el piso', 'Sube y baja controlado'],
    err: 'Despegar la espalda de la pared.',
    easier: 'Pies más cerca de la pared.',
    harder: 'Pies más lejos de la pared.' }),
  X({ id: 'g-copenhague', name: 'Plancha Copenhague', pat: 'aductor', need: 'cajon', tier: 2, unit: 's', side: true, body: 'Aductores (parte interna del muslo)',
    why: 'Aductores fuertes para frenar y cambiar de dirección. En otros deportes se usa para prevenir lesiones de ingle.',
    how: ['Plancha lateral con el antebrazo en el piso.', 'La pierna de arriba apoyada en un banco (rodilla o tobillo) y la de abajo libre.', 'Sube la cadera y aguanta el tiempo indicado.'],
    cues: ['Cuerpo recto', 'Empuja el banco con la pierna de arriba'],
    err: 'Dejar caer la cadera.',
    easier: 'Rodilla en el banco en lugar del tobillo.',
    harder: 'Tobillo en el banco y mueve la pierna de abajo.' }),

  // ---------- empuje ----------
  X({ id: 'g-press-banca', name: 'Press de banca con barra', pat: 'empuje', need: 'barra', tier: 2, unit: 'kg', body: 'Pecho, hombros y brazos',
    why: 'Fuerza de pecho y brazos para defender, caer al piso y equilibrar todo lo que jalas.',
    how: ['Acostado en el banco, ojos debajo de la barra, pies firmes en el piso.', 'Manos un poco más abiertas que los hombros; junta los omóplatos.', 'Baja la barra al pecho con los codos a unos 45 grados del cuerpo.', 'Empuja hasta estirar los brazos.'],
    cues: ['Omóplatos juntos y abajo', 'Codos a 45 grados, no abiertos'],
    err: 'Rebotar la barra en el pecho o despegar la cadera.',
    easier: 'Press de pecho con mancuernas.',
    harder: 'Pausa de 1 segundo en el pecho.',
    safety: 'Siempre con alguien que te cuide o en un rack con barras de seguridad.' }),
  X({ id: 'g-press-mancuernas', name: 'Press de pecho con mancuernas', pat: 'empuje', need: 'mancuerna', tier: 1, unit: 'kg', each: true, body: 'Pecho, hombros y brazos',
    why: 'Fuerza de empuje con cada brazo trabajando por su lado: equilibra el brazo fuerte y el débil.',
    how: ['Acostado en el banco, una mancuerna en cada mano a la altura del pecho.', 'Empuja hacia arriba hasta estirar los brazos.', 'Baja controlado con los codos a unos 45 grados.'],
    cues: ['Omóplatos juntos', 'Bajada controlada'],
    err: 'Abrir los codos en cruz.',
    easier: 'Menos peso o lagartijas.',
    harder: 'Más peso o pausa abajo.' }),
  X({ id: 'g-landmine', name: 'Press landmine a un brazo', pat: 'empuje', need: 'barra', tier: 2, unit: 'kg', side: true, body: 'Hombro, pecho y tronco',
    why: 'Empujar hacia arriba en diagonal: fuerza de hombro sin forzarlo, cerca del ángulo del remate.',
    how: ['Una punta de la barra en el piso (en una esquina o en su soporte); el peso va en la otra punta.', 'Hincado en una rodilla, toma la punta con peso a la altura del hombro.', 'Empuja hacia arriba y al frente hasta estirar el brazo.', 'Baja controlado.'],
    cues: ['Tronco firme, no te inclines', 'Termina con el brazo estirado'],
    err: 'Arquear la espalda para empujar.',
    easier: 'Solo la barra, sin discos.',
    harder: 'De pie, o con más peso.' }),
  X({ id: 'g-lagartija', name: 'Lagartijas con pausa', pat: 'empuje', need: 'nada', tier: 1, unit: 'pc', body: 'Pecho, brazos y tronco',
    why: 'Fuerza de brazos y tronco con tu peso; te prepara para caer al piso en defensa.',
    how: ['Manos un poco más abiertas que los hombros, cuerpo recto.', 'Baja el pecho casi al piso y quédate 1 segundo.', 'Sube empujando el piso.'],
    cues: ['Cuerpo como tabla', 'Pausa de 1 segundo abajo'],
    err: 'Dejar caer la cadera.',
    easier: 'Manos en un banco.',
    harder: 'Pies en un banco.' }),
  X({ id: 'g-press-hombro-m', name: 'Press de hombro con mancuernas', pat: 'empuje', need: 'mancuerna', tier: 2, unit: 'kg', each: true, body: 'Hombros y brazos',
    why: 'Fuerza con los brazos arriba de la cabeza, para el bloqueo y la colocación.',
    how: ['Sentado con respaldo, mancuernas a la altura de los hombros.', 'Empuja hacia arriba hasta casi estirar los brazos.', 'Baja controlado.'],
    cues: ['Costillas abajo, no arquees', 'Codos un poco al frente'],
    err: 'Arquear la espalda baja.',
    easier: 'Press landmine o menos peso.',
    harder: 'De pie.',
    safety: 'Si rematas mucho en la cancha o te molesta el hombro, prefiere el press landmine.' }),

  // ---------- jalón y remo ----------
  X({ id: 'g-dominada', name: 'Dominadas', pat: 'jalon', need: 'barra', tier: 2, unit: 'pc', body: 'Espalda y brazos',
    why: 'Una espalda fuerte equilibra el hombro que remata y lo protege.',
    how: ['Cuélgate de la barra fija con las palmas al frente, manos un poco más abiertas que los hombros.', 'Baja los hombros y sube hasta que la barbilla pase la barra.', 'Baja controlado hasta estirar los brazos.'],
    cues: ['Primero bajan los hombros, luego jalan los brazos', 'Sin columpiarte'],
    err: 'Columpiarse o hacer medias repeticiones.',
    easier: 'Con una liga en los pies o en la máquina asistida.',
    harder: 'Bajada de 3 segundos.' }),
  X({ id: 'g-remo-1', name: 'Remo con mancuerna a un brazo', pat: 'jalon', need: 'mancuerna', tier: 1, unit: 'kg', side: true, body: 'Espalda y brazos',
    why: 'Espalda alta fuerte para un hombro estable y una buena postura en recepción.',
    how: ['Rodilla y mano del mismo lado apoyadas en un banco, espalda recta.', 'Jala la mancuerna hacia la cadera, codo pegado.', 'Baja lento hasta estirar el brazo.'],
    cues: ['Lleva el codo a la bolsa del pantalón', 'Sin girar el tronco'],
    err: 'Girar el cuerpo para subir el peso.',
    easier: 'Menos peso.',
    harder: 'Pausa de 1 segundo arriba.' }),
  X({ id: 'g-jalon-polea', name: 'Jalón al pecho en polea', pat: 'jalon', need: 'polea', tier: 1, unit: 'kg', body: 'Espalda y brazos',
    why: 'Fuerza de espalda para equilibrar el hombro del remate.',
    how: ['Sentado, muslos bajo los soportes, manos un poco más abiertas que los hombros.', 'Baja los hombros y jala la barra hacia la parte alta del pecho.', 'Regresa lento hasta estirar los brazos.'],
    cues: ['Pecho al frente', 'Sin echarte para atrás'],
    err: 'Jalar detrás de la nuca.',
    easier: 'Menos peso.',
    harder: 'Dominadas.' }),
  X({ id: 'g-remo-invertido', name: 'Remo invertido', pat: 'jalon', need: 'barra', tier: 1, unit: 'pc', body: 'Espalda y brazos',
    why: 'Jalón con tu peso: espalda y omóplatos fuertes.',
    how: ['Barra del rack a la altura de la cadera (o correas tipo TRX).', 'Cuélgate debajo con el cuerpo recto y talones en el piso.', 'Jala el pecho hacia la barra y baja lento.'],
    cues: ['Cuerpo recto', 'Junta los omóplatos arriba'],
    err: 'Dejar caer la cadera.',
    easier: 'Barra más alta (cuerpo más vertical).',
    harder: 'Barra más baja o pies en un banco.' }),

  // ---------- hombro sano ----------
  X({ id: 'g-re-liga', name: 'Rotación externa de hombro con liga', pat: 'hombro', need: 'liga', tier: 1, unit: 'pc', side: true, body: 'Manguito rotador',
    why: 'Los músculos de atrás del hombro frenan el brazo después de cada remate y saque. Fuertes, cuidan tu hombro.',
    how: ['Liga amarrada a la altura del codo; párate de lado.', 'Codo pegado al cuerpo y doblado a 90 grados (una toalla enrollada entre el codo y el costado ayuda).', 'Gira el antebrazo hacia afuera sin despegar el codo.', 'Regresa lento en 3 segundos.'],
    cues: ['Codo pegado', 'Regreso lento'],
    err: 'Despegar el codo o girar el cuerpo.',
    easier: 'Liga más suave.',
    harder: 'Rotación externa a 90 grados.' }),
  X({ id: 'g-re-90', name: 'Rotación externa a 90 grados', pat: 'hombro', need: 'liga', tier: 2, unit: 'pc', side: true, body: 'Manguito rotador',
    why: 'Fortalece el hombro justo en la posición del remate y del saque, frenando el brazo como en la cancha.',
    how: ['Liga al frente a la altura del hombro.', 'Brazo arriba: codo a la altura del hombro y doblado a 90 grados.', 'Gira el antebrazo hacia atrás hasta que quede vertical.', 'Regresa muy lento, en 3 o 4 segundos.'],
    cues: ['Codo quieto a la altura del hombro', 'El regreso lento es lo importante'],
    err: 'Bajar el codo o arquear la espalda.',
    easier: 'Rotación externa con el codo pegado.',
    harder: 'Liga más fuerte, mismo regreso lento.' }),
  X({ id: 'g-ytw', name: 'Y, T y W en banco inclinado', pat: 'hombro', need: 'mancuerna', tier: 1, unit: 'kg', each: true, body: 'Hombro y omóplatos',
    why: 'Fortalece la parte de atrás del hombro y los músculos que mueven el omóplato.',
    how: ['Boca abajo en un banco inclinado, mancuernas de 1 a 3 kg.', 'Y: brazos al frente en forma de Y; súbelos y baja.', 'T: brazos a los lados en cruz; súbelos y baja.', 'W: codos doblados; junta los omóplatos y sube.'],
    cues: ['Pulgares hacia arriba', 'Lento, sin balanceo'],
    err: 'Usar tanto peso que te balanceas.',
    easier: 'Sin peso.',
    harder: 'Pausa de 2 segundos arriba.' }),
  X({ id: 'g-face-pull', name: 'Jalón a la cara (face pull)', pat: 'hombro', need: 'liga', tier: 1, unit: 'pc', body: 'Hombro de atrás y omóplatos',
    why: 'Equilibra todo el trabajo de pecho y de remate con la parte de atrás del hombro.',
    how: ['Polea con cuerda (o liga) a la altura de la cara.', 'Jala hacia la frente separando las manos y abriendo los codos.', 'Termina con los puños a los lados de la cabeza y regresa lento.'],
    cues: ['Codos altos', 'Junta los omóplatos'],
    err: 'Jalar con la espalda baja echándote atrás.',
    easier: 'Menos peso.',
    harder: 'Pausa de 2 segundos atrás.' }),
  X({ id: 'g-serrato', name: 'Lagartija plus', pat: 'hombro', need: 'nada', tier: 1, unit: 'pc', body: 'Serrato y omóplatos',
    why: 'Fortalece el serrato, el músculo que pega el omóplato a las costillas y ayuda a que el hombro trabaje bien arriba de la cabeza.',
    how: ['Posición de plancha con los brazos estirados.', 'Sin doblar los codos, deja que el pecho baje juntando los omóplatos.', 'Empuja el piso separando los omóplatos lo más que puedas.'],
    cues: ['Codos estirados', 'Empuja el piso lejos'],
    err: 'Doblar los codos (se vuelve lagartija).',
    easier: 'Con las rodillas apoyadas.',
    harder: 'Pausa de 2 segundos arriba.' }),

  // ---------- tronco ----------
  X({ id: 'g-pallof', name: 'Press Pallof (antirrotación)', pat: 'tronco', need: 'liga', tier: 1, unit: 'pc', side: true, body: 'Abdomen y costados',
    why: 'Un tronco que no se tuerce cuando no quieres: base firme para recibir, colocar y aterrizar.',
    how: ['De lado a la polea (o a una liga), tómala con las dos manos frente al pecho.', 'Empuja las manos al frente hasta estirar los brazos sin dejar que el cuerpo gire.', 'Aguanta 2 segundos y regresa.'],
    cues: ['Cadera y hombros al frente', 'Respira normal'],
    err: 'Dejar que la polea te gire.',
    easier: 'Liga más suave o más cerca de la polea.',
    harder: 'Hincado en una rodilla o con más peso.' }),
  X({ id: 'g-lenador', name: 'Leñador en polea', pat: 'tronco', need: 'polea', tier: 2, unit: 'kg', side: true, body: 'Abdomen y cadera',
    why: 'Rotación con control, de arriba hacia abajo, parecida al brazo del remate.',
    how: ['Polea arriba a un lado; tómala con las dos manos.', 'Gira la cadera y el tronco y jala en diagonal hasta la rodilla contraria.', 'Regresa lento.'],
    cues: ['Gira la cadera, no solo los brazos', 'Brazos casi estirados'],
    err: 'Doblar la espalda en lugar de girar.',
    easier: 'Menos peso.',
    harder: 'Más velocidad al bajar y regreso lento.' }),
  X({ id: 'g-plancha-lat', name: 'Plancha lateral', pat: 'tronco', need: 'nada', tier: 1, unit: 's', side: true, body: 'Costados y cadera',
    why: 'Costados fuertes para aterrizar y cambiar de dirección sin que se te doble el cuerpo.',
    how: ['De lado, apoyado en un antebrazo, piernas estiradas.', 'Sube la cadera hasta formar una línea recta.', 'Aguanta el tiempo indicado y cambia de lado.'],
    cues: ['Cadera arriba', 'Hombro sobre el codo'],
    err: 'Dejar caer la cadera.',
    easier: 'Con las rodillas apoyadas.',
    harder: 'Sube la pierna de arriba.' }),
  X({ id: 'g-deadbug', name: 'Bicho muerto con mancuerna', pat: 'tronco', need: 'mancuerna', tier: 1, unit: 'pc', side: true, body: 'Abdomen',
    why: 'Controlar el tronco mientras mueves brazos y piernas, como en cualquier jugada.',
    how: ['Boca arriba, brazos al techo (con una mancuerna ligera entre las manos) y rodillas a 90 grados.', 'Estira una pierna hacia el piso sin despegar la espalda baja.', 'Regresa y cambia de pierna.'],
    cues: ['Espalda baja pegada al piso', 'Exhala al estirar'],
    err: 'Arquear la espalda al estirar la pierna.',
    easier: 'Sin peso y con menos recorrido.',
    harder: 'Estira brazo y pierna contrarios al mismo tiempo.' }),
  X({ id: 'g-granjero', name: 'Caminata del granjero', pat: 'tronco', need: 'mancuerna', tier: 1, unit: 'kg', each: true, repsLabel: 'm', body: 'Tronco, agarre y hombros',
    why: 'Tronco firme y agarre fuerte caminando derecho: postura sólida en toda la cancha.',
    how: ['Una mancuerna pesada en cada mano.', 'Camina derecho, con pasos cortos, la distancia indicada.', 'Deja las mancuernas con la espalda recta.'],
    cues: ['Hombros abajo y atrás', 'Camina alto'],
    err: 'Encorvarte o balancearte.',
    easier: 'Menos peso.',
    harder: 'Una sola mancuerna (el tronco trabaja para no inclinarse).',
    dose: { nuevo: [2, '20 m'], medio: [3, '30 m'], avanzado: [3, '30 m'] } }),
];
export const GYM_BY_ID = Object.fromEntries(GYM.map((e) => [e.id, e]));
export const gymName = (id) => GYM_BY_ID[id]?.name || id;
export const groupOf = (ex) => Object.keys(GROUPS).find((g) => GROUPS[g].pats.includes(ex.pat));

// Preferencia de ejercicio por patrón. Se elige el primero que tu gym tiene y tu experiencia permite;
// si el mismo patrón sale otro día de la semana, se usa el siguiente para variar.
const ORDER = {
  salto: ['g-salto-cajon', 'g-salto-cargado', 'g-jalon-alto'],
  lanzamiento: ['g-lanz-arriba', 'g-lanz-giro', 'g-slam'],
  lateral: ['g-skater'],
  aterrizaje: ['g-aterrizaje'],
  rodilla: ['g-sent-trasera', 'g-sent-frontal', 'g-goblet', 'g-prensa'],
  cadera: ['g-hex', 'g-rumano-barra', 'g-rumano-mancuernas'],
  gluteo: ['g-hipthrust', 'g-hipthrust-m'],
  unipodal: ['g-bulgara', 'g-subida', 'g-zancada', 'g-rumano-1'],
  isquios: ['g-nordico', 'g-curl-femoral', 'g-puente-1'],
  pantorrilla: ['g-talones-pie', 'g-talones-sentado', 'g-tibial'],
  aductor: ['g-copenhague'],
  empuje: ['g-press-banca', 'g-press-mancuernas', 'g-landmine', 'g-lagartija', 'g-press-hombro-m'],
  jalon: ['g-dominada', 'g-remo-1', 'g-jalon-polea', 'g-remo-invertido'],
  hombro: ['g-re-90', 'g-re-liga', 'g-ytw', 'g-face-pull', 'g-serrato'],
  tronco: ['g-pallof', 'g-lenador', 'g-plancha-lat', 'g-deadbug', 'g-granjero'],
};
// Si en tu gym no hay nada de un patrón, se usa este otro.
const FALLBACK = { lanzamiento: 'salto', salto: 'lateral', lateral: 'aterrizaje', gluteo: 'cadera', aductor: 'unipodal', isquios: 'cadera' };

// ---------- objetivos ----------
// Cada día: [patrón o 'id:ejercicio', papel, prioridad]. Prioridad 1 nunca se quita; 2 y 3 se quitan si no alcanza el tiempo.
// Papel: pow (potencia), main (fuerza principal), acc (complementario), prev (prevención), core (tronco).
const D = (name, focus, slots) => ({ name, focus, slots });
export const GOALS = {
  salto: { name: 'Saltar más', icon: 'arrow-up', desc: 'Fuerza de piernas y potencia para el remate, el bloqueo y el saque en salto.',
    full: D('Cuerpo completo', 'Salto, piernas y hombro', [['salto', 'pow', 1], ['rodilla', 'main', 1], ['cadera', 'main', 1], ['unipodal', 'acc', 2], ['pantorrilla', 'prev', 2], ['hombro', 'prev', 2], ['tronco', 'core', 3], ['isquios', 'acc', 3]]),
    week: [
      D('Piernas y despegue', 'Sentadilla y saltos', [['salto', 'pow', 1], ['rodilla', 'main', 1], ['unipodal', 'acc', 1], ['gluteo', 'acc', 2], ['pantorrilla', 'prev', 2], ['tronco', 'core', 3], ['aterrizaje', 'prev', 3]]),
      D('Cadera y tren de arriba', 'Cadera, espalda y hombro', [['lanzamiento', 'pow', 1], ['cadera', 'main', 1], ['jalon', 'acc', 1], ['empuje', 'acc', 2], ['isquios', 'acc', 2], ['hombro', 'prev', 2], ['tronco', 'core', 3]]),
      D('Una pierna y aterrizaje', 'Fuerza a una pierna', [['lateral', 'pow', 1], ['unipodal', 'main', 1], ['isquios', 'acc', 2], ['aductor', 'prev', 2], ['pantorrilla', 'prev', 2], ['hombro', 'prev', 3], ['tronco', 'core', 3]]),
      D('Fuerza general', 'Todo el cuerpo', [['rodilla', 'main', 1], ['jalon', 'acc', 1], ['empuje', 'acc', 2], ['gluteo', 'acc', 2], ['hombro', 'prev', 2], ['tronco', 'core', 3]])] },
  fuerza: { name: 'Fuerza general', icon: 'dumbbell', desc: 'La base para todo: piernas, cadera, empuje, jalón y tronco.',
    full: D('Cuerpo completo', 'Los movimientos básicos', [['rodilla', 'main', 1], ['jalon', 'main', 1], ['cadera', 'main', 1], ['empuje', 'main', 2], ['unipodal', 'acc', 2], ['hombro', 'prev', 2], ['tronco', 'core', 3], ['pantorrilla', 'prev', 3]]),
    week: [
      D('Sentadilla y empuje', 'Piernas y pecho', [['rodilla', 'main', 1], ['empuje', 'main', 1], ['unipodal', 'acc', 2], ['jalon', 'acc', 2], ['pantorrilla', 'prev', 3], ['tronco', 'core', 3]]),
      D('Cadera y jalón', 'Cadera y espalda', [['cadera', 'main', 1], ['jalon', 'main', 1], ['empuje', 'acc', 2], ['isquios', 'acc', 2], ['hombro', 'prev', 2], ['tronco', 'core', 3]]),
      D('Potencia y una pierna', 'Saltos y fuerza a una pierna', [['salto', 'pow', 1], ['unipodal', 'main', 1], ['empuje', 'acc', 2], ['jalon', 'acc', 2], ['aductor', 'prev', 3], ['tronco', 'core', 3]]),
      D('Lanzamientos y piernas', 'Potencia y piernas', [['lanzamiento', 'pow', 1], ['rodilla', 'main', 1], ['jalon', 'acc', 2], ['gluteo', 'acc', 2], ['hombro', 'prev', 2], ['tronco', 'core', 3]])] },
  brazo: { name: 'Remate y saque más potentes', icon: 'zap', desc: 'Tronco que gira con fuerza, hombro fuerte y estable, y piernas que empujan.',
    full: D('Cuerpo completo', 'Lanzamientos, hombro y piernas', [['lanzamiento', 'pow', 1], ['rodilla', 'main', 1], ['jalon', 'main', 1], ['hombro', 'prev', 1], ['empuje', 'acc', 2], ['tronco', 'core', 2], ['cadera', 'acc', 3]]),
    week: [
      D('Brazo y tronco', 'Lanzamientos, espalda y hombro', [['lanzamiento', 'pow', 1], ['jalon', 'main', 1], ['empuje', 'acc', 1], ['hombro', 'prev', 1], ['tronco', 'core', 2], ['tronco', 'core', 3]]),
      D('Piernas', 'Base para golpear', [['salto', 'pow', 1], ['rodilla', 'main', 1], ['cadera', 'acc', 2], ['unipodal', 'acc', 2], ['hombro', 'prev', 2], ['pantorrilla', 'prev', 3]]),
      D('Hombro fuerte', 'Hombro y rotación', [['lanzamiento', 'pow', 1], ['jalon', 'acc', 1], ['empuje', 'acc', 2], ['hombro', 'prev', 1], ['hombro', 'prev', 2], ['tronco', 'core', 2]]),
      D('Cadera y tronco', 'Cadera y una pierna', [['cadera', 'main', 1], ['unipodal', 'acc', 2], ['isquios', 'acc', 2], ['tronco', 'core', 2], ['aductor', 'prev', 3]])] },
  prevencion: { name: 'Cuidar tobillos, rodillas y hombros', icon: 'shield-check', desc: 'Menos lesiones: aterrizajes, isquios, aductores, pantorrillas y hombro.',
    full: D('Prevención completa', 'Tobillo, rodilla y hombro', [['aterrizaje', 'prev', 1], ['unipodal', 'acc', 1], ['isquios', 'acc', 1], ['hombro', 'prev', 1], ['pantorrilla', 'prev', 2], ['aductor', 'prev', 2], ['id:g-sent-espanola', 'prev', 3], ['tronco', 'core', 3]]),
    week: [
      D('Rodilla y tobillo', 'Aterrizar y frenar', [['aterrizaje', 'prev', 1], ['rodilla', 'acc', 1], ['isquios', 'acc', 1], ['pantorrilla', 'prev', 2], ['hombro', 'prev', 2], ['tronco', 'core', 3]]),
      D('Hombro y una pierna', 'Hombro y equilibrio', [['unipodal', 'acc', 1], ['jalon', 'acc', 1], ['hombro', 'prev', 1], ['aductor', 'prev', 2], ['id:g-sent-espanola', 'prev', 2], ['tronco', 'core', 3]]),
      D('Lateral y cadera', 'Cambios de dirección', [['lateral', 'pow', 1], ['cadera', 'acc', 1], ['empuje', 'acc', 2], ['hombro', 'prev', 2], ['pantorrilla', 'prev', 2], ['tronco', 'core', 3]]),
      D('Repaso de prevención', 'Aterrizaje y hombro', [['aterrizaje', 'prev', 1], ['unipodal', 'acc', 1], ['isquios', 'acc', 2], ['hombro', 'prev', 2], ['tronco', 'core', 3]])] },
  rapidez: { name: 'Rapidez en la cancha', icon: 'timer', desc: 'Arrancar, frenar y cambiar de dirección: fuerza a una pierna y potencia de lado.',
    full: D('Cuerpo completo', 'Lateral y una pierna', [['lateral', 'pow', 1], ['salto', 'pow', 2], ['unipodal', 'main', 1], ['cadera', 'main', 2], ['aductor', 'prev', 2], ['pantorrilla', 'prev', 2], ['tronco', 'core', 3], ['hombro', 'prev', 3]]),
    week: [
      D('Frenar y arrancar', 'Lateral y una pierna', [['lateral', 'pow', 1], ['unipodal', 'main', 1], ['cadera', 'acc', 2], ['aductor', 'prev', 2], ['pantorrilla', 'prev', 3], ['tronco', 'core', 3]]),
      D('Piernas fuertes', 'Salto y sentadilla', [['salto', 'pow', 1], ['rodilla', 'main', 1], ['isquios', 'acc', 2], ['jalon', 'acc', 2], ['hombro', 'prev', 2], ['tronco', 'core', 3]]),
      D('Cambios de dirección', 'Lateral y glúteo', [['lateral', 'pow', 1], ['unipodal', 'main', 1], ['gluteo', 'acc', 2], ['empuje', 'acc', 2], ['aductor', 'prev', 3], ['tronco', 'core', 3]]),
      D('Cadera y tren de arriba', 'Cadera y espalda', [['lanzamiento', 'pow', 1], ['cadera', 'main', 1], ['jalon', 'acc', 2], ['hombro', 'prev', 2], ['pantorrilla', 'prev', 3]])] },
  regreso: { name: 'Volver después de una pausa', icon: 'refresh-cw', desc: 'Si vuelves de vacaciones, empiezas en el gym o ya te dieron de alta de una lesión.',
    full: D('Cuerpo completo suave', 'Todo, con poco peso', [['rodilla', 'acc', 1], ['cadera', 'acc', 1], ['jalon', 'acc', 1], ['empuje', 'acc', 2], ['hombro', 'prev', 2], ['pantorrilla', 'prev', 2], ['tronco', 'core', 3]]),
    week: [
      D('Piernas y espalda', 'Con poco peso', [['rodilla', 'acc', 1], ['jalon', 'acc', 1], ['pantorrilla', 'prev', 2], ['hombro', 'prev', 2], ['tronco', 'core', 3]]),
      D('Cadera y pecho', 'Con poco peso', [['cadera', 'acc', 1], ['empuje', 'acc', 1], ['unipodal', 'acc', 2], ['hombro', 'prev', 2], ['tronco', 'core', 3]]),
      D('Aterrizaje y una pierna', 'Con poco peso', [['aterrizaje', 'prev', 1], ['unipodal', 'acc', 1], ['jalon', 'acc', 2], ['isquios', 'acc', 2], ['tronco', 'core', 3]])] },
};

// ---------- dosis ----------
// [series, repeticiones, te sobran, descanso en segundos] por papel y experiencia.
const DOSE = {
  pow: { nuevo: [2, '5', null, 90], medio: [3, '4', null, 90], avanzado: [3, '3', null, 120] },
  main: { nuevo: [2, '10-12', 4, 90], medio: [3, '6-8', 3, 120], avanzado: [4, '5-6', 2, 150] },
  acc: { nuevo: [2, '10-12', 4, 60], medio: [3, '8-10', 2, 90], avanzado: [3, '8-10', 2, 90] },
  prev: { nuevo: [2, '12-15', 3, 45], medio: [2, '12-15', 2, 45], avanzado: [3, '12', 2, 45] },
  core: { nuevo: [2, '8-10', 3, 45], medio: [3, '10', 2, 45], avanzado: [3, '12', 2, 45] },
};
const HOLD = { nuevo: '20 s', medio: '30 s', avanzado: '40 s' };
const POWREPS = { salto: { nuevo: '5', medio: '4', avanzado: '3' }, lanzamiento: { nuevo: '6', medio: '6', avanzado: '5' },
  lateral: { nuevo: '5', medio: '5', avanzado: '6' }, aterrizaje: { nuevo: '5', medio: '6', avanzado: '6' } };
export const ROLE = { pow: 'Potencia', main: 'Fuerza', acc: 'Complemento', prev: 'Prevención', core: 'Tronco' };

const lowEnd = (reps) => String(reps).replace(/^(\d+)\s*-\s*\d+/, '$1');
export function topReps(reps) { const m = String(reps).match(/(\d+)(?:\s*-\s*(\d+))?/); return m ? Number(m[2] || m[1]) : null; }
export function lowReps(reps) { const m = String(reps).match(/(\d+)/); return m ? Number(m[1]) : null; }

function prescribe(ex, role, exp, phase) {
  let [sets, reps, rir, rest] = DOSE[role][exp];
  if (ex.unit === 's') reps = HOLD[exp];
  else if (role === 'pow' || ex.unit === 'saltos') reps = (POWREPS[ex.pat] || POWREPS.salto)[exp];
  if (ex.dose?.[exp]) [sets, reps] = ex.dose[exp];
  if (ex.pat === 'lanzamiento') rest = 60;
  if (role === 'pow' || ex.unit === 'saltos') rir = null;
  if (phase === 'temp') {
    if (role === 'main' || role === 'pow') sets = Math.max(2, sets - 1);
    else if (role === 'acc' && exp !== 'nuevo') sets = Math.max(2, sets - 1);
  }
  if (phase === 'torneo') {
    sets = Math.min(sets, 2);
    if (rir != null) { rir = Math.max(rir, 4); reps = lowEnd(reps); }
  }
  return { ex: ex.id, role, sets, reps, rir, rest };
}

// Minutos estimados de un ejercicio (trabajo + descansos).
export function itemMinutes(rx) {
  const ex = GYM_BY_ID[rx.ex]; if (!ex) return 0;
  const work = rx.role === 'pow' ? 15 : ex.unit === 's' ? (lowReps(rx.reps) || 30) : 35;
  return (rx.sets * (work * (ex.side ? 2 : 1) + rx.rest)) / 60;
}
export const WARM_MIN = 10, COOL_MIN = 5;
export const dayMinutes = (items) => Math.round(WARM_MIN + COOL_MIN + items.reduce((a, rx) => a + itemMinutes(rx), 0));

// ---------- la rutina ----------
export const DEFAULT_SPEC = { goal: 'salto', days: 2, minutes: 60, exp: 'nuevo', equip: 'completo', phase: 'temp' };
export function normSpec(s) {
  const o = { ...DEFAULT_SPEC, ...(s && typeof s === 'object' ? s : {}) };
  if (!GOALS[o.goal]) o.goal = DEFAULT_SPEC.goal;
  if (!EXP[o.exp]) o.exp = DEFAULT_SPEC.exp;
  if (!EQUIP[o.equip]) o.equip = DEFAULT_SPEC.equip;
  if (!PHASE[o.phase]) o.phase = DEFAULT_SPEC.phase;
  o.days = Math.min(4, Math.max(1, Math.round(Number(o.days) || 2)));
  o.minutes = MINUTES.includes(Number(o.minutes)) ? Number(o.minutes) : 60;
  return o;
}
export const isSpec = (s) => !!(s && typeof s === 'object' && GOALS[s.goal]);
export const maxDays = (spec) => (spec.phase === 'torneo' ? 1 : spec.phase === 'temp' || spec.goal === 'regreso' ? 3 : 4);
export const LETTERS = ['A', 'B', 'C', 'D'];

export function buildRoutine(raw) {
  const spec = normSpec(raw);
  const g = GOALS[spec.goal];
  const exp = spec.goal === 'regreso' ? 'nuevo' : spec.exp;
  const tierMax = spec.goal === 'regreso' ? 1 : EXP[spec.exp].tier;
  const n = Math.min(spec.days, maxDays(spec));
  const blueprints = n === 1 ? [g.full] : g.week.slice(0, n);
  const patUse = {};
  const pickEx = (pat, used) => {
    for (let p = pat, guard = 0; p && guard < 5; p = FALLBACK[p], guard++) {
      const list = (ORDER[p] || []).map((id) => GYM_BY_ID[id]).filter((e) => e && available(e, spec.equip) && e.tier <= tierMax && !used.has(e.id));
      if (list.length) { const k = patUse[p] || 0; patUse[p] = k + 1; return list[k % list.length]; }
    }
    return null;
  };
  const days = blueprints.map((bp, i) => {
    const used = new Set();
    let slots = bp.slots.map(([pat, role, p]) => ({ pat, role, p }));
    if (spec.phase === 'torneo') slots = slots.filter((s) => s.role !== 'pow' && s.pat !== 'aterrizaje' && s.p <= 2);
    if (spec.minutes <= 45) slots = slots.filter((s) => s.p <= 2);
    let items = [];
    for (const s of slots) {
      const ex = s.pat.startsWith('id:') ? GYM_BY_ID[s.pat.slice(3)] : pickEx(s.pat, used);
      if (!ex || used.has(ex.id) || !available(ex, spec.equip) || ex.tier > tierMax) continue;
      used.add(ex.id);
      items.push({ ...prescribe(ex, s.role, exp, spec.phase), p: s.p });
    }
    // Ajusta al tiempo: quita primero lo de menor prioridad (del final hacia atrás) y luego series de más.
    for (let guard = 0; guard < 20 && dayMinutes(items) > spec.minutes + 3; guard++) {
      let idx = -1, worst = 1;
      items.forEach((it, k) => { if (it.p > 1 && it.p >= worst) { worst = it.p; idx = k; } });
      if (idx >= 0) { items.splice(idx, 1); continue; }
      const big = items.filter((it) => it.sets > 2).sort((a, b) => b.sets - a.sets)[0];
      if (!big) break;
      big.sets -= 1;
    }
    items = items.map(({ p, ...rx }) => rx);
    return { key: LETTERS[i], name: bp.name, focus: bp.focus, items, min: dayMinutes(items) };
  });
  const notes = [];
  if (spec.days > n) notes.push(spec.phase === 'torneo' ? 'En semana de partido basta una sesión corta.' : `Para ${spec.phase === 'temp' ? 'temporada' : 'este objetivo'} Remate te deja ${n} días como máximo: con el voleibol, más días de gym te harían llegar cansado.`);
  if (spec.phase === 'temp' && n === 3) notes.push('En temporada, 2 días suelen bastar. Si llegas cansado a los entrenos, quita el día C.');
  if (exp === 'nuevo') notes.push('Las primeras 2 semanas: aprende la técnica con poco peso. Pide al instructor del gym que te vea en los ejercicios nuevos.');
  if (spec.goal === 'regreso') notes.push('Si vienes de una lesión, solo con el alta de tu médico o fisioterapeuta. Haz esta rutina 2 o 3 semanas y luego arma una con tu objetivo.');
  if (spec.phase === 'torneo') notes.push('Semana de partido: haz la sesión 3 días o más antes del partido. Nada de pierna pesada ni saltos en las 48 horas antes.');
  if (spec.equip === 'mancuernas' && (spec.goal === 'salto' || spec.goal === 'fuerza')) notes.push('Sin barra, la sentadilla goblet y la búlgara hacen el trabajo: cuando el peso más alto te quede ligero, haz la bajada en 3 segundos.');
  return { spec, n, days, notes };
}

// ---------- semana: qué días ir al gym ----------
// train: días de entrenamiento (0 domingo ... 6 sábado). Prefiere días sin entreno y separados entre sí.
export function weekPlan(n, train = []) {
  const week = [1, 2, 3, 4, 5, 6];
  const off = week.filter((d) => !train.includes(d));
  let chosen = [];
  if (n === 1) chosen = off.length ? [off[Math.floor((off.length - 1) / 2)]] : [];
  else if (off.length >= n) for (let i = 0; i < n; i++) chosen.push(off[Math.round((i * (off.length - 1)) / (n - 1))]);
  else chosen = [...off];
  chosen = [...new Set(chosen)];
  for (const d of week) { if (chosen.length >= n) break; if (!chosen.includes(d)) chosen.push(d); }
  return chosen.sort((a, b) => a - b).map((wd) => ({ wd, after: train.includes(wd) }));
}

// ---------- progresión: qué hacer la siguiente vez ----------
const incFor = (ex, kg) => (ex.need === 'barra' ? (kg < 80 ? 2.5 : 5) : kg < 10 ? 1 : 2);
const fmtKg = (x) => `${Math.round(x * 10) / 10}`;
// last: { s: [[kg, reps], ...] } de la última vez que hiciste ese ejercicio.
export function nextStep(rx, last) {
  const ex = GYM_BY_ID[rx.ex]; if (!ex) return '';
  if (rx.role === 'pow' || ex.unit === 'saltos') return 'Cada repetición a la máxima velocidad. Si pierdes altura o velocidad, para.';
  const sets = (last?.s || []).filter((x) => x && Number(x[1]) > 0);
  if (!sets.length) return ex.unit === 'kg' ? 'Primera vez: empieza ligero y busca el peso con el que te sobren las repeticiones que pide.' : '';
  const top = topReps(rx.reps), done = sets.length >= rx.sets && sets.every((x) => Number(x[1]) >= top);
  if (ex.unit === 's') return done ? 'La vez pasada aguantaste todo: súmale 5 a 10 segundos o pasa a la versión más difícil.' : 'Repite el mismo tiempo hasta completarlo en todas las series.';
  if (ex.unit === 'pc' || ex.unit === 'saltos') return done ? 'La vez pasada completaste todo: pasa a la versión más difícil o haz la bajada más lenta.' : `Busca llegar a ${top} en todas las series.`;
  const kg = Math.max(...sets.map((x) => Number(x[0]) || 0));
  if (!kg) return done ? 'Completaste todo: agrega un poco de peso.' : `Busca llegar a ${top} en todas las series.`;
  if (done) return `La vez pasada completaste todo con ${fmtKg(kg)} kg: prueba con ${fmtKg(kg + incFor(ex, kg))} kg y vuelve a ${lowReps(rx.reps)} repeticiones.`;
  return `Repite ${fmtKg(kg)} kg y busca llegar a ${top} en todas las series.`;
}

// Semana del bloque (bloques de 6 semanas: la 6 es ligera).
export function blockWeek(since, today = todayStr()) {
  if (!since) return null;
  const d = diffDays(today, since);
  if (d < 0) return null;
  const w = Math.floor(d / 7) + 1;
  return { week: ((w - 1) % 6) + 1, block: Math.floor((w - 1) / 6) + 1, light: ((w - 1) % 6) + 1 === 6, ends: addDays(since, Math.ceil(w / 6) * 42 - 1) };
}

// ---------- textos de apoyo ----------
export const WARMUP = [
  '5 minutos de cardio suave: bicicleta, caminadora inclinada o cuerda.',
  'Movilidad: rodilla a la pared sin despegar el talón (10 por pierna), cadera en 90/90 (6 por lado) y giro de espalda acostado de lado (6 por lado).',
  'Activación: puente de glúteo (10) y rotación externa con liga (12 por brazo).',
  'Antes del primer ejercicio con peso: 1 o 2 series ligeras de prueba.',
];
export const COOLDOWN = ['3 a 5 minutos caminando y respirando tranquilo.', 'Estiramiento suave de pantorrilla, cadera y pecho, 30 segundos cada uno.'];

export const READ = [
  ['3 × 8', '3 series de 8 repeticiones. «8-10» quiere decir entre 8 y 10.'],
  ['Te sobran 2', 'Elige un peso con el que, al terminar la serie, todavía podrías hacer 2 repeticiones más. Así entrenas fuerte sin llegar al fallo.'],
  ['Descanso', 'El tiempo entre series. En potencia descansa completo: la calidad importa más que el cansancio.'],
  ['Por lado', 'Las repeticiones son de cada pierna o de cada brazo.'],
  ['Cuándo subir', 'Cuando completes todas las series con el máximo de repeticiones, la siguiente vez sube un poco el peso y vuelve al mínimo de repeticiones. Remate te lo sugiere al registrar.'],
  ['Semana ligera', 'Cada 6 semanas, haz una semana con una serie menos y sin subir peso. Luego vuelve a armar tu rutina.'],
];

export const RULES = [
  'Ve con un instructor del gym o un adulto que sepa de pesas, sobre todo las primeras semanas. Primero la técnica; el peso después.',
  'Nunca pruebes cuánto aguantas a una sola repetición (tu máximo) sin un instructor. Remate no te lo pide: usa «te sobran 2».',
  'No llegues al fallo. Termina cada serie cuando todavía podrías hacer las repeticiones que dice la rutina.',
  'Calienta siempre 10 minutos y empieza cada ejercicio con 1 o 2 series ligeras.',
  'En press de banca y sentadilla con barra: alguien que te cuide o el rack con barras de seguridad. Ponle seguros a la barra.',
  'Si te duele una articulación (rodilla, hombro, espalda, tobillo), para y avísale a tu entrenador. Las agujetas de 1 o 2 días son normales; el dolor punzante no.',
  'Respira: suelta el aire al hacer la fuerza. No aguantes la respiración mucho tiempo.',
  'El gym ayuda al voleibol, no lo reemplaza: si el gym te hace llegar cansado a los entrenos, baja series o mueve el día.',
];

// Llegar bien al entreno y al partido.
export const ARRIVE = [
  { id: 'cuando', title: 'Cuándo ir al gym', icon: 'calendar-days', items: [
    'En temporada, 1 o 2 sesiones por semana bastan para mantener y seguir ganando fuerza. En pretemporada o vacaciones puedes hacer 3.',
    'El mejor momento: un día sin entreno, o el mismo día después del entreno. Evita pierna pesada justo antes de entrenar.',
    'Pierna pesada o saltos: al menos 2 días (48 horas) antes de un partido. El día antes de un partido, descansa del gym o haz solo hombro y tronco ligero.',
    'Deja al menos un día entre dos sesiones de pierna.'] },
  { id: 'dormir', title: 'Dormir', icon: 'timer', items: [
    'De 13 a 18 años se recomiendan de 8 a 10 horas cada noche. Dormir es cuando tu cuerpo se recupera y se hace más fuerte.',
    'Acuéstate y levántate más o menos a la misma hora, también en fin de semana.',
    'Deja el celular fuera de la cama 30 minutos antes de dormir.'] },
  { id: 'agua', title: 'Agua', icon: 'activity', items: [
    'Lleva tu botella todo el día y toma poco y seguido. No esperes a tener sed.',
    'El agua es la mejor bebida para entrenar. Las bebidas deportivas solo hacen falta en sesiones largas e intensas (más de hora y media).',
    'Bebidas energéticas y «pre-entrenos»: nunca. Tienen estimulantes que no son para tu edad.'] },
  { id: 'comer', title: 'Comer para entrenar', icon: 'flame', items: [
    '2 a 3 horas antes: una comida normal con carbohidratos (tortillas, arroz, pan, avena, fruta) y algo de proteína (huevo, frijoles, pollo, queso, leche o yogur).',
    'Si solo tienes una hora: algo ligero, como un plátano, pan con crema de cacahuate, yogur o fruta.',
    'Después, en la siguiente hora o dos: una comida con proteína y carbohidratos, por ejemplo quesadillas con frijoles, una torta de pollo, arroz con huevo o un licuado de leche con plátano.',
    'Reparte la comida en el día y no entrenes en ayunas.',
    'No hagas dietas por tu cuenta para bajar o subir de peso. Si te interesa, platícalo con tu entrenador, tu familia y un nutriólogo.'] },
  { id: 'suple', title: 'Suplementos', icon: 'shield', items: [
    'No los necesitas. Con buena comida, buen sueño y una rutina constante tienes lo que hace falta.',
    'Proteína en polvo: si comes bien, no hace falta. Creatina, quemadores y «boosters»: la Academia Americana de Pediatría no los recomienda en menores de edad.',
    'Ojo: muchos suplementos no traen lo que dice la etiqueta y algunos están contaminados.'] },
  { id: 'llegar', title: 'Cómo saber si llegas bien', icon: 'check', items: [
    'Al llegar al entreno te sientes con piernas «frescas» y sin dolor en articulaciones.',
    'Si llegas cansado al entreno después del gym, baja una serie o cambia el día del gym.',
    'Tus pruebas físicas (salto, 10 m y plancha) dicen si funciona: deben mantenerse o subir durante la temporada.'] },
];

// Fuentes (también aparecen en Ayuda).
export const GYM_SOURCES = [
  ['Fuerza en jóvenes: consenso internacional de 2014 (Lloyd y cols., British Journal of Sports Medicine). Empezar con pocas series y peso ligero, aprender la técnica con supervisión, avanzar a 2 a 4 series de 6 a 12 repeticiones y seguir entrenando fuerza durante la temporada.', 'https://doi.org/10.1136/bjsports-2013-092952'],
  ['Potencia en voleibol (NSCA, «Developing Power»): en temporada no hace falta mucha pliometría en el gym, porque ya saltan cientos de veces en entrenos y partidos.', 'https://us.humankinetics.com/blogs/excerpt/training-power-for-volleyball'],
  ['Fuerza en temporada en deportistas de preparatoria (NSCA, «Strength Training for Basketball», deporte con muchos saltos): 1 o 2 sesiones por semana de 30 a 45 minutos, acomodadas alrededor de entrenos y partidos.', 'https://us.humankinetics.com/blogs/excerpt/length-structure-and-organization-of-in-season-programs'],
  ['Nórdico de isquiotibiales: los programas que lo incluyen bajaron cerca de la mitad las lesiones de isquiotibiales (van Dyk y cols., British Journal of Sports Medicine, 2019). Un análisis posterior pide tomar la cifra con cautela.', 'https://bjsm.bmj.com/content/53/21/1362'],
  ['Entrenamiento neuromuscular (fuerza, saltos y aterrizajes) para prevenir lesiones de ligamento cruzado en mujeres jóvenes: baja el riesgo cerca de la mitad (Petushek y cols., 2019).', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6592422'],
  ['Escala de «te sobran» (repeticiones en reserva) para elegir el peso sin probar tu máximo: Zourdos y cols., Journal of Strength and Conditioning Research, 2016.', 'https://pubmed.ncbi.nlm.nih.gov/26049792/'],
  ['Sueño: la Academia Americana de Medicina del Sueño recomienda de 8 a 10 horas para jóvenes de 13 a 18 años (2016).', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4877308'],
  ['Comida y agua del deportista adolescente: Sports Dietitians Australia, 2014. Comida con carbohidratos y proteína repartida en el día y alrededor del entreno, agua como bebida principal y sin suplementos para mejorar el rendimiento.', 'https://doi.org/10.1123/ijsnem.2014-0031'],
  ['Bebidas deportivas y energéticas: Academia Americana de Pediatría, 2011. Agua como bebida principal; las energéticas nunca en niños ni adolescentes.', 'https://doi.org/10.1542/peds.2011-0965'],
  ['Suplementos para rendir más en adolescentes: Academia Americana de Pediatría, 2016.', 'https://doi.org/10.1542/peds.2016-1300'],
];
