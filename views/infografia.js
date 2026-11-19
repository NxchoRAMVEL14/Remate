// Infografías de la teoría (v3.24): dibujadas por la app (SVG), con los datos correctos, ligeras y sin internet.
// zonasIG()      cancha con las zonas 1-6 (toca una zona)
// rotacionIG()   rotación animada con «Rotar»
// posicionesIG() tarjetas de las 5 posiciones (o solo una)
// sistemasIG()   5-1, 6-2 y 4-2 en sus 6 rotaciones
// recepcionIG()  formaciones de recepción
// pasosIG(skill) un fundamento paso a paso con muñequitos
// cicloIG()      side-out (K1) y contraataque (K2)
// Zona ≠ posición: la zona es el lugar en la rotación (cambia cada que rotan); la posición es el rol (no cambia).
// Reglas: Reglas Oficiales de Voleibol FIVB 2025-2028 (7.4 posiciones, 7.6 rotación, 12 saque, 13-14 ataque y bloqueo, 19 líbero).
import { h, ic } from '../util.js';
import { MOVES } from '../content/movimientos.js';
import { poseSVG } from '../figura.js';

const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v); kids.flat().forEach((c) => c != null && e.append(c)); return e; };
const txt = (x, y, t, cls = '', extra = {}) => S('text', { x, y, class: cls, ...extra }, t);

// Mitad de cancha 9 × 9 m (× 10): red arriba (y = 0), línea de ataque a 3 m (y = 30).
export const ZONE_XY = { 4: [15, 15], 3: [45, 15], 2: [75, 15], 5: [15, 60], 6: [45, 60], 1: [75, 60] };
const ZONE_RECT = { 4: [0, 0, 30, 30], 3: [30, 0, 30, 30], 2: [60, 0, 30, 30], 5: [0, 30, 30, 60], 6: [30, 30, 30, 60], 1: [60, 30, 30, 60] };
export const ZONE_COLOR = { 4: '#C62828', 3: '#2E7D32', 2: '#1565C0', 5: '#283593', 6: '#6A1B9A', 1: '#00796B' };
const ZONE_INFO = {
  4: ['Zona 4 · adelante a la izquierda', 'Delantero. Ahí suele atacar el punta: la bola alta, la más común.'],
  3: ['Zona 3 · adelante al centro', 'Delantero. Ahí suele estar el central: bloquea en toda la red y ataca rápido.'],
  2: ['Zona 2 · adelante a la derecha', 'Delantero. Cerca de ahí se coloca casi siempre y ataca el opuesto.'],
  5: ['Zona 5 · atrás a la izquierda', 'Zaguero. Mucha recepción y defensa; ahí suele estar el líbero.'],
  6: ['Zona 6 · atrás al centro', 'Zaguero. Defiende el fondo y cubre al que remata.'],
  1: ['Zona 1 · atrás a la derecha', 'Zaguero. El que está en zona 1 es el que saca (desde atrás de la línea de fondo).'],
};
const NEXT_Z = { 2: 1, 1: 6, 6: 5, 5: 4, 4: 3, 3: 2 };               // a dónde pasa cada quien al rotar

function halfCourt({ h: hgt = 96, serve = false } = {}) {
  return [
    S('rect', { x: -4, y: -6, width: 98, height: hgt + 10 + (serve ? 10 : 0), rx: 4, class: 'ig-out' }),
    S('rect', { x: 0, y: 0, width: 90, height: 90, class: 'ig-floor' }),
    S('line', { x1: 0, y1: 30, x2: 90, y2: 30, class: 'ig-line' }),
    S('line', { x1: -4, y1: 0, x2: 94, y2: 0, class: 'ig-net' }),
    txt(45, -1.6, 'RED', 'ig-netlbl'),
  ];
}
const svgBox = (vb, label, ...kids) => S('svg', { viewBox: vb, class: 'ig-svg', role: 'img', 'aria-label': label }, ...kids);

// ---------- zonas ----------
export function zonasIG() {
  let sel = 4;
  const info = h('div', { class: 'ig-info', 'aria-live': 'polite' });
  const tiles = Object.entries(ZONE_RECT).map(([z, [x, y, w, hh]]) => {
    const g = S('g', { class: 'ig-zone', tabindex: 0, role: 'button', 'aria-label': ZONE_INFO[z][0], 'data-z': z },
      S('rect', { x: x + 1.5, y: y + 1.5, width: w - 3, height: hh - 3, rx: 3, fill: ZONE_COLOR[z] }),
      txt(x + w / 2, y + hh / 2 + 5, z, 'ig-znum'),
      txt(x + w / 2, y + hh / 2 + 14, Number(z) >= 2 && Number(z) <= 4 ? 'delantero' : 'zaguero', 'ig-zsub'));
    const pick = () => { sel = Number(z); paint(); };
    g.addEventListener('click', pick); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    return g;
  });
  const svg = svgBox('-6 -8 102 112', 'Cancha con las zonas 1 a 6. Toca una zona.', ...halfCourt({ serve: true }), ...tiles,
    txt(45, 99, 'línea de fondo · se saca desde atrás', 'ig-small'), S('path', { d: 'M82 102 L78 93', class: 'ig-arrow-serve' }), txt(86, 104, 'saque', 'ig-small'));
  const paint = () => {
    tiles.forEach((g) => g.classList.toggle('on', Number(g.dataset.z) === sel));
    info.replaceChildren(h('strong', { style: { color: ZONE_COLOR[sel] } }, ZONE_INFO[sel][0]), h('p', { style: { margin: '2px 0 0' } }, ZONE_INFO[sel][1]));
  };
  paint();
  return h('figure', { class: 'ig ig-zonas' },
    h('div', { class: 'ig-title' }, 'Las zonas de tu cancha'), svg, info,
    h('figcaption', {}, h('strong', {}, 'Zona no es posición. '), 'La zona es el lugar que te toca en la rotación y cambia cada vez que rotan. La posición (colocador, central, punta, opuesto, líbero) es tu rol y no cambia. Los zagueros no pueden bloquear ni rematar por arriba de la red desde la zona de frente.'));
}

// ---------- rotación ----------
export function rotacionIG() {
  const start = { 1: 7, 6: 12, 5: 4, 4: 17, 3: 13, 2: 6 };              // zona → número del jugador
  let at = { ...Object.fromEntries(Object.entries(start).map(([z, n]) => [n, Number(z)])) }, turns = 0;
  const toks = Object.keys(at).map((n) => S('g', { class: 'ig-tok', 'data-n': n }, S('circle', { r: 9 }), txt(0, 3.6, n, 'ig-toknum')));
  const svg = svgBox('-6 -8 102 112', 'Rotación: seis jugadores en sus zonas', ...halfCourt({ serve: true }),
    ...Object.entries(ZONE_XY).map(([z, [x, y]]) => txt(x, y + (Number(z) <= 4 && Number(z) >= 2 ? -9 : 20), `zona ${z}`, 'ig-zlbl')), ...toks,
    S('path', { d: 'M88 72 A 40 40 0 0 1 88 20', class: 'ig-rot', 'marker-end': 'url(#ig-head)' }),
    S('defs', {}, S('marker', { id: 'ig-head', viewBox: '0 0 10 10', refX: 7, refY: 5, markerWidth: 4, markerHeight: 4, orient: 'auto' }, S('path', { d: 'M0,0 L10,5 L0,10 z', class: 'ig-headfill' }))));
  const status = h('p', { class: 'ig-info', 'aria-live': 'polite', style: { margin: 0 } });
  const place = () => {
    for (const g of toks) { const n = g.dataset.n, [x, y] = ZONE_XY[at[n]]; g.setAttribute('transform', `translate(${x} ${y})`); g.style.transform = `translate(${x}px, ${y}px)`; g.classList.toggle('serve', at[n] === 1); }
    const server = Object.keys(at).find((n) => at[n] === 1);
    status.replaceChildren(h('strong', {}, `Saca el #${server} (zona 1). `), turns ? `Llevan ${turns} ${turns === 1 ? 'rotación' : 'rotaciones'}.` : 'Así empiezan.', turns % 6 === 0 && turns ? ' ¡Dieron la vuelta completa!' : '');
  };
  place();
  return h('figure', { class: 'ig ig-rotacion' },
    h('div', { class: 'ig-title' }, 'Así se rota'), svg, status,
    h('div', { class: 'cluster' },
      h('button', { type: 'button', class: 'btn sm primary', onclick: () => { for (const n of Object.keys(at)) at[n] = NEXT_Z[at[n]]; turns++; place(); } }, ic('refresh-cw', 16), 'Rotar'),
      h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { at = Object.fromEntries(Object.entries(start).map(([z, n]) => [n, Number(z)])); turns = 0; place(); } }, 'Empezar de nuevo')),
    h('figcaption', {}, 'Se rota cuando tu equipo recupera el saque: todos avanzan una zona en el sentido de las manecillas del reloj (2 → 1 → 6 → 5 → 4 → 3 → 2) y el que llega a zona 1 saca.'));
}

// ---------- posiciones ----------
export const POS_IG = {
  colocador: { name: 'Colocador', color: '#F9A825', mv: ['dedos', 1], zones: [2, 1], tag: 'El que organiza',
    d: 'Hace el segundo toque casi siempre y decide quién ataca. Esté en la zona que esté, corre a colocar entre las zonas 2 y 3.', ojo: 'Si está adelante, también puede atacar de segunda o bloquear.' },
  central: { name: 'Central', color: '#2E7D32', mv: ['bloqueo', 2], zones: [3], tag: 'El muro del centro',
    d: 'Bloquea en toda la red y ataca rápido por el centro (la «primera»). Es de los más altos.', ojo: 'Cuando pasa atrás, casi siempre lo cambia el líbero.' },
  punta: { name: 'Punta (receptor)', color: '#C62828', mv: ['aproximacion', 4], zones: [4, 6, 5], tag: 'Ataca y recibe',
    d: 'Ataca por la zona 4 (la bola más común) y recibe el saque con el líbero. Hace de todo.', ojo: 'Necesita buena recepción además de buen remate.' },
  opuesto: { name: 'Opuesto', color: '#1565C0', mv: ['aproximacion', 5], zones: [2, 1], tag: 'El atacante fuerte',
    d: 'Juega en contra del colocador en la rotación. Ataca por la zona 2 y desde atrás por la 1; casi no recibe.', ojo: 'Es la opción de ataque cuando el pase no salió bien.' },
  libero: { name: 'Líbero', color: '#6A1B9A', mv: ['recepcion', 1], zones: [5, 6], tag: 'Defensa y recepción',
    d: 'Especialista de atrás: recibe y defiende. Entra y sale sin contar como cambio y usa otra playera.', ojo: 'Reglas FIVB: no saca, no bloquea ni remata por arriba de la red, y solo juega en zonas de atrás.' },
};
export const POS_KEYS = Object.keys(POS_IG);
const fig = (mv, frame) => (MOVES[mv] ? h('div', { class: 'ig-fig', html: poseSVG(MOVES[mv], Math.min(frame, MOVES[mv].frames.length - 1)) }) : null);
function miniCourt(zones, color, label) {
  return svgBox('-4 -5 98 99', label, S('rect', { x: 0, y: 0, width: 90, height: 90, class: 'ig-floor' }), S('line', { x1: 0, y1: 30, x2: 90, y2: 30, class: 'ig-line' }), S('line', { x1: -4, y1: 0, x2: 94, y2: 0, class: 'ig-net' }),
    ...Object.entries(ZONE_RECT).map(([z, [x, y, w, hh]]) => S('rect', { x: x + 2, y: y + 2, width: w - 4, height: hh - 4, rx: 3, class: zones.includes(Number(z)) ? 'ig-mz on' : 'ig-mz', ...(zones.includes(Number(z)) ? { style: `fill:${color}` } : {}) })),
    ...Object.entries(ZONE_XY).map(([z, [x, y]]) => txt(x, y + 4, z, zones.includes(Number(z)) ? 'ig-mznum on' : 'ig-mznum')));
}
export function posCard(k) {
  const p = POS_IG[k];
  return h('article', { class: 'ig-pos', style: { '--c': p.color } },
    h('div', { class: 'ig-pos-h' }, h('strong', {}, p.name), h('span', {}, p.tag)),
    h('div', { class: 'ig-pos-b' }, fig(...p.mv), h('div', { class: 'ig-pos-c' }, miniCourt(p.zones, p.color, `Dónde suele jugar el ${p.name}: zonas ${p.zones.join(', ')}`), h('span', { class: 'ig-small-t' }, `Suele jugar en zona ${p.zones.join(', ')}`))),
    h('p', {}, p.d), h('p', { class: 'ig-ojo' }, h('strong', {}, 'Ojo: '), p.ojo));
}
export function posicionesIG(only = null) {
  const keys = only ? [only] : POS_KEYS;
  return h('figure', { class: 'ig ig-posiciones' },
    only ? null : h('div', { class: 'ig-title' }, 'Las 5 posiciones'),
    h('div', { class: 'ig-pos-grid' }, keys.map(posCard)),
    only ? null : h('figcaption', {}, 'En un equipo con sistema 5-1 juegan: 1 colocador, 1 opuesto, 2 centrales, 2 puntas y el líbero que entra por un central cuando pasa atrás.'));
}

// ---------- sistemas ----------
const SYS = {
  '5-1': { start: { 1: 'C', 2: 'P', 3: 'Ce', 4: 'O', 5: 'P', 6: 'Ce' }, d: 'Un solo colocador hace todas las colocaciones. Cuando está atrás hay 3 atacantes adelante; cuando está adelante, 2.', setter: (zone) => true },
  '6-2': { start: { 1: 'C', 2: 'P', 3: 'Ce', 4: 'C', 5: 'P', 6: 'Ce' }, d: 'Dos colocadores enfrentados: coloca el que está atrás y el de adelante ataca. Siempre hay 3 atacantes adelante.', setter: (zone) => [1, 6, 5].includes(zone) },
  '4-2': { start: { 1: 'P', 2: 'C', 3: 'Ce', 4: 'P', 5: 'C', 6: 'Ce' }, d: 'Dos colocadores enfrentados: coloca el que está adelante (desde la zona 2 o 3). Es el más fácil para empezar; siempre hay 2 atacantes.', setter: (zone) => [2, 3, 4].includes(zone) },
};
const LETTER_NAME = { C: 'colocador', P: 'punta', Ce: 'central', O: 'opuesto' };
const rotate = (lineup) => { const n = {}; for (const [z, who] of Object.entries(lineup)) n[NEXT_Z[z]] = who; return n; };
export function sistemasIG(def = '5-1') {
  let cur = def;
  const box = h('div', { class: 'stack' });
  const paint = () => {
    const sys = SYS[cur]; let lu = { ...sys.start };
    const cells = [];
    for (let r = 1; r <= 6; r++) {
      const setters = Object.entries(lu).filter(([z, w]) => w === 'C' && sys.setter(Number(z))).map(([z]) => Number(z));
      const front = Object.entries(lu).filter(([z, w]) => [2, 3, 4].includes(Number(z)) && !(w === 'C' && setters.includes(Number(z)))).length;
      cells.push(h('div', { class: 'ig-sys-cell' },
        svgBox('-4 -5 98 99', `Rotación ${r}: ${Object.entries(lu).map(([z, w]) => `zona ${z} ${LETTER_NAME[w]}`).join(', ')}`,
          S('rect', { x: 0, y: 0, width: 90, height: 90, class: 'ig-floor' }), S('line', { x1: 0, y1: 30, x2: 90, y2: 30, class: 'ig-line' }), S('line', { x1: -4, y1: 0, x2: 94, y2: 0, class: 'ig-net' }),
          ...Object.entries(lu).map(([z, w]) => { const [x, y] = ZONE_XY[z], isS = w === 'C' && setters.includes(Number(z)); return S('g', { transform: `translate(${x} ${y})`, class: `ig-sys-tok ${w === 'C' ? 'c' : ''} ${isS ? 'sets' : ''}` }, S('circle', { r: 10.5 }), txt(0, 4, w, 'ig-toknum')); })),
        h('span', { class: 'ig-small-t' }, `Rotación ${r} · ${front} atacantes adelante`)));
      lu = rotate(lu);
    }
    box.replaceChildren(h('p', { style: { margin: 0 } }, sys.d), h('div', { class: 'ig-sys-grid' }, cells),
      h('p', { class: 'ig-legend' }, h('span', { class: 'ig-dot sets' }), ' coloca en esa rotación · C colocador · O opuesto · Ce central · P punta'));
  };
  const tabs = h('div', { class: 'seg', role: 'group', 'aria-label': 'Sistema' });
  const paintTabs = () => tabs.replaceChildren(...Object.keys(SYS).map((k) => h('button', { type: 'button', 'aria-pressed': cur === k ? 'true' : 'false', onclick: () => { cur = k; paintTabs(); paint(); } }, k)));
  paintTabs(); paint();
  return h('figure', { class: 'ig ig-sistemas' }, h('div', { class: 'ig-title' }, 'Sistemas: quién coloca en cada rotación'), tabs, box,
    h('figcaption', {}, 'El primer número es cuántos atacan y el segundo cuántos colocan (5-1: cinco atacantes y un colocador). El dibujo es el orden de la rotación; en la jugada cada quien corre a su lugar.'));
}

// ---------- recepción ----------
const FORMS = {
  W: { name: 'W de 5 receptores', d: 'Cinco reciben en forma de W y el colocador espera en la red. Es la más fácil para equipos que empiezan.',
    pts: [[15, 48, 'R'], [45, 40, 'R'], [75, 48, 'R'], [28, 72, 'R'], [62, 72, 'R'], [66, 8, 'C']] },
  3: { name: '3 receptores', d: 'Reciben los dos puntas y el líbero; los demás se esconden en la red. Es la de equipos con mejor recepción.',
    pts: [[18, 58, 'P'], [45, 62, 'L'], [72, 58, 'P'], [12, 10, 'Ce'], [40, 8, 'O'], [66, 8, 'C']] },
};
export function recepcionIG() {
  const one = (f) => h('div', { class: 'ig-rec' }, h('strong', {}, f.name),
    svgBox('-4 -5 98 99', f.name, S('rect', { x: 0, y: 0, width: 90, height: 90, class: 'ig-floor' }), S('line', { x1: 0, y1: 30, x2: 90, y2: 30, class: 'ig-line' }), S('line', { x1: -4, y1: 0, x2: 94, y2: 0, class: 'ig-net' }),
      ...f.pts.map(([x, y, l]) => S('g', { transform: `translate(${x} ${y})`, class: `ig-sys-tok ${l === 'C' ? 'c sets' : ['R', 'P', 'L'].includes(l) ? 'rec' : ''}` }, S('circle', { r: 9.5 }), txt(0, 3.6, l, 'ig-toknum')))),
    h('p', { style: { margin: 0 } }, f.d));
  return h('figure', { class: 'ig' }, h('div', { class: 'ig-title' }, 'Formaciones de recepción'), h('div', { class: 'ig-rec-grid' }, one(FORMS.W), one(FORMS[3])),
    h('figcaption', {}, 'R: recibe · L: líbero · P: punta · C: colocador · Ce: central · O: opuesto. Antes del saque cada quien debe respetar el orden de su rotación (regla 7.4); en cuanto sacan, se mueven.'));
}

// ---------- fundamentos paso a paso ----------
export const STEPS = {
  saque: { name: 'El saque por arriba', mv: 'saque', steps: [[0, 'Lanza', 'Lanza el balón frente al hombro con el que pegas, a buena altura.'], [1, 'Arma', 'Codo alto, a la altura de la oreja; mano abierta y firme.'], [2, 'Golpea', 'Pega con la palma al centro del balón y pasa el peso hacia adelante.']] },
  recepcion: { name: 'Recepción de antebrazos', mv: 'recepcion', steps: [[0, 'Posición', 'Pies a lo ancho de los hombros, rodillas dobladas y peso adelante.'], [1, 'Plataforma', 'Brazos juntos y estirados; golpea con los antebrazos y apunta con los hombros al colocador.']] },
  colocacion: { name: 'La colocación (toque de dedos)', mv: 'dedos', steps: [[0, 'Debajo del balón', 'Llega antes, de frente a donde vas a colocar, manos en canasta arriba de la frente.'], [1, 'Extiende', 'Brazos y piernas se estiran juntos; el balón sale de los dedos, no de las palmas.']] },
  remate: { name: 'El remate', mv: 'aproximacion', steps: [[0, 'Arranque', 'Empieza atrás de la línea de 3 m, viendo al colocador.'], [2, 'Pasos', 'Los dos últimos pasos rápidos y largos, con los brazos hacia atrás.'], [4, 'Salto', 'Salta con los dos pies y sube los dos brazos.'], [5, 'Golpe', 'Pega arriba y adelante con la mano firme; cae con los dos pies.']] },
  bloqueo: { name: 'El bloqueo', mv: 'bloqueo', steps: [[0, 'Listo', 'De frente a la red, manos a la altura de los hombros.'], [1, 'Salto', 'Salta recto, sin tocar la red y sin ir hacia adelante.'], [2, 'Manos', 'Mete las manos al campo rival, firmes y con los dedos abiertos.']] },
  defensa: { name: 'Defensa', mv: 'defensa', steps: [[0, 'Bajo', 'Bajo y listo, con el peso adelante.'], [1, 'Lee', 'Mira al atacante y da un paso hacia donde va el balón.'], [2, 'Contacto', 'Recibe bajo y deja el balón alto en tu campo, al centro.']] },
};
export function pasosIG(skill) {
  const s = STEPS[skill]; if (!s || !MOVES[s.mv]) return null;
  const mv = MOVES[s.mv];
  return h('figure', { class: 'ig ig-pasos' }, h('div', { class: 'ig-title' }, `${s.name}: paso a paso`),
    h('ol', { class: 'ig-steps' }, s.steps.map(([f, t, d], i) => h('li', {}, h('div', { class: 'ig-fig', html: poseSVG(mv, Math.min(f, mv.frames.length - 1)) }),
      h('span', { class: 'ig-stepn' }, String(i + 1)), h('strong', {}, t), h('span', {}, d)))));
}

// ---------- side-out y contraataque ----------
export function cicloIG() {
  const row = (title, cls, items) => h('div', { class: `ig-cycle ${cls}` }, h('strong', {}, title),
    h('ol', {}, items.map(([t, i]) => h('li', {}, ic(i, 18), h('span', {}, t)))));
  return h('figure', { class: 'ig' }, h('div', { class: 'ig-title' }, 'Las dos fases del juego'),
    row('K1 · Side-out (te sacan a ti)', 'k1', [['Saca el rival', 'send'], ['Recibes', 'shield'], ['Colocas', 'hand'], ['Atacas', 'zap']]),
    row('K2 · Contraataque (sacas tú)', 'k2', [['Sacas', 'send'], ['Bloqueas', 'square'], ['Defiendes', 'shield'], ['Contraatacas', 'zap']]),
    h('figcaption', {}, 'Ganar el side-out recupera el saque y te hace rotar. En el contraataque se ganan los puntos seguidos: ahí se deciden los sets.'));
}

// Qué infografías lleva cada lección (se muestran arriba de la lección, «Míralo»).
export const LESSON_IG = {
  'r-cancha': [zonasIG], 'r-rotacion': [zonasIG, rotacionIG], 'r-zagueros': [zonasIG],
  't-saque': [() => pasosIG('saque')], 't-recepcion': [() => pasosIG('recepcion')], 't-colocacion': [() => pasosIG('colocacion')],
  't-remate': [() => pasosIG('remate')], 't-bloqueo': [() => pasosIG('bloqueo')], 't-defensa': [() => pasosIG('defensa')],
  's-posiciones': [() => posicionesIG()], 's-sistemas': [() => sistemasIG()], 's-recepcion': [recepcionIG], 'a-k1k2': [cicloIG],
};
// Muñequito del encabezado de cada lección (por habilidad).
export const SKILL_POSE = { saque: ['saque', 2], recepcion: ['recepcion', 1], colocacion: ['dedos', 1], remate: ['aproximacion', 4], bloqueo: ['bloqueo', 2], defensa: ['defensa', 2], juego: ['aproximacion', 5], fisico: ['desplazamiento', 1] };
export const heroFig = (skill) => { const [m, f] = SKILL_POSE[skill] || SKILL_POSE.juego; return fig(m, f); };
