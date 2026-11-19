// Plantillas de sesión: arma un plan en un toque y ajústalo a tu grupo.
// Cada bloque: { ex: id del ejercicio, min: minutos }. Las plantillas suman la duración indicada.
const B = (ex, min) => ({ ex, min });

// Calentamiento preventivo (v3.4): se turnan las versiones A, B y C por semana del año.
export const WARMUPS = ['ca-01', 'ca-02', 'ca-03'];
export function warmupFor(date) {
  const d = new Date(`${date}T12:00:00`), jan1 = new Date(d.getFullYear(), 0, 1);
  return WARMUPS[Math.floor((d - jan1) / (7 * 864e5)) % WARMUPS.length];
}
// Plan de una plantilla para una fecha. Con prevent, el calentamiento dinámico (fi-01) se cambia por el preventivo de esa semana.
export const planFromTemplate = (t, date, prevent = true) => t.blocks.map((b) => ({ ...b, ex: prevent && b.ex === 'fi-01' ? warmupFor(date) : b.ex, note: '' }));

export const TEMPLATES = [
  { id: 't-fund-90', name: 'Fundamentos', levels: [1, 1], minutes: 90, focus: ['recepcion', 'colocacion', 'saque'],
    desc: 'Primer contacto con plataforma, dedos y saque por abajo, con mucho juego en parejas.',
    blocks: [B('fi-01', 10), B('re-01', 15), B('co-01', 15), B('sa-01', 15), B('fi-03', 10), B('ju-01', 20), B('fi-10', 5)] },
  { id: 't-rally-90', name: 'Rally', levels: [1, 2], minutes: 90, focus: ['recepcion', 'colocacion', 'defensa'],
    desc: 'Los tres contactos con comunicación, saque desde la línea y defensa de balones lanzados.',
    blocks: [B('fi-01', 10), B('re-02', 15), B('co-02', 15), B('sa-01', 10), B('de-02', 10), B('ju-01', 25), B('fi-10', 5)] },
  { id: 't-saque-recepcion-90', name: 'Saque y recepción', levels: [2, 4], minutes: 90, focus: ['saque', 'recepcion'],
    desc: 'Saque por arriba y flotado, recepción en formación y mucho 3 contra 3.',
    blocks: [B('fi-01', 10), B('sa-02', 15), B('re-03', 20), B('sa-04', 15), B('ju-02', 25), B('fi-10', 5)] },
  { id: 't-colocacion-ataque-90', name: 'Colocación y ataque', levels: [2, 4], minutes: 90, focus: ['colocacion', 'remate'],
    desc: 'Aproximación, pase alto a zona 4 y cadena completa de recepción, colocación y remate.',
    blocks: [B('fi-01', 10), B('rm-02', 10), B('co-03', 15), B('rm-04', 20), B('re-04', 20), B('ju-02', 10), B('fi-10', 5)] },
  { id: 't-defensa-bloqueo-90', name: 'Defensa y bloqueo', levels: [2, 5], minutes: 90, focus: ['defensa', 'bloqueo'],
    desc: 'Pasos y salto de bloqueo, defensa por zonas y bloqueo en pareja con cobertura.',
    blocks: [B('fi-01', 10), B('bl-01', 10), B('bl-02', 15), B('de-04', 15), B('bl-03', 20), B('ju-02', 15), B('fi-10', 5)] },
  { id: 't-sistema-90', name: 'Ataque y sistema', levels: [4, 6], minutes: 90, focus: ['remate', 'defensa', 'juego'],
    desc: 'Colocación con variedad, ataque contra bloqueo con cobertura y transición defensa-ataque.',
    blocks: [B('fi-01', 10), B('co-04', 15), B('rm-06', 20), B('de-05', 20), B('ju-04', 20), B('fi-10', 5)] },
  { id: 't-situacional-90', name: 'Juego situacional', levels: [4, 6], minutes: 90, focus: ['juego', 'saque', 'recepcion'],
    desc: 'Saque con intención, recepción medida, decisiones con pausa y rondas de saque y side-out.',
    blocks: [B('fi-01', 10), B('sa-03', 12), B('re-05', 15), B('ju-05', 18), B('ju-06', 25), B('fi-10', 10)] },
  { id: 't-fisico-60', name: 'Físico y prevención', levels: [1, 6], minutes: 60, focus: ['fisico'],
    desc: 'Tobillos, aterrizaje, saltos con conos, fuerza con peso corporal y tronco.',
    blocks: [B('fi-01', 10), B('fi-02', 8), B('fi-03', 8), B('fi-04', 10), B('fi-05', 12), B('fi-06', 8), B('fi-10', 4)] },
  { id: 't-mixta-60', name: 'Sesión corta mixta', levels: [1, 3], minutes: 60, focus: ['recepcion', 'colocacion', 'saque', 'juego'],
    desc: 'Para días con poco tiempo: calentamiento, tres fundamentos y juego.',
    blocks: [B('fi-01', 10), B('re-02', 12), B('co-02', 12), B('sa-01', 10), B('ju-01', 16)] },
];
export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));
