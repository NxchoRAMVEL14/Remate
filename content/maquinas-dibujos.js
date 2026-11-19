// Dibujos esquemáticos de las máquinas y poleas (v3.14): el muñequito en la máquina, con asiento, cojines,
// palanca, columna de placas, poleas y cable. Son esquemas para reconocer la máquina y el movimiento, no planos.
import { pose as P, _test } from '../figura.js';

const G = 176;
const jt = (J, n) => (J[n] && !Array.isArray(J[n][0]) ? J[n] : J[n[0]][Number(n.slice(1))]);
const at = (p, n, view = 'side') => jt(_test.joints(p, view, G), n);
// Mueve la pose (x y altura) para que el punto n quede justo en «to» (el asiento, el cojín, la barra).
function pin(p, n, to, view = 'side') {
  const q = at(p, n, view);
  return { ...p, x: (p.x || 0) + (to[0] - q[0]), up: (p.up || 0) + (q[1] - to[1]) };
}
const pinAll = (frames, n, to, view) => frames.map((f) => pin(f, n, to, view));
const r1 = (x) => Math.round(x * 10) / 10;
// Pivote de una palanca: equidistante de donde está la mano (u otro punto) al inicio y al final, hacia «dir».
function pivot(frames, n, dir = 'up', dist = 40, view = 'side') {
  const a = at(frames[0], n, view), b = at(frames[frames.length - 1], n, view);
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let v = [-(b[1] - a[1]), b[0] - a[0]];
  const len = Math.hypot(v[0], v[1]) || 1; v = [v[0] / len, v[1] / len];
  const want = { up: [0, -1], down: [0, 1], back: [-1, 0], front: [1, 0] }[dir];
  if (v[0] * want[0] + v[1] * want[1] < 0) v = [-v[0], -v[1]];
  return [r1(m[0] + v[0] * dist), r1(m[1] + v[1] * dist)];
}
// Columna de placas con su polea arriba y el cable fijo hasta otra polea.
const tower = (x, top, pulleys = []) => [{ k: 'stack', x, top }, { k: 'frame', pts: [[x + 8, top], [x + 8, top - 10]] }, { k: 'pulley', x: x + 8, y: top - 10 },
  ...pulleys.map(([px, py]) => ({ k: 'pulley', x: px, y: py })), ...(pulleys.length ? [{ k: 'rope', pts: [[x + 8, top - 10], ...pulleys] }] : [])];
const seat = (x, y, w = 40) => ({ k: 'seat', x, y, w });
const back = (pts) => ({ k: 'padl', pts });

const SEAT_H = [100, 144];                    // donde queda la cadera sentado en una máquina
const SIT = { t: 0, L: [92, 0, 90], R: [92, 0, 90] };
const seated = (fs) => pinAll(fs.map((f) => P({ ...SIT, ...f })), 'hip', SEAT_H);
const BACKREST = back([[92, 146], [92, 96]]);
const SEAT0 = seat(82, 145, 44);

function mk(name, frames, props, extra = {}) { return { name, frames, props, hold: [0.25, 0.3], ms: 2300, ...extra }; }

// ---------- pecho ----------
const pressPecho = seated([{ A: [-62, 92], B: [-62, 92] }, { A: [86, 90], B: [86, 90] }]);
const pressIncl = pinAll([P({ t: -22, L: [92, 0, 90], R: [92, 0, 90], A: [-30, 128], B: [-30, 128] }), P({ t: -22, L: [92, 0, 90], R: [92, 0, 90], A: [118, 122], B: [118, 122] })], 'hip', SEAT_H);
const pecDeck = seated([{ A: [-78, 178], B: [-78, 178] }, { A: [70, 178], B: [70, 178] }]);
const smithBanca = [P({ t: -90, L: [80, 0, 90], R: [80, 0, 90], A: [180, 180], B: [180, 180] }), P({ t: -90, L: [80, 0, 90], R: [80, 0, 90], A: [80, 182], B: [80, 182] })];
const sbx = at(smithBanca[0], 'A2')[0];
const fondos = pinAll([P({ t: 8, L: [0, -95, 0], R: [0, -95, 0], A: [-8, -8], B: [-8, -8] }), P({ t: 14, L: [0, -95, 0], R: [0, -95, 0], A: [-70, 2], B: [-70, 2] })], 'A2', [104, 100]);

// ---------- espalda ----------
const jalonMaq = seated([{ A: [168, 172], B: [168, 172] }, { t: -6, A: [20, 168], B: [20, 168] }]);
const jalonCerr = seated([{ A: [172, 172], B: [172, 172] }, { t: -10, A: [10, 165], B: [10, 165] }]);
const domAsist = pinAll([P({ L: [0, -95, 0], R: [0, -95, 0], A: [178, 178], B: [178, 178] }), P({ L: [0, -95, 0], R: [0, -95, 0], A: [24, 172], B: [24, 172] })], 'A2', [112, 30]);
const remoMaq = seated([{ t: 14, A: [80, 86], B: [80, 86] }, { t: 14, A: [-58, 88], B: [-58, 88] }]);
const remoT = [P({ t: 48, L: [30, -10, 90], R: [30, -10, 90], A: [-2, -2], B: [-2, -2] }), P({ t: 48, L: [30, -10, 90], R: [30, -10, 90], A: [-92, 8], B: [-92, 8] })];
const pullover = [P({ t: 22, L: [14, -8, 90], R: [-10, -14, 80], A: [150, 150], B: [150, 150] }), P({ t: 22, L: [14, -8, 90], R: [-10, -14, 80], A: [14, 14], B: [14, 14] })];
const remo1Polea = [P({ t: 6, L: [18, -6, 90], R: [-12, -16, 80], A: [86, 88], B: [10, 20] }), P({ t: 4, L: [18, -6, 90], R: [-12, -16, 80], A: [-55, 90], B: [10, 20] })];

// ---------- hombro ----------
const pressHombro = seated([{ A: [-30, 168], B: [-30, 168] }, { A: [176, 178], B: [176, 178] }]);
// Vista de frente sentado: las piernas cuelgan del asiento alto.
const SIT_F = { L: [22, 0, 90], R: [22, 0, 90] };
const seatedF = (fs) => pinAll(fs.map((f) => P({ ...SIT_F, ...f })), 'hip', [100, 120], 'front');
const latMaq = seatedF([{ A: [12, 60], B: [12, 60] }, { A: [86, 140], B: [86, 140] }]);
const latPolea = [P({ A: [-14, -10], B: [10, 20] }), P({ A: [86, 82], B: [10, 20] })];
const deltPost = seatedF([{ A: [26, 24], B: [26, 24] }, { A: [92, 92], B: [92, 92] }]);

// ---------- brazos ----------
const curlMaq = seated([{ t: 14, A: [58, 64], B: [58, 64] }, { t: 14, A: [58, 172], B: [58, 172] }]);
const curlPolea = [P({ A: [2, 4], B: [2, 4] }), P({ A: [8, 145], B: [8, 145] })];
const tricepsMaq = seated([{ A: [62, 168], B: [62, 168] }, { A: [62, 66], B: [62, 66] }]);
const tricepsArriba = [P({ t: 26, L: [22, -8, 90], R: [-14, -18, 80], A: [176, 30], B: [176, 30] }), P({ t: 26, L: [22, -8, 90], R: [-14, -18, 80], A: [170, 168], B: [170, 168] })];

// ---------- pierna ----------
const hack = pinAll([P({ t: -16, L: [22, 4, 90], R: [22, 4, 90], A: [-30, 150], B: [-30, 150] }), P({ t: -10, L: [112, 10, 90], R: [112, 10, 90], A: [-30, 150], B: [-30, 150] })], 'L2', [126, 166]);
const hk = (i, n) => ptA(hack[i], n);
const smithSent = [P({ A: [-50, 137], B: [-50, 137] }), P({ t: 42, L: [82, -25, 90], R: [82, -25, 90], A: [-8, 179], B: [-8, 179] })];
const ssx = at(smithSent[0], 'sh')[0] - 3;
const prensa1 = [P({ t: -55, L: [150, 65, 160], R: [86, 0, 90], A: [80, 60], B: [80, 60] }), P({ t: -55, L: [112, 102, 190], R: [86, 0, 90], A: [80, 60], B: [80, 60] })];
const extCuad = seated([{ L: [92, 6, 90], R: [92, 6, 90], A: [-20, 20], B: [-20, 20] }, { L: [92, 84, 170], R: [92, 84, 170], A: [-20, 20], B: [-20, 20] }]);
const curlSent = pinAll([P({ t: -8, L: [92, 82, 172], R: [92, 82, 172], A: [40, 60], B: [40, 60] }), P({ t: -8, L: [92, -8, 90], R: [92, -8, 90], A: [40, 60], B: [40, 60] })], 'hip', [100, 132]);
const hipT = [P({ x: 18, t: -58, L: [120, 0, 90], R: [120, 0, 90], A: [100, 80], B: [100, 80] }), P({ x: 18, t: -92, L: [92, 0, 90], R: [92, 0, 90], A: [110, 90], B: [110, 90] })];
const patada = [P({ t: 24, L: [4, -4, 90], R: [-8, -10, 80], A: [70, 80], B: [70, 80] }), P({ t: 24, L: [-48, -30, 60], R: [-8, -10, 80], A: [70, 80], B: [70, 80] })];
const abd = seatedF([{ L: [6, 0, 90], R: [6, 0, 90], A: [12, 30], B: [12, 30] }, { L: [32, 0, 90], R: [32, 0, 90], A: [12, 30], B: [12, 30] }]);
const add = seatedF([{ L: [32, 0, 90], R: [32, 0, 90], A: [12, 30], B: [12, 30] }, { L: [6, 0, 90], R: [6, 0, 90], A: [12, 30], B: [12, 30] }]);
const talMaq = pinAll([P({ A: [-40, 150], B: [-40, 150], L: [0, 0, 112], R: [0, 0, 112] }), P({ A: [-40, 150], B: [-40, 150], L: [0, 0, 35], R: [0, 0, 35] })], 'L2', [100, 160]);
const talPrensa = [P({ t: -55, L: [112, 102, 160], R: [112, 102, 160], A: [80, 60], B: [80, 60] }), P({ t: -55, L: [112, 102, 230], R: [112, 102, 230], A: [80, 60], B: [80, 60] })];
const talSent = seated([{ L: [92, 0, 112], R: [92, 0, 112], A: [20, 80], B: [20, 80] }, { L: [92, 0, 40], R: [92, 0, 40], A: [20, 80], B: [20, 80] }]);
const extEsp = pinAll([P({ t: 46, L: [-44, -44, 46], R: [-44, -44, 46], A: [10, 160], B: [10, 160] }), P({ t: 120, L: [-44, -44, 46], R: [-44, -44, 46], A: [10, 160], B: [10, 160] })], 'hip', [104, 112]);

// ---------- tronco ----------
const crunchMaq = seated([{ t: -4, A: [-14, 166], B: [-14, 166] }, { t: 38, A: [-14, 166], B: [-14, 166] }]);
const crunchPolea = [P({ t: 8, L: [0, -90, 180], R: [0, -90, 180], A: [168, -40], B: [168, -40] }), P({ t: 72, L: [0, -90, 180], R: [0, -90, 180], A: [168, -40], B: [168, -40] })];
const silla = pinAll([P({ L: [0, 0, 90], R: [0, 0, 90], A: [0, 90], B: [0, 90] }), P({ L: [96, 0, 90], R: [96, 0, 90], A: [0, 90], B: [0, 90] })], 'sh', [100, 64]);

// Puntos útiles para colocar piezas fijas.
const ptA = (f, n = 'A2', v) => at(f, n, v).map(r1);

export const MACHINE_MOVES = {
  mq_press_pecho: mk('Press de pecho en máquina', pressPecho, [...tower(20, 52), SEAT0, BACKREST, { k: 'frame', pts: [[92, 96], [92, 40], [pivot(pressPecho, 'A2', 'up', 38)[0], 40]] }, { k: 'lever', j: 'A2', to: pivot(pressPecho, 'A2', 'up', 38) }, 'hnd']),
  mq_press_incl: mk('Press inclinado en máquina', pressIncl, [...tower(18, 52), seat(80, 145, 44), back([[ptA(pressIncl[0], 'hip')[0] - 9, 148], [ptA(pressIncl[0], 'sh')[0] - 9, ptA(pressIncl[0], 'sh')[1] - 4]]),
    { k: 'lever', j: 'A2', to: pivot(pressIncl, 'A2', 'up', 34) }, 'hnd']),
  mq_pec_deck: mk('Aperturas en máquina (pec deck)', pecDeck, [...tower(18, 40), SEAT0, BACKREST, { k: 'frame', pts: [[92, 96], [92, 40], [ptA(pecDeck[0], 'sh')[0], 40]] },
    { k: 'lever', j: 'A1', to: [ptA(pecDeck[0], 'sh')[0], 52] }, { k: 'padj', j: 'A1', j2: 'A2' }], { ms: 2600 }),
  mq_cruce_alto: mk('Cruce de poleas (de arriba hacia abajo)', [P({ t: 0, A: [128, 120], B: [128, 120] }), P({ t: 0, A: [18, 14], B: [18, 14] })],
    [{ k: 'frame', pts: [[190, G], [190, 20]] }, { k: 'frame', pts: [[10, G], [10, 20]] }, { k: 'cable', to: [186, 26] }, { k: 'cable', j: 'B2', to: [14, 26] }, 'hnd'], { view: 'front', ms: 2600 }),
  mq_cruce_bajo: mk('Cruce de poleas de abajo hacia arriba', [P({ t: 0, A: [50, 40], B: [50, 40] }), P({ t: 0, A: [150, 170], B: [150, 170] })],
    [{ k: 'frame', pts: [[190, G], [190, 20]] }, { k: 'frame', pts: [[10, G], [10, 20]] }, { k: 'cable', to: [186, 168] }, { k: 'cable', j: 'B2', to: [14, 168] }, 'hnd'], { view: 'front', ms: 2600 }),
  mq_smith_banca: mk('Press de banca en multipower', smithBanca, [{ k: 'frame', pts: [[sbx - 14, G], [sbx - 14, 18]] }, { k: 'frame', pts: [[sbx + 14, G], [sbx + 14, 18]] }, 'bar', { k: 'bench', x: 52, w: 70, h: 33 }], { hold: [0.3, 0.2] }),
  mq_fondos_asist: mk('Fondos en máquina asistida', fondos, [{ k: 'frame', pts: [[96, 100], [116, 100]] }, { k: 'frame', pts: [[106, 100], [106, G]] }, { k: 'padj', j: 'L1', j2: 'L2', dy: 5 },
    { k: 'lever', j: 'L1', dy: 8, to: [60, 168] }, ...tower(24, 60)], { ms: 2600 }),
  // ---------- espalda ----------
  mq_jalon_maq: mk('Jalón en máquina', jalonMaq, [...tower(170, 48), SEAT0, { k: 'padl', pts: [[118, 133], [128, 133]] }, { k: 'lever', j: 'A2', to: pivot(jalonMaq, 'A2', 'front', 40) }, 'hnd']),
  mq_jalon_cerrado: mk('Jalón en polea con agarre cerrado', jalonCerr, [...tower(168, 48, [[ptA(jalonCerr[0])[0], 14]]), SEAT0, { k: 'padl', pts: [[118, 133], [128, 133]] }, { k: 'cable', to: [ptA(jalonCerr[0])[0], 14] }, 'mb']),
  mq_dominada_asist: mk('Dominadas asistidas en máquina', domAsist, [{ k: 'frame', pts: [[84, 30], [140, 30]] }, { k: 'frame', pts: [[140, 30], [140, G]] }, { k: 'padj', j: 'L1', j2: 'L2', dy: 5 },
    { k: 'lever', j: 'L1', dy: 8, to: [150, 150] }, ...tower(160, 60)], { ms: 2600 }),
  mq_remo_maq: mk('Remo en máquina con pecho apoyado', remoMaq, [...tower(176, 60), SEAT0, { k: 'padl', pts: [[ptA(remoMaq[0], 'sh')[0] + 9, ptA(remoMaq[0], 'sh')[1] + 2], [ptA(remoMaq[0], 'sh')[0] + 5, ptA(remoMaq[0], 'sh')[1] + 30]] },
    { k: 'lever', j: 'A2', to: pivot(remoMaq, 'A2', 'down', 34) }, 'hnd']),
  mq_remo_t: mk('Remo en barra T', remoT, [{ k: 'frame', pts: [[22, G - 8], [38, G - 8]] }, { k: 'lever', j: 'A2', to: [30, G - 8] }, 'db1']),
  mq_pullover: mk('Pullover en polea alta', pullover, [...tower(176, 50, [[160, 14]]), { k: 'cable', to: [160, 14] }, 'mb'], { ms: 2600 }),
  mq_remo_1_polea: mk('Remo a un brazo en polea', remo1Polea, [...tower(176, 60, [[184, ptA(remo1Polea[0])[1]]]), { k: 'cable', to: [184, ptA(remo1Polea[0])[1]] }, 'db1']),
  // ---------- hombro ----------
  mq_press_hombro: mk('Press de hombro en máquina', pressHombro, [...tower(18, 52), SEAT0, BACKREST, { k: 'lever', j: 'A2', to: pivot(pressHombro, 'A2', 'back', 30) }, 'hnd']),
  mq_lateral_maq: mk('Elevaciones laterales en máquina', latMaq, [{ k: 'seat', x: 82, y: 121, w: 36 }, { k: 'padj', j: 'A0', j2: 'A1' }, { k: 'padj', j: 'B0', j2: 'B1' }, { k: 'frame', pts: [[60, 60], [140, 60]] }], { view: 'front', ms: 2600 }),
  mq_lateral_polea: mk('Elevación lateral en polea', latPolea, [...tower(4, 60), { k: 'cable', to: [14, 168] }, 'db1'], { view: 'front', ms: 2600 }),
  mq_deltoide_post: mk('Deltoide posterior en máquina', deltPost, [{ k: 'seat', x: 82, y: 121, w: 36 }, { k: 'frame', pts: [[100, 64], [100, 30], [60, 30]] }, { k: 'frame', pts: [[100, 30], [140, 30]] }, 'hnd'], { view: 'front', ms: 2600 }),
  // ---------- brazos ----------
  mq_curl_maq: mk('Curl de bíceps en máquina (predicador)', curlMaq, [SEAT0, { k: 'padl', pts: [[ptA(curlMaq[0], 'A0')[0] + 6, ptA(curlMaq[0], 'A0')[1] + 10], [ptA(curlMaq[0], 'A1')[0] + 2, ptA(curlMaq[0], 'A1')[1] + 7]] },
    { k: 'frame', pts: [[ptA(curlMaq[0], 'A1')[0] + 2, ptA(curlMaq[0], 'A1')[1] + 10], [ptA(curlMaq[0], 'A1')[0] + 2, G]] }, { k: 'lever', j: 'A2', to: ptA(curlMaq[0], 'A1') }, 'hnd']),
  mq_curl_polea: mk('Curl de bíceps en polea baja', curlPolea, [...tower(150, 60), { k: 'pulley', x: 146, y: 168 }, { k: 'cable', to: [146, 168] }, 'mb'], { ms: 2200 }),
  mq_martillo: mk('Curl martillo con cuerda en polea', curlPolea, [...tower(150, 60), { k: 'pulley', x: 146, y: 168 }, { k: 'cable', to: [146, 168] }, 'hnd'], { ms: 2200 }),
  mq_triceps_maq: mk('Extensión de tríceps en máquina', tricepsMaq, [SEAT0, BACKREST, { k: 'padl', pts: [[ptA(tricepsMaq[0], 'A0')[0] + 4, ptA(tricepsMaq[0], 'A0')[1] + 9], [ptA(tricepsMaq[0], 'A1')[0] + 2, ptA(tricepsMaq[0], 'A1')[1] + 7]] },
    { k: 'lever', j: 'A2', to: ptA(tricepsMaq[0], 'A1') }, 'hnd']),
  mq_triceps_arriba: mk('Extensión de tríceps por arriba con cuerda', tricepsArriba, [...tower(4, 60, [[20, 70]]), { k: 'cable', to: [20, 70] }, 'hnd'], { ms: 2400 }),
  // ---------- pierna ----------
  mq_hack: mk('Sentadilla hack en máquina', hack, [{ k: 'frame', pts: [[hk(1, 'hip')[0] - 14, G], [hk(0, 'sh')[0] - 14, hk(0, 'sh')[1] - 30]] }, { k: 'frame', pts: [[112, G - 2], [146, G - 14]] },
    { k: 'padj', j: 'sh', j2: 'hip', dx: -9 }, { k: 'roller', j: 'sh', dx: -2, dy: -6, r: 5 }], { hold: [0.3, 0.2] }),
  mq_smith_sent: mk('Sentadilla en multipower', smithSent, [{ k: 'frame', pts: [[ssx - 12, G], [ssx - 12, 14]] }, { k: 'frame', pts: [[ssx + 12, G], [ssx + 12, 14]] }, 'barback'], { hold: [0.3, 0.2], ms: 2200 }),
  mq_prensa_1: mk('Prensa a una pierna', prensa1, ['footplate', { k: 'bench', x: 50, w: 50, h: 4 }, { k: 'frame', pts: [[30, G], [160, 40]] }]),
  mq_ext_cuad: mk('Extensión de cuádriceps', extCuad, [SEAT0, BACKREST, { k: 'roller', j: 'L2', dx: 3, dy: -2 }, { k: 'lever', j: 'L2', dx: 3, dy: -2, to: ptA(extCuad[0], 'L1') }, ...tower(20, 70)], { ms: 2000 }),
  mq_curl_sentado: mk('Curl femoral sentado', curlSent, [seat(80, 133, 44), back([[90, 134], [ptA(curlSent[0], 'sh')[0] - 9, ptA(curlSent[0], 'sh')[1] - 2]]),
    { k: 'padl', pts: [[ptA(curlSent[0], 'L1')[0] - 14, ptA(curlSent[0], 'L1')[1] - 9], [ptA(curlSent[0], 'L1')[0] - 2, ptA(curlSent[0], 'L1')[1] - 9]] },
    { k: 'roller', j: 'L2', dx: 0, dy: 6 }, { k: 'lever', j: 'L2', dy: 6, to: ptA(curlSent[0], 'L1') }, ...tower(18, 70)], { ms: 2200 }),
  mq_hip_thrust: mk('Empuje de cadera en máquina', hipT, [{ k: 'bench', x: 42, w: 40, h: 30 }, { k: 'roller', j: 'hip', dx: 2, dy: -7, r: 6 }, { k: 'lever', j: 'hip', dx: 2, dy: -7, to: [170, 150] }, { k: 'frame', pts: [[170, 150], [170, G]] }], { hold: [0.2, 0.4] }),
  mq_patada: mk('Patada de glúteo en polea', patada, [...tower(4, 60, [[14, 168]]), { k: 'cable', j: 'L2', to: [14, 168] }, { k: 'frame', pts: [[150, G], [150, 90]] }, 'ankle'], { ms: 2200 }),
  mq_abductores: mk('Abductores en máquina', abd, [{ k: 'seat', x: 80, y: 121, w: 40 }, { k: 'padj', j: 'L1', v: [0, -14], dx: 6 }, { k: 'padj', j: 'R1', v: [0, -14], dx: -6 }], { view: 'front', ms: 2400 }),
  mq_aductores: mk('Aductores en máquina', add, [{ k: 'seat', x: 80, y: 121, w: 40 }, { k: 'padj', j: 'L1', v: [0, -14], dx: -6 }, { k: 'padj', j: 'R1', v: [0, -14], dx: 6 }], { view: 'front', ms: 2400 }),
  mq_talones_maq: mk('Elevación de talones en máquina', talMaq, [{ k: 'box', x: 92, w: 30, h: 16 }, { k: 'padj', j: 'sh', v: [0, -1], dy: -5 }, { k: 'lever', j: 'sh', dy: -6, to: [40, 50] }, { k: 'frame', pts: [[40, 50], [40, G]] }], { hold: [0.3, 0.4], ms: 1800 }),
  mq_talones_prensa: mk('Elevación de talones en prensa', talPrensa, ['footplate', { k: 'bench', x: 50, w: 50, h: 4 }, { k: 'frame', pts: [[30, G], [160, 40]] }], { ms: 1800 }),
  mq_talones_sent: mk('Pantorrilla sentado en máquina', talSent, [SEAT0, { k: 'padj', j: 'L1', v: [-16, 0], dy: -6 }, { k: 'box', x: ptA(talSent[0], 'L2')[0] - 6, w: 26, h: 8 }, { k: 'lever', j: 'L1', dy: -6, to: [150, 150] }], { hold: [0.3, 0.4], ms: 1800 }),
  mq_ext_espalda: mk('Extensión de espalda en banco romano', extEsp, [{ k: 'padl', pts: [[112, 112], [120, 120]] }, { k: 'frame', pts: [[116, 118], [116, G]] }, { k: 'frame', pts: [[ptA(extEsp[0], 'L2')[0] - 6, ptA(extEsp[0], 'L2')[1] + 4], [ptA(extEsp[0], 'L2')[0] + 14, ptA(extEsp[0], 'L2')[1] - 4]] },
    { k: 'frame', pts: [[ptA(extEsp[0], 'L2')[0] + 4, ptA(extEsp[0], 'L2')[1]], [ptA(extEsp[0], 'L2')[0] + 4, G]] }], { ms: 2600 }),
  // ---------- tronco ----------
  mq_crunch_maq: mk('Abdominal en máquina', crunchMaq, [SEAT0, { k: 'padj', j: 'sh', j2: 'hip', dx: -9 }, { k: 'lever', j: 'A2', to: [ptA(crunchMaq[0], 'hip')[0], ptA(crunchMaq[0], 'hip')[1] - 2] }, 'hnd'], { hold: [0.2, 0.4] }),
  mq_crunch_polea: mk('Abdominal con cuerda en polea', crunchPolea, [...tower(176, 50, [[150, 14]]), { k: 'cable', to: [150, 14] }, 'hnd'], { hold: [0.2, 0.4], ms: 2400 }),
  mq_silla_romana: mk('Elevación de rodillas en silla romana', silla, [{ k: 'padl', pts: [[ptA(silla[0], 'A1')[0] - 2, ptA(silla[0], 'A1')[1] + 6], [ptA(silla[0], 'A2')[0], ptA(silla[0], 'A2')[1] + 6]] },
    { k: 'padl', pts: [[ptA(silla[0], 'sh')[0] - 10, ptA(silla[0], 'sh')[1]], [ptA(silla[0], 'hip')[0] - 10, ptA(silla[0], 'hip')[1]]] },
    { k: 'frame', pts: [[ptA(silla[0], 'hip')[0] - 14, 40], [ptA(silla[0], 'hip')[0] - 14, G]] }, { k: 'frame', pts: [[ptA(silla[0], 'A2')[0], ptA(silla[0], 'A2')[1] + 8], [ptA(silla[0], 'A2')[0], G]] }], { hold: [0.2, 0.4], ms: 2200 }),
};
