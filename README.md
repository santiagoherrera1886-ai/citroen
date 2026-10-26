# Citroën · Performance Intelligence

## BUILDER 2.0 — PÁGINAS, CREATIVOS, INSIGHTS Y CONEXIONES (26/10/2026)

**Modo lectura y entrada:** el botón de edición de la cabecera se oculta sin sesión. Visitantes encuentran el acceso discreto **🔒 Ingresar a Diseño** al final del menú lateral. Tras iniciar sesión y entrar en Diseño aparecen la barra de gráficos, panel de estilo, botón de movimiento libre y control maestro. La primera activación acepta pegar el código completo o su parte posterior al prefijo `CITROEN-`, ignorando espacios y caracteres invisibles comunes; la contraseña inicial debe sustituirse por una fuerte.

**Páginas nuevas:** en la barra izquierda, el editor autenticado dispone de **＋ Nueva página**. Cada página ofrece lienzo de tarjetas con posición absoluta, arrastre por manejador, redimensionar desde la esquina, y tipos: indicador, gráfico (barras/línea/área/tabla), imagen, filtro y texto/insight. El lienzo original de Resumen también ofrece **↔ Mover libremente** y permite volver a la cuadrícula tradicional. Las tarjetas de Meta utilizan `meta_2026_daily.json` y su diccionario, no datos de demostración.

**Creativos:** sección pública **Creativos** con piezas cargadas por el editor: título, campaña, formato, URL HTTPS o archivo JPG/PNG/WebP comprimido en el navegador, y notas. Las imágenes publicadas quedan visibles para quienes ven el tablero. No se inventan previews ni métricas de anuncios.

**Insights:** sección de hallazgos escritos por el equipo, título, contenido y fecha de actualización. El texto se trata como contenido plano escapado, no HTML ejecutable. Los editores escriben, revisan y publican.

**Filtros:** desde Diseño > Filtros puedes mostrar u ocultar período, modelo y territorio en Resumen. Las nuevas páginas soportan tarjetas de filtro para mes y modelo, con cambios instantáneos en los gráficos de la página.

**Publicación real:** `POST /api/dashboard` requiere sesión de editor/propietario y guarda páginas, creativos, filtros, insights y posición libre de Resumen en **Vercel Blob privado**; `GET /api/dashboard` devuelve la versión publicada para visitantes. No es solo localStorage. El botón **Publicar cambios** es obligatorio; el navegador conserva un borrador local entre ediciones. La publicación almacena solo la estructura aprobada y contenido de piezas, no credenciales externas.

**Conexiones a datos (acceso privado):** sección **Conexiones de datos** solo al editar, con `POST /api/data-connect` autenticado:
- Google Sheets público: URL normal de `docs.google.com/spreadsheets/d/...`; lee hasta 100 filas de la pestaña mediante CSV. No funciona si la hoja no permite exportación pública.
- Google Sheets privado: requiere `GOOGLE_SERVICE_ACCOUNT_JSON` en variables privadas de Vercel y compartir el Sheet con el correo de la cuenta de servicio; lectura mediante API Sheets.
- BigQuery: usa la misma cuenta de servicio, con permiso de consultar la tabla y de crear jobs de solo lectura en el proyecto. Consulta `SELECT * ... LIMIT 100` con límite de datos escaneados de 100 MB por consulta. Sin credenciales aún no hay conexión activa.
- Los resultados son **vistas previas privadas** durante la sesión del editor: pueden agregarse como tabla/gráfico en una página. **No se publica la extracción privada** con las páginas; al recargar debe reconectarse para ver sus filas. Nunca se almacenan claves ni tokens OAuth en el HTML del dashboard.

**Límites honestos:** el nuevo lienzo soporta gráficos y tarjetas de fuentes especificadas, no todas las 49 visualizaciones ni conectores arbitrarios de Looker Studio. No hay colaboración simultánea multiusuario o versionado histórico de informes; publicación es último guardado (last-write-wins). Para producción con bases privadas, configurar la cuenta de servicio de Google con permisos mínimos y habilitar las APIs BigQuery y Sheets.

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
