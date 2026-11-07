// Remate Fit · Recetas (v3.12; v3.19: 47). Recetas mexicanas, económicas, rápidas o para preparar varias porciones.
// Cada una trae sus porciones del SMAE por ración (de ahí salen calorías y macros) y sus ingredientes para la lista del súper.
// Las cantidades de carne son en crudo en los ingredientes; las porciones del SMAE, en cocido.
import { macrosOf } from './nutricion.js';

// Tipos de comida: des desayuno · com comida · cen cena · col colación · pre antes de entrenar · post después de entrenar.
export const MEAL_TAGS = { des: 'Desayuno', com: 'Comida', cen: 'Cena', col: 'Colación', pre: 'Antes de entrenar', post: 'Después de entrenar' };
export const DIET_TAGS = { veg: 'Vegetariana', sl: 'Sin lácteos', sg: 'Sin gluten' };
export const SHOP_CATS = ['Frutas y verduras', 'Carne, pollo y pescado', 'Lácteos y huevo', 'Tortillas y pan', 'Abarrotes'];
const FV = 0, CA = 1, LH = 2, TP = 3, AB = 4;

// [cantidad total de la receta, unidad, ingrediente, categoría]. Cantidad null = al gusto.
const R = [
  // ---------- desayunos ----------
  { id: 'huevos-mexicana', name: 'Huevos a la mexicana con frijoles', meals: ['des', 'cen'], diet: ['veg', 'sl', 'sg'], min: 10, serv: 1, eco: true,
    ing: [[2, 'pz', 'Huevo', LH], [1, 'pz', 'Jitomate', FV], [0.25, 'pz', 'Cebolla', FV], [1, 'pz', 'Chile serrano', FV], [1, 'cdta', 'Aceite', AB], [0.5, 'taza', 'Frijoles cocidos', AB], [2, 'pz', 'Tortillas de maíz', TP]],
    steps: ['Pica el jitomate, la cebolla y el chile.', 'Sofríe la verdura 2 minutos en el aceite.', 'Agrega los huevos batidos con una pizca de sal y mueve hasta que cuajen.', 'Sirve con los frijoles calientes y las tortillas.'],
    eq: { aoa3: 2, ver: 1, gra: 1, leg: 1, cer: 2 } },
  { id: 'avena-cocida', name: 'Avena con leche, plátano y crema de cacahuate', meals: ['des', 'pre'], diet: ['veg'], min: 10, serv: 1, eco: true,
    ing: [[0.67, 'taza', 'Avena en hojuelas', AB], [1, 'taza', 'Leche descremada', LH], [0.5, 'pz', 'Plátano', FV], [1.5, 'cdta', 'Crema de cacahuate', AB], [null, '', 'Canela', AB]],
    steps: ['Calienta la leche con la canela.', 'Agrega la avena y cocina 3 a 5 minutos, moviendo.', 'Sirve con el plátano en rodajas y la crema de cacahuate.'],
    eq: { cer: 2, lec1: 1, fru: 1, grap: 1 }, tip: 'Antes de entrenar, cómela 1 a 2 horas antes. Sin lácteos: con bebida de soya sin azúcar.' },
  { id: 'avena-nocturna', name: 'Avena nocturna con yogur griego y fresas', meals: ['des', 'col'], diet: ['veg'], min: 10, serv: 4, prep: true,
    ing: [[2.67, 'taza', 'Avena en hojuelas', AB], [3, 'taza', 'Yogur griego natural sin azúcar', LH], [1, 'taza', 'Leche descremada', LH], [4, 'taza', 'Fresas', FV], [4, 'cda', 'Chía', AB], [null, '', 'Canela', AB]],
    steps: ['En 4 frascos reparte la avena, el yogur, la leche, la chía y la canela; revuelve.', 'Tapa y deja en el refrigerador toda la noche.', 'En la mañana agrega las fresas picadas.', 'Duran 4 días en el refrigerador.'],
    eq: { cer: 2, lec1: 1, aoa1: 1, fru: 1, grap: 1 } },
  { id: 'chilaquiles-horneados', name: 'Chilaquiles verdes horneados con pollo', meals: ['des', 'com'], diet: ['sg'], min: 25, serv: 2,
    ing: [[6, 'pz', 'Tortillas de maíz', TP], [6, 'pz', 'Tomate verde', FV], [2, 'pz', 'Chile serrano', FV], [0.5, 'pz', 'Cebolla', FV], [1, 'diente', 'Ajo', FV], [200, 'g', 'Pechuga de pollo', CA], [80, 'g', 'Queso fresco', LH], [2, 'cda', 'Crema', LH]],
    steps: ['Corta las tortillas en triángulos y hornéalas (o en freidora de aire) hasta que estén crujientes, sin aceite.', 'Cuece la pechuga en agua con sal y deshébrala.', 'Hierve los tomates y chiles, y lícualos con cebolla, ajo y sal.', 'Calienta la salsa, agrega los totopos y el pollo, y sirve con queso y crema.'],
    eq: { cer: 3, ver: 1, aoa1: 2, aoa3: 1, gra: 1 } },
  { id: 'molletes', name: 'Molletes con frijoles, panela y pico de gallo', meals: ['des', 'cen'], diet: ['veg'], min: 15, serv: 1, eco: true,
    ing: [[1, 'pz', 'Bolillo', TP], [0.5, 'taza', 'Frijoles cocidos', AB], [40, 'g', 'Queso panela', LH], [1, 'pz', 'Jitomate', FV], [0.25, 'pz', 'Cebolla', FV], [null, '', 'Cilantro', FV]],
    steps: ['Abre el bolillo, quítale el migajón y tuéstalo.', 'Machaca los frijoles y úntalos; pon encima el queso rallado.', 'Gratina en el horno o en un comal tapado.', 'Sirve con pico de gallo (jitomate, cebolla y cilantro picados con limón).'],
    eq: { cer: 2, leg: 1, aoa2: 1, ver: 1 } },
  { id: 'omelette-claras', name: 'Omelette de claras con espinaca y champiñones', meals: ['des', 'cen'], diet: ['veg', 'sl', 'sg'], min: 10, serv: 1,
    ing: [[1, 'pz', 'Huevo', LH], [4, 'pz', 'Claras de huevo', LH], [1, 'taza', 'Espinaca', FV], [0.5, 'taza', 'Champiñones', FV], [1, 'cdta', 'Aceite', AB], [2, 'pz', 'Tortillas de maíz', TP]],
    steps: ['Saltea los champiñones y la espinaca en el aceite.', 'Bate el huevo con las claras y sal, y viértelo encima.', 'Tapa a fuego bajo hasta que cuaje y dobla.', 'Sirve con las tortillas y salsa.'],
    eq: { aoa3: 1, aoa1: 2, ver: 1, gra: 1, cer: 2 } },
  { id: 'hotcakes-avena', name: 'Hot cakes de avena y plátano', meals: ['des', 'pre'], diet: ['veg'], min: 20, serv: 2,
    ing: [[1, 'taza', 'Avena en hojuelas', AB], [2, 'pz', 'Plátano', FV], [2, 'pz', 'Huevo', LH], [2, 'pz', 'Claras de huevo', LH], [0.5, 'taza', 'Leche descremada', LH], [2, 'cdta', 'Miel', AB], [null, '', 'Canela', AB]],
    steps: ['Licúa la avena, los plátanos, los huevos, las claras, la leche y la canela.', 'Deja reposar 5 minutos.', 'Cocina en sartén antiadherente a fuego medio, 2 minutos por lado.', 'Sirve con la miel.'],
    eq: { cer: 1.5, fru: 2, aoa3: 1, aoa1: 0.5, lec1: 0.5, azu: 0.5 } },
  { id: 'parfait', name: 'Yogur griego con amaranto, papaya y almendras', meals: ['des', 'col', 'post'], diet: ['veg', 'sg'], min: 5, serv: 1,
    ing: [[0.75, 'taza', 'Yogur griego natural sin azúcar', LH], [0.25, 'taza', 'Amaranto', AB], [1, 'taza', 'Papaya', FV], [10, 'pz', 'Almendras', AB]],
    steps: ['En un vaso pon el yogur, la papaya picada, el amaranto y las almendras.'],
    eq: { lec1: 1, aoa1: 1, cer: 1, fru: 1, grap: 1 } },
  { id: 'tacos-huevo-papa', name: 'Tacos de huevo con papa', meals: ['des'], diet: ['veg', 'sl', 'sg'], min: 20, serv: 2, eco: true,
    ing: [[4, 'pz', 'Huevo', LH], [1, 'pz', 'Papa', FV], [4, 'pz', 'Tortillas de maíz', TP], [2, 'cdta', 'Aceite', AB], [null, '', 'Salsa', AB]],
    steps: ['Cuece la papa en cubos pequeños, 8 minutos.', 'Dórala en el aceite y agrega los huevos batidos con sal.', 'Mueve hasta que cuajen.', 'Sirve en las tortillas con salsa.'],
    eq: { aoa3: 2, cer: 3, gra: 1, ver: 0.5 } },
  { id: 'burritos-desayuno', name: 'Burritos de desayuno para congelar', meals: ['des'], diet: ['veg', 'sl'], min: 25, serv: 4, prep: true,
    ing: [[4, 'pz', 'Tortillas de harina grandes', TP], [6, 'pz', 'Huevo', LH], [6, 'pz', 'Claras de huevo', LH], [1, 'taza', 'Frijoles cocidos', AB], [2, 'pz', 'Jitomate', FV], [0.5, 'pz', 'Cebolla', FV], [1, 'pz', 'Chile serrano', FV]],
    steps: ['Haz los huevos revueltos con las claras y el jitomate, cebolla y chile picados.', 'Unta frijoles en cada tortilla, agrega el huevo y enrolla.', 'Envuelve cada burrito en papel aluminio y congela.', 'Para comer: 2 minutos en el microondas sin aluminio, o 10 en comal tapado.'],
    eq: { cerg: 2, aoa3: 1.5, aoa1: 1, leg: 0.5, ver: 0.5 }, tip: 'Duran 2 meses en el congelador.' },
  // ---------- comidas y cenas ----------
  { id: 'bowl-pollo', name: 'Bowl de pollo, arroz, frijoles y pico de gallo', meals: ['com', 'post'], diet: ['sl', 'sg'], min: 40, serv: 4, prep: true, eco: true,
    ing: [[650, 'g', 'Pechuga de pollo', CA], [1.33, 'taza', 'Arroz', AB], [2, 'taza', 'Frijoles cocidos', AB], [3, 'pz', 'Jitomate', FV], [0.5, 'pz', 'Cebolla', FV], [null, '', 'Cilantro', FV], [2, 'pz', 'Limón', FV], [1.33, 'pz', 'Aguacate', FV], [2, 'cdta', 'Aceite', AB]],
    steps: ['Cocina el arroz.', 'Sazona la pechuga con sal, ajo y limón; ásala en el aceite y córtala en tiras.', 'Haz el pico de gallo.', 'Reparte en 4 recipientes: arroz, frijoles, pollo y pico. El aguacate, al servir.'],
    eq: { aoa1: 4, cer: 4, leg: 1, ver: 1, gra: 1.5 }, tip: 'Duran 4 días en el refrigerador.' },
  { id: 'tinga-pollo', name: 'Tinga de pollo en tostadas', meals: ['com', 'cen'], diet: ['sl', 'sg'], min: 35, serv: 4, prep: true, eco: true,
    ing: [[550, 'g', 'Pechuga de pollo', CA], [3, 'pz', 'Jitomate', FV], [1, 'pz', 'Cebolla', FV], [2, 'pz', 'Chile chipotle adobado', AB], [1, 'cda', 'Aceite', AB], [12, 'pz', 'Tostadas horneadas', TP], [2, 'taza', 'Lechuga', FV]],
    steps: ['Cuece la pechuga y deshébrala.', 'Licúa el jitomate con los chipotles.', 'Acitrona la cebolla en rebanadas, agrega la salsa y el pollo; cocina 10 minutos.', 'Sirve sobre tostadas con lechuga.'],
    eq: { aoa1: 3, ver: 1.5, gra: 1, cer: 3 } },
  { id: 'picadillo', name: 'Picadillo de res con verduras', meals: ['com'], diet: ['sl', 'sg'], min: 35, serv: 4, prep: true,
    ing: [[500, 'g', 'Carne molida de res (90/10)', CA], [2, 'pz', 'Papa', FV], [2, 'pz', 'Zanahoria', FV], [1, 'pz', 'Calabacita', FV], [2, 'pz', 'Jitomate', FV], [0.5, 'pz', 'Cebolla', FV], [2, 'cdta', 'Aceite', AB], [8, 'pz', 'Tortillas de maíz', TP]],
    steps: ['Dora la carne con la cebolla en el aceite.', 'Agrega papa, zanahoria y calabacita en cubos chicos.', 'Añade el jitomate licuado con sal y cocina tapado 15 minutos.', 'Sirve con 2 tortillas.'],
    eq: { aoa2: 3, cer: 3, ver: 1.5, gra: 0.5 } },
  { id: 'caldo-pollo', name: 'Caldo de pollo con verduras y arroz', meals: ['com', 'cen'], diet: ['sl', 'sg'], min: 60, serv: 4, prep: true, eco: true,
    ing: [[4, 'pz', 'Pierna o muslo de pollo sin piel', CA], [0.67, 'taza', 'Arroz', AB], [2, 'pz', 'Zanahoria', FV], [2, 'pz', 'Calabacita', FV], [1, 'pz', 'Chayote', FV], [1, 'taza', 'Ejotes', FV], [0.5, 'pz', 'Cebolla', FV], [2, 'diente', 'Ajo', FV], [4, 'pz', 'Tortillas de maíz', TP]],
    steps: ['Hierve el pollo con cebolla, ajo y sal, 30 minutos. Quita la espuma.', 'Agrega zanahoria y chayote; a los 10 minutos, calabacita y ejotes.', 'Cocina el arroz aparte y agrégalo al servir.', 'Sirve con limón, chile y 1 tortilla.'],
    eq: { aoa2: 3, cer: 3, ver: 2 } },
  { id: 'pescado-veracruzana', name: 'Pescado a la veracruzana con arroz', meals: ['com', 'cen'], diet: ['sl', 'sg'], min: 30, serv: 2,
    ing: [[300, 'g', 'Filete de pescado blanco (tilapia o basa)', CA], [3, 'pz', 'Jitomate', FV], [0.5, 'pz', 'Cebolla', FV], [10, 'pz', 'Aceitunas', AB], [2, 'pz', 'Chile güero', FV], [2, 'cdta', 'Aceite de oliva', AB], [0.33, 'taza', 'Arroz', AB]],
    steps: ['Cocina el arroz.', 'Sofríe la cebolla, agrega el jitomate picado, las aceitunas y los chiles; cocina 8 minutos.', 'Pon los filetes encima, tapa y cocina 8 a 10 minutos.', 'Sirve con el arroz.'],
    eq: { aoa1: 4, ver: 1.5, gra: 2, cer: 2 } },
  { id: 'tacos-pescado', name: 'Tacos de pescado a la plancha con col', meals: ['com', 'cen'], diet: ['sl', 'sg'], min: 20, serv: 2,
    ing: [[300, 'g', 'Filete de pescado blanco (tilapia o basa)', CA], [6, 'pz', 'Tortillas de maíz', TP], [2, 'taza', 'Col morada', FV], [1, 'pz', 'Jitomate', FV], [2, 'pz', 'Limón', FV], [0.67, 'pz', 'Aguacate', FV]],
    steps: ['Sazona el pescado con sal, ajo, chile en polvo y limón.', 'Ásalo en sartén antiadherente, 3 minutos por lado, y desmenúzalo.', 'Sirve en tortillas con col, jitomate y aguacate.'],
    eq: { aoa1: 4, cer: 3, ver: 1, gra: 1 } },
  { id: 'enfrijoladas', name: 'Enfrijoladas con huevo', meals: ['com', 'cen'], diet: ['veg', 'sg'], min: 25, serv: 2, eco: true,
    ing: [[1.5, 'taza', 'Frijoles cocidos', AB], [6, 'pz', 'Tortillas de maíz', TP], [2, 'pz', 'Huevo', LH], [60, 'g', 'Queso fresco', LH], [0.5, 'pz', 'Cebolla', FV], [2, 'cda', 'Crema', LH], [2, 'taza', 'Lechuga', FV]],
    steps: ['Licúa los frijoles con su caldo hasta que quede una salsa espesa; caliéntala.', 'Calienta las tortillas, pásalas por la salsa y dóblalas.', 'Sirve con huevo estrellado (sin aceite) o cocido encima, queso, cebolla y crema.', 'Acompaña con ensalada de lechuga.'],
    eq: { leg: 1.5, cer: 3, aoa3: 2, gra: 1, ver: 1 } },
  { id: 'lentejas', name: 'Sopa de lentejas con verduras', meals: ['com', 'cen'], diet: ['veg', 'sl', 'sg'], min: 45, serv: 4, prep: true, eco: true,
    ing: [[1.5, 'taza', 'Lentejas', AB], [2, 'pz', 'Zanahoria', FV], [2, 'pz', 'Jitomate', FV], [1, 'pz', 'Calabacita', FV], [0.5, 'pz', 'Cebolla', FV], [2, 'diente', 'Ajo', FV], [4, 'cdta', 'Aceite', AB], [8, 'pz', 'Tortillas de maíz', TP]],
    steps: ['Lava las lentejas (no hace falta remojarlas).', 'Sofríe cebolla, ajo y jitomate picados en el aceite.', 'Agrega lentejas, zanahoria y 6 tazas de agua; cocina 25 minutos.', 'Añade la calabacita y sal, 10 minutos más. Sirve con 2 tortillas.'],
    eq: { leg: 2, ver: 1.5, gra: 1, cer: 2 }, tip: 'Exprime limón al servir: ayuda a absorber el hierro de las lentejas.' },
  { id: 'tacos-nopales', name: 'Tacos de nopales, frijoles y panela', meals: ['com', 'cen'], diet: ['veg', 'sg'], min: 20, serv: 2, eco: true,
    ing: [[2, 'taza', 'Nopales', FV], [1, 'taza', 'Frijoles cocidos', AB], [80, 'g', 'Queso panela', LH], [6, 'pz', 'Tortillas de maíz', TP], [1, 'cdta', 'Aceite', AB], [null, '', 'Salsa', AB]],
    steps: ['Asa los nopales en tiras con el aceite y sal hasta que suelten y sequen su baba.', 'Asa el queso panela en rebanadas.', 'Arma los tacos con frijoles, nopales y panela; agrega salsa.'],
    eq: { ver: 1, leg: 1, aoa2: 1, cer: 3, gra: 0.5 } },
  { id: 'pasta-atun', name: 'Pasta integral con atún, jitomate y espinaca', meals: ['com', 'post'], diet: ['sl'], min: 20, serv: 2, eco: true,
    ing: [[140, 'g', 'Pasta integral', AB], [2, 'lata', 'Atún en agua', AB], [3, 'pz', 'Jitomate', FV], [2, 'taza', 'Espinaca', FV], [2, 'diente', 'Ajo', FV], [2, 'cdta', 'Aceite de oliva', AB]],
    steps: ['Cuece la pasta.', 'Sofríe el ajo en el aceite, agrega el jitomate picado y cocina 5 minutos.', 'Agrega el atún escurrido y la espinaca hasta que se marchite.', 'Revuelve con la pasta y sazona.'],
    eq: { cer: 3, aoa1: 4, ver: 1.5, gra: 1 } },
  { id: 'albondigas-pavo', name: 'Albóndigas de pavo en caldillo de jitomate', meals: ['com'], diet: ['sl', 'sg'], min: 45, serv: 4, prep: true,
    ing: [[500, 'g', 'Pavo molido', CA], [0.25, 'taza', 'Arroz', AB], [1, 'pz', 'Huevo', LH], [4, 'pz', 'Jitomate', FV], [2, 'pz', 'Calabacita', FV], [2, 'pz', 'Zanahoria', FV], [0.5, 'pz', 'Cebolla', FV], [2, 'cdta', 'Aceite', AB], [8, 'pz', 'Tortillas de maíz', TP]],
    steps: ['Mezcla el pavo con el arroz crudo, el huevo, sal y hierbabuena; haz bolitas.', 'Licúa el jitomate con cebolla y sofríe la salsa en el aceite; agrega 3 tazas de agua.', 'Cuando hierva, agrega las albóndigas y la verdura en cubos; cocina tapado 25 minutos.', 'Sirve con 2 tortillas.'],
    eq: { aoa2: 3, ver: 1.5, cer: 2.5, gra: 0.5 } },
  { id: 'pollo-adobado', name: 'Pollo adobado al horno con papas y brócoli', meals: ['com'], diet: ['sl', 'sg'], min: 50, serv: 4, prep: true,
    ing: [[800, 'g', 'Pierna o muslo de pollo sin piel', CA], [3, 'pz', 'Chile guajillo', AB], [1, 'pz', 'Chile ancho', AB], [2, 'diente', 'Ajo', FV], [4, 'pz', 'Papa', FV], [4, 'taza', 'Brócoli', FV], [4, 'cdta', 'Aceite', AB]],
    steps: ['Hidrata los chiles en agua caliente y lícualos con ajo, vinagre, comino y sal.', 'Unta el pollo con el adobo y deja reposar 15 minutos (o toda la noche).', 'Hornea a 200 °C con las papas en gajos y el aceite, 35 a 40 minutos.', 'Agrega el brócoli los últimos 10 minutos.'],
    eq: { aoa2: 4, cer: 2, ver: 2.5, gra: 1 } },
  { id: 'fajitas-res', name: 'Fajitas de res con pimientos', meals: ['com', 'cen'], diet: ['sl', 'sg'], min: 20, serv: 2,
    ing: [[260, 'g', 'Bistec de res', CA], [2, 'pz', 'Pimiento', FV], [1, 'pz', 'Cebolla', FV], [2, 'cdta', 'Aceite', AB], [4, 'pz', 'Tortillas de maíz', TP], [0.67, 'pz', 'Aguacate', FV], [1, 'pz', 'Limón', FV]],
    steps: ['Corta el bistec, los pimientos y la cebolla en tiras.', 'Saltea la carne a fuego alto en el aceite, 3 minutos; sácala.', 'Saltea la verdura, regresa la carne y sazona con limón, sal y pimienta.', 'Sirve con tortillas y aguacate.'],
    eq: { aoa2: 3, ver: 2, gra: 2, cer: 2 } },
  { id: 'ensalada-garbanzo', name: 'Ensalada de garbanzo con huevo', meals: ['com', 'cen'], diet: ['veg', 'sl', 'sg'], min: 15, serv: 2, eco: true,
    ing: [[1.5, 'taza', 'Garbanzos cocidos', AB], [1, 'pz', 'Pepino', FV], [2, 'pz', 'Jitomate', FV], [0.5, 'pz', 'Cebolla morada', FV], [null, '', 'Cilantro', FV], [2, 'pz', 'Huevo', LH], [2, 'cdta', 'Aceite de oliva', AB], [2, 'pz', 'Limón', FV], [4, 'pz', 'Tostadas horneadas', TP]],
    steps: ['Cuece los huevos 10 minutos y pícalos.', 'Pica pepino, jitomate, cebolla y cilantro.', 'Mezcla con los garbanzos, aceite, limón, sal y pimienta.', 'Sirve con las tostadas.'],
    eq: { leg: 1.5, ver: 1.5, aoa3: 1, gra: 1, cer: 2 } },
  { id: 'soya-mexicana', name: 'Tacos de soya a la mexicana', meals: ['com', 'cen'], diet: ['veg', 'sl', 'sg'], min: 25, serv: 4, prep: true, eco: true,
    ing: [[1, 'taza', 'Soya texturizada', AB], [3, 'pz', 'Jitomate', FV], [0.5, 'pz', 'Cebolla', FV], [2, 'pz', 'Chile serrano', FV], [4, 'cdta', 'Aceite', AB], [12, 'pz', 'Tortillas de maíz', TP]],
    steps: ['Remoja la soya 10 minutos en agua caliente con sal y consomé; exprímela bien.', 'Sofríe cebolla, jitomate y chile picados en el aceite.', 'Agrega la soya y cocina 8 minutos.', 'Sirve en tacos con salsa y limón.'],
    eq: { leg: 1.5, ver: 1, gra: 1, cer: 3 } },
  { id: 'pechuga-rellena', name: 'Pechuga rellena de espinaca y panela', meals: ['com', 'cen'], diet: ['sg'], min: 30, serv: 2,
    ing: [[320, 'g', 'Pechuga de pollo', CA], [2, 'taza', 'Espinaca', FV], [60, 'g', 'Queso panela', LH], [2, 'cdta', 'Aceite', AB], [0.33, 'taza', 'Arroz', AB], [4, 'taza', 'Lechuga', FV]],
    steps: ['Abre las pechugas en libro y sazónalas.', 'Rellena con espinaca y panela; cierra con palillos.', 'Dóralas en el aceite y tapa a fuego bajo 15 minutos (que no quede rosa por dentro).', 'Sirve con arroz y ensalada.'],
    eq: { aoa1: 4, aoa2: 1, ver: 2, gra: 1, cer: 2 } },
  { id: 'calabacitas-pollo', name: 'Calabacitas a la mexicana con pollo y elote', meals: ['com', 'cen'], diet: ['sl', 'sg'], min: 25, serv: 3, eco: true,
    ing: [[400, 'g', 'Pechuga de pollo', CA], [3, 'pz', 'Calabacita', FV], [2, 'pz', 'Jitomate', FV], [0.5, 'pz', 'Cebolla', FV], [1, 'taza', 'Elote desgranado', FV], [3, 'cdta', 'Aceite', AB], [6, 'pz', 'Tortillas de maíz', TP]],
    steps: ['Dora la pechuga en cubos en el aceite; sácala.', 'Sofríe cebolla y jitomate, agrega calabacita y elote.', 'Regresa el pollo, tapa y cocina 10 minutos.', 'Sirve con 2 tortillas.'],
    eq: { aoa1: 3, ver: 2, cer: 2.5, gra: 1 } },
  { id: 'sincronizadas', name: 'Sincronizadas de jamón de pavo y panela', meals: ['cen', 'col'], diet: ['sg'], min: 10, serv: 1,
    ing: [[2, 'pz', 'Tortillas de maíz', TP], [2, 'reb', 'Jamón de pavo', CA], [40, 'g', 'Queso panela', LH], [1, 'pz', 'Pepino', FV], [0.33, 'pz', 'Aguacate', FV]],
    steps: ['Arma la sincronizada con el jamón y el queso entre las tortillas.', 'Dórala en comal, 2 minutos por lado.', 'Sirve con pepino con limón y aguacate.'],
    eq: { cer: 2, aoa2: 2, ver: 1, gra: 1 } },
  { id: 'ceviche', name: 'Ceviche de pescado', meals: ['com', 'cen'], diet: ['sl', 'sg'], min: 25, serv: 3,
    ing: [[400, 'g', 'Filete de pescado blanco muy fresco', CA], [10, 'pz', 'Limón', FV], [2, 'pz', 'Jitomate', FV], [1, 'pz', 'Pepino', FV], [0.5, 'pz', 'Cebolla morada', FV], [null, '', 'Cilantro', FV], [1, 'pz', 'Chile serrano', FV], [1, 'pz', 'Aguacate', FV], [9, 'pz', 'Tostadas horneadas', TP]],
    steps: ['Corta el pescado en cubos chicos y cúbrelo con jugo de limón y sal; refrigera 30 minutos.', 'Pica jitomate, pepino, cebolla, cilantro y chile.', 'Escurre la mitad del limón y mezcla con la verdura.', 'Sirve con tostadas y aguacate.'],
    eq: { aoa1: 4, ver: 1.5, gra: 1, cer: 3 }, tip: 'El limón no mata todas las bacterias: compra pescado del día y de confianza. Si no estás seguro, cuécelo 3 minutos en agua antes.' },
  { id: 'pozole-pollo', name: 'Pozole rojo de pollo', meals: ['com'], diet: ['sl', 'sg'], min: 60, serv: 6, prep: true,
    ing: [[900, 'g', 'Maíz pozolero cocido', AB], [750, 'g', 'Pechuga de pollo', CA], [4, 'pz', 'Chile guajillo', AB], [2, 'pz', 'Chile ancho', AB], [3, 'diente', 'Ajo', FV], [1, 'pz', 'Cebolla', FV], [1, 'cda', 'Aceite', AB], [6, 'taza', 'Lechuga', FV], [1, 'manojo', 'Rábanos', FV], [12, 'pz', 'Tostadas horneadas', TP]],
    steps: ['Cuece la pechuga con ajo, cebolla y sal; deshébrala y guarda el caldo.', 'Licúa los chiles hidratados con ajo; fríe la salsa en el aceite y cuélala al caldo.', 'Agrega el maíz y el pollo; hierve 20 minutos.', 'Sirve con lechuga, rábano, orégano, limón y 2 tostadas.'],
    eq: { cer: 4, aoa1: 3, ver: 1.5, gra: 0.5 } },
  { id: 'chiles-rellenos', name: 'Chiles rellenos de panela al horno (sin capear)', meals: ['com', 'cen'], diet: ['veg', 'sg'], min: 40, serv: 2,
    ing: [[4, 'pz', 'Chile poblano', FV], [160, 'g', 'Queso panela', LH], [3, 'pz', 'Jitomate', FV], [0.5, 'pz', 'Cebolla', FV], [2, 'cdta', 'Aceite', AB], [0.33, 'taza', 'Arroz', AB]],
    steps: ['Asa los chiles, déjalos sudar en una bolsa 10 minutos, pélalos y desvénalos.', 'Rellénalos con panela.', 'Licúa jitomate y cebolla, y cocina el caldillo con el aceite.', 'Hornea los chiles con el caldillo a 180 °C, 15 minutos. Sirve con arroz.'],
    eq: { ver: 2.5, aoa2: 2, gra: 1, cer: 2 } },
  { id: 'salpicon', name: 'Salpicón de res', meals: ['com', 'cen'], diet: ['sl', 'sg'], min: 90, serv: 4, prep: true,
    ing: [[600, 'g', 'Falda de res', CA], [4, 'taza', 'Lechuga', FV], [3, 'pz', 'Jitomate', FV], [1, 'pz', 'Cebolla morada', FV], [1, 'manojo', 'Rábanos', FV], [4, 'cdta', 'Aceite de oliva', AB], [3, 'pz', 'Limón', FV], [12, 'pz', 'Tostadas horneadas', TP]],
    steps: ['Cuece la falda con ajo, cebolla y sal 1 hora (o 30 minutos en olla exprés); deshébrala.', 'Pica la verdura.', 'Mezcla la carne fría con la verdura, aceite, limón, vinagre, orégano y sal.', 'Sirve en tostadas. Dura 3 días en el refrigerador.'],
    eq: { aoa2: 3, ver: 1.5, gra: 1, cer: 3 } },
  // ---------- colaciones, antes y después de entrenar ----------
  { id: 'jicama-panela', name: 'Jícama y pepino con panela, chile y limón', meals: ['col'], diet: ['veg', 'sg'], min: 5, serv: 1, eco: true,
    ing: [[0.5, 'pz', 'Jícama', FV], [1, 'pz', 'Pepino', FV], [40, 'g', 'Queso panela', LH], [1, 'pz', 'Limón', FV], [null, '', 'Chile en polvo', AB]],
    steps: ['Corta en bastones la jícama, el pepino y el queso.', 'Agrega limón y chile en polvo.'],
    eq: { ver: 1.5, aoa2: 1 } },
  { id: 'huevo-manzana', name: 'Huevos cocidos y una manzana', meals: ['col'], diet: ['veg', 'sl', 'sg'], min: 12, serv: 1, eco: true,
    ing: [[2, 'pz', 'Huevo', LH], [1, 'pz', 'Manzana', FV]],
    steps: ['Cuece los huevos 10 minutos y pásalos a agua fría.', 'Duran 5 días con cáscara en el refrigerador: cuece varios.'],
    eq: { aoa3: 2, fru: 1 } },
  { id: 'platano-cacahuate', name: 'Pan con plátano y crema de cacahuate', meals: ['pre', 'col'], diet: ['veg', 'sl'], min: 3, serv: 1, eco: true,
    ing: [[1, 'reb', 'Pan integral', TP], [1, 'pz', 'Plátano', FV], [1.5, 'cdta', 'Crema de cacahuate', AB]],
    steps: ['Unta la crema de cacahuate en el pan y pon el plátano en rodajas.'],
    eq: { cer: 1, fru: 2, grap: 1 }, tip: 'De 1 a 2 horas antes de entrenar.' },
  { id: 'pan-miel', name: 'Pan tostado con miel y plátano', meals: ['pre'], diet: ['veg', 'sl'], min: 3, serv: 1, eco: true,
    ing: [[2, 'reb', 'Pan integral', TP], [2, 'cdta', 'Miel', AB], [0.5, 'pz', 'Plátano', FV]],
    steps: ['Tuesta el pan, ponle miel y el plátano.'],
    eq: { cer: 2, azu: 1, fru: 1 }, tip: 'Poca grasa y fibra: cae ligero si entrenas en 1 hora.' },
  { id: 'licuado-recuperacion', name: 'Licuado de leche, plátano, avena y cacahuate', meals: ['post', 'des'], diet: ['veg'], min: 5, serv: 1, eco: true,
    ing: [[1, 'taza', 'Leche descremada', LH], [1, 'pz', 'Plátano', FV], [0.33, 'taza', 'Avena en hojuelas', AB], [1.5, 'cdta', 'Crema de cacahuate', AB]],
    steps: ['Licúa todo con hielo.', 'Si te falta proteína en el día, agrega 1 medida de proteína en polvo.'],
    eq: { lec1: 1, fru: 2, cer: 1, grap: 1 } },
  { id: 'leche-chocolate', name: 'Leche con chocolate y una fruta', meals: ['post'], diet: ['veg', 'sg'], min: 2, serv: 1, eco: true,
    ing: [[1, 'taza', 'Leche descremada', LH], [1, 'cda', 'Cacao en polvo sin azúcar', AB], [2, 'cdta', 'Azúcar', AB], [1, 'pz', 'Manzana', FV]],
    steps: ['Mezcla la leche con el cacao y el azúcar.', 'Tómala con la fruta en la primera hora después de entrenar.'],
    eq: { lec1: 1, azu: 1, fru: 1 }, tip: 'Opción barata de recuperación: carbohidrato y proteína juntos.' },
  { id: 'sandwich-pavo', name: 'Sándwich de pechuga de pavo y aguacate', meals: ['post', 'col'], diet: ['sl'], min: 5, serv: 1,
    ing: [[2, 'reb', 'Pan integral', TP], [60, 'g', 'Pechuga de pavo', CA], [1, 'pz', 'Jitomate', FV], [1, 'taza', 'Lechuga', FV], [0.33, 'pz', 'Aguacate', FV]],
    steps: ['Arma el sándwich con el pavo, jitomate, lechuga y aguacate.'],
    eq: { cer: 2, aoa1: 2, ver: 1, gra: 1 } },
  { id: 'atun-galletas', name: 'Atún a la mexicana con galletas saladas', meals: ['col', 'post'], diet: ['sl'], min: 5, serv: 1, eco: true,
    ing: [[0.5, 'lata', 'Atún en agua', AB], [8, 'pz', 'Galletas saladas', AB], [0.5, 'pz', 'Jitomate', FV], [null, '', 'Cebolla', FV], [1, 'pz', 'Limón', FV]],
    steps: ['Mezcla el atún escurrido con jitomate y cebolla picados, limón y sal.', 'Sirve sobre las galletas.'],
    eq: { aoa1: 2, cer: 2, ver: 0.5 } },
  // ---------- v3.19: más con lentejas, huevo, frijoles y cacahuate (baratas y para cocinar un día antes) ----------
  { id: 'lentejas-huevo', name: 'Lentejas guisadas con huevo cocido', meals: ['com', 'cen'], diet: ['veg', 'sl', 'sg'], min: 40, serv: 4, prep: true, eco: true,
    ing: [[2, 'taza', 'Lentejas', AB], [2, 'pz', 'Jitomate', FV], [0.5, 'pz', 'Cebolla', FV], [2, 'diente', 'Ajo', FV], [2, 'pz', 'Zanahoria', FV], [2, 'cdta', 'Aceite', AB], [4, 'pz', 'Huevo', LH], [8, 'pz', 'Tortillas de maíz', TP]],
    steps: ['Lava las lentejas y cuécelas en 6 tazas de agua con sal, 25 minutos.', 'Mientras, cuece los huevos 10 minutos y pélalos.', 'Licúa jitomate, cebolla y ajo; fríe la salsa en el aceite 3 minutos y agrégala a las lentejas con la zanahoria en cubos.', 'Cocina 10 minutos más. Sirve cada plato con un huevo partido y 2 tortillas.', 'Duran 4 días en el refrigerador.'],
    eq: { leg: 2, aoa3: 1, ver: 1, gra: 0.5, cer: 2 }, tip: 'Una de las comidas más baratas con buena proteína. Para más proteína, 2 huevos por plato.' },
  { id: 'frijoles-pollo', name: 'Frijoles de la olla con pollo deshebrado y arroz', meals: ['com', 'post'], diet: ['sl', 'sg'], min: 50, serv: 4, prep: true, eco: true,
    ing: [[3, 'taza', 'Frijoles cocidos', AB], [500, 'g', 'Pechuga de pollo', CA], [0.67, 'taza', 'Arroz', AB], [1, 'pz', 'Jitomate', FV], [0.5, 'pz', 'Cebolla', FV], [2, 'pz', 'Chile serrano', FV], [null, '', 'Cilantro', FV], [2, 'cdta', 'Aceite', AB]],
    steps: ['Cuece la pechuga en agua con sal, ajo y cebolla, 25 minutos; deshébrala. Mientras, cuece el arroz (2/3 de taza crudo rinde 2 tazas).', 'Haz pico de gallo con jitomate, cebolla, chile y cilantro.', 'Calienta los frijoles con su caldo.', 'Sirve frijoles, pollo y arroz en un plato hondo con el pico de gallo encima.'],
    eq: { leg: 1.5, aoa1: 3.5, cer: 2, ver: 0.5, gra: 0.5 } },
  { id: 'huevo-nopales', name: 'Huevo con nopales y frijoles', meals: ['des', 'cen'], diet: ['veg', 'sl', 'sg'], min: 15, serv: 1, eco: true,
    ing: [[2, 'pz', 'Huevo', LH], [1, 'taza', 'Nopales', FV], [0.25, 'pz', 'Cebolla', FV], [0.5, 'pz', 'Jitomate', FV], [1, 'cdta', 'Aceite', AB], [0.5, 'taza', 'Frijoles cocidos', AB], [2, 'pz', 'Tortillas de maíz', TP]],
    steps: ['Cuece los nopales en agua con sal 10 minutos (o asados) y escúrrelos.', 'Sofríe cebolla y jitomate en el aceite, agrega los nopales y luego los huevos batidos.', 'Sirve con los frijoles y las tortillas.'],
    eq: { aoa3: 2, ver: 1.5, leg: 1, cer: 2, gra: 1 } },
  { id: 'tostadas-frijol-huevo', name: 'Tostadas de frijol con huevo y salsa', meals: ['des', 'cen'], diet: ['veg', 'sl', 'sg'], min: 10, serv: 1, eco: true,
    ing: [[2, 'pz', 'Tostadas horneadas', TP], [0.5, 'taza', 'Frijoles cocidos', AB], [2, 'pz', 'Huevo', LH], [null, '', 'Salsa', AB], [1, 'taza', 'Lechuga', FV]],
    steps: ['Machaca los frijoles calientes y úntalos en las tostadas.', 'Haz los huevos estrellados en sartén antiadherente sin aceite (o revueltos).', 'Pon un huevo en cada tostada con lechuga y salsa.'],
    eq: { cer: 2, leg: 1, aoa3: 2, ver: 0.5 } },
  { id: 'pollo-cacahuate', name: 'Pollo en salsa de cacahuate con arroz', meals: ['com'], diet: ['sl', 'sg'], min: 40, serv: 4, prep: true,
    ing: [[600, 'g', 'Pechuga de pollo', CA], [56, 'pz', 'Cacahuates', AB], [2, 'pz', 'Jitomate', FV], [1, 'pz', 'Chile guajillo', AB], [0.5, 'pz', 'Cebolla', FV], [2, 'diente', 'Ajo', FV], [0.67, 'taza', 'Arroz', AB], [2, 'taza', 'Calabacita o ejotes', FV]],
    steps: ['Corta el pollo en cubos y cuécelo en una olla con poca agua y sal, 15 minutos.', 'Asa el jitomate, la cebolla, el ajo y el chile sin semillas; licúalos con los cacahuates y 1 taza del caldo.', 'Agrega la salsa al pollo con la verdura picada y cocina 10 minutos a fuego bajo.', 'Cuece el arroz (2/3 de taza crudo rinde 2 tazas) y sirve con él. Dura 4 días en el refrigerador.'],
    eq: { aoa1: 4, grap: 1, ver: 1, cer: 2 }, tip: 'Sale como un encacahuatado ligero: el cacahuate da la grasa, así que no lleva aceite.' },
  { id: 'cacahuates-fruta', name: 'Cacahuates con manzana o plátano', meals: ['col', 'pre'], diet: ['veg', 'sl', 'sg'], min: 1, serv: 1, eco: true,
    ing: [[28, 'pz', 'Cacahuates', AB], [1, 'pz', 'Manzana', FV]],
    steps: ['Cuenta 28 cacahuates (naturales o tostados, sin sal ni enchilados de bolsa) y acompáñalos con la fruta.'],
    eq: { grap: 2, fru: 1 }, tip: 'Llénate con la fruta primero: los cacahuates son sanos pero se acaban rápido las calorías.' },
  { id: 'molletes-huevo', name: 'Molletes de frijol con huevo revuelto', meals: ['des'], diet: ['veg', 'sl'], min: 10, serv: 1, eco: true,
    ing: [[1, 'pz', 'Bolillo', TP], [0.5, 'taza', 'Frijoles cocidos', AB], [2, 'pz', 'Huevo', LH], [0.5, 'pz', 'Jitomate', FV], [null, '', 'Cebolla', FV], [null, '', 'Chile serrano', FV]],
    steps: ['Parte el bolillo, quítale el migajón y úntale los frijoles.', 'Tuéstalo en el comal o el horno.', 'Encima pon el huevo revuelto (sin aceite, en antiadherente) y un pico de gallo de jitomate, cebolla y chile picados.'],
    eq: { cer: 2, leg: 1, aoa3: 2, ver: 0.5 } },
];

export const RECIPES = R.map((r) => ({ ...r, prep: !!r.prep, eco: !!r.eco, per: macrosOf(r.eq) }));
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
export const HIGH_PROTEIN = 25; // g por ración

export function filterRecipes({ meal = '', diet = [], quick = false, prep = false, pro = false, q = '' } = {}) {
  const s = q.trim().toLowerCase();
  return RECIPES.filter((r) => (!meal || r.meals.includes(meal)) && diet.every((d) => r.diet.includes(d)) && (!quick || r.min <= 15) && (!prep || r.prep) && (!pro || r.per.p >= HIGH_PROTEIN)
    && (!s || r.name.toLowerCase().includes(s) || r.ing.some((i) => i[2].toLowerCase().includes(s))));
}

// Lista del súper: suma los ingredientes de las recetas elegidas (cada una con cuántas raciones).
const FRAC = [[0.25, '1/4'], [0.33, '1/3'], [0.5, '1/2'], [0.67, '2/3'], [0.75, '3/4']];
export function qtyText(q) {
  if (q == null) return '';
  const w = Math.floor(q + 1e-9), f = q - w;
  if (f < 0.08) return String(w);
  if (f > 0.92) return String(w + 1);
  const fr = FRAC.reduce((a, b) => (Math.abs(b[0] - f) < Math.abs(a[0] - f) ? b : a));
  return w ? `${w} ${fr[1]}` : fr[1];
}
const UNIT = { pz: ['pieza', 'piezas'], taza: ['taza', 'tazas'], cda: ['cucharada', 'cucharadas'], cdta: ['cucharadita', 'cucharaditas'], lata: ['lata', 'latas'], manojo: ['manojo', 'manojos'], g: ['g', 'g'], diente: ['diente', 'dientes'], reb: ['rebanada', 'rebanadas'] };
export function amountText(q, u) {
  if (q == null) return 'al gusto';
  if (u === 'g') return q >= 1000 ? `${Math.round(q / 100) / 10} kg` : `${Math.round(q / 10) * 10} g`;
  const roundUp = ['pz', 'lata', 'manojo', 'diente', 'reb'].includes(u);
  const v = roundUp ? Math.ceil(q - 0.2) || 1 : q;
  const t = roundUp && v >= 1 ? String(v) : qtyText(v);
  return `${t} ${(UNIT[u] || [u, u])[v > 1 ? 1 : 0]}`.trim();
}
export function shoppingList(picks) {
  const map = new Map();
  for (const [id, n] of Object.entries(picks || {})) {
    const r = RECIPE_BY_ID[id]; if (!r || !(n > 0)) continue;
    const f = n / r.serv;
    for (const [q0, u0, name, cat] of r.ing) {
      // v3.19.1: cucharadas y cucharaditas se suman juntas (1 cucharada = 3 cucharaditas).
      const u = u0 === 'cda' ? 'cdta' : u0, q = u0 === 'cda' && q0 != null ? q0 * 3 : q0;
      const k = `${name}|${u}`;
      const cur = map.get(k) || { name, u, cat, q: 0, any: false, from: new Set() };
      if (q == null) cur.any = true; else cur.q += q * f;
      cur.from.add(r.name); map.set(k, cur);
    }
  }
  // v3.19.1: si un ingrediente va «al gusto» en una receta y con cantidad en otra, sale una sola vez (con la cantidad).
  for (const [k, x] of map) {
    if (x.q) continue;
    const other = [...map.values()].find((y) => y !== x && y.name === x.name && y.q > 0);
    if (other) { for (const f of x.from) other.from.add(f); map.delete(k); }
  }
  // De 3 cucharaditas para arriba se dice en cucharadas.
  const amt = (x) => (x.u === 'cdta' && x.q >= 3 ? amountText(Math.round((x.q / 3) * 2) / 2, 'cda') : amountText(x.q, x.u));
  const items = [...map.values()].map((x) => ({ ...x, text: x.q ? amt(x) : 'al gusto', from: [...x.from] }));
  return SHOP_CATS.map((c, i) => [c, items.filter((x) => x.cat === i).sort((a, b) => a.name.localeCompare(b.name, 'es'))]).filter(([, xs]) => xs.length);
}
export function shoppingText(picks, title = 'Lista del súper') {
  const lines = [`🛒 ${title}`];
  for (const [id, n] of Object.entries(picks || {})) { const r = RECIPE_BY_ID[id]; if (r && n > 0) lines.push(`• ${r.name}: ${n} ${n === 1 ? 'ración' : 'raciones'}`); }
  for (const [cat, xs] of shoppingList(picks)) { lines.push('', `*${cat}*`); for (const x of xs) lines.push(`☐ ${x.name}: ${x.text}`); }
  lines.push('', 'Hecho con Remate Fit');
  return lines.join('\n');
}
