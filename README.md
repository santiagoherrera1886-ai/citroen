# Citroën · Performance Intelligence

Dashboard premium Montecarlo Blue para Citroën Colombia, basado en los módulos operativos de Suzuki Performance Intelligence, pero desarrollado desde cero.

## Estado

- **Diseño y navegación:** implementados.
- **Catálogo de vehículos:** Citroën C3, Aircross y Basalt con referencias fotográficas de la web oficial de Citroën Colombia.
- **Métricas publicitarias:** SIN DATOS hasta recibir un reporte Citroën real.
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
