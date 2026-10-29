// Tema claro, oscuro o automático. Se recuerda en este navegador.
import { ls } from './store.js';

const KEY = 'remate.theme';
export const THEMES = { auto: 'Automático (como tu celular)', light: 'Claro', dark: 'Oscuro' };
export const getTheme = () => (THEMES[ls.get(KEY)] ? ls.get(KEY) : 'auto');
export function applyTheme() {
  const t = getTheme(), root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0F2A55' : '#12356F');
}
export function setTheme(t) { if (THEMES[t]) { ls.set(KEY, t); applyTheme(); } }
