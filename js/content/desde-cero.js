// v3.38 «Desde cero»: programa para grupos que nunca han jugado voleibol.
// Dos rutas: 8 clases (de no saber nada a jugar un partido) y «Torneo exprés» de 4 clases (lo mínimo para competir).
// Cada clase trae su plan (ejercicios y minutos, suma 90), qué explicar, la regla del día y tarea para la casa.
// La secuencia (balón → posición → plataforma y dedos → saque por abajo → tres toques → rotación → partido)
// sigue la iniciación y el minivoleibol de uso común (FIVB Coaches Manual, programas de minivoleibol);
// el orden, los tiempos y los textos son de Remate.
const B = (ex, min) => ({ ex, min });

export const CERO_8 = [
  { n: 1, name: 'Conoce el balón', focus: ['recepcion'],
    goal: 'Que pierdan el miedo al balón, sepan esperar en posición y den sus primeros golpes con los antebrazos.',
    talk: 'Qué es el voleibol en una frase: el balón no puede tocar el piso de tu lado y tienes 3 toques para pasarlo.',
    rule: 'El balón que cae en la línea es bueno (está dentro).',
    home: 'Lanzar y atrapar arriba de la frente 30 veces (con cualquier balón).',
    blocks: [B('fi-01', 10), B('ce-02', 10), B('ce-01', 15), B('ce-03', 20), B('ce-06', 10), B('ju-08', 15), B('fi-10', 10)] },
  { n: 2, name: 'Toque de dedos', focus: ['colocacion'],
    goal: 'Formar la ventana con las manos y empujar el balón desde la frente con las piernas.',
    talk: 'El toque de dedos se usa para los balones que vienen altos; el golpe de antebrazos, para los que vienen bajos.',
    rule: 'No se vale atrapar ni acompañar el balón en el partido: tiene que ser un toque limpio.',
    home: '20 empujes de dedos contra la pared, con el balón arriba de la frente.',
    blocks: [B('fi-01', 10), B('ce-01', 10), B('ce-05', 20), B('co-01', 15), B('ce-04', 10), B('ce-07', 15), B('fi-10', 10)] },
  { n: 3, name: 'Golpe de antebrazos', focus: ['recepcion'],
    goal: 'Armar la plataforma, golpear con las piernas y mandar el balón alto al compañero.',
    talk: 'La recepción es el primer toque: alto y al centro de tu cancha, para que tu equipo pueda armar la jugada.',
    rule: 'Máximo 3 toques por equipo, y un mismo jugador no puede tocar dos veces seguidas.',
    home: '20 autopases de antebrazos (que el balón suba recto).',
    blocks: [B('fi-01', 10), B('ce-02', 10), B('ce-03', 15), B('re-06', 10), B('re-01', 15), B('ce-06', 10), B('ce-07', 15), B('fi-10', 5)] },
  { n: 4, name: 'Saque por abajo y rotación', focus: ['saque'],
    goal: 'Pasar la red con saque por abajo e ir alejándose; conocer las 6 zonas y cómo se rota.',
    talk: 'Cómo se cuenta: cada jugada es un punto para alguien; el que gana el punto saca.',
    rule: 'Se saca detrás de la línea de fondo, sin pisarla, y se rota solo cuando tu equipo recupera el saque.',
    home: '20 saques por abajo a la pared, por arriba de una línea a la altura de la red.',
    blocks: [B('fi-01', 10), B('ce-04', 10), B('sa-06', 15), B('sa-07', 15), B('ce-10', 10), B('ce-07', 20), B('fi-10', 10)] },
  { n: 5, name: 'Los tres toques', focus: ['recepcion', 'colocacion', 'saque'],
    goal: 'Encadenar recepción, pase y envío al otro lado; recibir el saque hacia la red.',
    talk: 'El orden ideal: recibir (antebrazos) → pasar cerca de la red (dedos) → mandar al otro lado.',
    rule: 'No se puede tocar la red ni pasar todo el pie a la cancha contraria por debajo de la red.',
    home: 'Ver un partido de voleibol (10 minutos) y contar cuántos equipos usan los 3 toques.',
    blocks: [B('fi-01', 10), B('ce-03', 10), B('ce-05', 10), B('ce-09', 20), B('ju-01', 15), B('ce-08', 15), B('fi-10', 10)] },
  { n: 6, name: 'Mini partidos', focus: ['juego'],
    goal: 'Jugar 3 contra 3 golpeando el balón, con una sola atrapada permitida por lado.',
    talk: 'En un partido gana el que menos se equivoca: saque seguro y primer toque alto.',
    rule: 'El balón que toca la antena o pasa por fuera de ella es malo.',
    home: '20 autopases alternando: uno de antebrazos y uno de dedos.',
    blocks: [B('fi-01', 10), B('ju-07', 10), B('ce-09', 15), B('ce-06', 10), B('ce-08', 25), B('ce-10', 10), B('fi-10', 10)] },
  { n: 7, name: 'Partido 6 contra 6', focus: ['juego', 'saque', 'recepcion'],
    goal: 'Jugar en cancha completa con rotación, saque y recepción, con pausas cortas para corregir.',
    talk: 'Cada quien sabe su zona y quién saca antes de empezar cada punto.',
    rule: 'Un set se gana a 25 puntos con 2 de diferencia (en principiantes se puede jugar a 15).',
    home: 'Aprender de memoria el orden de rotación del equipo.',
    blocks: [B('fi-01', 10), B('re-02', 15), B('sa-01', 15), B('ce-10', 10), B('ce-11', 30), B('fi-10', 10)] },
  { n: 8, name: 'Partido de práctica', focus: ['juego'],
    goal: 'Jugar como en el torneo: alineación, saque, recepción, rotación y tiempos fuera.',
    talk: 'Qué hacer en el torneo: llegar temprano, calentar juntos y animar al compañero que se equivoca.',
    rule: 'Cada equipo tiene 2 tiempos fuera por set (30 segundos).',
    home: 'Descansar bien la noche antes del torneo y llevar agua.',
    blocks: [B('fi-01', 10), B('ce-09', 15), B('ju-09', 15), B('ce-11', 40), B('fi-10', 10)] },
];

export const CERO_4 = [
  { n: 1, name: 'Balón, posición y antebrazos', focus: ['recepcion'],
    goal: 'Perder el miedo al balón, esperar en posición y golpear con la plataforma.',
    talk: 'Qué es el voleibol: el balón no toca el piso de tu lado y tienes 3 toques para pasarlo.',
    rule: 'Máximo 3 toques por equipo; el balón en la línea es bueno.',
    home: '30 lanzamientos y atrapadas arriba de la frente y 20 autopases de antebrazos.',
    blocks: [B('fi-01', 10), B('ce-02', 10), B('ce-01', 10), B('ce-03', 20), B('ce-06', 10), B('ce-07', 20), B('fi-10', 10)] },
  { n: 2, name: 'Dedos y saque por abajo', focus: ['colocacion', 'saque'],
    goal: 'Empujar el balón con los dedos desde la frente y pasar la red con saque por abajo.',
    talk: 'Dedos para balones altos, antebrazos para balones bajos.',
    rule: 'Se saca detrás de la línea de fondo, sin pisarla; el que gana el punto saca.',
    home: '20 empujes de dedos y 20 saques a la pared.',
    blocks: [B('fi-01', 10), B('ce-05', 20), B('sa-06', 15), B('sa-07', 15), B('ce-08', 20), B('fi-10', 10)] },
  { n: 3, name: 'Recibir el saque y rotar', focus: ['saque', 'recepcion', 'juego'],
    goal: 'Recibir el saque hacia la red, conocer las 6 zonas, rotar y jugar con reglas reales.',
    talk: 'Se rota solo cuando tu equipo recupera el saque, como las manecillas del reloj.',
    rule: 'No se puede tocar la red; el balón que toca la antena es malo.',
    home: 'Aprender de memoria el orden de rotación del equipo.',
    blocks: [B('fi-01', 10), B('ce-09', 20), B('ce-10', 10), B('ce-08', 15), B('ce-11', 25), B('fi-10', 10)] },
  { n: 4, name: 'Partido como en el torneo', focus: ['juego'],
    goal: 'Jugar con la alineación del torneo: quién saca primero, rotación, tiempos fuera y cambios.',
    talk: 'Qué hacer en el torneo: llegar temprano, calentar juntos, saque seguro y animar al compañero.',
    rule: 'Sets a 25 con 2 de diferencia y 2 tiempos fuera por set (o lo que marque el torneo).',
    home: 'Descansar bien la noche antes del torneo y llevar agua.',
    blocks: [B('fi-01', 10), B('ce-09', 15), B('ce-10', 5), B('ce-11', 50), B('fi-10', 10)] },
];

export const ROUTES_CERO = [
  { id: '8', name: 'Desde cero (8 clases)', short: '8 clases', list: CERO_8, prefix: 't-cero-',
    desc: 'De no saber nada a jugar un partido de 6 contra 6. Ideal si tienes 4 semanas con 2 clases por semana.' },
  { id: '4', name: 'Torneo exprés (4 clases)', short: '4 clases', list: CERO_4, prefix: 't-cerot-',
    desc: 'Lo mínimo para competir: posición, antebrazos, dedos, saque por abajo, rotación y reglas. Para cuando el torneo está cerca.' },
];

// Las clases también son plantillas de 90 min (salen al elegir plantilla en cualquier entreno).
export const CERO_TEMPLATES = ROUTES_CERO.flatMap((r) => r.list.map((c) => ({
  id: `${r.prefix}${c.n}`, name: `${r.id === '8' ? 'Desde cero' : 'Torneo exprés'} ${c.n}: ${c.name}`, levels: [1, 1], minutes: 90,
  focus: c.focus, desc: c.goal, blocks: c.blocks, cero: true })));
