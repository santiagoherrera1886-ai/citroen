/* One shared, atomic campaign snapshot for Summary, Meta, and Studio. */
(function(){
'use strict';
let cached=null,pending=null,state={connected:false},timer=null;
const changed=()=>document.dispatchEvent(new CustomEvent('citroen:campaign-status',{detail:{...state}}));
async function api(action){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{const r=await fetch('/api/campaign-sync?action='+action,{cache:'no-store',signal:controller.signal});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Sincronización no disponible.');return d;}finally{clearTimeout(timeout);}
}
async function load(force=false){
 if(pending)return pending;if(cached&&!force)return cached;
 pending=(async()=>{
  try{
   const result=await api('data');
   if(result.connected&&(!result.daily||!result.detail))throw Error('Respuesta incompleta.');
   state={...result,checkedAt:new Date().toISOString()};
   if(result.connected){cached={daily:result.daily,detail:result.detail};changed();return cached;}
  }catch(e){state={...state,error:'No se pudo consultar la sincronización.',stale:!!cached};if(cached){changed();return cached;}}
  const [daily,detail]=await Promise.all(['daily','detail'].map(async part=>{const r=await fetch('./data/meta_2026_'+part+'.json',{cache:'no-store'});if(!r.ok)throw Error('No se pudo cargar la exportación de respaldo.');return r.json();}));
  cached={daily,detail};changed();return cached;
 })();
 try{return await pending;}finally{pending=null;}
}
async function refresh(){
 try{
  const next=await api('status');
  if(next.connected&&next.revision!==state.revision){
   await load(true);
   if(state.revision===next.revision&&!state.error)document.dispatchEvent(new CustomEvent('citroen:campaign-data',{detail:cached}));
  }else{state={...next,checkedAt:new Date().toISOString()};changed();}
 }catch{state={...state,error:'Sin respuesta del servidor; se conservan los datos cargados.'};changed();}
 return {...state};
}
function badge(){
 let el=document.getElementById('campaignFeedStatus');const context=document.getElementById('c3Context');if(!context)return;
 if(!el){el=document.createElement('p');el.id='campaignFeedStatus';el.className='campaign-feed-status';el.setAttribute('role','status');context.after(el);}
 if(context.nextElementSibling!==el)context.after(el);
 const when=state.syncedAt?new Date(state.syncedAt).toLocaleString('es-CO',{timeZone:'America/Bogota'}):'';
 el.textContent=state.connected?'Google Sheets · Último dato: '+state.dateMax+' · Sincronizado: '+when+(state.stale?' · Sin recibir una actualización reciente':'')+(state.error?' · '+state.error:''):'Exportación guardada · Datos hasta '+(cached?.daily.date_max||'20/10/2026')+' · Conexión automática pendiente de activar en Añadir datos.'+(state.error?' '+state.error:'');
}
document.addEventListener('citroen:campaign-status',badge);
document.addEventListener('citroen:summary-rendered',badge);
document.addEventListener('citroen:studio-layout',badge);
document.addEventListener('DOMContentLoaded',()=>{badge();timer=setInterval(()=>{if(!document.hidden)void refresh();},60000);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
window.addEventListener('pagehide',()=>clearInterval(timer));
window.CITROEN_CAMPAIGN_FEED={load,refresh,status:()=>({...state})};
})();
