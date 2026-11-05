// Remate Fit (v3.18): armar un día por músculos, plantillas de semana y nombres del gym para el buscador.
// MUS: [clave, nombre, patrón para contar series, ejercicios en orden de preferencia (básicos y máquinas primero)]
export const MUS = [
  ['pecho', 'Pecho', 'hpush', ['m-press-pecho', 'g-press-banca', 'g-press-mancuernas', 'm-smith-banca', 'm-pec-deck', 'm-cruce-poleas', 'f-apertura', 'm-fondos-asistidos', 'g-lagartija']],
  ['pechoAlto', 'Pecho alto', 'ipush', ['m-press-inclinado', 'f-press-inclinado', 'm-cruce-bajo', 'f-flexion-pies', 'g-landmine']],
  ['hombro', 'Hombro', 'vpush', ['m-press-hombro', 'g-press-hombro-m', 'm-lateral-maquina', 'f-elev-lateral', 'm-lateral-polea', 'f-press-liga', 'f-elev-lateral-liga']],
  ['hombroPost', 'Hombro posterior', 'rear', ['m-deltoide-post', 'g-face-pull', 'g-ytw']],
  ['triceps', 'Tríceps', 'tri', ['m-triceps-cuerda-arriba', 'f-ext-triceps-polea', 'm-triceps-maquina', 'f-ext-triceps-m', 'm-fondos-asistidos', 'f-fondos-banco']],
  ['espalda', 'Espalda', 'vpull', ['m-jalon-maquina', 'g-jalon-polea', 'm-dominada-asistida', 'g-dominada', 'm-jalon-cerrado', 'm-pullover-polea', 'g-remo-1', 'f-jalon-liga']],
  ['espaldaAlta', 'Remo y espalda alta', 'row', ['m-remo-maquina', 'm-remo-t', 'f-remo-polea', 'f-remo-barra', 'm-remo-1-polea', 'g-remo-invertido', 'm-encogimientos', 'f-remo-liga']],
  ['biceps', 'Bíceps', 'bi', ['f-curl-m', 'm-curl-maquina', 'm-curl-polea', 'm-martillo-cuerda', 'f-curl-liga']],
  ['pierna', 'Pierna completa', 'sq', ['m-hack', 'g-prensa', 'g-sent-trasera', 'm-smith-sentadilla', 'g-goblet', 'g-bulgara', 'g-zancada', 'm-prensa-1', 'f-sent-pc', 'f-zancada-atras']],
  ['cuadriceps', 'Cuádriceps', 'quad', ['f-ext-cuad', 'm-hack', 'g-prensa', 'g-sent-frontal', 'g-subida']],
  ['femoral', 'Femoral', 'ham', ['m-curl-fem-sentado', 'g-curl-femoral', 'g-rumano-barra', 'g-rumano-mancuernas', 'g-nordico', 'g-puente-1']],
  ['gluteo', 'Glúteo', 'glute', ['g-hipthrust', 'm-hip-thrust-maq', 'm-patada-gluteo', 'g-bulgara', 'g-hipthrust-m', 'g-rumano-1']],
  ['cadera', 'Cadera (abductores y aductores)', 'glute', ['m-abductores', 'm-aductores', 'g-hex', 'm-extension-espalda', 'g-copenhague']],
  ['pantorrilla', 'Pantorrilla', 'calf', ['m-talones-maquina', 'g-talones-pie', 'm-talones-sentado-maq', 'm-talones-prensa', 'g-talones-sentado']],
  ['abdomen', 'Abdomen', 'core', ['m-crunch-polea', 'm-crunch-maquina', 'm-silla-romana', 'g-pallof', 'g-lenador', 'g-plancha-lat', 'g-deadbug']],
  ['salto', 'Salto y potencia', 'pow', ['g-salto-cajon', 'g-lanz-arriba', 'g-salto-cargado', 'g-slam', 'f-trineo']],
];
export const MUS_BY = Object.fromEntries(MUS.map(([k, name, pat, ids]) => [k, { k, name, pat, ids }]));
// Músculos grandes: les tocan 2 ejercicios cuando se eligen pocos músculos en el día.
const BIG = new Set(['pecho', 'espalda', 'espaldaAlta', 'pierna', 'gluteo', 'femoral']);
// En qué músculos sale un ejercicio (para «Me molestó»: alternativas del mismo músculo).
export const musOf = (id) => MUS.filter(([, , , ids]) => ids.includes(id)).map(([k]) => k);

// Propone los ejercicios de un día. ok(id): si se puede (existe y hay con qué hacerlo en tu lugar).
// rx(id): dosis por omisión. minutes(items): duración del día. max: minutos que tienes.
export function proposeDay(keys, { ok, rx, minutes, max = 60, exclude = [] }) {
  const ks = keys.filter((k) => MUS_BY[k]);
  if (!ks.length) return [];
  const used = new Set(exclude);
  const want = Object.fromEntries(ks.map((k, i) => [k, BIG.has(k) && (ks.length <= 2 || i === 0) ? 2 : 1]));
  if (ks.length === 1) want[ks[0]] = BIG.has(ks[0]) ? 4 : 3;
  const items = [];
  // Primero un ejercicio de cada músculo (en el orden que los elegiste); luego los segundos.
  for (let round = 0; round < 4; round++) {
    for (const k of ks) {
      if (round >= want[k]) continue;
      const id = MUS_BY[k].ids.find((x) => !used.has(x) && ok(x));
      if (!id) continue;
      used.add(id); const r = rx(id); if (r) items.push(r);
    }
  }
  // Si sobra tiempo, otro ejercicio de cada músculo (en orden) mientras quepa, hasta 8.
  for (let round = 0, added = true; added && items.length < 8 && round < 4; round++) {
    added = false;
    for (const k of ks) {
      if (items.length >= 8) break;
      const id = MUS_BY[k].ids.find((x) => !used.has(x) && ok(x)); if (!id) continue;
      const r = rx(id); if (!r) continue;
      if (minutes([...items, r]) > max + 3) continue;
      used.add(id); items.push(r); added = true;
    }
  }
  // Que quepa en tu tiempo: quita los segundos ejercicios del final y luego series.
  for (let guard = 0; guard < 20 && items.length > ks.length && minutes(items) > max + 3; guard++) items.pop();
  for (let guard = 0; guard < 20 && minutes(items) > max + 3; guard++) {
    const big = items.filter((it) => it.sets > 2).sort((a, b) => b.sets - a.sets)[0];
    if (!big) break; big.sets -= 1;
  }
  return items;
}

// Plantillas de semana. wd: 0 domingo … 6 sábado.
export const TEMPLATES = [
  { id: 'grupos6', name: '6 días por grupos (lunes a sábado)', desc: 'Pecho, espalda y pierna 2 veces por semana. El domingo, descanso.', days: [
    { wd: 1, name: 'Pecho, hombro y tríceps', mus: ['pecho', 'hombro', 'triceps'] },
    { wd: 2, name: 'Espalda, hombro posterior y bíceps', mus: ['espalda', 'hombroPost', 'biceps'] },
    { wd: 3, name: 'Pierna completa y glúteo', mus: ['pierna', 'gluteo'] },
    { wd: 4, name: 'Abdomen, pecho alto y hombro', mus: ['pechoAlto', 'hombro', 'abdomen'] },
    { wd: 5, name: 'Remo y espalda alta', mus: ['espaldaAlta', 'espalda'] },
    { wd: 6, name: 'Cadera, pantorrilla y pierna', mus: ['cadera', 'femoral', 'pantorrilla', 'cuadriceps'] }] },
  { id: 'ppl6', name: 'Empuje, jalón y pierna, 2 veces (6 días)', desc: 'El clásico de 6 días: cada músculo 2 veces por semana.', days: [
    { wd: 1, name: 'Empuje', mus: ['pecho', 'hombro', 'triceps'] }, { wd: 2, name: 'Jalón', mus: ['espalda', 'espaldaAlta', 'biceps'] },
    { wd: 3, name: 'Pierna', mus: ['pierna', 'femoral', 'pantorrilla'] }, { wd: 4, name: 'Empuje', mus: ['pechoAlto', 'hombro', 'triceps'] },
    { wd: 5, name: 'Jalón', mus: ['espaldaAlta', 'espalda', 'hombroPost', 'biceps'] }, { wd: 6, name: 'Pierna y glúteo', mus: ['gluteo', 'cuadriceps', 'cadera', 'abdomen'] }] },
  { id: 'grupos5', name: '5 días por grupos', desc: 'Un día para cada parte, de lunes a viernes.', days: [
    { wd: 1, name: 'Pecho y tríceps', mus: ['pecho', 'pechoAlto', 'triceps'] }, { wd: 2, name: 'Espalda y bíceps', mus: ['espalda', 'espaldaAlta', 'biceps'] },
    { wd: 3, name: 'Pierna', mus: ['pierna', 'femoral', 'pantorrilla'] }, { wd: 4, name: 'Hombro y abdomen', mus: ['hombro', 'hombroPost', 'abdomen'] },
    { wd: 5, name: 'Glúteo y cadera', mus: ['gluteo', 'cadera', 'cuadriceps'] }] },
  { id: 'tp4', name: 'Torso y pierna (4 días)', desc: 'Lunes, martes, jueves y viernes.', days: [
    { wd: 1, name: 'Torso', mus: ['pecho', 'espalda', 'hombro', 'biceps'] }, { wd: 2, name: 'Pierna', mus: ['pierna', 'femoral', 'pantorrilla'] },
    { wd: 4, name: 'Torso', mus: ['pechoAlto', 'espaldaAlta', 'hombroPost', 'triceps'] }, { wd: 5, name: 'Pierna y glúteo', mus: ['gluteo', 'cuadriceps', 'abdomen'] }] },
  { id: 'fb3', name: 'Cuerpo completo (3 días)', desc: 'Lunes, miércoles y viernes. Ideal para regresar.', days: [
    { wd: 1, name: 'Cuerpo completo A', mus: ['pierna', 'pecho', 'espalda', 'abdomen'] }, { wd: 3, name: 'Cuerpo completo B', mus: ['femoral', 'hombro', 'espaldaAlta', 'biceps'] },
    { wd: 5, name: 'Cuerpo completo C', mus: ['gluteo', 'pechoAlto', 'espalda', 'triceps'] }] },
];

// Nombres que se usan en el gym (para el buscador). Se suman al nombre y la zona de cada ejercicio.
export const ALIAS = {
  'f-trineo': 'trineo sled push empuje de trineo prowler',
  'g-press-banca': 'bench press press plano banca plana', 'g-press-mancuernas': 'press plano mancuernas', 'm-press-pecho': 'maquina de pecho chest press press sentado',
  'm-press-inclinado': 'press inclinado maquina incline', 'f-press-inclinado': 'press inclinado mancuernas incline', 'm-pec-deck': 'pec deck peck deck peckdeck mariposa butterfly aperturas maquina',
  'm-cruce-poleas': 'crossover cruces cable aperturas polea', 'm-cruce-bajo': 'crossover bajo cruces cable', 'f-apertura': 'aperturas flyes', 'm-smith-banca': 'smith multipower banca press',
  'm-smith-sentadilla': 'smith multipower sentadilla squat', 'm-fondos-asistidos': 'dips fondos asistidos', 'g-lagartija': 'push up flexiones lagartijas',
  'm-press-hombro': 'press militar maquina shoulder press', 'g-press-hombro-m': 'press militar mancuernas shoulder press', 'f-elev-lateral': 'laterales vuelos laterales',
  'm-lateral-maquina': 'laterales maquina vuelos', 'm-lateral-polea': 'laterales polea cable', 'm-deltoide-post': 'reverse fly posterior pajaros pec deck invertido',
  'g-face-pull': 'face pull jalon a la cara', 'm-encogimientos': 'shrugs encogimientos trapecio', 'm-triceps-cuerda-arriba': 'triceps cuerda por arriba copa frances polea',
  'f-ext-triceps-polea': 'triceps polea pushdown jalon de triceps cuerda', 'm-triceps-maquina': 'triceps maquina', 'f-ext-triceps-m': 'copa triceps frances',
  'g-jalon-polea': 'jalon al pecho polea lat pulldown jalones', 'm-jalon-maquina': 'jalon maquina pulldown', 'm-jalon-cerrado': 'jalon cerrado agarre cerrado',
  'm-dominada-asistida': 'dominadas asistidas pull up asistida', 'g-dominada': 'pull up dominadas barra fija', 'm-pullover-polea': 'pullover polea brazos rectos',
  'm-remo-maquina': 'remo maquina seated row', 'm-remo-t': 'remo t t bar barra t', 'f-remo-polea': 'remo sentado polea gironda seated row', 'f-remo-barra': 'remo con barra bent over row',
  'm-remo-1-polea': 'remo polea un brazo', 'g-remo-1': 'remo mancuerna serrucho', 'f-curl-m': 'curl biceps mancuernas', 'm-curl-maquina': 'curl predicador scott maquina biceps',
  'm-curl-polea': 'curl polea cable biceps', 'm-martillo-cuerda': 'martillo cuerda hammer', 'g-prensa': 'leg press prensa 45', 'm-prensa-1': 'prensa una pierna',
  'm-hack': 'hack squat hack', 'g-sent-trasera': 'sentadilla squat barra', 'g-goblet': 'goblet sentadilla copa', 'f-ext-cuad': 'extension de pierna leg extension cuadriceps silla',
  'g-curl-femoral': 'femoral acostado leg curl curl de pierna', 'm-curl-fem-sentado': 'femoral sentado leg curl', 'g-rumano-barra': 'peso muerto rumano rdl',
  'g-rumano-mancuernas': 'peso muerto rumano rdl mancuernas', 'g-hipthrust': 'hip thrust puente gluteo', 'm-hip-thrust-maq': 'hip thrust maquina gluteo',
  'm-patada-gluteo': 'patada gluteo kickback', 'm-abductores': 'abductor abductores abrir piernas cadera', 'm-aductores': 'aductor aductores cerrar piernas cadera',
  'm-talones-maquina': 'pantorrilla gemelos calf', 'g-talones-pie': 'pantorrilla gemelos calf', 'm-talones-sentado-maq': 'pantorrilla sentado soleo', 'm-talones-prensa': 'pantorrilla prensa',
  'm-crunch-polea': 'crunch abdominal polea cuerda', 'm-crunch-maquina': 'crunch abdominal maquina', 'm-silla-romana': 'silla romana elevacion de piernas abdomen',
  'm-extension-espalda': 'banco romano lumbares hiperextension', 'g-bulgara': 'bulgara split squat', 'g-zancada': 'zancadas desplantes lunges', 'f-zancada-atras': 'zancadas desplantes',
};
export const NEED_WORDS = { maquina: 'maquina', polea: 'polea cable', barra: 'barra', mancuerna: 'mancuerna mancuernas', liga: 'liga', cajon: 'cajon banco', balon: 'balon', nada: 'peso corporal sin peso' };
