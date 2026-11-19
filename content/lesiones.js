// Lesiones (v3.23): zonas, fases del regreso, señales de alerta y prevención para voleibol.
// Es una guía general para entrenadores de chavos, no un diagnóstico: ante una lesión, manda la persona el médico
// o el fisioterapeuta, y el regreso por fases se ajusta a lo que ellos digan.
// Basado en las recomendaciones generales de regreso al deporte por etapas (consenso de Berna 2016, Ardern y cols.)
// y en los programas de prevención de voleibol (equilibrio para tobillo, aterrizajes y fuerza excéntrica para rodilla,
// rotadores y escápula para hombro).

export const ZONES = [
  { id: 'tobillo', name: 'Tobillo', common: 'Esguince al caer sobre el pie de otro bajo la red. Es la lesión más común en voleibol.' },
  { id: 'rodilla', name: 'Rodilla', common: 'Dolor abajo de la rótula por saltar mucho («rodilla de saltador»); torceduras al aterrizar.' },
  { id: 'hombro', name: 'Hombro', common: 'Molestia por rematar y sacar muchas veces; se carga cuando falta fuerza en la espalda alta.' },
  { id: 'espalda', name: 'Espalda', common: 'Dolor en la espalda baja por arquearse al rematar o sacar.' },
  { id: 'dedos', name: 'Dedos', common: 'Dedos doblados o golpeados en el bloqueo o la colocación.' },
  { id: 'muneca', name: 'Muñeca', common: 'Golpes al recibir o al caer con la mano.' },
  { id: 'cadera', name: 'Cadera y muslo', common: 'Tirones en el muslo o la ingle al estirarse para defender.' },
  { id: 'otra', name: 'Otra', common: '' },
];
export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));
export const KINDS = [['molestia', 'Molestia'], ['lesion', 'Lesión']];
export const STATUS = { activa: 'Lesionado', regreso: 'En regreso', alta: 'Dado de alta' };

// Las 5 fases del regreso. Si vuelve el dolor, se regresa a la fase anterior.
export const STAGES = [
  { n: 1, name: 'Descanso activo', can: 'Movilidad suave sin dolor, lo de su zona que no duela, y ver el entreno (puede ayudar al entrenador).', not: 'Nada de saltos, carreras ni balón con la zona lesionada.', pass: 'Camina y mueve la zona sin dolor y casi sin hinchazón.' },
  { n: 2, name: 'Movilidad y fuerza', can: 'Ejercicios de movilidad y de fuerza de la zona sin impacto (ver Prevención) y bici o caminar.', not: 'Saltos ni remates todavía.', pass: 'Movimiento completo y fuerza parecida al otro lado, sin dolor al día siguiente.' },
  { n: 3, name: 'Técnica sin saltar', can: 'Toques, antebrazos, saque por abajo y desplazamientos suaves con el equipo.', not: 'Saltar, rematar, bloquear o tirarse al piso.', pass: 'Sin dolor durante el entreno ni el día siguiente.' },
  { n: 4, name: 'Entreno con límites', can: 'Entreno completo con la mitad de saltos, remates y bloqueos. Sube poco a poco.', not: 'Partidos completos.', pass: 'Salta y aterriza bien con las dos piernas (o mueve el brazo completo) sin dolor 24 horas después.' },
  { n: 5, name: 'Juego completo', can: 'Entreno y partidos normales.', not: '', pass: 'Dar de alta si sigue sin dolor una semana.' },
];

// Señales para mandar al médico (y no seguir ese día).
export const RED_FLAGS = [
  'No puede apoyar el pie o mover la zona.',
  'Se hincha mucho, se ve deformado o cambia de color.',
  'Golpe en la cabeza con mareo, dolor de cabeza, vómito o confusión: ese día ya no juega, aunque diga que está bien.',
  'Hormigueo, adormecimiento o pérdida de fuerza.',
  'La rodilla «tronó» y se siente floja o se le va.',
  'Dolor que no baja en una semana o que lo despierta en la noche.',
];

// Prevención por zona: 3 ejercicios cortos, 2 o 3 veces por semana (caben en el calentamiento o en casa).
export const PREVENT = {
  tobillo: [
    { name: 'Equilibrio en un pie', how: 'Parado en un pie, rodilla un poco doblada, 30 s por lado. Más difícil: con ojos cerrados o pasando un balón.', dose: '3 × 30 s por pie' },
    { name: 'Elevación de talones', how: 'Sube despacio a puntas y baja en 3 segundos. Luego en un pie.', dose: '3 × 15' },
    { name: 'Saltitos y caída quieta', how: 'Salta hacia adelante y cae en un pie, quieto 2 s, sin que la rodilla se vaya para adentro.', dose: '2 × 8 por pie' },
  ],
  rodilla: [
    { name: 'Aterrizaje suave', how: 'Salta y cae en dos pies, sin ruido, rodillas sobre las puntas (no hacia adentro) y cadera atrás.', dose: '3 × 8' },
    { name: 'Sentadilla lenta', how: 'Baja en 3 segundos, rodillas siguiendo a las puntas, y sube normal.', dose: '3 × 10' },
    { name: 'Puente de glúteo en una pierna', how: 'Acostado, una pierna doblada, sube la cadera sin arquear la espalda.', dose: '3 × 10 por lado' },
  ],
  hombro: [
    { name: 'Rotación externa con liga', how: 'Codo pegado al cuerpo a 90°, gira el antebrazo hacia afuera y regresa lento.', dose: '3 × 15 por brazo' },
    { name: 'Y-T con brazos', how: 'Boca abajo (o inclinado), sube los brazos en forma de Y y luego de T, juntando las escápulas.', dose: '2 × 10 de cada una' },
    { name: 'Lagartija con escápulas', how: 'En posición de plancha, junta y separa las escápulas sin doblar los codos.', dose: '2 × 12' },
  ],
  espalda: [
    { name: 'Plancha', how: 'Antebrazos en el piso, cuerpo recto, sin que la cadera se caiga.', dose: '3 × 30 s' },
    { name: 'Perro de caza (bird-dog)', how: 'En cuatro puntos, estira brazo y pierna contrarios, 2 s arriba, sin girar la cadera.', dose: '2 × 10 por lado' },
    { name: 'Puente de glúteo', how: 'Acostado, rodillas dobladas, sube la cadera apretando glúteos.', dose: '3 × 12' },
  ],
  dedos: [
    { name: 'Manos firmes al colocar', how: 'Toques contra la pared con los dedos abiertos en forma de canasta, sin que se doblen hacia atrás.', dose: '3 × 20' },
    { name: 'Apretar una pelota', how: 'Pelota de esponja o tenis: aprieta 3 s y suelta.', dose: '2 × 15 por mano' },
    { name: 'Vendaje en bloqueo', how: 'Si ya se lastimó un dedo, júntalo con el de al lado con cinta para los entrenos de bloqueo.', dose: 'En cada entreno de bloqueo' },
  ],
  muneca: [
    { name: 'Flexión y extensión con peso ligero', how: 'Antebrazo apoyado, sube y baja la mano con una botella de agua.', dose: '2 × 15 por lado' },
    { name: 'Caídas seguras', how: 'Practica rodar sobre el hombro en vez de caer con la mano estirada.', dose: '2 × 5' },
    { name: 'Plancha en manos', how: 'Plancha con las manos bajo los hombros, dedos abiertos.', dose: '3 × 20 s' },
  ],
  cadera: [
    { name: 'Zancada lateral', how: 'Paso grande al lado, cadera atrás, la otra pierna estirada.', dose: '2 × 8 por lado' },
    { name: 'Puente de isquios', how: 'Talones en una silla, sube la cadera y baja lento.', dose: '3 × 8' },
    { name: 'Aductores en plancha lateral', how: 'Plancha de lado con la pierna de arriba sobre una silla.', dose: '2 × 20 s por lado' },
  ],
};
PREVENT.otra = PREVENT.espalda;

export const zoneName = (id) => ZONE_BY_ID[id]?.name || 'Otra';
export const stageOf = (n) => STAGES.find((s) => s.n === Number(n)) || null;
