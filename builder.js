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
let state=empty(),current='resumen',data=[],external=null,localFilter={month:'',model:''},busy=false;
function localDraft(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}}
function stash(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function status(s){if($('builderStatus'))$('builderStatus').textContent=s;}
function cleanURL(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return typeof s==='string'&&/^data:image\/(?:jpeg|png|webp);base64,/.test(s)&&s.length<120000?s:'';}}
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
 render();
}
function pageNav(id,label){const btn=mk('button',{type:'button',class:'nav-link builder-nav', 'data-target':id},'<span class="builder-nav-icon">◇</span> '+esc(label));btn.onclick=()=>navTo(id);return btn;}
function initSections(){
 const nav=$('sidebar').querySelector('.nav'),main=document.querySelector('.content');
 for(const [id,label] of [['citroen-creatives','Creativos'],['citroen-insights','Insights'],['citroen-sources','Conexiones de datos']]){
  if(!$(id))main.appendChild(make(id,label));
  if(!nav.querySelector('[data-target="'+id+'"]'))nav.appendChild(pageNav(id,label));
 }
 const a=mk('div',{class:'builder-menu'},'<div class="builder-menu-title">MIS PÁGINAS</div><div id="builderPageLinks"></div>');
 nav.appendChild(a);
 const dock=mk('div',{class:'builder-global-actions',id:'builderGlobalActions',hidden:''});
 dock.innerHTML='<button id="builderNewPage" type="button">＋ Nueva página</button><button id="builderFilterSetup" type="button">⚙ Filtros</button><button id="builderNewFilter" type="button">＋ Control / filtro avanzado</button><button id="builderManageFilters" type="button">Administrar filtros</button><button id="builderPublish" type="button">Publicar cambios</button><small id="builderStatus">Modo lectura</small>';
 $('sidebar').querySelector('.sidebar-bottom').prepend(dock);
 const filt=mk('div',{id:'builderFilterModal',class:'builder-filter-modal',hidden:''});
 filt.innerHTML='<div class="builder-filter-content"><button id="builderFilterClose" type="button">×</button><h3>Filtros del dashboard</h3><p>Elige los controles que mostrarán todos los usuarios en Resumen.</p><label><input type="checkbox" data-filter-toggle="month"> Período</label><label><input type="checkbox" data-filter-toggle="territory"> Territorio</label><label><input type="checkbox" data-filter-toggle="model"> Modelo</label></div>';
 document.body.appendChild(filt);
 $('builderFilterClose').onclick=()=>filt.hidden=true;
 $('builderFilterSetup').onclick=()=>{if(!authorized())return;filt.hidden=false;filt.querySelectorAll('input').forEach(i=>i.checked=state.filters[i.dataset.filterToggle]!==false);};
 filt.querySelectorAll('input').forEach(x=>x.onchange=()=>{if(!authorized())return;state.filters[x.dataset.filterToggle]=x.checked;applyFilters();stash();status('Filtros editados; publica para compartirlos.');});
 $('builderNewPage').onclick=()=>createPage();
 $('builderNewFilter').onclick=()=>editFilter();
 $('builderManageFilters').onclick=()=>manageFilters();
 $('builderPublish').onclick=()=>publish();
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
  if(type==='number'&&!['spend','forms','messages','impressions','reach','clicks'].includes(campo))return status('El rango numérico requiere una métrica cuantitativa.');
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
function createPage(){
 if(!authorized())return;
 if(state.pages.length>=15){status('Máximo 15 páginas.');return;}
 const name=prompt('Nombre de la nueva página (por ejemplo: Ventas por modelo)','Nuevo informe');
 if(!name?.trim())return;
 const p={id:uid(),title:name.trim().slice(0,70),cards:[]};
 state.pages.push(p);stash();drawPageNav();navTo('report-'+p.id);status('Página creada. Agrega tarjetas y publica cuando esté lista.');
}
function newCard(type,page){
 if(!authorized())return;
 if(page.cards.length>=45){status('Máximo 45 tarjetas por página.');return;}
 const card={id:uid(),type,title:{metric:'Indicador',chart:'Gráfico Meta Ads',note:'Insight',image:'Imagen',filter:'Filtro de mes'}[type],text:'',source:'meta',metric:'spend',dimension:'month',shape:'bar',x:24+(page.cards.length%3)*34,y:24+(page.cards.length%5)*36,w:type==='chart'?480:330,h:type==='note'?230:285};
 page.cards.push(card);stash();renderPage(page);
}
function deletePage(p){if(!authorized()||!confirm('¿Eliminar esta página y sus tarjetas?'))return;state.pages=state.pages.filter(x=>x.id!==p.id);stash();drawPageNav();navTo('resumen');}
function pageToolbar(page){
 const actions=$('report-'+page.id+'Actions');actions.replaceChildren();
 if(!authorized())return;
 const kinds=[['metric','＋ Indicador'],['chart','＋ Gráfico'],['note','＋ Texto / insight'],['image','＋ Imagen'],['filter','＋ Filtro']];
 for(const [type,label] of kinds)actions.appendChild(button(label,()=>newCard(type,page)));
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
 if(shape==='pie'||shape==='donut'){
  const total=arr.reduce((x,r)=>x+r.value,0);if(total<=0)return '<div class="builder-empty">No hay valores positivos para mostrar la distribución.</div>';
  let last=0;const cx=120,cy=103,rad=77,small=shape==='donut';
  const palette=['#ea5668','#99c9e1','#245977','#f4b26b','#7cc1ad','#ae9ada','#e0accc','#75afdc'];
  const slices=arr.map((a,i)=>{
   const start=last,last+=a.value/total;
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
  const total=arr.reduce((a,b)=>a+b.value,0),goal=Number(card.goal)>0?Number(card.goal):Math.max(total,1),part=Math.min(1,total/goal);
  return '<div class="builder-gauge"><div class="builder-gauge-ring" style="--gauge-percent:'+(100*part).toFixed(2)+'%"><span>'+Math.round(part*100)+'%</span></div><strong>'+fmt(total,card.metric)+'</strong><small>Objetivo configurado: '+fmt(goal,card.metric)+'</small></div>';
 }
 let plot='',pts=[];
 arr.forEach((a,i)=>{
  const x=p+step*(i+.5),y=H-p-(a.value/max)*(H-2*p);
  pts.push([x,y]);
  if(shape==='bar')plot+='<rect x="'+(x-step*.27)+'" y="'+y+'" width="'+step*.54+'" height="'+(H-p-y)+'" rx="3" fill="#8abbd8"><title>'+esc(a.name)+'</title></rect>';
  if(shape==='barh')plot+='<rect x="'+p+'" y="'+(22+i*Math.min(23,120/arr.length))+'" width="'+(a.value/max*(W-p*2))+'" height="'+Math.max(5,Math.min(17,110/arr.length))+'" rx="3" fill="#8abbd8"><title>'+esc(a.name)+'</title></rect>';
  if(shape!=='barh')plot+='<text x="'+x+'" y="'+(H-5)+'" text-anchor="middle" font-size="9" fill="#456b85">'+esc(a.name.slice(0,9))+'</text>';
 });
 if(['line','area'].includes(shape)){
  const coords=pts.map(a=>a.join(',')).join(' ');
  if(shape==='area')plot+='<polygon points="'+pts[0][0]+','+(H-p)+' '+coords+' '+pts.at(-1)[0]+','+(H-p)+'" fill="#d4e9f6"/>';
  plot+='<polyline points="'+coords+'" fill="none" stroke="#ed5b6e" stroke-width="3"/>';
 }
 if(shape==='barh')plot+=arr.map((a,i)=>'<text x="'+(p+3)+'" y="'+(18+i*Math.min(23,120/arr.length))+'" fill="#355875" font-size="9">'+esc(a.name.slice(0,25))+'</text>').join('');
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(card.title)+'" preserveAspectRatio="none">'+plot+'</svg>';
}
function cardBody(card,page){
 if(card.type==='note')return '<p class="builder-note-body">'+esc(card.text||'Escribe aquí tus hallazgos y recomendaciones desde Editar tarjeta.').replace(/\n/g,'<br>')+'</p>';
 if(card.type==='image')return card.image?'<img class="builder-card-img" loading="lazy" alt="'+esc(card.title)+'" src="'+esc(card.image)+'">':'<div class="builder-empty">Sube o enlaza una imagen desde Editar tarjeta.</div>';
 if(card.type==='filter')return '<label class="builder-card-filter">Filtrar '+(card.filter==='model'?'modelo':'mes')+' <select data-board-filter="'+esc(card.filter||'month')+'">'+(card.filter==='model'?modelOptions():monthOptions())+'</select></label>';
 if(card.source==='external'){
  if(!external)return '<p class="builder-empty">Fuente externa privada: conecta Sheets o BigQuery desde Diseño para actualizar el gráfico.</p>';
  return renderExternal(card);
 }
 if(card.type==='metric')return '<div class="builder-big-number">'+fmt(metric(card,filtered(card,page)),card.metric)+'</div><small>'+esc(CL[card.metric]||'Indicador')+' · Meta Ads</small>';
 return renderChart(card,page);
}
function monthOptions(){return '<option value="">Todos los meses</option>'+Array.from(new Set(data.map(r=>r.month))).sort().map(m=>'<option value="'+esc(m)+'" '+(localFilter.month===m?'selected':'')+'>'+esc(m)+'</option>').join('');}
function modelOptions(){return '<option value="">Todos los modelos</option>'+Array.from(new Set(data.map(r=>r.model))).sort().map(m=>'<option value="'+esc(m)+'" '+(localFilter.model===m?'selected':'')+'>'+esc(m)+'</option>').join('');}
function renderExternal(card){
 const cols=external?.columns||[],rows=external?.rows||[];
 if(!cols.length)return '<p class="builder-empty">Reconecta la fuente privada desde Conexiones de datos para actualizar el gráfico.</p>';
 const label='<small class="builder-ext-source">'+esc(external.source||'Fuente conectada')+' · Lectura privada (hasta 100 filas)</small>';
 if(card.shape==='table')return label+'<div class="builder-preview-scroll"><table class="builder-data-table"><thead><tr>'+cols.slice(0,6).map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(0,100).map(r=>'<tr>'+cols.slice(0,6).map(c=>'<td>'+esc(r[c])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 const dim=cols.includes(card.dimension)?card.dimension:cols[0],valCol=cols.includes(card.metric)?card.metric:cols[1]||cols[0];
 const groups=new Map();
 for(const r of rows){const group=String(r[dim]??'Sin dato').slice(0,55),value=Number(String(r[valCol]??'0').replace(/,/g,''));groups.set(group,(groups.get(group)||0)+(Number.isFinite(value)?value:0));}
 const points=Array.from(groups,([name,value])=>({name,value})).slice(0,15);
 if(!points.length)return label+'<p class="builder-empty">Esta tabla no tiene valores numéricos para representar.</p>';
 const max=Math.max(1,...points.map(p=>p.value)),W=540,H=192,pad=28,step=(W-pad*2)/points.length,coords=[];
 let svg='';
 points.forEach((p,i)=>{const x=pad+step*(i+.5),y=H-pad-p.value/max*(H-2*pad);coords.push([x,y]);if(card.shape==='bar')svg+='<rect x="'+(x-step*.30)+'" y="'+y+'" width="'+step*.6+'" height="'+(H-pad-y)+'" fill="#86bcdc" rx="3"/>';svg+='<text x="'+x+'" y="'+(H-5)+'" text-anchor="middle" font-size="9" fill="#55748a">'+esc(p.name.slice(0,9))+'</text>';});
 if(card.shape!=='bar'){const curve=coords.map(x=>x.join(',')).join(' ');if(card.shape==='area')svg+='<polygon points="'+coords[0][0]+','+(H-pad)+' '+curve+' '+coords.at(-1)[0]+','+(H-pad)+'" fill="#c8e4f4"/>';svg+='<polyline points="'+curve+'" fill="none" stroke="#e95061" stroke-width="3"/>';}
 return label+'<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(card.title)+'">'+svg+'</svg><small>Dimensión: '+esc(dim)+' · Métrica: '+esc(valCol)+'</small>';
}
function editCard(page,card){
 if(!authorized())return;
 const modal=$('builderCardEditor'),form=$('builderCardForm');
 const metricInput=form.elements.metric,dimensionInput=form.elements.dimension;
 if(card.source==='external'&&external?.columns?.length){
  metricInput.innerHTML=external.columns.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
  dimensionInput.innerHTML=external.columns.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
 }else{
  metricInput.innerHTML=Object.entries(CL).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join('');
  dimensionInput.innerHTML='<option value="month">Mes</option><option value="model">Modelo</option>';
 }
  form.elements.title.value=card.title||'';
 form.elements.text.value=card.text||'';
 form.elements.metric.value=card.metric||'spend';
 form.elements.shape.value=card.shape||'bar';
 form.elements.dimension.value=card.dimension||'month';
 form.elements.filter.value=card.filter||'month';
 form.elements.image.value=card.image?.startsWith('https://')?card.image:'';
 modal.hidden=false;
 $('builderCardSave').onclick=()=>{
  const f=form.elements;
  card.title=f.title.value.trim().slice(0,100)||'Sin título';
  card.text=f.text.value.slice(0,7000);
  card.metric=f.metric.value;card.shape=f.shape.value;card.dimension=f.dimension.value;card.filter=f.filter.value;
  if(cleanURL(f.image.value))card.image=cleanURL(f.image.value);
  stash();modal.hidden=true;renderPage(page);
 };
 $('builderCardRemove').onclick=()=>{
  if(confirm('¿Eliminar esta tarjeta?')){page.cards=page.cards.filter(x=>x.id!==card.id);stash();modal.hidden=true;renderPage(page);}
 };
 $('builderCardUpload').onchange=async e=>{
  const file=e.target.files?.[0];if(!file||!file.type.startsWith('image/')||file.size>5*1024*1024)return status('Sube JPG/PNG/WebP de máximo 5 MB.');
  const src=await downsize(file);if(src){card.image=src;stash();status('Imagen lista; pulsa Guardar tarjeta.');}
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
function installMove(el,page,card){
 if(!authorized())return;
 const handle=el.querySelector('.builder-card-grip'),resize=el.querySelector('.builder-card-resize');
 const begin=(e,mode)=>{
  if(e.button!==0&&e.pointerType!=='touch')return;
  e.preventDefault();el.setPointerCapture?.(e.pointerId);
  const sx=e.clientX,sy=e.clientY,original={x:card.x,y:card.y,w:card.w,h:card.h};
  const move=p=>{
   const dx=p.clientX-sx,dy=p.clientY-sy;
   if(mode==='move'){card.x=Math.max(0,Math.round((original.x+dx)/8)*8);card.y=Math.max(0,Math.round((original.y+dy)/8)*8);}
   else{card.w=Math.max(220,Math.min(1100,Math.round((original.w+dx)/8)*8));card.h=Math.max(170,Math.min(850,Math.round((original.h+dy)/8)*8));}
   el.style.left=card.x+'px';el.style.top=card.y+'px';el.style.width=card.w+'px';el.style.height=card.h+'px';
  };
  const up=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);stash();const canvas=$('builderCanvas-'+page.id);canvas.style.minHeight=Math.max(650,...page.cards.map(c=>c.y+c.h+35))+'px';};
  el.addEventListener('pointermove',move);el.addEventListener('pointerup',up,{once:true});el.addEventListener('pointercancel',up,{once:true});
 };
 handle.onpointerdown=e=>begin(e,'move');resize.onpointerdown=e=>begin(e,'size');
}
function renderPage(page){
 const root=$('report-'+page.id);if(!root)return;pageToolbar(page);
 const target=$('report-'+page.id+'Body');
 target.innerHTML='<div class="lk-page-filters" id="lkFilters-'+page.id+'"></div><div class="builder-canvas-note">'+(authorized()?'Arrastra las tarjetas libremente usando el icono de puntos, y redimensiona desde la esquina inferior derecha.':'Vista publicada del informe.')+'</div><div class="builder-board-scroller"><div class="builder-board" id="builderCanvas-'+page.id+'"></div></div>';
 const canvas=$('builderCanvas-'+page.id);
 window.CITROEN_FILTER_ENGINE?.render('lkFilters-'+page.id,'report-'+page.id);
 canvas.style.minHeight=Math.max(650,...page.cards.map(c=>c.y+c.h+35))+'px';
 for(const card of page.cards){
  const tools=authorized()?'<button type="button" class="builder-card-edit">Editar</button><span class="builder-card-grip" title="Arrastrar libremente">⠿</span>':'';
  const html='<div class="builder-card-top"><strong>'+esc(card.title)+'</strong><span>'+tools+'</span></div><div class="builder-card-inner">'+cardBody(card,page)+'</div>'+(authorized()?'<div class="builder-card-resize" title="Redimensionar"></div>':'');
  const el=mk('article',{class:'builder-board-card', 'data-card-id':card.id},html);
  Object.assign(el.style,{left:card.x+'px',top:card.y+'px',width:card.w+'px',height:card.h+'px'});
  el.querySelector('.builder-card-edit')?.addEventListener('click',()=>editCard(page,card));
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
  uploaded=await downsize(file);if(!uploaded)status('No se pudo comprimir la imagen. Prueba con una más pequeña.');
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
 if(!authorized()){root.innerHTML='<div class="builder-empty-page">Las conexiones externas se administran desde el modo Diseño. Los datos privados no se muestran a visitantes.</div>';return;}
 root.innerHTML='<div class="builder-connect-grid"><article><h3>Google Sheets</h3><p>Conecta un Sheet publicado como CSV. Para hojas privadas, configura una cuenta de servicio en Vercel.</p><label>Enlace de Google Sheets<input id="builderSheetUrl" type="url" placeholder="https://docs.google.com/spreadsheets/d/..."></label><button type="button" id="builderSheetConnect">Leer hoja</button></article><article><h3>BigQuery</h3><p>Lectura de hasta 100 filas, con límite de escaneo y credenciales privadas. No admite consultas libres ni escrituras.</p><label>Proyecto<input id="builderBqProject" placeholder="mi-proyecto-google"></label><label>Dataset<input id="builderBqDataset" placeholder="marketing"></label><label>Tabla<input id="builderBqTable" placeholder="campanas"></label><button type="button" id="builderBqConnect">Leer tabla</button></article></div><p class="builder-connection-status" id="builderConnectionStatus"></p><div id="builderExternalPreview"></div>';
 $('builderSheetConnect').onclick=()=>connect('sheets',{url:$('builderSheetUrl').value});
 $('builderBqConnect').onclick=()=>connect('bigquery',{project:$('builderBqProject').value,dataset:$('builderBqDataset').value,table:$('builderBqTable').value});
}
async function connect(kind,settings){
 if(!authorized())return;
 $('builderConnectionStatus').textContent='Conectando…';
 try{
  const res=await fetch('/api/data-connect',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,...settings})});
  const data=await res.json();if(!res.ok)throw Error(data.error||'No se pudo leer la fuente');
  external=data;$('builderConnectionStatus').textContent='Conectado: '+data.source+' · '+data.rows.length+' filas disponibles en vista previa.';
  const preview=$('builderExternalPreview');
  preview.innerHTML='<h3>Vista previa privada de '+esc(data.source)+'</h3><div class="builder-preview-scroll"><table class="builder-data-table"><thead><tr>'+data.columns.slice(0,7).map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+data.rows.slice(0,12).map(r=>'<tr>'+data.columns.slice(0,7).map(c=>'<td>'+esc(r[c])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p>Estos datos no se publicarán automáticamente. Solo se utilizarán en el navegador de edición durante esta sesión.</p>';
  preview.appendChild(button('Insertar tabla en una página',()=>{
   if(!state.pages.length){status('Crea una página antes de añadir una fuente.');return;}
   const id=prompt('Escribe el nombre exacto de la página destino',state.pages[0].title);
   const page=state.pages.find(p=>p.title===id);if(!page)return status('Página no encontrada.');
   const c={id:uid(),type:'chart',source:'external',title:'Datos · '+data.source,text:'',x:40,y:40,w:640,h:350,metric:data.columns[1]||data.columns[0],dimension:data.columns[0],shape:'table'};
   page.cards.push(c);stash();navTo('report-'+page.id);
  }));
 }catch(e){$('builderConnectionStatus').textContent=e.message;}
}
async function loadMeta(){
 try{
  const r=await fetch('./data/meta_2026_daily.json');if(!r.ok)throw Error('Sin fuente');
  const a=await r.json(),d=a.dictionaries;
  data=(a.daily||[]).map(row=>({date:String(d.dates[row[0]]),month:String(d.dates[row[0]]).slice(0,7),territory:String(d.territories[row[2]]),account:String(d.accounts[row[3]]),platform:'Meta Ads',model:String(d.models[row[1]]),spend:Number(row[4])||0,forms:Number(row[5])||0,messages:Number(row[6])||0,impressions:Number(row[7])||0,clicks:Number(row[8])||0,reach:Number(row[10])||0}));
  window.CITROEN_FILTER_ENGINE?.setRows(data);
  render();
 }catch{status('No se pudo cargar la fuente Meta Ads para páginas nuevas.');}
}
async function loadPublished(){
 try{
  const response=await fetch('/api/dashboard',{cache:'no-store'});
  if(response.ok){const d=await response.json();state=d.workspace||empty();if(window.CITROEN_FREE_LAYOUT)window.CITROEN_FREE_LAYOUT.import(state.summaryLayout||{enabled:false,items:{}});}
  else state=localDraft()||empty();
 }catch{state=localDraft()||empty();}
 if(!Array.isArray(state.pages))state=empty();
 state.controls=Array.isArray(state.controls)?state.controls:[
  {id:'default-period',label:'Rango de fechas',type:'relative',field:'date',scope:'report',pageId:'resumen',preset:'all',value:'',values:[],logic:'AND',exclude:false,enabled:true},
  {id:'default-model',label:'Modelo',type:'multi',field:'model',scope:'report',pageId:'resumen',value:'',values:[],logic:'AND',exclude:false,enabled:true},
  {id:'default-territory',label:'Territorio',type:'select',field:'territory',scope:'report',pageId:'resumen',value:'',values:[],logic:'AND',exclude:false,enabled:true}
 ];
 window.CITROEN_FILTER_ENGINE?.setDefinitions(state.controls);
 drawPageNav();applyFilters();render();
 const location=decodeURIComponent(locationHash());
 if($(location)&&location!==current)navTo(location);
}
function locationHash(){return window.location.hash.slice(1)||'resumen';}
async function publish(){
 if(!authorized()||busy)return;
 busy=true;status('Publicando el diseño para todos los visitantes…');
 try{
  state.summaryLayout=window.CITROEN_FREE_LAYOUT?.export()||{enabled:false,items:{}};
  const r=await fetch('/api/dashboard',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspace:state})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'No se pudo publicar');
  status('Publicado correctamente. Las páginas, creativos, insights y filtros son visibles para visitantes.');
 }catch(e){status('No se pudo publicar: '+e.message+'. Tu borrador permanece guardado en este navegador.');}
 busy=false;
}
function render(){
 if(!$('builderPageLinks'))return;
 const isEditor=authorized();
 $('builderGlobalActions').hidden=!isEditor;
 const privateNav=document.querySelector('[data-target="citroen-sources"]');if(privateNav)privateNav.hidden=!isEditor;
 for(const p of state.pages)renderPage(p);
 renderCreatives();renderInsights();
 if(current==='citroen-sources')renderSources();
 window.CITROEN_FILTER_ENGINE?.render('lkGlobalFilters','resumen');
 applyFilters();
}
function setupEditorModals(){
 document.body.insertAdjacentHTML('beforeend',
 '<div id="builderCardEditor" class="builder-dialog" hidden><div class="builder-dialog-panel"><button type="button" data-builder-close="builderCardEditor" class="builder-close">×</button><h3>Editar tarjeta</h3><form id="builderCardForm"><label>Título<input name="title" maxlength="100"></label><label>Contenido / insight<textarea name="text" rows="5"></textarea></label><label>Métrica<select name="metric">'+Object.entries(CL).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label><label>Visualización<select name="shape"><option value="bar">Barras</option><option value="line">Líneas</option><option value="area">Área</option><option value="barh">Barras horizontales</option><option value="pie">Circular</option><option value="donut">Anillo</option><option value="gauge">Medidor</option><option value="table">Tabla</option></select></label><label>Dimensión<select name="dimension"><option value="date">Día</option><option value="week">Semana</option><option value="month">Mes</option><option value="quarter">Trimestre</option><option value="model">Modelo</option><option value="territory">Territorio</option><option value="account">Cuenta Meta</option></select></label><label>Filtro<select name="filter"><option value="month">Mes</option><option value="model">Modelo</option></select></label><label>URL HTTPS de imagen<input name="image" type="url"></label><label>O subir imagen<input type="file" id="builderCardUpload" accept="image/png,image/jpeg,image/webp"></label></form><div class="builder-dialog-buttons"><button id="builderCardRemove" type="button">Eliminar</button><button id="builderCardSave" type="button">Guardar tarjeta</button></div></div></div>'+
 '<div id="builderFilterEditor" class="builder-dialog" hidden><div class="builder-dialog-panel builder-filter-editor-panel"><button type="button" class="builder-close" data-builder-close="builderFilterEditor">×</button><h3>Configurar control avanzado</h3><p>Filtros Looker: calendario, períodos relativos, listas, búsqueda, métricas y condiciones avanzadas.</p><form id="builderFilterEditorForm"><label>Nombre<input name="label" maxlength="80"></label><label>Tipo<select name="type"><option value="relative">Período relativo</option><option value="date">Calendario de fechas</option><option value="select">Desplegable</option><option value="multi">Selección múltiple</option><option value="list">Lista fija</option><option value="search">Buscar texto</option><option value="number">Rango numérico</option><option value="checkbox">Casilla / selector</option><option value="advanced">Condición avanzada</option></select></label><label>Campo<select name="field"><option value="date">Fecha diaria</option><option value="month">Mes</option><option value="model">Modelo</option><option value="territory">Territorio</option><option value="account">Cuenta Meta</option><option value="platform">Plataforma</option><option value="spend">Inversión</option><option value="forms">Formularios</option><option value="messages">Conversaciones</option><option value="impressions">Impresiones</option><option value="reach">Alcance por fila</option><option value="clicks">Clics enlace</option></select></label><label>Alcance del control<select name="scope"><option value="report">Todo el informe</option><option value="page">Solo una página</option><option value="chart">Solo un gráfico</option></select></label><label>Página<select name="pageId"></select></label><label>Gráfico (si aplica)<select name="cardId"></select></label><label>Operador para filtro avanzado<select name="operator"><option value="contains">Contiene</option><option value="equals">Es igual a</option><option value="starts">Empieza por</option><option value="ends">Termina en</option><option value="notcontains">No contiene</option><option value="gt">Mayor que</option><option value="gte">Mayor o igual</option><option value="lt">Menor que</option><option value="lte">Menor o igual</option><option value="between">Entre valores</option><option value="in">Está entre (comas)</option><option value="notin">No está entre (comas)</option><option value="empty">Vacío</option><option value="notempty">No vacío</option><option value="regex">Expresión regular</option></select></label><label>Valor inicial o condición<input name="value" placeholder="Ej. C3 o 250000"></label><label>Fechas relativas<select name="preset"><option value="all">Todo</option><option value="today">Hoy</option><option value="yesterday">Ayer</option><option value="last7">Últimos 7 días</option><option value="last14">Últimos 14 días</option><option value="last28">Últimos 28 días</option><option value="last30">Últimos 30 días</option><option value="last90">Últimos 90 días</option><option value="thisweek">Esta semana</option><option value="lastweek">Semana anterior</option><option value="thismonth">Mes actual</option><option value="lastmonth">Mes anterior</option><option value="thisquarter">Trimestre actual</option><option value="thisyear">Año actual</option><option value="lastyear">Año anterior</option></select></label><div class="builder-filter-pair"><label>Desde<input name="start" type="date"></label><label>Hasta<input name="end" type="date"></label></div><div class="builder-filter-pair"><label>Mínimo<input name="min" type="number"></label><label>Máximo<input name="max" type="number"></label></div><label class="builder-filter-check"><input type="checkbox" name="exclude"> Excluir coincidencias</label><label class="builder-filter-check"><input type="checkbox" name="enabled" checked> Control habilitado</label><label>Cómo combinar con el filtro anterior<select name="logic"><option value="AND">Y (AND)</option><option value="OR">O (OR)</option></select></label></form><div class="builder-dialog-buttons"><button type="button" data-builder-close="builderFilterEditor">Cancelar</button><button type="button" id="builderFilterEditSave">Guardar filtro</button></div></div></div>'+ 
 '<div id="builderFilterListDialog" class="builder-dialog" hidden><div class="builder-dialog-panel"><button type="button" data-builder-close="builderFilterListDialog" class="builder-close">×</button><h3>Filtros configurados</h3><div id="builderDefinedFilters"></div></div></div>'+ 
 '<div id="builderCreativeDialog" class="builder-dialog" hidden><div class="builder-dialog-panel"><button type="button" class="builder-close" data-builder-close="builderCreativeDialog">×</button><h3>Biblioteca de creativos</h3><label>Título de pieza<input id="builderCreativeTitle" maxlength="110"></label><label>Campaña<input id="builderCreativeCampaign" maxlength="150"></label><label>Formato<select id="builderCreativeFormat"><option>Imagen</option><option>Vídeo</option><option>Carrusel</option><option>Otro</option></select></label><label>Imagen por URL HTTPS<input id="builderCreativeUrl" type="url" placeholder="https://..."></label><label>O subir imagen JPG/PNG/WebP<input type="file" id="builderCreativeUpload" accept="image/png,image/jpeg,image/webp"></label><label>Notas, aprendizaje o recomendación<textarea id="builderCreativeNotes" rows="5"></textarea></label><div class="builder-dialog-buttons"><button type="button" id="builderCreativeDelete">Eliminar</button><button type="button" id="builderCreativeSave">Guardar creativo</button></div></div></div>'+ 
  '<div id="builderInsightDialog" class="builder-dialog" hidden><div class="builder-dialog-panel"><button type="button" class="builder-close" data-builder-close="builderInsightDialog">×</button><h3>Escribir insight</h3><label>Título<input id="builderInsightTitle"></label><label>Hallazgo y recomendación<textarea rows="12" id="builderInsightBody"></textarea></label><div class="builder-dialog-buttons"><button type="button" id="builderInsightDelete">Eliminar</button><button type="button" id="builderInsightSave">Guardar insight</button></div></div></div>');
 document.querySelectorAll('[data-builder-close]').forEach(b=>b.onclick=()=>$(b.dataset.builderClose).hidden=true);
}
let booted=false;
function wire(){
 if(booted)return;booted=true;
 initSections();setupEditorModals();
 document.addEventListener('citroen:studio-layout',render);
 document.addEventListener('citroen:advanced-filter-changed',()=>{window.CITROEN_FILTER_ENGINE?.render('lkGlobalFilters','resumen');render();});
 document.addEventListener('hashchange',()=>{const id=locationHash();if($(id)&&id!==current)navTo(id);});
 loadPublished();loadMeta();
}
document.addEventListener('DOMContentLoaded',wire);
window.CITROEN_BUILDER={render,loadPublished,publish};
})();