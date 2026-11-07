// Movimientos para el muñequito animado (v3.9). Cada uno: nombre, vista ('side' o 'front'), poses clave, pausas y utilería.
// Pose: t = tronco; L y R = piernas [muslo, espinilla, pie]; A y B = brazos [brazo, antebrazo]; x = corrimiento; up = altura del piso.
// Son esquemas para entender la forma del movimiento, no una lección de técnica fina.
import { pose as P } from '../figura.js';
import { MACHINE_MOVES } from './maquinas-dibujos.js';

const G = 176;                                   // altura del piso en el dibujo
const box = (x, w, h2) => ({ k: 'box', x, w, h: h2 });
const bench = (x, w = 46, h2 = 28) => ({ k: 'bench', x, w, h: h2 });
const wall = (x) => ({ k: 'wall', x });

// Posturas que se repiten.
const ARMS_FWD = { A: [85, 85], B: [80, 80] };
const SQ_TOP = P({ A: [15, 20], B: [10, 15] });
const SQ_BOT = P({ t: 38, L: [84, -22, 90], R: [84, -22, 90], ...ARMS_FWD });
const READY = P({ t: 25, L: [45, -22, 90], R: [40, -25, 90], A: [45, 45], B: [40, 40] });
const ATHL = P({ t: 30, L: [55, -25, 90], R: [55, -25, 90], A: [60, 70], B: [55, 65] });           // aterrizaje: cadera atrás, rodillas sobre pies
const CROUCH_ARMS_BACK = P({ t: 38, L: [72, -28, 90], R: [72, -28, 90], A: [-60, -40], B: [-55, -35] });
const JUMP_UP = (up = 34) => P({ t: -2, L: [-5, -8, 40], R: [-8, -12, 35], A: [172, 172], B: [165, 168], up });
const PLANK_HI = P({ t: 70, L: [-70, -70, 0], R: [-70, -70, 0], A: [0, 0], B: [0, 0] });
const PUSH_BOT = P({ t: 80, L: [-80, -80, 0], R: [-80, -80, 0], A: [-45, 30], B: [-45, 30] });
const PLANK_LO = P({ t: 84, L: [-84, -84, 0], R: [-84, -84, 0], A: [0, 90], B: [0, 90] });
const SUPINE = (o = {}) => P({ t: -90, L: [135, 20, 120], R: [135, 20, 120], A: [92, 92], B: [92, 92], ...o });
const run1 = (t = 8) => P({ t, L: [40, -45, 90], R: [-25, -70, 60], A: [-35, 70], B: [35, 100] });
const run2 = (t = 8) => P({ t, L: [-25, -70, 60], R: [40, -45, 90], A: [35, 100], B: [-35, 70] });

export const MOVES = {
  // ---------- piernas ----------
  sentadilla: { name: 'Sentadilla', frames: [SQ_TOP, SQ_BOT], hold: [0.3, 0.3] },
  sentadilla_lenta: { name: 'Sentadilla lenta', frames: [SQ_TOP, SQ_BOT], hold: [0.2, 0.4], ms: 3200 },
  sentadilla_barra: { name: 'Sentadilla con barra', props: ['barback'], frames: [P({ A: [-50, 137], B: [-50, 137] }), P({ t: 42, L: [82, -25, 90], R: [82, -25, 90], A: [-8, 179], B: [-8, 179] })], hold: [0.3, 0.2], ms: 2200 },
  sentadilla_frontal: { name: 'Sentadilla frontal', props: ['bar'], frames: [P({ A: [95, -90], B: [95, -90] }), P({ t: 18, L: [86, -28, 90], R: [86, -28, 90], A: [113, -72], B: [113, -72] })], hold: [0.3, 0.2], ms: 2200 },
  goblet: { name: 'Sentadilla goblet', props: ['dbchest'], frames: [P({ A: [25, 160], B: [25, 160] }), P({ t: 25, L: [86, -25, 90], R: [86, -25, 90], A: [55, 185], B: [55, 185] })], hold: [0.3, 0.2], ms: 2200 },
  sentadilla_iso: { name: 'Sentadilla sostenida', props: [{ k: 'kneeband', to: 192 }], frames: [P({ t: 8, L: [72, -2, 90], R: [72, -2, 90], A: [85, 85], B: [85, 85] }), P({ t: 10, L: [74, -3, 90], R: [74, -3, 90], A: [85, 85], B: [85, 85] })], ms: 2400 },
  pared_sentado: { name: 'Sentadilla en la pared', props: [wall(95)], frames: [P({ t: 0, L: [88, 0, 90], R: [88, 0, 90], A: [0, 0], B: [0, 0], x: 0 }), P({ t: 0, L: [89, 0, 90], R: [89, 0, 90], A: [0, 0], B: [0, 0] })], ms: 2400 },
  prensa: { name: 'Prensa de piernas', props: ['footplate', { k: 'bench', x: 50, w: 50, h: 4 }], frames: [P({ t: -55, L: [150, 65, 160], R: [150, 65, 160], A: [80, 60], B: [80, 60] }), P({ t: -55, L: [112, 102, 190], R: [112, 102, 190], A: [80, 60], B: [80, 60] })], hold: [0.2, 0.2] },
  peso_muerto: { name: 'Peso muerto', props: ['bar'], frames: [P({ t: 48, L: [70, -22, 90], R: [70, -22, 90], A: [0, 0], B: [0, 0] }), P({ A: [0, 0], B: [0, 0] })], hold: [0.3, 0.3], ms: 2200 },
  rumano: { name: 'Peso muerto rumano', props: ['bar'], frames: [P({ A: [0, 0], B: [0, 0] }), P({ t: 72, L: [14, 6, 90], R: [14, 6, 90], A: [0, 0], B: [0, 0] })], hold: [0.3, 0.2], ms: 2400 },
  rumano_m: { name: 'Peso muerto rumano con mancuernas', props: ['db'], frames: [P({ A: [0, 0], B: [0, 0] }), P({ t: 72, L: [14, 6, 90], R: [14, 6, 90], A: [0, 0], B: [0, 0] })], hold: [0.3, 0.2], ms: 2400 },
  rumano_1: { name: 'Peso muerto a una pierna', props: ['db1'], frames: [P({ R: [10, -20, 90], A: [0, 0], B: [10, 10] }), P({ t: 78, L: [12, 4, 90], R: [-80, -80, 0], A: [0, 0], B: [20, 20] })], hold: [0.3, 0.3], ms: 2600 },
  hip_thrust: { name: 'Empuje de cadera', props: ['barhip', bench(42, 40, 30)], frames: [P({ x: 18, t: -58, L: [120, 0, 90], R: [120, 0, 90], A: [100, 80], B: [100, 80] }), P({ x: 18, t: -92, L: [92, 0, 90], R: [92, 0, 90], A: [110, 90], B: [110, 90] })], hold: [0.2, 0.4] },
  hip_thrust_m: { name: 'Empuje de cadera con mancuerna', props: ['dbhip', bench(42, 40, 30)], frames: [P({ x: 18, t: -58, L: [120, 0, 90], R: [120, 0, 90], A: [100, 80], B: [100, 80] }), P({ x: 18, t: -92, L: [92, 0, 90], R: [92, 0, 90], A: [110, 90], B: [110, 90] })], hold: [0.2, 0.4] },
  puente: { name: 'Puente de glúteo', frames: [SUPINE(), SUPINE({ t: -112, L: [112, 5, 100], R: [112, 5, 100], A: [100, 100], B: [100, 100] })], hold: [0.2, 0.4] },
  puente_1: { name: 'Puente a una pierna', props: [box(150, 30, 22)], frames: [SUPINE({ L: [120, 60, 130], R: [178, 178, 180] }), SUPINE({ t: -110, L: [100, 60, 130], R: [160, 160, 180], A: [100, 100], B: [100, 100] })], hold: [0.2, 0.4] },
  bulgara: { name: 'Sentadilla búlgara', props: ['db', bench(52, 38, 31)], frames: [P({ x: 15, L: [0, 0, 90], R: [-25, -95, -60], A: [0, 0], B: [0, 0] }), P({ x: 15, t: 12, L: [72, -15, 90], R: [-41, -131, -60], A: [0, 0], B: [0, 0] })], hold: [0.3, 0.3], ms: 2200 },
  subida: { name: 'Subida al cajón', props: ['db', box(108, 50, 19)], frames: [P({ L: [70, -10, 90], A: [0, 0], B: [0, 0] }), P({ x: 15, up: 19, L: [0, 0, 90], R: [40, -50, 90], A: [0, 0], B: [0, 0] })], hold: [0.3, 0.3], ms: 2200 },
  zancada: { name: 'Zancada hacia atrás', frames: [P({ A: [0, 10], B: [0, 10] }), P({ t: 4, L: [74, -8, 90], R: [-28, -100, 30], A: [0, 10], B: [0, 10] })], hold: [0.3, 0.3], ms: 2200 },
  zancada_db: { name: 'Zancada con mancuernas', props: ['db'], frames: [P({ A: [0, 0], B: [0, 0] }), P({ t: 4, L: [74, -8, 90], R: [-28, -100, 30], A: [0, 0], B: [0, 0] })], hold: [0.3, 0.3], ms: 2200 },
  zancada_iso: { name: 'Zancada sostenida', frames: [P({ t: 4, L: [74, -8, 90], R: [-28, -100, 30], A: [0, 10], B: [0, 10] }), P({ t: 5, L: [76, -9, 90], R: [-27, -102, 30], A: [0, 10], B: [0, 10] })], ms: 2400 },
  zancada_lateral: { name: 'Zancada lateral', view: 'front', frames: [P({ A: [10, 10], B: [10, 10] }), P({ x: 18, t: 10, L: [45, -10, 90], R: [35, 35, 90], A: [30, 60], B: [20, 50] }), P({ A: [10, 10], B: [10, 10] }), P({ x: -18, t: -10, L: [35, 35, 90], R: [45, -10, 90], A: [20, 50], B: [30, 60] })], hold: [0.2, 0.3, 0.2, 0.3], ms: 3600 },
  nordico: { name: 'Nórdico de isquiotibiales', props: ['ankle'], frames: [P({ t: 0, L: [0, -90, 0], R: [0, -90, 0], A: [10, 40], B: [10, 40] }), P({ t: 62, L: [-62, -90, 0], R: [-62, -90, 0], A: [62, 30], B: [62, 30] })], hold: [0.2, 0.1], ms: 3200 },
  curl_femoral: { name: 'Curl femoral', props: [bench(40, 100, 30)], frames: [P({ x: -5, t: 90, L: [-90, -90, 0], R: [-90, -90, 0], A: [95, 215], B: [95, 215], up: 30 }), P({ x: -5, t: 90, L: [-90, -175, -90], R: [-90, -175, -90], A: [95, 215], B: [95, 215], up: 30 })], hold: [0.2, 0.3] },
  talones: { name: 'Elevación de talones', frames: [P({ A: [5, 10], B: [5, 10] }), P({ L: [0, 0, 35], R: [0, 0, 35], A: [5, 10], B: [5, 10] })], hold: [0.3, 0.4], ms: 1600 },
  talones_db: { name: 'Elevación de talones con mancuernas', props: ['db'], frames: [P({ A: [0, 0], B: [0, 0] }), P({ L: [0, 0, 35], R: [0, 0, 35], A: [0, 0], B: [0, 0] })], hold: [0.3, 0.4], ms: 1600 },
  talones_1: { name: 'Talón a una pierna, bajando lento', props: [box(80, 46, 12)], frames: [P({ up: 12, L: [0, 0, 35], R: [40, -60, 90], A: [60, 60], B: [50, 50] }), P({ up: 6, L: [0, 0, 130], R: [40, -60, 90], A: [60, 60], B: [50, 50] })], hold: [0.2, 0.2], ms: 3000 },
  talones_sentado: { name: 'Elevación de talones sentado', props: ['db', bench(54, 40, 32)], frames: [P({ L: [92, 0, 90], R: [92, 0, 90], A: [20, 80], B: [20, 80] }), P({ L: [92, 0, 35], R: [92, 0, 35], A: [20, 80], B: [20, 80] })], hold: [0.3, 0.4], ms: 1600 },
  tibial: { name: 'Elevación de puntas contra la pared', props: [wall(76)], frames: [P({ t: -14, L: [26, 26, 90], R: [26, 26, 90], A: [0, 0], B: [0, 0] }), P({ t: -14, L: [26, 26, 150], R: [26, 26, 150], A: [0, 0], B: [0, 0] })], hold: [0.2, 0.3], ms: 1600 },
  equilibrio: { name: 'Equilibrio en una pierna', view: 'front', frames: [P({ t: -3, L: [0, 0, 90], R: [30, -60, 90], A: [70, 75], B: [70, 75] }), P({ t: 3, L: [2, 0, 90], R: [28, -62, 90], A: [75, 80], B: [65, 70] })], ms: 2400 },
  cadera_polaina: { name: 'Flexión de cadera con polaina', props: ['ankle', wall(150)], frames: [P({ R: [0, 0, 90], L: [0, 0, 90], A: [80, 80], B: [70, 70] }), P({ L: [92, 0, 90], A: [80, 80], B: [70, 70] })], hold: [0.3, 0.3], ms: 2200 },
  abduccion_polaina: { name: 'Abducción de cadera de lado', view: 'front', props: ['ankle'], frames: [P({ t: 90, L: [-90, -90, 0], R: [90, 90, 0], A: [-95, -95], B: [95, 95] }), P({ t: 90, L: [-125, -125, 0], R: [90, 90, 0], A: [-95, -95], B: [95, 95] })], hold: [0.2, 0.3], ms: 2200 },
  curl_polaina: { name: 'Curl de pierna de pie con polaina', props: ['ankle', wall(150)], frames: [P({ A: [80, 80], B: [70, 70] }), P({ L: [-5, -110, -30], A: [80, 80], B: [70, 70] })], hold: [0.3, 0.3], ms: 2200 },
  copenhague: { name: 'Plancha Copenhague', view: 'front', props: [bench(14, 40, 30)], frames: [P({ x: 10, t: 98, L: [-100, -100, 0], R: [100, 100, 0], A: [0, 90], B: [180, 180] }), P({ x: 10, t: 94, L: [-96, -96, 0], R: [96, 96, 0], A: [0, 90], B: [180, 180] })], ms: 2600 },
  movilidad_tobillo: { name: 'Rodilla a la pared', props: [wall(162)], frames: [P({ x: 15, t: 5, L: [40, -25, 90], R: [-25, -60, 40], A: [80, 80], B: [80, 80] }), P({ x: 15, t: 8, L: [62, -42, 90], R: [-25, -70, 40], A: [80, 80], B: [80, 80] })], hold: [0.2, 0.3], ms: 2000 },
  flexor_cadera: { name: 'Estiramiento de cadera en zancada', frames: [P({ t: 0, L: [80, -5, 90], R: [-45, -95, 10], A: [10, 10], B: [10, 10] }), P({ t: -6, L: [84, -12, 90], R: [-52, -100, 10], A: [175, 175], B: [175, 175] })], hold: [0.3, 0.4], ms: 2600 },
  balanceo_pierna: { name: 'Balanceo de pierna', frames: [P({ L: [70, 60, 120], A: [60, 60], B: [50, 50] }), P({ t: -5, L: [-40, -35, 60], A: [60, 60], B: [50, 50] })], ms: 1400 },
  estiramientos: { name: 'Estiramientos suaves', frames: [P({ L: [0, -170, -90], A: [-10, -150], B: [70, 70] }), P({ t: 75, L: [55, 55, 150], R: [0, 0, 90], A: [55, 55], B: [55, 55] }), P({ t: 0, A: [180, 230], B: [180, 230] })], hold: [0.6, 0.6, 0.6], ms: 6000 },
  // ---------- saltos y aterrizajes ----------
  pogos: { name: 'Pogos', frames: [P({ L: [0, 0, 40], R: [0, 0, 40], A: [20, 60], B: [20, 60] }), P({ up: 12, L: [0, 0, 45], R: [0, 0, 45], A: [25, 65], B: [25, 65] })], ms: 600 },
  saltitos: { name: 'Saltitos de tobillo', frames: [P({ L: [5, 0, 45], R: [5, 0, 45], A: [20, 60], B: [20, 60] }), P({ up: 8, L: [0, 0, 45], R: [0, 0, 45], A: [20, 60], B: [20, 60] })], ms: 700 },
  saltitos_lado: { name: 'Saltitos laterales sobre la línea', view: 'front', props: [{ k: 'line', x: 100 }], frames: [P({ x: -16, t: 0, L: [8, -10, 90], R: [8, -10, 90], A: [15, 40], B: [15, 40] }), P({ x: 0, up: 10, L: [3, 0, 90], R: [3, 0, 90], A: [15, 40], B: [15, 40] }), P({ x: 16, L: [8, -10, 90], R: [8, -10, 90], A: [15, 40], B: [15, 40] }), P({ x: 0, up: 10, L: [3, 0, 90], R: [3, 0, 90], A: [15, 40], B: [15, 40] })], ms: 1400 },
  salto_congela: { name: 'Salta y congela', frames: [P({ t: 15, L: [40, -20, 90], R: [40, -20, 90], A: [-40, -30], B: [-40, -30] }), P({ up: 16, L: [0, -5, 40], R: [0, -5, 40], A: [120, 120], B: [110, 110] }), ATHL], hold: [0, 0, 0.7], ms: 2000 },
  aterrizaje: { name: 'Aterrizaje desde el escalón', props: [box(30, 46, 26)], frames: [P({ x: -48, up: 26, A: [10, 10], B: [10, 10] }), P({ x: -12, up: 18, L: [30, 0, 60], R: [15, -20, 60], A: [60, 60], B: [60, 60] }), P({ ...ATHL, x: 14 }), P({ ...ATHL, x: 14 })], hold: [0.3, 0, 0, 0.6], ms: 2600 },
  salto_profundidad: { name: 'Salto en profundidad', props: [box(30, 46, 26)], frames: [P({ x: -48, up: 26, A: [10, 10], B: [10, 10] }), P({ x: -12, up: 18, L: [30, 0, 60], R: [15, -20, 60], A: [-20, -20], B: [-20, -20] }), P({ x: 14, t: 25, L: [45, -25, 70], R: [45, -25, 70], A: [-50, -40], B: [-50, -40] }), P({ ...JUMP_UP(36), x: 18 }), P({ ...ATHL, x: 20 })], hold: [0.3, 0, 0, 0, 0.3], ms: 2600 },
  cmj: { name: 'Salto con contramovimiento', frames: [P({ A: [10, 10], B: [10, 10] }), CROUCH_ARMS_BACK, JUMP_UP(38), P({ ...ATHL })], hold: [0.3, 0, 0, 0.3], ms: 2200 },
  sentadilla_salto: { name: 'Sentadilla con salto', frames: [P({ t: 30, L: [75, -25, 90], R: [75, -25, 90], A: [70, 70], B: [70, 70] }), P({ up: 24, L: [-3, -5, 40], R: [-3, -5, 40], A: [-30, -20], B: [-30, -20] }), P({ ...ATHL })], hold: [0.2, 0, 0.3], ms: 1800 },
  salto_mancuernas: { name: 'Salto con mancuernas ligeras', props: ['db'], frames: [P({ t: 30, L: [70, -25, 90], R: [70, -25, 90], A: [-5, -5], B: [-5, -5] }), P({ up: 18, L: [-3, -5, 40], R: [-3, -5, 40], A: [0, 0], B: [0, 0] }), P({ t: 30, L: [60, -25, 90], R: [60, -25, 90], A: [-5, -5], B: [-5, -5] })], hold: [0.2, 0, 0.4], ms: 1800 },
  salto_cajon: { name: 'Salto al cajón', props: [box(118, 48, 30)], frames: [P({ x: -32, A: [10, 10], B: [10, 10] }), P({ ...CROUCH_ARMS_BACK, x: -32 }), P({ x: -8, up: 46, L: [70, -50, 90], R: [70, -50, 90], A: [160, 160], B: [150, 150] }), P({ ...ATHL, x: 20, up: 30 }), P({ x: 20, up: 30, A: [10, 10], B: [10, 10] })], hold: [0.3, 0, 0, 0.3, 0.3], ms: 2800 },
  saltos_conos: { name: 'Saltos continuos sobre conos', props: [{ k: 'cone', xs: [100] }], frames: [P({ ...CROUCH_ARMS_BACK, x: -38 }), P({ x: 0, up: 26, L: [95, -30, 90], R: [95, -30, 90], A: [140, 140], B: [130, 130] }), P({ x: 38, t: 30, L: [60, -25, 90], R: [60, -25, 90], A: [60, 60], B: [60, 60] })], hold: [0.1, 0, 0.2], ms: 1600 },
  skater: { name: 'Salto lateral de patinador', view: 'front', frames: [P({ x: -40, t: -8, R: [12, -18, 90], L: [-25, -55, 90], A: [40, 60], B: [-30, -20] }), P({ x: 0, up: 16, t: 0, L: [10, -20, 90], R: [10, -20, 90], A: [30, 40], B: [30, 40] }), P({ x: 40, t: 8, L: [12, -18, 90], R: [-25, -55, 90], A: [-30, -20], B: [40, 60] }), P({ x: 0, up: 16, t: 0, L: [10, -20, 90], R: [10, -20, 90], A: [30, 40], B: [30, 40] })], hold: [0.5, 0, 0.5, 0], ms: 2400 },
  // ---------- tren superior y tronco ----------
  press_banca: { name: 'Press de banca', props: ['bar', bench(52, 70, 33)], frames: [P({ t: -90, L: [80, 0, 90], R: [80, 0, 90], A: [180, 180], B: [180, 180] }), P({ t: -90, L: [80, 0, 90], R: [80, 0, 90], A: [80, 182], B: [80, 182] })], hold: [0.3, 0.2] },
  press_mancuernas: { name: 'Press con mancuernas', props: ['db', bench(52, 70, 33)], frames: [P({ t: -90, L: [80, 0, 90], R: [80, 0, 90], A: [180, 180], B: [180, 180] }), P({ t: -90, L: [80, 0, 90], R: [80, 0, 90], A: [80, 182], B: [80, 182] })], hold: [0.3, 0.2] },
  landmine: { name: 'Press landmine a un brazo', props: [{ k: 'cable', to: [20, G] }], frames: [P({ t: 8, L: [25, -5, 90], R: [-20, -20, 70], A: [-30, 170], B: [10, 10] }), P({ t: 12, L: [25, -5, 90], R: [-20, -20, 70], A: [140, 140], B: [10, 10] })], hold: [0.2, 0.3] },
  lagartija: { name: 'Lagartija', frames: [PLANK_HI, PUSH_BOT], hold: [0.3, 0.4], ms: 2200 },
  lagartija_plus: { name: 'Lagartija plus', frames: [PLANK_HI, P({ ...PLANK_HI, t: 66 })], hold: [0.3, 0.4], ms: 1800 },
  press_hombro: { name: 'Press de hombro', props: ['db'], frames: [P({ A: [-40, 172], B: [-40, 172] }), P({ A: [178, 178], B: [178, 178] })], hold: [0.2, 0.3] },
  dominada: { name: 'Dominada', props: ['grip'], frames: [P({ up: 6, L: [5, -20, 60], R: [5, -20, 60], A: [180, 180], B: [180, 180] }), P({ up: 47, L: [5, -20, 60], R: [5, -20, 60], A: [20, 175], B: [20, 175] })], hold: [0.3, 0.3], ms: 2200 },
  remo_1: { name: 'Remo con mancuerna a un brazo', props: ['db1', bench(116, 50, 34)], frames: [P({ t: 72, L: [20, 0, 90], R: [-10, -10, 90], A: [0, 0], B: [10, 0] }), P({ t: 72, L: [20, 0, 90], R: [-10, -10, 90], A: [-115, 5], B: [10, 0] })], hold: [0.2, 0.3] },
  jalon_polea: { name: 'Jalón al pecho', props: [{ k: 'cable', to: [100, 8] }, bench(70, 46, 30)], frames: [P({ L: [92, 0, 90], R: [92, 0, 90], A: [172, 172], B: [172, 172] }), P({ t: -8, L: [92, 0, 90], R: [92, 0, 90], A: [25, 172], B: [25, 172] })], hold: [0.2, 0.3] },
  remo_invertido: { name: 'Remo invertido', props: ['grip'], frames: [P({ t: 74, L: [-74, -74, 120], R: [-74, -74, 120], A: [176, 176], B: [176, 176], x: -10 }), P({ t: 60, L: [-60, -60, 120], R: [-60, -60, 120], A: [40, 190], B: [40, 190], x: -10, up: 12 })], hold: [0.3, 0.3], ms: 2200 },
  rotacion_liga: { name: 'Rotación externa con liga', view: 'front', props: [{ k: 'band', to: [60] }], frames: [P({ A: [6, -75], B: [8, 10] }), P({ A: [6, 60], B: [8, 10] })], hold: [0.2, 0.3], ms: 2000 },
  rotacion_90: { name: 'Rotación externa a 90 grados', view: 'front', props: ['db1'], frames: [P({ A: [92, 75], B: [8, 10] }), P({ A: [92, 175], B: [8, 10] })], hold: [0.2, 0.3], ms: 2000 },
  ytw: { name: 'Y, T y W', view: 'front', frames: [P({ A: [150, 150], B: [150, 150] }), P({ A: [90, 90], B: [90, 90] }), P({ A: [45, 150], B: [45, 150] })], hold: [0.6, 0.6, 0.6], ms: 4200 },
  t_inclinado: { name: '«T» con el tronco inclinado', view: 'front', frames: [P({ t: 0, L: [10, -10, 90], R: [10, -10, 90], A: [5, 5], B: [5, 5] }), P({ t: 0, L: [10, -10, 90], R: [10, -10, 90], A: [90, 90], B: [90, 90] })], hold: [0.2, 0.4], ms: 1800 },
  face_pull: { name: 'Jalón a la cara', props: [{ k: 'cable', to: [190, 92] }], frames: [P({ A: [92, 92], B: [92, 92] }), P({ A: [95, -133], B: [95, -133] })], hold: [0.2, 0.4] },
  // ---------- v3.11: Remate Fit (aislados, máquinas y ligas) ----------
  curl_biceps: { name: 'Curl de bíceps', props: ['db'], frames: [P({ A: [2, 4], B: [2, 4] }), P({ A: [8, 145], B: [8, 145] })], hold: [0.2, 0.3], ms: 2200 },
  triceps_polea: { name: 'Extensión de tríceps en polea', props: [{ k: 'cable', to: [150, 12] }], frames: [P({ t: 6, A: [8, 100], B: [8, 100] }), P({ t: 6, A: [8, 4], B: [8, 4] })], hold: [0.2, 0.3], ms: 2000 },
  ext_triceps: { name: 'Extensión de tríceps por arriba', props: ['db'], frames: [P({ A: [172, -20], B: [172, -20] }), P({ A: [172, 176], B: [172, 176] })], hold: [0.3, 0.3], ms: 2400 },
  fondos_banco: { name: 'Fondos en banco', props: [bench(40, 50, 48)], frames: [P({ x: -2, up: 12, t: 2, L: [80, 12, 90], R: [80, 12, 90], A: [-14, -14], B: [-14, -14] }), P({ x: -2, up: 0, t: 6, L: [62, 22, 90], R: [62, 22, 90], A: [-72, -4], B: [-72, -4] })], hold: [0.3, 0.3], ms: 2400 },
  elev_lateral: { name: 'Elevaciones laterales', view: 'front', props: ['db'], frames: [P({ A: [8, 6], B: [8, 6] }), P({ A: [86, 80], B: [86, 80] })], hold: [0.2, 0.4], ms: 2400 },
  aperturas: { name: 'Aperturas', props: ['db', bench(52, 70, 33)], frames: [P({ t: -90, L: [80, 0, 90], R: [80, 0, 90], A: [178, 178], B: [178, 178] }), P({ t: -90, L: [80, 0, 90], R: [80, 0, 90], A: [128, 104], B: [128, 104] })], hold: [0.3, 0.3], ms: 2600 },
  ext_cuadriceps: { name: 'Extensión de cuádriceps', props: [bench(54, 40, 32)], frames: [P({ L: [92, 4, 90], R: [92, 4, 90], A: [20, 80], B: [20, 80] }), P({ up: 22, L: [92, 86, 170], R: [92, 86, 170], A: [20, 80], B: [20, 80] })], hold: [0.2, 0.4], ms: 2000 },
  remo_barra: { name: 'Remo con barra', props: ['bar'], frames: [P({ t: 58, L: [28, -12, 90], R: [28, -12, 90], A: [0, 0], B: [0, 0] }), P({ t: 58, L: [28, -12, 90], R: [28, -12, 90], A: [-95, 10], B: [-95, 10] })], hold: [0.2, 0.3], ms: 2200 },
  remo_sentado: { name: 'Remo sentado en polea', props: [{ k: 'cable', to: [196, 128] }, bench(60, 46, 26)], frames: [P({ t: 8, L: [80, 70, 160], R: [80, 70, 160], A: [86, 86], B: [86, 86] }), P({ t: -4, L: [80, 70, 160], R: [80, 70, 160], A: [-55, 88], B: [-55, 88] })], hold: [0.2, 0.4], ms: 2200 },
  remo_de_pie: { name: 'Remo con liga', props: [{ k: 'band', to: [196] }], frames: [P({ t: 4, L: [10, -8, 90], R: [10, -8, 90], A: [88, 88], B: [88, 88] }), P({ t: 4, L: [10, -8, 90], R: [10, -8, 90], A: [-50, 90], B: [-50, 90] })], hold: [0.2, 0.4], ms: 2000 },
  pallof: { name: 'Press Pallof', props: [{ k: 'band', to: [18] }], frames: [P({ t: 5, L: [25, -12, 90], R: [25, -12, 90], A: [15, 165], B: [15, 165] }), P({ t: 5, L: [25, -12, 90], R: [25, -12, 90], A: [90, 90], B: [90, 90] })], hold: [0.2, 0.6] },
  lenador: { name: 'Leñador', view: 'front', props: [{ k: 'cable', to: [24, 16] }], frames: [P({ t: -8, A: [-140, -140], B: [140, 140] }), P({ t: 10, L: [15, -10, 90], R: [15, -10, 90], A: [35, 35], B: [-35, -35] })], hold: [0.2, 0.3], ms: 1800 },
  plancha: { name: 'Plancha frontal', frames: [PLANK_LO, P({ ...PLANK_LO, t: 83 })], ms: 2600 },
  plancha_lateral: { name: 'Plancha lateral', view: 'front', frames: [P({ t: 74, L: [-74, -74, 0], R: [74, 74, 0], A: [0, 90], B: [20, 30] }), P({ t: 68, L: [-68, -68, 0], R: [68, 68, 0], A: [0, 90], B: [180, 180] })], hold: [0.2, 0.5], ms: 2400 },
  toques_hombro: { name: 'Plancha con toques de hombro', frames: [PLANK_HI, P({ ...PLANK_HI, B: [125, 215] }), PLANK_HI, P({ ...PLANK_HI, A: [125, 215] })], ms: 2400 },
  bicho_muerto: { name: 'Bicho muerto', frames: [SUPINE({ L: [180, 90, 150], R: [180, 90, 150], A: [180, 180], B: [180, 180] }), SUPINE({ L: [180, 90, 150], R: [96, 96, 150], A: [-95, -95], B: [180, 180] })], hold: [0.2, 0.3], ms: 2400 },
  perro_caza: { name: 'Perro de caza', frames: [P({ t: 90, L: [0, -90, 0], R: [0, -90, 0], A: [0, 0], B: [0, 0] }), P({ t: 90, L: [0, -90, 0], R: [-90, -90, 0], A: [90, 90], B: [0, 0] })], hold: [0.2, 0.5], ms: 2400 },
  granjero: { name: 'Caminata del granjero', props: ['db'], frames: [P({ L: [22, -5, 90], R: [-18, -25, 70], A: [0, 0], B: [0, 0] }), P({ L: [-18, -25, 70], R: [22, -5, 90], A: [0, 0], B: [0, 0] })], ms: 1100 },
  jalon_alto: { name: 'Jalón alto desde colgado', props: ['bar'], frames: [P({ t: 30, L: [30, -12, 90], R: [30, -12, 90], A: [0, 0], B: [0, 0] }), P({ t: -4, L: [0, 0, 40], R: [0, 0, 40], A: [150, 15], B: [150, 15] })], hold: [0.3, 0.2], ms: 1600 },
  lanzamiento_arriba: { name: 'Lanzamiento de balón medicinal por arriba', props: ['mb'], frames: [P({ t: 25, L: [55, -20, 90], R: [55, -20, 90], A: [60, 60], B: [60, 60] }), P({ t: -12, A: [195, 200], B: [195, 200] }), P({ t: 20, L: [10, 0, 50], R: [-10, -10, 50], A: [120, 120], B: [120, 120] })], hold: [0.2, 0.1, 0.4], ms: 1800 },
  lanzamiento_giro: { name: 'Lanzamiento con giro', view: 'front', props: ['mb'], frames: [P({ t: -6, L: [15, -15, 90], R: [15, -15, 90], A: [-60, -60], B: [60, 60] }), P({ t: 8, L: [12, -5, 90], R: [12, -5, 90], A: [80, 80], B: [-80, -80] })], hold: [0.3, 0.3], ms: 1600 },
  slam: { name: 'Golpe al piso con balón medicinal', props: ['mb'], frames: [P({ t: -4, L: [0, 0, 40], R: [0, 0, 40], A: [180, 180], B: [180, 180] }), P({ t: 55, L: [55, -25, 90], R: [55, -25, 90], A: [30, 30], B: [30, 30] })], hold: [0.2, 0.3], ms: 1400 },
  // ---------- desplazamientos y calentamiento ----------
  trote: { name: 'Trote', frames: [run1(), run2()], ms: 700 },
  aceleracion: { name: 'Aceleración corta', frames: [run1(30), run2(30)], ms: 500 },
  rodillas_arriba: { name: 'Rodillas arriba', frames: [P({ L: [95, 5, 90], R: [0, 0, 40], A: [-40, 80], B: [50, 120] }), P({ R: [95, 5, 90], L: [0, 0, 40], A: [50, 120], B: [-40, 80] })], ms: 700 },
  talones_gluteo: { name: 'Talones al glúteo', frames: [P({ L: [-5, -165, -100], R: [0, 0, 40], A: [-30, 80], B: [30, 100] }), P({ R: [-5, -165, -100], L: [0, 0, 40], A: [30, 100], B: [-30, 80] })], ms: 700 },
  carioca: { name: 'Paso cruzado (carioca)', view: 'front', frames: [P({ x: -20, L: [10, 0, 90], R: [-20, -20, 90], t: -6, A: [40, 60], B: [40, 60] }), P({ x: -5, L: [18, 0, 90], R: [15, 0, 90], t: 0, A: [40, 60], B: [40, 60] }), P({ x: 10, L: [10, 0, 90], R: [-25, -15, 90], t: 6, A: [40, 60], B: [40, 60] }), P({ x: 25, L: [18, 0, 90], R: [15, 0, 90], A: [40, 60], B: [40, 60] })], ms: 1800 },
  desplazamiento: { name: 'Desplazamiento lateral', view: 'front', frames: [P({ x: -24, t: 0, L: [28, -12, 90], R: [28, -12, 90], A: [35, 50], B: [35, 50] }), P({ x: -10, L: [12, -12, 90], R: [12, -12, 90], A: [35, 50], B: [35, 50] }), P({ x: 8, L: [28, -12, 90], R: [28, -12, 90], A: [35, 50], B: [35, 50] }), P({ x: -8, L: [12, -12, 90], R: [12, -12, 90], A: [35, 50], B: [35, 50] })], ms: 1600 },
  circulos_brazos: { name: 'Círculos de brazos', frames: [P({ A: [0, 0], B: [180, 180] }), P({ A: [90, 90], B: [270, 270] }), P({ A: [180, 180], B: [360, 360] }), P({ A: [270, 270], B: [450, 450] })], ms: 1600 },
  // ---------- voleibol ----------
  recepcion: { name: 'Postura y pase de antebrazos', props: ['ball'], frames: [READY, P({ t: 18, L: [25, -12, 80], R: [22, -15, 80], A: [62, 62], B: [62, 62] })], hold: [0.3, 0.3], ms: 1600 },
  recepcion_pared: { name: 'Antebrazos contra la pared', props: ['ball', wall(176)], frames: [READY, P({ t: 18, L: [25, -12, 80], R: [22, -15, 80], A: [62, 62], B: [62, 62] })], hold: [0.3, 0.3], ms: 1400 },
  dedos: { name: 'Toque de dedos', props: ['ball'], frames: [P({ t: 5, L: [30, -20, 90], R: [30, -20, 90], A: [140, 215], B: [140, 215] }), P({ t: 0, L: [5, -2, 60], R: [5, -2, 60], A: [168, 168], B: [168, 168] })], hold: [0.3, 0.3], ms: 1400 },
  dedos_pared: { name: 'Toque de dedos contra la pared', props: ['ball', wall(176)], frames: [P({ t: 5, L: [30, -20, 90], R: [30, -20, 90], A: [140, 215], B: [140, 215] }), P({ t: 0, L: [5, -2, 60], R: [5, -2, 60], A: [160, 160], B: [160, 160] })], hold: [0.2, 0.2], ms: 1200 },
  dedos_acostado: { name: 'Toque de dedos acostado', props: ['ball'], frames: [SUPINE({ A: [165, 215], B: [165, 215] }), SUPINE({ A: [180, 180], B: [180, 180] })], hold: [0.2, 0.3], ms: 1400 },
  remate_brazo: { name: 'Brazo de remate (arco y flecha)', frames: [P({ t: -6, A: [-165, -40], B: [165, 165] }), P({ t: 8, A: [168, 172], B: [60, 40] }), P({ t: 20, A: [40, 30], B: [10, 10] })], hold: [0.4, 0, 0.3], ms: 1800 },
  remate_pared: { name: 'Golpe de remate a la pared y al piso', props: ['ballA', wall(180)], frames: [P({ t: -6, A: [-165, -40], B: [160, 160] }), P({ t: 10, A: [150, 140], B: [60, 40] })], hold: [0.3, 0.2], ms: 1300 },
  saque: { name: 'Saque por arriba', props: ['ballB'], frames: [P({ R: [-20, -20, 60], A: [-150, -40], B: [170, 170] }), P({ t: 10, R: [-20, -20, 60], A: [165, 168], B: [60, 40] }), P({ t: 15, R: [-5, -10, 60], A: [60, 50], B: [10, 10] })], hold: [0.4, 0, 0.3], ms: 1800 },
  aproximacion: { name: 'Aproximación y salto de remate', props: [{ k: 'net', x: 186, y: 30 }], frames: [P({ ...run1(10), x: -70 }), P({ x: -40, t: 15, L: [45, -10, 90], R: [-30, -40, 60], A: [-40, -20], B: [-40, -20] }), P({ ...CROUCH_ARMS_BACK, x: -10 }), P({ x: 10, up: 40, t: -8, L: [10, -40, 50], R: [-5, -50, 50], A: [-165, -40], B: [165, 165] }), P({ x: 18, up: 38, t: 10, L: [20, -30, 50], R: [10, -40, 50], A: [168, 172], B: [60, 40] }), P({ ...ATHL, x: 26 })], hold: [0, 0, 0.1, 0, 0, 0.3], ms: 3000 },
  bloqueo: { name: 'Salto de bloqueo', props: [{ k: 'net', x: 150, y: 28 }], frames: [P({ t: 5, L: [25, -12, 90], R: [25, -12, 90], A: [110, 175], B: [110, 175] }), P({ t: 15, L: [55, -28, 90], R: [55, -28, 90], A: [110, 175], B: [110, 175] }), P({ up: 30, t: 3, L: [0, -5, 40], R: [0, -5, 40], A: [165, 165], B: [165, 165] })], hold: [0.3, 0, 0.2], ms: 1800 },
  pasos_bloqueo: { name: 'Pasos de bloqueo', view: 'front', frames: [P({ x: -34, L: [15, -15, 90], R: [15, -15, 90], A: [130, 170], B: [130, 170] }), P({ x: -10, L: [25, -15, 90], R: [-10, -15, 90], A: [130, 170], B: [130, 170] }), P({ x: 14, L: [30, -25, 90], R: [30, -25, 90], A: [130, 170], B: [130, 170] }), P({ x: 14, up: 28, L: [4, 0, 90], R: [4, 0, 90], A: [172, 176], B: [172, 176] })], hold: [0.3, 0, 0, 0.2], ms: 2400 },
  defensa: { name: 'Defensa en sombra', frames: [READY, P({ x: 14, t: 35, L: [85, -35, 90], R: [-45, -70, 50], A: [50, 50], B: [50, 50] }), READY], hold: [0.3, 0.3, 0], ms: 1600 },
  reaccion: { name: 'Juego de reacción', view: 'front', frames: [P({ x: 0, L: [20, -15, 90], R: [20, -15, 90], A: [35, 50], B: [35, 50] }), P({ x: 26, L: [35, -15, 90], R: [5, -10, 90], A: [35, 50], B: [35, 50] }), P({ x: 0, L: [20, -15, 90], R: [20, -15, 90], A: [35, 50], B: [35, 50] }), P({ x: -26, L: [5, -10, 90], R: [35, -15, 90], A: [35, 50], B: [35, 50] })], ms: 1800 },
  // ---------- v3.20: con tu peso (calistenia y resistencia) ----------
  burpee: { name: 'Burpee', frames: [P({ A: [10, 15], B: [-6, 0] }), P({ t: 45, L: [100, -30, 90], R: [100, -30, 90], A: [22, 22], B: [22, 22] }), PLANK_HI, P({ t: 45, L: [100, -30, 90], R: [100, -30, 90], A: [22, 22], B: [22, 22] }), JUMP_UP(28)], hold: [0.05, 0.1, 0.2, 0.1, 0.1], ms: 2600 },
  tijeras: { name: 'Saltos de tijera', view: 'front', frames: [P({ L: [3, 0, 90], R: [3, 0, 90], A: [8, 10], B: [8, 10] }), P({ up: 6, L: [22, 0, 90], R: [22, 0, 90], A: [168, 172], B: [168, 172] })], ms: 900 },
  escalador: { name: 'Escaladores', frames: [P({ ...PLANK_HI, L: [45, -95, 0] }), P({ ...PLANK_HI, R: [45, -95, 0] })], ms: 700 },
  superman: { name: 'Superman', frames: [P({ t: 92, L: [-92, -92, 0], R: [-92, -92, 0], A: [90, 90], B: [90, 90] }), P({ t: 80, L: [-102, -102, 0], R: [-102, -102, 0], A: [102, 102], B: [102, 102] })], hold: [0.2, 0.5], ms: 2400 },
  hueco: { name: 'Cuerpo hueco', frames: [SUPINE({ t: -78, L: [122, 122, 160], R: [122, 122, 160], A: [-118, -118], B: [-118, -118] }), SUPINE({ t: -74, L: [128, 128, 165], R: [128, 128, 165], A: [-112, -112], B: [-112, -112] })], ms: 2600 },
  oso: { name: 'Caminata de oso', frames: [P({ t: 86, L: [35, -60, 20], R: [5, -85, 10], A: [5, 5], B: [-15, -15] }), P({ t: 86, L: [5, -85, 10], R: [35, -60, 20], A: [-15, -15], B: [5, 5] })], ms: 900 },
  pica: { name: 'Lagartija en pica', frames: [P({ t: 128, L: [-48, -48, 0], R: [-48, -48, 0], A: [28, 28], B: [28, 28] }), P({ t: 145, L: [-55, -55, 0], R: [-55, -55, 0], A: [-25, 55], B: [-25, 55] })], hold: [0.3, 0.3], ms: 2400 },
};
Object.assign(MOVES, MACHINE_MOVES);   // v3.14: máquinas y poleas
for (const [id, m] of Object.entries(MOVES)) m.id = id;
export const move = (id) => MOVES[id] || null;

// Variantes sin peso.
MOVES.rumano_1_libre = { ...MOVES.rumano_1, id: 'rumano_1_libre', props: [], name: 'Peso muerto a una pierna, sin peso' };
MOVES.bulgara_libre = { ...MOVES.bulgara, id: 'bulgara_libre', props: [{ k: 'bench', x: 52, w: 38, h: 31 }], name: 'Sentadilla búlgara' };

// ---------- qué dibujo va con cada ejercicio ----------
// main: el dibujo del ejercicio; steps: uno por paso de «Cómo se hace» (lista vacía = sin dibujo en ese paso).
const S = (...xs) => xs;
const FIG = {
  // Gym
  'g-salto-cajon': 'salto_cajon', 'g-salto-cargado': 'salto_mancuernas', 'g-jalon-alto': 'jalon_alto', 'g-lanz-arriba': 'lanzamiento_arriba',
  'g-lanz-giro': 'lanzamiento_giro', 'g-slam': 'slam', 'g-skater': 'skater', 'g-aterrizaje': 'aterrizaje', 'g-sent-trasera': 'sentadilla_barra',
  'g-sent-frontal': 'sentadilla_frontal', 'g-goblet': 'goblet', 'g-prensa': 'prensa', 'g-sent-espanola': 'sentadilla_iso', 'g-hex': 'peso_muerto',
  'g-rumano-barra': 'rumano', 'g-rumano-mancuernas': 'rumano_m', 'g-hipthrust': 'hip_thrust', 'g-hipthrust-m': 'hip_thrust_m', 'g-bulgara': 'bulgara',
  'g-subida': 'subida', 'g-zancada': 'zancada_db', 'g-rumano-1': 'rumano_1', 'g-nordico': 'nordico', 'g-curl-femoral': 'curl_femoral',
  'g-puente-1': 'puente_1', 'g-talones-pie': 'talones_db', 'g-talones-sentado': 'talones_sentado', 'g-tibial': 'tibial', 'g-copenhague': 'copenhague',
  'g-press-banca': 'press_banca', 'g-press-mancuernas': 'press_mancuernas', 'g-landmine': 'landmine', 'g-lagartija': 'lagartija',
  'g-press-hombro-m': 'press_hombro', 'g-dominada': 'dominada', 'g-remo-1': 'remo_1', 'g-jalon-polea': 'jalon_polea', 'g-remo-invertido': 'remo_invertido',
  'g-re-liga': 'rotacion_liga', 'g-re-90': 'rotacion_90', 'g-ytw': 'ytw', 'g-face-pull': 'face_pull', 'g-serrato': 'lagartija_plus', 'g-pallof': 'pallof',
  'g-lenador': 'lenador', 'g-plancha-lat': 'plancha_lateral', 'g-deadbug': 'bicho_muerto', 'g-granjero': 'granjero',
  // Remate Fit
  'f-curl-m': 'curl_biceps', 'f-curl-liga': 'curl_biceps', 'f-ext-triceps-polea': 'triceps_polea', 'f-ext-triceps-m': 'ext_triceps', 'f-fondos-banco': 'fondos_banco',
  'f-elev-lateral': 'elev_lateral', 'f-elev-lateral-liga': 'elev_lateral', 'f-apertura': 'aperturas', 'f-press-inclinado': 'press_mancuernas', 'f-flexion-pies': 'lagartija',
  'f-press-liga': 'press_hombro', 'f-remo-barra': 'remo_barra', 'f-remo-polea': 'remo_sentado', 'f-remo-liga': 'remo_de_pie', 'f-jalon-liga': 'jalon_polea',
  'f-ext-cuad': 'mq_ext_cuad', 'f-sent-pc': 'sentadilla', 'f-zancada-atras': 'zancada', 'f-sprint': 'aceleracion',
  // v3.20: con tu peso
  'g-pared': 'pared_sentado', 'g-puente': 'puente', 'g-talones-1': 'talones_1', 'g-sentadilla-salto': 'sentadilla_salto', 'g-lagartija-rodillas': 'lagartija',
  'g-lagartija-diamante': 'lagartija', 'g-pike': 'pica', 'g-remo-mesa': 'remo_invertido', 'g-dominada-neg': 'dominada', 'g-plancha': 'plancha',
  'g-toques-hombro': 'toques_hombro', 'g-hueco': 'hueco', 'g-superman': 'superman', 'g-escalador': 'escalador', 'g-burpee': 'burpee', 'g-tijera': 'tijeras',
  'g-rodillas': 'rodillas_arriba', 'g-oso': 'oso',
  // En casa
  'h-tobillo': S('movilidad_tobillo', 'flexor_cadera'), 'h-sentadilla': 'sentadilla', 'h-zancada': 'zancada', 'h-puente': 'puente', 'h-talones': 'talones',
  'h-plancha': S('plancha', 'plancha_lateral'), 'h-hombro': 'ytw', 'h-lagartija': 'lagartija', 'h-equilibrio': 'equilibrio', 'h-saltitos': S('saltitos', 'salto_congela'),
  'h-dedos-acostado': 'dedos_acostado', 'h-dedos-pared': 'dedos_pared', 'h-antebrazos-aire': 'recepcion', 'h-antebrazos-pared': 'recepcion_pared',
  'h-pared-piso': 'remate_pared', 'h-saque-pared': 'saque', 'h-postura': S('recepcion', 'desplazamiento'), 'h-aproximacion': 'aproximacion',
  'h-brazo-toalla': 'remate_brazo', 'h-bloqueo': 'pasos_bloqueo', 'h-sombra': 'defensa',
  // Laboratorio de salto
  'lab-mobility': S('movilidad_tobillo', 'flexor_cadera'), 'lab-sq-tempo': 'sentadilla_lenta', 'lab-split': 'bulgara_libre', 'lab-sl-rdl': 'rumano_1_libre',
  'lab-calf': 'talones_1', 'lab-iso-split': 'zancada_iso', 'lab-nordic': 'nordico', 'lab-hipflex-polaina': 'cadera_polaina', 'lab-abd-polaina': 'abduccion_polaina',
  'lab-curl-polaina': 'curl_polaina', 'lab-land': 'aterrizaje', 'lab-pogo': 'pogos', 'lab-cmj': 'cmj', 'lab-hurdle': 'saltos_conos', 'lab-bound': 'skater',
  'lab-dj': 'salto_profundidad', 'lab-approach': 'aproximacion', 'lab-block': 'bloqueo',
  // Cancha: el gesto técnico (el diagrama de cancha ya dice la organización)
  'rm-02': 'aproximacion', 'bl-01': 'pasos_bloqueo', 'de-01': S('defensa', 'desplazamiento'), 'fi-07': S('aceleracion', 'desplazamiento'), 'fi-08': 'aproximacion',
};
const BY_SKILL = { saque: 'saque', recepcion: 'recepcion', colocacion: 'dedos', remate: 'remate_brazo', bloqueo: 'bloqueo', defensa: 'defensa' };
const STEPS = {
  'fi-01': [S('trote', 'carioca'), S('zancada', 'rodillas_arriba', 'talones_gluteo', 'balanceo_pierna'), S('circulos_brazos'), S('sentadilla', 'salto_congela', 'aceleracion')],
  'fi-02': [S('equilibrio'), S('equilibrio'), S('salto_congela'), S('talones')],
  'fi-03': [S('salto_congela'), S('salto_congela', 'saltitos_lado'), S('sentadilla'), S('salto_congela')],
  'fi-04': [S('pogos'), S('sentadilla_salto'), S('saltitos_lado'), S()],
  'fi-05': [S('sentadilla_lenta'), S('zancada'), S('puente'), S('rumano_1_libre', 'talones')],
  'fi-06': [S('plancha'), S('plancha_lateral'), S('bicho_muerto', 'perro_caza'), S('lagartija_plus', 'ytw')],
  'fi-07': [S('aceleracion', 'desplazamiento'), S('aceleracion', 'desplazamiento'), S('reaccion'), S()],
  'fi-08': [S(), S('aproximacion'), S(), S()],
  'fi-09': [S('sentadilla_lenta'), S('pared_sentado'), S('zancada'), S()],
  'fi-10': [S('trote'), S('estiramientos'), S('circulos_brazos'), S()],
  'ca-01': [S('trote', 'desplazamiento', 'carioca', 'rodillas_arriba'), S('equilibrio', 'talones'), S('sentadilla_lenta', 'zancada', 'salto_congela'), S('rotacion_liga', 'ytw', 'lagartija_plus'), S('defensa', 'bloqueo', 'recepcion', 'dedos')],
  'ca-02': [S('trote', 'desplazamiento', 'balanceo_pierna'), S('saltitos_lado', 'equilibrio'), S('zancada_lateral', 'sentadilla_salto', 'salto_congela'), S('rotacion_90', 'circulos_brazos', 'lanzamiento_arriba'), S('aproximacion', 'recepcion')],
  'ca-03': [S('trote', 'carioca', 'aceleracion'), S('equilibrio', 'saltitos_lado'), S('puente', 'zancada', 'salto_congela'), S('toques_hombro', 't_inclinado', 'dedos_pared'), S('reaccion', 'bloqueo')],
};
const list = (x) => (Array.isArray(x) ? x : x ? [x] : []).map((id) => MOVES[id]).filter(Boolean);
// Dibujo principal de un ejercicio (de cancha, gym, casa o laboratorio).
export function figFor(ex) {
  if (!ex) return [];
  if (FIG[ex.id]) return list(FIG[ex.id]);
  if (ex.fig) return list(ex.fig);   // v3.14: máquinas y poleas → su dibujo esquemático (maquinas-dibujos.js)
  if (STEPS[ex.id]) return list(STEPS[ex.id].flat().filter((v, i, a) => a.indexOf(v) === i).slice(0, 4));
  const k = ex.skills?.[0];
  return k && BY_SKILL[k] ? list(BY_SKILL[k]) : [];
}
// Dibujo de cada paso (solo los que tienen partes distintas).
export const stepFigs = (ex) => (ex && STEPS[ex.id] ? STEPS[ex.id].map(list) : null);
