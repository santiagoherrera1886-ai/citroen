# Citroën · Performance Intelligence

## CENTRO DE ALERTAS DE PERFORMANCE — 27/10/2026

La sección pública **Centro de alertas** evalúa reglas configuradas exclusivamente por usuarios autenticados en el modo Diseño. Las reglas se almacenan en el espacio publicado `api/dashboard.js` (`alertRules`) y se muestran en modo lectura solo después de pulsar **Publicar cambios**.

Métricas permitidas: `cpl = inversión / formularios`, `ctr = 100 × clics de enlace / impresiones`, inversión, formularios y conversaciones. Operadores: mayor que / menor que, con umbrales no negativos; hasta 35 reglas. Se evalúa el último mes disponible en la fuente diaria Meta Ads, sin atribuir datos a meses no cargados. Si no hay filas relevantes o falta el denominador, se indica **Sin datos**, no cero ni una falsa alerta.

La sección no envía emails, notificaciones automáticas ni ejecuta vigilancia periódica fuera de la visita al dashboard. El alcance estimado no es una métrica admitida para estas alertas de volumen único, evitando presentar alcance no deduplicado como usuarios reales. Las reglas pasan por validación de servidor y pruebas automáticas de límite y denominadores.

---


## COMPARADOR AVANZADO A/B (27/10/2026)

- Nuevo menú público **Comparador avanzado** junto a Creativos e Insights. No requiere acceso a Diseño; no permite cambiar el presupuesto, los datos ni las páginas publicadas.
- Dos rangos de fechas editables (A y B, de hasta 366 días cada uno), con predeterminado **mes más reciente hasta el último día cargado** frente al **mes anterior hasta el mismo día**. Usuarios pueden elegir cualesquiera dos rangos válidos.
- Cambia indicador: inversión, formularios, conversaciones, impresiones, clics, CPL, CTR o alcance estimado. Desglosa por **modelo**, **territorio** o **cuenta Meta**, con filtros independientes por modelo y territorio. KPIs A/B, variación porcentual, barras por segmento y tabla exportable como CSV.
- La fuente es `data/meta_2026_daily.json` ya utilizada por el dashboard. No inventa metas ni resultados. `CPL = gasto / formularios` y `CTR = 100 × clics enlace / impresiones`, siempre como ratios de sumas (nunca promedios de ratios). El alcance se **estima con Sainsbury** sobre el universo fijo de 15 millones y no se presenta como deduplicación observada.
- Diferentes cantidades de días o cobertura incompleta emiten advertencias explícitas. Sin filas para un período se muestra dato no disponible, no cero. Las variaciones con denominador cero se muestran como **Sin base comparable**.
- Exportación CSV con escapes de fórmulas para evitar la ejecución accidental de contenido importado en hojas de cálculo. Cambiar filtros no publica nada.
- Validado con `scripts/smoke-compare-lab.cjs`, más prueba de integración en `scripts/smoke-builder.cjs` y compilación JS en CI.

---


## PLANTILLAS INTELIGENTES Y DUPLICACIÓN — 27/10/2026

**Nuevas acciones en modo Diseño** (no aparecen a lectores sin sesión):

- **Plantillas de informes** desde el menú lateral o **Página → Crear desde plantilla**. Cinco formatos con estilos Montecarlo, basados **únicamente en columnas reales de Meta Ads**: Resumen ejecutivo, Rendimiento por modelo, Evolución y eficiencia, Interacción y conversión y Análisis territorial. También hay opción de página en blanco. Ninguna tarjeta contiene números inventados ni metas atribuidas al cliente.
- **Duplicar página** desde la barra de la propia página o **Página → Duplicar página actual**. Se crean nuevos ID para cada tarjeta, y se copian los filtros avanzados limitados a esa página (con nuevos ID y referencias a las tarjetas duplicadas). Editar la copia no modifica el original.
- **Duplicar tarjeta** desde el icono **⧉** en el encabezado de cada tarjeta de informe; se mueve ligeramente la copia y puede redimensionarse. Se conserva el límite de 45 tarjetas por página y 15 páginas.
- **Eliminar página** también limpia los filtros cuya aplicación era exclusiva de esa página, evitando controles huérfanos en el reporte.
- **Seguridad/publicación**: todas las plantillas/duplicaciones requieren editor autenticado; se almacenan como borrador hasta pulsar **Publicar cambios**. La lectura pública y los datos fuente existentes siguen sin modificaciones.
- **Verificación**: \`scripts/smoke-report-templates.cjs\` comprueba que las cinco plantillas usen métricas/dimensiones soportadas, tengan tarjetas con IDs únicos y que sus layouts no se solapen; \`scripts/smoke-builder.cjs\` prueba selección de plantilla, render real, duplicación de tarjetas/páginas, independencia de los cambios y copia/limpieza de filtros de página.


## OPTIMIZACIONES DEL CONSTRUCTOR — 27/10/2026

- **Borradores recuperables**: al crear/editar páginas, creativos, insights y filtros se guarda un borrador local etiquetado con la revisión de publicación. Si recargas el navegador, la versión pública se carga limpia y, solo después de entrar como editor, se muestran opciones **Recuperar** y **Descartar borrador**. Un fallo de API nunca expone un borrador privado a un visitante.
- **Publicación con control de revisiones**: `POST /api/dashboard` exige `expectedRevision`. Si el borrador parte de una revisión antigua, el servidor devuelve **409** y preserva la versión publicada; el editor conserva su borrador para revisión. La última escritura aún requiere coordinación ante peticiones simultáneas (sin transacción atómica distribuida).
- **Resumen también compartido**: Publicar sincroniza no solo páginas/insights sino orden y tamaños de los paneles del Resumen, tarjetas personalizadas, métricas KPI, paletas y fotografías enlazadas mediante URL **HTTPS**. Las imágenes subidas como archivos y almacenadas en el navegador no se suben por arte de magia al servidor; es necesario alojarlas con una URL HTTPS para compartirlas globalmente.
- **Rendimiento**: los informes de varias páginas solo reconstruyen el lienzo de la página activa al interactuar, evitando crear SVG y tablas de páginas ocultas en cada edición.
- **Cambios de resumen pendientes**: la detección de cambios de tarjetas, métricas y temas crea un borrador local y un aviso de publicación pendiente dentro del modo Diseño, nunca en el modo lectura.
- **Seguridad**: el acceso a Diseño sigue autenticado. La activación del propietario acepta códigos copiados con espacios o caracteres invisibles comunes; no demuestra que la cuenta se haya activado ni revela contraseñas en el código.
- **Pruebas**: `scripts/smoke-builder.cjs` incluye recuperación de borrador, no exposición pública, publicación del Resumen y conflicto de revisión, además de las suites existentes de gráficos y autenticación.

---


## NUEVA INTERFAZ DE EDICIÓN TIPO LOOKER STUDIO — 27/10/2026

El modo **Ver informe** conserva la interfaz premium de Citroën. El entorno de **Diseño**, accesible únicamente después de una sesión autorizada desde el botón del menú, ahora abre un workspace de autoría totalmente independiente (archivos `looker-editor.js` / `looker-editor.css`).

**Estructura visual:** barra de menús superior (Archivo, Editar, Insertar, Página, Organizar, Recurso); barra de herramientas con Añadir página, Añadir datos, Añadir gráfico, Añadir control, Texto/insight, Imágenes, Tema/diseño, Mover libremente, Guardar y Publicar; columna de páginas a la izquierda; lienzo del informe central sobre superficie gris; panel derecho con propiedades contextuales (Configuración, Estilo, Diseño), catálogo buscable de campos y pestañas de navegación. El panel de campos se oculta en pantallas de escritorio angostas para preservar espacio; los controles accesibles continúan disponibles.

**Los botones ejecutan flujos existentes:** los gráficos se insertan con la galería real del Resumen; nuevas páginas usan el constructor de páginas; controles abren el creador de filtros; fuentes llevan al área de Sheets/BigQuery; estilos aplican paletas y propiedades; imágenes abren el gestor de fotografías; Guardar persiste la vista local y Publicar intenta publicar páginas/insights/filtros en Vercel. Los campos de métricas compatibles se aplican al componente seleccionado; mes y modelo pueden elegirse como dimensiones de gráficos personalizados. En elementos que no soporten un campo se indica que requiere un gráfico compatible; no se finge una edición exitosa.

**Acceso y salida:** la vista de editor aparece solo si el Dashboard tiene la clase `studio-edit-on`, que el módulo de estudio concede después de sesión válida. **Ver informe** llama al control oficial de terminar edición, elimina la carcasa tipo Looker y restaura inmediatamente la vista normal. El inspector y los controles originales permanecen en el DOM para reutilizar sus eventos, sin duplicar sus cálculos.

**Verificaciones:** `scripts/smoke-looker-editor.cjs` prueba el modo público intacto, activación del workspace, menú de gráficos, creación de páginas, aplicación de campos, paletas y salida. Se incluye `node --check looker-editor.js` en GitHub Actions. Interfaz inspirada en Looker Studio, no una copia ni una implementación de todas sus operaciones o conectores.

---

## LOOKER-STYLE FILTER STUDIO — 27/10/2026

**Verificación funcional**: `looker-filter-engine.js` y el constructor de páginas incorporan un motor de controles reutilizables. El usuario con acceso de edición utiliza **＋ Control / filtro avanzado** en el menú lateral, configura el control, puede seleccionar ámbito (todo el informe, una página o un gráfico), y luego pulsa **Publicar cambios** para compartir las definiciones en Vercel Blob. Los lectores pueden cambiar los valores de cada control sin iniciar sesión. Los valores de lectura son temporales y no modifican ni la fuente ni las definiciones publicadas.

**Tipos de control compatibles:**
- **Calendario:** fechas inicial/final inclusivas, basadas en el día real del registro de Meta Ads (`2026-10-20` y no solo `2026-10`).
- **Fechas relativas:** todo el período, hoy, ayer, últimos 7/14/28/30/90 días, semana actual/anterior, mes actual/anterior, trimestre actual, año actual/anterior; cálculo relativo a fecha actual de Bogotá.
- **Dimensiones categóricas:** desplegable, lista fija con selección múltiple, botones de radio, casilla de registros con valor, búsqueda por texto y selector múltiple para modelo, territorio, cuenta, plataforma Meta y mes.
- **Métricas:** límites mínimo/máximo numéricos, controles de rango con deslizadores, sin calcular sumatorias falsas de alcance único.
- **Condiciones avanzadas:** contiene, es igual, empieza, termina, no contiene, mayor/menor (inclusivo o exclusivo), entre, pertenece/no pertenece, vacío/no vacío, expresión regular limitada a un subconjunto seguro, excluir coincidencias y combinación Y/O (`AND/OR`).
- **Ámbito:** informe global; una sola página; un panel específico. Se incluyen controles visibles en las tarjetas originales de Resumen y en los paneles nuevos del canvas.
- **Filtros iniciales en informes heredados:** período relativo «Todo», modelo (selección múltiple) y territorio (desplegable). Ninguno restringe cifras antes de que el visitante seleccione valores.
- **Gráficos del lienzo libre**: barras, líneas, área, barras horizontales, circular, anillo, tabla y medidor; agrupar por día, semana, mes, trimestre, modelo, territorio o cuenta. El medidor exige que el editor establezca un objetivo; no se simula un cumplimiento de 100 %.

**Notas metodológicas:** Meta se filtra por días de los registros reales. La planeación anual/mensual no contiene un presupuesto diario y no se prorratea por fecha; al usar un rango de días, el comparativo muestra el plan completo de los meses incluidos y una advertencia. El desglose agregado de campañas no ofrece una granularidad diaria comparable y puede no mostrar datos para controles de fecha a nivel día. Los datos de Sheets/BigQuery conectados de manera privada no se almacenan públicamente: su vista previa requiere sesión y credenciales válidas.

**Lo que no es Looker Studio completo:** quedan fuera de este motor la mezcla arbitraria de fuentes con joins, las dimensiones calculadas con SQL/LookML, filtros avanzados a través de múltiples conectores dispares, permisos de fila por usuario sobre consultas, colaboración simultánea y envíos programados. El sistema no promete paridad total con un producto de BI propietario. Documentación técnica de referencia: https://docs.cloud.google.com/data-studio/about-controls, https://docs.cloud.google.com/data-studio/create-edit-and-manage-filter-properties, https://docs.cloud.google.com/looker/docs/studio/bar-chart-and-column-chart-reference.

**Pruebas:** `scripts/smoke-lookers.cjs` valida fechas y calendarios, AND/OR, ámbitos por informe/página/tarjeta, exclusiones, listas, radio, deslizadores y métricas reales; `scripts/smoke-builder.cjs` valida creación de controles y su persistencia en un informe publicado.

---

## BUILDER 2.0 — PÁGINAS, CREATIVOS, INSIGHTS Y CONEXIONES (26/10/2026)

**Modo lectura y entrada:** el botón de edición de la cabecera se oculta sin sesión. Visitantes encuentran el acceso discreto **🔒 Ingresar a Diseño** al final del menú lateral. Tras iniciar sesión y entrar en Diseño aparecen la barra de gráficos, panel de estilo, botón de movimiento libre y control maestro. La primera activación acepta pegar el código completo o su parte posterior al prefijo `CITROEN-`, ignorando espacios y caracteres invisibles comunes; la contraseña inicial debe sustituirse por una fuerte.

**Páginas nuevas:** en la barra izquierda, el editor autenticado dispone de **＋ Nueva página**. Cada página ofrece lienzo de tarjetas con posición absoluta, arrastre por manejador, redimensionar desde la esquina, y tipos: indicador, gráfico (barras/línea/área/tabla), imagen, filtro y texto/insight. El lienzo original de Resumen también ofrece **↔ Mover libremente** y permite volver a la cuadrícula tradicional. Las tarjetas de Meta utilizan `meta_2026_daily.json` y su diccionario, no datos de demostración.

**Creativos:** sección pública **Creativos** con piezas cargadas por el editor: título, campaña, formato, URL HTTPS o archivo JPG/PNG/WebP comprimido en el navegador, y notas. Las imágenes publicadas quedan visibles para quienes ven el tablero. No se inventan previews ni métricas de anuncios.

**Insights:** sección de hallazgos escritos por el equipo, título, contenido y fecha de actualización. El texto se trata como contenido plano escapado, no HTML ejecutable. Los editores escriben, revisan y publican.

**Filtros:** desde Diseño > Filtros puedes mostrar u ocultar período, modelo y territorio en Resumen. Las nuevas páginas soportan tarjetas de filtro para mes y modelo, con cambios instantáneos en los gráficos de la página.

**Publicación real:** `POST /api/dashboard` requiere sesión de editor/propietario y guarda páginas, creativos, filtros, insights y posición libre de Resumen en **Vercel Blob privado**; `GET /api/dashboard` devuelve la versión publicada para visitantes. No es solo localStorage. El botón **Publicar cambios** es obligatorio; el navegador conserva un borrador local entre ediciones. La publicación almacena solo la estructura aprobada y contenido de piezas, no credenciales externas.

**Conexiones a datos (Diseño privado, actualizado 28/10/2026):**
- Abre **Añadir datos**. Google Sheets admite enlaces de Compartir, exportación CSV y Publicar en la web (`/d/e/.../pub` y `pubhtml`). Detecta el acceso público primero; una cuenta de servicio configurada no bloquea una hoja pública.
- Para hojas privadas, configura `GOOGLE_SERVICE_ACCOUNT_JSON` en las variables privadas de Vercel, habilita Google Sheets API y comparte la hoja como **lector** con el correo de esa cuenta. El panel muestra si esta configuración está disponible. No reutiliza la sesión personal de Google ni exige publicar una hoja privada.
- En la conexión privada se puede seleccionar la pestaña; sin `gid` se usa la primera pestaña real, sin asumir que su ID sea cero. En enlaces públicos, copia el enlace de la pestaña deseada. La fila de encabezados se configura entre 1 y 100.
- Sheets lee hasta **5.000 filas / 50 columnas** con un límite de 2 MB. La interfaz identifica lecturas parciales: sus totales corresponden solo a las filas cargadas. Para libros mayores, usar una pestaña resumida. La tabla visualiza las primeras 100 filas; los gráficos agregan todas las cargadas y muestran como máximo 15 grupos, indicando cuándo hay más.
- Se recuerdan hasta 12 conexiones **por editor y navegador**, únicamente URL, opciones y nombre. Se vuelven a leer al entrar a Diseño; las filas no se guardan en localStorage ni se incluyen al publicar. Cada tarjeta conserva un identificador de fuente independiente. La última lectura se conserva en memoria, marcada como desactualizada si falla un refresco. Cerrar sesión limpia esa memoria.
- Desde la vista previa se elige la página o se crea una nueva, sin escribir nombres exactos en un diálogo. El inspector muestra las columnas de esa fuente, su métrica, dimensión y agregación (suma, promedio, recuento, mínimo o máximo). Soporta tabla, barras, barras horizontales, líneas y área. El formato numérico permite detección automática, Colombia (`1.234,56`) o Estados Unidos (`1,234.56`).
- BigQuery mantiene lectura de hasta 100 filas con cuenta de servicio, SQL limitado y un máximo de 100 MB de escaneo. No admite SQL arbitrario ni escrituras.
- Los datos externos son **privados del editor**: publicar comparte el diseño, no sus filas. El informe público conserva sus datos verificados de Meta/planeación. Los filtros de Meta no se aplican a columnas externas; el inspector lo indica. Las fuentes no se sincronizan entre navegadores o editores.

**Editor:** Guardar / `Ctrl+S` / `Cmd+S` guardan el borrador local; Publicar informa el resultado real en la barra superior. Las conexiones usan un panel adaptable sin el ancho fijo del lienzo. Las páginas vuelven al inicio al navegar. La publicación conserva control de revisión e historial existentes.

**Verificación:** `node --test scripts/test-sheets.mjs` comprueba URLs, CSV, permisos, selección de pestañas, rangos y límites; `node scripts/smoke-sources.cjs` comprueba conexión, cálculo, asignación de campos, dos fuentes independientes, recarga, errores y separación de datos privados. Requiere las dependencias normales y `jsdom@25` para la prueba de interfaz. Los ensayos de credenciales usan respuestas simuladas; no acreditan una cuenta de servicio de producción.

---

## ACCESO PROTEGIDO AL DISEÑO — 26 DE OCTUBRE DE 2026

El dashboard permanece público en **modo lectura**. La acción **Editar resumen** comprueba una sesión autorizada mediante `GET /api/auth`. Sin sesión válida, muestra la pantalla de inicio de sesión y mantiene bloqueados los controles. No se restaura automáticamente un modo de edición desde `localStorage`.

**Cuenta maestra solicitada:** `santiago.herrera@vml.com`. La contraseña inicial facilitada por el propietario se usa **solo durante la activación**; jamás figura como texto ni hash de una clave débil en el código público. El administrador entra en **Primera vez → Activar administrador maestro**, con un **código privado de activación de alta entropía** entregado fuera del repositorio. El backend verifica el SHA-256 del código, permite configurar una contraseña inicial y la guarda cifrada mediante `scrypt` en Vercel Blob **privado**; la primera sesión exige sustituir esa contraseña por una de al menos 12 caracteres con letras y números. La activación de una cuenta maestra ya existente se rechaza.

**Control maestro:** visible únicamente con sesión de propietario; crear nuevos editores con correo y contraseña robusta, generar contraseña aleatoria desde el navegador, listar, suspender, reactivar y cambiar contraseñas de editores. Las modificaciones se escriben en `private/citroen-editor-users-v1.json` dentro del almacén Blob privado del proyecto. Los editores solo pueden ingresar al modo Diseño y no pueden gestionar usuarios. Suspender o cambiar contraseñas invalida las sesiones correspondientes en la próxima verificación del servidor. Nunca se devuelve el hash de contraseña al navegador.

**Protecciones de sesión:** cookie `HttpOnly` + `Secure` + `SameSite=Strict` firmada mediante HMAC, con vigencia máxima de 8 horas; cambio de clave con comprobación de la actual; API restringida por rol, validación de origen y tipo JSON en mutaciones, validación de entradas y límite de intentos por instancia. La clave de firma se deriva de un secreto privado de Vercel Blob o puede configurarse por variable de entorno. El código de activación no debe guardarse en un README, ticket o repositorio ni transmitirse a terceros.

**Requisitos de infraestructura:** un almacén **Vercel Blob privado** enlazado al proyecto y la variable `BLOB_READ_WRITE_TOKEN` disponible exclusivamente del lado servidor. Instalación automática del SDK `@vercel/blob@2.8.2` vía `package.json`. Si faltan los secretos/servicios, el backend falla cerrado (`503`) y el Resumen sigue disponible en modo lectura. Los archivos HTML/JS y datos públicos del dashboard **no son secretos** y no requieren inicio de sesión para verlos. La autorización protege la interfaz de edición y la API maestra, no evita que un visitante modifique localmente su copia del HTML con herramientas del navegador. Los ajustes de diseño existentes siguen siendo locales a cada navegador.

Para entrar:
1. Abrir `https://citroen-rho.vercel.app/#resumen` y pulsar **Editar resumen**.
2. Primera vez: **Activar administrador maestro** con correo, clave inicial y código privado de instalación; sustituir inmediatamente la contraseña inicial.
3. En siguientes sesiones, usar correo y nueva contraseña. Desde **♛ Control maestro** administrar los otros editores.

**Pruebas:** `scripts/smoke-access.cjs` verifica intentos inválidos, inicio válido simulado, bloqueo y panel maestro. Las pruebas de gráficos usan un mock de sesión autorizada para mantener cobertura funcional sin incluir contraseñas reales.

---


## CITROËN VISUAL BUILDER — 26 DE OCTUBRE DE 2026

**Editor enriquecido publicado en la sección Resumen:**

- Barra visual superior al pulsar **Editar resumen**: crear con un clic gráficos de barras, líneas, áreas, tablas, comparativos Plan vs Meta y proyecciones. Cada gráfico usa las fuentes existentes del dashboard y se agrega a la retícula sin sustituir los cinco paneles originales.
- **Datos / Estilo / Diseño** en la barra lateral: indicadores, métricas Meta y del plan, filtros globales, ordenar y limitar categorías de gráficos adicionales, cambiar tipo de gráfico, títulos, distribución, anchura, duplicar los gráficos creados y ocultar paneles nativos.
- **Estilo**: seis paletas Montecarlo/Citroën/Esmeralda/Lavanda/Atardecer/Grafito (más Nocturno), colores de series, fondo, texto, borde, radios, grosor de borde, sombras, fuente, escala tipográfica, leyenda, cuadrícula y etiquetas; deshacer/rehacer estilos y aplicar a todos.
- **Paleta general** en la cinta superior: recolorea todas las visualizaciones actuales. Un botón adicional restaura el aspecto original.
- **Fotos de los carros**: sustituir por JPG/PNG/WebP propios (se procesan en el navegador a aproximadamente 950 px y se comprimen) o pegar un enlace HTTPS; incluye C3, Basalt, Aircross, Berlingo y foto de portada. Se pueden restaurar una por una o todas sin alterar datos.
- **Persistencia**: distribuciones, métricas, estilos y fotos se almacenan solo en el navegador. El archivo JSON de Exportar diseño incluye los ajustes de diseño, paletas y las imágenes personalizadas, si existen. No son cambios colaborativos ni equivalen a subir activos a GitHub/Vercel para todos los usuarios.
- **Seguridad de imágenes**: enlaces deben ser HTTPS y no incluir credenciales. Cargas aceptadas JPG/PNG/WebP de hasta 5 MB, comprimidas antes de almacenar. Fotos que no carguen muestran la imagen de referencia y un aviso.
- **Limitaciones frente a Looker Studio**: este editor no tiene conectores arbitrarios, un motor SQL o campos calculados libres, colaboración multiusuario en tiempo real, ni las 49 visualizaciones de Looker. Estas funciones requieren una arquitectura adicional y no se simulan.
- Pruebas: `scripts/smoke-style.cjs`, `scripts/smoke-gallery.cjs`, `scripts/smoke-metrics.cjs`, `scripts/smoke-studio.cjs`.

---

## CORRECCIÓN METODOLÓGICA DEL ALCANCE — 26/10/2026

A partir de esta versión, cuando el usuario elige **Alcance estimado · Sainsbury** en el Resumen, **no se suman** los alcances de los registros de Meta Ads para presentarlos como alcance neto.

- **Fórmula**: `alcance estimado = U × (1 − PRODUCTO(1 − reach_i/U))`, con `U` = tamaño del universo de audiencia objetivo configurado por el usuario y `reach_i` = alcance de cada unidad de información disponible.
- **Universo aprobado (26/10/2026): 15.000.000 de personas**. En Propiedades del gráfico el campo aparece precargado con ese valor y Sainsbury calcula de inmediato. Se pueden evaluar escenarios cambiándolo manualmente; restablecer diseño retorna a 15 M. No es alcance observado ni se deducen personas únicas verificadas.
- **Validaciones**: el universo debe ser un entero positivo, al menos tan grande como cada alcance individual. El estimado queda entre el mayor alcance individual y el universo. Se evalúa la fórmula con operaciones numéricamente estables.
- **Interpretación**: Sainsbury asume exposiciones estadísticamente independientes (solapamiento aleatorio). **No mide usuarios únicos reales deduplicados** ni sustituye los reportes oficiales de Meta. La estimación puede variar con el desglose y los grupos de entrada, especialmente entre días, anuncios o campañas.
- **Capa de datos**: se mantiene el total de alcance **sumado bruto** como dato fuente de auditoría, con etiqueta explícita; el Resumen presenta el estimado solo con universo. Nunca usar la suma bruta como alcance único.
- **Funnel**: cuando usa alcance estimado como primera etapa, los clics divididos por alcance se muestran como **Clics / alcance estimado**, no como CTR.
- **Pruebas**: `scripts/smoke-metrics.cjs` verifica que con `U=100` y alcances 50 y 40 el estimado sea 70; prueba el universo base 15 M y la migración sin perder métricas personalizadas, y comprueba las sustituciones en todo el Resumen.

Fuentes metodológicas: https://help.bunkerdb.com/es/articles/9534739-como-se-calculan-los-totales-de-alcance-para-medios-pagos y https://fluzo.com/article/battle-of-century-how-good-is-sainsbury-against-reality

---

## BARRA DE MÉTRICAS EDITABLE — 26/10/2026

El modo **Editar resumen** incluye una barra lateral derecha de propiedades. Se selecciona una de las seis tarjetas KPI o un gráfico y se elige una métrica. Un ejemplo real es **Impresiones → Alcance sumado***. La tarjeta pasa de 145.525.157 impresiones a 113.191.745 de alcance sumado según la exportación de Meta Ads; esta última cifra **NO es alcance único deduplicado**, ya que procede de filas por día/anuncio.

Campos reales disponibles: inversión Meta, formularios on-Facebook, conversaciones, impresiones, alcance sumado, clics en enlace, clics totales, CTR, CPM, costo por formulario y costo por conversación. La inversión planeada se limita al escenario de los Excel y nunca se muestra como ejecutado. Se permite cambiar el primer paso del funnel entre impresiones y alcance: para alcance, la ratio se denomina *clics/alcance sumado* y no CTR.

El editor mantiene paneles nativos de Resumen, permite editar la principal métrica de las tarjetas de modelos y la columna de campañas, y ofrece campos de Meta para gráficos nuevos. Los ajustes se guardan en `localStorage` y se incluyen en exportar/importar diseño JSON. La barra de campos no modifica registros ni fuentes originales.

Los test `scripts/smoke-metrics.cjs` validan las sustituciones contra los archivos originales, los filtros y el modo lectura.

---

## REDISEÑO DEL RESUMEN — 26/10/2026 (versión activa)

- El editor de informes dejó de existir como página independiente: **“Editar resumen”** aparece dentro del encabezado de Resumen.
- En modo normal se conserva la visual de Citroën, con el hero, seis KPI y cinco paneles nativos. En modo edición se pueden mover estos paneles (arrastre o flechas), cambiar su ancho, ocultarlos y editar sus títulos.
- Los gráficos adicionales se crean directamente entre los paneles del mismo Resumen. Permiten seleccionar fuente, métrica, eje, tabla/barras/líneas y tamaño. El usuario puede crear comparativos Plan vs. Meta, sin confundirlos con cumplimiento total.
- Guardar / exportar / importar diseño: almacenamiento local del navegador + archivo JSON, **no hay colaboración en la nube**.
- Se retiraron del menú Medios, Creativos, Datos & fuentes y Editor de informes. Las secciones técnicas antiguas siguen ocultas en el DOM por compatibilidad con los cálculos y la importación; no son accesibles desde la navegación.
- La validación automatizada verifica la posición del editor dentro de `#resumen`, los cinco paneles nativos, la edición y el menú reducido.

---

## ACTUALIZACIÓN VIGENTE — 26 de octubre de 2026

**La fuente activa del dashboard está corregida con los diez Excel recibidos el 26/10/2026.** La auditoría histórica del 21 de octubre que aparece más abajo se conserva como referencia de la versión anterior, no como presupuesto vigente.

- **Plan actualizado enero–octubre:** COP 1.086.316.554,45; el anterior era COP 944.266.850,42. Cambiaron abril (COP 65.000.000,45) y mayo (COP 141.316.554). Enero, febrero, marzo y junio–octubre conservan sus presupuestos anteriores.
- **Plan pasajeros:** COP 986.485.356,45; **Berlingo:** COP 99.831.198,00, contando la partida una sola vez.
- **Hallazgo sin resolver:** mayo BOT de pasajeros COP 130.485.356 vs. suma de estructura COP 131.477.980; diferencia COP 992.624. La fuente independiente Berlingo también difiere entre H3 y O4. Se señala, no se disfraza como reconciliación completa.
- **Abril, adicional:** PPTO ADICIONAL H46 por COP 13.500.000 no se incorpora a la base porque no hay confirmación de aprobación. Las versiones históricas no se suman de nuevo.
- **Ejecución:** Meta Ads permanece independiente de la proyección; no interpretar diferencias como cumplimiento multicanal. Octubre real cubre solo hasta el 20/10.
- **Editor de informes:** nueva sección “Editor de informes” con gráficos a elección, indicadores, origen de datos, filtros, comparativos, cambio barra/línea/tabla y arrastrar tarjetas. El diseño se guarda con `localStorage` **solo en el navegador actual**; exportar/importar JSON para reutilizarlo entre navegadores. No existe todavía un backend compartido de Looker Studio.
- **Implementación:** `data/revision_2026.js` integra los cambios exactos de abril y mayo sobre `data/proyecciones_2026.js`; `studio.js`, `studio.css` e `index.html` contienen el editor. `scripts/smoke-studio.cjs` y los demás tests se ejecutan en GitHub Actions.

---

Dashboard premium Montecarlo Blue para Citroën Colombia, basado en los módulos operativos de Suzuki Performance Intelligence, pero desarrollado desde cero.

## Estado

- **Diseño y navegación:** implementación del concepto visual 3 aprobado, `concept3.css` y `concept3.js`, responsive y funcional.
- **Catálogo de vehículos:** C3, C3 MAX, Aircross, AIRCROSS MAX, Basalt y Berlingo, con fichas y fotografías reales de producto de recursos web externos. La portada muestra cuatro modelos distintos.
- **Métricas publicitarias:** 27.840 filas originales de ejecución de Meta Ads, 1 ene–20 oct de 2026, tres cuentas. Formularios y conversaciones contabilizados por separado.
- **Sin datos ficticios:** no se generan presupuestos, leads, CTR, CPL, históricos ni proyecciones arbitrarias.
- **No es una API en vivo:** carga CSV/JSON local y, opcionalmente, JSON público de repositorio.
- **Sin dependencias de construcción:** abre `index.html` o conecta el repositorio a Vercel como sitio estático.

## Módulos

1. Visión general: KPIs y evolución por mes.
2. Portafolio: fichas reales de modelos, leads y CPL si los hay.
3. Ecosistema de medios: inversión y CPL por plataforma.
4. Territorios: leads por ciudad y concesionario.
5. Campañas: tabla de campañas filtrada y exportable.
6. Creative gallery: creativos cargados exclusivamente a partir de URLs existentes en los datos.
7. Datos & fuentes: importación, estados de fuente y trazabilidad.

## Cómo cargar datos

Entra a **Datos & fuentes → Seleccionar archivo**, y carga un CSV o JSON exportado de Meta Ads, Google Ads, TikTok Ads o de tu capa consolidada. La app intenta mapear los encabezados más comunes en inglés y español y conserva solo columnas con datos realmente suministrados.

Descarga desde la interfaz la plantilla CSV **vacía** (sin registros simulados), cuyos campos son:

```csv
fecha;plataforma;modelo;ciudad;concesionario;campana;anuncio;inversion;impresiones;alcance;clics;leads;url_creativo
```

- `fecha`: preferible `AAAA-MM-DD`; también acepta `DD/MM/AAAA`.
- `inversion`: gasto expresado en **pesos colombianos**. Asegura que el export no mezcle monedas.
- `leads`: número de leads según la definición comercial aprobada.
- `url_creativo`: URL pública HTTPS del material real; no se generan imágenes de anuncios.
- Modelos reconocidos: `C3`, `Aircross`, `Basalt` (también nombres que contienen esas palabras).
- Plataformas normalizadas: `Meta Ads`, `Google Ads`, `TikTok Ads` y denominaciones literales adicionales.

**JSON**: se puede cargar un arreglo de filas, o `{"rows":[...]}`, `{"data":[...]}`, `{"records":[...]}`. Para inicializar automáticamente al cargar la página, publica un archivo en `data/citroen-data.json` con ese mismo formato; el repositorio **no incluye** dicho archivo porque aún no se ha aportado una fuente.

## Cálculos y límites

- **CPL**: inversión total / leads totales (solo si leads > 0).
- **CTR**: clics / impresiones.
- **CPM**: inversión / impresiones × 1.000.
- **Alcance reportado**: suma de los campos de alcance disponibles. **NO es alcance único desduplicado**, y se marca así.
- Si una métrica no existe en la fuente se muestra **—**, no cero.
- Si un filtro no tiene filas, no se inventan registros ni se extrapola información.
- Las gráficas de inversión y leads tienen escalas independientes y quedan indicadas en la leyenda.
- El parser admite CSV separado por coma, punto y coma o tabulación, valores en formato colombiano y un máximo de archivo de 20 MB. Verifica antes el separador decimal y los importes negativos o de devolución.
- La importación ocurre en el navegador; al recargar se pierde el CSV temporal (excepto si existe el JSON versionado en el repositorio). No se almacenan credenciales ni tokens de plataformas.

## Fotos y permisos

Las URLs fotográficas hacen referencia a **imágenes existentes** publicadas en:

- [Citroën C3, Colombia](https://www.citroen.com.co/modelos/nueva-c3.html)
- [Citroën Aircross, Colombia](https://www.citroen.com.co/modelos/nueva-aircross-suv.html)
- [Citroën Basalt, Colombia](https://www.citroen.com.co/modelos/basalt.html)

Son recursos externos por URL, no se redistribuyen binarios en este repositorio. Verificar autorización de uso de marca y materiales fotográficos antes de una publicación comercial final. Si un recurso externo bloquea su carga, se conserva un fallback de texto del modelo.

## Despliegue

Sitio HTML/CSS/JS estático, sin build step. Conecta la rama `main` a Vercel, framework **Other**, directorio raíz `./`, sin comando de compilación. Una vez conectado, Vercel podrá redesplegar con cambios de GitHub.

## QA antes de dar por completo

- Revisar imágenes remotas y responsive en Chrome/Safari.
- Probar importación de CSV Citroën real y reconciliar totales contra las plataformas originales.
- Revisar formato monetario (siempre COP) y alcance agregado.
- Confirmar que Vercel esté autorizado al equipo y vinculado a este repositorio.

© 2026 · Construido para análisis y planificación de marketing. Las métricas pertenecen a quien provee la fuente.

## Rediseño visual · Concepto 3 aprobado (octubre 2026)

La portada en `index.html` reproduce la dirección visual del concepto 3 que aprobó el propietario:
- Barra lateral azul profundo y fondo general claro; tarjetas blancas suaves y acentos coral.
- Encabezado **Marketing & movilidad**, hero fotográfico del Aircross y el titular "Más personas en movimiento, más historias por contar".
- KPIs reales de presupuesto, gasto Meta, formularios, conversaciones, costo/formulario e impresiones.
- **Planeado vs Ejecutado** grande con 3 métricas seleccionables: inversión, leads y CPL. Ejes mensuales enero a octubre. Octubre se trata como período parcial; no se crean cifras de noviembre o diciembre.
- Embudo de impresiones y clics Meta con resultados separados de formularios y conversaciones.
- Cuatro modelos visuales diferentes y buscables: C3, Basalt, Aircross y Berlingo. La variante MAX mantiene su propio filtro.
- Tabla de campañas originales y hallazgos automáticos derivados de datos reales.
- Filtros de mes, modelo y territorio inferido de nombres de conjuntos/campañas.
- El resto de módulos originales de planeación, Meta Ads y exploración se mantiene intacto.

### Trazabilidad y limitaciones IMPORTANTES

1. **Plan total y ejecución Meta no tienen el mismo universo:** la barra planeada representa el presupuesto global de los libros Excel, mientras que la barra ejecutada representa exclusivamente Meta Ads. La línea describe Meta/plan y no cumplimiento de la estrategia.
2. El presupuesto regional es desconocido para el mismo recorte geográfico que permite el export de Meta. Con filtro territorial se omite la barra planificada para no comparar audiencias de coberturas distintas.
3. Los leads planificados pueden incluir otros objetivos; las **conversiones formulario de Meta no se consideran automáticamente equivalentes a las metas comerciales**.
4. Las conversaciones de WhatsApp no se suman con los formularios como contactos únicos.
5. El valor que aparece como **Costo / formulario** es gasto total Meta dividido por los formularios reportados; al incluir campañas de conversación, NO equivale al CPL de negocio de formularios puros.
6. **Reach** por anuncio/día no es alcance único multicanal; la portada lo reemplaza por impresiones verificables.
7. El archivo de Meta contiene `Cost` sin columna de divisa; pesos colombianos son un supuesto operativo, no moneda verificada dentro del extracto.
8. Los proyectos con imágenes externas requieren acceso al proveedor de contenido; las tarjetas incluyen URLs alternativas específicas por modelo.

### Datos integrados

- `data/proyecciones_2026.js`: 10 presupuestos mensuales, 60 filas modelo-mes y 551 líneas de ESTRUCTURA; la interfaz incorpora además 6 partidas de Berlingo anexas para 557 asignaciones trazables.
- `data/meta_2026_daily.json`: resumen de ejecución diaria obtenido de 27.840 registros del archivo de reporte.
- `data/meta_2026_detail.json`: detalle de campañas, conjuntos y anuncios reales (sin URLs creativas originales).
- `concept3.js`: solo consume las fuentes existentes y muestra datos derivados, no ejemplos ni cifras inventadas.

### Validación

GitHub Actions valida sintaxis de `app.js`, `meta.js`, `planning.js` y `concept3.js`, integridad del esquema proyectado y conciliación de la ejecución de Meta en todas las agregaciones.


## Corrección visual de octubre 2026 — portada compacta y navegación multipágina

Se corrigió la incidencia donde la app todavía mostraba banners de publicidad como fotos de los carros, junto con una tarjeta vacía de Berlingo y un grupo adicional "Sin clasificar".

- Los activos visuales optimizados ahora viven en `assets/models/c3.webp`, `aircross.webp`, `basalt.webp` y `berlingo.webp`. Son imágenes de referencia del fabricante, procesadas y guardadas en el propio repositorio por `scripts/build-model-assets.py` y GitHub Actions, no imágenes extraídas de promociones con textos sobrepuestos.
- El Resumen tiene cuatro tarjetas compactas: C3, Basalt, Aircross y Berlingo. Sus indicadores provienen exclusivamente del export real de Meta Ads.
- La pestaña Modelos ahora tiene **solo seis fichas**: C3, Aircross, Basalt, C3 MAX, Aircross MAX y Berlingo, con fotografías limpias. MAX puede reutilizar imagen de su familia por ser referencia visual; no se presenta como foto exacta de acabado.
- La navegación del sidebar utiliza **pantallas separadas** (una sección visible por vez) en lugar de una página vertical interminable. Los filtros y secciones de plan y ejecución se mantienen disponibles.
- El viejo resumen se sustituyó; algunos controles invisibles de compatibilidad siguen en el DOM para mantener el motor de importación y no romper la capa de datos existente.
- `model-fix.css` controla la nueva jerarquía y apariencia; para forzar actualización de caché se agregó versión a las referencias de código y estilos en `index.html`.

**Despliegue:** GitHub Actions valida JavaScript y consistencia de los datos. La publicación Vercel se configura por conexión del proyecto a `main`; sin acceso autorizado al equipo Vercel no es posible confirmar la URL publicada desde la integración actual.

## Auditoría del 21 de octubre: revisión de los diez libros originales

Se confrontaron las celdas de los libros **ESTRUCTURA PERFORMANCE CITROEN ENERO–OCTUBRE 2026**, incluyendo hojas BOT, ESTRUCTURAA/ESTRUCTURA, BERLINGO, el adicional de abril y los escenarios alternos.

- **Escenario base sujeto a aprobación de versiones:** COP 944.266.850,42. Cinco modelos de pasajeros: COP 855.980.000,40. Berlingo: COP 88.286.850,02.
- **Líneas originales:** 551 partidas con presupuesto en estructuras principales (sin subtotales) + 6 partidas Berlingo en fuentes independientes enero–junio = **557 partidas** en la vista conciliada.
- **Metas de leads:** 99.968,7057 para los cinco modelos de pasajeros en todo el período. La suma BOT E8 de los diez meses es 105.300,0711, pero desde junio **incluye Berlingo** (5.331,3653 leads para junio–octubre). No se pueden llamar leads solo de pasajeros.
- **Berlingo:** enero–mayo el BOT excluye su inversión; junio ya incorpora el presupuesto aunque ESTRUCTURA lo separa; julio–octubre Berlingo ya figura en la estructura principal. No duplicar nunca.
- **Enero:** escenario vigente provisional tomado de BOT V.1 y ESTRUCTURAA con 117 M de pasajeros + 13 M Berlingo. Coexisten un BOT (2) / ESTRUCTURA de 92,5 M con fórmulas rotas. Su aprobación como escenario anterior no está documentada.
- **Marzo:** Estructura 2.0 contiene REMANENTE / PPTO FINAL. Es una posible redistribución y no inversión adicional. Confirmar vigencia.
- **Abril:** el libro **PPTO ADICIONAL!H46 tiene 13.500.000 COP**, no 15 M. El escenario base de abril es COP 50.000.000,40 y el escenario hipotético sumando ese adicional sería COP 63.500.000,40. No incrementar la base sin aprobación.
- **Mayo:** COP 13.480.000 del BOT + COP 786.850,02 Berlingo = COP 14.266.850,02; no sumar totalizadores J, O ni subtotales H63 como si fuesen pauta nueva.
- **Integridad de fuentes:** enero BOT V.1 (2) contiene errores Excel #REF! y #DIV/0!, mayo BOT C20/C22 contiene #REF!. Campos ejecutados del BOT no se aceptan como prueba de gasto real.
- **Objetivos:** septiembre y octubre usan campañas WHATSAPP; no comparar su meta de acciones con formularios Facebook como si fueran el mismo tipo de lead.
- **Ejecución:** el reporte Meta Ads cubre un solo medio y octubre hasta el día 20; la diferencia contra un plan de todo el ecosistema de medios NO es cumplimiento de presupuesto global.

La interfaz **Planeación 2026** conserva el esquema histórico de 551 líneas y lo extiende en memoria con seis partidas Berlingo auditadas sin sobrescribir los datos originales. Las verificaciones mensuales revisan suma por modelo, presupuesto total y metas por separado.

### Documento de auditoría

El Excel de revisión ofrece hojas **LEER PRIMERO**, **MENSUAL RECONCILIADO**, **METAS POR MODELO**, **557 LÍNEAS TRAZABLES**, **ESCENARIOS Y VERSIONES**, **30 ALERTAS AUDITORÍA** y **ARCHIVOS Y FUENTES**. Se mantiene como artefacto de la conversación, no se sube a este repositorio público sin pedirlo expresamente.


## Nueva pantalla: Auditoría Excel (21 de octubre de 2026)

El dashboard contiene ahora una pantalla **Auditoría Excel** independiente y enlazada desde Planeación 2026. Incluye seis indicadores conciliados, 10 meses originales, 60 metas modelo-mes, 6 escenarios/alternativas, los 30 hallazgos de calidad con **hoja y celda**, y 10 fuentes mensuales. Se puede filtrar mes y criticidad, alternar vistas y volver a las **557 asignaciones** trazables de Planeación.

**Fuente:** `data/auditoria_2026.js` documenta cifras originales, metas pasajeros/total BOT y Berlingo, y escenarios sin aprobación. `audit.js` verifica consistencia contra los presupuestos/modelos de `data/proyecciones_2026.js` antes de presentar el panel. `scripts/smoke-audit.cjs` valida la visualización, las vistas y los filtros. 

**No declarar cumplimientos** a partir de la ejecución Meta: el plan corresponde a varios medios y tipos de conversión, mientras que Meta cubre solo una parte de los objetivos y ejecución.


### Fuente anual de campañas: sincronización desde Google Sheets

La fuente principal configurada es **Citroen Seguimiento de campañas**, ID `1ku1vk57fU0_wHChmXObUaUpvw4KARMj6T1vqLpp5YBo`, pestaña **DATA CITROEN AÑO**, `gid=2001595094`, rango A:P. Se leen las columnas reales de cuenta, fecha, campaña, anuncio, conjunto, inversión, formularios, conversaciones, impresiones, clics y alcance. El informe de 2026 excluye fechas de otros años y registra cuántas excluyó. No se promedian los CPL/CTR/CPM de filas; se calculan desde las sumas.

**Activación única por el administrador:** en Diseño → Añadir datos → Preparar actualización automática, copiar el código privado. En la hoja original, abrir Extensiones → Apps Script, crear un archivo nuevo `CitroenSync.gs` sin sustituir scripts existentes, pegar y guardar. Ejecutar `instalarCitroenSync` y autorizar con la cuenta que accede a la hoja. Volver al dashboard y pulsar Comprobar conexión. Google Workspace puede exigir autorización de su administrador. No requiere `GOOGLE_SERVICE_ACCOUNT_JSON` y no se hace pública la hoja.

El script lee solo la pestaña anual (hasta 250.000 filas, por bloques de 5.000) y prepara un resumen completo. Instala un único activador horario de esta integración y realiza un primer envío. Los resultados agregados y nombres de campañas se muestran en el dashboard publicado; los datos de las otras pestañas no se transmiten. Para pausar, ejecutar `pausarCitroenSync`. La hora exacta de ejecución depende del programador de Google y sus cuotas. Un fallo de permisos, cuota o datos conserva el último envío correcto. La interfaz distingue **última sincronización** y **fecha del último dato**: actualizar el dashboard no actualiza por sí solo Supermetrics/Dataslayer ni las campañas de origen.

La configuración guarda solo el hash de una clave exclusiva de ingestión; el código privado se entrega únicamente al propietario autenticado, no se persiste en el navegador y se retira de pantalla al cerrar sesión. Generar un código nuevo revoca el anterior. `/api/campaign-sync` valida la fuente y pestaña exactas, fechas, métricas, tamaño, diccionarios y conciliación de las tres vistas antes de sustituir atómicamente el resumen en Blob privado. Ningún borrador de publicación ni usuario del editor se modifica. El endpoint de lectura sirve el resumen autorizado para el dashboard público. Resumen, Meta Ads, Studio y gráficos del constructor comparten la misma revisión y consultan novedades cada minuto mientras el sitio está visible.

**Estado de entrega:** el código está preparado, pero la conexión no debe marcarse activa hasta recibir un envío autorizado desde Google. Hasta entonces se conserva la exportación histórica del repositorio, identificada como tal. La copia XLSX adjunta se usó para verificar el mapeo y la conciliación; no se trató como una conexión viva.

**Pruebas:** `node --test scripts/test-campaign-sync.mjs` verifica más de 5.000 filas, fechas, columnas, conciliación, autenticación, ámbito exacto, reenvíos, revocación y el activador generado. `node scripts/smoke-campaign-sync.cjs` comprueba fuente compartida, actualización del resumen/Meta, fallo de red, estado pendiente y eliminación del código privado al salir. Las respuestas de Google/Blob están simuladas en estas pruebas; la autorización y el primer envío real siguen siendo necesarios.
