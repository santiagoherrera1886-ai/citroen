/* Citroen | Looker-inspired editing workspace. Existing data and editor engines stay authoritative. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const metrics=[['Fecha','date','date'],['Mes','month','date'],['Modelo','model','text'],['Territorio','territory','text'],['Cuenta Meta','account','text'],['Campaña','campaign','text'],['Inversión','spend','metric'],['Formularios','forms','metric'],['Conversaciones','messages','metric'],['Impresiones','impressions','metric'],['Alcance estimado*','reach','metric'],['Clics enlace','clicks','metric'],['CPL','cpl','metric'],['CTR','ctr','metric'],['CPM','cpm','metric']];
const menus={
 archivo:[['Guardar vista','save','✓'],['Publicar informe','publish','↑'],['Exportar diseño','export','⇩'],['Importar diseño','import','⇧'],['Exportar CSV','csv','▤']],
 editar:[['Deshacer estilo','undo','↶'],['Rehacer estilo','redo','↷'],['Duplicar gráfico','duplicate','▣'],['Restaurar resumen','reset','⟳']],
 insertar:[['Añadir gráfico','chartMenu','▥'],['Añadir control','control','☷'],['Texto / insight','insight','T'],['Foto de vehículo','photo','▧']],
 pagina:[['Añadir página','page','＋'],['Ir al Resumen','summary','▤']],
 organizar:[['Mover tarjetas libremente','free','✥'],['Restaurar cuadrícula','grid','⊞']],
 recurso:[['Fuentes de datos','datasource','▣'],['Administrar filtros','managefilters','☷'],['Paleta general','themeMenu','◉']],
 chart:[['Barras','bar','▥'],['Líneas','line','⌁'],['Área','area','◢'],['Tabla','table','▦'],['Comparativo','compare','▥'],['Proyección','plan','⌁']],
 controls:[['Filtro de fecha','datecontrol','▤'],['Desplegable','selectcontrol','☷'],['Selección múltiple','multicontrol','☑'],['Rango numérico','numbercontrol','⇆'],['Búsqueda','searchcontrol','⌕'],['Administrar filtros','managefilters','⚙']],
 theme:[['Montecarlo','palette:montecarlo','●'],['Citroën','palette:citroen','●'],['Esmeralda','palette:emerald','●'],['Lavanda','palette:violet','●'],['Atardecer','palette:sunset','●'],['Nocturno','palette:night','●'],['Estilo del elemento','styletab','☷']]
};
let started=false,editing=false,openName='',anchor=null,selection=null;
function mark(message){if($('leToolbarStatus'))$('leToolbarStatus').textContent=message||'Selecciona una tarjeta para editarla';}
function click(id){$(id)?.click();}
function go(page){const b=document.querySelector('.sidebar .nav-link[data-target="'+page+'"]');if(b){b.click();pages();return true;}return false;}
function act(action){
 if(!editing)return;
 close();
 const simple={
 undo:()=>click('metricStyleUndo'),redo:()=>click('metricStyleRedo'),page:()=>click('builderNewPage'),
 datasource:()=>{go('citroen-sources');mark('Conexiones de datos abiertas');},
 photo:()=>click('studioPhotos'),control:()=>click('builderNewFilter'),managefilters:()=>click('builderManageFilters'),
 insight:()=>{if(go('citroen-insights'))$('citroen-insightsActions')?.querySelector('button')?.click();},
 free:()=>click('studioFreeLayout'),grid:()=>{if($('studioFreeLayout')?.getAttribute('aria-pressed')==='true')click('studioFreeLayout');},
 save:()=>{click('studioSave');mark('Guardado localmente · Publicar comparte páginas e insights');},
 publish:()=>{click('builderPublish');mark('Publicación solicitada · comprueba el estado en el menú');},
 export:()=>click('studioExport'),import:()=>click('studioImport'),csv:()=>click('studioCsv'),reset:()=>click('studioReset'),
 duplicate:()=>{if(selection?.startsWith('c:'))window.CITROEN_STUDIO_ACTIONS?.duplicate?.(selection);else mark('Selecciona un gráfico personalizado para duplicarlo');},
 summary:()=>go('resumen'),
 select:()=>mark('Selecciona una tarjeta del lienzo para editarla'),
 focusdata:()=>{$('leFieldSearch')?.focus();},focusproperties:()=>document.querySelector('[data-inspector-tab="data"]')?.click(),
 styletab:()=>document.querySelector('[data-inspector-tab="style"]')?.click()
 };
 if(simple[action]){simple[action]();return;}
 if(action==='chartMenu'||action==='themeMenu'){show(action==='chartMenu'?'chart':'theme',anchor);return;}
 if(action.startsWith('palette:')){window.CITROEN_STYLE_EDITOR?.applyGlobalPalette(action.slice(8));mark('Paleta actualizada');return;}
 const chartTypes={bar:['meta','bar'],line:['meta','line'],area:['meta','area'],table:['meta','table'],compare:['compare','bar'],plan:['plan','line']};
 if(chartTypes[action]){const [source,chart]=chartTypes[action];document.querySelector('#studioGallery [data-gallery-source="'+source+'"][data-gallery-chart="'+chart+'"]')?.click();mark('Gráfico creado; cambia sus propiedades a la derecha');return;}
 const controlTypes={datecontrol:'relative',selectcontrol:'select',multicontrol:'multi',numbercontrol:'number',searchcontrol:'search'};
 if(controlTypes[action]){click('builderNewFilter');const field=$('builderFilterEditorForm')?.elements?.type;if(field)field.value=controlTypes[action];mark('Configura el campo, período y alcance del filtro');}
}
function show(name,button){
 if(!editing||!menus[name])return;
 if(openName===name&&!$('leDropdown').hidden){close();return;}
 openName=name;anchor=button||document.querySelector('[data-menu="'+name+'"]');
 const el=$('leDropdown'),options=menus[name];
 el.innerHTML='<div class="le-dropdown-title">'+escape(name==='chart'?'VISUALIZACIONES':name==='controls'?'CONTROLES':name==='theme'?'TEMAS':name.toUpperCase())+'</div>'+
 options.map(item=>'<button type="button" data-command="'+escape(item[1])+'"><span>'+escape(item[2])+'</span>'+escape(item[0])+'</button>').join('');
 el.hidden=false;
 const position=(anchor||$('leMenus')).getBoundingClientRect();
 el.style.left=Math.min(Math.max(12,position.left),Math.max(12,innerWidth-270))+'px';
 el.style.top=Math.min(position.bottom+6,135)+'px';
 document.querySelectorAll('[data-menu]').forEach(b=>b.setAttribute('aria-expanded',String(b===anchor)));
}
function close(){openName='';if($('leDropdown'))$('leDropdown').hidden=true;document.querySelectorAll('[data-menu]').forEach(b=>b.setAttribute('aria-expanded','false'));}
function pages(){
 const root=$('lePageList');if(!root)return;
 const nav=[...document.querySelectorAll('.sidebar .nav-link[data-target]')];
 root.replaceChildren();
 const found=new Set();
 for(const item of nav){
  const id=item.dataset.target;
  if(!id||id==='citroen-sources'||found.has(id))continue;
  found.add(id);
  const title=item.textContent.replace(/\s+/g,' ').trim();
  const b=document.createElement('button');
  b.type='button';b.className='le-page-item'+(item.classList.contains('active')?' active':'');
  b.dataset.page=id;
  const icon=document.createElement('span');icon.textContent=id==='resumen'?'▤':'▦';
  const caption=document.createElement('span');caption.textContent=title;
  b.append(icon,caption);
  b.onclick=()=>{go(id);mark('Página: '+title);};
  root.append(b);
 }
}
function fields(){
 const query=($('leFieldSearch')?.value||'').toLocaleLowerCase('es-CO');
 const root=$('leFieldsList');if(!root)return;
 const matches=metrics.filter(row=>(row[0]+' '+row[1]).toLocaleLowerCase('es-CO').includes(query));
 root.innerHTML=['date','text','metric'].map(type=>{
  const subset=matches.filter(r=>r[2]===type);
  if(!subset.length)return '';
  return '<div class="le-field-group">'+({date:'TIEMPO',text:'DIMENSIONES',metric:'MÉTRICAS'}[type])+'</div>'+
    subset.map(r=>'<button type="button" data-field-key="'+escape(r[1])+'"><span class="le-kind '+type+'">'+(type==='metric'?'123':type==='text'?'ABC':'▦')+'</span>'+escape(r[0])+'<b>＋</b></button>').join('');
 }).join('')||'<div class="le-empty">No hay campos</div>';
}
function chooseField(key){
 const keys={spend:['spend','investment'],forms:['forms','leads'],clicks:['clicks'],reach:['reach'],cpm:['cpm'],ctr:['ctr'],cpl:['cpl']};
 const target=(keys[key]||[key]).map(k=>document.querySelector('#metricFields [data-field="'+k+'"]')).find(Boolean);
 if(target){target.click();mark('Campo aplicado a la selección');}
 else mark('Selecciona un gráfico compatible con ese campo');
}
function setEdit(value){
 if(editing===value)return;
 editing=value;
 document.body.classList.toggle('citroen-looker-edit',value);
 $('lookerEditorShell').hidden=!value;
 if(value){
  pages();fields();mark('Selecciona una tarjeta para configurar sus datos o estilo');
  const tab=document.querySelector('[data-inspector-tab="data"]');if(tab)tab.textContent='Configuración';
 }else close();
}
function start(){
 if(started)return;started=true;
 const root=document.createElement('div');root.id='lookerEditorShell';root.className='le-shell';root.hidden=true;
 root.innerHTML=[
 '<div class="le-head"><div class="le-brand"><span class="le-logo">⌃</span><div><strong>CITROËN <em>STUDIO</em></strong><small>PERFORMANCE INTELLIGENCE</small></div></div><div class="le-title-area"><div class="le-name">Marketing &amp; movilidad <span>· Informe 2026</span></div>',
 '<div class="le-menus" id="leMenus"><button data-menu="archivo">Archivo</button><button data-menu="editar">Editar</button><button data-menu="insertar">Insertar</button><button data-menu="pagina">Página</button><button data-menu="organizar">Organizar</button><button data-menu="recurso">Recurso</button></div></div>',
 '<div class="le-head-actions"><span class="le-session"><i></i> Diseño privado</span><button type="button" id="leView" class="le-view">◉ &nbsp;Ver informe</button></div></div>',
 '<div class="le-toolbar" role="toolbar" aria-label="Herramientas del editor"><div class="le-tool-set compact"><button type="button" data-do="undo" title="Deshacer">↶</button><button type="button" data-do="redo" title="Rehacer">↷</button></div>',
 '<div class="le-tool-set"><button type="button" data-do="select" class="chosen"><b>↖</b><span>Seleccionar</span></button><button type="button" data-do="page"><b>▤</b><span>Añadir página</span></button><button type="button" data-do="datasource"><b>▣</b><span>Añadir datos</span></button><button type="button" data-menu="chart"><b>▥</b><span>Añadir gráfico ▾</span></button><button type="button" data-menu="controls"><b>☷</b><span>Añadir control ▾</span></button><button type="button" data-do="insight"><b>T</b><span>Texto / insight</span></button><button type="button" data-do="photo"><b>▧</b><span>Imágenes</span></button><button type="button" data-menu="theme"><b>◉</b><span>Tema y diseño ▾</span></button></div>',
 '<div class="le-tool-set le-tools-end"><button type="button" data-do="free"><b>✥</b><span>Mover libre</span></button><button type="button" data-do="save"><b>✓</b><span>Guardar</span></button><button type="button" class="publish" data-do="publish"><b>↑</b><span>Publicar</span></button></div></div>',
 '<div class="le-toolbar-info" id="leToolbarStatus" role="status">Selecciona una tarjeta para editarla</div><div id="leDropdown" class="le-dropdown" hidden></div>',
 '<aside class="le-pages-panel"><div class="le-pages-heading"><span>PÁGINAS</span><button type="button" data-do="page" title="Crear página">＋</button></div><div id="lePageList" class="le-pages"></div><div class="le-pages-foot">▦ Informe Citroën <small>Editor</small></div></aside>',
 '<aside class="le-fields-panel"><div class="le-fields-header"><strong>Datos</strong><span>▤</span></div><div class="le-source"><span>▣</span><div><strong>Meta Ads · 2026</strong><small>Datos reales + planeación</small></div></div>',
 '<label class="le-search"><span>⌕</span><input id="leFieldSearch" type="search" placeholder="Buscar campos..." aria-label="Buscar campos"></label><div id="leFieldsList" class="le-fields-list"></div><div class="le-fields-bottom"><button type="button" data-do="datasource">⊕ Conectar datos</button><button type="button" data-do="control">⊕ Crear filtro</button></div></aside>',
 '<div class="le-rail"><button type="button" data-do="focusproperties" class="active"><b>✎</b><span>Propiedades</span></button><button type="button" data-do="focusdata"><b>▤</b><span>Datos</span></button></div>',
 '<div class="le-canvas-caption"><span>INFORME</span><strong id="leCanvasTitle">Resumen · Colombia</strong><small>100% · Lienzo</small></div>'
 ].join('');
 document.body.prepend(root);
 root.addEventListener('click',e=>{const el=e.target.closest('[data-do],[data-menu]');if(!el)return;if(el.dataset.menu)show(el.dataset.menu,el);else act(el.dataset.do);});
 $('leDropdown').addEventListener('click',e=>{const el=e.target.closest('[data-command]');if(el)act(el.dataset.command);});
 $('leView').onclick=()=>{click('studioEdit');mark('Modo lectura');};
 $('leFieldSearch').oninput=fields;
 $('leFieldsList').onclick=e=>{const el=e.target.closest('[data-field-key]');if(el)chooseField(el.dataset.fieldKey);};
 document.addEventListener('citroen:studio-layout',()=>{setEdit($('c3Dashboard')?.classList.contains('studio-edit-on')===true);if(editing)pages();});
 document.addEventListener('citroen:selection-changed',e=>{selection=e.detail?.key||null;mark(selection?'Editando: '+($('metricCurrent')?.textContent||'gráfico'):'Selecciona un gráfico para editarlo');});
 document.addEventListener('click',e=>{if(editing&&!e.target.closest('#leDropdown,[data-menu]'))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 const navroot=$('sidebar')?.querySelector('.nav');
 if(navroot&&typeof MutationObserver!=='undefined')new MutationObserver(()=>{if(editing)pages();}).observe(navroot,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 setEdit($('c3Dashboard')?.classList.contains('studio-edit-on')===true);
}
document.addEventListener('DOMContentLoaded',start);
})();