// Remate Fit · Nutrición (v3.12). Calorías con Mifflin-St Jeor, macros por kilo de peso y el plan del día en
// porciones del Sistema Mexicano de Alimentos Equivalentes (SMAE, 4.ª ed.). Son estimaciones: el ajuste con el
// peso real de cada semana es lo que afina el plan. No es para personas con enfermedades: eso, con nutriólogo.

// ---------- SMAE: aporte promedio de 1 equivalente [kcal, proteína g, lípidos g, hidratos de carbono g] ----------
export const EQ = {
  ver: { name: 'Verduras', short: 'Verdura', m: [25, 2, 0, 4] },
  fru: { name: 'Frutas', short: 'Fruta', m: [60, 0, 0, 15] },
  cer: { name: 'Cereales y tubérculos sin grasa', short: 'Cereal', m: [70, 2, 0, 15] },
  cerg: { name: 'Cereales con grasa', short: 'Cereal con grasa', m: [115, 2, 5, 15] },
  leg: { name: 'Leguminosas', short: 'Leguminosa', m: [120, 8, 1, 20] },
  aoa1: { name: 'Origen animal, muy bajo en grasa', short: 'Proteína magra', m: [40, 7, 1, 0] },
  aoa2: { name: 'Origen animal, bajo en grasa', short: 'Proteína baja en grasa', m: [55, 7, 3, 0] },
  aoa3: { name: 'Origen animal, moderado en grasa', short: 'Proteína moderada en grasa', m: [75, 7, 5, 0] },
  aoa4: { name: 'Origen animal, alto en grasa', short: 'Proteína alta en grasa', m: [100, 7, 8, 0] },
  lec1: { name: 'Leche descremada', short: 'Leche descremada', m: [95, 9, 2, 12] },
  lec2: { name: 'Leche semidescremada', short: 'Leche semidescremada', m: [110, 9, 4, 12] },
  lec3: { name: 'Leche entera', short: 'Leche entera', m: [150, 9, 8, 12] },
  gra: { name: 'Aceites y grasas', short: 'Grasa', m: [45, 0, 5, 0] },
  grap: { name: 'Grasas con proteína (semillas)', short: 'Semillas', m: [70, 3, 5, 3] },
  azu: { name: 'Azúcares', short: 'Azúcar', m: [40, 0, 0, 10] },
};
// Grupos para palomear (los subgrupos se juntan).
export const GROUPS = [
  ['ver', 'Verduras', ['ver']], ['fru', 'Frutas', ['fru']], ['cer', 'Cereales', ['cer', 'cerg']], ['leg', 'Leguminosas', ['leg']],
  ['aoa', 'Proteína animal', ['aoa1', 'aoa2', 'aoa3', 'aoa4']], ['lec', 'Leche o yogur', ['lec1', 'lec2', 'lec3']], ['gra', 'Grasas', ['gra', 'grap']], ['azu', 'Azúcares', ['azu']],
];
export const GROUP_OF = Object.fromEntries(GROUPS.flatMap(([g, , subs]) => subs.map((s) => [s, g])));
export const GROUP_NAME = Object.fromEntries(GROUPS.map(([g, n]) => [g, n]));

// ---------- 1 equivalente de cada alimento (SMAE). Para palomear y para «agregar un alimento». ----------
export const FOODS = [
  ['ver', 'Verdura cocida (calabacita, chayote, ejotes, brócoli, zanahoria)', '1/2 taza'], ['ver', 'Verdura cruda (pepino, jícama, pimiento)', '1 taza'],
  ['ver', 'Nopales cocidos', '1 taza'], ['ver', 'Jitomate', '1 pieza'], ['ver', 'Lechuga', '3 tazas'], ['ver', 'Espinaca cocida', '1/2 taza'], ['ver', 'Champiñones', '1 taza'],
  ['fru', 'Plátano', '1/2 pieza'], ['fru', 'Manzana', '1 pieza chica'], ['fru', 'Papaya o melón', '1 taza'], ['fru', 'Sandía', '1 taza'], ['fru', 'Mango', '1/2 pieza'],
  ['fru', 'Naranja', '2 piezas'], ['fru', 'Mandarina', '2 piezas'], ['fru', 'Fresas', '1 taza'], ['fru', 'Uvas', '18 piezas'], ['fru', 'Guayaba', '3 piezas'], ['fru', 'Piña', '3/4 taza'],
  ['cer', 'Tortilla de maíz', '1 pieza'], ['cer', 'Tostada horneada', '1 pieza'], ['cer', 'Bolillo sin migajón', '1/2 pieza'], ['cer', 'Pan de caja', '1 rebanada'],
  ['cer', 'Arroz cocido', '1/4 taza'], ['cer', 'Pasta cocida', '1/3 taza'], ['cer', 'Avena en hojuelas (cruda)', '1/3 taza'], ['cer', 'Papa cocida', '1/2 pieza'],
  ['cer', 'Elote desgranado', '1/2 taza'], ['cer', 'Amaranto', '1/4 taza'], ['cer', 'Galletas saladas', '4 piezas'],
  ['leg', 'Frijoles, lentejas, garbanzos o habas cocidos', '1/2 taza'],
  ['aoa1', 'Pechuga de pollo o pavo sin piel (cocida)', '30 g'], ['aoa1', 'Atún en agua (drenado)', '30 g'], ['aoa1', 'Pescado blanco (cocido)', '30 g'], ['aoa1', 'Camarón cocido', '30 g'], ['aoa1', 'Claras de huevo', '2 piezas'],
  ['aoa2', 'Bistec de res o lomo de cerdo magro (cocido)', '30 g'], ['aoa2', 'Queso panela', '40 g'], ['aoa2', 'Jamón de pavo', '2 rebanadas'], ['aoa2', 'Requesón', '3 cucharadas'],
  ['aoa3', 'Huevo entero', '1 pieza'], ['aoa3', 'Queso fresco', '40 g'], ['aoa3', 'Carne molida de res (cocida)', '30 g'],
  ['aoa4', 'Queso Oaxaca o manchego', '30 g'], ['aoa4', 'Chorizo', '20 g'],
  ['lec1', 'Leche descremada', '1 taza'], ['lec1', 'Yogur natural descremado sin azúcar', '3/4 taza'], ['lec2', 'Leche semidescremada', '1 taza'], ['lec3', 'Leche entera', '1 taza'],
  ['gra', 'Aceite', '1 cucharadita'], ['gra', 'Aguacate', '1/3 pieza'], ['gra', 'Crema', '1 cucharada'],
  ['grap', 'Cacahuates', '14 piezas'], ['grap', 'Almendras', '10 piezas'], ['grap', 'Crema de cacahuate', '1 1/2 cucharaditas'], ['grap', 'Nuez', '3 mitades'],
  ['azu', 'Azúcar o miel', '2 cucharaditas'], ['azu', 'Mermelada', '2 cucharaditas'],
];

export const macrosOf = (eq) => {
  const t = [0, 0, 0, 0];
  for (const [k, n] of Object.entries(eq || {})) { const m = EQ[k]?.m; if (!m || !n) continue; for (let i = 0; i < 4; i++) t[i] += m[i] * n; }
  return { kcal: Math.round(t[0]), p: Math.round(t[1]), f: Math.round(t[2]), c: Math.round(t[3]) };
};

// ---------- calorías ----------
export const OCCUPATIONS = { sentado: ['Casi todo el día sentado', 0], pie: ['De pie o caminando buena parte del día', 0.1], fisico: ['Trabajo físico (cargar, construir)', 0.2] };
// Mifflin-St Jeor (1990): la ecuación que más veces queda a ±10% del gasto en reposo medido (Frankenfield y cols., 2005).
export const mifflin = ({ sex, kg, cm, age }) => Math.round(10 * kg + 6.25 * cm - 5 * age + (sex === 'F' ? -161 : 5));
// Factor de actividad según sesiones de ejercicio a la semana (gym + voleibol) y el resto del día.
export function activity(sessions, occupation = 'sentado', steps = null) {
  let f = sessions <= 0 ? 1.2 : sessions <= 3 ? 1.375 : sessions <= 5 ? 1.55 : sessions <= 7 ? 1.725 : 1.9;
  f += OCCUPATIONS[occupation]?.[1] || 0;
  if (steps != null && steps >= 10000 && sessions <= 5) f += 0.05;
  return Math.round(Math.min(2.1, f) * 1000) / 1000;
}
export const GOAL_KCAL = { musculo: 1.1, grasa: 0.8, fuerza: 1.05, salud: 1 };
export const PROTEIN = { musculo: 1.8, grasa: 2.0, fuerza: 1.8, salud: 1.4 };   // g por kg (ISSN 2017: 1.4 a 2.0; en déficit, hacia arriba)
// Con IMC arriba de 25 la proteína se calcula con el peso que daría IMC 25: con el peso total sale de más.
export const refKg = (kg, cm) => Math.min(kg, Math.round(25 * (cm / 100) ** 2 * 10) / 10);
const floorKcal = (sex, bmr) => Math.max(Math.round(bmr * 1.1), sex === 'F' ? 1300 : 1600);

export function targets({ sex, kg, cm, age, goal, sessions, occupation, steps, adj = 0 }) {
  const bmr = mifflin({ sex, kg, cm, age });
  const pal = activity(sessions, occupation, steps);
  const tdee = Math.round(bmr * pal);
  // Superávit de 10% con tope de 350 kcal; déficit de 20% con tope de 750 kcal (para no bajar más de ~1% por semana).
  const g = GOAL_KCAL[goal] || 1, delta = g > 1 ? Math.min(tdee * (g - 1), 350) : g < 1 ? -Math.min(tdee * (1 - g), 750) : 0;
  let kcal = Math.round(tdee + delta + (Number(adj) || 0));
  const floor = floorKcal(sex, bmr), floored = kcal < floor;
  if (floored) kcal = floor;
  const pk = refKg(kg, cm), p = Math.round(pk * (PROTEIN[goal] || 1.6));
  const f = Math.max(Math.round(kg * 0.6), Math.round((kcal * 0.25) / 9));
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4));
  return { bmr, pal, tdee, kcal, p, f, c, floored, pk, cPerKg: Math.round((c / kg) * 10) / 10 };
}

// ---------- de macros a porciones SMAE ----------
const half = (x) => Math.max(0, Math.round(x * 2) / 2);
export function dailyEq(t, diet = {}) {
  const e = {};
  e.ver = t.kcal < 1800 ? 4 : 5;
  e.fru = t.kcal < 1800 ? 2 : t.kcal < 2600 ? 3 : 4;
  const milk = diet.noDairy ? null : t.kcal < 2000 ? 'lec1' : 'lec2';
  if (milk) e[milk] = t.kcal >= 2800 ? 2 : 1;
  e.leg = diet.veg ? 2 : 1;
  e.azu = t.kcal >= 3000 ? 1 : 0;
  // Carbohidratos que faltan → cereales.
  let m = macrosOf(e);
  e.cer = half(Math.max(2, (t.c - m.c) / 15));
  // Proteína que falta → origen animal (6 de cada 10 muy bajo en grasa, el resto moderado: huevo, queso fresco).
  m = macrosOf(e);
  const aoa = half(Math.max(0, (t.p - m.p) / 7));
  e.aoa1 = half(aoa * 0.6); e.aoa3 = half(aoa - e.aoa1);
  // Grasa que falta → aceites y semillas (1 de semillas si caben 3 o más).
  m = macrosOf(e);
  let g = half(Math.max(0, (t.f - m.f) / 5));
  if (g >= 3) { e.grap = 1; g = half(g - 1); }
  e.gra = g;
  // Ajuste fino de calorías con cereales (±1).
  m = macrosOf(e);
  const diff = t.kcal - m.kcal;
  if (Math.abs(diff) > 70) e.cer = half(Math.max(2, e.cer + diff / 70));
  for (const k of Object.keys(e)) if (!e[k]) delete e[k];
  return e;
}
export const groupTotals = (eq) => Object.fromEntries(GROUPS.map(([g, , subs]) => [g, subs.reduce((a, s) => a + (eq[s] || 0), 0)]).filter(([, n]) => n > 0));

// ---------- repartir en comidas ----------
export const MEAL_SETS = {
  3: [['des', 'Desayuno'], ['com', 'Comida'], ['cen', 'Cena']],
  4: [['des', 'Desayuno'], ['col1', 'Colación'], ['com', 'Comida'], ['cen', 'Cena']],
  5: [['des', 'Desayuno'], ['col1', 'Colación'], ['com', 'Comida'], ['col2', 'Colación de la tarde'], ['cen', 'Cena']],
};
// Peso de cada grupo en cada tipo de comida (la leche y la fruta van más en desayuno y colaciones; las leguminosas en la comida).
const W = {
  des: { ver: 1, fru: 2, cer: 2.5, leg: 1, aoa: 2.5, lec: 2, gra: 1.5, azu: 1 },
  col1: { ver: 0.5, fru: 2, cer: 1, leg: 0, aoa: 1, lec: 1.5, gra: 1, azu: 1 },
  com: { ver: 3, fru: 1, cer: 3.5, leg: 3, aoa: 3.5, lec: 0, gra: 2, azu: 0 },
  col2: { ver: 0.5, fru: 2, cer: 1, leg: 0, aoa: 1, lec: 1.5, gra: 1, azu: 1 },
  cen: { ver: 2, fru: 1, cer: 2, leg: 1, aoa: 2.5, lec: 1, gra: 1.5, azu: 0 },
};
export function mealPlan(eq, n = 3) {
  const meals = MEAL_SETS[n] || MEAL_SETS[3];
  const tot = groupTotals(eq);
  const out = meals.map(([k, name]) => ({ key: k, name, g: {} }));
  for (const [g, total] of Object.entries(tot)) {
    const ws = meals.map(([k]) => W[k][g] || 0), sw = ws.reduce((a, b) => a + b, 0) || 1;
    const raw = ws.map((w) => (total * w) / sw);
    const r = raw.map(half);
    let left = Math.round((total - r.reduce((a, b) => a + b, 0)) * 2) / 2;
    const order = raw.map((x, i) => [x - r[i], i]).sort((a, b) => (left > 0 ? b[0] - a[0] : a[0] - b[0]));
    for (let j = 0; Math.abs(left) >= 0.5 && j < 20; j++) { const i = order[j % order.length][1]; if (left < 0 && r[i] < 0.5) continue; r[i] += left > 0 ? 0.5 : -0.5; left += left > 0 ? -0.5 : 0.5; }
    r.forEach((x, i) => { if (x > 0) out[i].g[g] = x; });
  }
  return out;
}
// Cada grupo del plan con su mezcla de subgrupos (para convertir lo palomeado en macros).
export function groupMix(eq) {
  const mix = {};
  for (const [g, , subs] of GROUPS) {
    const tot = subs.reduce((a, s) => a + (eq[s] || 0), 0);
    mix[g] = tot ? Object.fromEntries(subs.filter((s) => eq[s]).map((s) => [s, eq[s] / tot])) : { [subs[0]]: 1 };
  }
  return mix;
}
export const checksToEq = (checks, mix) => {
  const e = {};
  for (const m of Object.values(checks || {})) for (const [g, n] of Object.entries(m || {})) for (const [s, w] of Object.entries(mix[g] || {})) e[s] = (e[s] || 0) + n * w;
  return e;
};

// ---------- ajuste semanal con el peso real ----------
// Si el promedio semanal no va al ritmo del objetivo dos semanas seguidas, sugiere ±150 kcal.
export function weeklySuggestion(goal, rates) {
  if (!rates || rates.length < 2) return null;
  const [a, b] = rates.slice(-2).map((r) => r.pct);
  const both = (fn) => fn(a) && fn(b);
  if (goal === 'grasa') { if (both((x) => x > -0.25)) return { kcal: -150, why: 'Llevas 2 semanas bajando menos de 0.25% por semana.' }; if (both((x) => x < -1.2)) return { kcal: 150, why: 'Llevas 2 semanas bajando más de 1% por semana: arriesgas músculo y rendimiento.' }; }
  if (goal === 'musculo') { if (both((x) => x < 0.05)) return { kcal: 150, why: 'Llevas 2 semanas sin subir de peso.' }; if (both((x) => x > 0.6)) return { kcal: -150, why: 'Llevas 2 semanas subiendo más de 0.5% por semana: puede ser más grasa que músculo.' }; }
  if (goal === 'salud' || goal === 'fuerza') { if (both((x) => x < -0.5)) return { kcal: 150, why: 'Llevas 2 semanas bajando de peso sin buscarlo.' }; if (both((x) => x > 0.5)) return { kcal: -150, why: 'Llevas 2 semanas subiendo de peso sin buscarlo.' }; }
  return null;
}

// ---------- antes y después de entrenar ----------
export const TIMING = [
  ['3 a 4 horas antes', 'Una comida normal con cereal (arroz, tortilla, pasta), proteína magra y poca grasa y fibra. Ejemplo: arroz con pollo y verduras.'],
  ['1 a 2 horas antes', 'Algo ligero con carbohidrato: plátano con crema de cacahuate, pan con miel o avena. Evita mucha grasa, fibra o picante.'],
  ['30 a 60 minutos antes', 'Solo si tienes hambre: fruta o pan. Agua.'],
  ['Después', 'En las siguientes 1 o 2 horas: 20 a 40 g de proteína (más o menos 0.25 g por kilo) con carbohidrato. Ejemplo: licuado de leche con plátano y avena, o bowl de pollo, arroz y frijoles.'],
  ['Partido o torneo', 'Desayuno o comida normal 3 a 4 horas antes; entre partidos, fruta, pan o galletas y agua. Nada nuevo el día del torneo.'],
];
export const TIMING_NOTE = 'Antes de entrenar, 1 a 4 g de carbohidrato por kilo en las 1 a 4 horas previas (ACSM, Academia de Nutrición y Dietética y Dietistas de Canadá, 2016). La proteína repartida en 3 a 5 tomas al día, cada 3 a 4 horas, de 0.25 g por kilo cada una (ISSN, 2017).';

// ---------- suplementos (solo los que tienen evidencia) ----------
export const SUPPS = [
  { id: 'creatina', name: 'Creatina monohidratada', what: 'Más fuerza y potencia en esfuerzos cortos y repetidos (saltos, sprints, pesas) y algo más de masa muscular con el entrenamiento.',
    dose: ['3 a 5 g al día, todos los días, a la hora que quieras (con comida está bien).', 'No hace falta «cargar». Si quieres el efecto más rápido: 0.3 g por kilo al día por 5 a 7 días repartidos en 4 tomas, y luego 3 a 5 g.'],
    warn: ['Sube 1 a 2 kg de peso en las primeras semanas: es agua dentro del músculo, no grasa.', 'Elige creatina monohidratada; las otras formas no han demostrado ser mejores y cuestan más.', 'Si tienes una enfermedad de los riñones, no la tomes sin tu médico.'],
    src: ['ISSN 2017: seguridad y eficacia de la creatina', 'https://doi.org/10.1186/s12970-017-0173-z'] },
  { id: 'proteina', name: 'Proteína en polvo (suero de leche o vegetal)', what: 'No hace nada que no haga la comida: solo es una forma práctica de completar tu proteína del día cuando no alcanzas con comida.',
    dose: ['Úsala solo si te faltan más de 20 g de proteína en el día.', '1 medida (20 a 30 g de proteína) después de entrenar o en una colación.'],
    warn: ['Si no toleras la leche, busca una proteína aislada de suero o una vegetal.', 'Primero la comida: huevo, pollo, atún, frijoles, leche, yogur.'],
    src: ['ISSN 2017: proteína y ejercicio', 'https://doi.org/10.1186/s12970-017-0177-8'] },
  { id: 'cafeina', name: 'Cafeína (café)', what: 'Mejora un poco la fuerza, la velocidad, el salto y el aguante, y el estado de alerta.',
    dose: ['3 a 6 mg por kilo de peso unos 60 minutos antes. Una taza de café de olla o americano tiene unos 80 a 120 mg.', 'Empieza con la dosis baja: con 2 a 3 mg por kilo muchos ya notan el efecto.'],
    warn: ['No la tomes en la tarde-noche: el sueño importa más que la cafeína.', 'No pases de unos 400 mg al día en total. Más de 9 mg por kilo da efectos secundarios y no ayuda más.', 'No la uses si tienes presión alta, arritmias, ansiedad o embarazo, sin consultar a tu médico.'],
    src: ['ISSN 2021: cafeína y rendimiento', 'https://doi.org/10.1186/s12970-020-00383-4'] },
];
export const SUPP_NOTE = 'Los suplementos en México se venden con poca vigilancia. Si compras uno, busca marcas con certificación independiente (por ejemplo NSF Certified for Sport o Informed Sport) y desconfía de las que prometen resultados rápidos.';
export const SAFETY = 'Si contar comida o calorías te genera ansiedad o culpa, usa solo las porciones sin ver los números, y si te pasa seguido, habla con un profesional. Este plan no es para personas con diabetes, enfermedad de los riñones, embarazo u otra condición médica: eso lo debe ver un nutriólogo.';

export const NUTRI_SOURCES = [
  ['Sistema Mexicano de Alimentos Equivalentes, 4.ª ed. (Pérez Lizaur y cols.): aporte de cada grupo (tabla de la Facultad de Medicina, UNAM)', 'https://fisiologia.facmed.unam.mx/wp-content/uploads/2019/02/2-Valoraci%C3%B3n-nutricional-Anexos.pdf'],
  ['IMSS: tabla de grupos de alimentos y cantidad por ración', 'https://www.imss.gob.mx/sites/all/statics/salud/guias_salud/alimentacion-saludable-2019.pdf'],
  ['Mifflin y cols. (1990): ecuación del gasto en reposo', 'https://doi.org/10.1093/ajcn/51.2.241'],
  ['Frankenfield y cols. (2005): Mifflin-St Jeor, la más precisa (±10%)', 'https://doi.org/10.1016/j.jada.2005.02.005'],
  ['ISSN (2017): proteína y ejercicio (1.4 a 2.0 g/kg; 0.25 g/kg por toma)', 'https://doi.org/10.1186/s12970-017-0177-8'],
  ['Thomas, Erdman y Burke (2016): nutrición y rendimiento (carbohidratos según el entrenamiento; 1 a 4 g/kg antes)', 'https://doi.org/10.1249/MSS.0000000000000852'],
  ['Helms y cols. (2014): bajar 0.5 a 1% del peso por semana; grasa 15 a 30% de las calorías', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4033492/'],
  ['ISSN (2017): creatina', 'https://doi.org/10.1186/s12970-017-0173-z'],
  ['ISSN (2021): cafeína', 'https://doi.org/10.1186/s12970-020-00383-4'],
  ['Guías Alimentarias Saludables y Sostenibles para la Población Mexicana (2023)', 'https://www.gob.mx/cms/uploads/attachment/file/863929/Infografi_a_Gui_as_Alimentarias_Poblacio_n_16Oct23.pdf'],
];
