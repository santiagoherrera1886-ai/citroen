/* Manual refresh of the existing Citroën Sheets ingestion snapshot.
   Read-only: never pretends to run Google Apps Script or to overwrite the source. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const formatDate=iso=>{if(!iso)return '';const d=new Date(iso);return Number.isNaN(d.getTime())?'':d.toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'medium',timeStyle:'short'})};
function initialize(){
 const button=$('citroenManualRefresh'),message=$('citroenRefreshResult');
 if(!button||!message)return;
 let busy=false;
 const show=(text,type='info')=>{message.textContent=text;message.dataset.type=type;message.hidden=false};
 button.addEventListener('click',async()=>{
  if(busy)return;
  busy=true;button.disabled=true;button.setAttribute('aria-busy','true');
  const old=button.querySelector('.sync-label');if(old)old.textContent='Consultando…';
  show('Consultando la última versión recibida desde Google Sheets…');
  try{
   const feed=window.CITROEN_CAMPAIGN_FEED;
   if(!feed)throw Error('El módulo de conexión todavía no está disponible. Recarga el dashboard.');
   const before=feed.status();
   const after=await feed.refresh();
   if(after.error)throw Error(after.error);
   if(!after.connected){
    show('La conexión automática de «DATA CITROEN AÑO» todavía no ha confirmado un envío. Entra a Diseño → Añadir datos para activar CitroenSync; el botón no ejecuta el script de Google.','warning');
   }else if(after.revision!==before.revision){
    show('¡Datos nuevos recibidos! Versión '+String(after.revision||'actualizada')+'. Último envío: '+formatDate(after.syncedAt)+'.','success');
   }else{
    show('Datos comprobados. Ya estás viendo la última versión recibida. Último envío desde Sheets: '+(formatDate(after.syncedAt)||'sin fecha confirmada')+'. Si acabas de editar la hoja, ejecuta sincronizarCitroen en Apps Script o espera el envío automático.','info');
   }
  }catch(e){
    show('No fue posible actualizar: '+(e&&e.message||'Error de conexión')+'. Se conservan los datos anteriores.','error');
  }finally{
   busy=false;button.disabled=false;button.removeAttribute('aria-busy');
   if(old)old.textContent='Actualizar datos';
  }
 });
 document.addEventListener('citroen:campaign-status',()=>{
   const feed=window.CITROEN_CAMPAIGN_FEED?.status();
   const indicator=$('citroenSourceLastSync');if(!indicator)return;
   indicator.textContent=feed?.connected?(feed?.syncedAt?'Sheets · '+formatDate(feed.syncedAt):'Sheets conectado'):'Sheets · Sin envío confirmado';
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
