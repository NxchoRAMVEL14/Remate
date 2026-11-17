// Remate Fit (v3.11): gym para adultos (18+). Usa la biblioteca del Gym de los chavos y le suma ejercicios
// para músculo (aislados, máquinas, en casa y en la cancha). Las series, repeticiones y «te sobran» son
// propuestas de Remate basadas en las fuentes de FIT_SOURCES, no cifras de un estudio en particular.
import { GYM, NEED, TIER, topReps, lowReps } from './gym.js';
import { MAQ } from './maquinas.js';
import { musOf, MUS_BY } from './musculos.js';
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
  X({ id: 'f-sprint', name: 'Sprints cortos', pat: 'sprint', need: 'nada', tier: 1, unit: 'saltos', repsLabel: 'Sprints', body: 'Piernas y velocidad',
    why: 'Velocidad y potencia de piernas. En la cancha cuentan como trabajo de alta intensidad.',
    how: ['Calienta bien antes (5 a 10 minutos y aceleraciones suaves).', 'Corre 10 a 20 metros a máxima velocidad.', 'Regresa caminando y descansa hasta sentirte fresco (1 a 2 minutos).'],
    cues: ['Inclínate al arrancar', 'Calidad, no cansancio'], err: 'Hacerlos cansado: ya no son de velocidad.', easier: 'Al 80% de tu velocidad.', harder: 'Arranques desde el piso o en subida.', safety: 'Nada de sprints si traes molestia en el muslo de atrás.' }),
  // v3.19
  X({ id: 'f-trineo', name: 'Empuje de trineo', pat: 'sprint', need: 'maquina', tier: 1, unit: 'kg', role: 'pow', repsLabel: 'Tramos', body: 'Piernas, glúteos y tronco',
    why: 'Fuerza y potencia de piernas casi sin impacto en las rodillas ni la espalda. También sube el pulso como un buen cardio.',
    how: ['Carga el trineo con un peso que puedas mover sin frenarte (empieza con el trineo solo o 10 a 20 kg).', 'Manos en los postes altos o bajos, brazos firmes y cuerpo inclinado como en un arranque.', 'Empuja con pasos cortos y rápidos, todo el pie en el piso, 15 a 20 metros.', 'Descansa caminando de regreso, 1.5 a 2 minutos, y repite.'],
    cues: ['Pasos cortos y rápidos', 'Espalda recta, cadera abajo'], err: 'Cargar tanto que caminas despacio: ya no es potencia.', easier: 'Menos peso o postes altos (más erguido).', harder: 'Más peso o jalar el trineo de espaldas con correa.', safety: 'Si te duele la espalda baja, sube los brazos a los postes altos y quita peso.' }),
  // v3.25: pantorrilla de atrás y de adelante, antebrazo, trapecio y glúteo (con su muñequito en movimientos-fit.js).
  // --- pantorrilla de atrás: gemelo (rodilla estirada) y sóleo (rodilla doblada) ---
  X({ id: 'f-talones-burro', name: 'Elevación de talones tipo burro', pat: 'pantorrilla', slot: 'calf', role: 'acc', need: 'cajon', tier: 1, unit: 'pc', fig: 'talones_burro', body: 'Pantorrilla (gemelo)',
    why: 'Con la cadera doblada el gemelo trabaja estirado, que es donde más crece. Solo necesitas un escalón y algo donde apoyarte.',
    how: ['Puntas en el borde de un escalón o un disco, talones al aire.', 'Inclínate hasta que el tronco quede casi horizontal y apoya las manos en un banco o una mesa.', 'Baja los talones lento hasta sentir el estirón y sube lo más alto que puedas.', 'Sostén 1 segundo arriba.'],
    cues: ['Rodillas casi estiradas', 'Abajo lento, arriba alto'], err: 'Rebotar abajo o doblar las rodillas para ayudarte.', easier: 'Sin el escalón, desde el piso.', harder: 'Una pierna a la vez o con una mochila con peso.' }),
  X({ id: 'f-talones-barra', name: 'Elevación de talones de pie con barra', pat: 'pantorrilla', slot: 'calf', role: 'acc', need: 'barra', tier: 2, unit: 'kg', fig: 'talones_barra', body: 'Pantorrilla (gemelo)',
    why: 'Permite cargar mucho peso en la pantorrilla. Útil si no hay máquina de pantorrilla.',
    how: ['Barra en la espalda alta, como en la sentadilla, dentro del rack.', 'Puntas sobre un disco delgado, talones en el piso.', 'Sube lo más alto que puedas con las rodillas estiradas.', 'Baja en 2 o 3 segundos.'],
    cues: ['Cuerpo derecho', 'Sube alto, baja lento'], err: 'Mover la cadera o doblar las rodillas para empujar.', easier: 'En la máquina Smith o con mancuernas.', harder: 'Pausa de 2 segundos abajo, estirado.', safety: 'Hazlo dentro del rack con los seguros puestos.' }),
  X({ id: 'f-talones-smith', name: 'Elevación de talones en máquina Smith', pat: 'pantorrilla', slot: 'calf', role: 'acc', need: 'maquina', tier: 1, unit: 'kg', fig: 'talones_barra', body: 'Pantorrilla (gemelo)',
    why: 'La barra va guiada: te concentras solo en la pantorrilla, sin preocuparte del equilibrio.',
    how: ['Pon un escalón o un disco bajo la barra del Smith.', 'Barra en la espalda alta, puntas en el borde, talones al aire.', 'Desbloquea la barra, baja los talones y sube lo más alto que puedas.', 'Al terminar, gira la barra para dejarla en los ganchos.'],
    cues: ['Rodillas estiradas', 'Recorrido completo'], err: 'Medios recorridos rápidos.', easier: 'Menos peso.', harder: 'Bajada en 4 segundos.' }),
  X({ id: 'f-talones-1-m', name: 'Elevación de talón a una pierna con mancuerna', pat: 'pantorrilla', slot: 'calf', role: 'acc', need: 'mancuerna', tier: 1, unit: 'kg', side: true, fig: 'talones_1_m', body: 'Pantorrilla y tendón de Aquiles',
    why: 'Cada pierna trabaja sola: se emparejan y el tendón de Aquiles se hace más fuerte para los saltos.',
    how: ['Punta de un pie en el borde de un escalón; la otra pierna doblada atrás.', 'La mancuerna en la mano del mismo lado; con la otra te detienes de la pared.', 'Baja lento y sube lo más alto que puedas.', 'Haz todas las de un lado y cambia.'],
    cues: ['Detente solo para el equilibrio', 'Sube alto'], err: 'Jalarte con la mano de la pared.', easier: 'Sin mancuerna.', harder: 'Mancuerna más pesada o bajada en 4 segundos.' }),
  X({ id: 'f-soleo-pie', name: 'Elevación de talones con rodillas dobladas (sóleo)', pat: 'pantorrilla', slot: 'calf', role: 'acc', need: 'mancuerna', tier: 1, unit: 'kg', fig: 'soleo_pie', body: 'Sóleo (pantorrilla profunda)',
    why: 'Con la rodilla doblada trabaja el sóleo, el músculo profundo de la pantorrilla que aguanta las carreras y los saltos largos.',
    how: ['De pie con una mancuerna en cada mano, rodillas dobladas como en un cuarto de sentadilla.', 'Sin cambiar el doblez de las rodillas, sube los talones.', 'Baja lento.'],
    cues: ['Rodillas quietas y dobladas', 'Sube alto'], err: 'Estirar las rodillas al subir: ya no es sóleo.', easier: 'Sin peso.', harder: 'Una pierna a la vez.' }),
  X({ id: 'f-talones-liga', name: 'Pantorrilla con liga, sentado', pat: 'pantorrilla', slot: 'calf', role: 'acc', need: 'liga', tier: 1, unit: 'pc', fig: 'talones_liga', body: 'Pantorrilla',
    why: 'Pantorrilla en casa o en la cancha, sin pesas. También sirve para calentar el tobillo.',
    how: ['Sentado en el piso con las piernas estiradas.', 'Pasa la liga por la planta del pie y toma los extremos.', 'Empuja la punta del pie hacia adelante contra la liga.', 'Regresa lento.'],
    cues: ['Rodilla estirada', 'Empuja con la punta'], err: 'Mover toda la pierna.', easier: 'Liga más suave.', harder: 'Liga más dura o pausa de 2 segundos.' }),
  X({ id: 'f-caminar-puntas', name: 'Caminata en puntas con mancuernas', pat: 'pantorrilla', slot: 'calf', role: 'acc', need: 'mancuerna', tier: 1, unit: 'kg', repsLabel: 'm', fig: 'caminar_puntas', body: 'Pantorrilla y tobillo',
    why: 'Pantorrilla y tobillo firmes en movimiento, como cuando te desplazas en la cancha.',
    how: ['Una mancuerna en cada mano, sube a las puntas de los pies.', 'Camina 20 a 30 metros sin bajar los talones.', 'Descansa y repite.'],
    cues: ['Talones arriba todo el tiempo', 'Cuerpo alto'], err: 'Ir bajando los talones al cansarte.', easier: 'Sin mancuernas.', harder: 'Más peso o más distancia.' }),
  // --- pantorrilla de adelante: tibial ---
  X({ id: 'f-tibial-m', name: 'Puntas arriba sentado con mancuerna', pat: 'pantorrilla', slot: 'tib', role: 'acc', need: 'mancuerna', tier: 1, unit: 'kg', fig: 'tibial_m', body: 'Frente de la espinilla (tibial)',
    why: 'Fortalece el músculo del frente de la espinilla: ayuda a frenar, a cuidar el tobillo y la rodilla y a evitar dolor en la espinilla.',
    how: ['Sentado en un banco, talones en el piso.', 'Sostén una mancuerna parada entre los empeines (o una polaina en los pies).', 'Sube las puntas lo más alto que puedas sin despegar los talones.', 'Baja lento.'],
    cues: ['Talones en el piso', 'Sube alto, baja lento'], err: 'Despegar los talones o mover las rodillas.', easier: 'Sin peso.', harder: 'Más peso o pausa de 2 segundos arriba.' }),
  X({ id: 'f-tibial-liga', name: 'Tibial con liga, sentado', pat: 'pantorrilla', slot: 'tib', role: 'acc', need: 'liga', tier: 1, unit: 'pc', fig: 'tibial_liga', body: 'Frente de la espinilla (tibial)',
    why: 'Tibial en casa: solo una liga amarrada a algo firme enfrente de ti.',
    how: ['Sentado en el piso con las piernas estiradas.', 'Amarra la liga a una pata de mesa y pásala por el empeine.', 'Jala la punta del pie hacia ti.', 'Regresa lento.'],
    cues: ['Solo se mueve el pie', 'Jala hacia la rodilla'], err: 'Echarte para atrás para jalar.', easier: 'Liga más suave.', harder: 'Liga más dura o una pierna a la vez.' }),
  X({ id: 'f-caminar-talones', name: 'Caminata en talones', pat: 'pantorrilla', slot: 'tib', role: 'acc', need: 'nada', tier: 1, unit: 's', fig: 'caminar_talones', body: 'Frente de la espinilla (tibial)',
    why: 'El tibial trabaja sin nada: un buen calentamiento para los tobillos antes de saltar.',
    how: ['Levanta las puntas de los pies.', 'Camina sobre los talones el tiempo indicado.', 'Pasos cortos, cuerpo derecho.'],
    cues: ['Puntas arriba', 'Pasos cortos'], err: 'Inclinarte hacia atrás.', easier: 'Menos tiempo.', harder: 'Más tiempo o con mancuernas.' }),
  X({ id: 'f-tibial-escalon', name: 'Puntas arriba en un escalón', pat: 'pantorrilla', slot: 'tib', role: 'acc', need: 'cajon', tier: 1, unit: 'pc', fig: 'tibial_escalon', body: 'Frente de la espinilla (tibial)',
    why: 'Con los talones en el borde, el tibial trabaja con más recorrido que en el piso.',
    how: ['Párate con los talones en el borde de un escalón y las puntas al aire.', 'Baja las puntas lento y súbelas lo más que puedas.', 'Detente de la pared para el equilibrio.'],
    cues: ['Talones fijos', 'Recorrido completo'], err: 'Columpiar el cuerpo.', easier: 'Contra la pared, en el piso.', harder: 'Una pierna a la vez.' }),
  X({ id: 'f-tibial-maquina', name: 'Tibial en máquina o con barra de tibial', pat: 'pantorrilla', slot: 'tib', role: 'acc', need: 'maquina', tier: 1, unit: 'kg', fig: 'tibial_m', body: 'Frente de la espinilla (tibial)',
    why: 'Si tu gym tiene máquina o barra de tibial, puedes cargarlo y medir cómo sube.',
    how: ['Sentado, mete los empeines bajo el cojín o la barra.', 'Sube las puntas hacia ti.', 'Baja lento hasta estirar.'],
    cues: ['Talones fijos', 'Sube y baja controlado'], err: 'Cargar tanto que el recorrido se hace corto.', easier: 'Menos peso.', harder: 'Más peso o pausa arriba.' }),
  // --- antebrazo y agarre ---
  X({ id: 'f-curl-muneca', name: 'Curl de muñeca (palmas arriba)', pat: 'brazo', slot: 'fore', role: 'acc', need: 'mancuerna', tier: 1, unit: 'kg', fig: 'curl_muneca', body: 'Antebrazo (flexores)',
    why: 'Fortalece la parte de adentro del antebrazo: mejor agarre para jalar y muñecas más firmes.',
    how: ['Sentado, apoya los antebrazos en los muslos con las palmas hacia arriba y las muñecas afuera de las rodillas.', 'Deja que la mancuerna baje hasta las puntas de los dedos.', 'Cierra la mano y sube la muñeca lo más que puedas.', 'Baja lento.'],
    cues: ['Antebrazos quietos', 'Recorrido completo'], err: 'Levantar los antebrazos de las piernas.', easier: 'Menos peso.', harder: 'Más repeticiones o pausa arriba.' }),
  X({ id: 'f-ext-muneca', name: 'Extensión de muñeca (palmas abajo)', pat: 'brazo', slot: 'fore', role: 'acc', need: 'mancuerna', tier: 1, unit: 'kg', fig: 'ext_muneca', body: 'Antebrazo (extensores)',
    why: 'Trabaja la parte de afuera del antebrazo, que suele estar débil. Ayuda a prevenir el dolor de codo.',
    how: ['Sentado, antebrazos en los muslos con las palmas hacia abajo.', 'Baja la mano lento.', 'Sube los nudillos lo más que puedas.', 'Usa poco peso: este músculo es chico.'],
    cues: ['Poco peso', 'Sube con los nudillos'], err: 'Usar demasiado peso y mover el codo.', easier: 'Con liga o sin peso.', harder: 'Bajada en 3 segundos.' }),
  X({ id: 'f-curl-inverso', name: 'Curl inverso con barra', pat: 'brazo', slot: 'brach', role: 'acc', need: 'barra', tier: 1, unit: 'kg', fig: 'curl_inverso', body: 'Antebrazo y bíceps',
    why: 'Con las palmas hacia abajo trabaja el músculo grande del antebrazo (braquiorradial) además del bíceps.',
    how: ['De pie, toma la barra con las palmas hacia abajo al ancho de los hombros.', 'Sube doblando los codos, sin moverlos de los costados.', 'Baja en 2 o 3 segundos.'],
    cues: ['Muñecas derechas', 'Codos quietos'], err: 'Doblar las muñecas hacia abajo al subir.', easier: 'Barra Z o mancuernas.', harder: 'Más peso o pausa a la mitad.' }),
  X({ id: 'f-martillo', name: 'Curl martillo con mancuernas', pat: 'brazo', slot: 'brach', role: 'acc', need: 'mancuerna', tier: 1, unit: 'kg', fig: 'martillo', body: 'Antebrazo y bíceps',
    why: 'Con las palmas viéndose entre sí trabaja antebrazo y bíceps a la vez. Suele permitir más peso que el curl normal.',
    how: ['De pie, una mancuerna en cada mano con las palmas hacia el cuerpo.', 'Sube doblando los codos, sin girar las manos.', 'Baja lento.'],
    cues: ['Palmas viéndose', 'Codos pegados'], err: 'Columpiar el cuerpo.', easier: 'Un brazo a la vez.', harder: 'Más peso o cruzado hacia el pecho.' }),
  X({ id: 'f-colgado', name: 'Colgarse de la barra', pat: 'brazo', slot: 'fore', role: 'acc', need: 'barra', tier: 1, unit: 's', fig: 'colgado', body: 'Antebrazo, agarre y hombros',
    why: 'El ejercicio más simple para el agarre. También descomprime la espalda y estira los hombros.',
    how: ['Toma la barra de dominadas con las palmas al frente.', 'Cuélgate con los brazos estirados y los pies despegados.', 'Aguanta el tiempo indicado y baja con cuidado.'],
    cues: ['Aprieta la barra', 'Hombros activos, no colgados de las orejas'], err: 'Soltarte de golpe.', easier: 'Con los pies apoyados en un cajón.', harder: 'Más tiempo, con una mano o con una toalla.', safety: 'Si te molesta el hombro, deja los pies apoyados.' }),
  X({ id: 'f-rodillo', name: 'Rodillo de muñeca', pat: 'brazo', slot: 'fore', role: 'acc', need: 'barra', tier: 1, unit: 'pc', repsLabel: 'Subidas', fig: 'rodillo', body: 'Antebrazo (todo)',
    why: 'Enrollar una cuerda con peso cansa todo el antebrazo. Se puede hacer con un palo, una cuerda y un disco.',
    how: ['Brazos estirados al frente sosteniendo el rodillo.', 'Gira con una mano y luego con la otra hasta enrollar toda la cuerda.', 'Desenrolla despacio hasta que el disco llegue abajo.'],
    cues: ['Brazos al frente', 'Gira solo con las muñecas'], err: 'Bajar los brazos para descansar.', easier: 'Disco más ligero o codos doblados.', harder: 'Disco más pesado.' }),
  X({ id: 'f-pinza-disco', name: 'Pinza con discos', pat: 'brazo', slot: 'fore', role: 'acc', need: 'barra', tier: 1, unit: 's', fig: 'pinza_disco', body: 'Antebrazo y dedos',
    why: 'Fortalece los dedos y el pulgar, que en el voleibol reciben el balón en la colocación y en el bloqueo.',
    how: ['Junta dos discos lisos por el lado liso y tómalos con los dedos (pulgar de un lado, dedos del otro).', 'Sostenlos a los lados del cuerpo el tiempo indicado.', 'Puedes caminar o quedarte quieto.'],
    cues: ['Solo los dedos', 'Hombros abajo'], err: 'Apoyar los discos en la pierna.', easier: 'Discos más ligeros.', harder: 'Más tiempo o discos más pesados.' }),
  X({ id: 'f-pronacion', name: 'Giros de antebrazo con mancuerna', pat: 'brazo', slot: 'fore', role: 'acc', need: 'mancuerna', tier: 1, unit: 'kg', side: true, fig: 'pronacion', body: 'Antebrazo (giro)',
    why: 'Fortalece los giros del antebrazo: protege el codo y la muñeca en el remate y el saque.',
    how: ['Sentado, apoya el antebrazo en el muslo y toma una mancuerna solo de un extremo, como un martillo.', 'Gira la mano lento hacia un lado hasta que la mancuerna quede casi acostada.', 'Regresa al centro y gira hacia el otro lado.'],
    cues: ['Lento', 'Codo quieto'], err: 'Dejar caer la mancuerna de golpe.', easier: 'Toma la mancuerna más cerca del centro.', harder: 'Tómala más lejos del centro.' }),
  X({ id: 'f-curl-muneca-espalda', name: 'Curl de muñeca con barra por detrás', pat: 'brazo', slot: 'fore', role: 'acc', need: 'barra', tier: 1, unit: 'kg', fig: 'curl_muneca_espalda', body: 'Antebrazo (flexores)',
    why: 'Permite usar más peso que el curl de muñeca sentado y trabaja el agarre completo.',
    how: ['De pie, barra detrás de los glúteos con las palmas hacia atrás.', 'Deja rodar la barra hasta las puntas de los dedos.', 'Cierra la mano y sube las muñecas.', 'Baja lento.'],
    cues: ['Brazos estirados', 'Solo se mueven las manos'], err: 'Doblar los codos.', easier: 'Menos peso.', harder: 'Pausa arriba.' }),
  // --- trapecio ---
  X({ id: 'f-encog-barra', name: 'Encogimientos con barra', pat: 'hombro', slot: 'trap', role: 'acc', need: 'barra', tier: 1, unit: 'kg', fig: 'encog_barra', body: 'Trapecio (cuello y hombros)',
    why: 'El trapecio sube los hombros y sostiene el cuello. Fuerte, ayuda a la postura y a aguantar los jalones pesados.',
    how: ['De pie, barra frente a los muslos con los brazos estirados.', 'Sube los hombros hacia las orejas, sin doblar los codos.', 'Sostén 1 segundo arriba y baja lento.'],
    cues: ['Arriba y abajo, sin girar', 'Cuello largo'], err: 'Girar los hombros en círculo o rebotar.', easier: 'Menos peso o con mancuernas.', harder: 'Pausa de 2 segundos arriba.' }),
  X({ id: 'f-encog-m', name: 'Encogimientos con mancuernas', pat: 'hombro', slot: 'trap', role: 'acc', need: 'mancuerna', tier: 1, unit: 'kg', fig: 'encog_m', body: 'Trapecio (cuello y hombros)',
    why: 'El mismo trabajo de trapecio con mancuernas: los brazos van a los lados y el recorrido es más cómodo.',
    how: ['De pie, una mancuerna en cada mano a los lados.', 'Sube los hombros hacia las orejas.', 'Sostén 1 segundo y baja lento.'],
    cues: ['Brazos estirados', 'Pausa arriba'], err: 'Doblar los codos para ayudarte.', easier: 'Menos peso.', harder: 'Más peso o más pausa.' }),
  X({ id: 'f-encog-polea', name: 'Encogimientos en polea baja', pat: 'hombro', slot: 'trap', role: 'acc', need: 'polea', tier: 1, unit: 'kg', fig: 'encog_polea', body: 'Trapecio (cuello y hombros)',
    why: 'La polea mantiene la tensión arriba y abajo.',
    how: ['Barra recta en la polea baja, de pie frente a la máquina.', 'Brazos estirados, sube los hombros.', 'Baja lento.'],
    cues: ['Sin jalar con los brazos', 'Cuerpo derecho'], err: 'Inclinarte hacia atrás.', easier: 'Menos peso.', harder: 'Pausa arriba.' }),
  X({ id: 'f-encog-liga', name: 'Encogimientos con liga', pat: 'hombro', slot: 'trap', role: 'acc', need: 'liga', tier: 1, unit: 'pc', fig: 'encog_liga', body: 'Trapecio (cuello y hombros)',
    why: 'Trapecio en casa o en la cancha.',
    how: ['Pisa la liga con los dos pies y toma los extremos.', 'Sube los hombros hacia las orejas.', 'Baja lento.'],
    cues: ['Brazos estirados', 'Pausa arriba'], err: 'Hacerlo rápido.', easier: 'Liga más suave.', harder: 'Liga más corta o más dura.' }),
  X({ id: 'f-y-inclinado', name: 'Elevación en Y inclinado', pat: 'hombro', slot: 'trap', role: 'acc', need: 'mancuerna', tier: 1, unit: 'kg', fig: 'y_inclinado', body: 'Trapecio bajo y hombros',
    why: 'Trabaja la parte baja del trapecio, que baja y sostiene el omóplato al levantar el brazo: clave para un remate y un saque sin dolor de hombro.',
    how: ['Boca abajo en un banco inclinado (o de pie, inclinado hacia adelante), una mancuerna ligera en cada mano.', 'Sube los brazos estirados en forma de Y, con los pulgares hacia arriba.', 'Llega a la altura de las orejas y baja lento.'],
    cues: ['Muy poco peso', 'Omóplatos abajo y atrás'], err: 'Subir los hombros a las orejas.', easier: 'Sin peso.', harder: 'Pausa de 2 segundos arriba.' }),
  X({ id: 'f-remo-alto', name: 'Remo al mentón, agarre abierto', pat: 'hombro', slot: 'trap', role: 'acc', need: 'mancuerna', tier: 2, unit: 'kg', fig: 'remo_alto', body: 'Trapecio y hombro',
    why: 'Trabaja trapecio y hombro lateral en un solo movimiento.',
    how: ['De pie, mancuernas (o barra con agarre abierto) frente a los muslos.', 'Sube los codos hacia los lados hasta la altura de los hombros, no más.', 'Baja lento.'],
    cues: ['Codos guían', 'Hasta la altura del hombro'], err: 'Agarre muy cerrado y subir más arriba del hombro.', easier: 'Menos peso.', harder: 'Más peso.', safety: 'Si sientes pinchazo en el hombro, cámbialo por encogimientos.' }),
  X({ id: 'f-rack-pull', name: 'Peso muerto desde las rodillas', pat: 'cadera', slot: 'trap', role: 'sec', need: 'barra', tier: 2, unit: 'kg', fig: 'rack_pull', body: 'Trapecio, espalda y glúteos',
    why: 'Un peso muerto corto: permite cargar mucho y trabaja trapecio, espalda alta, glúteos y agarre.',
    how: ['Pon la barra en los seguros del rack a la altura de las rodillas.', 'Tómala con la espalda recta y el pecho arriba.', 'Párate empujando con la cadera hacia adelante.', 'Baja controlado a los seguros.'],
    cues: ['Espalda recta', 'Cadera adelante al final'], err: 'Echarte para atrás al terminar.', easier: 'Menos peso.', harder: 'Más peso o encogimiento arriba.', safety: 'Si te duele la espalda baja, para y baja el peso.' }),
  X({ id: 'f-encog-inclinado', name: 'Encogimientos inclinado hacia adelante', pat: 'hombro', slot: 'trap', role: 'acc', need: 'mancuerna', tier: 1, unit: 'kg', fig: 'encog_inclinado', body: 'Trapecio medio',
    why: 'Inclinado, el trapecio junta los omóplatos: postura más derecha y hombros más estables.',
    how: ['Inclínate hacia adelante con la espalda recta (o boca abajo en un banco inclinado).', 'Brazos colgando con una mancuerna en cada mano.', 'Junta los omóplatos y súbelos un poco, sin doblar los codos.', 'Baja lento.'],
    cues: ['Codos estirados', 'Junta los omóplatos'], err: 'Convertirlo en remo.', easier: 'Menos peso.', harder: 'Pausa de 2 segundos.' }),
  // --- glúteo ---
  X({ id: 'f-hipthrust-1', name: 'Empuje de cadera a una pierna', pat: 'gluteo', slot: 'glute', role: 'acc', need: 'cajon', tier: 1, unit: 'pc', side: true, fig: 'hip_thrust_1', body: 'Glúteos',
    why: 'Cada glúteo trabaja solo. Muy útil en casa: sin peso ya es exigente.',
    how: ['Espalda alta en un banco o sillón, un pie en el piso y la otra pierna arriba.', 'Sube la cadera empujando con el talón hasta formar una línea.', 'Aprieta 1 segundo y baja.'],
    cues: ['Empuja con el talón', 'Costillas abajo'], err: 'Arquear la espalda baja.', easier: 'Con los dos pies.', harder: 'Con una mancuerna en la cadera.' }),
  X({ id: 'f-puente-elevado', name: 'Puente de glúteo con pies arriba', pat: 'gluteo', slot: 'glute', role: 'acc', need: 'cajon', tier: 1, unit: 'pc', fig: 'puente_elevado', body: 'Glúteos y parte de atrás del muslo',
    why: 'Con los pies sobre un banco, el glúteo y el femoral trabajan más que en el puente normal.',
    how: ['Boca arriba con los talones sobre un banco o una silla.', 'Sube la cadera hasta formar una línea de hombros a rodillas.', 'Aprieta y baja lento.'],
    cues: ['Talones al banco', 'Cadera alta'], err: 'Empujar con la espalda baja.', easier: 'Pies en el piso.', harder: 'Una pierna a la vez.' }),
  X({ id: 'f-puente-m', name: 'Puente de glúteo con mancuerna', pat: 'gluteo', slot: 'glute', role: 'acc', need: 'mancuerna', tier: 1, unit: 'kg', fig: 'puente_m', body: 'Glúteos',
    why: 'El puente con peso, en el piso: más fácil de acomodar que el empuje de cadera.',
    how: ['Boca arriba, rodillas dobladas, una mancuerna sobre la cadera (con una toalla).', 'Sube la cadera apretando los glúteos.', 'Aprieta 1 segundo y baja.'],
    cues: ['Barbilla abajo', 'Aprieta arriba'], err: 'Arquear la espalda baja.', easier: 'Sin peso.', harder: 'Más peso o pausa de 3 segundos.' }),
  X({ id: 'f-patada-liga', name: 'Patada de glúteo con liga en 4 puntos', pat: 'gluteo', slot: 'glute', role: 'acc', need: 'liga', tier: 1, unit: 'pc', side: true, fig: 'patada_liga', body: 'Glúteos',
    why: 'Glúteo en casa, sin cargar la espalda.',
    how: ['En cuatro puntos (manos y rodillas), la liga en la planta de un pie y sostenida con las manos.', 'Empuja el talón hacia atrás y arriba, con la rodilla doblada.', 'Regresa lento sin tocar el piso.'],
    cues: ['Espalda quieta', 'Empuja con el talón'], err: 'Arquear la espalda para subir más.', easier: 'Sin liga.', harder: 'Liga más dura o pausa arriba.' }),
  X({ id: 'f-patada-polea', name: 'Patada de glúteo en polea', pat: 'gluteo', slot: 'glute', role: 'acc', need: 'polea', tier: 1, unit: 'kg', side: true, fig: 'patada_polea', body: 'Glúteos',
    why: 'La polea permite subir el peso poco a poco y aislar el glúteo.',
    how: ['Tobillera en la polea baja, de frente a la máquina y detenido de ella.', 'Lleva la pierna hacia atrás, casi estirada, apretando el glúteo.', 'Regresa lento.'],
    cues: ['Tronco quieto', 'Aprieta atrás'], err: 'Echar el cuerpo hacia adelante para subir la pierna.', easier: 'Menos peso.', harder: 'Pausa de 1 segundo atrás.' }),
  X({ id: 'f-abduccion-liga', name: 'Abducción de pie con liga', pat: 'gluteo', slot: 'abd', role: 'acc', need: 'liga', tier: 1, unit: 'pc', side: true, fig: 'abduccion_liga', body: 'Glúteo medio (cadera de lado)',
    why: 'El glúteo medio mantiene la rodilla alineada al aterrizar de un salto.',
    how: ['Liga en los tobillos, de pie y detenido de algo.', 'Abre una pierna hacia el lado, con la punta al frente.', 'Regresa lento.'],
    cues: ['Punta al frente', 'Tronco derecho'], err: 'Inclinar el cuerpo para abrir más.', easier: 'Liga arriba de las rodillas.', harder: 'Liga más dura.' }),
  X({ id: 'f-abduccion-polea', name: 'Abducción de pie en polea', pat: 'gluteo', slot: 'abd', role: 'acc', need: 'polea', tier: 1, unit: 'kg', side: true, fig: 'abduccion_polea', body: 'Glúteo medio (cadera de lado)',
    why: 'Glúteo medio con peso que puedes ir subiendo.',
    how: ['Tobillera en la polea baja, de lado a la máquina.', 'Abre la pierna de afuera hacia el lado.', 'Regresa lento cruzando un poco.'],
    cues: ['Tronco derecho', 'Movimiento controlado'], err: 'Usar impulso.', easier: 'Menos peso.', harder: 'Pausa afuera.' }),
  X({ id: 'f-caminata-lateral', name: 'Caminata lateral con liga', pat: 'gluteo', slot: 'abd', role: 'acc', need: 'liga', tier: 1, unit: 'pc', repsLabel: 'Pasos', fig: 'caminata_lateral', body: 'Glúteo medio (cadera de lado)',
    why: 'Activa la cadera antes de entrenar pierna o de jugar: la rodilla no se va hacia adentro.',
    how: ['Liga arriba de las rodillas o en los tobillos, medio agachado.', 'Da pasos laterales cortos sin juntar los pies.', 'Ve y regresa la misma cantidad de pasos.'],
    cues: ['Rodillas afuera', 'Siempre con tensión'], err: 'Juntar los pies o ponerte derecho.', easier: 'Liga más suave.', harder: 'Más agachado o liga en los pies.' }),
  X({ id: 'f-sumo', name: 'Peso muerto sumo', pat: 'cadera', slot: 'hinge', role: 'main', need: 'barra', tier: 2, unit: 'kg', fig: 'sumo', body: 'Glúteos, aductores y femoral',
    why: 'Con las piernas abiertas trabaja más glúteo y aductores, con la espalda más derecha que en el peso muerto normal.',
    how: ['Pies muy abiertos con las puntas hacia afuera; la barra pegada a las espinillas.', 'Toma la barra con las manos por dentro de las piernas.', 'Empuja el piso con las piernas y sube con la espalda recta.', 'Baja controlado.'],
    cues: ['Rodillas afuera', 'Barra pegada al cuerpo'], err: 'Que se te vayan las rodillas hacia adentro.', easier: 'Con mancuerna (sentadilla sumo).', harder: 'Más peso.', safety: 'Si te duele la espalda baja, para y baja el peso.' }),
  X({ id: 'f-sumo-m', name: 'Sentadilla sumo con mancuerna', pat: 'pierna', slot: 'sq', role: 'sec', need: 'mancuerna', tier: 1, unit: 'kg', fig: 'sumo_m', body: 'Glúteos, aductores y cuádriceps',
    why: 'Una sentadilla con las piernas abiertas: más glúteo y parte de adentro del muslo.',
    how: ['Pies abiertos más que los hombros, puntas hacia afuera.', 'Sostén una mancuerna con las dos manos entre las piernas.', 'Baja con la espalda recta y las rodillas hacia afuera.', 'Sube empujando con los talones.'],
    cues: ['Rodillas sobre las puntas', 'Pecho arriba'], err: 'Rodillas hacia adentro.', easier: 'Sin peso.', harder: 'Más peso o pausa abajo.' }),
  X({ id: 'f-pull-through', name: 'Jalón entre las piernas en polea', pat: 'cadera', slot: 'glute', role: 'acc', need: 'polea', tier: 1, unit: 'kg', fig: 'pull_through', body: 'Glúteos y parte de atrás del muslo',
    why: 'Enseña a mover la cadera como en el peso muerto con poco riesgo para la espalda.',
    how: ['De espaldas a la polea baja, con la cuerda entre las piernas.', 'Echa la cadera hacia atrás con la espalda recta.', 'Párate empujando la cadera hacia adelante y aprieta los glúteos.'],
    cues: ['Cadera atrás', 'Brazos solo sostienen'], err: 'Jalar con los brazos o doblar la espalda.', easier: 'Menos peso.', harder: 'Pausa abajo.' }),
  X({ id: 'f-frog-pump', name: 'Puente de rana', pat: 'gluteo', slot: 'glute', role: 'acc', need: 'nada', tier: 1, unit: 'pc', fig: 'frog_pump', body: 'Glúteos',
    why: 'Con las plantas juntas y las rodillas abiertas el glúteo trabaja mucho. Buen final para un día de pierna.',
    how: ['Boca arriba, junta las plantas de los pies y abre las rodillas.', 'Sube la cadera rápido y aprieta.', 'Baja sin descansar y repite muchas veces.'],
    cues: ['Rodillas abiertas', 'Aprieta arriba'], err: 'Subir con la espalda.', easier: 'Menos repeticiones.', harder: 'Con mancuerna en la cadera.' }),
  X({ id: 'f-zancada-cruzada', name: 'Zancada cruzada (reverencia)', pat: 'pierna', slot: 'uni', role: 'acc', need: 'mancuerna', tier: 1, unit: 'kg', side: true, fig: 'zancada_cruzada', body: 'Glúteos y cuádriceps',
    why: 'Al cruzar la pierna atrás trabaja más el glúteo medio de la pierna de adelante.',
    how: ['De pie con mancuernas a los lados.', 'Lleva un pie hacia atrás y cruzado detrás del otro, como reverencia.', 'Baja hasta que la rodilla de atrás casi toque el piso.', 'Sube empujando con la pierna de adelante.'],
    cues: ['Rodilla de adelante sobre el pie', 'Cadera al frente'], err: 'Girar la cadera.', easier: 'Sin peso.', harder: 'Más peso.' }),
];

export const ALL_EX = [...GYM, ...FIT_EX, ...MAQ];   // v3.14: más máquinas y poleas
export const FIT_BY_ID = Object.fromEntries(ALL_EX.map((e) => [e.id, e]));
export const fitName = (id) => FIT_BY_ID[id]?.name || id;

// ---------- dónde entrenas ----------
export const PLACES = {
  completo: { name: 'Gym completo', desc: 'Máquinas, poleas, barra, rack y mancuernas.', has: new Set(Object.keys(NEED)) },
  basico: { name: 'Gym básico', desc: 'Barra, rack, banco y mancuernas, sin máquinas ni poleas.', has: new Set(['barra', 'mancuerna', 'cajon', 'balon', 'liga', 'nada']) },
  casa: { name: 'En casa', desc: 'Mancuernas o ligas, una silla o banco, tu peso y tus polainas.', has: new Set(['mancuerna', 'liga', 'cajon', 'nada']) },
  peso: { name: 'Solo tu peso', desc: 'Sin nada más: el piso, una silla o banco firme y una mesa pesada.', has: new Set(['nada', 'cajon']) },   // v3.20
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
  sprint: ['f-sprint', 'f-trineo'],
  // v3.25: pantorrilla de adelante (tibial), sóleo, antebrazo, braquiorradial, trapecio y glúteo medio
  tib: ['f-tibial-m', 'g-tibial', 'f-tibial-maquina', 'f-tibial-escalon', 'f-tibial-liga', 'f-caminar-talones'],
  sol: ['g-talones-sentado', 'm-talones-sentado-maq', 'f-soleo-pie'],
  fore: ['f-curl-muneca', 'f-ext-muneca', 'f-colgado', 'f-curl-muneca-espalda', 'f-rodillo', 'f-pinza-disco', 'f-pronacion'],
  brach: ['f-martillo', 'f-curl-inverso', 'm-martillo-cuerda'],
  trap: ['f-encog-barra', 'f-encog-m', 'm-encogimientos', 'f-encog-polea', 'f-y-inclinado', 'f-encog-inclinado', 'f-remo-alto', 'f-rack-pull', 'f-encog-liga', 'g-granjero'],
  abd: ['m-abductores', 'f-abduccion-polea', 'f-abduccion-liga', 'f-caminata-lateral'],
};
// v3.25: más opciones por patrón, solo para la rutina que cambia cada semana (la fija sigue igual).
const ROT_EXTRA = {
  sq: ['m-hack', 'm-smith-sentadilla', 'f-sumo-m'], hinge: ['f-sumo', 'm-extension-espalda'], uni: ['m-prensa-1', 'f-zancada-cruzada'],
  glute: ['m-hip-thrust-maq', 'f-hipthrust-1', 'f-puente-m', 'f-pull-through', 'm-patada-gluteo', 'f-patada-polea', 'f-puente-elevado', 'f-patada-liga', 'f-frog-pump'],
  ham: ['m-curl-fem-sentado', 'f-puente-elevado'],
  calf: ['m-talones-maquina', 'f-talones-burro', 'f-talones-1-m', 'f-talones-smith', 'f-talones-barra', 'm-talones-prensa', 'f-caminar-puntas', 'f-talones-liga'],
  hpush: ['m-press-pecho', 'm-smith-banca', 'm-fondos-asistidos'], ipush: ['m-press-inclinado'], vpush: ['m-press-hombro'],
  vpull: ['m-jalon-maquina', 'm-jalon-cerrado', 'm-dominada-asistida', 'm-pullover-polea'], row: ['m-remo-maquina', 'm-remo-t', 'm-remo-1-polea'],
  lat: ['m-lateral-maquina', 'm-lateral-polea'], rear: ['m-deltoide-post'], bi: ['m-curl-maquina', 'm-curl-polea'], tri: ['m-triceps-maquina', 'm-triceps-cuerda-arriba'],
  fly: ['m-pec-deck', 'm-cruce-poleas', 'm-cruce-bajo'], core: ['m-crunch-polea', 'm-crunch-maquina', 'm-silla-romana'],
};
// En la rotativa, estos patrones usan su propia lista: pantorrilla solo de atrás (la de adelante va en «tib»).
const BODY_OK = new Set(['tib', 'fore', 'core', 'ham', 'calf', 'abd', 'glute', 'pow']);   // con tu peso sí vale en el gym
const ROT_ONLY = {
  calf: ['g-talones-pie', 'm-talones-maquina', 'f-talones-burro', 'f-talones-1-m', 'f-talones-smith', 'f-talones-barra', 'm-talones-prensa', 'g-talones-1', 'f-caminar-puntas', 'f-talones-liga'],
  quad: ['f-ext-cuad', 'g-subida', 'm-prensa-1', 'g-sent-espanola', 'f-sent-pc'],
};
// Músculo de cada patrón para contar series por semana: 1 directa, 0.5 indirecta (como Pelland y cols., 2024).
export const MUSCLES = { pecho: 'Pecho', espalda: 'Espalda', hombro: 'Hombro', biceps: 'Bíceps', triceps: 'Tríceps', cuadriceps: 'Cuádriceps', isquios: 'Isquiotibiales', gluteo: 'Glúteo', pantorrilla: 'Pantorrilla', tibial: 'Tibial (espinilla)', antebrazo: 'Antebrazo', trapecio: 'Trapecio', abdomen: 'Tronco' };
// v3.25: músculos chicos: se muestran solo si tu rutina los trabaja y su meta es menor.
export const SMALL_MUS = new Set(['tibial', 'antebrazo', 'trapecio']);
export const SMALL_TARGET = [4, 10];
const HITS = {
  sq: { cuadriceps: 1, gluteo: 0.5 }, hinge: { isquios: 1, gluteo: 1 }, uni: { cuadriceps: 1, gluteo: 0.5 }, glute: { gluteo: 1, isquios: 0.5 },
  ham: { isquios: 1 }, quad: { cuadriceps: 1 }, calf: { pantorrilla: 1 }, hpush: { pecho: 1, triceps: 0.5, hombro: 0.5 }, ipush: { pecho: 1, hombro: 0.5, triceps: 0.5 },
  vpush: { hombro: 1, triceps: 0.5 }, vpull: { espalda: 1, biceps: 0.5 }, row: { espalda: 1, biceps: 0.5, hombro: 0.5, trapecio: 0.5 }, lat: { hombro: 1 }, rear: { hombro: 0.5, espalda: 0.5, trapecio: 0.5 },
  bi: { biceps: 1 }, tri: { triceps: 1 }, fly: { pecho: 1 }, core: { abdomen: 1 }, pow: {}, throw: {}, sprint: {},
  tib: { tibial: 1 }, sol: { pantorrilla: 1 }, fore: { antebrazo: 1 }, brach: { antebrazo: 1, biceps: 0.5 }, trap: { trapecio: 1 }, abd: { gluteo: 1 },
};
// Si en tu lugar no hay nada de un patrón, se usa este otro.
const FALLBACK = { quad: 'uni', glute: 'hinge', ham: 'hinge', ipush: 'hpush', fly: 'hpush', vpush: 'ipush', rear: 'row', pow: 'sprint', throw: 'pow', sprint: 'pow', tib: 'calf', sol: 'calf', fore: 'brach', brach: 'bi', trap: 'rear', abd: 'glute' };
const LOWER = new Set(['sq', 'hinge', 'uni', 'glute', 'ham', 'quad', 'calf', 'pow', 'sprint', 'tib', 'sol', 'abd']);

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

// ---------- v3.25: rutina que cambia cada semana (todo el cuerpo; pierna en días fijos) ----------
// Días de torso: cada semana un reparto distinto (ciclo de 4). Días de pierna: siempre en los mismos días de la semana,
// uno de cuádriceps y pantorrilla y otro de glúteo, femoral y sóleo; los dos con tibial (pantorrilla de adelante).
const RD = {
  pechoTri: D('Pecho y tríceps', 'Pecho, pecho alto y tríceps', 'upper', [['hpush', 'main', 1], ['ipush', 'sec', 1], ['fly', 'acc', 2], ['tri', 'acc', 1], ['tri', 'acc', 3], ['core', 'core', 3]]),
  espBi: D('Espalda y bíceps', 'Jalón, remo, bíceps y antebrazo', 'upper', [['vpull', 'main', 1], ['row', 'sec', 1], ['row', 'acc', 2], ['bi', 'acc', 1], ['brach', 'acc', 2], ['core', 'core', 3]]),
  hombroTrap: D('Hombro y trapecio', 'Hombro completo y trapecio', 'upper', [['vpush', 'main', 1], ['lat', 'acc', 1], ['rear', 'acc', 2], ['trap', 'acc', 1], ['trap', 'acc', 3], ['core', 'core', 3]]),
  brazosAnte: D('Brazos, antebrazo y abdomen', 'Bíceps, tríceps, antebrazo y tronco', 'upper', [['bi', 'acc', 1], ['tri', 'acc', 1], ['brach', 'acc', 2], ['fore', 'acc', 1], ['core', 'core', 2], ['core', 'core', 3]]),
  empuje: D('Empuje', 'Pecho, hombro y tríceps', 'upper', [['hpush', 'main', 1], ['vpush', 'sec', 1], ['lat', 'acc', 2], ['tri', 'acc', 2], ['fly', 'acc', 3]]),
  jalon: D('Jalón', 'Espalda, bíceps y antebrazo', 'upper', [['vpull', 'main', 1], ['row', 'sec', 1], ['rear', 'acc', 2], ['bi', 'acc', 2], ['fore', 'acc', 3]]),
  empuje2: D('Empuje B', 'Pecho alto, hombro y tríceps', 'upper', [['ipush', 'main', 1], ['vpush', 'sec', 1], ['fly', 'acc', 2], ['lat', 'acc', 2], ['tri', 'acc', 3]]),
  jalon2: D('Jalón B', 'Remo, trapecio y hombro de atrás', 'upper', [['row', 'main', 1], ['vpull', 'sec', 1], ['trap', 'acc', 2], ['rear', 'acc', 2], ['brach', 'acc', 3]]),
  torsoA: D('Torso A', 'Pecho, espalda y hombro', 'upper', [['hpush', 'main', 1], ['row', 'main', 1], ['vpush', 'sec', 2], ['lat', 'acc', 2], ['tri', 'acc', 3], ['bi', 'acc', 3]]),
  torsoB: D('Torso B', 'Espalda, pecho alto y brazos', 'upper', [['vpull', 'main', 1], ['ipush', 'sec', 1], ['rear', 'acc', 2], ['bi', 'acc', 2], ['tri', 'acc', 3], ['trap', 'acc', 3]]),
  hombroBrazos: D('Hombro y brazos', 'Hombro, bíceps, tríceps y antebrazo', 'upper', [['vpush', 'main', 1], ['lat', 'acc', 1], ['bi', 'acc', 2], ['tri', 'acc', 2], ['fore', 'acc', 3], ['core', 'core', 3]]),
  espaldaAlta: D('Espalda alta y tronco', 'Remo, trapecio, hombro de atrás y abdomen', 'upper', [['row', 'main', 1], ['trap', 'acc', 1], ['rear', 'acc', 2], ['fore', 'acc', 2], ['core', 'core', 2], ['core', 'core', 3]]),
  pechoEsp: D('Pecho y espalda', 'Empuje y jalón en pares', 'upper', [['hpush', 'main', 1], ['vpull', 'main', 1], ['ipush', 'sec', 2], ['row', 'sec', 2], ['fly', 'acc', 3]]),
  hombroCore: D('Hombro y abdomen', 'Hombro completo y tronco', 'upper', [['vpush', 'main', 1], ['lat', 'acc', 1], ['rear', 'acc', 2], ['core', 'core', 1], ['core', 'core', 2], ['trap', 'acc', 3]]),
  brazos: D('Brazos y antebrazo', 'Bíceps, tríceps y antebrazo', 'upper', [['tri', 'acc', 1], ['bi', 'acc', 1], ['tri', 'acc', 2], ['brach', 'acc', 2], ['fore', 'acc', 2], ['fore', 'acc', 3]]),
  espTrap: D('Espalda y trapecio', 'Jalón, remo y trapecio', 'upper', [['vpull', 'main', 1], ['row', 'sec', 1], ['trap', 'acc', 1], ['rear', 'acc', 2], ['bi', 'acc', 3]]),
  torsoFull: D('Torso completo', 'Pecho, espalda, hombro y brazos', 'upper', [['hpush', 'main', 1], ['vpull', 'main', 1], ['vpush', 'sec', 2], ['row', 'sec', 2], ['lat', 'acc', 3], ['bi', 'acc', 3], ['tri', 'acc', 3], ['trap', 'acc', 3]]),
  torsoFull2: D('Torso completo B', 'Pecho alto, remo, hombro de atrás y brazos', 'upper', [['ipush', 'main', 1], ['row', 'main', 1], ['vpull', 'sec', 2], ['rear', 'acc', 2], ['tri', 'acc', 3], ['brach', 'acc', 3], ['trap', 'acc', 3]]),
  extra: D('Puntos débiles y tronco', 'Hombro de atrás, trapecio, antebrazo y abdomen', 'upper', [['rear', 'acc', 1], ['trap', 'acc', 1], ['fore', 'acc', 2], ['brach', 'acc', 2], ['core', 'core', 1], ['core', 'core', 2]]),
  legQuad: D('Pierna: cuádriceps y pantorrilla', 'Sentadilla, cuádriceps, pantorrilla de atrás y de adelante', 'lower', [['pow', 'pow', 2], ['sq', 'main', 1], ['uni', 'sec', 1], ['quad', 'acc', 2], ['ham', 'acc', 2], ['calf', 'acc', 1], ['tib', 'acc', 2], ['core', 'core', 3]]),
  legGlute: D('Pierna: glúteo y femoral', 'Cadera, glúteo, femoral, sóleo y tibial', 'lower', [['pow', 'pow', 2], ['hinge', 'main', 1], ['glute', 'sec', 1], ['ham', 'acc', 1], ['abd', 'acc', 2], ['sol', 'acc', 1], ['tib', 'acc', 3], ['core', 'core', 3]]),
  legUni: D('Pierna: una pierna y glúteo', 'Una pierna, glúteo, femoral y pantorrilla', 'lower', [['uni', 'main', 1], ['glute', 'sec', 1], ['ham', 'acc', 2], ['abd', 'acc', 2], ['calf', 'acc', 2], ['tib', 'acc', 3], ['core', 'core', 3]]),
  legFull: D('Pierna completa', 'Sentadilla, cadera, glúteo, pantorrilla y tibial', 'lower', [['sq', 'main', 1], ['hinge', 'sec', 1], ['glute', 'acc', 1], ['ham', 'acc', 2], ['calf', 'acc', 1], ['tib', 'acc', 2], ['abd', 'acc', 3]]),
};
// Reparto de los días de torso de cada semana, según cuántos días de torso tienes.
const ROT_UP = {
  1: [['torsoFull'], ['torsoFull2'], ['torsoFull'], ['torsoFull2']],
  2: [['torsoFull', 'torsoFull2'], ['torsoA', 'torsoB'], ['pechoEsp', 'hombroBrazos'], ['torsoFull2', 'torsoFull']],
  3: [['pechoTri', 'espBi', 'hombroTrap'], ['empuje', 'jalon', 'espaldaAlta'], ['torsoA', 'torsoB', 'hombroBrazos'], ['pechoEsp', 'hombroCore', 'brazos']],
  4: [['pechoTri', 'espBi', 'hombroTrap', 'brazosAnte'], ['empuje', 'jalon', 'empuje2', 'jalon2'], ['torsoA', 'hombroBrazos', 'torsoB', 'espaldaAlta'], ['pechoEsp', 'hombroCore', 'brazos', 'espTrap']],
};
export const ROT_NAMES = ['Por grupos', 'Empuje y jalón', 'Torso y brazos', 'Por pares'];
export const ROT_DEFAULT = { gymWd: [1, 2, 3, 4, 5, 6], legWd: [2, 6] };
const ROT_EPOCH = '2026-01-05';   // un lunes: las semanas cambian cada lunes
const mondayOf = (d) => addDays(d, -((new Date(`${d}T12:00:00`).getDay() + 6) % 7));
// Número de semana (desde que empezaste o desde enero de 2026) y lugar en el ciclo de 4.
export function rotWeek(spec, today = todayStr()) {
  const from = mondayOf(spec?.since && spec.since <= today ? spec.since : ROT_EPOCH);
  const n = Math.max(0, Math.floor(diffDays(mondayOf(today), from) / 7));
  return { n, cycle: n % 4, name: ROT_NAMES[n % 4], next: ROT_NAMES[(n + 1) % 4], monday: mondayOf(today) };
}
const cleanWd = (xs) => [...new Set((Array.isArray(xs) ? xs : []).map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))];
export function normRota(o) {
  let gym = cleanWd(o.gymWd), leg = cleanWd(o.legWd).filter((x) => gym.includes(x));
  if (gym.length < 2 || gym.length > 6) gym = [...ROT_DEFAULT.gymWd];
  if (!leg.length || leg.length > 3 || leg.length >= gym.length) leg = ROT_DEFAULT.legWd.filter((x) => gym.includes(x));
  if (!leg.length || leg.length >= gym.length) leg = [gym[Math.min(1, gym.length - 1)]];
  const byWeek = (a, b) => ((a + 6) % 7) - ((b + 6) % 7);
  return { gymWd: gym.sort(byWeek), legWd: leg.sort(byWeek) };
}
function rotaKeys(spec, n) {
  const { gymWd, legWd } = normRota(spec);
  const up = gymWd.filter((d) => !legWd.includes(d));
  const scheme = up.length ? [...(ROT_UP[Math.min(4, up.length)][n % 4])] : [];
  while (scheme.length < up.length) scheme.push('extra');
  const legs = legWd.length === 1 ? ['legFull'] : legWd.length === 2 ? (n % 2 ? ['legGlute', 'legQuad'] : ['legQuad', 'legGlute']) : [['legQuad', 'legGlute', 'legUni'], ['legGlute', 'legUni', 'legQuad'], ['legUni', 'legQuad', 'legGlute']][n % 3];
  let iu = 0, il = 0;
  return gymWd.map((wd) => ({ wd, key: legWd.includes(wd) ? legs[il++] : scheme[iu++] }));
}

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
  if (role === 'pow' || ex.unit === 'saltos') { rir = null; if (ex.pat === 'lanzamiento') reps = '5'; if (ex.id === 'f-sprint') { reps = '4'; sets = 1; rest = 90; } if (ex.id === 'f-trineo') { reps = '1'; sets = spec.exp === 'nuevo' ? 3 : 4; rest = 120; } }
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
  o.plan = o.plan === 'rota' ? 'rota' : 'auto';   // v3.25: «rota» = cambia cada semana
  if (o.plan === 'rota') { Object.assign(o, normRota(o)); o.days = o.gymWd.length; }
  return o;
}

// Cuántos días pesados de pierna caben según el voleibol de la semana (entrenos + partidos).
export const legHeavyCap = (vb) => (vb >= 5 ? 1 : vb >= 3 ? 2 : 3);

// ---------- la rutina ----------
// spec: perfil normalizado + vb (días de voleibol por semana que se usan).
export function buildFit(raw, vb = 0, { today = todayStr(), week = null } = {}) {
  const spec = normFit(raw);
  const tierMax = FIT_EXP[spec.exp].tier;
  // v3.25: rutina que cambia cada semana. week: para ver otra semana (0 = esta, 1 = la próxima).
  const rot = spec.plan === 'rota' ? rotWeek(spec, week ? addDays(today, 7 * week) : today) : null;
  const plan = rot ? rotaKeys(spec, rot.n) : SPLITS[spec.days].map((key) => ({ key, wd: null }));
  const BP = rot ? RD : DAYS;
  const cap = legHeavyCap(vb);
  const patUse = {};
  let heavyLegs = 0;
  // Saltos: con 3 o más días de voleibol ya saltas mucho en la cancha; se dejan solo en «Fuerza y salto», un día.
  let powLeft = spec.goal === 'fuerza' ? (vb >= 3 ? 1 : 2) : vb >= 3 ? 0 : spec.goal === 'salud' ? 0 : 1;
  const pickEx = (pat, used, role) => {
    for (let p = pat, guard = 0; p && guard < 4; p = FALLBACK[p], guard++) {
      const ids = rot ? ROT_ONLY[p] || [...new Set([...(ORDER[p] || []), ...(ROT_EXTRA[p] || [])])] : ORDER[p] || [];
      let list = ids.map((id) => FIT_BY_ID[id]).filter((e) => e && fitAvailable(e, spec.place) && e.tier <= tierMax && !used.has(e.id));
      // En el gym, la rotativa no usa ligas, y en los básicos tampoco ejercicios con tu peso, si hay de otros.
      if (rot && (spec.place === 'completo' || spec.place === 'basico')) {
        const gymOnly = list.filter((e) => !(e.need === 'liga' && e.id.startsWith('f-')) && !(e.need === 'nada' && !BODY_OK.has(p)) && !((role === 'main' || role === 'sec') && e.need === 'cajon'));
        if (gymOnly.length) list = gymOnly;
      }
      // Los básicos pesados cambian cada 2 semanas (para que puedas subir peso); lo demás, cada semana.
      const off = rot ? (role === 'main' ? Math.floor(rot.n / 2) : rot.n) : 0;
      if (list.length) { const k = patUse[p] || 0; patUse[p] = k + 1; return { ex: list[(k + off) % list.length], pat: p }; }
    }
    return null;
  };
  const days = plan.map(({ key: k, wd }, i) => {
    const bp = BP[k];
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
      const got = pickEx(s.pat, used, s.role); if (!got) continue;
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
    // v3.25: en la rotativa, si sobra tiempo, una serie más a los ejercicios con menos (hasta 4).
    for (let guard = 0; rot && guard < 12 && dayMinutes(items) < spec.minutes - 8; guard++) {
      const it = items.filter((x) => x.role !== 'pow' && x.role !== 'core' && x.sets < 4).sort((a, b) => a.sets - b.sets || a.p - b.p)[0];
      if (!it) break;
      it.sets += 1;
      if (dayMinutes(items) > spec.minutes + 3) { it.sets -= 1; break; }
    }
    items = items.map(({ p, ...rx }) => rx);
    return { key: String.fromCharCode(65 + i), name: bp.name, focus: bp.focus, kind: bp.kind, light, items, min: dayMinutes(items), ...(rot ? { wd } : {}) };
  });
  if (rot) {
    const volume = weeklyVolume(days);
    return { spec, vb, n: days.length, days, volume, rota: rot, notes: rotaNotes(spec, vb, days, volume, rot) };
  }
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
for (const [pat, ids] of [...Object.entries(ORDER), ...Object.entries(ROT_EXTRA)]) for (const id of ids) if (!SLOT_OF[id] && !FIT_BY_ID[id]?.slot) SLOT_OF[id] = pat;
for (const e of FIT_EX) if (e.slot) SLOT_OF[e.id] = e.slot;
const cleanRx = (rx) => {
  const ex = FIT_BY_ID[rx?.ex]; if (!ex) return null;
  const sets = Math.min(10, Math.max(1, Math.round(Number(rx.sets) || 3)));
  const reps = String(rx.reps ?? '').trim().slice(0, 12) || '10';
  const rest = Math.min(600, Math.max(0, Math.round(Number(rx.rest) || 60)));
  let rir = rx.rir === null || rx.rir === '' || rx.rir === undefined ? null : Math.min(5, Math.max(0, Math.round(Number(rx.rir))));
  if (Number.isNaN(rir)) rir = null;
  return { ex: ex.id, pat: SLOT_OF[ex.id] || ex.slot || ex.pat, role: ROLE[rx.role] ? rx.role : fitRole(ex), sets, reps, rir, rest };
};
// v3.18: cada día puede ir en un día de la semana (wd: 0 domingo … 6 sábado) y recuerda sus músculos (mus).
const wdOf = (x) => (x === null || x === undefined || x === '' ? null : Number.isInteger(Number(x)) && Number(x) >= 0 && Number(x) <= 6 ? Number(x) : null);
export const cleanFitCustom = (custom) => (Array.isArray(custom) ? custom : []).slice(0, 7)
  .map((d, i) => ({ name: String(d?.name || `Día ${String.fromCharCode(65 + i)}`).trim().slice(0, 40), wd: wdOf(d?.wd), mus: Array.isArray(d?.mus) ? d.mus.filter((m) => typeof m === 'string').slice(0, 8) : [],
    items: (d?.items || []).map(cleanRx).filter(Boolean).slice(0, 16) }))
  .filter((d) => d.items.length);
export function customFitDays(custom) {
  return cleanFitCustom(custom).map((d, i) => ({ key: String.fromCharCode(65 + i), name: d.name, wd: d.wd, mus: d.mus, focus: 'Personalizado', kind: 'custom', light: false, items: d.items, min: dayMinutes(d.items), custom: true }));
}

// ---------- v3.18: ejercicios propios («Agregar mi propio ejercicio») ----------
// Se guardan en el perfil (data.myEx) y se registran aquí para que la rutina, el registro y las gráficas los encuentren.
export const OWN_MUS = { pecho: ['Pecho', 'hpush'], pechoAlto: ['Pecho alto', 'ipush'], hombro: ['Hombro', 'vpush'], hombroPost: ['Hombro de atrás', 'rear'], triceps: ['Tríceps', 'tri'],
  espalda: ['Espalda', 'vpull'], espaldaAlta: ['Espalda media y alta', 'row'], biceps: ['Bíceps', 'bi'], pierna: ['Piernas', 'sq'], cuadriceps: ['Cuádriceps', 'quad'],
  femoral: ['Parte de atrás del muslo', 'ham'], gluteo: ['Glúteos', 'glute'], cadera: ['Cadera', 'glute'], pantorrilla: ['Pantorrilla', 'calf'], abdomen: ['Abdomen', 'core'],
  tibial: ['Pantorrilla de adelante (tibial)', 'tib'], antebrazo: ['Antebrazo', 'fore'], trapecio: ['Trapecio', 'trap'] };
export function cleanOwn(list) {
  return (Array.isArray(list) ? list : []).filter((x) => x && /^u-[a-z0-9-]{3,40}$/.test(x.id) && OWN_MUS[x.mus]).slice(0, 40)
    .map((x) => ({ id: x.id, name: String(x.name || 'Mi ejercicio').trim().slice(0, 50), mus: x.mus, need: ['maquina', 'polea', 'barra', 'mancuerna', 'nada', 'liga'].includes(x.need) ? x.need : 'maquina', unit: ['kg', 'reps', 's'].includes(x.unit) ? x.unit : 'kg' }));
}
export function registerOwn(list) {
  for (const x of cleanOwn(list)) {
    if (FIT_BY_ID[x.id]?.name === x.name) continue;
    const [body, pat] = OWN_MUS[x.mus];
    const ex = { id: x.id, name: x.name, own: true, mus: x.mus, body, pat, slot: pat, need: x.need, unit: x.unit, tier: 1, role: ['hpush', 'ipush', 'vpush', 'vpull', 'row', 'sq'].includes(pat) ? 'sec' : pat === 'core' ? 'core' : 'acc',
      why: 'Ejercicio que agregaste tú.', how: ['Ajusta la máquina o el lugar a tu medida antes de empezar.', 'Haz las primeras repeticiones con poco peso para revisar la técnica.', 'Muévete controlado, sin rebotes, en todo tu rango cómodo.'],
      cues: ['Controla la bajada', 'Sin dolor de articulación'], err: 'Subir el peso antes de dominar el movimiento.', easier: 'Menos peso o menos rango.', harder: 'Más peso o una pausa en la parte difícil.' };
    if (FIT_BY_ID[x.id]) Object.assign(FIT_BY_ID[x.id], ex); else { FIT_BY_ID[x.id] = ex; ALL_EX.push(ex); }
    SLOT_OF[x.id] = pat;
  }
}

// ---------- v3.18: regreso gradual ----------
// Las primeras 2 semanas después de una pausa: una serie menos (mínimo 2) y una repetición más de sobra.
export function rampOf(spec, today = todayStr()) {
  const since = spec?.rampSince; if (!since) return null;
  const d = Math.round((new Date(`${today}T12:00:00`) - new Date(`${since}T12:00:00`)) / 864e5);
  return d >= 0 && d < 14 ? { week: d < 7 ? 1 : 2, ends: since } : null;
}
export function applyRamp(days) {
  for (const d of days) d.items = d.items.map((rx) => ({ ...rx, sets: rx.sets > 2 ? rx.sets - 1 : rx.sets, rir: rx.rir != null ? Math.min(5, rx.rir + 1) : rx.rir }));
  return days;
}
// Máximo estimado a 1 repetición (fórmula de Epley; aproximado, mejor con 10 repeticiones o menos).
export const e1rm = (kg, reps) => (kg > 0 && reps > 0 ? Math.round(kg * (1 + Math.min(reps, 12) / 30) * 10) / 10 : 0);
export function fitRole(ex) {
  if (ex.role) return ex.role;
  if (ex.unit === 'saltos' || ex.pat === 'salto' || ex.pat === 'lanzamiento') return 'pow';
  if (ex.pat === 'tronco' || ex.pat === 'core') return 'core';
  if (ex.need === 'barra') return 'main';
  return /^(Bíceps|Tríceps|Hombro \(deltoides|Pantorrilla|Sóleo|Cuádriceps$|Parte de atrás|Aductores|Frente)/.test(ex.body || '') ? 'acc' : 'sec';
}
export function fitDefaultRx(exId, raw) {
  const spec = normFit(raw), ex = FIT_BY_ID[exId]; if (!ex) return null;
  return { ...prescribe(ex, fitRole(ex), spec, false), pat: SLOT_OF[ex.id] || ex.slot || ex.pat };
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
  const shortOf = Object.entries(volume).filter(([m, x]) => m !== 'abdomen' && m !== 'pantorrilla' && !SMALL_MUS.has(m) && x > 0 && x < lo).map(([m]) => MUSCLES[m].toLowerCase());
  if (shortOf.length && (spec.goal === 'musculo' || spec.goal === 'grasa')) n.push(`Con ${spec.minutes} minutos no alcanzan las series de ${shortOf.join(', ')}. Si quieres más, sube a ${Math.min(90, spec.minutes + 15)} minutos o un día más.`);
  if (spec.exp === 'nuevo') n.push('Las primeras 2 a 4 semanas: aprende la técnica con peso cómodo. Los resultados llegan igual: pasar de no entrenar a entrenar es el salto más grande.');
  if (spec.goal === 'grasa') n.push('Para bajar grasa, las pesas cuidan el músculo; la grasa se baja comiendo un poco menos y caminando más (tu meta de pasos).');
  if (spec.goal === 'salud') n.push('Para la salud, súmale 150 a 300 minutos a la semana de actividad moderada (caminar rápido cuenta). El voleibol también cuenta.');
  if (spec.place === 'casa' || spec.place === 'cancha') n.push('Sin máquinas también funciona: con ligas y tu peso, cuando un ejercicio ya te queda fácil, busca la versión más difícil.');
  return n;
}

function rotaNotes(spec, vb, days, volume, rot) {
  const legs = days.filter((d) => d.kind === 'lower').map((d) => WD_LONG[d.wd]);
  const n = [`Cambia cada semana: esta toca «${rot.name}» (semana ${rot.cycle + 1} de 4 del ciclo); la próxima, «${rot.next}». Pierna siempre el ${legs.join(' y el ')}.`,
    'Los ejercicios básicos pesados se repiten 2 semanas seguidas para que puedas subir el peso; los demás cambian cada semana. Remate te recuerda lo que levantaste la última vez que hiciste cada uno.'];
  return [...n, ...fitNotes(spec, vb, days, volume)];
}
const WD_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

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
  ['Google Fit: cómo se ganan los puntos cardio (1 por minuto moderado, 2 por minuto intenso; 150 minutos por semana)', 'https://support.google.com/fit/answer/7619539'],
  ['OMS (2008): cómo medir la cintura y la cadera', 'https://www.who.int/publications/i/item/9789241501491'],
  ['Silva y cols. (2019): pliometría en jugadores de voleibol', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6720263/'],
];
export { NEED, TIER };

// ---------- v3.20: entrenar donde estés ----------
// Un ejercicio equivalente que sí se pueda hacer en ese lugar: mismo músculo (o el mismo lugar de la rutina), primero el
// de la misma unidad, y hasta tu nivel. null si no hay ninguno.
export function fitSwap(exId, place, spec = {}, { slot = null, exclude = [] } = {}) {
  const ex = FIT_BY_ID[exId];
  if (!ex) return null;
  if (fitAvailable(ex, place)) return exId;
  const tierMax = (FIT_EXP[normFit(spec).exp]?.tier || 2) + 1, skip = new Set(exclude);
  const mus = musOf(exId), score = new Map();
  const bump = (id, n) => score.set(id, (score.get(id) || 0) + n);
  mus.forEach((m) => MUS_BY[m].ids.forEach((id, i) => bump(id, 3 - i * 0.05)));
  (ORDER[slot || SLOT_OF[exId] || ex.slot] || []).forEach((id, i) => bump(id, 2.5 - i * 0.05));
  ALL_EX.filter((e) => e.pat === ex.pat).forEach((e) => bump(e.id, 1.5));
  const best = [...score].map(([id, n]) => [FIT_BY_ID[id], n + (FIT_BY_ID[id]?.unit === ex.unit ? 0.5 : 0)])
    .filter(([e]) => e && e.id !== exId && !skip.has(e.id) && fitAvailable(e, place) && e.tier <= tierMax)
    .sort((a, b) => b[1] - a[1])[0];
  return best ? best[0].id : null;
}
