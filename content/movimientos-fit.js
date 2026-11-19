// Muñequitos de los ejercicios nuevos de Remate Fit (v3.25): pantorrilla de atrás y de adelante, antebrazo,
// trapecio y glúteo. Mismo formato que movimientos.js. sg = hombros arriba (encogimientos); wa y wb = ángulo de la mano.
// Son esquemas para entender la forma del movimiento: la rotación del antebrazo (pronación) no se alcanza a ver.
import { pose as P } from '../figura.js';

const box = (x, w, h) => ({ k: 'box', x, w, h });
const bench = (x, w = 46, h = 28) => ({ k: 'bench', x, w, h });
const SEAT = { L: [92, 0, 90], R: [92, 0, 90] };                       // sentado, espinilla vertical
const FLOOR = (o = {}) => P({ t: 4, L: [90, 90, 180], R: [90, 90, 180], A: [62, 62], B: [62, 62], ...o });   // sentado en el piso, piernas estiradas
const WRIST = (o = {}) => P({ t: 46, ...SEAT, A: [10, 90], B: [10, 90], ...o });                              // antebrazos sobre los muslos
const walk = (foot, foot2, arms = { A: [0, 0], B: [0, 0] }) => [P({ L: [22, -5, foot], R: [-18, -25, foot2], ...arms }), P({ L: [-18, -25, foot2], R: [22, -5, foot], ...arms })];

export const FIT_MOVES = {
  // ---------- pantorrilla de atrás (gemelo y sóleo) ----------
  talones_burro: { name: 'Talones tipo burro', props: [box(84, 40, 10), bench(130, 44, 30)], frames: [P({ up: 10, t: 86, L: [0, 0, 70], R: [0, 0, 70], A: [12, 12], B: [12, 12] }), P({ up: 10, t: 86, L: [0, 0, 32], R: [0, 0, 32], A: [12, 12], B: [12, 12] })], hold: [0.3, 0.4], ms: 1800 },
  talones_barra: { name: 'Talones de pie con barra', props: ['barback'], frames: [P({ A: [-50, 137], B: [-50, 137] }), P({ L: [0, 0, 35], R: [0, 0, 35], A: [-50, 137], B: [-50, 137] })], hold: [0.3, 0.4], ms: 1700 },
  talones_1_m: { name: 'Talón a una pierna con mancuerna', props: [box(80, 46, 12), 'db1'], frames: [P({ up: 12, L: [0, 0, 130], R: [40, -60, 90], A: [0, 0], B: [50, 50] }), P({ up: 12, L: [0, 0, 35], R: [40, -60, 90], A: [0, 0], B: [50, 50] })], hold: [0.4, 0.3], ms: 2000 },
  soleo_pie: { name: 'Talones con rodillas dobladas (sóleo)', props: ['db'], frames: [P({ t: 4, L: [32, -26, 90], R: [32, -26, 90], A: [0, 0], B: [0, 0] }), P({ t: 4, L: [32, -26, 40], R: [32, -26, 40], A: [0, 0], B: [0, 0] })], hold: [0.3, 0.4], ms: 1800 },
  talones_liga: { name: 'Pantorrilla con liga, sentado', props: [{ k: 'band', to: [166, 168] }], frames: [FLOOR(), FLOOR({ L: [90, 90, 128], R: [90, 90, 128] })], hold: [0.2, 0.4], ms: 1700 },
  caminar_puntas: { name: 'Caminata en puntas', props: ['db'], frames: walk(40, 30), ms: 1000 },
  // ---------- pantorrilla de adelante (tibial) ----------
  tibial_m: { name: 'Puntas arriba sentado con peso', props: [bench(54, 44, 32), 'ankle'], frames: [P({ ...SEAT, A: [20, 80], B: [20, 80] }), P({ L: [92, 0, 132], R: [92, 0, 132], A: [20, 80], B: [20, 80] })], hold: [0.2, 0.4], ms: 1700 },
  tibial_liga: { name: 'Tibial con liga, sentado', props: [{ k: 'cable', j: 'L3', to: [196, 150] }], frames: [FLOOR({ L: [90, 90, 140], R: [90, 90, 140] }), FLOOR({ L: [90, 90, 196], R: [90, 90, 196] })], hold: [0.2, 0.4], ms: 1700 },
  caminar_talones: { name: 'Caminata en talones', frames: walk(150, 140, { A: [30, 40], B: [-25, -10] }), ms: 1000 },
  tibial_escalon: { name: 'Puntas arriba en un escalón', props: [box(70, 52, 12)], frames: [P({ up: 12, L: [0, 0, 92], R: [0, 0, 92], A: [8, 15], B: [-6, 0] }), P({ up: 12, L: [0, 0, 140], R: [0, 0, 140], A: [8, 15], B: [-6, 0] })], hold: [0.2, 0.4], ms: 1600 },
  // ---------- antebrazo ----------
  curl_muneca: { name: 'Curl de muñeca', props: [bench(54, 44, 32), 'db'], frames: [WRIST({ wa: 28, wb: 28 }), WRIST({ wa: 150, wb: 150 })], hold: [0.2, 0.3], ms: 1500 },
  ext_muneca: { name: 'Extensión de muñeca', props: [bench(54, 44, 32), 'db'], frames: [WRIST({ wa: 40, wb: 40 }), WRIST({ wa: 140, wb: 140 })], hold: [0.2, 0.3], ms: 1500 },
  pronacion: { name: 'Giros de antebrazo con mancuerna', props: [bench(54, 44, 32), 'db1'], frames: [WRIST({ wa: 90, wb: 90 }), WRIST({ wa: 100, wb: 90 })], hold: [0.4, 0.4], ms: 2000 },
  curl_muneca_espalda: { name: 'Curl de muñeca con barra por detrás', props: ['bar'], frames: [P({ A: [-12, -12], B: [-12, -12], wa: 0, wb: 0 }), P({ A: [-12, -12], B: [-12, -12], wa: -70, wb: -70 })], hold: [0.2, 0.3], ms: 1500 },
  curl_inverso: { name: 'Curl inverso', props: ['bar'], frames: [P({ A: [2, 4], B: [2, 4] }), P({ A: [8, 140], B: [8, 140] })], hold: [0.2, 0.3], ms: 2200 },
  martillo: { name: 'Curl martillo', props: ['db'], frames: [P({ A: [2, 4], B: [2, 4] }), P({ A: [6, 140], B: [6, 140] })], hold: [0.2, 0.3], ms: 2200 },
  colgado: { name: 'Colgarse de la barra', props: ['grip'], frames: [P({ up: 6, L: [5, -20, 60], R: [5, -20, 60], A: [180, 180], B: [180, 180] }), P({ up: 7, L: [7, -18, 60], R: [7, -18, 60], A: [180, 180], B: [180, 180] })], ms: 2600 },
  rodillo: { name: 'Rodillo de muñeca', props: [{ k: 'band', to: [143, 160] }, { k: 'roller', j: 'A2', r: 3 }], frames: [P({ A: [85, 85], B: [85, 85], wa: 40, wb: 130 }), P({ A: [85, 85], B: [85, 85], wa: 130, wb: 40 })], ms: 900 },
  pinza_disco: { name: 'Pinza con discos', props: ['hnd'], frames: walk(90, 70), ms: 1200 },
  // ---------- trapecio ----------
  encog_barra: { name: 'Encogimientos con barra', view: 'front', props: ['barF'], frames: [P({ A: [6, 4], B: [6, 4] }), P({ A: [6, 4], B: [6, 4], sg: 8 })], hold: [0.2, 0.5], ms: 1600 },
  encog_m: { name: 'Encogimientos con mancuernas', view: 'front', props: ['db'], frames: [P({ A: [6, 4], B: [6, 4] }), P({ A: [6, 4], B: [6, 4], sg: 8 })], hold: [0.2, 0.5], ms: 1600 },
  encog_polea: { name: 'Encogimientos en polea baja', view: 'front', props: [{ k: 'cable', to: [100, 172] }, 'barF'], frames: [P({ A: [6, 4], B: [6, 4] }), P({ A: [6, 4], B: [6, 4], sg: 8 })], hold: [0.2, 0.5], ms: 1600 },
  encog_liga: { name: 'Encogimientos con liga', view: 'front', props: [{ k: 'band', to: [116, 176] }], frames: [P({ A: [6, 4], B: [6, 4] }), P({ A: [6, 4], B: [6, 4], sg: 8 })], hold: [0.2, 0.5], ms: 1600 },
  y_inclinado: { name: 'Elevación en Y inclinado', props: ['db'], frames: [P({ t: 52, L: [22, -10, 90], R: [22, -10, 90], A: [0, 0], B: [0, 0] }), P({ t: 52, L: [22, -10, 90], R: [22, -10, 90], A: [128, 128], B: [128, 128] })], hold: [0.2, 0.4], ms: 2200 },
  remo_alto: { name: 'Remo al mentón', view: 'front', props: ['db'], frames: [P({ A: [8, 4], B: [8, 4] }), P({ A: [88, 232], B: [88, 232] })], hold: [0.2, 0.3], ms: 2000 },
  rack_pull: { name: 'Peso muerto desde las rodillas', props: ['bar', box(104, 22, 34)], frames: [P({ t: 40, L: [26, -8, 90], R: [26, -8, 90], A: [0, 0], B: [0, 0] }), P({ A: [0, 0], B: [0, 0], sg: 3 })], hold: [0.3, 0.3], ms: 2000 },
  encog_inclinado: { name: 'Encogimientos inclinado', props: ['db'], frames: [P({ t: 48, L: [22, -10, 90], R: [22, -10, 90], A: [0, 0], B: [0, 0] }), P({ t: 48, L: [22, -10, 90], R: [22, -10, 90], A: [-12, -12], B: [-12, -12], sg: 6 })], hold: [0.2, 0.5], ms: 1800 },
  // ---------- glúteo ----------
  hip_thrust_1: { name: 'Empuje de cadera a una pierna', props: [bench(42, 40, 30)], frames: [P({ x: 18, t: -58, L: [120, 0, 90], R: [150, 150, 180], A: [100, 80], B: [100, 80] }), P({ x: 18, t: -92, L: [92, 0, 90], R: [92, 92, 180], A: [110, 90], B: [110, 90] })], hold: [0.2, 0.4] },
  puente_elevado: { name: 'Puente con pies arriba', props: [box(150, 30, 22)], frames: [P({ t: -90, L: [120, 60, 130], R: [120, 60, 130], A: [92, 92], B: [92, 92] }), P({ t: -110, L: [100, 60, 130], R: [100, 60, 130], A: [100, 100], B: [100, 100] })], hold: [0.2, 0.4] },
  puente_m: { name: 'Puente de glúteo con mancuerna', props: ['dbhip'], frames: [P({ t: -90, L: [135, 20, 120], R: [135, 20, 120], A: [92, 92], B: [92, 92] }), P({ t: -112, L: [112, 5, 100], R: [112, 5, 100], A: [100, 100], B: [100, 100] })], hold: [0.2, 0.4] },
  patada_liga: { name: 'Patada de glúteo en 4 puntos', props: ['ankle'], frames: [P({ t: 90, L: [0, -90, 0], R: [0, -90, 0], A: [0, 0], B: [0, 0] }), P({ t: 90, L: [-100, -178, -95], R: [0, -90, 0], A: [0, 0], B: [0, 0] })], hold: [0.2, 0.4], ms: 2000 },
  patada_polea: { name: 'Patada de glúteo en polea', props: [{ k: 'cable', j: 'L2', to: [176, 172] }], frames: [P({ t: 14, L: [6, 0, 90], A: [60, 60], B: [60, 60] }), P({ t: 18, L: [-38, -32, 58], A: [60, 60], B: [60, 60] })], hold: [0.2, 0.4], ms: 2000 },
  abduccion_liga: { name: 'Abducción de pie con liga', view: 'front', props: ['ankle'], frames: [P({ t: 0, L: [2, 2, 90], A: [28, -45], B: [28, -45] }), P({ t: -6, L: [34, 34, 90], A: [28, -45], B: [28, -45] })], hold: [0.2, 0.4], ms: 1800 },
  abduccion_polea: { name: 'Abducción de pie en polea', view: 'front', props: [{ k: 'cable', j: 'L2', to: [40, 172] }], frames: [P({ t: 0, L: [2, 2, 90], A: [10, 10], B: [60, 60] }), P({ t: -6, L: [34, 34, 90], A: [10, 10], B: [60, 60] })], hold: [0.2, 0.4], ms: 1800 },
  caminata_lateral: { name: 'Caminata lateral con liga', view: 'front', frames: [P({ x: -10, L: [12, 12, 90], R: [12, 12, 90], A: [30, 60], B: [30, 60] }), P({ x: 0, L: [28, 28, 90], R: [8, 8, 90], A: [30, 60], B: [30, 60] }), P({ x: 10, L: [12, 12, 90], R: [12, 12, 90], A: [30, 60], B: [30, 60] }), P({ x: 0, L: [8, 8, 90], R: [28, 28, 90], A: [30, 60], B: [30, 60] })], ms: 2400 },
  sumo: { name: 'Peso muerto sumo', props: ['bar'], frames: [P({ t: 38, L: [56, -18, 90], R: [56, -18, 90], A: [0, 0], B: [0, 0] }), P({ A: [0, 0], B: [0, 0] })], hold: [0.3, 0.3], ms: 2200 },
  sumo_m: { name: 'Sentadilla sumo con mancuerna', view: 'front', props: ['dbchest'], frames: [P({ L: [24, 24, 90], R: [24, 24, 90], A: [-8, -10], B: [-8, -10] }), P({ L: [68, 16, 90], R: [68, 16, 90], A: [-8, -10], B: [-8, -10] })], hold: [0.2, 0.3], ms: 2200 },
  pull_through: { name: 'Jalón entre las piernas en polea', props: [{ k: 'cable', to: [28, 172] }], frames: [P({ A: [-6, -6], B: [-6, -6] }), P({ t: 70, L: [16, 4, 90], R: [16, 4, 90], A: [-40, -40], B: [-40, -40] })], hold: [0.4, 0.2], ms: 2200 },
  frog_pump: { name: 'Puente de rana', frames: [P({ t: -90, L: [128, 30, 110], R: [128, 30, 110], A: [92, 92], B: [92, 92] }), P({ t: -114, L: [106, 20, 100], R: [106, 20, 100], A: [100, 100], B: [100, 100] })], hold: [0.1, 0.3], ms: 1300 },
  zancada_cruzada: { name: 'Zancada cruzada', props: ['db'], frames: [P({ A: [0, 0], B: [0, 0] }), P({ t: 8, L: [70, -12, 90], R: [-20, -95, 30], A: [0, 0], B: [0, 0] })], hold: [0.3, 0.3], ms: 2200 },
};
