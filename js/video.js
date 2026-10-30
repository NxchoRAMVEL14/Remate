// Videos de YouTube o Drive con marcas de tiempo.
export function ytId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('youtu.be')) return u.pathname.slice(1).split('/')[0] || null;
    if (u.hostname.endsWith('youtube.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const m = u.pathname.match(/\/(live|shorts|embed)\/([^/?]+)/);
      if (m) return m[2];
    }
  } catch { /* no es URL */ }
  return null;
}
export const isUrl = (s) => /^https?:\/\/\S+\.\S+/i.test(String(s || '').trim());
// Abre el video en ese segundo (solo YouTube permite saltar al minuto desde el enlace).
export const atTime = (url, t) => { const id = ytId(url); return id ? `https://www.youtube.com/watch?v=${id}&t=${Math.max(0, Math.floor(t || 0))}s` : url; };
export function parseTime(s) {
  const p = String(s || '').trim().split(':').map((x) => x.trim());
  if (!p[0] || p.some((x) => !/^\d+$/.test(x)) || p.length > 3) return null;
  return p.reduce((a, x) => a * 60 + Number(x), 0);
}
export function fmtClock(t) {
  t = Math.max(0, Math.floor(t || 0));
  const hh = Math.floor(t / 3600), mm = Math.floor((t % 3600) / 60), ss = String(t % 60).padStart(2, '0');
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
}
