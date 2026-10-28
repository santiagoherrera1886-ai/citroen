/* Citroen Pages & Canvas — freeform reporting workspace with published layouts. */
(function(){
'use strict';
const $=id=>document.getElementById(id),KEY='citroen_workspace_draft_v1';
const empty=()=>({version:1,summaryLayout:{enabled:false,items:{}},controls:[],pages:[],insights:[],creatives:[],filters:{month:true,model:true,territory:true}});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>('item-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7));
const authorized=()=>window.CITROEN_ACCESS?.canEdit()===true&&$('c3Dashboard')?.classList.contains('studio-edit-on');
const CL={spend:'Inversión',forms:'Formularios',messages:'Conversaciones',impressions:'Impresiones',reach:'Alcance estimado',clicks:'Clics enlace',ctr:'CTR enlace',cpl:'Costo por formulario'};
const mk=(tag,attrs={},content='')=>{const el=document.createElement(tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);el.innerHTML=content;return el;};
const button=(text,fn,cls='builder-btn')=>{const b=mk('button',{type:'button',class:cls});b.textContent=text;b.onclick=fn;return b;};
let state=empty(),current='resumen',data=[],localFilter={month:'',model:''},busy=false,selectedCardId=null;
let lastPublishedRevision='initial',baseRevision='initial',pendingDraft=null,dirty=false,summaryBaseline=null;
function localDraft(){
 try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!raw||typeof raw!=='object')return null;
  if(raw.draftVersion===2&&raw.workspace?.pages)return raw;
  return Array.isArray(raw.pages)?{draftVersion:2,workspace:raw,baseRevision:null,savedAt:null}:null;
 }catch{return null;}
}
function draftUI(){
 document.dispatchEvent(new CustomEvent('citroen:draft-state',{detail:{dirty,pending:!!pendingDraft,busy}}));
 const banner=$('builderDraftBanner');if(!banner)return;
 banner.hidden=!authorized()||(!pendingDraft&&!dirty);
 if(banner.hidden)return;
 const when=pendingDraft?.savedAt?new Date(pendingDraft.savedAt).toLocaleString('es-CO'):'fecha no disponible';
 $('builderDraftMessage').textContent=pendingDraft
  ?'Borrador sin publicar ('+when+'). Puedes recuperarlo antes de editar.'
  :'Cambios guardados en este navegador, todavía no publicados.';
 $('builderDraftRestore').hidden=!pendingDraft;
 $('builderDraftDiscard').hidden=!pendingDraft;
}
function stash(){
 if(!authorized())return;
 dirty=true;
 try{localStorage.setItem(KEY,JSON.stringify({draftVersion:2,workspace:state,baseRevision,savedAt:Date.now()}));}
 catch{status('No se pudo guardar el borrador; exporta el diseño antes de salir.');}
 draftUI();
}
function status(s){if($('builderStatus'))$('builderStatus').textContent=s;document.dispatchEvent(new CustomEvent('citroen:save-status',{detail:{message:s,busy,dirty}}));}
function watchSummary(){
 const snapshot=window.CITROEN_STUDIO_ACTIONS?.exportPublished?.();
 if(!snapshot)return;
 const next=JSON.stringify(snapshot);
 if(summaryBaseline===null){summaryBaseline=next;return;}
 if(next===summaryBaseline)return;
 summaryBaseline=next;
 if(!authorized())return;
 stash();
 status('Cambios del Resumen guardados como borrador. Pulsa Publicar cambios para compartirlos.');
}
function cleanURL(s){if(window.CITROEN_SHARED_MEDIA?.isManaged(s))return s;try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return typeof s==='string'&&/^data:image\/(?:jpeg|png|webp);base64,/.test(s)&&s.length<120000?s:'';}}
function make(id,title,edit=false){const section=mk('section',{id,class:'page-section builder-page'});section.innerHTML='<div class="builder-section-head"><div><span class="builder-eyebrow">CITROËN · WORKSPACE</span><h2>'+esc(title)+'</h2></div><div class="builder-head-actions" id="'+id+'Actions"></div></div><div id="'+id+'Body"></div>';return section;}
function navTo(id){
 if(!$(id))return;
 current=id;
 document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.target===id));
 document.querySelectorAll('.content > section.page-section').forEach(s=>s.classList.toggle('is-active',s.id===id));
 $('breadcrumb').textContent=id==='resumen'?'Resumen':$(id)?.querySelector('h2')?.textContent||id;
 history.replaceState(null,'','#'+id);
 $('sidebar').classList.remove('open');$('sidebarOverlay').classList.remove('show');
 window.scrollTo({top:0,behavior:'instant'});
 const viewport=document.querySelector('.content');if(viewport){viewport.scrollTop=0;viewport.scrollLeft=0;}
 document.dispatchEvent(new CustomEvent('citroen:builder-page-changed',{detail:{id,title:id==='resumen'?'Resumen':$(id)?.querySelector('h2')?.textContent||id}}));
 render();
}
function pageNav(id,label){const btn=mk('button',{type:'button',class:'nav-link builder-nav', 'data-target':id},'<span class="builder-nav-icon">◇</span> '+esc(label));btn.onclick=()=>navTo(id);return btn;}
function initSections(){
 const nav=$('sidebar').querySelector('.nav'),main=document.querySelector('.content');
 for(const [id,label] of [['citroen-compare','Comparador avanzado'],['citroen-alerts','Centro de alertas'],['citroen-creatives','Creativos'],['citroen-insights','Insights'],['citroen-sources','Conexiones de datos']]){
  if(!$(id))main.appendChild(make(id,label));
  if(!nav.querySelector('[data-target="'+id+'"]'))nav.appendChild(pageNav(id,label));
 }
 const a=mk('div',{class:'builder-menu'},'<div class="builder-menu-title">MIS PÁGINAS</div><div id="builderPageLinks"></div>');
 nav.appendChild(a);
 const dock=mk('div',{class:'builder-global-actions',id:'builderGlobalActions',hidden:''});
 dock.innerHTML='<button id="builderNewPage" type="button">＋ Nueva página</button><button id="builderTemplates" type="button">▦ Plantillas de informes</button><button id="builderFilterSetup" type="button">⚙ Filtros</button><button id="builderNewFilter" type="button">＋ Control / filtro avanzado</button><button id="builderManageFilters" type="button">Administrar filtros</button><button id="builderPublish" type="button">Publicar cambios</button><button id="builderHistory" type="button" hidden>↶ Historial de versiones</button><div id="builderDraftBanner" class="builder-draft-banner" hidden><strong>Guardado de borradores</strong><p id="builderDraftMessage"></p><button type="button" id="builderDraftRestore" hidden>Recuperar borrador</button><button type="button" id="builderDraftDiscard" hidden>Descartar borrador</button></div><small id="builderStatus">Modo lectura</small>';
 $('sidebar').querySelector('.sidebar-bottom').prepend(dock);
 const filt=mk('div',{id:'builderFilterModal',class:'builder-filter-modal',hidden:''});
 filt.innerHTML='<div class="builder-filter-content"><button id="builderFilterClose" type="button">×</button><h3>Filtros del dashboard</h3><p>Elige los controles que mostrarán todos los usuarios en Resumen.</p><label><input type="checkbox" data-filter-toggle="month"> Período</label><label><input type="checkbox" data-filter-toggle="territory"> Territorio</label><label><input type="checkbox" data-filter-toggle="model"> Modelo</label></div>';
 document.body.appendChild(filt);
 $('builderFilterClose').onclick=()=>filt.hidden=true;
 $('builderFilterSetup').onclick=()=>{if(!authorized())return;filt.hidden=false;filt.querySelectorAll('input').forEach(i=>i.checked=state.filters[i.dataset.filterToggle]!==false);};
 filt.querySelectorAll('input').forEach(x=>x.onchange=()=>{if(!authorized())return;state.filters[x.dataset.filterToggle]=x.checked;applyFilters();stash();status('Filtros editados; publica para compartirlos.');});
 $('builderNewPage').onclick=()=>createPage();
 $('builderTemplates').onclick=()=>openTemplateGallery();
 $('builderNewFilter').onclick=()=>editFilter();
 $('builderManageFilters').onclick=()=>manageFilters();
 $('builderPublish').onclick=()=>publish();
 $('builderHistory').onclick=()=>openHistory();
 $('builderDraftRestore').onclick=()=>{
  if(!authorized()||!pendingDraft)return;
  state=pendingDraft.workspace;
  if(!Array.isArray(state.pages))return;
  state.controls=Array.isArray(state.controls)?state.controls:[];
  baseRevision=pendingDraft.baseRevision||lastPublishedRevision;
  pendingDraft=null;dirty=true;
  window.CITROEN_FILTER_ENGINE?.setDefinitions(state.controls);
  drawPageNav();applyFilters();render();stash();
  status(baseRevision!==lastPublishedRevision
    ?'Borrador recuperado. Otra persona publicó una versión distinta; no se sobrescribirá.'
    :'Borrador recuperado; listo para publicar.');
 };
 $('builderDraftDiscard').onclick=()=>{
  if(!authorized())return;
  pendingDraft=null;dirty=false;baseRevision=lastPublishedRevision;
  try{localStorage.removeItem(KEY);}catch{}
  draftUI();status('Borrador antiguo descartado; se conserva la versión publicada.');
 };
}
function applyFilters(){
 for(const [field,id] of [['month','c3Month'],['territory','c3Territory'],['model','c3Model']]){
  const select=$(id),label=select?.closest('label');if(label)label.hidden=state.filters?.[field]===false;
 }
}
function drawPageNav(){
 const list=$('builderPageLinks');if(!list)return;
 list.replaceChildren();
 for(const p of state.pages){
  if(!p||!p.id)continue;
  const id='report-'+p.id;
  if(!$(id))document.querySelector('.content').appendChild(make(id,p.title));
  const title=$(id).querySelector('h2');title.textContent=p.title;
  list.appendChild(pageNav(id,p.title));
 }
 document.querySelectorAll('.builder-page[id^="report-"]').forEach(el=>{if(!state.pages.some(p=>'report-'+p.id===el.id))el.remove();});
}
function manageFilters(){
 if(!authorized())return;
 const m=$('builderFilterListDialog');m.hidden=false;
 const list=$('builderDefinedFilters');list.replaceChildren();
 for(const d of state.controls||[]){
  const line=document.createElement('div');line.className='builder-filter-line';
  const tag=document.createElement('div');tag.textContent=d.label+' · '+(window.CITROEN_FILTER_ENGINE?.TYPES[d.type]||d.type)+' · '+(d.scope==='report'?'Todas las páginas':d.scope==='page'?'Página '+d.pageId:'Solo gráfico '+d.cardId);
  line.appendChild(tag);
  line.appendChild(button('Editar',()=>{m.hidden=true;editFilter(d);}));
  line.appendChild(button('Eliminar',()=>{if(!confirm('¿Quitar este control?'))return;state.controls=state.controls.filter(x=>x.id!==d.id);stash();refreshControls();manageFilters();},'builder-btn-danger'));
  list.appendChild(line);
 }
 if(!state.controls?.length)list.textContent='Todavía no hay filtros personalizados. Agrégalos desde Diseño.';
}
function refreshControls(){
 window.CITROEN_FILTER_ENGINE?.setDefinitions(state.controls||[]);
 status('Filtros actualizados en este navegador. Publica cambios para compartirlos.');
}
function editFilter(existing){
 if(!authorized())return;
 const dialog=$('builderFilterEditor');dialog.hidden=false;
 const form=$('builderFilterEditorForm'),filters=window.CITROEN_FILTER_ENGINE;
 if(!filters)return status('Motor de filtros no disponible.');
 const d=existing||{id:uid(),type:'relative',field:'date',scope:'report',pageId:'resumen',cardId:'',label:'Período de análisis',preset:'all',operator:'contains',logic:'AND',values:[],enabled:true,exclude:false};
 const field=form.elements;
 field.label.value=d.label||'';
 field.type.value=d.type;
 field.field.value=d.field;
 field.scope.value=d.scope;
 field.pageId.innerHTML='<option value="resumen">Resumen original</option>'+state.pages.map(p=>'<option value="report-'+esc(p.id)+'">'+esc(p.title)+'</option>').join('');
 field.pageId.value=d.pageId||'resumen';
 const fillCards=()=>{
  const id=field.pageId.value;
  const options=id==='resumen'
   ?[['n:c3ComparePanel','Planeado vs ejecutado'],['n:c3FunnelPanel','Funnel'],['n:c3ModelsPanel','Modelos']]
   :(state.pages.find(p=>'report-'+p.id===id)?.cards||[]).map(c=>['c:'+c.id,c.title]);
  field.cardId.innerHTML=options.map(([k,v])=>'<option value="'+esc(k)+'">'+esc(v)+'</option>').join('');
  if(options.some(([k])=>k===d.cardId))field.cardId.value=d.cardId;
 };
 fillCards();
 field.pageId.onchange=fillCards;
 field.operator.value=d.operator||'contains';
 field.logic.value=d.logic||'AND';
 field.preset.value=d.preset||'all';
 field.value.value=d.value||'';
 field.start.value=d.start||'';
 field.end.value=d.end||'';
 field.min.value=d.min??'';
 field.max.value=d.max??'';
 field.exclude.checked=!!d.exclude;field.enabled.checked=d.enabled!==false;
 $('builderFilterEditSave').onclick=()=>{
  let type=field.type.value,campo=field.field.value;
  if(['date','relative'].includes(type))campo='date';
  if(['number','slider'].includes(type)&&!['spend','forms','messages','impressions','reach','clicks'].includes(campo))return status('El rango numérico requiere una métrica cuantitativa.');
  const proposal={id:d.id,label:field.label.value.trim()||filters.FIELDS[campo],type,field:campo,scope:field.scope.value,pageId:field.pageId.value,cardId:field.cardId.value,
   operator:field.operator.value,logic:field.logic.value,preset:field.preset.value,value:field.value.value,start:field.start.value,end:field.end.value,
   min:field.min.value===''?null:Number(field.min.value),max:field.max.value===''?null:Number(field.max.value),exclude:field.exclude.checked,enabled:field.enabled.checked};
  if(proposal.type==='date'&&proposal.start&&proposal.end&&proposal.start>proposal.end)return status('La fecha inicial no puede ser posterior a la final.');
  if(proposal.scope==='chart'&&!proposal.cardId)return status('Selecciona el gráfico que recibirá el filtro.');
  const clean=filters.normalize(proposal);if(!clean)return status('La configuración del filtro no es válida.');
  if(!existing&&state.controls.length>=40)return status('Máximo de 40 controles publicados por informe.');
  if(existing){const i=state.controls.findIndex(x=>x.id===existing.id);if(i>=0)state.controls[i]=clean;}
  else state.controls.push(clean);
  stash();dialog.hidden=true;refreshControls();
 };
}
function canCreatePage(){
 if(!authorized())return false;
 if(state.pages.length>=15){status('Límite de 15 páginas. Duplica o elimina una página existente antes de continuar.');return false;}
 return true;
}
function installPage(newPage,notice){
 if(!canCreatePage()||!newPage||!Array.isArray(newPage.cards))return false;
 if(newPage.cards.length>45){status('La página supera el límite de 45 tarjetas.');return false;}
 state.pages.push(newPage);
 selectedCardId=null;
 stash();drawPageNav();navTo('report-'+newPage.id);
 status(notice||'Página creada en tu borrador; pulsa Publicar para compartirla.');
 return true;
}
function clonePage(pageId){
 if(!canCreatePage())return false;
 const page=state.pages.find(p=>p.id===pageId);
 if(!page)return false;
 const idMap=new Map();
 const cards=page.cards.map(original=>{
  const newId=uid();idMap.set('c:'+original.id,'c:'+newId);
  return {...original,id:newId};
 });
 const copy={id:uid(),title:(page.title+' · copia').slice(0,70),cards};
 const related=(state.controls||[]).filter(control=>{
  return control.scope==='page'&&control.pageId==='report-'+page.id
   ||control.scope==='chart'&&control.pageId==='report-'+page.id;
 }).slice(0,Math.max(0,40-(state.controls||[]).length)).map(control=>({
  ...control,id:uid(),pageId:'report-'+copy.id,
  cardId:idMap.get(control.cardId)||control.cardId
 }));
 state.controls=(state.controls||[]).concat(related);
 window.CITROEN_FILTER_ENGINE?.setDefinitions(state.controls);
 return installPage(copy,'Página duplicada con '+cards.length+' tarjetas y '+related.length+' controles. Publica cuando esté lista.');
}
function openTemplateGallery(){
 if(!canCreatePage())return;
 const api=window.CITROEN_REPORT_TEMPLATES;
 if(!api){status('Plantillas no disponibles. Recarga la página e inténtalo otra vez.');return;}
 let modal=$('builderTemplateDialog');
 if(!modal){
  modal=document.createElement('div');
  modal.id='builderTemplateDialog';modal.className='builder-dialog';modal.hidden=true;
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','builderTemplateHeading');
  modal.innerHTML='<div class="builder-dialog-panel builder-template-panel"><button class="builder-close" type="button" id="builderTemplateClose" aria-label="Cerrar galería">×</button><span class="builder-eyebrow">CITROËN STUDIO / CREAR PÁGINA</span><h3 id="builderTemplateHeading">Elige una plantilla</h3><p>Diseños listos para organizar. Las cifras se calculan con los datos disponibles de Meta Ads; no contienen metas inventadas.</p><div class="builder-template-grid" id="builderTemplateGrid"></div></div>';
  document.body.appendChild(modal);
  $('builderTemplateClose').onclick=()=>modal.hidden=true;
 }
 const grid=$('builderTemplateGrid');grid.replaceChildren();
 const blank=document.createElement('button');
 blank.type='button';blank.className='builder-template-option builder-template-blank';
 blank.innerHTML='<span class="builder-template-art" aria-hidden="true">＋</span><strong>Página en blanco</strong><span>Crea tu propio diseño desde cero</span><small>Sin tarjetas predefinidas</small>';
 blank.onclick=()=>{modal.hidden=true;createPage();};
 grid.appendChild(blank);
 for(const template of api.list()){
  const item=document.createElement('button');item.type='button';item.className='builder-template-option';
  item.style.setProperty('--template-accent',template.accent);
  const art=document.createElement('span');art.className='builder-template-art';art.textContent=template.icon;art.setAttribute('aria-hidden','true');
  const name=document.createElement('strong');name.textContent=template.title;
  const subtitle=document.createElement('span');subtitle.textContent=template.subtitle;
  const footer=document.createElement('small');footer.textContent=template.count+' tarjetas · '+template.label;
  item.append(art,name,subtitle,footer);
  item.onclick=()=>{
   if(!canCreatePage())return;
   const page=api.instantiate(template.id,uid);
   if(installPage(page,'Plantilla «'+template.title+'» añadida como borrador. Todos los valores provienen de datos reales.'))modal.hidden=true;
  };
  grid.appendChild(item);
 }
 modal.hidden=false;grid.querySelector('button')?.focus();
}
function createPage(){
 if(!authorized())return;
 if(state.pages.length>=15){status('Máximo 15 páginas.');return;}
 const name=prompt('Nombre de la nueva página (por ejemplo: Ventas por modelo)','Nuevo informe');
 if(!name?.trim())return;
 const p={id:uid(),title:name.trim().slice(0,70),cards:[]};
 installPage(p,'Página en blanco creada. Agrega tarjetas y publica cuando esté lista.');
}
function newCard(type,page,changes={}){
 if(!authorized())return;
 if(page.cards.length>=45){status('Máximo 45 tarjetas por página.');return;}
 const abDefaults=type==='ab'?(window.CITROEN_COMPARISON_LAB?.defaults(data)||{}):{};
 const card={id:uid(),type,title:{metric:'Indicador',chart:'Gráfico Meta Ads',comparison:'Comparativo entre meses',ab:'Comparativo A/B personalizable',note:'Insight',image:'Imagen',filter:'Filtro de mes'}[type],
  text:'',source:'meta',metric:type==='ab'?'forms':'spend',dimension:'month',shape:'bar',
  ...abDefaults,abGroup:'model',abModel:'',abTerritory:'',
  x:24+(page.cards.length%3)*34,y:24+(page.cards.length%5)*36,
  w:['chart','ab'].includes(type)?520:330,h:type==='ab'?355:type==='note'?230:285};
 for(const field of ['title','metric','dimension','shape','text','source','sourceId','aggregation','image','aStart','aEnd','bStart','bEnd','abGroup','abModel','abTerritory'])if(Object.hasOwn(changes,field))card[field]=changes[field];
 page.cards.push(card);selectedCardId=card.id;stash();renderPage(page);
 document.dispatchEvent(new CustomEvent('citroen:builder-card-selected',{detail:{pageId:page.id,card:{...card}}}));
}
function removeCreatedCard(pageId,cardId){
 if(!authorized())return false;
 const page=state.pages.find(p=>p.id===pageId);
 if(!page)return false;
 const index=page.cards.findIndex(c=>c.id===cardId);
 if(index<0)return false;
 const deleted={...page.cards[index]};
 page.cards.splice(index,1);
 if(selectedCardId===cardId)selectedCardId=null;
 stash();renderPage(page);
 document.dispatchEvent(new CustomEvent('citroen:builder-card-selected',{detail:{pageId,card:null}}));
 window.CITROEN_QUICK_DELETE?.offer?.(deleted.title,()=>{
  if(!authorized()||!state.pages.includes(page)||page.cards.some(c=>c.id===deleted.id))return false;
  page.cards.splice(Math.min(index,page.cards.length),0,deleted);
  selectedCardId=deleted.id;
  stash();renderPage(page);
  document.dispatchEvent(new CustomEvent('citroen:builder-card-selected',{detail:{pageId,card:{...deleted}}}));
  return true;
 });
 return true;
}
function deletePage(p){
 if(!authorized()||!confirm('¿Eliminar esta página y sus tarjetas?'))return;
 state.pages=state.pages.filter(x=>x.id!==p.id);
 state.controls=(state.controls||[]).filter(c=>!(
  (c.scope==='page'||c.scope==='chart')&&c.pageId==='report-'+p.id
 ));
 window.CITROEN_FILTER_ENGINE?.setDefinitions(state.controls);
 selectedCardId=null;
 stash();drawPageNav();navTo('resumen');
 status('Página y filtros exclusivos eliminados del borrador. Publica para compartir este cambio.');
}
function pageToolbar(page){
 const actions=$('report-'+page.id+'Actions');actions.replaceChildren();
 if(!authorized())return;
 const h=window.CITROEN_LAYOUT_HISTORY,scope='page:'+page.id;
 const back=button('↶ Deshacer movimiento',()=>{h?.undo(scope);});
 const forward=button('↷ Rehacer movimiento',()=>{h?.redo(scope);});
 back.disabled=!h?.canUndo(scope);forward.disabled=!h?.canRedo(scope);
 actions.append(back,forward);
  const kinds=[['metric','＋ Indicador'],['chart','＋ Gráfico'],['comparison','＋ Comparativo'],['ab','＋ A/B guardable'],['note','＋ Texto / insight'],['image','＋ Imagen'],['filter','＋ Filtro']];
 for(const [type,label] of kinds)actions.appendChild(button(label,()=>newCard(type,page)));
 actions.appendChild(button('Duplicar página',()=>clonePage(page.id)));
 actions.appendChild(button('Renombrar',()=>{const n=prompt('Nuevo nombre',page.title);if(n?.trim()){page.title=n.trim().slice(0,70);stash();drawPageNav();renderPage(page);}}));
 actions.appendChild(button('Eliminar página',()=>deletePage(page),'builder-btn-danger'));
}
function metric(card,rows){
 const sum=k=>rows.reduce((a,r)=>a+(Number(r[k])||0),0),investment=sum('spend'),forms=sum('forms'),imp=sum('impressions');
 switch(card.metric){
 case 'spend':return investment;case 'forms':return forms;case 'messages':return sum('messages');case 'impressions':return imp;case 'clicks':return sum('clicks');
 case 'ctr':return imp?100*sum('clicks')/imp:null;case 'cpl':return forms?investment/forms:null;
 case 'reach':return window.CITROEN_REACH_MATH?.estimate(rows.map(r=>r.reach),15000000)??null;default:return null;
 }
}
function fmt(value,key){if(value==null)return '—';if(['spend','cpl'].includes(key))return '$ '+new Intl.NumberFormat('es-CO',{maximumFractionDigits:0}).format(value);if(key==='ctr')return new Intl.NumberFormat('es-CO',{maximumFractionDigits:2}).format(value)+' %';return new Intl.NumberFormat('es-CO',{maximumFractionDigits:0}).format(value);}
function filtered(card,page){
 const selected=data.filter(r=>(!localFilter.month||r.month===localFilter.month)&&(!localFilter.model||r.model===localFilter.model));
 return window.CITROEN_FILTER_ENGINE?.filter(selected,'report-'+page.id,card?'c:'+card.id:'')||selected;
}
function groupName(card,r){
 const d=r.date||r.month+'-01';
 if(card.dimension==='date')return d;
 if(card.dimension==='week'){
  const dt=new Date(d+'T00:00:00Z');dt.setUTCDate(dt.getUTCDate()-(dt.getUTCDay()+6)%7);return dt.toISOString().slice(0,10);
 }
 if(card.dimension==='quarter')return d.slice(0,4)+' · T'+(Math.floor((Number(d.slice(5,7))-1)/3)+1);
 return String(r[card.dimension]??r.month??'Sin dato');
}
function categories(card,rows){
 const groups=new Map();
 for(const r of rows){const key=groupName(card,r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 return Array.from(groups,([name,v])=>({name,value:metric(card,v)||0})).sort((a,b)=>a.name.localeCompare(b.name,'es',{numeric:true}));
}
function renderChart(card,page){
 const rows=filtered(card,page),arr=categories(card,rows),shape=card.shape||'bar';
 if(!arr.length)return '<p class="builder-empty">Sin datos para los filtros seleccionados.</p>';
 if(shape==='table'||shape==='pivot')return '<table class="builder-data-table"><thead><tr><th>'+esc(card.dimension||'Dimensión')+'</th><th>'+esc(CL[card.metric])+'</th></tr></thead><tbody>'+arr.map(a=>'<tr><td>'+esc(a.name)+'</td><td>'+fmt(a.value,card.metric)+'</td></tr>').join('')+'</tbody></table>';
 const W=540,H=200,p=30,max=Math.max(1,...arr.map(x=>x.value)),step=(W-p*2)/arr.length;
 const seriesColor=/^#[0-9a-f]{6}$/i.test(card.color||'')?card.color:'#8abbd8';
 if(shape==='pie'||shape==='donut'){
  const total=arr.reduce((x,r)=>x+r.value,0);if(total<=0)return '<div class="builder-empty">No hay valores positivos para mostrar la distribución.</div>';
  let last=0;const cx=120,cy=103,rad=77,small=shape==='donut';
  const palette=[seriesColor,'#99c9e1','#245977','#f4b26b','#7cc1ad','#ae9ada','#e0accc','#75afdc'];
  const slices=arr.map((a,i)=>{
   const start=last;last+=a.value/total;
   if(a.value<=0)return '';
   const x1=cx+rad*Math.cos(start*Math.PI*2-Math.PI/2),y1=cy+rad*Math.sin(start*Math.PI*2-Math.PI/2);
   const end=Math.min(last,.9999999999),x2=cx+rad*Math.cos(end*Math.PI*2-Math.PI/2),y2=cy+rad*Math.sin(end*Math.PI*2-Math.PI/2);
   const big=last-start>.5?1:0;
   const d=last-start>=.999999?'M '+cx+' '+(cy-rad)+' A '+rad+' '+rad+' 0 1 1 '+(cx-.001)+' '+(cy-rad)+' Z':'M '+cx+' '+cy+' L '+x1+' '+y1+' A '+rad+' '+rad+' 0 '+big+' 1 '+x2+' '+y2+' Z';
   return '<path d="'+d+'" fill="'+palette[i%palette.length]+'" stroke="white" stroke-width="2"><title>'+esc(a.name)+' · '+fmt(a.value,card.metric)+'</title></path>';
  }).join('');
  const legend=arr.slice(0,9).map((r,i)=>'<g transform="translate(235,'+(28+i*19)+')"><circle cx="0" cy="0" r="4" fill="'+palette[i%palette.length]+'"/><text x="11" y="4" font-size="11" fill="#345d78">'+esc(r.name.slice(0,26))+'</text></g>').join('');
  return '<svg viewBox="0 0 540 205" role="img" aria-label="'+esc(card.title)+'">'+slices+(small?'<circle cx="120" cy="103" r="45" fill="white"/><text x="120" y="108" text-anchor="middle" font-size="15" font-weight="800" fill="#254961">100%</text>':'')+legend+'</svg>';
 }
 if(shape==='gauge'){
  const total=arr.reduce((a,b)=>a+b.value,0),goal=Number(card.goal)>0?Number(card.goal):null;
  if(!goal)return '<p class="builder-empty">Configura un objetivo numérico en Editar tarjeta para calcular el medidor.</p>';
  const part=Math.min(1,total/goal);
  return '<div class="builder-gauge"><div class="builder-gauge-ring" style="--gauge-percent:'+(100*part).toFixed(2)+'%;--gauge-accent:'+seriesColor+'"><span>'+Math.round(part*100)+'%</span></div><strong>'+fmt(total,card.metric)+'</strong><small>Objetivo configurado: '+fmt(goal,card.metric)+'</small></div>';
 }
 let plot='',pts=[];
 arr.forEach((a,i)=>{
  const x=p+step*(i+.5),y=H-p-(a.value/max)*(H-2*p);
  pts.push([x,y]);
  if(shape==='bar')plot+='<rect x="'+(x-step*.27)+'" y="'+y+'" width="'+step*.54+'" height="'+(H-p-y)+'" rx="3" fill="'+seriesColor+'"><title>'+esc(a.name)+'</title></rect>';
  if(shape==='barh')plot+='<rect x="'+p+'" y="'+(22+i*Math.min(23,120/arr.length))+'" width="'+(a.value/max*(W-p*2))+'" height="'+Math.max(5,Math.min(17,110/arr.length))+'" rx="3" fill="'+seriesColor+'"><title>'+esc(a.name)+'</title></rect>';
  if(shape!=='barh')plot+='<text x="'+x+'" y="'+(H-5)+'" text-anchor="middle" font-size="9" fill="#456b85">'+esc(a.name.slice(0,9))+'</text>';
 });
 if(['line','area'].includes(shape)){
  const coords=pts.map(a=>a.join(',')).join(' ');
  if(shape==='area')plot+='<polygon points="'+pts[0][0]+','+(H-p)+' '+coords+' '+pts.at(-1)[0]+','+(H-p)+'" fill="#d4e9f6"/>';
  plot+='<polyline points="'+coords+'" fill="none" stroke="'+seriesColor+'" stroke-width="3"/>';
 }
 if(shape==='barh')plot+=arr.map((a,i)=>'<text x="'+(p+3)+'" y="'+(18+i*Math.min(23,120/arr.length))+'" fill="#355875" font-size="9">'+esc(a.name.slice(0,25))+'</text>').join('');
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(card.title)+'" preserveAspectRatio="none">'+plot+'</svg>';
}
function renderComparison(card,page){
 const comparator=window.CITROEN_PERIOD_COMPARE;
 if(!comparator)return '<div class="builder-empty">No fue posible cargar el comparador de períodos.</div>';
 const output=comparator.compare(filtered(card,page),card.metric,{
  universe:15000000,
  reachEstimator:window.CITROEN_REACH_MATH?.estimate
 });
 if(!output.ok)return '<div class="builder-compare-no-data"><strong>No hay dos períodos comparables</strong><p>'+esc(output.description||'Revisa el filtro de fechas.')+'</p></div>';
 const sign=output.change==null?'':output.change>0?'+':output.change<0?'−':'';
 const variation=output.change==null?'Sin base para calcular variación':sign+new Intl.NumberFormat('es-CO',{maximumFractionDigits:1}).format(Math.abs(output.change))+' %';
 const label=esc(CL[card.metric]||card.metric);
 return '<div class="builder-comparison-wrap">'+
   '<div class="builder-compare-label">'+label+' · Mismo día de corte</div>'+
   '<div class="builder-compare-periods"><div class="builder-compare-period">'+
    '<small>'+esc(output.previousMonth)+' · días 1–'+output.cutoffDay+'</small>'+
    '<strong>'+fmt(output.previous,card.metric)+'</strong></div>'+
    '<div class="builder-compare-period builder-compare-current"><small>'+esc(output.currentMonth)+' · días 1–'+output.cutoffDay+'</small>'+
    '<strong>'+fmt(output.current,card.metric)+'</strong></div></div>'+
   '<div class="builder-compare-change '+esc(output.favorable)+'">'+
     '<strong>'+variation+'</strong><small> Variación vs. mes anterior</small></div>'+
   '<p class="builder-compare-caveat">* '+esc(output.description)+(card.metric==='reach'?' Alcance modelado sobre universo de 15 millones; no equivale a usuarios únicos observados.':'')+'</p>'+
  '</div>';
}
function abResult(card){
 const engine=window.CITROEN_COMPARISON_LAB;
 if(!engine)return {ok:false,error:'Comparador avanzado no disponible.'};
 const defaults=engine.defaults(data);
 const settings={
  aStart:card.aStart||defaults.aStart,aEnd:card.aEnd||defaults.aEnd,
  bStart:card.bStart||defaults.bStart,bEnd:card.bEnd||defaults.bEnd,
  metric:card.metric,group:card.abGroup||'model',
  model:card.abModel||'',territory:card.abTerritory||''
 };
 // A/B dates are explicitly fixed on each card: global time controls do not change them.
 return engine.calculate(data,settings,window.CITROEN_REACH_MATH?.estimate);
}
function renderAB(card){
 const r=abResult(card);
 if(!r.ok)return '<div class="builder-compare-no-data">'+esc(r.error||'Selecciona dos períodos de comparación en Editar tarjeta.')+'</div>';
 const variation=r.totalChange==null?'Sin base comparable':(r.totalChange>0?'+':'')+new Intl.NumberFormat('es-CO',{maximumFractionDigits:1}).format(r.totalChange)+' %';
 const barMax=Math.max(1,...r.groups.slice(0,5).flatMap(x=>[x.current||0,x.prior||0]));
 const rows=r.groups.slice(0,5).map(g=>{
  const width1=Math.max(0,(g.current||0)/barMax*100).toFixed(1),width2=Math.max(0,(g.prior||0)/barMax*100).toFixed(1);
  return '<div class="builder-ab-segment"><span title="'+esc(g.label)+'">'+esc(g.label)+'</span><div class="builder-ab-bars"><i style="width:'+width1+'%"></i><em style="width:'+width2+'%"></em></div></div>';
 }).join('');
 const warning=[r.hasDifferentLength?'Los períodos duran distinto.':null,r.hasIncompleteCoverage?'Hay días sin registros.':null,r.reachCaveat].filter(Boolean).join(' ');
 return '<div class="builder-ab-view">'+
  '<div class="builder-ab-head"><div><small>A · '+esc(r.aStart)+' al '+esc(r.aEnd)+'</small><strong>'+fmt(r.totalA,card.metric)+'</strong></div>'+
  '<div><small>B · '+esc(r.bStart)+' al '+esc(r.bEnd)+'</small><strong>'+fmt(r.totalB,card.metric)+'</strong></div></div>'+
  '<div class="builder-ab-change '+esc(r.totalQuality)+'"><b>'+variation+'</b><span>'+esc(CL[card.metric]||card.metric)+' · A vs. B</span></div>'+
  '<div class="builder-ab-legend"><span>A</span><span>B</span><small>Desglose por '+esc({model:'modelo',territory:'territorio',account:'cuenta'}[r.group])+'</small></div>'+
  '<div class="builder-ab-segments">'+(rows||'<small>Sin segmentos en estos períodos</small>')+'</div>'+
  (warning?'<p class="builder-ab-warning">'+esc(warning)+'</p>':'')+
  '<button class="builder-ab-download" type="button" data-ab-download aria-label="Exportar datos comparativos de '+esc(card.title)+'">Descargar CSV</button>'+
  '</div>';
}
function cardBody(card,page){
 if(card.type==='note')return '<p class="builder-note-body">'+esc(card.text||'Escribe aquí tus hallazgos y recomendaciones desde Editar tarjeta.').replace(/\n/g,'<br>')+'</p>';
 if(card.type==='image')return card.image?'<img class="builder-card-img" loading="lazy" alt="'+esc(card.title)+'" src="'+esc(card.image)+'">':'<div class="builder-empty">Sube o enlaza una imagen desde Editar tarjeta.</div>';
 if(card.type==='filter')return '<label class="builder-card-filter">Filtrar '+(card.filter==='model'?'modelo':'mes')+' <select data-board-filter="'+esc(card.filter||'month')+'">'+(card.filter==='model'?modelOptions():monthOptions())+'</select></label>';
 if(card.source==='external'){
  if(!authorized()||!window.CITROEN_SOURCES?.get(card.sourceId))return '<p class="builder-empty">Fuente externa privada · entra a Diseño y actualiza la conexión para ver sus datos.</p>';
  return renderExternal(card);
 }
 if(card.type==='comparison')return renderComparison(card,page);
 if(card.type==='ab')return renderAB(card);
 if(card.type==='metric')return '<div class="builder-big-number">'+fmt(metric(card,filtered(card,page)),card.metric)+'</div><small>'+esc(CL[card.metric]||'Indicador')+' · Meta Ads</small>';
 return renderChart(card,page);
}
function monthOptions(){return '<option value="">Todos los meses</option>'+Array.from(new Set(data.map(r=>r.month))).sort().map(m=>'<option value="'+esc(m)+'" '+(localFilter.month===m?'selected':'')+'>'+esc(m)+'</option>').join('');}
function modelOptions(){return '<option value="">Todos los modelos</option>'+Array.from(new Set(data.map(r=>r.model))).sort().map(m=>'<option value="'+esc(m)+'" '+(localFilter.model===m?'selected':'')+'>'+esc(m)+'</option>').join('');}
function renderExternal(card){
 const external=window.CITROEN_SOURCES?.get(card.sourceId),engine=window.CITROEN_SOURCE_DATA;
 if(!external||!engine)return '<p class="builder-empty">Actualiza esta fuente desde Conexiones de datos.</p>';
 const cols=external.columns||[],rows=external.rows||[],nf=n=>new Intl.NumberFormat('es-CO',{maximumFractionDigits:2}).format(n);
 const label='<small class="builder-ext-source">'+esc(external.name||external.source)+' · '+rows.length+' filas'+(external.truncated?' · Lectura parcial':'')+(external.stale?' · Sin actualizar':'')+'</small>';
 if(card.shape==='table'&&card.type!=='metric')return label+'<div class="builder-preview-scroll"><table class="builder-data-table"><thead><tr>'+cols.slice(0,8).map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(0,100).map(r=>'<tr>'+cols.slice(0,8).map(c=>'<td>'+esc(r[c])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><small>Tabla: primeras '+Math.min(100,rows.length)+' filas. Los gráficos usan todas las filas cargadas.</small>';
 if(!cols.includes(card.dimension)||!cols.includes(card.metric))return label+'<p class="builder-empty">La estructura de la hoja cambió. Selecciona una dimensión y una métrica disponibles en Configuración.</p>';
 const result=engine.aggregate(external,card.type==='metric'?'':card.dimension,card.metric,card.aggregation||'sum'),points=result.points.slice(0,15);
 const note='<small>'+esc(card.dimension)+' · '+esc(card.metric)+' · '+esc({sum:'Suma',avg:'Promedio',count:'Recuento',min:'Mínimo',max:'Máximo'}[card.aggregation||'sum'])+(result.invalid?' · '+result.invalid+' filas sin valor numérico':'')+(result.points.length>15?' · Primeros 15 grupos de '+result.points.length:'')+'</small>';
 if(!points.length)return label+'<p class="builder-empty">No hay valores numéricos en esta métrica. Revisa el campo y el formato de números.</p>';
 if(card.type==='metric')return label+'<div class="builder-big-number">'+nf(points[0].value)+'</div>'+note;
 const W=540,H=220,pad=35,color=/^#[0-9a-f]{6}$/i.test(card.color||'')?card.color:'#297bb5';
 const min=Math.min(0,...points.map(p=>p.value)),max=Math.max(0,...points.map(p=>p.value)),span=max-min||1;
 const y=v=>H-pad-(v-min)/span*(H-pad*2),zero=y(0),step=(W-pad*2)/points.length,coords=[];
 let plot='<line x1="'+pad+'" y1="'+zero+'" x2="'+(W-pad)+'" y2="'+zero+'" stroke="#d5e1ea"/><text x="2" y="'+(pad+4)+'" font-size="10" fill="#6c8799">'+nf(max)+'</text>';
 points.forEach((p,i)=>{const x=pad+step*(i+.5),py=y(p.value);coords.push([x,py]);
  if(card.shape==='bar')plot+='<rect x="'+(x-step*.3)+'" y="'+Math.min(py,zero)+'" width="'+step*.6+'" height="'+Math.max(0,Math.abs(zero-py))+'" rx="3" fill="'+color+'"><title>'+esc(p.name)+': '+nf(p.value)+'</title></rect>';
  if(card.shape==='barh'){const bx=115+(0-min)/span*(W-135),vx=115+(p.value-min)/span*(W-135),sy=14+i*190/points.length;plot+='<text x="2" y="'+(sy+10)+'" font-size="9" fill="#55748a">'+esc(p.name.slice(0,19))+'</text><rect x="'+Math.min(bx,vx)+'" y="'+sy+'" width="'+Math.abs(vx-bx)+'" height="'+Math.min(16,160/points.length)+'" fill="'+color+'"><title>'+esc(p.name)+': '+nf(p.value)+'</title></rect>';}
  else plot+='<text x="'+x+'" y="'+(H-12)+'" text-anchor="middle" font-size="9" fill="#55748a">'+esc(p.name.slice(0,9))+'</text>';
 });
 if(['line','area'].includes(card.shape)){const curve=coords.map(x=>x.join(',')).join(' ');if(card.shape==='area')plot+='<polygon points="'+coords[0][0]+','+zero+' '+curve+' '+coords.at(-1)[0]+','+zero+'" fill="'+color+'" opacity=".15"/>';plot+='<polyline points="'+curve+'" fill="none" stroke="'+color+'" stroke-width="3"/>'+coords.map((p,i)=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="'+color+'"><title>'+esc(points[i].name)+': '+nf(points[i].value)+'</title></circle>').join('');}
 return label+'<svg class="source-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(card.title)+'">'+plot+'</svg>'+note;
}
function editCard(page,card){
 if(!authorized())return;
 const modal=$('builderCardEditor'),form=$('builderCardForm');
 const metricInput=form.elements.metric,dimensionInput=form.elements.dimension,external=window.CITROEN_SOURCES?.get(card.sourceId);
 if(card.source==='external'&&external?.columns?.length){
  metricInput.innerHTML=external.columns.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
  dimensionInput.innerHTML=external.columns.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
 }else{
  metricInput.innerHTML=Object.entries(CL).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join('');
  dimensionInput.innerHTML='<option value="month">Mes</option><option value="model">Modelo</option>';
 }
 $('builderABFields').hidden=card.type!=='ab';
 if(card.type==='ab'){
  const defs=window.CITROEN_COMPARISON_LAB?.defaults(data)||{};
  for(const k of ['aStart','aEnd','bStart','bEnd'])form.elements[k].value=card[k]||defs[k]||'';
  form.elements.abGroup.value=card.abGroup||'model';
  for(const [field,selection] of [['model','abModel'],['territory','abTerritory']]){
   const values=[...new Set(data.map(r=>r[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
   const dropdown=form.elements[selection];
   dropdown.replaceChildren(new Option('Todos', ''),...values.map(value=>new Option(value,value)));
   dropdown.value=card[selection]||'';
  }
  $('builderABError').textContent='';
 }
  form.elements.title.value=card.title||'';
 form.elements.text.value=card.text||'';
 form.elements.metric.value=card.metric||'spend';
 form.elements.goal.value=card.goal??'';
 form.elements.shape.value=card.shape||'bar';
 form.elements.dimension.value=card.dimension||'month';
 form.elements.filter.value=card.filter||'month';
 form.elements.image.value=card.image?.startsWith('https://')?card.image:'';
 modal.hidden=false;
 $('builderCardSave').onclick=()=>{
  const f=form.elements;
  if(card.type==='ab'){
   const chosen=Object.fromEntries(['aStart','aEnd','bStart','bEnd','abGroup','abModel','abTerritory'].map(k=>[k,f[k].value]));
   const calculated=window.CITROEN_COMPARISON_LAB?.calculate(data,{
    aStart:chosen.aStart,aEnd:chosen.aEnd,bStart:chosen.bStart,bEnd:chosen.bEnd,
    group:chosen.abGroup,model:chosen.abModel,territory:chosen.abTerritory,metric:f.metric.value
   },window.CITROEN_REACH_MATH?.estimate);
   if(!calculated?.ok){$('builderABError').textContent=calculated?.error||'Revisa las fechas del comparativo.';return;}
   Object.assign(card,chosen);
  }
  card.title=f.title.value.trim().slice(0,100)||'Sin título';
  card.text=f.text.value.slice(0,7000);
  card.metric=f.metric.value;card.shape=f.shape.value;card.dimension=f.dimension.value;card.filter=f.filter.value;
  card.goal=f.goal.value!==''&&Number(f.goal.value)>0?Number(f.goal.value):null;
  if(cleanURL(f.image.value))card.image=cleanURL(f.image.value);
  stash();modal.hidden=true;renderPage(page);
 };
 $('builderCardRemove').onclick=()=>{
  if(confirm('¿Eliminar esta tarjeta?')){page.cards=page.cards.filter(x=>x.id!==card.id);stash();modal.hidden=true;renderPage(page);}
 };
 $('builderCardUpload').onchange=async e=>{
  const file=e.target.files?.[0];if(!file||!file.type.startsWith('image/')||file.size>5*1024*1024)return status('Sube JPG/PNG/WebP de máximo 5 MB.');
  const src=await downsize(file);
  if(src){
   try{card.image=await window.CITROEN_SHARED_MEDIA.upload(src);status('Imagen subida a biblioteca privada. Guarda tarjeta y publica para compartir.');}
   catch(err){card.image=src;status('Imagen guardada localmente; no disponible para todos: '+err.message);}
   stash();
  }
 };
}
async function downsize(file){
 return new Promise(resolve=>{
  const reader=new FileReader();reader.onerror=()=>resolve('');
  reader.onload=()=>{
   const im=new Image();im.onerror=()=>resolve('');
   im.onload=()=>{const scale=Math.min(1,690/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));const x=c.getContext('2d');if(!x)return resolve('');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);let encoded='';
    for(const quality of [.7,.5,.35,.2]){encoded=c.toDataURL('image/jpeg',quality);if(encoded.length<115000)break;}
    resolve(encoded.length<120000?encoded:'');};im.src=reader.result;
  };reader.readAsDataURL(file);
 });
}
function layoutSnapshot(page){return page.cards.map(c=>({id:c.id,x:c.x,y:c.y,w:c.w,h:c.h}));}
function bindLayoutHistory(page){
 const h=window.CITROEN_LAYOUT_HISTORY;
 if(!h)return;
 h.bind('page:'+page.id,()=>layoutSnapshot(page),snapshot=>{
  if(!authorized())return;
  const values=new Map(snapshot.map(r=>[r.id,r]));
  for(const card of page.cards){const record=values.get(card.id);if(record)Object.assign(card,{x:record.x,y:record.y,w:record.w,h:record.h});}
  stash();renderPage(page);
 });
 h.bindNudge('page:'+page.id,(dx,dy)=>{
  if(!authorized()||current!=='report-'+page.id||!selectedCardId)return false;
  const selected=page.cards.find(c=>c.id===selectedCardId);
  if(!selected)return false;
  const before=layoutSnapshot(page);
  selected.x=Math.max(0,Math.min(2400,selected.x+dx));
  selected.y=Math.max(0,Math.min(6000,selected.y+dy));
  if(!h.record('page:'+page.id,before,layoutSnapshot(page)))return false;
  stash();renderPage(page);
  return true;
 });
}
function installMove(el,page,card){
 if(!authorized())return;
 // The whole selected surface is the drag handle. Only true inputs remain interactive.
 const ignored='button,input,textarea,select,a,[contenteditable="true"],[data-board-filter],.lk-card-filters,.lk-control';
 const begin=e=>{
  if(!authorized()||(e.pointerType!=='touch'&&e.button!==0))return;
  const target=e.target;
  const sizing=!!target.closest('.builder-card-resize');
  if(!sizing&&target.closest(ignored))return;
  // Selection comes first; normal single clicks still work without moving the card.
  if(selectedCardId!==card.id)el.click();
  const sx=e.clientX,sy=e.clientY,old={x:card.x,y:card.y,w:card.w,h:card.h},before=layoutSnapshot(page);
  const assist=window.CITROEN_LAYOUT_HISTORY;
  const peers=page.cards.filter(c=>c.id!==card.id).map(c=>({x:c.x,y:c.y,w:c.w,h:c.h}));
  let moved=false;
  const move=p=>{
   if(p.pointerId!==e.pointerId)return;
   const scale=window.CITROEN_EDITOR_ZOOM||1,dx=(p.clientX-sx)/scale,dy=(p.clientY-sy)/scale;
   if(!moved&&Math.hypot(dx,dy)<5)return;
   if(!moved){moved=true;document.body.classList.add('le-dragging');el.classList.add('le-direct-active');}
   const tentative=sizing?{...old,w:old.w+dx,h:old.h+dy}:{...old,x:old.x+dx,y:old.y+dy};
   const adjusted=assist?.snap(tentative,peers,{mode:sizing?'resize':'move',bypass:p.altKey,grid:8,gap:12,tolerance:7})||tentative;
   if(!sizing){card.x=Math.max(0,adjusted.x);card.y=Math.max(0,adjusted.y);}
   else{card.w=Math.max(220,Math.min(1100,adjusted.w));card.h=Math.max(170,Math.min(850,adjusted.h));}
   assist?.guides($('builderCanvas-'+page.id),adjusted.guides||[]);
   el.style.left=card.x+'px';el.style.top=card.y+'px';el.style.width=card.w+'px';el.style.height=card.h+'px';
   const canvas=$('builderCanvas-'+page.id);if(canvas)canvas.style.minHeight=Math.max(650,...page.cards.map(c=>c.y+c.h+35))+'px';
   if(p.cancelable)p.preventDefault();
  };
  const end=p=>{
   if(p.pointerId!==e.pointerId)return;
   window.removeEventListener('pointermove',move);
   window.removeEventListener('pointerup',end);
   window.removeEventListener('pointercancel',end);
   document.body.classList.remove('le-dragging');el.classList.remove('le-direct-active');
   assist?.guides($('builderCanvas-'+page.id),[]);
   if(moved){
    if(p.type==='pointercancel'){Object.assign(card,old);renderPage(page);return;}
    assist?.record('page:'+page.id,before,layoutSnapshot(page));
    stash();
    document.dispatchEvent(new CustomEvent('citroen:builder-card-selected',{detail:{pageId:page.id,card:{...card}}}));
    document.addEventListener('click',click=>{if(click.target===el||el.contains(click.target)){click.preventDefault();click.stopImmediatePropagation();}},{capture:true,once:true});
   }
  };
  window.addEventListener('pointermove',move,{passive:false});
  window.addEventListener('pointerup',end);
  window.addEventListener('pointercancel',end);
  if(sizing){e.preventDefault();e.stopPropagation();}
 };
 el.addEventListener('pointerdown',begin);
}
function renderPage(page){
 const root=$('report-'+page.id);if(!root)return;pageToolbar(page);bindLayoutHistory(page);
 const target=$('report-'+page.id+'Body');
 target.innerHTML='<div class="lk-page-filters" id="lkFilters-'+page.id+'"></div><div class="builder-canvas-note">'+(authorized()?'Arrastra las tarjetas libremente usando el icono de puntos, y redimensiona desde la esquina inferior derecha.':'Vista publicada del informe.')+'</div><div class="builder-board-scroller"><div class="builder-board" id="builderCanvas-'+page.id+'"></div></div>';
 const canvas=$('builderCanvas-'+page.id);
 window.CITROEN_FILTER_ENGINE?.render('lkFilters-'+page.id,'report-'+page.id);
 canvas.style.minHeight=Math.max(650,...page.cards.map(c=>c.y+c.h+35))+'px';
 for(const card of page.cards){
  const tools=authorized()?'<button type="button" class="builder-card-edit">Editar</button><button type="button" class="builder-card-quick-duplicate" title="Duplicar tarjeta" aria-label="Duplicar '+esc(card.title)+'">⧉</button><button type="button" class="builder-card-quick-remove" title="Eliminar esta tarjeta" aria-label="Eliminar '+esc(card.title)+'">×</button><span class="builder-card-grip" title="Arrastrar libremente">⠿</span>':'';
  const html='<div class="builder-card-top"><strong>'+esc(card.title)+'</strong><span>'+tools+'</span></div><div class="builder-card-inner">'+cardBody(card,page)+'</div>'+(authorized()?'<div class="builder-card-resize" title="Redimensionar"></div>':'');
  const el=mk('article',{class:'builder-board-card'+(selectedCardId===card.id?' le-builder-selected':''), 'data-card-id':card.id},html);
  if(card.background&&/^#[0-9a-f]{6}$/i.test(card.background))el.style.background=card.background;
  if(card.textColor&&/^#[0-9a-f]{6}$/i.test(card.textColor))el.style.color=card.textColor;
  Object.assign(el.style,{left:card.x+'px',top:card.y+'px',width:card.w+'px',height:card.h+'px'});
  el.querySelector('[data-ab-download]')?.addEventListener('click',e=>{
   e.preventDefault();e.stopPropagation();
   const r=abResult(card);
   if(!r.ok)return;
   const content=window.CITROEN_COMPARISON_LAB?.toCSV(r);
   if(!content)return;
   const file=new Blob([content],{type:'text/csv;charset=utf-8;'});
   const link=URL.createObjectURL(file),a=document.createElement('a');
   a.href=link;a.download='citroen-ab-'+String(card.id).replace(/[^a-z0-9_-]/gi,'')+'.csv';
   document.body.append(a);a.click();a.remove();URL.revokeObjectURL(link);
  });
  el.querySelector('.builder-card-edit')?.addEventListener('click',e=>{e.stopPropagation();editCard(page,card);});
  el.querySelector('.builder-card-quick-duplicate')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.CITROEN_BUILDER?.duplicateCard(page.id,card.id);});
  el.querySelector('.builder-card-quick-remove')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();removeCreatedCard(page.id,card.id);});
  el.addEventListener('click',e=>{
   if(!authorized()||e.target.closest('button,input,select,textarea,a,.builder-card-grip,.builder-card-resize'))return;
   selectedCardId=card.id;
   canvas.querySelectorAll('.builder-board-card').forEach(x=>x.classList.toggle('le-builder-selected',x.dataset.cardId===card.id));
   document.dispatchEvent(new CustomEvent('citroen:builder-card-selected',{detail:{pageId:page.id,card:{...card}}}));
  });
  el.querySelectorAll('[data-board-filter]').forEach(select=>select.onchange=()=>{localFilter[select.dataset.boardFilter]=select.value;renderPage(page);});
  canvas.appendChild(el);installMove(el,page,card);
  if(window.CITROEN_FILTER_ENGINE?.getDefinitions().some(x=>x.scope==='chart'&&x.pageId==='report-'+page.id&&x.cardId==='c:'+card.id)){
    const target=el.querySelector('.builder-card-inner'),holder=document.createElement('div');holder.className='lk-card-filters';target.prepend(holder);
    window.CITROEN_FILTER_ENGINE.render(holder,'report-'+page.id,'c:'+card.id);
  }
 }
}
function renderCreatives(){
 const actions=$('citroen-creativesActions');actions.replaceChildren();
 if(authorized())actions.appendChild(button('＋ Añadir creativo',()=>editCreative()));
 const root=$('citroen-creativesBody');
 if(!state.creatives.length){root.innerHTML='<div class="builder-empty-page">Todavía no hay creativos publicados. Desde Diseño podrás agregar imágenes de piezas y sus notas.</div>';return;}
 root.innerHTML='<div class="builder-creatives-grid">'+state.creatives.map(c=>'<article class="builder-creative"><div class="builder-creative-image">'+(c.image?'<img alt="'+esc(c.title)+'" src="'+esc(c.image)+'">':'<div class="builder-empty">Imagen pendiente</div>')+'</div><div class="builder-creative-caption"><strong>'+esc(c.title)+'</strong><small>'+esc(c.format||'Otro')+' · '+esc(c.campaign||'Sin campaña')+'</small><p>'+esc(c.notes||'')+'</p>'+(authorized()?'<button type="button" data-creative-edit="'+esc(c.id)+'">Editar creativo</button>':'')+'</div></article>').join('')+'</div>';
 root.querySelectorAll('[data-creative-edit]').forEach(b=>b.onclick=()=>editCreative(state.creatives.find(c=>c.id===b.dataset.creativeEdit)));
}
function editCreative(target){
 if(!authorized())return;
 const modal=$('builderCreativeDialog');modal.hidden=false;
 $('builderCreativeTitle').value=target?.title||'';
 $('builderCreativeCampaign').value=target?.campaign||'';
 $('builderCreativeFormat').value=target?.format||'Imagen';
 $('builderCreativeUrl').value=target?.image?.startsWith('https://')?target.image:'';
 $('builderCreativeNotes').value=target?.notes||'';
 let uploaded=target?.image?.startsWith('data:')?target.image:'';
 $('builderCreativeUpload').value='';
 $('builderCreativeUpload').onchange=async e=>{
  const file=e.target.files?.[0];
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){status('Usa JPG, PNG o WebP hasta 5 MB.');return;}
  uploaded=await downsize(file);
  if(!uploaded){status('No se pudo comprimir la imagen. Prueba con una más pequeña.');return;}
  try{uploaded=await window.CITROEN_SHARED_MEDIA.upload(uploaded);status('Creativo subido a biblioteca privada; guarda y publica para compartir.');}
  catch(err){status('El creativo quedó local: '+err.message);}

 };
 $('builderCreativeSave').onclick=()=>{
  const title=$('builderCreativeTitle').value.trim(),campaign=$('builderCreativeCampaign').value,format=$('builderCreativeFormat').value,notes=$('builderCreativeNotes').value;
  const raw=$('builderCreativeUrl').value.trim(),image=raw?cleanURL(raw):uploaded;
  if(!title)return status('Escribe un título para el creativo.');
  if(raw&&!image)return status('La URL debe ser HTTPS.');
  const row=target||{id:uid()};
  Object.assign(row,{title:title.slice(0,110),campaign:campaign.slice(0,150),format,notes:notes.slice(0,1000),image:image||row.image||''});
  if(!target)state.creatives.push(row);
  stash();modal.hidden=true;renderCreatives();status('Creativo guardado como borrador; pulsa Publicar cambios para compartirlo.');
 };
 $('builderCreativeDelete').hidden=!target;
 $('builderCreativeDelete').onclick=()=>{if(target&&confirm('¿Eliminar este creativo?'))state.creatives=state.creatives.filter(c=>c.id!==target.id);stash();modal.hidden=true;renderCreatives();};
}
function renderInsights(){
 const actions=$('citroen-insightsActions');actions.replaceChildren();
 if(authorized())actions.appendChild(button('＋ Escribir insight',()=>editInsight()));
 const root=$('citroen-insightsBody');
 root.innerHTML=state.insights.length?'<div class="builder-insights-list">'+state.insights.map(i=>'<article class="builder-insight"><div class="builder-insight-header"><h3>'+esc(i.title)+'</h3><small>'+esc(i.updatedAt||'')+'</small></div><p>'+esc(i.body).replace(/\n/g,'<br>')+'</p>'+(authorized()?'<button type="button" data-insight-edit="'+esc(i.id)+'">Editar insight</button>':'')+'</article>').join('')+'</div>':'<div class="builder-empty-page">Aquí aparecerán tus hallazgos, aprendizajes y recomendaciones una vez publicados.</div>';
 root.querySelectorAll('[data-insight-edit]').forEach(b=>b.onclick=()=>editInsight(state.insights.find(x=>x.id===b.dataset.insightEdit)));
}
function editInsight(item){
 if(!authorized())return;
 const modal=$('builderInsightDialog');modal.hidden=false;
 $('builderInsightTitle').value=item?.title||'';
 $('builderInsightBody').value=item?.body||'';
 $('builderInsightSave').onclick=()=>{
  const title=$('builderInsightTitle').value.trim(),body=$('builderInsightBody').value.trim();if(!title||!body)return status('Escribe título y contenido del insight.');
  const i=item||{id:uid()};Object.assign(i,{title:title.slice(0,110),body:body.slice(0,12000),updatedAt:new Date().toLocaleDateString('es-CO')});
  if(!item)state.insights.push(i);stash();modal.hidden=true;renderInsights();
 };
 $('builderInsightDelete').hidden=!item;
 $('builderInsightDelete').onclick=()=>{if(item&&confirm('¿Eliminar este insight?'))state.insights=state.insights.filter(x=>x.id!==item.id);stash();modal.hidden=true;renderInsights();};
}
function renderSources(){
 const actions=$('citroen-sourcesActions');actions.replaceChildren();
 const root=$('citroen-sourcesBody');
 if(!authorized()){root.innerHTML='<div class="builder-empty-page">Las conexiones se administran desde Diseño. Las filas privadas no se muestran a visitantes.</div>';return;}
 window.CITROEN_SOURCES?.mount(root);
}
async function loadMeta(){
 try{
  const a=window.CITROEN_CAMPAIGN_FEED?(await window.CITROEN_CAMPAIGN_FEED.load()).daily:await fetch('./data/meta_2026_daily.json').then(r=>{if(!r.ok)throw Error('Sin fuente');return r.json();}),d=a.dictionaries;
  data=(a.daily||[]).map(row=>({date:String(d.dates[row[0]]),month:String(d.dates[row[0]]).slice(0,7),territory:String(d.territories[row[2]]),account:String(d.accounts[row[3]]),platform:'Meta Ads',model:String(d.models[row[1]]),spend:Number(row[4])||0,forms:Number(row[5])||0,messages:Number(row[6])||0,impressions:Number(row[7])||0,clicks:Number(row[8])||0,reach:Number(row[10])||0}));
  window.CITROEN_FILTER_ENGINE?.setRows(data);
  window.CITROEN_COMPARISON_LAB?.setRows(data);
  window.CITROEN_ALERT_CENTER?.setRows(data);
  render();
 }catch{status('No se pudo cargar la fuente Meta Ads para páginas nuevas.');}
}
document.addEventListener('citroen:campaign-data',()=>void loadMeta());
async function loadPublished(){
 pendingDraft=localDraft();
 try{
  const response=await fetch('/api/dashboard',{cache:'no-store'});
  if(!response.ok)throw Error('Versión pública no disponible.');
  const d=await response.json();
  state=d.workspace||empty();
  window.CITROEN_ALERT_CENTER?.setRules(state.alertRules||[]);
  if(state.summary)window.CITROEN_STUDIO_ACTIONS?.importPublished?.(state.summary);
  summaryBaseline=JSON.stringify(window.CITROEN_STUDIO_ACTIONS?.exportPublished?.()||null);
  lastPublishedRevision=d.revision||state.revision||'initial';
  baseRevision=lastPublishedRevision;
  window.CITROEN_FREE_LAYOUT?.import(state.summaryLayout||{enabled:false,items:{}});
 }catch{
  // Fallo cerrado: los visitantes nunca reciben borradores privados del equipo.
  state=empty();lastPublishedRevision='initial';baseRevision='initial';
  status('No se pudo cargar la versión publicada; el borrador sigue disponible tras acceder.');
 }
 if(!Array.isArray(state.pages))state=empty();
 state.controls=Array.isArray(state.controls)?state.controls:[
  {id:'default-period',label:'Rango de fechas',type:'relative',field:'date',scope:'report',pageId:'resumen',preset:'all',value:'',values:[],logic:'AND',exclude:false,enabled:true},
  {id:'default-model',label:'Modelo',type:'multi',field:'model',scope:'report',pageId:'resumen',value:'',values:[],logic:'AND',exclude:false,enabled:true},
  {id:'default-territory',label:'Territorio',type:'select',field:'territory',scope:'report',pageId:'resumen',value:'',values:[],logic:'AND',exclude:false,enabled:true}
 ];
 window.CITROEN_FILTER_ENGINE?.setDefinitions(state.controls);
 drawPageNav();applyFilters();render();draftUI();
 const location=decodeURIComponent(locationHash());
 if($(location)&&location!==current)navTo(location);
}
function locationHash(){return window.location.hash.slice(1)||'resumen';}
async function publish(){
 if(!authorized()||busy)return;
 busy=true;status('Publicando el diseño para todos los visitantes…');
 try{
  state.summaryLayout=window.CITROEN_FREE_LAYOUT?.export()||{enabled:false,items:{}};
  state.summary=window.CITROEN_STUDIO_ACTIONS?.exportPublished?.()||state.summary||null;
  const r=await fetch('/api/dashboard',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspace:state,expectedRevision:baseRevision})});
  const d=await r.json();
  if(!r.ok){
   if(r.status===409||d.code==='REVISION_CONFLICT')throw Error('Conflicto de versiones: otra persona publicó cambios. Tu borrador está a salvo y no se sobrescribió.');
   throw Error(d.error||'No se pudo publicar');
  }
  lastPublishedRevision=d.revision||d.workspace?.revision||lastPublishedRevision;
  baseRevision=lastPublishedRevision;
  state.revision=lastPublishedRevision;
  state.publishedAt=d.publishedAt||new Date().toISOString();
  dirty=false;pendingDraft=null;
  try{localStorage.removeItem(KEY);}catch{}
  draftUI();
  status('Publicado correctamente · revisión '+lastPublishedRevision.slice(0,8));
 }catch(e){status('No se pudo publicar: '+e.message+'. Tu borrador permanece guardado en este navegador.');}
 busy=false;
}
async function openHistory(){
 if(!authorized()||!window.CITROEN_ACCESS?.isOwner?.())return;
 let modal=$('builderHistoryDialog');
 if(!modal){
  modal=document.createElement('div');modal.id='builderHistoryDialog';modal.className='builder-dialog';
  modal.innerHTML='<div class="builder-dialog-panel builder-history-panel"><button type="button" class="builder-close" id="builderHistoryClose">×</button><h3>Historial de versiones</h3><p class="builder-history-help">Recupera una publicación anterior como borrador. No reemplaza el informe público hasta que pulses Publicar cambios.</p><div id="builderHistoryList" class="builder-history-list"></div><p id="builderHistoryStatus" role="status"></p></div>';
  document.body.appendChild(modal);
  $('builderHistoryClose').onclick=()=>modal.hidden=true;
 }
 modal.hidden=false;
 const list=$('builderHistoryList');list.replaceChildren();
 const tip=$('builderHistoryStatus');tip.textContent='Consultando copias anteriores…';
 try{
  const response=await fetch('/api/history',{credentials:'same-origin',cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'No se pudo consultar el historial');
  tip.textContent=data.history.length?'Elige la versión que quieres recuperar.':'Todavía no hay versiones anteriores archivadas.';
  const row=(title,subtitle,action)=>{
   const el=document.createElement('div');el.className='builder-history-row';
   const about=document.createElement('div'),a=document.createElement('strong'),b=document.createElement('small');
   a.textContent=title;b.textContent=subtitle;about.append(a,b);el.append(about);
   if(action)el.append(button('Recuperar borrador',action));
   list.append(el);
  };
  if(data.current)row('Versión actual · '+data.current.revision.slice(0,8),'Publicada '+(data.current.publishedAt?new Date(data.current.publishedAt).toLocaleString('es-CO'):'—'));
  for(const version of data.history){
   row('Versión '+version.revision.slice(0,8),'Archivada '+new Date(version.archivedAt).toLocaleString('es-CO'),async()=>{
    if(!confirm('¿Cargar esta versión anterior como borrador editable? La versión pública no se modificará todavía.'))return;
    const url='/api/history?revision='+encodeURIComponent(version.revision);
    try{
     const detailRes=await fetch(url,{credentials:'same-origin',cache:'no-store'});
     const detail=await detailRes.json();
     if(!detailRes.ok)throw Error(detail.error||'Revisión no disponible');
     const snapshot=detail.workspace;
     if(!snapshot||!Array.isArray(snapshot.pages))throw Error('Formato histórico no válido');
     state=snapshot;
     state.controls=Array.isArray(state.controls)?state.controls:[];
     window.CITROEN_FILTER_ENGINE?.setDefinitions(state.controls);
     if(state.summary)window.CITROEN_STUDIO_ACTIONS?.importPublished?.(state.summary);
     if(state.summaryLayout)window.CITROEN_FREE_LAYOUT?.import(state.summaryLayout);
     // Retain the current live revision as the base for the explicit next publication.
     pendingDraft=null;dirty=true;drawPageNav();applyFilters();render();stash();
     modal.hidden=true;navTo('resumen');
     status('Versión histórica '+version.revision.slice(0,8)+' recuperada en borrador. Revisa y pulsa Publicar cambios.');
    }catch(e){tip.textContent=e.message;}
   });
  }
  if(data.hasMore)tip.textContent+=' Se muestran las últimas 30 copias.';
 }catch(e){tip.textContent=e.message;}
}
function renderNativeControls(){
 const e=window.CITROEN_FILTER_ENGINE;if(!e)return;
 for(const id of ['c3ComparePanel','c3FunnelPanel','c3ModelsPanel','c3CampaignPanel','c3InsightsPanel']){
  const parent=$(id);if(!parent)continue;
  const configured=e.getDefinitions().some(d=>d.scope==='chart'&&d.pageId==='resumen'&&d.cardId==='n:'+id);
  let host=parent.querySelector('.lk-native-filters');
  if(!configured){host?.remove();continue;}
  if(!host){host=document.createElement('div');host.className='lk-native-filters';parent.querySelector('.c3-panel-heading')?.after(host);}
  e.render(host,'resumen','n:'+id);
 }
}
function render(){
 if(!$('builderPageLinks'))return;
 const isEditor=authorized();
 $('builderGlobalActions').hidden=!isEditor;
 if($('builderHistory'))$('builderHistory').hidden=!window.CITROEN_ACCESS?.isOwner?.()||!isEditor;
 draftUI();
 const privateNav=document.querySelector('[data-target="citroen-sources"]');if(privateNav)privateNav.hidden=!isEditor;
 // Only mount the active report: avoid rebuilding dozens of SVG charts on every change.
 const activePage=state.pages.find(p=>'report-'+p.id===current);
 if(activePage)renderPage(activePage);
 if(current==='citroen-creatives')renderCreatives();
 if(current==='citroen-insights')renderInsights();
 if(current==='citroen-compare')window.CITROEN_COMPARISON_LAB?.mount($('citroen-compareBody'),data);
 if(current==='citroen-alerts')window.CITROEN_ALERT_CENTER?.mount($('citroen-alertsBody'));
 if(current==='citroen-sources')renderSources();
 if(current==='resumen')window.CITROEN_FILTER_ENGINE?.render('lkGlobalFilters','resumen');
 renderNativeControls();
 applyFilters();
}
function setupEditorModals(){
 document.body.insertAdjacentHTML('beforeend',
 '<div id="builderCardEditor" class="builder-dialog" hidden><div class="builder-dialog-panel"><button type="button" data-builder-close="builderCardEditor" class="builder-close">×</button><h3>Editar tarjeta</h3><form id="builderCardForm"><label>Título<input name="title" maxlength="100"></label><label>Contenido / insight<textarea name="text" rows="5"></textarea></label><label>Métrica<select name="metric">'+Object.entries(CL).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label><label>Visualización<select name="shape"><option value="bar">Barras</option><option value="line">Líneas</option><option value="area">Área</option><option value="barh">Barras horizontales</option><option value="pie">Circular</option><option value="donut">Anillo</option><option value="gauge">Medidor</option><option value="table">Tabla</option></select></label><label>Objetivo (solo para medidores)<input name="goal" type="number" min="0" placeholder="Ej. 1500"></label><div id="builderABFields" class="builder-ab-fields" hidden><h4>Comparativo A/B guardado</h4><p>Las fechas permanecen fijas en esta tarjeta y no dependen del filtro global de período.</p><div class="builder-ab-fieldgrid"><label>A desde<input name="aStart" type="date"></label><label>A hasta<input name="aEnd" type="date"></label><label>B desde<input name="bStart" type="date"></label><label>B hasta<input name="bEnd" type="date"></label><label>Desglose<select name="abGroup"><option value="model">Modelo</option><option value="territory">Territorio</option><option value="account">Cuenta Meta</option></select></label><label>Filtrar modelo<select name="abModel"><option value="">Todos los modelos</option></select></label><label>Filtrar territorio<select name="abTerritory"><option value="">Todos los territorios</option></select></label></div><p id="builderABError" class="builder-ab-error" role="status"></p></div><label>Dimensión<select name="dimension"><option value="date">Día</option><option value="week">Semana</option><option value="month">Mes</option><option value="quarter">Trimestre</option><option value="model">Modelo</option><option value="territory">Territorio</option><option value="account">Cuenta Meta</option></select></label><label>Filtro<select name="filter"><option value="month">Mes</option><option value="model">Modelo</option></select></label><label>URL HTTPS de imagen<input name="image" type="url"></label><label>O subir imagen<input type="file" id="builderCardUpload" accept="image/png,image/jpeg,image/webp"></label></form><div class="builder-dialog-buttons"><button id="builderCardRemove" type="button">Eliminar</button><button id="builderCardSave" type="button">Guardar tarjeta</button></div></div></div>'+
 '<div id="builderFilterEditor" class="builder-dialog" hidden><div class="builder-dialog-panel builder-filter-editor-panel"><button type="button" class="builder-close" data-builder-close="builderFilterEditor">×</button><h3>Configurar control avanzado</h3><p>Filtros Looker: calendario, períodos relativos, listas, búsqueda, métricas y condiciones avanzadas.</p><form id="builderFilterEditorForm"><label>Nombre<input name="label" maxlength="80"></label><label>Tipo<select name="type"><option value="relative">Período relativo</option><option value="date">Calendario de fechas</option><option value="select">Desplegable</option><option value="multi">Selección múltiple</option><option value="list">Lista fija</option><option value="radio">Opciones de radio</option><option value="search">Buscar texto</option><option value="number">Rango numérico</option><option value="slider">Deslizadores</option><option value="checkbox">Casilla para registros con valor</option><option value="advanced">Condición avanzada</option></select></label><label>Campo<select name="field"><option value="date">Fecha diaria</option><option value="month">Mes</option><option value="model">Modelo</option><option value="territory">Territorio</option><option value="account">Cuenta Meta</option><option value="platform">Plataforma</option><option value="spend">Inversión</option><option value="forms">Formularios</option><option value="messages">Conversaciones</option><option value="impressions">Impresiones</option><option value="reach">Alcance por fila</option><option value="clicks">Clics enlace</option></select></label><label>Alcance del control<select name="scope"><option value="report">Todo el informe</option><option value="page">Solo una página</option><option value="chart">Solo un gráfico</option></select></label><label>Página<select name="pageId"></select></label><label>Gráfico (si aplica)<select name="cardId"></select></label><label>Operador para filtro avanzado<select name="operator"><option value="contains">Contiene</option><option value="equals">Es igual a</option><option value="starts">Empieza por</option><option value="ends">Termina en</option><option value="notcontains">No contiene</option><option value="gt">Mayor que</option><option value="gte">Mayor o igual</option><option value="lt">Menor que</option><option value="lte">Menor o igual</option><option value="between">Entre valores</option><option value="in">Está entre (comas)</option><option value="notin">No está entre (comas)</option><option value="empty">Vacío</option><option value="notempty">No vacío</option><option value="regex">Expresión regular</option></select></label><label>Valor inicial o condición<input name="value" placeholder="Ej. C3 o 250000"></label><label>Fechas relativas<select name="preset"><option value="all">Todo</option><option value="today">Hoy</option><option value="yesterday">Ayer</option><option value="last7">Últimos 7 días</option><option value="last14">Últimos 14 días</option><option value="last28">Últimos 28 días</option><option value="last30">Últimos 30 días</option><option value="last90">Últimos 90 días</option><option value="thisweek">Esta semana</option><option value="lastweek">Semana anterior</option><option value="thismonth">Mes actual</option><option value="lastmonth">Mes anterior</option><option value="thisquarter">Trimestre actual</option><option value="thisyear">Año actual</option><option value="lastyear">Año anterior</option></select></label><div class="builder-filter-pair"><label>Desde<input name="start" type="date"></label><label>Hasta<input name="end" type="date"></label></div><div class="builder-filter-pair"><label>Mínimo<input name="min" type="number"></label><label>Máximo<input name="max" type="number"></label></div><label class="builder-filter-check"><input type="checkbox" name="exclude"> Excluir coincidencias</label><label class="builder-filter-check"><input type="checkbox" name="enabled" checked> Control habilitado</label><label>Cómo combinar con el filtro anterior<select name="logic"><option value="AND">Y (AND)</option><option value="OR">O (OR)</option></select></label></form><div class="builder-dialog-buttons"><button type="button" data-builder-close="builderFilterEditor">Cancelar</button><button type="button" id="builderFilterEditSave">Guardar filtro</button></div></div></div>'+ 
 '<div id="builderFilterListDialog" class="builder-dialog" hidden><div class="builder-dialog-panel"><button type="button" data-builder-close="builderFilterListDialog" class="builder-close">×</button><h3>Filtros configurados</h3><div id="builderDefinedFilters"></div></div></div>'+ 
 '<div id="builderCreativeDialog" class="builder-dialog" hidden><div class="builder-dialog-panel"><button type="button" class="builder-close" data-builder-close="builderCreativeDialog">×</button><h3>Biblioteca de creativos</h3><label>Título de pieza<input id="builderCreativeTitle" maxlength="110"></label><label>Campaña<input id="builderCreativeCampaign" maxlength="150"></label><label>Formato<select id="builderCreativeFormat"><option>Imagen</option><option>Vídeo</option><option>Carrusel</option><option>Otro</option></select></label><label>Imagen por URL HTTPS<input id="builderCreativeUrl" type="url" placeholder="https://..."></label><label>O subir imagen JPG/PNG/WebP<input type="file" id="builderCreativeUpload" accept="image/png,image/jpeg,image/webp"></label><label>Notas, aprendizaje o recomendación<textarea id="builderCreativeNotes" rows="5"></textarea></label><div class="builder-dialog-buttons"><button type="button" id="builderCreativeDelete">Eliminar</button><button type="button" id="builderCreativeSave">Guardar creativo</button></div></div></div>'+ 
  '<div id="builderInsightDialog" class="builder-dialog" hidden><div class="builder-dialog-panel"><button type="button" class="builder-close" data-builder-close="builderInsightDialog">×</button><h3>Escribir insight</h3><label>Título<input id="builderInsightTitle"></label><label>Hallazgo y recomendación<textarea rows="12" id="builderInsightBody"></textarea></label><div class="builder-dialog-buttons"><button type="button" id="builderInsightDelete">Eliminar</button><button type="button" id="builderInsightSave">Guardar insight</button></div></div></div>');
 document.querySelectorAll('[data-builder-close]').forEach(b=>b.onclick=()=>$(b.dataset.builderClose).hidden=true);
}
let booted=false;
function wire(){
 if(booted)return;booted=true;
 initSections();setupEditorModals();
 window.CITROEN_ALERT_CENTER?.configure(rules=>{if(!authorized())return;state.alertRules=rules;stash();});
 document.addEventListener('click',e=>{
  const item=e.target.closest('.sidebar .nav-link[data-target]:not(.builder-nav)');
  if(!item)return;const id=item.dataset.target;
  if(!id||id===current)return;
  current=id;selectedCardId=null;
  const viewport=document.querySelector('.content');if(viewport){viewport.scrollTop=0;viewport.scrollLeft=0;}
  document.dispatchEvent(new CustomEvent('citroen:builder-page-changed',{detail:{id,title:item.textContent.trim()}}));
  render();
 });
  document.addEventListener('citroen:studio-layout',()=>{watchSummary();render();});
 document.addEventListener('citroen:summary-rendered',watchSummary);
 document.addEventListener('citroen:sources-changed',()=>{const p=state.pages.find(p=>'report-'+p.id===current);if(p)renderPage(p);});
 document.addEventListener('citroen:advanced-filter-changed',()=>{window.CITROEN_FILTER_ENGINE?.render('lkGlobalFilters','resumen');render();});
 document.addEventListener('hashchange',()=>{const id=locationHash();if($(id)&&id!==current)navTo(id);});
 loadPublished();loadMeta();
}
document.addEventListener('DOMContentLoaded',wire);
window.CITROEN_BUILDER={render,loadPublished,publish,
 saveDraft:()=>{if(!authorized())return false;stash();status('Borrador guardado en este navegador · Publicar comparte el diseño.');return true;},
 getSource:cardId=>{const c=state.pages.flatMap(p=>p.cards).find(c=>c.id===cardId);return c?.source==='external'?window.CITROEN_SOURCES?.get(c.sourceId):null;},
 insertSource(source,destination,shape='table'){
  if(!authorized()||!source?.id)return false;
  let p=state.pages.find(p=>p.id===destination);
  if(destination==='new'){if(!canCreatePage())return false;p={id:uid(),title:('Informe · '+(source.name||source.source)).slice(0,70),cards:[]};installPage(p,'Página creada con tu fuente conectada.');}
  if(!p||p.cards.length>=45)return false;
  const fields=window.CITROEN_SOURCE_DATA.fields(source),metric=fields.find(f=>f.type==='metric')?.name||source.columns[0],dimension=fields.find(f=>f.type==='text')?.name||source.columns[0];
  navTo('report-'+p.id);
  newCard('chart',p,{source:'external',sourceId:source.id,title:source.name||source.source,shape,dimension,metric,aggregation:'sum'});return true;
 },
 getFilterVisibility:(field)=>state.filters?.[field]!==false,
 getCurrentPage:()=>current,getPages:()=>state.pages.map(p=>({id:p.id,title:p.title,count:p.cards.length})),
 openTemplates:openTemplateGallery,
 duplicatePage:clonePage,
 getCard(pageId,cardId){const p=state.pages.find(p=>p.id===pageId);const c=p?.cards.find(c=>c.id===cardId);return c?{...c}:null;},
 addOnCurrent(type,changes={}){if(!authorized())return false;const p=state.pages.find(p=>'report-'+p.id===current);if(!p)return false;newCard(type,p,changes);return true;},
 addABToPage(pageId,settings){
  if(!authorized()||!settings||typeof settings!=='object')return false;
  const p=state.pages.find(p=>p.id===pageId);if(!p||p.cards.length>=45)return false;
  const r=window.CITROEN_COMPARISON_LAB?.calculate(data,settings,window.CITROEN_REACH_MATH?.estimate);
  if(!r?.ok)return false;
  newCard('ab',p,{
   title:'A/B · '+(CL[settings.metric]||settings.metric),metric:settings.metric,
   aStart:settings.aStart,aEnd:settings.aEnd,bStart:settings.bStart,bEnd:settings.bEnd,
   abGroup:settings.group,abModel:settings.model||'',abTerritory:settings.territory||''
  });
  navTo('report-'+p.id);return true;
 },
 updateCard(pageId,cardId,patch){if(!authorized()||!patch||typeof patch!=='object')return false;
  const p=state.pages.find(p=>p.id===pageId),c=p?.cards.find(c=>c.id===cardId);if(!c)return false;
  const valid={shape:['bar','barh','line','area','table','pie','donut','gauge'],metric:['spend','forms','messages','impressions','reach','clicks','ctr','cpl'],dimension:['date','week','month','quarter','model','territory','account']};
  for(const [k,v] of Object.entries(patch)){
   if(k==='title'&&typeof v==='string')c.title=v.slice(0,100);
   else if(['color','background','textColor'].includes(k)&&typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v))c[k]=v;
   else if(k==='text'&&typeof v==='string')c.text=v.slice(0,7000);
   else if(k==='goal'&&Number.isFinite(Number(v)))c.goal=v===''?null:Math.max(0,Math.min(1e12,Number(v)));
   else if(k==='source'&&['meta','external'].includes(v))c.source=v;
   else if(k==='sourceId'&&window.CITROEN_SOURCES?.get(v)){const src=window.CITROEN_SOURCES.get(v);c.source='external';c.sourceId=v;c.dimension=src.columns[0];c.metric=window.CITROEN_SOURCE_DATA.fields(src).find(f=>f.type==='metric')?.name||src.columns[0];c.shape='bar';}
   else if(k==='aggregation'&&['sum','avg','count','min','max'].includes(v))c.aggregation=v;
   else if(['metric','dimension'].includes(k)&&c.source==='external'&&window.CITROEN_SOURCES?.get(c.sourceId)?.columns.includes(v))c[k]=v;
   else if(valid[k]?.includes(v)&&!(c.source==='external'&&['metric','dimension'].includes(k)))c[k]=v;
  }
  stash();renderPage(p);return {...c};
 },
 duplicateCard(pageId,cardId){if(!authorized())return false;const p=state.pages.find(x=>x.id===pageId),c=p?.cards.find(x=>x.id===cardId);if(!c||p.cards.length>=45)return false;
  const dup={...c,id:uid(),title:(c.title+' · copia').slice(0,100),x:Math.min(2200,c.x+26),y:Math.min(5700,c.y+28)};p.cards.push(dup);selectedCardId=dup.id;stash();renderPage(p);document.dispatchEvent(new CustomEvent('citroen:builder-card-selected',{detail:{pageId:p.id,card:{...dup}}}));return true;},
 removeCard:removeCreatedCard,
 getSelectedCardId:()=>selectedCardId,
 renamePage(pageId,title){if(!authorized()||!String(title).trim())return false;const p=state.pages.find(x=>x.id===pageId);if(!p)return false;p.title=String(title).trim().slice(0,70);stash();drawPageNav();renderPage(p);document.dispatchEvent(new CustomEvent('citroen:builder-page-changed',{detail:{id:'report-'+p.id,title:p.title}}));return true;},
 reorderPage(pageId,direction){if(!authorized())return false;const i=state.pages.findIndex(p=>p.id===pageId),j=i+direction;if(i<0||j<0||j>=state.pages.length)return false;[state.pages[i],state.pages[j]]=[state.pages[j],state.pages[i]];stash();drawPageNav();document.dispatchEvent(new Event('citroen:builder-page-order'));return true;}
};
})();