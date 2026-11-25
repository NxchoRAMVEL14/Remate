// Biblioteca de ejercicios: los de Remate más los que agregues tú (se guardan en la nube o en el demo).
import saque from './ex-saque.js';
import recepcion from './ex-recepcion.js';
import colocacion from './ex-colocacion.js';
import remate from './ex-remate.js';
import bloqueoDefensa from './ex-bloqueo-defensa.js';
import fisico from './ex-fisico.js';
import juego from './ex-juego.js';
import principiante from './ex-principiante.js';   // v3.30: tanda 1 (24 de Principiante)
import intermedio from './ex-intermedio.js';       // v3.31: tanda 2 (24 de Intermedio)
import avanzado from './ex-avanzado.js';           // v3.32: tanda 3 (24 de Avanzado)
import cero from './ex-cero.js';              // v3.38: Desde cero (11, antes de Principiante)
import LAB from './lab-ex.js';

export const MATERIAL = { balones: 'Balones', conos: 'Conos', red: 'Red', pared: 'Pared', cuerpo: 'Peso corporal', polainas: 'Polainas (tobilleras con peso)', escalon: 'Escalón o banca' };
export const KINDS = { calentamiento: 'Calentamiento', tecnica: 'Técnica', juego: 'Juego', fisico: 'Físico', cierre: 'Cierre' };

export const BUILTIN = [...saque, ...recepcion, ...colocacion, ...remate, ...bloqueoDefensa, ...fisico, ...juego, ...principiante, ...intermedio, ...avanzado, ...cero];
export const BUILTIN_BY_ID = Object.fromEntries(BUILTIN.map((e) => [e.id, e]));
// Los del laboratorio de salto son solo del entrenador: no salen en la biblioteca ni en lo que ve el jugador.
const LAB_BY_ID = Object.fromEntries(LAB.map((e) => [e.id, e]));

const fromCustom = (row) => ({ diagram: null, ...row.data, id: `c-${row.id}`, custom: true, dbId: row.id });
export const allExercises = (customRows = []) => [...BUILTIN, ...customRows.map(fromCustom)];
export function getExercise(id, customRows = []) {
  if (!id) return null;
  if (id.startsWith('c-')) { const r = customRows.find((x) => `c-${x.id}` === id); return r ? fromCustom(r) : null; }
  return BUILTIN_BY_ID[id] || LAB_BY_ID[id] || null;
}
export const levelLabel = (ex) => (ex.levels[0] === ex.levels[1] ? `Nivel ${ex.levels[0]}` : `Niveles ${ex.levels[0]} a ${ex.levels[1]}`);

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function filterExercises(list, { q = '', skill = '', level = 0, material = '', kind = '' } = {}) {
  const nq = norm(q);
  return list.filter((e) =>
    (!skill || e.skills.includes(skill)) &&
    (!level || (e.levels[0] <= level && level <= e.levels[1])) &&
    (!material || e.material.includes(material)) &&
    (!kind || e.kind === kind) &&
    (!nq || norm(`${e.name} ${e.goal}`).includes(nq)));
}

// v3.34: progresión de un ejercicio. El anterior y el siguiente de su mismo fundamento principal
// (técnica y juego, sin calentamientos ni físicos): el que empieza en el nivel más cercano por abajo y por arriba.
// Si empatan, el que dura parecido y es del mismo tipo.
export function progressionOf(ex, list = BUILTIN) {
  if (!ex || !(ex.kind === 'tecnica' || ex.kind === 'juego')) return { prev: null, next: null };
  const k = ex.skills[0];
  const pool = list.filter((e) => e.id !== ex.id && (e.kind === 'tecnica' || e.kind === 'juego') && e.skills[0] === k);
  const tie = (e) => Math.abs(e.min - ex.min) / 10 + (e.kind === ex.kind ? 0 : 1);
  const mid = (e) => (e.levels[0] + e.levels[1]) / 2, m0 = mid(ex);
  const prev = pool.filter((e) => e.levels[0] < ex.levels[0] || (e.levels[0] === ex.levels[0] && mid(e) < m0))
    .sort((a, b) => (m0 - mid(a)) - (m0 - mid(b)) || tie(a) - tie(b))[0] || null;
  const next = pool.filter((e) => e.levels[0] > ex.levels[0] || (e.levels[0] === ex.levels[0] && mid(e) > m0))
    .sort((a, b) => (mid(a) - m0) - (mid(b) - m0) || tie(a) - tie(b))[0] || null;
  return { prev, next };
}
