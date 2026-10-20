# Citroën · Performance Intelligence

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

- `data/proyecciones_2026.js`: 10 presupuestos mensuales, 60 filas modelo-mes y 551 líneas del detalle.
- `data/meta_2026_daily.json`: resumen de ejecución diaria obtenido de 27.840 registros del archivo de reporte.
- `data/meta_2026_detail.json`: detalle de campañas, conjuntos y anuncios reales (sin URLs creativas originales).
- `concept3.js`: solo consume las fuentes existentes y muestra datos derivados, no ejemplos ni cifras inventadas.

### Validación

GitHub Actions valida sintaxis de `app.js`, `meta.js`, `planning.js` y `concept3.js`, integridad del esquema proyectado y conciliación de la ejecución de Meta en todas las agregaciones.
