// Categorías por edad (v3.13). En México el voleibol se juega por año de nacimiento: cuenta la edad que el jugador
// cumple en el año de la competencia (aunque todavía no sea su cumpleaños). Las de base son las de los Juegos
// Nacionales CONADE 2026; cada liga o asociación usa las suyas, por eso el entrenador las puede cambiar en Ajustes.
export const DEFAULT_CATS = [
  { id: 'infmen', name: 'Infantil menor', min: 13, max: 14 },
  { id: 'infmay', name: 'Infantil mayor', min: 15, max: 16 },
  { id: 'juvmen', name: 'Juvenil menor', min: 17, max: 18 },
  { id: 'juvmay', name: 'Juvenil mayor', min: 19, max: 20 },
  { id: 'libre', name: 'Libre', min: null, max: null },
];
export const CAT_SOURCES = [
  ['Juegos Nacionales CONADE 2026, etapa estatal (Oaxaca): categorías de voleibol por año de nacimiento', 'https://www.oaxaca.gob.mx/deporte/wp-content/uploads/sites/76/2025/11/conv_onc2026_estatal-V5.pdf'],
  ['Nacionales CONADE 2024, anexo técnico de voleibol (CONADE)', 'https://www.gob.mx/cms/uploads/attachment/file/892383/Voleibol_NC_2024.pdf'],
];

const clampAge = (x) => (x === null || x === '' || x === undefined ? null : Math.min(80, Math.max(5, Math.round(Number(x)))));
// Categorías del equipo (las de Ajustes o las de base), limpias.
export function catsOf(st) {
  const raw = Array.isArray(st?.categories) && st.categories.length ? st.categories : DEFAULT_CATS;
  return raw.slice(0, 12).map((c, i) => {
    let min = clampAge(c.min), max = clampAge(c.max);
    if (Number.isNaN(min)) min = null; if (Number.isNaN(max)) max = null;
    if (min != null && max != null && max < min) [min, max] = [max, min];
    return { id: String(c.id || `c${i}`).slice(0, 20), name: String(c.name || 'Categoría').trim().slice(0, 30), min, max };
  });
}
export const isOpen = (c) => c.min == null && c.max == null;
// Edad «cumplida en el año»: año de la competencia menos año de nacimiento.
export const yearAge = (birth, year) => (birth && /^\d{4}-/.test(birth) ? Number(year) - Number(birth.slice(0, 4)) : null);
export function fits(p, c, year) {
  if (isOpen(c)) return true;
  const a = yearAge(p?.birth_date, year);
  if (a == null) return null;                       // sin fecha de nacimiento: no se sabe
  return (c.min == null || a >= c.min) && (c.max == null || a <= c.max);
}
// La categoría de un jugador: la primera (que no sea libre) donde entra por edad.
export const catOf = (p, cats, year) => cats.find((c) => !isOpen(c) && fits(p, c, year) === true) || null;
// Años de nacimiento de una categoría: «2010-2011».
export function bornText(c, year) {
  if (isOpen(c)) return 'cualquier edad';
  if (c.min != null && c.max != null) return c.min === c.max ? `nacidos en ${year - c.min}` : `nacidos en ${year - c.max}-${year - c.min}`;
  if (c.min != null) return `nacidos en ${year - c.min} o antes`;
  return `nacidos en ${year - c.max} o después`;
}
export function ageText(c) {
  if (isOpen(c)) return 'Todas las edades';
  if (c.min != null && c.max != null) return c.min === c.max ? `${c.min} años` : `${c.min} a ${c.max} años`;
  return c.min != null ? `${c.min} años o más` : `${c.max} años o menos`;
}
