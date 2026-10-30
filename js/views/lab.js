// Laboratorio del entrenador: tu salto vertical, tu visión de juego y tu coaching. Solo lo ve el entrenador.
import { h, ic, fmtDate } from '../util.js';
import { state, profile, labReady } from '../store.js';
import { summary, programPosition } from '../lab-calc.js';
import { note } from './ui.js';
import labSalto from './lab-salto.js';
import labVision, { visionStats } from './lab-vision.js';
import labCoaching from './lab-coaching.js';

const SUB = { salto: labSalto, vision: labVision, coaching: labCoaching };

export const missingSqlNote = () => note('Tu base de datos todavía no tiene las tablas nuevas. Abre Supabase, ve a SQL Editor, pega el archivo instalar.sql actualizado y presiona Run. Es seguro: no borra nada. Mientras tanto, aquí puedes ver el contenido pero no guardar.', 'bad');

export default function lab(ctx) {
  const sub = SUB[ctx.args[0]];
  if (sub) {
    const v = sub(ctx);
    if (!labReady()) v.el.prepend(missingSqlNote());
    return v;
  }
  const pr = profile(), cmj = summary(state.data.jumpTests, 'cmj') || summary(state.data.jumpTests, 'cmj_arms');
  const pos = programPosition(pr.program_start);
  const vis = visionStats(state.data.decisions).recent;
  const lastLog = state.data.coachLogs.map((l) => l.log_date).sort().pop();
  const card = (href, icon, title, text, stat) => h('a', { class: 'labcard', href },
    h('span', { class: 'lc-ic' }, ic(icon, 26)), h('span', { class: 'lc-t' }, h('strong', {}, title), h('span', {}, text)),
    stat ? h('span', { class: 'chip ball' }, stat) : null, ic('chevron-right', 20));
  const el = h('div', { class: 'page' },
    labReady() ? null : missingSqlNote(),
    h('p', { style: { margin: 0 } }, 'Tu espacio para mejorar como jugador y como entrenador. Tus jugadores no ven nada de esta sección.'),
    h('div', { class: 'labcards' },
      card('#/lab/salto', 'zap', 'Salto vertical', 'Pruebas, programa de 12 semanas y bitácora de carga.',
        pos && !pos.notStarted && !pos.finished ? `Semana ${pos.week} de 12` : cmj ? `Mejor salto: ${cmj.best} cm` : null),
      card('#/lab/vision', 'eye', 'Visión de juego', 'Situaciones de partido: elige la mejor decisión y mide tu tiempo.',
        vis.n ? `${vis.pct}% de aciertos` : null),
      card('#/lab/coaching', 'messages-square', 'Coaching', 'Bitácora, autoevaluación del mes y guías para entrenar y dirigir.',
        lastLog ? `Última entrada: ${fmtDate(lastLog, { day: 'numeric', month: 'short' })}` : null)));
  return { title: 'Laboratorio', sub: 'Solo tú lo ves', back: '#/mas', el };
}
