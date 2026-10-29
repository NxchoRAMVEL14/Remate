// Diagramas de cancha en SVG. Coordenadas en metros.
//   x: 0 a 9 de izquierda a derecha, mirando hacia la red desde tu lado.
//   y: 0 es la red; positivo hacia tu fondo (hasta 9); negativo hacia el lado contrario (solo vista 'full').
// Elementos de d.items:
//   {t:'p', x, y, l:'1', c:'a|b|c'}   jugador (a = amarillo, b = blanco, c = coral)
//   {t:'k', x, y}                      cono
//   {t:'b', x, y}                      balón
//   {t:'a', from:[x,y], to:[x,y], k:'move|ball|jump'}   flecha (movimiento, trayectoria del balón, salto)
//   {t:'z', x, y, w, h, l}             zona objetivo
//   {t:'x', x, y, text, s}             texto (s = tamaño)
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PLAYER = { a: ['#F7C600', '#0C2340'], b: ['#FFFFFF', '#0C2340'], c: ['#FF7A5C', '#0C2340'] };

export function courtSVG(d, label = 'Diagrama de cancha') {
  const full = d?.view === 'full';
  const vb = full ? [-1.5, -12, 12, 24] : [-1.5, -2.5, 12, 14.5];
  const [vx, vy, vw, vh] = vb;
  const top = full ? -9 : vy;
  const id = 'm' + Math.random().toString(36).slice(2, 7);
  let s = `<svg class="court-svg" viewBox="${vb.join(' ')}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<defs>`;
  for (const [k, col] of [['move', '#FFFFFF'], ['ball', '#F7C600'], ['jump', '#FF7A5C']]) {
    s += `<marker id="${id}${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker>`;
  }
  s += `</defs>`;
  s += `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="var(--floor-free)"/>`;
  s += `<rect x="0" y="${top}" width="9" height="${9 - top}" fill="var(--floor)"/>`;
  // líneas
  const ln = (x1, y1, x2, y2, w = 0.1, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#FFFFFF" stroke-width="${w}" ${extra}/>`;
  s += ln(0, top, 0, 9) + ln(9, top, 9, 9) + ln(0, 9, 9, 9) + ln(0, 3, 9, 3, 0.08);
  if (full) s += ln(0, -9, 9, -9) + ln(0, -3, 9, -3, 0.08);
  else s += ln(0, top, 0, top); // (sin línea superior: la cancha sigue)
  // números de zona (solo mi lado), muy tenues
  for (const [n, x, y] of [[4, 1.5, 1.7], [3, 4.5, 1.7], [2, 7.5, 1.7], [5, 1.5, 6.2], [6, 4.5, 6.2], [1, 7.5, 6.2]]) {
    s += `<text x="${x}" y="${y}" text-anchor="middle" fill="#FFFFFF" fill-opacity=".16" style="font-size:2.2px;font-weight:800">${n}</text>`;
  }
  // red y antenas
  s += `<rect x="-0.35" y="-0.09" width="9.7" height="0.18" fill="#0C2340"/>`;
  s += `<line x1="0" y1="0" x2="9" y2="0" stroke="#FFFFFF" stroke-width="0.07" stroke-dasharray="0.35 0.2"/>`;
  s += `<rect x="-0.06" y="-0.55" width="0.12" height="1.1" fill="#FF7A5C"/><rect x="8.94" y="-0.55" width="0.12" height="1.1" fill="#FF7A5C"/>`;

  for (const it of d?.items || []) {
    if (it.t === 'z') {
      s += `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" rx="0.2" fill="#F7C600" fill-opacity=".2" stroke="#F7C600" stroke-width="0.08" stroke-dasharray="0.3 0.2"/>`;
      if (it.l) s += `<text x="${it.x + it.w / 2}" y="${it.y + it.h / 2 + 0.25}" text-anchor="middle" fill="#FFFFFF" style="font-size:.75px">${esc(it.l)}</text>`;
    }
  }
  for (const it of d?.items || []) {
    if (it.t === 'a') {
      const k = it.k || 'move';
      const dash = k === 'ball' ? 'stroke-dasharray="0.45 0.3"' : k === 'jump' ? 'stroke-dasharray="0.1 0.25" stroke-linecap="round"' : '';
      const col = k === 'ball' ? '#F7C600' : k === 'jump' ? '#FF7A5C' : '#FFFFFF';
      s += `<line x1="${it.from[0]}" y1="${it.from[1]}" x2="${it.to[0]}" y2="${it.to[1]}" stroke="${col}" stroke-width="0.14" ${dash} marker-end="url(#${id}${k})"/>`;
    }
  }
  for (const it of d?.items || []) {
    if (it.t === 'k') s += `<path d="M${it.x} ${it.y - 0.38}L${it.x - 0.32} ${it.y + 0.3}L${it.x + 0.32} ${it.y + 0.3}Z" fill="#FF9A3D" stroke="#0C2340" stroke-width="0.05"/>`;
    else if (it.t === 'b') s += `<circle cx="${it.x}" cy="${it.y}" r="0.3" fill="#FFFFFF" stroke="#0C2340" stroke-width="0.07"/><path d="M${it.x - 0.3} ${it.y}Q${it.x} ${it.y - 0.18} ${it.x + 0.3} ${it.y}" fill="none" stroke="#0C2340" stroke-width="0.05"/>`;
    else if (it.t === 'p') {
      const [bg, fg] = PLAYER[it.c || 'a'];
      s += `<circle cx="${it.x}" cy="${it.y}" r="0.58" fill="${bg}" stroke="#0C2340" stroke-width="0.08"/>`;
      if (it.l != null) s += `<text x="${it.x}" y="${it.y + 0.26}" text-anchor="middle" fill="${fg}" style="font-size:.75px">${esc(it.l)}</text>`;
    } else if (it.t === 'x') s += `<text x="${it.x}" y="${it.y}" text-anchor="middle" fill="#FFFFFF" style="font-size:${it.s || 0.8}px">${esc(it.text)}</text>`;
  }
  return s + '</svg>';
}
