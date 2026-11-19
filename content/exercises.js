// Biblioteca de ejercicios: los de Remate más los que agregues tú (se guardan en la nube o en el demo).
import saque from './ex-saque.js';
import recepcion from './ex-recepcion.js';
import colocacion from './ex-colocacion.js';
import remate from './ex-remate.js';
import bloqueoDefensa from './ex-bloqueo-defensa.js';
import fisico from './ex-fisico.js';
import juego from './ex-juego.js';
import LAB from './lab-ex.js';

export const MATERIAL = { balones: 'Balones', conos: 'Conos', red: 'Red', pared: 'Pared', cuerpo: 'Peso corporal', polainas: 'Polainas (tobilleras con peso)', escalon: 'Escalón o banca' };
export const KINDS = { calentamiento: 'Calentamiento', tecnica: 'Técnica', juego: 'Juego', fisico: 'Físico', cierre: 'Cierre' };

export const BUILTIN = [...saque, ...recepcion, ...colocacion, ...remate, ...bloqueoDefensa, ...fisico, ...juego];
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
