// Kilos o libras en el gym (v3.27). Remate siempre GUARDA en kilos (así la progresión, las gráficas y los récords
// siguen funcionando aunque cambies de unidad); solo muestra y deja escribir en la unidad que elijas.
// Si anotas en libras, la serie guardada lleva u: 'lb' para recordar cómo la anotaste.
export const LB = 0.45359237;
const KEY_EX = 'remate.peso.ex', KEY_DEF = 'remate.peso.unidad';
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

export const defaultUnit = () => (read(KEY_DEF, 'kg') === 'lb' ? 'lb' : 'kg');
export const setDefaultUnit = (u) => write(KEY_DEF, u === 'lb' ? 'lb' : 'kg');
// La unidad de un ejercicio: la que elegiste para él en este celular; si no, como lo anotaste la última vez; si no, la de por omisión.
export function unitFor(exId, last) {
  const m = read(KEY_EX, {});
  if (m[exId] === 'lb' || m[exId] === 'kg') return m[exId];
  if (last) return last.u === 'lb' ? 'lb' : 'kg';
  return defaultUnit();
}
export function setUnitFor(exId, u) { const m = read(KEY_EX, {}); m[exId] = u === 'lb' ? 'lb' : 'kg'; write(KEY_EX, m); }

const num = (v) => { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
// De lo que escribiste a kilos para guardar.
export const toKg = (v, u) => { const n = num(v); if (n == null) return null; return u === 'lb' ? Math.round(n * LB * 100) / 100 : Math.round(n * 10) / 10; };
// De kilos guardados a la unidad que se muestra (libras redondeadas a 0.5, kilos a 0.1).
export const fromKg = (kg, u) => { const n = num(kg); if (n == null || n === 0) return n === 0 ? 0 : ''; return u === 'lb' ? Math.round((n / LB) * 2) / 2 : Math.round(n * 10) / 10; };
export const unitLabel = (u, each = false) => `${u === 'lb' ? 'lb' : 'kg'}${each ? ' c/u' : ''}`;
export const maxFor = (u, kgMax = 500) => (u === 'lb' ? Math.round(kgMax / LB) : kgMax);
// Texto «20 kg» o «45 lb» a partir de kilos guardados.
export const wText = (kg, u) => `${fromKg(kg, u)} ${unitLabel(u)}`;
// Cambia de unidad lo que ya escribiste en el borrador (sin perder el peso real).
export function convertDraft(entry, to) {
  const from = entry.u === 'lb' ? 'lb' : 'kg';
  if (from === to) return;
  // De libras a kilos redondea a 0.25 (lo más chico de los discos en kilos), para que 165.5 lb vuelva a 75 kg y no a 75.1.
  for (const x of entry.s || []) { const kg = toKg(x[0], from); x[0] = kg == null ? (x[0] ?? '') : String(to === 'kg' ? Math.round(kg * 4) / 4 : fromKg(kg, to)); }
  entry.u = to;
}
// Llena un borrador con lo de la vez pasada, en la unidad del ejercicio.
export const prefill = (last, n, u) => Array.from({ length: n }, (_, i) => { const v = last?.s?.[i]?.[0] ?? last?.s?.[0]?.[0]; return [v == null || v === '' ? '' : String(fromKg(v, u)), '']; });
// Incremento sugerido en la unidad: en libras, de 5 o 10 (lo que traen las máquinas y los discos en libras).
export const incIn = (u, incKg) => (u === 'lb' ? (incKg >= 5 ? 10 : 5) : incKg);
