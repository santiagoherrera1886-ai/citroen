/* Citroen Studio — contextual builder inspector and page zoom/grid. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dims=[['date','Día'],['week','Semana'],['month','Mes'],['quarter','Trimestre'],['model','Modelo'],['territory','Territorio'],['account','Cuenta Meta']];
const mets=[['spend','Inversión'],['forms','Formularios'],['messages','Conversaciones'],['impressions','Impresiones'],['reach','Alcance estimado'],['clicks','Clics'],['ctr','CTR'],['cpl','CPL']];
const types=[['bar','Barras'],['barh','Barras horizontales'],['line','Líneas'],['area','Área'],['table','Tabla'],['pie','Circular'],['donut','Anillo'],['gauge','Medidor']];
const options=(array,current)=>array.map(pair=>'<option value="'+safe(pair[0])+'" '+(pair[0]===current?'selected':'')+'>'+safe(pair[1])+'</option>').join('');
let selected=null,page='resumen',tab='data',started=false,zoom=100,grid=true;
const mode=()=>document.body.classList.contains('citroen-looker-edit');
const builder=()=>window.CITROEN_BUILDER;
const pageId=()=>page.startsWith('report-')?page.slice(7):null;
const card=()=>selected&&pageId()?builder()?.getCard(pageId(),selected):null;
function refresh(){
 const candidate=builder()?.getCurrentPage?.();
 page=candidate&&$(candidate)?candidate:document.querySelector('.sidebar .nav-link.active')?.dataset.target||'resumen';
 document.body.classList.toggle('le-custom-page',mode()&&!!pageId());
 if($('leCanvasTitle'))$('leCanvasTitle').textContent=document.querySelector('.page-section.is-active h2')?.textContent||'Resumen · Colombia';
 render();
}
function render(){
 const root=$('leBuilderProperties');if(!root)return;
 root.hidden=!(mode()&&pageId());
 if(root.hidden)return;
 const c=card(),p=builder()?.getPages().find(x=>x.id===pageId());
 if(!c){
  root.innerHTML='<div class="lep-header"><small>PROPIEDADES DE LA PÁGINA</small><strong>'+safe(p?.title||'Informe')+'</strong></div>'+
  '<div class="lep-body"><p class="lep-muted">Selecciona una tarjeta del lienzo. Sus campos, métricas y estilos aparecerán aquí.</p><div class="lep-heading">Página</div>'+
  '<label>Nombre de página<input data-le-page-title maxlength="70" value="'+safe(p?.title||'')+'"></label>'+
  '<div class="lep-actions"><button data-le-action="rename-page">Renombrar</button><button data-le-action="move-up">Subir</button><button data-le-action="move-down">Bajar</button></div>'+
  '<div class="lep-heading">Insertar elemento</div><div class="lep-quick-grid"><button data-le-add="chart">▥ Gráfico</button><button data-le-add="metric">▣ Indicador</button><button data-le-add="note">T Texto</button><button data-le-add="image">▧ Imagen</button><button data-le-add="filter">☷ Filtro</button></div>'+
  '<p class="lep-muted">Este diseño es un borrador. Usa Publicar para compartirlo con visitantes.</p></div>';
  return;
 }
 const head='<div class="lep-header"><small>ELEMENTO SELECCIONADO</small><strong>'+safe(c.title)+'</strong><span>'+safe(c.type.toUpperCase())+'</span></div>'+
 '<div class="lep-tabs"><button type="button" data-le-tab="data" class="'+(tab==='data'?'active':'')+'">Configuración</button>'+
 '<button type="button" data-le-tab="style" class="'+(tab==='style'?'active':'')+'">Estilo</button></div>';
 const external=c.source==='external',source=external?window.CITROEN_SOURCES?.get(c.sourceId):null;
 const schema=window.CITROEN_SOURCE_DATA?.fields(source)||[],externalFields=schema.map(f=>[f.name,f.name]);
 const cardDims=external?externalFields:dims,cardMets=external?externalFields:mets,cardTypes=external?types.filter(t=>['bar','barh','line','area','table'].includes(t[0])):types;
 let html='';
 if(tab==='data'){
  html='<div class="lep-heading">Fuente de datos</div>';
  if(c.type==='chart'||c.type==='metric')html+='<label>Conexión<select data-le-property="sourceId"><option value="meta" '+(!external?'selected':'')+'>Meta Ads · 2026</option>'+ (window.CITROEN_SOURCES?.list()||[]).map(d=>'<option value="'+safe(d.id)+'" '+(c.sourceId===d.id?'selected':'')+' '+(!d.connected?'disabled':'')+'>'+safe(d.name)+(d.connected?'':' · reconectar')+'</option>').join('')+'</select></label>';
  html+='<div class="lep-dataset">▣ &nbsp; '+safe(external?(source?.name||'Fuente privada · reconectar'):'Meta Ads · 2026')+'<small>'+safe(external?(source?source.rows.length+' filas · Solo en Diseño':'Abre Añadir datos para actualizar la fuente'):'Datos diarios reales')+'</small></div>'+
  '<label>Nombre del elemento<input data-le-property="title" maxlength="100" value="'+safe(c.title)+'"></label>';
  if(c.type==='chart'||c.type==='metric'){
   html+='<div class="lep-heading">Dimensión</div><label class="lep-dropzone" data-le-dropzone="dimension"><small>Arrastra aquí un campo de dimensión</small><select data-le-property="dimension">'+options(cardDims,c.dimension)+'</select></label>'+
   '<div class="lep-heading">Métrica</div><label class="lep-dropzone" data-le-dropzone="metric"><small>Arrastra aquí un campo de métrica</small><select data-le-property="metric">'+options(cardMets,c.metric)+'</select></label>';
   if(c.type==='chart')html+='<div class="lep-heading">Visualización</div><label><select data-le-property="shape">'+options(cardTypes,c.shape)+'</select></label>';
   if(external)html+='<label>Agregación<select data-le-property="aggregation">'+options([['sum','Suma'],['avg','Promedio'],['count','Recuento de filas'],['min','Mínimo'],['max','Máximo']],c.aggregation||'sum')+'</select></label><p class="lep-muted">Los filtros de Meta no se aplican a esta fuente. Los datos privados solo se muestran al editar.</p>';
   if(c.shape==='gauge')html+='<label>Objetivo numérico<input data-le-property="goal" type="number" min="1" value="'+safe(c.goal||'')+'"></label>';
  }
  if(c.type==='note')html+='<div class="lep-heading">Texto o insight</div><label><textarea data-le-property="text" rows="10">'+safe(c.text)+'</textarea></label>';
  if(c.type==='image')html+='<p class="lep-muted">Para subir una imagen JPG, PNG o WebP usa el editor detallado.</p>';
  html+='<div class="lep-heading">Organizar</div><div class="lep-actions"><button data-le-action="duplicate">Duplicar</button><button data-le-action="delete" class="danger">Eliminar</button></div>';
 }else{
  html+='<div class="lep-heading">Personalizar colores</div>'+
   '<label class="lep-color">Color de serie<input data-le-property="color" type="color" value="'+safe(c.color||'#8abbd8')+'"></label>'+
   '<label class="lep-color">Color de fondo<input data-le-property="background" type="color" value="'+safe(c.background||'#ffffff')+'"></label>'+
   '<label class="lep-color">Color del texto<input data-le-property="textColor" type="color" value="'+safe(c.textColor||'#173e57')+'"></label>'+
   '<div class="lep-heading">Dimensiones</div><div class="lep-sizes"><span>Ancho: '+Math.round(c.w||0)+' px</span><span>Alto: '+Math.round(c.h||0)+' px</span></div>'+
   '<p class="lep-muted">Mueve la tarjeta desde su manejador de puntos y redimensiona desde su esquina inferior derecha.</p>';
 }
 root.innerHTML=head+'<div class="lep-body">'+html+'<div class="lep-heading">Más opciones</div><button class="lep-more" data-le-action="modal">Abrir editor detallado</button></div>';
}
function update(prop,v){
 if(!card())return;
 const patch=prop==='sourceId'&&v==='meta'?{source:'meta',metric:'spend',dimension:'month'}:{[prop]:v};
 const result=builder()?.updateCard(pageId(),selected,patch);
 if(result)document.dispatchEvent(new Event('citroen:source-selection-changed'));
 if(result&&(!['color','background','textColor'].includes(prop)))render();
}
function assignField(field){
 if(!mode()||!card())return false;
 if(card().source==='external'){const src=window.CITROEN_SOURCES?.get(card().sourceId),f=window.CITROEN_SOURCE_DATA?.fields(src).find(f=>f.name===field);if(!f)return false;update(f.type==='metric'?'metric':'dimension',field);return true;}
 if(mets.some(x=>x[0]===field)){update('metric',field);return true;}
 if(dims.some(x=>x[0]===field)){update('dimension',field);return true;}
 return false;
}
function duplicateSelection(){return !!(card()&&builder()?.duplicateCard(pageId(),selected));}
function setZoom(n){
 n=Number(n);if(![65,75,85,100,110,125].includes(n))return;
 zoom=n;window.CITROEN_EDITOR_ZOOM=n/100;
 document.body.style.setProperty('--le-canvas-zoom',String(n/100));
 if($('leZoom'))$('leZoom').value=String(n);
}
function showGrid(x){grid=!!x;document.body.classList.toggle('le-grid-on',mode()&&grid);$('leGrid')?.setAttribute('aria-pressed',String(grid));}
function wire(){
 if(started)return;started=true;
 const root=document.createElement('aside');root.id='leBuilderProperties';root.className='lep-shell';root.hidden=true;root.setAttribute('aria-label','Propiedades del gráfico seleccionado');document.body.appendChild(root);
 const controls=document.createElement('div');controls.className='le-canvas-tools';
 controls.innerHTML='<label>Zoom <select id="leZoom" aria-label="Zoom del lienzo"><option value="65">65%</option><option value="75">75%</option><option value="85">85%</option><option value="100" selected>100%</option><option value="110">110%</option><option value="125">125%</option></select></label><button id="leGrid" type="button" aria-pressed="true">▦ Cuadrícula</button><span>Selecciona una tarjeta para editar</span>';
 $('leToolbarStatus')?.insertAdjacentElement('afterend',controls);
 $('leZoom').onchange=e=>setZoom(e.target.value);
 $('leGrid').onclick=()=>showGrid(!grid);
 root.onclick=e=>{
  const t=e.target.closest('[data-le-tab]');if(t){tab=t.dataset.leTab;render();return;}
  const plus=e.target.closest('[data-le-add]');if(plus){builder()?.addOnCurrent(plus.dataset.leAdd);return;}
  const action=e.target.closest('[data-le-action]')?.dataset.leAction;
  if(!action)return;
  if(action==='duplicate')return duplicateSelection();
  if(action==='delete'){if(confirm('¿Eliminar esta tarjeta?')){builder()?.removeCard(pageId(),selected);selected=null;render();}return;}
  if(action==='modal'){document.querySelector('.builder-board-card[data-card-id="'+selected+'"] .builder-card-edit')?.click();return;}
  if(action==='rename-page'){builder()?.renamePage(pageId(),root.querySelector('[data-le-page-title]')?.value);return;}
  if(action==='move-up'||action==='move-down')builder()?.reorderPage(pageId(),action==='move-up'?-1:1);
 };
 root.onchange=e=>{const t=e.target.closest('[data-le-property]');if(t)update(t.dataset.leProperty,t.value);};
 root.addEventListener('dragover',e=>{
  const zone=e.target.closest('[data-le-dropzone]');if(!zone||!mode()||!card())return;
  e.preventDefault();zone.classList.add('lep-dragover');
  if(e.dataTransfer)e.dataTransfer.dropEffect='copy';
 });
 root.addEventListener('dragleave',e=>{const zone=e.target.closest('[data-le-dropzone]');if(zone&&!zone.contains(e.relatedTarget))zone.classList.remove('lep-dragover');});
 root.addEventListener('drop',e=>{
  const zone=e.target.closest('[data-le-dropzone]');if(!zone||!mode()||!card())return;
  e.preventDefault();zone.classList.remove('lep-dragover');
  const key=e.dataTransfer?.getData('text/plain'),prop=zone.dataset.leDropzone;
  if(card().source==='external'&&['metric','dimension'].includes(prop)&&window.CITROEN_SOURCES?.get(card().sourceId)?.columns.includes(key)){update(prop,key);return;}
  if(prop==='metric'&&mets.some(x=>x[0]===key))update('metric',key);
  else if(prop==='dimension'&&dims.some(x=>x[0]===key))update('dimension',key);
 });

 document.addEventListener('citroen:builder-card-selected',e=>{if(!mode())return;selected=e.detail?.card?.id||null;tab='data';refresh();});
 document.addEventListener('citroen:builder-page-changed',e=>{page=e.detail?.id||'resumen';selected=null;tab='data';refresh();});
 document.addEventListener('citroen:studio-layout',()=>{if(!mode())selected=null;refresh();showGrid(grid);});
 document.addEventListener('citroen:builder-page-order',refresh);
 document.addEventListener('citroen:sources-changed',refresh);
 document.addEventListener('click',e=>{if(mode()&&e.target.closest('.le-page-item'))queueMicrotask(refresh);});
 setZoom(100);refresh();
}
document.addEventListener('DOMContentLoaded',wire);
window.CITROEN_LOOKER_PROPERTIES={assignField,duplicateSelection,refresh,setZoom};
})();