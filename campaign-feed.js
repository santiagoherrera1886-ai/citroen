/* One shared, atomic campaign snapshot for Summary, Meta, and Studio. */
(function(){
'use strict';
let cached=null,pending=null,state={connected:false},timer=null;
const changed=()=>document.dispatchEvent(new CustomEvent('citroen:campaign-status',{detail:{...state}}));
async function api(action){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{const r=await fetch('/api/campaign-sync?action='+action,{cache:'no-store',signal:controller.signal});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Sincronización no disponible.');return d;}finally{clearTimeout(timeout);}
}

const NOVEMBER_SNAPSHOT='./data/noviembre_2026_ejecutado.json?v=20261111-snapshot1';
let supplemental=false;
function combineDocuments(original,addition){
 const d=original.dictionaries,x=addition.dictionaries;
 const kinds=Object.keys(x),indexByName={};
 for(const k of kinds){
  if(!Array.isArray(d[k]))d[k]=[];
  indexByName[k]=new Map(d[k].map((name,i)=>[name,i]));
 }
 function mapped(key,number){
  const value=x[key][number],map=indexByName[key];
  if(typeof value!=='string')throw Error('Diccionario de noviembre incompleto');
  if(!map.has(value)){map.set(value,d[key].length);d[key].push(value)}
  return map.get(value);
 }
 function append(key,fields){
  if(!Array.isArray(addition[key]))return;
  if(!Array.isArray(original[key]))original[key]=[];
  for(const line of addition[key]){
   if(line.length!==fields.length+7)throw Error('Fila de noviembre incorrecta: '+key);
   original[key].push([...fields.map((field,i)=>mapped(field,line[i])),...line.slice(fields.length)]);
  }
 }
 if(original.daily)append('daily',['dates','models','territories','accounts']);
 if(original.campaigns)append('campaigns',['months','campaigns','accounts','models','territories']);
 if(original.creatives)append('creatives',['months','campaigns','adsets','ads','accounts','models','territories']);
 if(addition.media_version===1&&Array.isArray(addition.creative_media)){
  original.media_version=1;
  if(!Array.isArray(original.creative_media))original.creative_media=[];
  const existing=new Set(original.creative_media.map(x=>JSON.stringify(x.slice(0,4))));
  for(const item of addition.creative_media){
   const row=[...['accounts','campaigns','adsets','ads'].map((field,i)=>mapped(field,item[i])),...item.slice(4)];
   const id=JSON.stringify(row.slice(0,4));
   if(!existing.has(id)){existing.add(id);original.creative_media.push(row)}
  }
 }
 original.totals=original.totals.map((v,i)=>v+addition.totals[i]);
 original.rows_source+=addition.rows_source;
 original.rows_other_years=(original.rows_other_years||0)+(addition.rows_other_years||0);
 original.warning_reach_nonnum=(original.warning_reach_nonnum||0)+(addition.warning_reach_nonnum||0);
 original.date_max=addition.date_max;
 return original;
}
async function includeNovember(result){
 supplemental=false;
 try{
  const response=await fetch(NOVEMBER_SNAPSHOT,{cache:'no-store'});
  if(!response.ok)return result;
  const data=await response.json(),extra=data?.snapshot;
  if(data?.sheet_id!==2001595094||extra?.daily?.schema!=='citroen-meta-actuals/2026-v1'||extra?.detail?.schema!==extra.daily.schema)return result;
  if(extra.daily.rows_source!==1179||extra.daily.rows_source!==extra.detail.rows_source||extra.daily.date_min!=='2026-11-01'||extra.daily.date_max!=='2026-11-11')return result;
  if(result.daily.date_max>=extra.daily.date_min)return result; // Sincronización ya tiene noviembre: no duplicar.
  const before=result.daily.totals.slice(),updated=JSON.parse(JSON.stringify(result));
  combineDocuments(updated.daily,extra.daily);
  combineDocuments(updated.detail,extra.detail);
  if(!updated.daily.totals.every((v,i)=>Math.abs(v-updated.detail.totals[i])<Math.max(.01,v*1e-10)))throw Error('Totales no concilian entre vistas');
  if(!updated.daily.totals.every((v,i)=>Math.abs(v-before[i]-extra.daily.totals[i])<Math.max(.01,v*1e-10)))throw Error('Totales noviembre no concilian');
  supplemental=true;
  return updated;
 }catch(e){console.warn('Corte de noviembre no incorporado:',e);return result;}
}
function applySnapshotStatus(){
 if(supplemental&&cached){
  state={...state,rows:cached.daily.rows_source,dateMax:cached.daily.date_max,novemberSnapshot:true,snapshotCutoff:'2026-11-11'};
 }
}

async function load(force=false){
 if(pending)return pending;if(cached&&!force)return cached;
 pending=(async()=>{
  try{
   const result=await api('data');
   if(result.connected&&(!result.daily||!result.detail))throw Error('Respuesta incompleta.');
   state={...result,checkedAt:new Date().toISOString()};
   if(result.connected){cached=await includeNovember({daily:result.daily,detail:result.detail});applySnapshotStatus();changed();return cached;}
  }catch(e){state={...state,error:'No se pudo consultar la sincronización.',stale:!!cached};if(cached){changed();return cached;}}
  const [daily,detail]=await Promise.all(['daily','detail'].map(async part=>{const r=await fetch('./data/meta_2026_'+part+'.json',{cache:'no-store'});if(!r.ok)throw Error('No se pudo cargar la exportación de respaldo.');return r.json();}));
  cached=await includeNovember({daily,detail});applySnapshotStatus();changed();return cached;
 })();
 try{return await pending;}finally{pending=null;}
}
async function refresh(){
 try{
  const next=await api('status');
  if(next.connected&&next.revision!==state.revision){
   await load(true);
   if(state.revision===next.revision&&!state.error)document.dispatchEvent(new CustomEvent('citroen:campaign-data',{detail:cached}));
  }else{state={...next,checkedAt:new Date().toISOString()};applySnapshotStatus();changed();}
 }catch{state={...state,error:'Sin respuesta del servidor; se conservan los datos cargados.'};changed();}
 return {...state};
}
function badge(){
 let el=document.getElementById('campaignFeedStatus');const context=document.getElementById('c3Context');if(!context)return;
 if(!el){el=document.createElement('p');el.id='campaignFeedStatus';el.className='campaign-feed-status';el.setAttribute('role','status');context.after(el);}
 if(context.nextElementSibling!==el)context.after(el);
 const when=state.syncedAt?new Date(state.syncedAt).toLocaleString('es-CO',{timeZone:'America/Bogota'}):'';
 el.textContent=state.novemberSnapshot?'Google Sheets · Corte noviembre hasta '+state.snapshotCutoff+' (respaldo verificado) · Sincronización automática anterior: '+when+' · Renovar para obtener días posteriores.':state.connected?'Google Sheets · Último dato: '+state.dateMax+' · Sincronizado: '+when+(state.stale?' · Sin recibir una actualización reciente':'')+(state.error?' · '+state.error:''):'Exportación guardada · Datos hasta '+(cached?.daily.date_max||'20/10/2026')+' · Conexión automática pendiente de activar en Añadir datos.'+(state.error?' '+state.error:'');
}
document.addEventListener('citroen:campaign-status',badge);
document.addEventListener('citroen:summary-rendered',badge);
document.addEventListener('citroen:studio-layout',badge);
document.addEventListener('DOMContentLoaded',()=>{badge();timer=setInterval(()=>{if(!document.hidden)void refresh();},60000);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
window.addEventListener('pagehide',()=>clearInterval(timer));
window.CITROEN_CAMPAIGN_FEED={load,refresh,status:()=>({...state})};
})();
