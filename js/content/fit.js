// Remate Fit (v3.11): gym para adultos (18+). Usa la biblioteca del Gym de los chavos y le suma ejercicios
// para músculo (aislados, máquinas, en casa y en la cancha). Las series, repeticiones y «te sobran» son
// propuestas de Remate basadas en las fuentes de FIT_SOURCES, no cifras de un estudio en particular.
import { GYM, NEED, TIER, topReps, lowReps } from './gym.js';
import { todayStr, addDays, diffDays } from '../util.js';

const X = (o) => ({ safety: '', side: false, each: false, adult: true, ...o });

// ---------- ejercicios nuevos (solo Remate Fit) ----------
export const FIT_EX = [
  X({ id: 'f-curl-m', name: 'Curl de bíceps con mancuernas', pat: 'biceps', need: 'mancuerna', tier: 1, unit: 'kg', each: true, body: 'Bíceps',
    why: 'El ejercicio más directo para el bíceps. También ayuda a que el codo aguante los jalones.',
    how: ['De pie, una mancuerna en cada mano, palmas al frente y codos pegados al cuerpo.', 'Sube las mancuernas doblando solo los codos, sin mover los hombros.', 'Aprieta arriba un segundo y baja en 2 o 3 segundos hasta estirar casi completo.'],
    cues: ['Codos quietos', 'Baja lento'], err: 'Columpiar el cuerpo para subir el peso.', easier: 'Menos peso o un brazo a la vez apoyado en un banco inclinado.', harder: 'Bajada en 4 segundos o curl martillo con más peso.' }),
  X({ id: 'f-curl-liga', name: 'Curl de bíceps con liga', pat: 'biceps', need: 'liga', tier: 1, unit: 'pc', body: 'Bíceps',
    why: 'El mismo trabajo de bíceps en casa o en la cancha, solo con una liga.',
    how: ['Pisa la liga con los dos pies y toma los extremos, palmas al frente.', 'Dobla los codos sin moverlos de los costados.', 'Baja lento hasta estirar los brazos.'],
    cues: ['Codos quietos', 'Tensión hasta abajo'], err: 'Soltar la liga de golpe al bajar.', easier: 'Pisa la liga con un solo pie (menos tensión).', harder: 'Liga más dura o acorta la liga.' }),
  X({ id: 'f-ext-triceps-polea', name: 'Extensión de tríceps en polea', pat: 'triceps', need: 'polea', tier: 1, unit: 'kg', body: 'Tríceps',
    why: 'Aísla el tríceps, que extiende el codo en el remate y el saque.',
    how: ['De frente a la polea alta, con cuerda o barra corta. Codos pegados a los costados.', 'Empuja hacia abajo hasta estirar los codos por completo.', 'Regresa despacio hasta que los antebrazos queden horizontales.'],
    cues: ['Solo se mueven los antebrazos', 'Estira completo abajo'], err: 'Meter el tronco y los hombros para empujar.', easier: 'Menos peso.', harder: 'Un brazo a la vez o pausa de 1 segundo abajo.' }),
  X({ id: 'f-ext-triceps-m', name: 'Extensión de tríceps por arriba de la cabeza', pat: 'triceps', need: 'mancuerna', tier: 1, unit: 'kg', body: 'Tríceps',
    why: 'Estira el tríceps más que otros ejercicios; trabaja la parte larga del músculo.',
    how: ['Sentado o de pie, toma una mancuerna con las dos manos arriba de la cabeza.', 'Baja la mancuerna detrás de la cabeza doblando los codos, que apuntan al techo.', 'Sube hasta estirar los brazos.'],
    cues: ['Codos al techo', 'Tronco firme'], err: 'Abrir mucho los codos o arquear la espalda.', easier: 'Menos peso o con liga.', harder: 'Más peso o bajada en 3 segundos.', safety: 'Si te molesta el hombro, cámbialo por la extensión en polea.' }),
  X({ id: 'f-fondos-banco', name: 'Fondos en banco', pat: 'triceps', need: 'cajon', tier: 1, unit: 'pc', body: 'Tríceps y pecho',
    why: 'Tríceps con tu peso, en casa o en una banca de la cancha.',
    how: ['Manos en la orilla de un banco firme, detrás de ti, y piernas al frente.', 'Baja doblando los codos hasta que los brazos queden casi horizontales.', 'Empuja hasta estirar los codos.'],
    cues: ['Codos hacia atrás, no abiertos', 'Hombros lejos de las orejas'], err: 'Bajar demasiado y forzar el hombro.', easier: 'Rodillas dobladas y pies cerca.', harder: 'Piernas estiradas o pies sobre otro banco.', safety: 'No bajes más de lo que tu hombro aguante sin dolor.' }),
  X({ id: 'f-elev-lateral', name: 'Elevaciones laterales', pat: 'lateral', need: 'mancuerna', tier: 1, unit: 'kg', each: true, body: 'Hombro (deltoides lateral)',
    why: 'El hombro «ancho». Pocos ejercicios lo trabajan tan directo.',
    how: ['De pie, una mancuerna ligera en cada mano a los costados, codos un poco doblados.', 'Sube los brazos a los lados hasta la altura del hombro.', 'Baja en 2 o 3 segundos.'],
    cues: ['Sube con los codos, no con las manos', 'Hasta la altura del hombro'], err: 'Tanto peso que subes con impulso o encogiendo los hombros.', easier: 'Menos peso o un brazo a la vez.', harder: 'Bajada en 4 segundos o con liga al final de la serie.' }),
  X({ id: 'f-elev-lateral-liga', name: 'Elevaciones laterales con liga', pat: 'lateral', need: 'liga', tier: 1, unit: 'pc', body: 'Hombro (deltoides lateral)',
    why: 'Las elevaciones laterales en casa o en la cancha.',
    how: ['Pisa la liga y toma los extremos con las manos a los costados.', 'Sube los brazos a los lados hasta la altura del hombro.', 'Baja despacio.'],
    cues: ['Codos un poco doblados', 'Sin encoger'], err: 'Encoger los hombros al subir.', easier: 'Liga más suave.', harder: 'Liga más dura o pausa arriba.' }),
  X({ id: 'f-apertura', name: 'Aperturas con mancuernas', pat: 'pecho', need: 'mancuerna', tier: 1, unit: 'kg', each: true, body: 'Pecho',
    why: 'Estira y trabaja el pecho sin cargar tanto el tríceps.',
    how: ['Acostado en un banco plano, mancuernas arriba del pecho con las palmas de frente.', 'Abre los brazos hacia los lados con los codos un poco doblados, hasta sentir que estira el pecho.', 'Junta de nuevo arriba como si abrazaras un árbol.'],
    cues: ['Codos un poco doblados todo el tiempo', 'Baja controlado'], err: 'Estirar los codos por completo y cargar el hombro.', easier: 'Menos peso y bajar menos.', harder: 'Banco inclinado o pausa abajo.', safety: 'Si te molesta el hombro, baja menos.' }),
  X({ id: 'f-press-inclinado', name: 'Press inclinado con mancuernas', pat: 'empuje', need: 'mancuerna', tier: 1, unit: 'kg', each: true, body: 'Pecho alto y hombro',
    why: 'Pecho, sobre todo la parte de arriba, con un recorrido cómodo para el hombro.',
    how: ['Banco a 30 o 45 grados. Mancuernas a los lados del pecho.', 'Empuja hacia arriba hasta casi estirar los brazos.', 'Baja controlado hasta que las mancuernas queden a la altura del pecho.'],
    cues: ['Omóplatos juntos y abajo', 'Codos a 45° del cuerpo'], err: 'Rebotar abajo o arquear mucho la espalda.', easier: 'Banco menos inclinado o menos peso.', harder: 'Más peso o pausa abajo.' }),
  X({ id: 'f-flexion-pies', name: 'Lagartijas con pies elevados', pat: 'empuje', need: 'cajon', tier: 2, unit: 'pc', body: 'Pecho alto, hombro y tríceps',
    why: 'Más difícil que la lagartija normal: pecho y hombro sin pesas.',
    how: ['Pies sobre una banca o un escalón y manos en el piso, un poco más abiertas que los hombros.', 'Baja el pecho hasta casi tocar el piso con el cuerpo recto.', 'Empuja hasta estirar los brazos.'],
    cues: ['Cuerpo recto como tabla', 'Codos a 45°'], err: 'Dejar caer la cadera.', easier: 'Lagartija normal en el piso.', harder: 'Escalón más alto o con mochila con peso.' }),
  X({ id: 'f-press-liga', name: 'Press de hombro con liga', pat: 'empuje_v', need: 'liga', tier: 1, unit: 'pc', body: 'Hombro y tríceps',
    why: 'Empuje hacia arriba en casa o en la cancha.',
    how: ['Pisa la liga y sube las manos a la altura de los hombros.', 'Empuja hacia arriba hasta estirar los brazos.', 'Baja despacio a los hombros.'],
    cues: ['Abdomen firme', 'Sin arquear la espalda'], err: 'Arquear la espalda para empujar.', easier: 'Liga más suave o un brazo a la vez.', harder: 'Liga más dura.' }),
  X({ id: 'f-remo-barra', name: 'Remo con barra', pat: 'remo', need: 'barra', tier: 2, unit: 'kg', body: 'Espalda media y alta',
    why: 'Un remo pesado para toda la espalda; equilibra todo lo que empujas.',
    how: ['De pie, toma la barra con las manos a la anchura de los hombros. Inclina el tronco hacia el frente con la espalda recta y las rodillas un poco dobladas.', 'Jala la barra hacia el ombligo llevando los codos atrás.', 'Baja controlado hasta estirar los brazos.'],
    cues: ['Espalda recta', 'Codos hacia atrás'], err: 'Levantar el tronco para subir la barra.', easier: 'Remo con mancuerna a un brazo.', harder: 'Más peso o pausa de 1 segundo arriba.', safety: 'Si te molesta la espalda baja, usa el remo con apoyo en banco.' }),
  X({ id: 'f-remo-polea', name: 'Remo sentado en polea', pat: 'remo', need: 'polea', tier: 1, unit: 'kg', body: 'Espalda media',
    why: 'Remo cómodo y fácil de controlar para sumar series de espalda.',
    how: ['Sentado, pies apoyados y rodillas un poco dobladas. Toma el agarre con los brazos estirados.', 'Jala hacia el abdomen llevando los codos atrás y juntando los omóplatos.', 'Regresa estirando los brazos sin encorvarte.'],
    cues: ['Pecho alto', 'Junta los omóplatos'], err: 'Echarse para atrás para jalar.', easier: 'Menos peso.', harder: 'Pausa de 2 segundos atrás.' }),
  X({ id: 'f-remo-liga', name: 'Remo con liga', pat: 'remo', need: 'liga', tier: 1, unit: 'pc', body: 'Espalda media',
    why: 'Remo en casa: la liga amarrada a un poste o a la red.',
    how: ['Amarra la liga a algo firme a la altura del pecho. De frente, con los brazos estirados.', 'Jala hacia el abdomen llevando los codos atrás.', 'Regresa despacio.'],
    cues: ['Omóplatos juntos', 'Sin encoger'], err: 'Jalar con los hombros encogidos.', easier: 'Acércate al poste (menos tensión).', harder: 'Aléjate o usa liga más dura.' }),
  X({ id: 'f-jalon-liga', name: 'Jalón con liga', pat: 'jalon_v', need: 'liga', tier: 1, unit: 'pc', body: 'Espalda (dorsales)',
    why: 'El jalón al pecho en casa: la liga arriba de una puerta o de la red.',
    how: ['Amarra la liga arriba. Hincado o sentado, brazos estirados hacia arriba.', 'Jala hacia el pecho bajando los codos a los costados.', 'Regresa despacio.'],
    cues: ['Codos hacia las bolsas del pantalón', 'Pecho alto'], err: 'Jalar con los brazos sin bajar los hombros.', easier: 'Liga más suave.', harder: 'Liga más dura o pausa abajo.' }),
  X({ id: 'f-ext-cuad', name: 'Extensión de cuádriceps', pat: 'cuadriceps', need: 'maquina', tier: 1, unit: 'kg', body: 'Cuádriceps',
    why: 'Aísla el cuádriceps, el músculo que más trabaja en el despegue y la frenada.',
    how: ['Sentado en la máquina, el rodillo sobre los tobillos y la espalda pegada al respaldo.', 'Estira las rodillas por completo.', 'Baja en 2 o 3 segundos.'],
    cues: ['Estira completo', 'Baja lento'], err: 'Patear el peso hacia arriba.', easier: 'Menos peso.', harder: 'Pausa de 1 segundo arriba.' }),
  X({ id: 'f-sent-pc', name: 'Sentadilla con peso corporal o tus polainas', pat: 'rodilla', need: 'nada', tier: 1, unit: 'pc', body: 'Piernas completas',
    why: 'La sentadilla sin pesas. Con las polainas en las manos o en una mochila se vuelve más pesada.',
    how: ['Pies a la anchura de los hombros, puntas un poco hacia afuera.', 'Baja la cadera atrás y abajo hasta que los muslos queden paralelos al piso o más.', 'Sube empujando el piso.'],
    cues: ['Rodillas sobre las puntas', 'Pecho alto'], err: 'Que las rodillas se vayan hacia adentro.', easier: 'Siéntate y párate de una silla.', harder: 'Baja en 3 segundos, pausa abajo o carga una mochila con peso.' }),
  X({ id: 'f-zancada-atras', name: 'Zancada hacia atrás', pat: 'unipodal', need: 'nada', tier: 1, unit: 'pc', side: true, body: 'Cuádriceps y glúteo',
    why: 'Pierna a pierna, más amable con la rodilla que la zancada al frente.',
    how: ['De pie, da un paso largo hacia atrás.', 'Baja hasta que la rodilla de atrás casi toque el piso.', 'Empuja con la pierna de adelante para regresar.'],
    cues: ['Tronco alto', 'Rodilla de adelante sobre el pie'], err: 'Dar el paso muy corto y cargar la rodilla de adelante.', easier: 'Apóyate en una pared.', harder: 'Con mancuernas, polainas o una mochila.' }),
  X({ id: 'f-sprint', name: 'Sprints cortos', pat: 'sprint', need: 'nada', tier: 1, unit: 'saltos', repsLabel: 'Sprints', body: 'Piernas y velocidad',
    why: 'Velocidad y potencia de piernas. En la cancha cuentan como trabajo de alta intensidad.',
    how: ['Calienta bien antes (5 a 10 minutos y aceleraciones suaves).', 'Corre 10 a 20 metros a máxima velocidad.', 'Regresa caminando y descansa hasta sentirte fresco (1 a 2 minutos).'],
    cues: ['Inclínate al arrancar', 'Calidad, no cansancio'], err: 'Hacerlos cansado: ya no son de velocidad.', easier: 'Al 80% de tu velocidad.', harder: 'Arranques desde el piso o en subida.', safety: 'Nada de sprints si traes molestia en el muslo de atrás.' }),
];

export const ALL_EX = [...GYM, ...FIT_EX];
export const FIT_BY_ID = Object.fromEntries(ALL_EX.map((e) => [e.id, e]));
export const fitName = (id) => FIT_BY_ID[id]?.name || id;

// ---------- dónde entrenas ----------
export const PLACES = {
  completo: { name: 'Gym completo', desc: 'Máquinas, poleas, barra, rack y mancuernas.', has: new Set(Object.keys(NEED)) },
  basico: { name: 'Gym básico', desc: 'Barra, rack, banco y mancuernas, sin máquinas ni poleas.', has: new Set(['barra', 'mancuerna', 'cajon', 'balon', 'liga', 'nada']) },
  casa: { name: 'En casa', desc: 'Mancuernas o ligas, una silla o banco, tu peso y tus polainas.', has: new Set(['mancuerna', 'liga', 'cajon', 'nada']) },
  cancha: { name: 'Cancha o al aire libre', desc: 'Tu peso, ligas, una banca y balón medicinal si hay.', has: new Set(['nada', 'liga', 'cajon', 'balon']) },
};
export const fitAvailable = (ex, place) => !!PLACES[place]?.has.has(ex.need);

export const FIT_GOALS = {
  musculo: { name: 'Ganar músculo', icon: 'dumbbell', desc: 'Más músculo con bastantes series por semana, cerca del fallo. Comer un poco más de lo que gastas.' },
  grasa: { name: 'Bajar grasa', icon: 'flame', desc: 'Conservar (o ganar) músculo mientras bajas grasa: pesas fuertes, pasos diarios y comer un poco menos.' },
  fuerza: { name: 'Fuerza y salto', icon: 'arrow-up', desc: 'Fuerza máxima y potencia para jugar mejor: pesado, pocas repeticiones y saltos de calidad.' },
  salud: { name: 'Salud y mantenimiento', icon: 'shield-check', desc: 'Lo básico bien hecho: todo el cuerpo 2 o 3 veces por semana, sin lesionarte.' },
};
export const FIT_EXP = {
  nuevo: { name: 'Empiezo', desc: 'Menos de 6 meses entrenando con pesas.', tier: 1 },
  medio: { name: 'Intermedio', desc: 'De 6 meses a 2 años, con buena técnica.', tier: 2 },
  avanzado: { name: 'Avanzado', desc: 'Más de 2 años constante y buena técnica en los básicos.', tier: 3 },
};
export const FIT_MINUTES = [45, 60, 75, 90];

// ---------- patrones: qué ejercicio se usa en cada uno (el primero que tu lugar y tu experiencia permiten) ----------
const ORDER = {
  sq: ['g-sent-trasera', 'g-sent-frontal', 'g-prensa', 'g-goblet', 'f-sent-pc'],
  hinge: ['g-rumano-barra', 'g-hex', 'g-rumano-mancuernas', 'g-rumano-1', 'g-puente-1'],
  uni: ['g-bulgara', 'g-zancada', 'g-subida', 'f-zancada-atras'],
  glute: ['g-hipthrust', 'g-hipthrust-m', 'g-puente-1'],
  ham: ['g-curl-femoral', 'g-nordico', 'g-rumano-1', 'g-puente-1'],
  quad: ['f-ext-cuad', 'g-subida', 'f-sent-pc'],
  calf: ['g-talones-pie', 'g-talones-sentado', 'g-tibial'],
  hpush: ['g-press-banca', 'g-press-mancuernas', 'f-press-inclinado', 'f-flexion-pies', 'g-lagartija'],
  ipush: ['f-press-inclinado', 'g-press-mancuernas', 'g-landmine', 'f-flexion-pies', 'g-lagartija'],
  vpush: ['g-press-hombro-m', 'g-landmine', 'f-press-liga'],
  vpull: ['g-dominada', 'g-jalon-polea', 'f-jalon-liga', 'g-remo-invertido'],
  row: ['f-remo-barra', 'f-remo-polea', 'g-remo-1', 'g-remo-invertido', 'f-remo-liga'],
  lat: ['f-elev-lateral', 'f-elev-lateral-liga'],
  rear: ['g-face-pull', 'g-ytw', 'g-re-90', 'g-re-liga'],
  bi: ['f-curl-m', 'f-curl-liga'],
  tri: ['f-ext-triceps-polea', 'f-ext-triceps-m', 'f-fondos-banco'],
  fly: ['f-apertura', 'f-flexion-pies', 'g-lagartija'],
  core: ['g-pallof', 'g-lenador', 'g-deadbug', 'g-plancha-lat'],
  pow: ['g-salto-cajon', 'g-salto-cargado', 'g-skater'],
  throw: ['g-lanz-arriba', 'g-slam', 'g-lanz-giro'],
  sprint: ['f-sprint'],
};
// Músculo de cada patrón para contar series por semana: 1 directa, 0.5 indirecta (como Pelland y cols., 2024).
export const MUSCLES = { pecho: 'Pecho', espalda: 'Espalda', hombro: 'Hombro', biceps: 'Bíceps', triceps: 'Tríceps', cuadriceps: 'Cuádriceps', isquios: 'Isquiotibiales', gluteo: 'Glúteo', pantorrilla: 'Pantorrilla', abdomen: 'Tronco' };
const HITS = {
  sq: { cuadriceps: 1, gluteo: 0.5 }, hinge: { isquios: 1, gluteo: 1 }, uni: { cuadriceps: 1, gluteo: 0.5 }, glute: { gluteo: 1, isquios: 0.5 },
  ham: { isquios: 1 }, quad: { cuadriceps: 1 }, calf: { pantorrilla: 1 }, hpush: { pecho: 1, triceps: 0.5, hombro: 0.5 }, ipush: { pecho: 1, hombro: 0.5, triceps: 0.5 },
  vpush: { hombro: 1, triceps: 0.5 }, vpull: { espalda: 1, biceps: 0.5 }, row: { espalda: 1, biceps: 0.5, hombro: 0.5 }, lat: { hombro: 1 }, rear: { hombro: 0.5, espalda: 0.5 },
  bi: { biceps: 1 }, tri: { triceps: 1 }, fly: { pecho: 1 }, core: { abdomen: 1 }, pow: {}, throw: {}, sprint: {},
};
// Si en tu lugar no hay nada de un patrón, se usa este otro.
const FALLBACK = { quad: 'uni', glute: 'hinge', ham: 'hinge', ipush: 'hpush', fly: 'hpush', vpush: 'ipush', rear: 'row', pow: 'sprint', throw: 'pow', sprint: 'pow' };
const LOWER = new Set(['sq', 'hinge', 'uni', 'glute', 'ham', 'quad', 'calf', 'pow', 'sprint']);

// ---------- días ----------
// [patrón, papel, prioridad]. Papel: main (básico pesado), sec (básico secundario), acc (aislado), core, pow (potencia).
// Prioridad 1 nunca se quita; 2 y 3 se quitan si no alcanza el tiempo.
const D = (name, focus, kind, slots) => ({ name, focus, kind, slots });
const DAYS = {
  fullA: D('Cuerpo completo A', 'Sentadilla, pecho y remo', 'full', [['pow', 'pow', 2], ['sq', 'main', 1], ['hpush', 'main', 1], ['row', 'sec', 1], ['ham', 'acc', 2], ['lat', 'acc', 2], ['core', 'core', 3], ['bi', 'acc', 3]]),
  fullB: D('Cuerpo completo B', 'Cadera, jalón y hombro', 'full', [['throw', 'pow', 2], ['hinge', 'main', 1], ['vpull', 'main', 1], ['vpush', 'sec', 1], ['uni', 'sec', 2], ['tri', 'acc', 2], ['calf', 'acc', 3], ['rear', 'acc', 3]]),
  fullC: D('Cuerpo completo C', 'Una pierna, pecho alto y espalda', 'full', [['pow', 'pow', 2], ['uni', 'main', 1], ['ipush', 'sec', 1], ['row', 'sec', 1], ['glute', 'acc', 2], ['lat', 'acc', 2], ['bi', 'acc', 3], ['core', 'core', 3]]),
  upA: D('Torso A', 'Pecho, espalda y brazos', 'upper', [['throw', 'pow', 3], ['hpush', 'main', 1], ['row', 'main', 1], ['vpush', 'sec', 2], ['vpull', 'sec', 2], ['lat', 'acc', 2], ['tri', 'acc', 3], ['bi', 'acc', 3]]),
  loA: D('Pierna A', 'Sentadilla y cadera', 'lower', [['pow', 'pow', 2], ['sq', 'main', 1], ['hinge', 'sec', 1], ['uni', 'acc', 2], ['quad', 'acc', 2], ['calf', 'acc', 3], ['core', 'core', 3]]),
  upB: D('Torso B', 'Espalda, pecho alto y hombro', 'upper', [['vpull', 'main', 1], ['ipush', 'sec', 1], ['row', 'sec', 2], ['fly', 'acc', 2], ['rear', 'acc', 2], ['bi', 'acc', 3], ['tri', 'acc', 3]]),
  loB: D('Pierna B', 'Cadera, una pierna y femoral', 'lower', [['pow', 'pow', 2], ['hinge', 'main', 1], ['uni', 'sec', 1], ['glute', 'acc', 2], ['ham', 'acc', 2], ['calf', 'acc', 3], ['core', 'core', 3]]),
  push: D('Empuje', 'Pecho, hombro y tríceps', 'upper', [['hpush', 'main', 1], ['vpush', 'sec', 1], ['ipush', 'sec', 2], ['lat', 'acc', 2], ['tri', 'acc', 2], ['fly', 'acc', 3]]),
  pull: D('Jalón', 'Espalda, hombro posterior y bíceps', 'upper', [['vpull', 'main', 1], ['row', 'main', 1], ['rear', 'acc', 2], ['bi', 'acc', 2], ['row', 'acc', 3], ['core', 'core', 3]]),
  legs: D('Pierna', 'Pierna completa', 'lower', [['pow', 'pow', 2], ['sq', 'main', 1], ['hinge', 'sec', 1], ['uni', 'acc', 2], ['ham', 'acc', 2], ['calf', 'acc', 3]]),
  push2: D('Empuje B', 'Pecho alto y hombro', 'upper', [['ipush', 'main', 1], ['vpush', 'sec', 1], ['fly', 'acc', 2], ['lat', 'acc', 2], ['tri', 'acc', 2]]),
  pull2: D('Jalón B', 'Remo y espalda alta', 'upper', [['row', 'main', 1], ['vpull', 'sec', 1], ['rear', 'acc', 2], ['bi', 'acc', 2], ['core', 'core', 3]]),
  legs2: D('Pierna B', 'Cadera y una pierna', 'lower', [['pow', 'pow', 2], ['hinge', 'main', 1], ['uni', 'sec', 1], ['glute', 'acc', 2], ['quad', 'acc', 2], ['calf', 'acc', 3]]),
};
const SPLITS = {
  2: ['fullA', 'fullB'], 3: ['fullA', 'fullB', 'fullC'], 4: ['upA', 'loA', 'upB', 'loB'],
  5: ['upA', 'loA', 'push', 'pull', 'legs'], 6: ['push', 'pull', 'legs', 'push2', 'pull2', 'legs2'],
};
export const splitName = (n) => ({ 2: 'Cuerpo completo 2 veces', 3: 'Cuerpo completo 3 veces', 4: 'Torso y pierna', 5: 'Torso, pierna, empuje, jalón y pierna', 6: 'Empuje, jalón y pierna dos veces' }[n]);

// ---------- dosis: [series, repeticiones, te sobran, descanso en segundos] ----------
const DOSE = {
  musculo: { main: { nuevo: [3, '8-10', 3, 120], medio: [3, '6-10', 2, 150], avanzado: [4, '6-10', 1, 180] },
    sec: { nuevo: [3, '10-12', 3, 90], medio: [3, '8-12', 2, 120], avanzado: [3, '8-12', 1, 120] },
    acc: { nuevo: [2, '12-15', 2, 60], medio: [3, '10-15', 1, 60], avanzado: [3, '10-15', 0, 60] } },
  grasa: { main: { nuevo: [3, '8-10', 3, 120], medio: [3, '6-10', 2, 150], avanzado: [3, '6-10', 1, 180] },
    sec: { nuevo: [2, '10-12', 3, 90], medio: [3, '8-12', 2, 90], avanzado: [3, '8-12', 1, 90] },
    acc: { nuevo: [2, '12-15', 2, 60], medio: [2, '10-15', 1, 60], avanzado: [3, '10-15', 1, 60] } },
  fuerza: { main: { nuevo: [3, '5-6', 3, 180], medio: [3, '4-6', 2, 180], avanzado: [4, '3-5', 2, 210] },
    sec: { nuevo: [2, '6-8', 3, 120], medio: [3, '6-8', 2, 120], avanzado: [3, '5-8', 2, 150] },
    acc: { nuevo: [2, '10-12', 2, 60], medio: [2, '8-12', 2, 75], avanzado: [3, '8-12', 2, 75] } },
  salud: { main: { nuevo: [2, '10-12', 3, 90], medio: [3, '8-12', 2, 90], avanzado: [3, '8-12', 2, 120] },
    sec: { nuevo: [2, '10-12', 3, 75], medio: [2, '10-12', 2, 75], avanzado: [3, '10-12', 2, 90] },
    acc: { nuevo: [2, '12-15', 3, 60], medio: [2, '12-15', 2, 60], avanzado: [2, '12-15', 2, 60] } },
};
const CORE = { nuevo: [2, '10', 3, 45], medio: [3, '10-12', 2, 45], avanzado: [3, '12', 2, 45] };
const POW = { nuevo: [3, '4', null, 90], medio: [3, '4', null, 120], avanzado: [4, '3', null, 120] };
const HOLD = { nuevo: '20 s', medio: '30 s', avanzado: '40 s' };
export const ROLE = { pow: 'Potencia', main: 'Básico pesado', sec: 'Básico', acc: 'Aislado', core: 'Tronco' };

function prescribe(ex, role, spec, light) {
  let [sets, reps, rir, rest] = role === 'pow' ? POW[spec.exp] : role === 'core' ? CORE[spec.exp] : DOSE[spec.goal][role][spec.exp];
  if (ex.unit === 's') { reps = HOLD[spec.exp]; rir = null; }
  if (role === 'pow' || ex.unit === 'saltos') { rir = null; if (ex.pat === 'lanzamiento') reps = '5'; if (ex.id === 'f-sprint') { reps = '4'; sets = 1; rest = 90; } }
  // Ejercicios con tu peso: si no hay cómo subir peso, se buscan más repeticiones.
  if (ex.unit === 'pc' && role !== 'core' && role !== 'pow') { reps = role === 'main' || role === 'sec' ? '8-15' : '12-20'; }
  if (light) { if (role === 'main' || role === 'sec') { sets = Math.max(2, sets - 1); if (rir != null) rir = Math.max(rir, 3); } }
  return { ex: ex.id, role, sets, reps, rir, rest };
}
export function itemMinutes(rx) {
  const ex = FIT_BY_ID[rx.ex]; if (!ex) return 0;
  const work = rx.role === 'pow' ? 15 : ex.unit === 's' ? (lowReps(rx.reps) || 30) : 35;
  return (rx.sets * (work * (ex.side ? 2 : 1) + rx.rest)) / 60;
}
export const WARM_MIN = 8, COOL_MIN = 4;
export const dayMinutes = (items) => Math.round(WARM_MIN + COOL_MIN + items.reduce((a, rx) => a + itemMinutes(rx), 0));

// ---------- perfil ----------
export const DEFAULT_FIT = { goal: 'musculo', exp: 'nuevo', days: 3, minutes: 60, place: 'completo', vbAuto: true, vbDays: 2, stepsGoal: 8000, since: null };
export function normFit(d) {
  const o = { ...DEFAULT_FIT, ...(d && typeof d === 'object' ? d : {}) };
  if (!FIT_GOALS[o.goal]) o.goal = DEFAULT_FIT.goal;
  if (!FIT_EXP[o.exp]) o.exp = DEFAULT_FIT.exp;
  if (!PLACES[o.place]) o.place = DEFAULT_FIT.place;
  o.days = Math.min(6, Math.max(2, Math.round(Number(o.days) || 3)));
  o.minutes = FIT_MINUTES.includes(Number(o.minutes)) ? Number(o.minutes) : 60;
  o.vbDays = Math.min(7, Math.max(0, Math.round(Number(o.vbDays) || 0)));
  o.stepsGoal = Math.min(20000, Math.max(3000, Math.round(Number(o.stepsGoal) || 8000)));
  o.vbAuto = o.vbAuto !== false;
  return o;
}

// Cuántos días pesados de pierna caben según el voleibol de la semana (entrenos + partidos).
export const legHeavyCap = (vb) => (vb >= 5 ? 1 : vb >= 3 ? 2 : 3);

// ---------- la rutina ----------
// spec: perfil normalizado + vb (días de voleibol por semana que se usan).
export function buildFit(raw, vb = 0) {
  const spec = normFit(raw);
  const tierMax = FIT_EXP[spec.exp].tier;
  const keys = SPLITS[spec.days];
  const cap = legHeavyCap(vb);
  const patUse = {};
  let heavyLegs = 0;
  // Saltos: con 3 o más días de voleibol ya saltas mucho en la cancha; se dejan solo en «Fuerza y salto», un día.
  let powLeft = spec.goal === 'fuerza' ? (vb >= 3 ? 1 : 2) : vb >= 3 ? 0 : spec.goal === 'salud' ? 0 : 1;
  const pickEx = (pat, used) => {
    for (let p = pat, guard = 0; p && guard < 4; p = FALLBACK[p], guard++) {
      const list = (ORDER[p] || []).map((id) => FIT_BY_ID[id]).filter((e) => e && fitAvailable(e, spec.place) && e.tier <= tierMax && !used.has(e.id));
      if (list.length) { const k = patUse[p] || 0; patUse[p] = k + 1; return { ex: list[k % list.length], pat: p }; }
    }
    return null;
  };
  const days = keys.map((k, i) => {
    const bp = DAYS[k];
    const hasLegs = bp.kind !== 'upper';
    const light = hasLegs && heavyLegs >= cap;
    if (hasLegs && !light) heavyLegs++;
    const used = new Set();
    let slots = bp.slots.map(([pat, role, p]) => ({ pat, role, p }));
    slots = slots.filter((s) => {
      if (s.role !== 'pow') return true;
      if (s.pat === 'throw') return spec.goal === 'fuerza' && vb < 5;
      if (light || powLeft <= 0) return false;
      powLeft--; return true;
    });
    let items = [];
    for (const s of slots) {
      const got = pickEx(s.pat, used); if (!got) continue;
      used.add(got.ex.id);
      items.push({ ...prescribe(got.ex, s.role, spec, light), p: s.p, pat: s.pat });
    }
    // Ajusta al tiempo: quita lo de menor prioridad y luego series de más.
    for (let guard = 0; guard < 30 && dayMinutes(items) > spec.minutes + 3; guard++) {
      let idx = -1, worst = 1;
      items.forEach((it, j) => { if (it.p > 1 && it.p >= worst) { worst = it.p; idx = j; } });
      if (idx >= 0) { items.splice(idx, 1); continue; }
      const big = items.filter((it) => it.sets > 2).sort((a, b) => b.sets - a.sets)[0];
      if (!big) break;
      big.sets -= 1;
    }
    items = items.map(({ p, ...rx }) => rx);
    return { key: String.fromCharCode(65 + i), name: bp.name, focus: bp.focus, kind: bp.kind, light, items, min: dayMinutes(items) };
  });
  // v3.13: rutina personalizada (los días y ejercicios que el adulto editó a mano).
  if (Array.isArray(spec.custom) && spec.custom.length) {
    const cd = customFitDays(spec.custom);
    if (cd.length) {
      const v = weeklyVolume(cd);
      return { spec, vb, n: cd.length, days: cd, volume: v, custom: true,
        notes: ['Rutina personalizada: los días y ejercicios los elegiste tú. Las series por semana de abajo te dicen si alcanzas lo que pide tu objetivo. Con «Volver a la de Remate» regresas a la automática.',
          ...(vb > 0 ? ['Separa el gym y el voleibol al menos 3 horas si puedes, y no hagas pierna pesada el día antes de un partido.'] : [])] };
    }
  }
  const volume = weeklyVolume(days);
  return { spec, vb, n: days.length, days, volume, notes: fitNotes(spec, vb, days, volume) };
}

// ---------- rutina personalizada y sesión libre (v3.13) ----------
// Patrón de cada ejercicio (para contar las series por músculo): el primer patrón de ORDER donde aparece.
const SLOT_OF = {};
for (const [pat, ids] of Object.entries(ORDER)) for (const id of ids) if (!SLOT_OF[id]) SLOT_OF[id] = pat;
const cleanRx = (rx) => {
  const ex = FIT_BY_ID[rx?.ex]; if (!ex) return null;
  const sets = Math.min(10, Math.max(1, Math.round(Number(rx.sets) || 3)));
  const reps = String(rx.reps ?? '').trim().slice(0, 12) || '10';
  const rest = Math.min(600, Math.max(0, Math.round(Number(rx.rest) || 60)));
  let rir = rx.rir === null || rx.rir === '' || rx.rir === undefined ? null : Math.min(5, Math.max(0, Math.round(Number(rx.rir))));
  if (Number.isNaN(rir)) rir = null;
  return { ex: ex.id, pat: SLOT_OF[ex.id] || ex.pat, role: ROLE[rx.role] ? rx.role : fitRole(ex), sets, reps, rir, rest };
};
export const cleanFitCustom = (custom) => (Array.isArray(custom) ? custom : []).slice(0, 7)
  .map((d, i) => ({ name: String(d?.name || `Día ${String.fromCharCode(65 + i)}`).trim().slice(0, 40), items: (d?.items || []).map(cleanRx).filter(Boolean).slice(0, 16) }))
  .filter((d) => d.items.length);
export function customFitDays(custom) {
  return cleanFitCustom(custom).map((d, i) => ({ key: String.fromCharCode(65 + i), name: d.name, focus: 'Personalizado', kind: 'custom', light: false, items: d.items, min: dayMinutes(d.items), custom: true }));
}
export function fitRole(ex) {
  if (ex.unit === 'saltos' || ex.pat === 'salto' || ex.pat === 'lanzamiento') return 'pow';
  if (ex.pat === 'tronco' || ex.pat === 'core') return 'core';
  if (ex.need === 'barra') return 'main';
  return /^(Bíceps|Tríceps|Hombro \(deltoides|Pantorrilla|Sóleo|Cuádriceps$|Parte de atrás|Aductores|Frente)/.test(ex.body || '') ? 'acc' : 'sec';
}
export function fitDefaultRx(exId, raw) {
  const spec = normFit(raw), ex = FIT_BY_ID[exId]; if (!ex) return null;
  return { ...prescribe(ex, fitRole(ex), spec, false), pat: SLOT_OF[ex.id] || ex.pat };
}

// Series por semana de cada músculo (las indirectas cuentan la mitad).
export function weeklyVolume(days) {
  const v = Object.fromEntries(Object.keys(MUSCLES).map((m) => [m, 0]));
  for (const d of days) for (const rx of d.items) for (const [m, w] of Object.entries(HITS[rx.pat] || {})) v[m] += rx.sets * w;
  return v;
}
export const VOLUME_TARGET = { musculo: [10, 20], grasa: [8, 16], fuerza: [4, 12], salud: [4, 10] };

function fitNotes(spec, vb, days, volume) {
  const n = [];
  const light = days.filter((d) => d.light).length;
  if (vb > 0) n.push(`Cuento ${vb} ${vb === 1 ? 'día' : 'días'} de voleibol por semana. ${light ? `Por eso ${light === 1 ? 'un día de pierna va ligero' : `${light} días de pierna van ligeros`} (una serie menos y sin acercarte tanto al fallo).` : 'Tu rutina cabe sin quitar nada.'}`);
  if (vb >= 3 && spec.goal !== 'fuerza') n.push('Con 3 o más días de voleibol no hay saltos en el gym: ya saltas mucho en la cancha.');
  n.push('Separa el gym y el voleibol al menos 3 horas si puedes, y no hagas pierna pesada el día antes de un partido.');
  const [lo] = VOLUME_TARGET[spec.goal];
  const shortOf = Object.entries(volume).filter(([m, x]) => m !== 'abdomen' && m !== 'pantorrilla' && x > 0 && x < lo).map(([m]) => MUSCLES[m].toLowerCase());
  if (shortOf.length && (spec.goal === 'musculo' || spec.goal === 'grasa')) n.push(`Con ${spec.minutes} minutos no alcanzan las series de ${shortOf.join(', ')}. Si quieres más, sube a ${Math.min(90, spec.minutes + 15)} minutos o un día más.`);
  if (spec.exp === 'nuevo') n.push('Las primeras 2 a 4 semanas: aprende la técnica con peso cómodo. Los resultados llegan igual: pasar de no entrenar a entrenar es el salto más grande.');
  if (spec.goal === 'grasa') n.push('Para bajar grasa, las pesas cuidan el músculo; la grasa se baja comiendo un poco menos y caminando más (tu meta de pasos).');
  if (spec.goal === 'salud') n.push('Para la salud, súmale 150 a 300 minutos a la semana de actividad moderada (caminar rápido cuenta). El voleibol también cuenta.');
  if (spec.place === 'casa' || spec.place === 'cancha') n.push('Sin máquinas también funciona: con ligas y tu peso, cuando un ejercicio ya te queda fácil, busca la versión más difícil.');
  return n;
}

// ---------- progresión doble: primero repeticiones, luego peso ----------
const incFor = (ex, kg) => (ex.need === 'barra' ? (kg < 60 ? 2.5 : 5) : ex.need === 'maquina' || ex.need === 'polea' ? 2.5 : kg < 10 ? 1 : 2);
const fmtKg = (x) => `${Math.round(x * 10) / 10}`;
export function nextFitStep(rx, last) {
  const ex = FIT_BY_ID[rx.ex]; if (!ex) return '';
  if (rx.role === 'pow' || ex.unit === 'saltos') return 'Cada repetición a la máxima velocidad. Si pierdes altura o velocidad, para.';
  const sets = (last?.s || []).filter((x) => x && Number(x[1]) > 0);
  if (!sets.length) return ex.unit === 'kg' ? `Primera vez: busca un peso con el que termines las ${topReps(rx.reps)} repeticiones y te sobren ${rx.rir ?? 2}.` : '';
  const top = topReps(rx.reps), done = sets.length >= rx.sets && sets.every((x) => Number(x[1]) >= top);
  if (ex.unit === 's') return done ? 'Aguantaste todo: súmale 5 a 10 segundos o pasa a la versión más difícil.' : 'Repite el mismo tiempo hasta completarlo en todas las series.';
  if (ex.unit === 'pc') return done ? `Llegaste a ${top} en todas: pasa a la versión más difícil (${ex.harder.toLowerCase()})` : `Busca llegar a ${top} en todas las series.`;
  const kg = Math.max(...sets.map((x) => Number(x[0]) || 0));
  if (!kg) return done ? 'Completaste todo: agrega un poco de peso.' : `Busca llegar a ${top} en todas las series.`;
  if (done) return `La vez pasada hiciste ${top} en todas con ${fmtKg(kg)} kg: sube a ${fmtKg(kg + incFor(ex, kg))} kg y vuelve a ${lowReps(rx.reps)}.`;
  return `Repite ${fmtKg(kg)} kg y busca ${top} repeticiones en todas las series.`;
}

// Semana del bloque: bloques de 6 semanas; la 6 es de descarga (una serie menos, sin subir peso).
export function fitWeek(since, today = todayStr()) {
  if (!since) return null;
  const d = diffDays(today, since); if (d < 0) return null;
  const w = Math.floor(d / 7) + 1;
  return { week: ((w - 1) % 6) + 1, block: Math.floor((w - 1) / 6) + 1, light: ((w - 1) % 6) + 1 === 6, ends: addDays(since, Math.ceil(w / 6) * 42 - 1) };
}

// ---------- peso corporal: promedio de 7 días ----------
export function weeklyAverages(body, weeks = 8, today = todayStr()) {
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = addDays(today, -7 * w), start = addDays(end, -6);
    const xs = body.filter((b) => b.day >= start && b.day <= end && Number(b.data?.kg) > 0).map((b) => Number(b.data.kg));
    out.push({ start, end, avg: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null, n: xs.length });
  }
  return out;
}
// Cambio semanal en % del peso (para saber si vas al ritmo de tu objetivo).
export function weeklyRate(avgs) {
  const ok = avgs.filter((a) => a.avg != null);
  if (ok.length < 2) return null;
  const a = ok[ok.length - 2].avg, b = ok[ok.length - 1].avg;
  return { kg: b - a, pct: ((b - a) / a) * 100 };
}
export const RATE_GOAL = { musculo: [0.1, 0.5], grasa: [-1, -0.5], fuerza: [-0.25, 0.5], salud: [-0.25, 0.25] };
export function rateText(goal, r) {
  if (!r) return 'Pésate 3 o más mañanas por semana para ver tu promedio y tu ritmo.';
  const [lo, hi] = RATE_GOAL[goal];
  const pct = Math.round(r.pct * 10) / 10, kg = Math.round(r.kg * 10) / 10;
  const base = `${kg > 0 ? '+' : ''}${kg} kg contra la semana pasada (${pct > 0 ? '+' : ''}${pct}%).`;
  if (goal === 'grasa') return pct > hi ? `${base} Vas más lento de lo que buscas (0.5 a 1% por semana).` : pct < lo ? `${base} Vas muy rápido: más de 1% por semana arriesga músculo y fuerza. Come un poco más.` : `${base} Buen ritmo para bajar grasa sin perder músculo.`;
  if (goal === 'musculo') return pct < lo ? `${base} Para ganar músculo conviene subir poco a poco (0.1 a 0.5% por semana).` : pct > hi ? `${base} Subes rápido: puede ser más grasa que músculo.` : `${base} Buen ritmo para ganar músculo.`;
  return pct < lo || pct > hi ? `${base} Si buscas mantenerte, revisa tu comida.` : `${base} Estable.`;
}

// ---------- medidas ----------
export const MEASURES = [
  ['cintura', 'Cintura', 'A la mitad entre la última costilla y el hueso de la cadera, al terminar de soltar el aire, cinta derecha sin apretar (método de la OMS).'],
  ['cadera', 'Cadera', 'En la parte más ancha de los glúteos, de pie con los pies juntos.'],
  ['brazo', 'Brazo', 'A la mitad entre el hombro y el codo, con el brazo relajado. Siempre el mismo brazo.'],
  ['muslo', 'Muslo', 'A la mitad entre la ingle y la rodilla, de pie y relajado. Siempre la misma pierna.'],
];
export const MEASURE_TIPS = ['Mídete por la mañana, antes de desayunar, cada 2 a 4 semanas.', 'Siempre en el mismo lugar y con la misma cinta. Un cambio de menos de 1 cm puede ser error de medición.'];

// ---------- pasos ----------
export const STEP_NOTE = 'En adultos menores de 60 años, el riesgo de morir por cualquier causa baja conforme suben los pasos y deja de bajar alrededor de 8,000 a 10,000 al día (Paluch y cols., 2022). Si hoy caminas poco, súmale 1,000 a tu promedio y ve subiendo.';

// ---------- cuántos días de voleibol: de Remate (entrenos con asistencia y partidos) ----------
// Promedio de las últimas 4 semanas; si no hay registros, los días de entrenamiento del equipo.
export function vbFromRemate({ attendance = [], sessions = [], matchStats = [], matches = [], playerId, teamDays = 0, today = todayStr() }) {
  const from = addDays(today, -28);
  const done = new Map(sessions.filter((s) => s.session_date >= from && s.session_date <= today && s.status !== 'cancelada').map((s) => [s.id, s]));
  const att = attendance.filter((a) => a.player_id === playerId && done.has(a.session_id) && (a.status === 'presente' || a.status === 'retardo')).length;
  const listed = attendance.some((a) => a.player_id === playerId && done.has(a.session_id));
  const mIds = new Set(matches.filter((m) => m.match_date >= from && m.match_date <= today).map((m) => m.id));
  const days = new Set(matchStats.filter((x) => x.player_id === playerId && mIds.has(x.match_id)).map((x) => matches.find((m) => m.id === x.match_id)?.match_date));
  if (!listed && !days.size) return { days: teamDays, from: 'equipo' };
  return { days: Math.round((att + days.size) / 4), from: 'registros', train: att, games: days.size };
}

export const FIT_SOURCES = [
  ['ACSM 2026: entrenamiento de fuerza para adultos sanos (todos los grupos musculares 2 o más días por semana; ~10 series por semana por músculo para hipertrofia; cargas de ~80% para fuerza)', 'https://acsm.org/resistance-training-guidelines-update-2026/'],
  ['Pelland y cols. (2024): volumen y frecuencia semanal, series directas e indirectas', 'https://sportrxiv.org/index.php/server/preprint/view/460'],
  ['Robinson y cols. (2024): qué tan cerca del fallo («te sobran») para fuerza e hipertrofia', 'https://doi.org/10.1007/s40279-024-02069-2'],
  ['Schumann y cols. (2022): entrenamiento concurrente (fuerza con aeróbico) y la potencia', 'https://doi.org/10.1007/s40279-021-01587-7'],
  ['Helms y cols. (2014): ritmo de 0.5 a 1% del peso por semana para conservar músculo', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4033492/'],
  ['OMS (2020): actividad física para adultos (150 a 300 minutos y fuerza 2 días por semana)', 'https://www.ncbi.nlm.nih.gov/books/NBK566048/'],
  ['Paluch y cols. (2022): pasos al día y mortalidad (15 cohortes)', 'https://doi.org/10.1016/S2468-2667(21)00302-9'],
  ['OMS (2008): cómo medir la cintura y la cadera', 'https://www.who.int/publications/i/item/9789241501491'],
  ['Silva y cols. (2019): pliometría en jugadores de voleibol', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6720263/'],
];
export { NEED, TIER };
