// Pantalla de entrada: jugador (código), entrenador (correo) o demo.
import { h } from '../util.js';
import { cloudConfigured } from '../cloud.js';
import { coachSignIn, coachSignUp, playerJoin, startDemo, assistantJoin } from '../auth.js';
import { note } from './ui.js';
import { VERSION } from '../version.js';

export function renderGate(onDone) {
  let tab = 'player';
  let signup = false;
  const box = h('div', { class: 'box' });
  const wrap = h('div', { class: 'gate' },
    h('div', {}, h('div', { class: 'brand' }, 'Remate'), h('p', { class: 'tag' }, 'Entrena voleibol de sala, de tus primeros toques al nivel competitivo.')),
    box,
    h('button', { class: 'btn ghost', type: 'button', style: { color: '#fff' }, onclick: () => { startDemo(); onDone(); } }, 'Probar el modo demo'),
    h('p', { class: 'gate-ver' }, `Remate v${VERSION}`));

  const busy = (btn, fn) => async (e) => {
    e?.preventDefault(); const msg = box.querySelector('[data-msg]');
    btn.disabled = true; msg.hidden = true; msg.textContent = '';
    try { await fn(); onDone(); } catch (err) {
      msg.className = `note ${err.info ? '' : 'bad'}`; msg.textContent = err.message || String(err); msg.hidden = false;
    } finally { btn.disabled = false; }
  };

  function paint() {
    box.replaceChildren();
    if (!cloudConfigured()) {
      box.append(h('h2', {}, 'Modo demo'),
        h('p', {}, 'Esta copia de Remate todavía no está conectada a Supabase. Puedes probarla con datos de ejemplo: todo se guarda solo en este navegador.'),
        note('Para conectarla, llena el archivo config.js (el LEEME explica cómo).'));
      return;
    }
    box.append(h('div', { class: 'seg', role: 'group', 'aria-label': '¿Quién eres?' },
      h('button', { type: 'button', 'aria-pressed': String(tab === 'player'), onclick: () => { tab = 'player'; paint(); } }, 'Soy jugador'),
      h('button', { type: 'button', 'aria-pressed': String(tab === 'coach'), onclick: () => { tab = 'coach'; paint(); } }, 'Soy entrenador'),
      h('button', { type: 'button', 'aria-pressed': String(tab === 'assistant'), onclick: () => { tab = 'assistant'; paint(); } }, 'Soy asistente')));
    const msg = h('div', { class: 'note bad', 'data-msg': '', role: 'alert', hidden: true });
    if (tab === 'player') {
      const code = h('input', { type: 'text', class: 'codeinput', maxlength: 8, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Código de 6 caracteres', placeholder: 'ABC123' });
      const go = h('button', { class: 'btn ball', type: 'submit' }, 'Entrar');
      const form = h('form', { class: 'stack' },
        h('div', { class: 'field' }, h('label', { for: 'code' }, 'Tu código'), Object.assign(code, { id: 'code' }),
          h('span', { class: 'hint' }, 'Te lo da tu entrenador. Son 6 letras y números.')), msg, go);
      form.addEventListener('submit', busy(go, () => playerJoin(code.value)));
      box.append(form);
    } else if (tab === 'assistant') {
      const email = h('input', { type: 'email', id: 'em', autocomplete: 'email', required: true });
      const pass = h('input', { type: 'password', id: 'pw', autocomplete: signup ? 'new-password' : 'current-password', required: true, minlength: 6 });
      const code = h('input', { type: 'text', id: 'inv', class: 'codeinput', maxlength: 8, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'ABC123' });
      const go = h('button', { class: 'btn primary', type: 'submit' }, signup ? 'Crear cuenta y entrar' : 'Entrar');
      const form = h('form', { class: 'stack' },
        h('p', { class: 'row-sub', style: { margin: 0 } }, 'Para asistentes adultos que ayudan a pasar lista y a capturar partidos. El entrenador te da un código de invitación.'),
        h('div', { class: 'field' }, h('label', { for: 'em' }, 'Tu correo'), email),
        h('div', { class: 'field' }, h('label', { for: 'pw' }, 'Contraseña'), pass, signup ? h('span', { class: 'hint' }, 'Mínimo 6 caracteres.') : null),
        h('div', { class: 'field' }, h('label', { for: 'inv' }, 'Código de invitación'), code),
        msg, go,
        h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { signup = !signup; paint(); } }, signup ? 'Ya tengo cuenta' : 'Es mi primera vez: crear cuenta'));
      form.addEventListener('submit', busy(go, () => assistantJoin(email.value, pass.value, code.value, { signup })));
      box.append(form);
    } else {
      const email = h('input', { type: 'email', id: 'em', autocomplete: 'email', required: true });
      const pass = h('input', { type: 'password', id: 'pw', autocomplete: signup ? 'new-password' : 'current-password', required: true, minlength: 6 });
      const go = h('button', { class: 'btn primary', type: 'submit' }, signup ? 'Crear cuenta' : 'Entrar');
      const form = h('form', { class: 'stack' },
        h('div', { class: 'field' }, h('label', { for: 'em' }, 'Correo'), email),
        h('div', { class: 'field' }, h('label', { for: 'pw' }, 'Contraseña'), pass, signup ? h('span', { class: 'hint' }, 'Mínimo 6 caracteres.') : null),
        msg, go,
        h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { signup = !signup; paint(); } }, signup ? 'Ya tengo cuenta' : 'Crear cuenta de entrenador'));
      form.addEventListener('submit', busy(go, async () => {
        if (signup) {
          const r = await coachSignUp(email.value, pass.value);
          if (r.needsConfirm) { const e = new Error('Cuenta creada. Confirma tu correo con el enlace que te enviamos y luego entra.'); e.info = true; throw e; }
        } else await coachSignIn(email.value, pass.value);
      }));
      box.append(form);
    }
  }
  paint();
  return wrap;
}
