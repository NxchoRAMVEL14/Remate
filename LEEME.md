# Remate: guía para subirlo (GitHub + Supabase)

Remate es una app para entrenar voleibol de sala con chavos de prepa, del primer toque al nivel competitivo. Se instala en el celular como Escuadra (PWA). Esta es la **versión 3.4.0** (el número se ve en la entrada, en *Ajustes → Acerca de Remate* y en *Novedades*): el núcleo (jugadores, niveles, ejercicios, entrenamientos y asistencia), **partidos con estadística en vivo, rotaciones, side-out y break point, mapa de saque y ataque y video**, **convocatoria**, **ayudantes** (capitán y asistente adulto), **pruebas físicas**, **insignias**, **planeador de temporada**, **avisos** (en la app, WhatsApp y notificación al celular), **reportes imprimibles**, tu **laboratorio** (salto vertical, visión de juego y coaching), **En casa** con tareas por jugador y tu lista privada de **Mejoras**. Sin configurar nada, abre en **modo demo** con datos de ejemplo.

> **¿Ya subiste una versión anterior?** Salta a la sección **0. Actualizar desde una versión anterior**.
>
> **Para pasar a la 3.4.0 hay SQL nuevo (calendario del equipo):** primero corre en Supabase el `sql/instalar.sql` de este ZIP (SQL Editor → New query → pega todo → Run). Es seguro aunque ya hayas corrido los anteriores: incluye lo de la 3.3 (torneos y prueba de 10 m) y agrega la tabla del enlace del calendario; no borra datos. Después arrastra los archivos a GitHub. Si subes los archivos antes, no se rompe nada: lo que necesita el SQL muestra un aviso.
>
> **La función `calendario`** (la que entrega el calendario a los celulares) ya quedó instalada en tu Supabase. Si algún día la necesitas reinstalar: Supabase → Edge Functions → Deploy a new function → Via Editor, nombre `calendario`, pega `supabase/functions/calendario/index.ts` y, en sus ajustes, **apaga «Verify JWT»** (las apps de calendario no inician sesión; la protege el enlace secreto).
>
> **Archivos que ya no se usan:** `js/theme.js` y `js/video.js` (viven en `js/util.js`), `js/views/insignias.js` (vive en `js/views/card.js`), `js/content/dx.js` (vive en `js/court.js`) y `js/views/novedades.js` (vive en `js/views/ayuda.js`). Si están en tu repositorio, no estorban; puedes borrarlos cuando quieras.

Tiempo estimado: 25 minutos. Orden recomendado: 1) Supabase, 2) GitHub, 3) conectar las dos.

---

## 0. Actualizar desde una versión anterior

1. **Supabase primero:** SQL Editor → New query → pega **todo** `sql/instalar.sql` (el nuevo) → **Run**. No borra nada: solo agrega las tablas nuevas. Si lo corres dos veces no pasa nada.
2. **GitHub después:** arrastra **todo** el contenido de la carpeta nueva al repositorio, igual que la primera vez, y da **Commit changes**. GitHub reemplaza los archivos que cambiaron. El `config.js` de este ZIP ya trae la URL y la clave de tu proyecto Remate.
3. Abre la app y recarga dos veces (la primera baja la versión nueva). Si tus jugadores ya la tienen instalada, se actualiza sola la siguiente vez que la abran con internet.
   **El ícono nuevo (balón de voleibol):** Android lo cambia solo después de unos días; en iPhone hay que borrar el acceso de la pantalla de inicio y volver a agregarlo.
4. Si actualizas los archivos antes de correr el SQL, no se rompe nada: Laboratorio, Partidos, En casa y Mejoras muestran un aviso rojo y no guardan hasta que corras el SQL.
5. Si probaste el **modo demo** en ese navegador, ve a **Ajustes → Reiniciar demo** para ver los ejemplos nuevos.
6. **Notificaciones al celular:** además del SQL, necesitan la función `avisos` en Supabase (la carpeta `supabase/functions/avisos` del ZIP). Si Claude la instaló por ti con la conexión a Supabase, no tienes que hacer nada. Si no: Supabase → **Edge Functions → Deploy a new function → Via Editor**, nombre `avisos`, pega el contenido de `index.ts` y da **Deploy**. Sin la función, los avisos igual aparecen en la app y por WhatsApp.

## 1. Supabase (la base de datos)

Crea un proyecto **nuevo y separado** de Escuadra y Brida: aquí habrá datos de menores de edad.

1. En supabase.com: **New project**. Ponle nombre `remate`, guarda la contraseña de la base de datos y elige una región cercana (por ejemplo East US).
2. Ve a **SQL Editor → New query**. Abre el archivo `sql/instalar.sql` (viene en esta carpeta), copia **todo** su contenido, pégalo y da **Run**. Debe terminar con *Success*. Si lo corres otra vez no pasa nada malo.
3. Ve a **Authentication → Sign In / Providers** (en versiones anteriores: *Providers*) y activa **Allow anonymous sign-ins**. Los jugadores entran con un código, sin correo; esa opción es la que lo permite. Si no la activas, el jugador verá un aviso al intentar entrar.
4. En esa misma sección, en **Email**, tienes *Confirm email*. Para tu cuenta de entrenador puedes dejarlo activado (te llega un correo) o desactivarlo mientras pruebas. Si usas confirmación, en **Authentication → URL Configuration** pon como *Site URL* la dirección de tu GitHub Pages (paso 2.4), para que el enlace del correo no apunte a localhost.
5. Ve a **Project Settings → API** (o *API Keys*). Copia dos cosas: **Project URL** y la clave **anon public** (si solo ves la nueva, usa la **publishable**). Las usarás en el paso 3. Esa clave es pública por diseño; lo que protege los datos es la seguridad por filas que instaló el SQL. **Nunca uses la clave `service_role` en la app.**

## 2. GitHub (para publicar la app)

1. Crea un repositorio nuevo, por ejemplo `remate`. Públicos funcionan gratis con GitHub Pages; uno privado necesita plan de pago.
2. Descomprime el ZIP en tu computadora. Entra a la carpeta y selecciona **todo lo que hay dentro** (index.html, css, js, fonts, icons, vendor, sql, etc.). Arrástralo a la página del repositorio (*uploading an existing file*) y da **Commit changes**. Tiene 99 archivos, justo debajo del límite de 100 por carga.
   Importante: `index.html` debe quedar en la raíz del repositorio, no dentro de otra carpeta.
3. En el repositorio: **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama **main**, carpeta **/ (root)** y guarda. En uno o dos minutos aparece la dirección, algo como `https://tuusuario.github.io/remate/`.
4. Esa es la dirección que abres en el celular. Si usas confirmación de correo, es la que pones como *Site URL* en Supabase.

## 3. Conectar las dos

1. En GitHub abre el archivo `config.js` y presiona el lápiz (editar).
2. Pega tu **Project URL** y tu clave **anon/publishable** entre las comillas:

   ```js
   export const CONFIG = {
     SUPABASE_URL: 'https://TUPROYECTO.supabase.co',
     SUPABASE_ANON_KEY: 'tu-clave-anon-o-publishable',
   };
   ```
3. **Commit changes**. Espera un minuto y abre la app. Ya debe mostrar **Soy jugador / Soy entrenador**.
4. En **Soy entrenador → Crear cuenta de entrenador** registra tu correo. Esa cuenta es la única que administra tu equipo.

## 4. Primera prueba (10 minutos, en el celular)

Marca cada paso. Si algo falla, anota **qué tocaste y qué mensaje salió**.

- [ ] Entras como entrenador y ves la pantalla **Hoy**.
- [ ] En **Ajustes** eliges tus días y hora de entrenamiento.
- [ ] Agregas un jugador de prueba. Al guardar aparece su **código de 6 caracteres**.
- [ ] En otro celular (o ventana de incógnito) abres la app, eliges **Soy jugador** y escribes el código. Debe aparecer su tarjeta.
- [ ] Tú evalúas al jugador (botón **Evaluar**): en el celular del jugador aparece su radar.
- [ ] Creas un entrenamiento, aplicas una plantilla, lo **publicas** y el jugador lo ve en **Entrenos**.
- [ ] Pasas lista y el jugador ve su asistencia.
- [ ] El jugador pide un reto; a ti te aparece en **Hoy** para aprobarlo.
- [ ] Apagas el internet del celular, haces un cambio (por ejemplo, pasar lista) y lo vuelves a encender: arriba debe decir *por enviar* y luego desaparecer.
- [ ] Instalas la app: en Chrome, menú → *Agregar a pantalla principal*; en iPhone, Compartir → *Agregar a inicio*.
- [ ] **Partidos → Nuevo partido**. En *Captura* tocas un jugador y luego *Ace*: el marcador sube a 1-0. *Deshacer* lo regresa.
- [ ] Terminas el partido y el jugador ve el resultado y **solo sus números** en su sección *Partidos*.
- [ ] **Más → Laboratorio → Salto vertical → Mis datos**: anotas tu alcance de pie y registras una prueba.
- [ ] **Más → Reportes**: abres el reporte de un jugador, escribes un comentario y lo imprimes o guardas en PDF.
- [ ] El jugador abre **Inicio → Entrena en casa**, toca *La hice* en una rutina y tú lo ves en **Ejercicios → Para hacer en casa**.
- [ ] Tocas el **foco** de arriba, anotas una mejora y aparece en **Más → Mejoras de la app**.
- [ ] En un partido nuevo pones la **alineación** del set 1: la cancha muestra a los 6 y quién saca. Al terminar, el **Resumen** muestra side-out, break point y la tabla por rotación.
- [ ] Marcas a un jugador como **Capitán** en su ficha: en su celular aparece **Modo capitán** y puede pasar lista.
- [ ] En **Ajustes → Equipo de apoyo** invitas a un asistente; él elige **Soy asistente**, entra con su correo y el código, y solo ve **Asistir, Partidos, Avisos y Ejercicios**.
- [ ] Un jugador contesta **Voy** a un partido próximo y tú lo ves en la **Convocatoria**.
- [ ] Publicas un **aviso** desde **Hoy**: aparece en el Inicio de los jugadores. Si un jugador activó las notificaciones en Ajustes, le llega al celular.

Probar sin tocar Supabase: deja `config.js` vacío y abre la app, o usa **Probar el modo demo** en la pantalla de entrada. El demo guarda todo solo en ese navegador.

## 5. Cómo usarlo con tus grupos

- **Cada jugador tiene un código** que tú le das. Se usa en un celular a la vez. Si cambia de celular o el código se compartió, abre su ficha, **Código de acceso → Código nuevo**: el celular anterior pierde el acceso.
- **Antes de dar de alta a un menor**, pide autorización por escrito a madre, padre o tutor y marca la casilla en su ficha. Remate no guarda teléfono, domicilio, fotos ni apellidos completos: usa nombre o apodo.
- **El nivel solo sube con el examen** (botón *Examen* en la ficha). Las fases de cada habilidad te avisan cuándo conviene presentarlo: aparece como *Listo* en **Hoy** y en **Jugadores**.
- **Publicar un entrenamiento** lo hace visible para los jugadores. Al pasar lista, el entrenamiento queda como hecho y publicado, para que cada quien vea su asistencia.
- **Modo cancha** (dentro de un entrenamiento) es un cronómetro por bloques con aviso sonoro que mantiene la pantalla encendida.
- **Descargar asistencia (Excel)** está en Ajustes. También hay respaldo en archivo.
- **Partidos:** toca al jugador y luego lo que hizo (saque, recepción 0 a 3, ataque, bloqueo, defensa). Con el *marcador automático* cada ace, remate, bloqueo o error suma el punto solo. Cuando un set llega a 25 (15 el decisivo) con diferencia de 2, aparece *Cerrar set*. Si alguien más lleva el marcador oficial, tú puedes capturar solo las acciones.
- **Laboratorio** (en *Más*): solo tú lo ves. Programa de salto de 12 semanas (2 sesiones por semana), entrenador de visión de juego y bitácora de coaching.
- **Tus polainas de 5 kg por tobillo** se usan solo en ejercicios de fuerza de cadera sin impacto. Nunca para saltar.
- **Reportes** (en *Más*): por jugador y del grupo, listos para imprimir o guardar en PDF.
- **En casa**: 22 ejercicios opcionales (físico, técnica con balón y sin balón) y 3 rutinas listas, con la dosis según el nivel de cada jugador. Registrar lo que hicieron es opcional; tú ves quién entrena en casa.
- **Mejoras** (el foco de arriba o *Más → Mejoras de la app*): tu lista privada. Marca como *Lista para pedir* lo que quieras en la siguiente versión, toca *Copiar* y pégalo en el chat.
- **Rotaciones:** al empezar cada set, *Poner alineación* (zonas 1 a 6, líbero y quién saca). La cancha de la captura sigue la rotación sola y registra los cambios. Con eso el resumen te dice **side-out** (puntos ganados recibiendo), **break point** (ganados sacando) y la **rotación más débil**.
- **Marcar zona:** enciéndelo en la captura y, después de un saque o un ataque, toca dónde cayó. El resumen y la lista de partidos muestran el **mapa** del equipo o de cada jugador.
- **Video:** en el resumen del partido pega el enlace de YouTube (puede ser *No listado*) o Drive y agrega **marcas** con su minuto. En YouTube, la marca abre el video justo ahí. También puedes poner video a cada ejercicio.
- **Convocatoria:** los partidos próximos aparecen a tus jugadores con *Voy / En duda / No voy*. Tú ves quién falta por contestar y puedes recordarles por WhatsApp. Los partidos de un torneo se confirman una sola vez, en el torneo.
- **Hoja para la mesa** (en un partido, ícono de impresora): una hoja por set con las posiciones I a VI como las ve tu banca, el líbero y el orden de saque. Si recibes primero, tu primer saque es de la posición II y la hoja lo dice. Define antes las alineaciones de todos los sets (cada set nuevo se prellena con el anterior), imprímela o compártela por WhatsApp. Los jugadores necesitan número de playera.
- **Scouting de rivales** (*Partidos → Scouting de rivales*, o desde el resumen de un partido): ficha privada por rival con sistema, rotación débil, a dónde sacan, jugadores clave (por número y posición), fortalezas, debilidades y plan. Abajo, lo que dicen tus partidos contra ellos: historial, side-out, break point, tu rotación más débil y dónde caen tus saques y ataques. Solo tú la ves (se guarda en tu perfil). Anota por número; evita datos personales o de salud de jugadores de otros equipos.
- **Calendario en el celular** (*Entrenos* del jugador o *Entrenamientos* para ti): activa el enlace del equipo y avisa a tus jugadores. Con *Suscribirme* (iPhone) o *Google Calendar* les llegan los entrenamientos publicados, partidos y torneos con aviso, y los cambios se actualizan solos en unas horas. En Google la primera suscripción es más fácil desde una computadora (Otros calendarios → Desde URL). También hay *Descargar calendario (.ics)*, que no se actualiza solo. Si el enlace se compartió de más, *Cambiar enlace*.
- **Calentamiento preventivo**: 3 versiones de 10 minutos (tobillo, rodilla y hombro) que se turnan por semana. Al crear entrenamientos con plantilla reemplazan al calentamiento dinámico; en uno que ya existe aparece la sugerencia de cambiarlo. Se apaga en *Ajustes → Entrenamientos*.
- **Torneos** (*Partidos → Nuevo torneo*): nombre, sede, fechas y rama (femenil, varonil o mixto). *Elegir convocados* sugiere a los de esa rama; los convocados confirman desde su celular y tú ves quién va, quién no, quién falta y quién no fue convocado, con aviso y recordatorio por WhatsApp. Agrega los partidos del torneo (o asigna uno existente desde *Editar partido*), escribe la tabla de posiciones (tu fila se llena con *Usar mis partidos*; los puntos los pones según las reglas del torneo) y al final pon el lugar. En *Partidos* filtras por rama. En *Hoy* te aviso cuando un torneo empieza en menos de 2 semanas y faltan respuestas.
- **Ayudantes:** el **capitán** (*Ajustes → Equipo de apoyo → Elegir capitanes*, o la casilla en la ficha del jugador) entra con su mismo código; el **asistente adulto** entra con correo y el código de invitación de *Ajustes → Equipo de apoyo*. Los dos pasan lista y capturan partidos; nunca ven notas, evaluaciones, reportes, pruebas de otros ni tu laboratorio. Lo que capturan queda a tu nombre. Puedes quitarles el acceso cuando quieras.
- **Pruebas físicas** (*Jugadores → Pruebas físicas*): salto (My Jump), velocidad de 10 m, alcance de remate, agilidad (prueba T), plancha y estatura. Captura rápida para todo el equipo y gráfica de avance por jugador; cada jugador ve solo las suyas. La tarjeta del jugador muestra una mini gráfica de salto, 10 m y plancha (la línea sube cuando mejora). En *Ajustes → Entrenamientos* eliges cada cuántas semanas medir (10 por defecto) y *Hoy* te lo recuerda.
- **Mejoras:** las ideas sugeridas que ya están dentro de Remate se marcan como «Ya está» y no se copian al pedir cambios.
- **Tarea de casa:** en la ficha del jugador o en *En casa*, elige rutinas o ejercicios y cuántas veces por semana. El jugador la ve arriba de todo en su sección *En casa*.
- **Planear temporada** (*Entrenamientos*): bloques de 3 a 6 semanas con enfoque y una o dos plantillas que se alternan. *Crear entrenamientos* los pone en tus días de entrenamiento sin tocar los que ya existen.
- **Insignias:** se ganan solas por constancia y logros (racha de asistencia, semanas entrenando en casa, retos, aces, recepciones perfectas, salto...). Las ven el jugador y tú.
- **¿Qué dice mi radar?** (botón en la tarjeta del jugador): explicación detallada de su radar. Dice en qué fase va cada habilidad según tu última evaluación, cuántas cumple para el siguiente nivel, qué cambió desde la evaluación anterior, su plan (las 2 o 3 habilidades donde más le falta) y, por habilidad, qué hace hoy, qué sigue, consejos, ejercicios, rutinas de casa y retos. Desde la ficha del jugador, *Ver la explicación que recibe* te muestra exactamente lo que él lee.
- **Teoría** (*Entrenos* del jugador; *Entrenamientos* o *Más* para ti): 24 lecciones de 3 a 5 minutos en 4 módulos (reglas FIVB 2025-2028, fundamentos técnicos, posiciones y sistemas, táctica), con diagramas de cancha y un quiz al final de cada una. Cada módulo tiene un examen de 10 preguntas al azar: con 8 o más, el jugador te pide su **reto de teoría** y lo apruebas en *Hoy* o en *Ruta* (ves su calificación). También hay glosario y *Situaciones de partido* para practicar decisiones. El avance de cada quiz se guarda en el celular de cada jugador. Para compartir una lección, ábrela y toca el ícono de compartir.
- **Antes y después** (ficha del jugador): elige dos fechas de evaluación (por defecto la primera y la última) y ves los dos radares encimados, el cambio por habilidad, el nivel y la asistencia del periodo. Escribe un comentario para la familia (se imprime, no se guarda) y toca *Imprimir o guardar PDF*. Para que funcione, evalúa al inicio y al final de la temporada.
- **Versiones:** cada versión nueva cambia el número en `js/version.js` y el nombre de la caché en `sw.js`. Al abrir la app después de subirla, aparece una vez el aviso *Remate se actualizó* con enlace a **Novedades** (*Más → Novedades* o *Ajustes → Acerca de Remate*).
- **Avisos:** *Hoy → Avisar al equipo*. El aviso aparece en el Inicio de los jugadores y ayudantes, se puede mandar por WhatsApp y llega como notificación a quien la activó en *Ajustes* (en iPhone, con la app instalada en la pantalla de inicio). Al cambiar la fecha u hora de un entrenamiento publicado, Remate te ofrece avisar.

## 6. Cómo cambiar niveles, exámenes y ejercicios

Los números de Remate son **propuestas de partida**, no verdades científicas: cuántos aciertos de 10 piden los exámenes, cuántos minutos dura cada ejercicio, qué fase pide cada nivel. Ajústalos a tu grupo.

| Qué quieres cambiar | Archivo (en GitHub, lápiz para editar) |
|---|---|
| Fases pedidas por nivel y criterios de examen | `js/content/levels.js` |
| Retos y sus puntos XP (incluye los de teoría) | `js/content/challenges.js` |
| Lecciones de teoría, quiz y glosario | `js/content/teoria.js` |
| Descripción de cada fase de cada habilidad | `js/content/skills.js` |
| Plantillas de entrenamiento | `js/content/templates.js` |
| Ejercicios incluidos | `js/content/ex-*.js` |
| Ejercicios de tu laboratorio de salto | `js/content/lab-ex.js` |
| Programa de salto (series, repeticiones, topes de saltos) | `js/content/lab-salto.js` |
| Situaciones de visión de juego | `js/content/vision.js` |
| Autoevaluación y guías de coaching | `js/content/coaching.js` |
| Ejercicios y rutinas para casa | `js/content/casa.js` |
| Ideas sugeridas en Mejoras | `js/content/ideas.js` |
| Pruebas físicas y cómo medirlas | `js/content/pruebas.js` |
| Calentamientos preventivos (A, B y C) | `js/content/ex-fisico.js` (ejercicios `ca-01` a `ca-03`) |
| Insignias y sus escalones | `js/badges.js` |

Los **ejercicios propios** no necesitan editar archivos: se crean desde la pantalla **Ejercicios → Ejercicio propio** y se guardan en tu cuenta.

## 7. De dónde sale la información

La app incluye una pantalla **Ayuda** con las fuentes y sus enlaces. Resumen:

- Fases de aprendizaje (iniciación, adquisición, consolidación, refinamiento): modelo LTAD de la federación de voleibol de Luxemburgo (flvb.lu/federation/ltad).
- Salto con pliometría en voleibolistas: Ramirez-Campillo et al., *J Sports Sci Med*, 2020 (metaanálisis).
- Medición de salto con el celular: metaanálisis de validez y confiabilidad de *My Jump*, 2023.
- Entrenar la toma de decisiones: metaanálisis en voleibol, 2020.
- Fuerza en menores: declaración de posición de la NSCA, 2009.
- Lesiones frecuentes en jóvenes: Children's Hospital Colorado.
- Reglas: FIVB 2025-2028 (y las pruebas de reglas de la FIVB para 2026, publicadas por NORCECA).
- Estadística de partido: escala de recepción 0 a 3 y eficiencia de ataque, las medidas más comunes en voleibol.
- Prueba de agilidad T: Pauole y colaboradores, *J Strength Cond Res*, 2000 (protocolo en topendsports.com).
- Notificaciones: Web Push con una función de Supabase (Edge Functions).

Los ejercicios y plantillas son creación de Remate sobre esas bases. No sustituyen a un médico ni a un entrenador titulado.

## 8. Límites del plan gratuito de Supabase (lo que te puede pasar)

- **50,000 usuarios activos al mes, 500 MB de base de datos.** Para un equipo de prepa sobra: cada jugador ocupa del orden de decenas de KB por temporada (cálculo propio de Remate, no de Supabase).
- **Máximo 2 proyectos activos** en el plan gratuito. Si ya tienes Escuadra y Brida, para crear Remate tendrás que pausar uno o usar otra cuenta.
- **El proyecto se pausa tras 1 semana sin uso.** En vacaciones puede pasar; se reactiva desde el panel de Supabase.
- **30 altas de jugador por hora desde la misma conexión** (límite de entradas anónimas por IP). Si todo el equipo entra el mismo día con el wifi de la escuela, que lo hagan en dos tandas o con datos del celular.
- **Correos de confirmación:** el servidor de correo incluido de Supabase envía muy pocos por hora. Por eso conviene desactivar *Confirm email* mientras pruebas.

## 9. Un consejo para pedirme cambios

Cuando algo no se vea o no funcione, dime: **la pantalla donde estabas, qué tocaste y qué esperabas**; si puedes, una captura. Y si quieres un cambio de contenido (por ejemplo, otro examen para el nivel 3), dime el nivel, la habilidad y el número que quieres. Con eso lo resuelvo a la primera.
