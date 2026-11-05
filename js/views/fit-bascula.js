// Remate Fit · báscula y pasos más rápido (v3.15): leer una captura de pantalla (de la app de tu báscula, como OKOK,
// o de Samsung Health), guardar % de grasa y masa muscular, anotar de ayer y un aviso diario en el calendario.
// La captura se lee en el celular (Tesseract.js, como «Leer de una imagen»): no se manda a ningún servidor.
// v3.16: cualquier día (no solo hoy o ayer), la vista «Semana» de Google Fit con varios días a la vez,
// puntos cardio y minutos de cardio.
import { h, ic, toast, openSheet, todayStr, addDays, fmtDate, download, buildICS, googleCalUrl, weeklyRule, nextWeekday, DAYS } from '../util.js';
import { field, note, options } from './ui.js';
import { num } from '../lab-calc.js';

const r1 = (x) => Math.round(x * 10) / 10;
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/(\d),(\d)/g, '$1.$2').replace(/[|]/g, ' ').replace(/[ \t]+/g, ' ');

// Busca el número que va con una etiqueta: en la misma línea o en las 2 siguientes.
function near(lines, label, { unit = null, min, max, avoid = null, above = false }) {
  for (let i = 0; i < lines.length; i++) {
    if (!label.test(lines[i]) || (avoid && avoid.test(lines[i]))) continue;
    // Algunas apps ponen el número grande arriba y la etiqueta abajo («78.4 kg» y luego «Peso»).
    if (above) for (const k of [1, 2]) {
      const ln = lines[i - k]; if (!ln || /[a-z]{3,}/.test(ln.replace(/kg|lb/g, '')) || /\d{4}[/-]\d{1,2}|\d{1,2}:\d{2}/.test(ln)) continue;
      const m = ln.match(/(\d{1,3}(?:\.\d{1,2})?)\s*(?:kg)?/); if (m && Number(m[1]) >= min && Number(m[1]) <= max) return Number(m[1]);
    }
    for (let k = 0; k <= 2 && i + k < lines.length; k++) {
      // En la misma línea, solo lo que viene después de la etiqueta (y antes de la siguiente palabra con número).
      const ln = k === 0 ? lines[i].slice(lines[i].search(label)).replace(label, ' ').replace(/^([^a-z]*(?:kg|%|lb)?).*$/, '$1') : lines[i + k];
      if (k > 0 && avoid && avoid.test(ln)) break;
      const re = unit ? new RegExp(`(\\d{1,3}(?:\\.\\d{1,2})?)\\s*${unit}`, 'g') : /(\d{1,3}(?:\.\d{1,2})?)/g;
      for (const m of ln.matchAll(re)) { const v = Number(m[1]); if (v >= min && v <= max) return v; }
    }
  }
  return null;
}
// Lo que se pueda leer de la captura de una báscula inteligente.
export function parseScale(text) {
  const lines = norm(text).split('\n').map((s) => s.trim()).filter(Boolean);
  const out = {};
  out.kg = near(lines, /\bpeso\b|\bweight\b/, { unit: 'kg', min: 30, max: 250, above: true, avoid: /ideal|objetivo|meta|perder|ganar|control|magro|sin grasa/ })
    ?? near(lines, /\bpeso\b|\bweight\b/, { min: 30, max: 250, avoid: /ideal|objetivo|meta|perder|ganar|control|magro|sin grasa/ });
  if (out.kg == null) {        // sin etiqueta: el primer número con kg que parezca peso
    const busy = /musc|osea|hueso|grasa|magro|agua|proteina|visceral/;
    for (let i = 0; i < lines.length; i++) { const ln = lines[i]; if (busy.test(ln) || busy.test(lines[i - 1] || '')) continue; const m = ln.match(/(\d{2,3}(?:\.\d{1,2})?)\s*kg/); if (m && Number(m[1]) >= 30 && Number(m[1]) <= 250) { out.kg = Number(m[1]); break; } }
  }
  out.grasa = near(lines, /grasa corporal|% ?grasa|grasa\b|body ?fat|\bfat\b/, { unit: '%', min: 3, max: 70, avoid: /visceral|subcut|masa grasa/ });
  const musKg = near(lines, /masa muscular|musculo|muscle mass|muscle/, { unit: 'kg', min: 15, max: 120, avoid: /esquelet|skeletal|tasa/ });
  const musPct = musKg == null ? near(lines, /masa muscular|musculo|muscle mass|muscle/, { unit: '%', min: 15, max: 90, avoid: /esquelet|skeletal/ }) : null;
  if (musKg != null) out.musculo = musKg; else if (musPct != null) out.musculoPct = musPct;
  const st = parseSteps(text); if (st != null) out.pasos = st;
  // v3.19: apps con composición completa (OKOK y parecidas): peso sin grasa, grasa visceral, metabolismo y músculo esquelético.
  if (/peso sin grasa|grado de obesidad|edad metabolica|esqueletic|fat.?free|visceral/.test(lines.join(' '))) Object.assign(out, parseFull(lines, out));
  return out;
}

// v3.19: el lector a veces confunde 3 con 2 en las letras redondas de algunas apps. Se prueban esas
// variantes y se queda la que cuadra con las cuentas: grasa en kg = peso × % / 100, peso sin grasa = peso − grasa, etc.
const SWAP = { 2: ['3'], 3: ['2'] };
function variants(v) {
  const t = String(v), out = new Set([v]);
  for (let i = 0; i < t.length; i++) for (const c of SWAP[t[i]] || []) out.add(Number(t.slice(0, i) + c + t.slice(i + 1)));
  return [...out];
}
const NUM_RE = /(?<![\d/:.])(\d{1,4}(?:\.\d{1,2})?)(?![\d/:])/g;
const numsOf = (ln) => [...ln.matchAll(NUM_RE)].map((m) => Number(m[1]));
// El número que va con una etiqueta: en la misma línea, o en una línea solo con número justo abajo o arriba.
function labeled(lines, label, ok, avoid = null) {
  for (let i = 0; i < lines.length; i++) {
    if (!label.test(lines[i]) || (avoid && avoid.test(lines[i]))) continue;
    const same = numsOf(lines[i].slice(lines[i].search(label))).filter(ok);
    if (same.length) return same[0];
    for (const k of [1, -1, 2, -2]) {
      const ln = lines[i + k]; if (!ln || /[a-z]/.test(ln.replace(/kg|obese|obeso|saludable|perfecto|bajo|alto|grave|normal|bueno/g, ''))) continue;
      const xs = numsOf(ln).filter(ok); if (xs.length) return xs[0];
    }
  }
  return null;
}
function parseFull(lines, got) {
  const out = {}, all = lines.filter((l) => !/\d{4}[/-]\d{1,2}|\d{1,2}:\d{2}/.test(l)).flatMap(numsOf);
  // El peso sale grande arriba y otra vez en la lista: si un número de peso se repite, ese es.
  const freq = {}; for (const v of all) if (v >= 30 && v <= 250) freq[v] = (freq[v] || 0) + 1;
  const rep = Object.entries(freq).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1])[0];
  if (rep && Number(rep[0]) !== got.kg) out.kg = Number(rep[0]);
  const kg = out.kg ?? got.kg;
  if (!(kg > 0)) return out;
  // Peso sin grasa: con 2 decimales casi siempre; entre 40% y 95% del peso.
  const ffOk = (v) => v > kg * 0.4 && v < kg * 0.95;
  let ffm = labeled(lines, /peso sin grasa|masa libre de grasa|fat.?free|lean body/, ffOk);
  if (ffm == null) {   // sin etiqueta legible: un número con 2 decimales que cuadre con el % de grasa leído
    const c = all.find((v) => ffOk(v) && /\.\d\d$/.test(String(v)));
    if (c != null && (got.grasa == null || variants(got.grasa).some((g) => Math.abs(g - (1 - c / kg) * 100) < 0.6))) ffm = c;
  }
  if (ffm != null) {
    out.ffm = Math.round(ffm * 100) / 100;
    out.grasa = r1((1 - ffm / kg) * 100);   // el % de grasa sale exacto del peso y el peso sin grasa
  }
  const visc = labeled(lines, /visceral/, (v) => v >= 1 && v <= 59);
  if (visc != null) out.visc = visc;
  const bmr = labeled(lines, /metabolismo|metabolismo basal|\bbmr\b|tasa metabolica/, (v) => v >= 800 && v <= 4500, /edad/)
    ?? all.find((v) => v >= 900 && v <= 4500 && !(v >= 1990 && v <= 2099 && Number.isInteger(v) && !lines.some((l) => l.includes(`${v}.0`)))) ?? null;
  if (bmr != null) out.bmr = Math.round(bmr);
  // Pares % ↔ kg que cuadran con el peso (con las variantes 2↔3): músculo total y músculo esquelético.
  const pairs = [];
  const nums = [...new Set(all)].filter((v) => v >= 10 && v <= 150);
  for (const a of nums) for (const pa of variants(a)) {
    if (!(pa >= 15 && pa <= 90)) continue;
    for (const b of nums) for (const kb of variants(b)) {
      if (kb === pa || !(kb >= 8 && kb <= 150)) continue;
      const err = Math.abs((kg * pa) / 100 - kb);
      if (err <= 0.08) pairs.push({ pa, kb, err });
    }
  }
  const best = (lo, hi) => pairs.filter((p) => p.pa >= lo && p.pa <= hi && (out.grasa == null || Math.abs(p.pa - out.grasa) > 1)).sort((x, y) => x.err - y.err)[0];
  const mus = best(55, 90);              // músculo total (incluye el del corazón y los órganos): 55 a 90%
  if (mus && got.musculo == null) { out.musculo = r1(mus.kb); delete out.musculoPct; }
  if (/esquelet|skeletal/.test(lines.join(' '))) {
    // El agua (45 a 65%) y el músculo esquelético (25 a 50%) se enciman: si hay los dos, el esquelético es el de % más bajo.
    const cand = pairs.filter((p) => p.pa >= 25 && p.pa <= 60 && p.err <= 0.06 && p.kb !== out.visc && (out.grasa == null || Math.abs(p.pa - out.grasa) > 1) && p.kb < (out.musculo ?? got.musculo ?? 999));
    const pcts = [...new Set(cand.map((p) => p.pa))].sort((a, b) => a - b);
    const pick = /agua|water/.test(lines.join(' ')) && pcts.length >= 2 ? pcts[0] : cand.sort((x, y) => x.err - y.err)[0]?.pa;
    const smm = cand.filter((p) => p.pa === pick).sort((x, y) => x.err - y.err)[0];
    if (smm) out.smm = r1(smm.kb);
  }
  return out;
}
// Pasos (Samsung Health, Google Fit, el reloj): «8,532 pasos», «Pasos 8532».
export function parseSteps(text) {
  const t = String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const n = (s) => Number(String(s).replace(/[.,\s]/g, ''));
  const ok = (v) => v >= 0 && v <= 80000;
  let m = t.match(/(\d{1,3}(?:[.,\s]\d{3})+|\d{2,6})\s*(?:pasos|steps)/);
  if (m && ok(n(m[1]))) return n(m[1]);
  const lines = t.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/pasos|steps/.test(lines[i])) continue;
    for (const ln of [lines[i], lines[i + 1] || '', lines[i + 2] || '']) { m = ln.match(/(\d{1,3}(?:[.,\s]\d{3})+|\d{3,6})/); if (m && ok(n(m[1])) && !/meta|objetivo|goal/.test(ln)) return n(m[1]); }
  }
  return null;
}

// v3.16: varios días en una captura (vista «Semana» de Google Fit, Samsung Health…):
// «Domingo, 1 de noviembre» y abajo «10,291 pasos» (o «35 puntos cardio»). Devuelve [{day, n, pc}].
const MES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12,
  jan: 1, apr: 4, aug: 8, dec: 12 };
const MES_RE = '(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic|jan|apr|aug|dec)[a-z]*\\.?';
const pad = (x) => String(x).padStart(2, '0');
function dayOf(d, m, y, today) {
  if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12)) return null;
  let yy = y || Number(today.slice(0, 4));
  let s = `${yy}-${pad(m)}-${pad(d)}`;
  if (!y && s > today) { yy -= 1; s = `${yy}-${pad(m)}-${pad(d)}`; }   // «1 de diciembre» visto en enero es del año pasado
  return s;
}
function lineDay(ln, today) {
  if (/\d\s*[-–—]\s*\d/.test(ln)) return null;                     // «1–7 de noviembre» es el encabezado de la semana
  if (/^(hoy|today)\b/.test(ln)) return today;
  if (/^(ayer|yesterday)\b/.test(ln)) return addDays(today, -1);
  let m = ln.match(new RegExp(`(?:^|[^\\d])(\\d{1,2})\\s*(?:de\\s+)?${MES_RE}(?:\\s*(?:de|,)?\\s*(20\\d\\d))?`));
  if (m) return dayOf(Number(m[1]), MES[m[2]], m[3] ? Number(m[3]) : null, today);
  m = ln.match(new RegExp(`\\b${MES_RE}\\s+(\\d{1,2})\\b(?:,?\\s*(20\\d\\d))?`));      // inglés: «November 2»
  if (m) return dayOf(Number(m[2]), MES[m[1]], m[3] ? Number(m[3]) : null, today);
  return null;
}
const stepsIn = (ln) => { const m = ln.match(/(\d{1,3}(?:[.,\s]\d{3})+|\d{1,6}|\bo)\s*(?:pasos|steps)\b/); if (!m) return null; const v = m[1] === 'o' ? 0 : Number(m[1].replace(/[.,\s]/g, '')); return v >= 0 && v <= 80000 ? v : null; };
const pcIn = (ln) => { const m = ln.match(/(\d{1,3}|\bo)\s*(?:puntos?|pts?\.?)\s*(?:de\s+)?cardio|(\d{1,3})\s*heart\s*(?:points|pts)/); if (!m) return null; const v = m[1] === 'o' ? 0 : Number(m[1] ?? m[2]); return v >= 0 && v <= 500 ? v : null; };
export function parseActivityDays(text, today = todayStr()) {
  const lines = String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split('\n').map((x) => x.trim()).filter(Boolean);
  const out = new Map();
  let cur = null;
  for (const ln of lines) {
    const d = lineDay(ln, today);
    if (d) { cur = d <= today ? d : null; if (cur && !out.has(cur)) out.set(cur, {}); }
    if (!cur) continue;
    const o = out.get(cur), n = stepsIn(ln), pc = pcIn(ln);
    if (n != null && o.n == null) o.n = n;           // la captura se lee dos veces: gana la primera lectura
    if (pc != null && o.pc == null) o.pc = pc;
  }
  return [...out].filter(([, o]) => o.n != null || o.pc != null).map(([day, o]) => ({ day, ...o })).sort((a, b) => a.day.localeCompare(b.day));
}

// v3.16: elegir el día: Hoy, Ayer u otro (hasta un año atrás).
export const dayWord = (d, today = todayStr()) => (d === today ? 'hoy' : d === addDays(today, -1) ? 'ayer' : `el ${fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' })}`);
export function dayPicker(value, onChange, { label = '¿De qué día?' } = {}) {
  const today = todayStr(), yest = addDays(today, -1);
  const date = h('input', { type: 'date', max: today, min: addDays(today, -366), value, 'aria-label': 'Otro día' });
  const wrap = h('div', { class: 'daypick-any', role: 'group', 'aria-label': label });
  const paint = (v) => {
    const other = v !== today && v !== yest;
    wrap.replaceChildren(h('div', { class: 'seg' }, [[today, 'Hoy'], [yest, 'Ayer']].map(([d, t]) => h('button', { type: 'button', 'aria-pressed': v === d ? 'true' : 'false', onclick: () => set(d) }, t))),
      h('label', { class: `dp-other${other ? ' on' : ''}` }, h('span', {}, 'Otro día'), date));
    date.value = v;
  };
  const set = (v) => { if (!v || v > today) { toast('Elige un día de hoy para atrás'); paint(value); return; } value = v; paint(v); onChange(v); };
  date.addEventListener('change', () => set(date.value));
  paint(value);
  return wrap;
}

// Hoja «Leer una captura»: elige la imagen, la lee y deja revisar antes de guardar.
export function readShotSheet({ onSave, kind = 'bascula', day = todayStr(), onSaveMany = null, existing = () => ({}) }) {
  const fileIn = h('input', { type: 'file', accept: 'image/*', hidden: true });
  const status = h('p', { class: 'row-sub', style: { margin: 0 } });
  const bar = h('div', { class: 'fit-bar', hidden: true }, h('i', { style: { width: '0%' } }));
  const form = h('div', { class: 'stack' });
  const pick = h('button', { type: 'button', class: 'btn primary', onclick: () => fileIn.click() }, ic('camera', 18), 'Elegir la captura');
  let sheet;
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0]; if (!f) return;
    pick.disabled = true; bar.hidden = false; form.replaceChildren(); status.textContent = 'Preparando…';
    try {
      const { readImage } = await import('./importar.js');
      const text = await readImage(f, (msg, p) => { status.textContent = `${msg}…`; bar.firstChild.style.width = `${Math.round((p || 0) * 100)}%`; }, { dark: true, single: true });
      // v3.16: si la captura trae fechas (vista «Semana» de Google Fit), se guardan varios días de una vez.
      const many = kind === 'pasos' && onSaveMany ? parseActivityDays(text) : [];
      if (many.length) {
        status.textContent = `Encontré ${many.length === 1 ? '1 día' : `${many.length} días`}. Revisa los números: el lector se puede equivocar.`;
        form.replaceChildren(manyForm(many, existing, (rows) => { onSaveMany(rows); sheet?.close(); }, text));
        return;
      }
      const got = kind === 'pasos' ? { pasos: parseSteps(text) } : parseScale(text);
      const found = Object.values(got).filter((v) => v != null).length;
      status.textContent = found ? 'Revisa los números: el lector se puede equivocar.' : 'No encontré números claros. Escríbelos abajo o prueba con otra captura (que se vean grandes).';
      form.replaceChildren(entryForm(got, (data) => { onSave(data); sheet?.close(); }, kind, text, day));
    } catch (e) { status.textContent = e?.message || 'No se pudo leer la imagen.'; }
    finally { pick.disabled = false; bar.hidden = true; fileIn.value = ''; }
  });
  sheet = openSheet({ title: kind === 'pasos' ? 'Leer captura de pasos' : 'Leer captura de mi báscula', body: h('div', { class: 'stack' },
    h('p', { style: { margin: 0 } }, kind === 'pasos'
      ? 'Toma captura de pantalla de tus pasos (Google Fit, Samsung Health o la app de tu reloj) y elígela aquí. En Google Fit usa «Mi actividad → Semana»: abajo vienen los días con sus pasos y Remate los guarda todos de una vez. Si cambias a «Puntos cardio», también los lee.'
      : 'Pésate, abre la app de tu báscula (por ejemplo OKOK), toma captura de pantalla del resultado y elígela aquí. Remate busca peso, % de grasa, masa muscular y, si vienen, peso sin grasa, grasa visceral, músculo esquelético y metabolismo. Usa la captura original (las que pasan por WhatsApp salen chiquitas y se leen peor).'),
    pick, fileIn, bar, status, form,
    note('La imagen se lee en tu celular y no se guarda ni se manda a ningún lado. La primera vez descarga el lector (unos 5 MB).')) });
}

// Formulario de revisión (también sirve para escribir a mano).
export function entryForm(got = {}, onSave, kind = 'bascula', rawText = '', day0 = todayStr()) {
  let day = day0 && day0 <= todayStr() ? day0 : todayStr();
  const daySeg = dayPicker(day, (d) => { day = d; });
  const inp = (v, step, label, min, max) => h('input', { type: 'number', inputmode: 'decimal', step, min, max, value: v ?? '', 'aria-label': label });
  const kg = inp(got.kg, 0.1, 'Peso en kg', 30, 250), grasa = inp(got.grasa, 0.1, 'Grasa corporal en %', 3, 70);
  const mus = inp(got.musculo ?? got.musculoPct, 0.1, 'Masa muscular', 10, 120);
  const musUnit = h('select', { 'aria-label': 'Unidad de la masa muscular' }, options([['kg', 'kg'], ['%', '%']], got.musculoPct != null && got.musculo == null ? '%' : 'kg'));
  const pasos = h('input', { type: 'number', inputmode: 'numeric', step: 100, min: 0, max: 80000, value: got.pasos ?? '', 'aria-label': 'Pasos' });
  // v3.19: lo que dan las básculas con composición completa (OKOK y parecidas).
  const ffm = inp(got.ffm, 0.01, 'Peso sin grasa en kg', 20, 150), visc = inp(got.visc, 0.5, 'Grasa visceral', 1, 59);
  const smm = inp(got.smm, 0.1, 'Músculo esquelético en kg', 8, 80), bmr = inp(got.bmr, 1, 'Metabolismo basal en kcal', 800, 4500);
  const moreOn = [got.ffm, got.visc, got.smm, got.bmr].some((v) => v != null);
  // El % de grasa sale exacto del peso y el peso sin grasa: si cambias uno, Remate ajusta el otro.
  const sync = () => { const k = num(kg.value), f = num(ffm.value); if (k > 0 && f > 0 && f < k) grasa.value = r1((1 - f / k) * 100); };
  ffm.addEventListener('change', sync);
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  const save = () => {
    err.hidden = true;
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    const out = { day };
    const v = (el) => (el.value === '' ? null : num(el.value));
    const k = v(kg), g = v(grasa), m = v(mus), p = v(pasos);
    if (k != null) { if (!(k >= 30 && k <= 250)) return fail('El peso va de 30 a 250 kg.'); out.kg = r1(k); }
    if (g != null) { if (!(g >= 3 && g <= 70)) return fail('El % de grasa va de 3 a 70.'); out.grasa = r1(g); }
    if (m != null) { if (musUnit.value === '%') { if (!(m >= 15 && m <= 90)) return fail('La masa muscular en % va de 15 a 90.'); out.musculoPct = r1(m); } else { if (!(m >= 10 && m <= 120)) return fail('La masa muscular va de 10 a 120 kg.'); out.musculo = r1(m); } }
    if (p != null) { if (!(p >= 0 && p <= 80000)) return fail('Los pasos van de 0 a 80,000.'); out.pasos = Math.round(p); }
    const ff = v(ffm), vi = v(visc), sm = v(smm), bm = v(bmr);
    if (ff != null) { if (!(ff >= 20 && ff <= 150) || (k != null && ff >= k)) return fail('El peso sin grasa va de 20 a 150 kg y es menor que tu peso.'); out.ffm = Math.round(ff * 100) / 100; }
    if (vi != null) { if (!(vi >= 1 && vi <= 59)) return fail('La grasa visceral va de 1 a 59.'); out.visc = r1(vi); }
    if (sm != null) { if (!(sm >= 8 && sm <= 80)) return fail('El músculo esquelético va de 8 a 80 kg.'); out.smm = r1(sm); }
    if (bm != null) { if (!(bm >= 800 && bm <= 4500)) return fail('El metabolismo va de 800 a 4,500 kcal.'); out.bmr = Math.round(bm); }
    if (Object.keys(out).length === 1) return fail('Escribe por lo menos un dato.');
    onSave(out);
  };
  return h('div', { class: 'stack' },
    h('div', { class: 'field' }, h('span', { class: 'label' }, '¿De qué día?'), daySeg),
    kind === 'pasos' ? field('Pasos', pasos) : [
      h('div', { class: 'grid' }, field('Peso (kg)', kg), field('Grasa corporal (%)', grasa)),
      h('div', { class: 'grid' }, field('Masa muscular', mus), field('Unidad', musUnit)),
      h('details', { class: 'fit-more', open: moreOn ? true : null }, h('summary', {}, 'Más datos de tu báscula (opcional)'),
        h('div', { class: 'stack', style: { marginTop: '10px' } },
          h('div', { class: 'grid' }, field('Peso sin grasa (kg)', ffm, 'Afina tus calorías.'), field('Grasa visceral', visc, 'La de adentro del abdomen.')),
          h('div', { class: 'grid' }, field('Músculo esquelético (kg)', smm), field('Metabolismo (kcal)', bmr, 'El que calcula tu báscula.')))),
      got.pasos != null ? field('Pasos', pasos) : null],
    rawText ? h('details', {}, h('summary', {}, 'Ver lo que leyó'), h('pre', { class: 'fit-raw' }, rawText.slice(0, 1500))) : null,
    err,
    h('button', { type: 'button', class: 'btn primary', onclick: save }, ic('check', 18), 'Guardar'));
}

// v3.16: revisar varios días leídos de una captura y guardarlos juntos.
function manyForm(rows, existing, onSave, rawText = '') {
  const today = todayStr();
  const hasN = rows.some((r) => r.n != null), hasPc = rows.some((r) => r.pc != null);
  const fmt = (v) => Number(v).toLocaleString('es-MX');
  const items = rows.map((r) => {
    const was = existing(r.day) || {};
    const empty = (r.n ?? 0) === 0 && (r.pc ?? 0) === 0;
    const on = h('input', { type: 'checkbox', checked: r.day === today && empty ? null : true, 'aria-label': `Guardar ${fmtDate(r.day, { weekday: 'long', day: 'numeric', month: 'long' })}` });
    const n = hasN ? h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 80000, step: 1, value: r.n ?? '', placeholder: 'Pasos', 'aria-label': `Pasos del ${fmtDate(r.day)}` }) : null;
    const pc = hasPc ? h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 500, step: 1, value: r.pc ?? '', placeholder: 'Pts', 'aria-label': `Puntos cardio del ${fmtDate(r.day)}` }) : null;
    const before = [hasN && was.n != null && was.n !== r.n ? `${fmt(was.n)} pasos` : null, hasPc && was.pc != null && was.pc !== r.pc ? `${was.pc} pts` : null].filter(Boolean);
    const sub = r.day === today ? 'Hoy todavía no termina: guárdalo en la noche.' : before.length ? `Tenías ${before.join(' y ')}: se reemplaza.` : was.n != null || was.pc != null ? 'Igual a lo que ya tenías.' : 'Nuevo.';
    return { r, on, n, pc, el: h('div', { class: 'row fit-many' }, h('label', { class: 'check' }, on, h('span', { class: 'row-main' }, h('strong', {}, fmtDate(r.day, { weekday: 'short', day: 'numeric', month: 'short' })), h('span', { class: 'row-sub' }, sub))),
      h('span', { class: 'fit-many-in' }, n ? h('label', { class: 'field' }, h('span', { class: 'label' }, 'Pasos'), n) : null, pc ? h('label', { class: 'field' }, h('span', { class: 'label' }, 'Pts cardio'), pc) : null)) };
  });
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  const save = () => {
    err.hidden = true;
    const out = [];
    for (const it of items) {
      if (!it.on.checked) continue;
      const o = { day: it.r.day };
      if (it.n && it.n.value !== '') { const v = num(it.n.value); if (!(v >= 0 && v <= 80000)) { err.textContent = `Revisa los pasos del ${fmtDate(it.r.day)} (0 a 80,000).`; err.hidden = false; return; } o.n = Math.round(v); }
      if (it.pc && it.pc.value !== '') { const v = num(it.pc.value); if (!(v >= 0 && v <= 500)) { err.textContent = `Revisa los puntos cardio del ${fmtDate(it.r.day)} (0 a 500).`; err.hidden = false; return; } o.pc = Math.round(v); }
      if (Object.keys(o).length > 1) out.push(o);
    }
    if (!out.length) { err.textContent = 'Palomea por lo menos un día.'; err.hidden = false; return; }
    onSave(out);
  };
  return h('div', { class: 'stack' }, h('div', { class: 'rows' }, items.map((x) => x.el)),
    rawText ? h('details', {}, h('summary', {}, 'Ver lo que leyó'), h('pre', { class: 'fit-raw' }, rawText.slice(0, 1500))) : null,
    err, h('button', { type: 'button', class: 'btn primary', onclick: save }, ic('check', 18), 'Guardar los días palomeados'));
}

// v3.16: la actividad de un día: pasos, puntos cardio (Google Fit) y minutos de cardio.
export const CARDIO_TYPES = [['caminadora', 'Caminadora'], ['caminar', 'Caminar rápido'], ['correr', 'Correr'], ['bici', 'Bici o spinning'], ['eliptica', 'Elíptica o escaladora'], ['nadar', 'Nadar'], ['clase', 'Clase o baile'], ['cuerda', 'Cuerda o circuito'], ['trineo', 'Trineo (empujar o jalar)'], ['box', 'Saco de box'], ['otro', 'Otro']];
export function activitySheet({ day = todayStr(), cur = () => ({}), onSave, onDelete = null, title = 'Actividad del día' }) {
  const inp = (step, label, min, max) => h('input', { type: 'number', inputmode: 'numeric', step, min, max, 'aria-label': label });
  const n = inp(1, 'Pasos', 0, 80000), pc = inp(1, 'Puntos cardio', 0, 500), cmin = inp(1, 'Minutos de cardio', 0, 600);
  const tipo = h('select', { 'aria-label': 'Tipo de cardio' }, options([['', '—'], ...CARDIO_TYPES], ''));
  const fill = (d) => { const c = cur(d) || {}; n.value = c.n ?? ''; pc.value = c.pc ?? ''; cmin.value = c.cmin ?? ''; tipo.value = c.ctipo || ''; };
  fill(day);
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  let sheet;
  const save = () => {
    err.hidden = true;
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    const v = (el) => (el.value === '' ? null : num(el.value));
    const a = v(n), b = v(pc), c = v(cmin);
    if (a != null && !(a >= 0 && a <= 80000)) return fail('Los pasos van de 0 a 80,000.');
    if (b != null && !(b >= 0 && b <= 500)) return fail('Los puntos cardio van de 0 a 500.');
    if (c != null && !(c >= 0 && c <= 600)) return fail('Los minutos de cardio van de 0 a 600.');
    if (a == null && b == null && c == null) return fail('Escribe por lo menos un dato.');
    // null = borrar ese dato del día (si antes había algo).
    onSave(day, { n: a == null ? null : Math.round(a), pc: b == null ? null : Math.round(b), cmin: c == null ? null : Math.round(c), ctipo: c ? tipo.value || null : null });
    sheet?.close();
  };
  sheet = openSheet({ title, body: h('div', { class: 'stack' },
    h('div', { class: 'field' }, h('span', { class: 'label' }, '¿De qué día?'), dayPicker(day, (d) => { day = d; fill(d); })),
    field('Pasos', n),
    h('div', { class: 'grid' }, field('Puntos cardio', pc, 'Los de Google Fit (corazón).'), field('Minutos de cardio', cmin, 'Si no usas Google Fit.')),
    field('Tipo de cardio', tipo),
    err,
    h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn primary', onclick: save }, ic('check', 18), 'Guardar'),
      onDelete ? h('button', { type: 'button', class: 'btn ghost', onclick: () => { if (onDelete(day)) sheet?.close(); } }, ic('trash-2', 18), 'Borrar el día') : null),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Puntos cardio: Google Fit da 1 punto por cada minuto de actividad moderada (caminar rápido, bici) y 2 por cada minuto de actividad intensa (correr). 150 puntos a la semana equivalen a la recomendación de la OMS.')) });
}

// Aviso diario en el calendario del celular: «Anota tus pasos y tu peso».
export function dailyReminderSheet() {
  const days = new Set([0, 1, 2, 3, 4, 5, 6]);
  let time = '21:00';
  const pickDays = h('div', { class: 'daypick', role: 'group', 'aria-label': 'Días' });
  const paint = () => pickDays.replaceChildren(...[1, 2, 3, 4, 5, 6, 0].map((d) => h('button', { type: 'button', 'aria-pressed': days.has(d) ? 'true' : 'false', onclick: () => { if (days.has(d) && days.size > 1) days.delete(d); else days.add(d); paint(); } }, DAYS[d])));
  paint();
  const t = h('input', { type: 'time', value: time, onchange: (e) => { time = e.target.value || time; } });
  const url = `${location.origin}${location.pathname}#/fit`;
  const ev = () => {
    const ds = [...days], first = ds.map((d) => nextWeekday(todayStr(), d)).sort()[0];
    return { uid: 'remate-fit-diario', summary: 'Remate Fit: anota tus pasos y tu peso', date: first, time, minutes: 5, rrule: weeklyRule(ds), desc: `Abre Remate Fit: ${url}`, alarm: 0 };
  };
  openSheet({ title: 'Aviso diario', body: h('div', { class: 'stack' },
    h('p', { style: { margin: 0 } }, 'Agrega a tu calendario un aviso que se repite y te recuerda anotar tus pasos y tu peso. El aviso trae el enlace a Remate Fit.'),
    pickDays, field('Hora', t, 'En la noche para los pasos del día; o en la mañana, después de pesarte.'),
    h('div', { class: 'cluster' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => { download('remate-fit-aviso-diario.ics', buildICS([ev()], 'Remate Fit'), 'text/calendar;charset=utf-8'); toast('Listo: abre el archivo para agregarlo'); } }, ic('calendar-plus', 18), 'Agregar (archivo .ics)'),
      h('button', { type: 'button', class: 'btn', onclick: () => window.open(googleCalUrl(ev()), '_blank', 'noopener') }, 'Google Calendar')),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Android: ábrelo con Google Calendar o usa el botón. iPhone: abre el archivo y toca «Agregar».')),
  actions: [{ label: 'Listo' }] });
}

// Promedio por semana de un dato de la báscula (para la gráfica de Progreso).
export function weeklyBy(body, key, weeks = 12, today = todayStr()) {
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = addDays(today, -7 * w), start = addDays(end, -6);
    const xs = body.filter((b) => b.day >= start && b.day <= end && Number(b.data?.[key]) > 0).map((b) => Number(b.data[key]));
    if (xs.length) out.push({ x: end, y: r1(xs.reduce((a, b) => a + b, 0) / xs.length), tip: `${xs.length} ${xs.length === 1 ? 'medición' : 'mediciones'} · semana al ${fmtDate(end, { day: 'numeric', month: 'short' })}` });
  }
  return out;
}
