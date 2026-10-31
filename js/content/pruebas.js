// Pruebas físicas de los jugadores. Se recomienda repetirlas cada 2 o 3 meses, siempre igual.
export const PTESTS = {
  cmj: { name: 'Salto vertical', short: 'Salto', unit: 'cm', better: 'up', min: 5, max: 120, step: 0.1,
    how: ['Manos en la cadera, baja rápido a media sentadilla y salta lo más alto posible.', 'Mídelo con My Jump (celular en cámara lenta) o con un tapete de salto.', 'Tres intentos con 1 minuto de descanso; anota el mejor.'] },
  vel10: { name: 'Velocidad 10 m', short: '10 m', unit: 's', better: 'down', min: 1, max: 6, step: 0.01,
    how: ['Calienta bien. Marca la salida y una línea a 10 m en piso que no resbale.', 'Sale parado, con un pie adelante, a la cuenta de «3, 2, 1, ya». Corre a máxima velocidad hasta pasar la línea.', 'Lo más preciso son las fotoceldas. Sin ellas: graba de lado en cámara lenta y mide del primer movimiento a cuando el tronco cruza la línea, o usa cronómetro, siempre con la misma persona.', 'Tres intentos con 2 a 3 minutos de descanso; anota el mejor (menos segundos es mejor).'] },
  alcance: { name: 'Alcance de remate', short: 'Alcance', unit: 'cm', better: 'up', min: 150, max: 380, step: 1,
    how: ['Con aproximación de remate, toca lo más alto posible una pared marcada (o una regla junto a la red).', 'Anota la marca más alta de tres intentos, en centímetros desde el piso.', 'Compárala con la red: 2.24 m femenil y 2.43 m varonil.'] },
  agilidad: { name: 'Agilidad (prueba T)', short: 'Agilidad', unit: 's', better: 'down', min: 5, max: 30, step: 0.01,
    how: ['Cuatro conos en forma de T: A en la salida, B a 9.14 m al frente, C y D a 4.57 m a cada lado de B.', 'Sprint de A a B, desplazamiento lateral a C, lateral a D, lateral de regreso a B y de espaldas hasta A. Toca la base de cada cono.', 'Sin cruzar los pies en los desplazamientos laterales. Tres intentos, anota el mejor (menos segundos es mejor).'] },
  plancha: { name: 'Plancha frontal', short: 'Plancha', unit: 's', better: 'up', min: 5, max: 600, step: 1,
    how: ['Apoyado en antebrazos y puntas, cuerpo recto de cabeza a talones.', 'Termina cuando la cadera baja o sube y no la puede corregir.', 'Un solo intento.'] },
  estatura: { name: 'Estatura', short: 'Estatura', unit: 'cm', better: 'up', min: 120, max: 230, step: 0.5,
    how: ['Descalzo, talones, glúteos y espalda contra la pared.', 'Útil para entender cambios de salto y alcance mientras crecen.'] },
};

// Cambio entre la primera y la última prueba; "mejor" según si conviene subir o bajar.
export function testTrend(list, kind) {
  const xs = list.filter((t) => t.kind === kind).sort((a, b) => `${a.test_date}${a.created_at}`.localeCompare(`${b.test_date}${b.created_at}`));
  if (!xs.length) return null;
  const first = Number(xs[0].value), last = Number(xs[xs.length - 1].value), d = Math.round((last - first) * 100) / 100;
  const better = PTESTS[kind].better === 'down' ? d < 0 : d > 0;
  return { n: xs.length, first, last, d, better: kind === 'estatura' ? null : (d === 0 ? null : better), list: xs };
}
