# Remate: guía para subirlo (GitHub + Supabase)

Remate es una app para entrenar voleibol de sala con chavos de prepa, del primer toque al nivel competitivo. Se instala en el celular como Escuadra (PWA). Esta es la **primera entrega: el núcleo** (jugadores, niveles, ejercicios, entrenamientos y asistencia). Sin configurar nada, abre en **modo demo** con datos de ejemplo.

Tiempo estimado: 25 minutos. Orden recomendado: 1) Supabase, 2) GitHub, 3) conectar las dos.

---

## 1. Supabase (la base de datos)

Crea un proyecto **nuevo y separado** de Escuadra y Brida: aquí habrá datos de menores de edad.

1. En supabase.com: **New project**. Ponle nombre `remate`, guarda la contraseña de la base de datos y elige una región cercana (por ejemplo East US).
2. Ve a **SQL Editor → New query**. Abre el archivo `sql/instalar.sql` (viene en esta carpeta), copia **todo** su contenido, pégalo y da **Run**. Debe terminar con *Success*. Si lo corres otra vez no pasa nada malo.
3. Ve a **Authentication → Sign In / Providers** (en versiones anteriores: *Providers*) y activa **Allow anonymous sign-ins**. Los jugadores entran con un código, sin correo; esa opción es la que lo permite. Si no la activas, el jugador verá un aviso al intentar entrar.
4. En esa misma sección, en **Email**, tienes *Confirm email*. Para tu cuenta de entrenador puedes dejarlo activado (te llega un correo) o desactivarlo mientras pruebas. Si usas confirmación, en **Authentication → URL Configuration** pon como *Site URL* la dirección de tu GitHub Pages (paso 2.4), para que el enlace del correo no apunte a localhost.
5. Ve a **Project Settings → API** (o *API Keys*). Copia dos cosas: **Project URL** y la clave **anon public** (si solo ves la nueva, usa la **publishable**). Las usarás en el paso 3. Esa clave es pública por diseño; lo que protege los datos es la seguridad por filas que instaló el SQL. **Nunca uses la clave `service_role` en la app.**

## 2. GitHub (para publicar la app)

1. Crea un repositorio nuevo, por ejemplo `remate`. Públicos funcionan gratis con GitHub Pages; uno privado necesita plan de pago.
2. Descomprime el ZIP en tu computadora. Entra a la carpeta y selecciona **todo lo que hay dentro** (index.html, css, js, fonts, icons, vendor, sql, etc.). Arrástralo a la página del repositorio (*uploading an existing file*) y da **Commit changes**. Tiene 64 archivos, debajo del límite de 100 por carga.
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

Probar sin tocar Supabase: deja `config.js` vacío y abre la app, o usa **Probar el modo demo** en la pantalla de entrada. El demo guarda todo solo en ese navegador.

## 5. Cómo usarlo con tus grupos

- **Cada jugador tiene un código** que tú le das. Se usa en un celular a la vez. Si cambia de celular o el código se compartió, abre su ficha, **Código de acceso → Código nuevo**: el celular anterior pierde el acceso.
- **Antes de dar de alta a un menor**, pide autorización por escrito a madre, padre o tutor y marca la casilla en su ficha. Remate no guarda teléfono, domicilio, fotos ni apellidos completos: usa nombre o apodo.
- **El nivel solo sube con el examen** (botón *Examen* en la ficha). Las fases de cada habilidad te avisan cuándo conviene presentarlo: aparece como *Listo* en **Hoy** y en **Jugadores**.
- **Publicar un entrenamiento** lo hace visible para los jugadores. Al pasar lista, el entrenamiento queda como hecho y publicado, para que cada quien vea su asistencia.
- **Modo cancha** (dentro de un entrenamiento) es un cronómetro por bloques con aviso sonoro que mantiene la pantalla encendida.
- **Descargar asistencia (Excel)** está en Ajustes. También hay respaldo en archivo.

## 6. Cómo cambiar niveles, exámenes y ejercicios

Los números de Remate son **propuestas de partida**, no verdades científicas: cuántos aciertos de 10 piden los exámenes, cuántos minutos dura cada ejercicio, qué fase pide cada nivel. Ajústalos a tu grupo.

| Qué quieres cambiar | Archivo (en GitHub, lápiz para editar) |
|---|---|
| Fases pedidas por nivel y criterios de examen | `js/content/levels.js` |
| Retos y sus puntos XP | `js/content/challenges.js` |
| Descripción de cada fase de cada habilidad | `js/content/skills.js` |
| Plantillas de entrenamiento | `js/content/templates.js` |
| Ejercicios incluidos | `js/content/ex-*.js` |

Los **ejercicios propios** no necesitan editar archivos: se crean desde la pantalla **Ejercicios → Ejercicio propio** y se guardan en tu cuenta.

## 7. De dónde sale la información

La app incluye una pantalla **Ayuda** con las fuentes y sus enlaces. Resumen:

- Fases de aprendizaje (iniciación, adquisición, consolidación, refinamiento): modelo LTAD de la federación de voleibol de Luxemburgo (flvb.lu/federation/ltad).
- Salto con pliometría en voleibolistas: Ramirez-Campillo et al., *J Sports Sci Med*, 2020 (metaanálisis).
- Medición de salto con el celular: metaanálisis de validez y confiabilidad de *My Jump*, 2023.
- Entrenar la toma de decisiones: metaanálisis en voleibol, 2020.
- Fuerza en menores: declaración de posición de la NSCA, 2009.
- Lesiones frecuentes en jóvenes: Children's Hospital Colorado.
- Reglas: FIVB 2025-2028.

Los ejercicios y plantillas son creación de Remate sobre esas bases. No sustituyen a un médico ni a un entrenador titulado.

## 8. Qué sigue (siguientes entregas)

1. **Laboratorio**: tu salto vertical (con protocolo y registro), visión de juego y coaching.
2. **Partidos y estadística**: saque, recepción, ataque y rotaciones.
3. **Reportes** para padres y escuela.

## 9. Un consejo para pedirme cambios

Cuando algo no se vea o no funcione, dime: **la pantalla donde estabas, qué tocaste y qué esperabas**; si puedes, una captura. Y si quieres un cambio de contenido (por ejemplo, otro examen para el nivel 3), dime el nivel, la habilidad y el número que quieres. Con eso lo resuelvo a la primera.
