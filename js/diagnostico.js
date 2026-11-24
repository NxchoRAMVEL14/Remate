// Revisión de instalación (v3.35). Lee la lista de archivos de sw.js (la misma que guarda el celular para usar sin
// internet) y revisa en GitHub Pages que cada uno exista y sea de la misma versión. Sirve para dos cosas:
//  1) cuando una pantalla no abre, decir QUÉ archivo falta y en QUÉ carpeta va (en vez de solo «recarga»),
//  2) Ajustes → Revisar instalación: el autodiagnóstico completo (archivos + que cada pantalla cargue).
import { VERSION } from './version.js';

const BUST = () => `v=${Date.now()}`;
const clean = (u) => u.replace(/^\.\//, '');
// Carpeta donde va un archivo, dicho para subirlo en GitHub: «js/views», «css» o «la raíz».
export const folderOf = (u) => { const p = clean(u).split('/'); p.pop(); return p.length ? p.join('/') : 'la raíz del repositorio'; };

export async function assetList() {
  const res = await fetch(`./sw.js?${BUST()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('No encontré sw.js en la raíz del repositorio.');
  const txt = await res.text();
  const block = txt.split('ASSETS:BEGIN')[1]?.split('ASSETS:END')[0] || '';
  const cache = (txt.match(/const CACHE = '([^']+)'/) || [])[1] || '';
  return { files: [...block.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]).filter((u) => u !== './'), cache };
}

// Revisa archivos (en tandas de 8 para no saturar). Devuelve los que faltan y si sw.js es de otra versión.
export async function checkFiles(onProgress) {
  const { files, cache } = await assetList();
  const missing = []; let done = 0;
  for (let i = 0; i < files.length; i += 8) {
    await Promise.all(files.slice(i, i + 8).map(async (u) => {
      try { const r = await fetch(`${u}${u.includes('?') ? '&' : '?'}${BUST()}`, { method: 'HEAD', cache: 'no-store' }); if (!r.ok) missing.push(clean(u)); }
      catch { missing.push(clean(u)); }
      done++; onProgress?.(done, files.length);
    }));
  }
  const swVersion = cache.replace('remate-v', '');
  return { total: files.length, missing: missing.sort(), swVersion, appVersion: VERSION, versionMismatch: !!swVersion && swVersion !== VERSION };
}

// Que cada pantalla cargue: detecta archivos de versiones mezcladas («does not provide an export named…»).
export async function checkViews(onProgress) {
  const { files } = await assetList();
  const views = files.filter((u) => /^\.?\/?js\/.*\.js$/.test(u) && !/\/config\.js$/.test(u));
  const broken = []; let done = 0;
  for (const u of views) {
    try { await import(new URL(u, location.href).href); } catch (e) { broken.push({ file: clean(u), why: explain(e) }); }
    done++; onProgress?.(done, views.length);
  }
  return { total: views.length, broken };
}

export function explain(e) {
  const m = String(e?.message || e || '');
  const exp = m.match(/does not provide an export named '?"?([\w$]+)/) || m.match(/export named '([\w$]+)'/);
  if (exp) return `Pide «${exp[1]}» a otro archivo que es de una versión anterior (versiones mezcladas).`;
  if (/Failed to fetch|Importing a module script failed|error loading dynamically imported module|404/i.test(m)) return 'No se pudo descargar (falta o está en otra carpeta).';
  if (/SyntaxError|Unexpected/i.test(m)) return 'El archivo está incompleto o dañado (vuelve a subirlo).';
  return m.slice(0, 120) || 'Error desconocido';
}

// Texto corto para la pantalla de error: qué falta y dónde va.
export function missingText(r) {
  if (!r) return '';
  const parts = [];
  if (r.missing.length) {
    const by = {};
    r.missing.forEach((f) => { (by[folderOf(f)] ||= []).push(f.split('/').pop()); });
    parts.push(`${r.missing.length === 1 ? 'Falta 1 archivo' : `Faltan ${r.missing.length} archivos`} en GitHub: ${Object.entries(by).map(([d, fs]) => `${fs.join(', ')} (va en ${d})`).join('; ')}.`);
  }
  if (r.versionMismatch) parts.push(`sw.js es de la versión ${r.swVersion} y version.js de la ${r.appVersion}: sube los dos de la misma versión.`);
  return parts.join(' ');
}
