/* Editor lateral de campos de Citroen. Datos tomados del plan y de Meta Ads; no se generan cifras. */
(function(){
"use strict";
const STORAGE="citroen_metric_preferences_v1";
const defaults={slots:{},native:{}};
const definitions=[
 {id:"planned",label:"Inversión planeada",subtitle:"Plan de medios 2026",group:"Proyecciones",source:"plan"},
 {id:"spend",label:"Inversión",subtitle:"Gasto ejecutado Meta Ads",group:"Meta Ads"},
 {id:"forms",label:"Formularios",subtitle:"Leads on-Facebook",group:"Meta Ads"},
 {id:"messages",label:"Conversaciones",subtitle:"Conversaciones iniciadas",group:"Meta Ads"},
 {id:"impressions",label:"Impresiones",subtitle:"Veces que se mostraron anuncios",group:"Meta Ads"},
 {id:"reach",label:"Alcance sumado*",subtitle:"Registros de alcance, no usuarios únicos",group:"Meta Ads"},
 {id:"clicks",label:"Clics en enlace",subtitle:"Clics a enlaces",group:"Meta Ads"},
 {id:"all_clicks",label:"Clics totales",subtitle:"Todos los tipos de clic",group:"Meta Ads"},
 {id:"ctr",label:"CTR de enlace",subtitle:"Clics enlace ÷ impresiones",group:"Indicadores calculados"},
 {id:"cpm",label:"CPM",subtitle:"Inversión ÷ impresiones × 1.000",group:"Indicadores calculados"},
 {id:"cpl",label:"Costo / formulario",subtitle:"Inversión ÷ formularios",group:"Indicadores calculados"},
 {id:"cost_message",label:"Costo / conversación",subtitle:"Inversión ÷ conversaciones",group:"Indicadores calculados"}
];
const byId=Object.fromEntries(definitions.map(d=>[d.id,d]));
const defaultsSlots=["planned","spend","forms","messages","cpl","impressions"];
const nativeMap={
 c3ComparePanel:{title:"Planeado vs. ejecutado",field:"compareMetric",defaultValue:"investment",allowed:["investment","leads","cpl","impressions","reach","clicks","all_clicks","messages","ctr","cpm","cost_message"]},
 c3FunnelPanel:{title:"Funnel de conversión",field:"funnelMetric",defaultValue:"impressions",allowed:["impressions","reach"]},
 c3ModelsPanel:{title:"Desempeño por modelo",field:"modelsMetric",defaultValue:"forms",allowed:["spend","forms","messages","impressions","reach","clicks","all_clicks","ctr","cpm","cpl","cost_message"]},
 c3CampaignPanel:{title:"Campañas principales",field:"campaignsMetric",defaultValue:"spend",allowed:["spend","forms","messages","impressions","reach","clicks","all_clicks","ctr","cpm","cpl","cost_message"]},
 c3InsightsPanel:{title:"Hallazgos clave",field:null,allowed:[]}
};
const alias={investment:"Inversión",leads:"Leads de formulario",cpl:"CPL proyectado / gasto por formulario"};
const html=s=>String(s==null?"":s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const $=id=>document.getElementById(id);
function normalized(input){
 const data=input&&typeof input==="object"?input:{};
 const slots={};for(const [key,v] of Object.entries(data.slots||{}))if(/^[0-5]$/.test(key)&&byId[v])slots[key]=v;
 const native={};for(const [key,v] of Object.entries(data.native||{})){
  const target=Object.values(nativeMap).find(x=>x.field===key);
  if(target&&target.allowed.includes(v))native[key]=v;
 }
 return {slots,native};
}
function stored(){try{return normalized(JSON.parse(localStorage.getItem(STORAGE)||"null"));}catch{return normalized(defaults);}}
let preferences=stored(),selected=null,search="";
window.CITROEN_METRIC_OVERRIDES=preferences;
function persist(){
 window.CITROEN_METRIC_OVERRIDES=preferences;
 try{localStorage.setItem(STORAGE,JSON.stringify(preferences));}catch{}
}
function sync(){persist();document.dispatchEvent(new Event("citroen:metric-settings"));updateUI();}
window.CITROEN_METRIC_EDITOR={
 export:()=>JSON.parse(JSON.stringify(preferences)),
 replace:data=>{preferences=normalized(data);sync();},
 reset:()=>{preferences=normalized(defaults);sync();}
};
function panelInfo(){
 if(!selected)return null;
 if(selected.startsWith("k:")){
  const index=Number(selected.slice(2));
  return {title:"Indicador "+(index+1),label:"Tarjeta del resumen",allowed:definitions.map(d=>d.id),metric:preferences.slots[index]||defaultsSlots[index],type:"kpi"};
 }
 if(selected.startsWith("n:")){
  const name=selected.slice(2),info=nativeMap[name];
  if(!info)return null;
  return {title:info.title,label:name==="c3InsightsPanel"?"Resumen inteligente":"Visualización original",allowed:info.allowed,metric:info.field?preferences.native[info.field]||info.defaultValue:null,type:"native",name};
 }
 if(selected.startsWith("c:")){
  const card=Array.from(document.querySelectorAll('#studioCards .studio-card')).find(el=>el.dataset.id===selected.slice(2));
  if(!card)return null;
  const source=card.querySelector('[data-control="source"]')?.value||card.querySelector(".studio-card-label")?.textContent?.includes("META")&&"meta"||"plan";
  const metric=card.querySelector('[data-control="metric"]')?.value||"investment";
  const allowed=source==="meta"?["investment","leads","cpl","impressions","reach","clicks","all_clicks","messages","ctr","cpm","cost_message"]:["investment","leads","cpl"];
  return {title:card.querySelector(".studio-card-title")?.value||"Gráfico personalizado",label:source==="meta"?"Meta Ads real":source==="compare"?"Plan vs. Meta Ads":"Plan 2026",allowed,metric,type:"custom",element:card,source};
 }
 return null;
}
function formatField(k){
 if(k==="investment"||k==="leads")return {id:k,label:alias[k],subtitle:k==="investment"?"Plan total frente a inversión Meta":"Metas comerciales frente a formularios",group:"Comparativos"};
 return byId[k]||{id:k,label:alias[k]||k,subtitle:"Indicador",group:"Indicadores"};
}
function updateUI(){
 const host=$("metricInspector"),dash=$("c3Dashboard");
 if(!host||!dash)return;
 const editing=dash.classList.contains("studio-edit-on");
 host.hidden=!editing;
 if(!editing){document.querySelectorAll(".metric-selected").forEach(el=>el.classList.remove("metric-selected"));return;}
 const info=panelInfo();
 $("metricCurrent").textContent=info?info.title:"Selecciona un indicador";
 $("metricCurrentSub").textContent=info?info.label:"Haz clic en una tarjeta o gráfico del Resumen";
 $("metricFieldInput").value=search;
 const holder=$("metricFields");
 if(!info){holder.innerHTML='<div class="metric-empty">Haz clic en un gráfico o en una tarjeta superior para cambiar su métrica.</div>';}
 else if(!info.allowed.length){holder.innerHTML='<div class="metric-empty">Este panel presenta hallazgos automáticos. Selecciona otra tarjeta para cambiar indicadores.</div>';}
 else{
  let previous="";
  const entries=info.allowed.map(formatField).filter(d=>(d.label+" "+d.subtitle+" "+d.group).toLowerCase().includes(search.toLowerCase()));
  holder.innerHTML=entries.map(d=>{
   const head=d.group!==previous?'<div class="metric-group">'+html(d.group)+'</div>':"";
   previous=d.group;
   return head+'<button class="metric-field'+(info.metric===d.id?" is-active":"")+'" type="button" data-field="'+html(d.id)+'" aria-pressed="'+String(info.metric===d.id)+'"><span class="metric-field-icon">'+(d.id==="reach"?"◎":d.group==="Proyecciones"?"▥":"▤")+'</span><span class="metric-field-copy"><strong>'+html(d.label)+'</strong><small>'+html(d.subtitle)+'</small></span><span class="metric-field-check">'+(info.metric===d.id?"✓":"＋")+'</span></button>';
  }).join("")||'<div class="metric-empty">No hay métricas que coincidan con la búsqueda.</div>';
 }
 $("metricNote").hidden=!info||info.metric!=="reach";
 $("metricHint").textContent=info?.type==="kpi"?"Selecciona otra métrica y el indicador superior se actualizará automáticamente.":info?.type==="custom"?"Los gráficos nuevos admiten métricas de Meta Ads y del plan según la fuente elegida.":"Los cambios actualizan este gráfico y se guardan en este navegador.";
 document.querySelectorAll(".metric-selected").forEach(el=>el.classList.remove("metric-selected"));
 if(!selected)return;
 if(selected.startsWith("k:")){
  const k=$('c3Kpis').querySelector('[data-metric-slot="'+selected.slice(2)+'"]');
  if(k)k.classList.add("metric-selected");
 }else{
  const el=selected.startsWith("n:")?$(selected.slice(2)):document.querySelector('#studioCards .studio-card[data-id="'+selected.slice(2)+'"]');
  if(el)el.classList.add("metric-selected");
 }
}
function choose(k){
 selected=k;search="";updateUI();
}
function updateMetric(key){
 const info=panelInfo();
 if(!info||!info.allowed.includes(key))return;
 if(info.type==="kpi")preferences.slots[selected.slice(2)]=key;
 else if(info.type==="native"){
  const config=nativeMap[info.name];if(!config.field)return;
  preferences.native[config.field]=key;
 }else if(info.type==="custom"){
  const field=info.element.querySelector('[data-control="metric"]');
  if(!field)return;
  field.value=key;
  if(field.value!==key)return;
  field.dispatchEvent(new Event("change",{bubbles:true}));
  persist();updateUI();return;
 }
 sync();
}
function wire(){
 const inspector=$("metricInspector");
 if(!inspector)return;
 $("metricInspectorClose").onclick=()=>{selected=null;updateUI();};
 $("metricFieldInput").oninput=e=>{search=e.target.value;updateUI();$("metricFieldInput").focus();};
 $("metricFields").onclick=e=>{const button=e.target.closest("[data-field]");if(button)updateMetric(button.dataset.field);};
 $("c3Kpis").addEventListener("click",e=>{if(!$("c3Dashboard").classList.contains("studio-edit-on"))return;const el=e.target.closest("[data-metric-slot]");if(el)choose("k:"+el.dataset.metricSlot);});
 $("c3Kpis").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){const el=e.target.closest("[data-metric-slot]");if(el&&$("c3Dashboard").classList.contains("studio-edit-on")){e.preventDefault();choose("k:"+el.dataset.metricSlot);}}});
 $("studioCards").addEventListener("click",e=>{
  if(!$("c3Dashboard").classList.contains("studio-edit-on"))return;
  if(e.target.closest("button,select,a,input,[contenteditable],.studio-drag"))return;
  const c=e.target.closest(".studio-card,.c3-panel");
  if(!c||!$("studioCards").contains(c))return;
  choose(c.classList.contains("studio-card")?"c:"+c.dataset.id:"n:"+c.id);
 });
 // El botón de métricas incorporado en el comparativo también conserva su configuración.
 document.querySelectorAll("[data-c3-metric]").forEach(btn=>btn.addEventListener("click",()=>{
  preferences.native.compareMetric=btn.dataset.c3Metric;sync();
 }));
 document.addEventListener("citroen:studio-layout",()=>{
  if($("c3Dashboard").classList.contains("studio-edit-on")&&!selected)selected="k:5";
  updateUI();
 });
 document.addEventListener("citroen:studio-created",e=>{if(e.detail&&e.detail.key)choose(e.detail.key);});
 document.addEventListener("citroen:summary-rendered",()=>{if(inspector.hidden)return;const info=panelInfo();if(info)updateUI();});
 updateUI();
}
document.addEventListener("DOMContentLoaded",wire);
})();
