// Atajos para dibujar diagramas (ver court.js para el sistema de coordenadas).
export const P = (x, y, l, c) => ({ t: 'p', x, y, l, c });          // jugador
export const K = (x, y) => ({ t: 'k', x, y });                      // cono
export const B = (x, y) => ({ t: 'b', x, y });                      // balón
export const A = (x1, y1, x2, y2, k = 'move') => ({ t: 'a', from: [x1, y1], to: [x2, y2], k }); // flecha
export const Z = (x, y, w, h, l) => ({ t: 'z', x, y, w, h, l });   // zona
export const T = (x, y, text, s) => ({ t: 'x', x, y, text, s });   // texto
export const half = (...items) => ({ view: 'half', items });
export const full = (...items) => ({ view: 'full', items });
