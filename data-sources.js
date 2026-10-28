/* Private source workspace. Persist connection settings only; fetch fresh rows after sign-in. */
(function(){
'use strict';
const $=id=>document.getElementById(id),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canRead=()=>window.CITROEN_ACCESS?.canEdit()===true;
const key=()=> 'citroen_sources_v2:'+ (window.CITROEN_ACCESS?.identity?.()||'editor');
let definitions=[],cache=new Map(),active='',loadedKey='',capabilities=null,requests=new Map(),generation=0;
const uid=()=> 'source-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const changed=()=>document.dispatchEvent(new Event('citroen:sources-changed'));
function persist(){try{localStorage.setItem(key(),JSON.stringify(definitions));}catch{message('No se pudo recordar la conexión en este navegador.','warning');}}
function reset(){generation++;requests.forEach(c=>c.abort());requests.clear();cache.clear();definitions=[];active='';loadedKey='';capabilities=null;}
function restore(){
 if(!canRead())return;
 if(loadedKey===key())return;
 reset();loadedKey=key();
 try{const saved=JSON.parse(localStorage.getItem(key())||'[]');definitions=Array.isArray(saved)?saved.filter(s=>s&&/^source-[\w-]+$/.test(s.id)&&['sheets','bigquery'].includes(s.kind)).slice(0,12):[];}catch{}
 active=definitions[0]?.id||'';
 // Sequential refresh prevents a burst of Google requests when a report has many sources.
 const currentGeneration=generation;
 void (async()=>{for(const def of [...definitions]){if(currentGeneration!==generation||!canRead())break;await connect(def,false);}})();
}
function get(id){if(!canRead())return null;restore();return cache.get(id||active)||null;}
function list(){if(!canRead())return [];restore();return definitions.map(d=>({...d,connected:cache.has(d.id),rows:cache.get(d.id)?.rows?.length||0}));}
function message(text,type='info'){
 const el=$('builderConnectionStatus');if(!el)return;el.textContent=text;el.dataset.state=type;
}
async function request(body,controller){
 const response=await fetch('/api/data-connect',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{}),signal:controller?.signal});
 let data;try{data=await response.json();}catch{throw Error('El servidor no respondió con datos. Actualiza la página y vuelve a intentar.');}
 if(!response.ok||data.ok===false)throw Error(data.error||'No fue posible conectar la fuente.');
 return data;
}
async function checkCapabilities(){
 try{capabilities=await request();const el=$('sourceCapabilities');if(!el)return;
  el.innerHTML=capabilities.googleServiceAccount?'<span class="source-pill success">Conexión privada disponible</span><p>Comparte la hoja como lector con <strong>'+safe(capabilities.serviceEmail||'la cuenta de servicio configurada')+'</strong>.</p>':'<span class="source-pill warning">Otras hojas privadas</span><p>Para estas vistas previas privadas se requiere una cuenta de servicio. La fuente anual DATA CITROEN AÑO se activa arriba sin esa cuenta y conserva privada la hoja.</p>';
 }catch(e){const el=$('sourceCapabilities');if(el)el.textContent=e.message;}
}
async function connect(def,select=true){
 if(!canRead()||requests.has(def.id))return false;
 if(!definitions.some(d=>d.id===def.id)&&definitions.length>=12){message('Máximo 12 fuentes por navegador.','error');return false;}
 const controller=new AbortController(),stamp=generation;requests.set(def.id,controller);
 const timer=setTimeout(()=>controller.abort(),55000);
 if(select)message('Conectando con Google…');updateBusy();
 try{
  const result=await request({kind:def.kind,...def.settings},controller);
  if(stamp!==generation||!canRead())return false;
  if(!Array.isArray(result.columns)||!Array.isArray(result.rows))throw Error('La fuente devolvió un formato inesperado.');
  const saved={...def,name:def.name||result.source||'Google Sheets',settings:{...def.settings}};
  if(result.gid)saved.settings.gid=result.gid;
  const index=definitions.findIndex(d=>d.id===def.id);if(index>=0)definitions[index]=saved;else definitions.push(saved);
  const data={...result,id:def.id,name:saved.name,numberFormat:def.numberFormat||'auto',fetchedAt:result.fetchedAt||new Date().toISOString(),stale:false};
  cache.set(def.id,data);if(select||!active)active=def.id;persist();
  if(select){message(data.rows.length+' filas conectadas · '+data.columns.length+' campos. '+(data.truncated?'Lectura parcial: se alcanzó el límite.':'Fuente lista para usar.'),data.truncated?'warning':'success');}
  changed();renderList();renderPreview();return true;
 }catch(e){
  if(stamp!==generation||!canRead())return false;
  const prior=cache.get(def.id);if(prior)cache.set(def.id,{...prior,stale:true});
  message((e.name==='AbortError'?'La conexión tardó demasiado. Vuelve a intentarlo.':e.message)+(prior?' Se conservan los últimos datos; aún no están actualizados.':''),'error');
  changed();renderList();renderPreview();return false;
 }finally{clearTimeout(timer);if(stamp===generation){requests.delete(def.id);updateBusy();renderList();}}
}
function updateBusy(){
 for(const id of ['builderSheetConnect','builderBqConnect','sourceRefresh'])if($(id))$(id).disabled=requests.size>0;
 if($('builderExternalPreview'))$('builderExternalPreview').setAttribute('aria-busy',String(requests.has(active)));
}
function renderList(){
 const el=$('sourceList');if(!el)return;
 el.innerHTML=definitions.length?definitions.map(d=>'<button type="button" data-source-id="'+safe(d.id)+'" class="source-list-item '+(active===d.id?'active':'')+'"><span class="source-icon">'+(d.kind==='sheets'?'▤':'▦')+'</span><span><strong>'+safe(d.name)+'</strong><small>'+ (requests.has(d.id)?'Actualizando…':cache.get(d.id)?.stale?'Última lectura · sin actualizar':cache.has(d.id)?cache.get(d.id).rows.length+' filas':'Pendiente de conexión')+'</small></span></button>').join(''):'<div class="source-empty"><b>Tu próxima fuente, aquí.</b><p>Conecta una hoja para elegir sus campos y crear gráficos.</p></div>';
 el.querySelectorAll('[data-source-id]').forEach(b=>b.onclick=()=>{active=b.dataset.sourceId;renderList();renderPreview();fillSettings();changed();});
}
function fillSettings(){
 const d=definitions.find(d=>d.id===active);if(!d)return;
 if(d.kind==='sheets')for(const [id,value] of Object.entries({builderSheetUrl:d.settings.url,sourceName:d.name,sourceHeader:d.settings.headerRow||1,sourceMode:d.settings.mode||'auto',sourceNumberFormat:d.numberFormat||'auto'}))if($(id))$(id).value=value;
}
function renderPreview(){
 const root=$('builderExternalPreview');if(!root)return;
 const d=definitions.find(d=>d.id===active),data=get(active);
 if(!d){root.innerHTML='<div class="source-preview-empty"><span>▤</span><h3>De la hoja al informe</h3><p>Conecta, revisa tus campos y añade una tabla o gráfico a cualquier página.</p><div>01 Conectar <i>→</i> 02 Revisar <i>→</i> 03 Visualizar</div></div>';return;}
 if(!data){root.innerHTML='<div class="source-preview-empty"><h3>'+safe(d.name)+'</h3><p>La configuración está guardada. Actualiza la fuente para cargar sus datos.</p><button type="button" id="sourceRefresh">Reintentar conexión</button></div>'; $('sourceRefresh').onclick=()=>connect(d);return;}
 const fields=window.CITROEN_SOURCE_DATA.fields(data),pages=window.CITROEN_BUILDER?.getPages()||[];
 root.innerHTML='<div class="source-preview-heading"><div><span class="source-eyebrow">VISTA PREVIA PRIVADA</span><h3>'+safe(d.name)+'</h3><p>'+data.rows.length+' filas · '+data.columns.length+' campos · Última lectura '+safe(new Date(data.fetchedAt).toLocaleTimeString('es-CO'))+'</p></div><button type="button" id="sourceRefresh">↻ Actualizar</button></div>'+
  (data.stale?'<p class="source-notice">No se pudo actualizar. Estás viendo la última lectura disponible.</p>':'')+
  (data.truncated||data.columnsTruncated?'<p class="source-notice">Lectura parcial: límite de '+(data.rowLimit||5000)+' filas, 50 columnas y 2 MB. Los totales representan solo las filas cargadas.</p>':'')+
  (data.tabs?.length?'<label class="source-tab-picker">Pestaña<select id="sourceTab">'+data.tabs.map(t=>'<option value="'+safe(t.gid)+'" '+(t.gid===data.gid?'selected':'')+'>'+safe(t.title)+'</option>').join('')+'</select></label>':'')+
  '<div class="source-fields">'+fields.map(f=>'<span><b>'+ (f.type==='metric'?'123':'ABC')+'</b>'+safe(f.name)+'</span>').join('')+'</div>'+
  '<div class="builder-preview-scroll source-table"><table class="builder-data-table"><thead><tr>'+data.columns.slice(0,8).map(c=>'<th>'+safe(c)+'</th>').join('')+'</tr></thead><tbody>'+data.rows.slice(0,8).map(r=>'<tr>'+data.columns.slice(0,8).map(c=>'<td>'+safe(r[c])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+
  '<p class="source-fineprint">Vista previa de '+Math.min(8,data.rows.length)+' filas. Los gráficos usan las '+data.rows.length+' filas cargadas. Se recuerda la conexión en este navegador y se vuelve a leer al entrar a Diseño. Las filas privadas no se publican.</p>'+
  '<div class="source-insert"><label>Página destino<select id="sourceDestination">'+pages.map(p=>'<option value="'+safe(p.id)+'">'+safe(p.title)+'</option>').join('')+'<option value="new">＋ Crear página con esta fuente</option></select></label><button type="button" id="sourceInsertTable">Añadir tabla</button><button type="button" id="sourceInsertChart" class="source-primary">Crear gráfico →</button></div>';
 $('sourceRefresh').onclick=()=>connect(d);
 if($('sourceTab'))$('sourceTab').onchange=e=>connect({...d,settings:{...d.settings,gid:e.target.value}});
 const insert=shape=>{const source=get(active);if(!source?.rows.length){message('La fuente no tiene filas para visualizar.','warning');return;}window.CITROEN_BUILDER?.insertSource(source,$('sourceDestination').value,shape);};
 $('sourceInsertTable').onclick=()=>insert('table');$('sourceInsertChart').onclick=()=>insert('bar');updateBusy();
}
function mount(root){
 if(!canRead())return;
 restore();
 // Keep the user's incomplete form when unrelated canvas/filter events fire.
 if(root.querySelector('#sourceWorkspace')){renderList();renderPreview();return;}
 root.innerHTML='<div id="sourceWorkspace"><div class="source-intro"><div><span class="source-eyebrow">DATOS QUE MUEVEN TU INFORME</span><h3>Conecta. Explora. Diseña.</h3><p>Tus hojas, sus campos y tus gráficos en un mismo espacio.</p></div><span class="source-pill">Solo lectura · Diseño privado</span></div><div class="source-workspace-grid"><div class="source-setup"><div class="source-card"><div class="source-card-title"><span class="source-icon sheets">▤</span><div><h3>Google Sheets</h3><p>Enlace normal, publicado o CSV</p></div></div><form id="sourceSheetForm"><label>Enlace de Google Sheets<input id="builderSheetUrl" type="url" required placeholder="https://docs.google.com/spreadsheets/d/..."></label><label>Nombre de la fuente <small>Opcional</small><input id="sourceName" maxlength="90" placeholder="Ej. Resultados Citroën 2026"></label><details class="source-options"><summary>Opciones de lectura</summary><div class="source-settings"><label>Acceso<select id="sourceMode"><option value="auto">Detectar automáticamente</option><option value="public">Enlace público / publicado</option><option value="private">Cuenta de servicio privada</option></select></label><label>Fila de encabezados<input id="sourceHeader" type="number" min="1" max="100" value="1"></label><label>Formato de números<select id="sourceNumberFormat"><option value="auto">Detectar automáticamente</option><option value="es-CO">1.234,56 · Colombia</option><option value="en-US">1,234.56 · Estados Unidos</option></select></label></div></details><button type="submit" id="builderSheetConnect" class="source-primary">Conectar Google Sheets →</button></form><div id="sourceCapabilities" class="source-capabilities">Comprobando acceso disponible…</div></div><div class="source-card"><span class="source-eyebrow">MIS FUENTES</span><div id="sourceList"></div></div><details class="source-card source-bq"><summary>▦ Conectar BigQuery</summary><p>Requiere cuenta de servicio. Lectura de hasta 100 filas.</p><label>Proyecto<input id="builderBqProject" placeholder="mi-proyecto-google"></label><label>Dataset<input id="builderBqDataset" placeholder="marketing"></label><label>Tabla<input id="builderBqTable" placeholder="campanas"></label><button type="button" id="builderBqConnect">Conectar tabla</button></details></div><div class="source-results"><p class="builder-connection-status" id="builderConnectionStatus" role="status" aria-live="polite">Conecta una fuente para comenzar.</p><div id="builderExternalPreview" class="source-card"></div></div></div></div>';
 $('sourceSheetForm').onsubmit=e=>{e.preventDefault();const url=$('builderSheetUrl').value.trim(),headerRow=Number($('sourceHeader').value);const previous=definitions.find(d=>d.kind==='sheets'&&d.settings.url===url&&d.settings.headerRow===headerRow);
  connect({id:previous?.id||uid(),kind:'sheets',name:$('sourceName').value.trim(),numberFormat:$('sourceNumberFormat').value,settings:{url,headerRow,mode:$('sourceMode').value,...(previous?.settings.gid?{gid:previous.settings.gid}:{})}});
 };
 $('builderBqConnect').onclick=()=>{const settings={project:$('builderBqProject').value.trim(),dataset:$('builderBqDataset').value.trim(),table:$('builderBqTable').value.trim()},prior=definitions.find(d=>d.kind==='bigquery'&&JSON.stringify(d.settings)===JSON.stringify(settings));connect({id:prior?.id||uid(),kind:'bigquery',settings,numberFormat:'en-US'});};
 const syncPanel=document.createElement('div');syncPanel.id='campaignSyncPanel';$('sourceWorkspace').querySelector('.source-intro').after(syncPanel);window.CITROEN_CAMPAIGN_CONNECTION?.mount(syncPanel);
 renderList();renderPreview();void checkCapabilities();
}
document.addEventListener('citroen:studio-layout',()=>{if(canRead())restore();else reset();});
document.addEventListener('citroen:auth-changed',()=>{if(!canRead()){reset();changed();}});
window.CITROEN_SOURCES={mount,get,list,refresh:id=>{const def=definitions.find(d=>d.id===id);return def?connect(def):Promise.resolve(false);}};
})();
