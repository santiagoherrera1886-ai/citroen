/* CITROËN Studio · advanced visual designer, local-first and source-preserving. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const KEY="citroen_visual_styles_v1";
const DEFAULT={primary:"#a9d4eb",secondary:"#f46b74",background:"#ffffff",text:"#193a55",border:"#e9f0f5",radius:15,fontScale:1,shadow:"soft",borderWidth:1,opacity:100,showLegend:true,showGrid:true,showLabels:false,fontFamily:"Manrope"};
const PALETTES=[
 {id:"montecarlo",label:"Montecarlo",colors:["#a9d4eb","#f46b74","#ffffff","#193a55","#e9f0f5"]},
 {id:"citroen",label:"Citroën",colors:["#ef4455","#153b58","#ffffff","#153b58","#d4e4ed"]},
 {id:"emerald",label:"Esmeralda",colors:["#0b9e85","#7dcdb7","#f7fffc","#174a45","#beddd5"]},
 {id:"violet",label:"Lavanda",colors:["#8266d5","#d68ec3","#faf8ff","#37275d","#e3d6fb"]},
 {id:"sunset",label:"Atardecer",colors:["#f28d4a","#ee6180","#fff8f2","#593d30","#f3d6bd"]},
 {id:"slate",label:"Grafito",colors:["#47738b","#93b4c4","#f8fafc","#1e3c4f","#d5e1e9"]},
 {id:"night",label:"Nocturno",colors:["#73b7ff","#fc8c9a","#16283b","#f4f8ff","#466077"]}
];
const HEX=x=>typeof x==="string"&&/^#[0-9a-f]{6}$/i.test(x);
const safe=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const valid=(input)=>{
 const s=input&&typeof input==="object"?input:{},o={};
 for(const k of ["primary","secondary","background","text","border"])if(HEX(s[k]))o[k]=s[k].toLowerCase();
 for(const k of ["radius","borderWidth","opacity","fontScale"]){
  const v=Number(s[k]);const domain={radius:[0,32],borderWidth:[0,5],opacity:[30,100],fontScale:[.8,1.5]}[k];
  if(s[k]!==undefined&&Number.isFinite(v)&&v>=domain[0]&&v<=domain[1])o[k]=v;
 }
 if(["none","soft","strong"].includes(s.shadow))o.shadow=s.shadow;
 if(["Manrope","Arial","Georgia","Inter"].includes(s.fontFamily))o.fontFamily=s.fontFamily;
 for(const k of ["showLegend","showGrid","showLabels"])if(typeof s[k]==="boolean")o[k]=s[k];
 return o;
};
function normalize(input){
 const obj=input&&typeof input==="object"?input:{},entries={};
 for(const [k,v] of Object.entries(obj.elements||{})){
  if(/^(n:c3(?:Compare|Funnel|Models|Campaign|Insights)Panel|k:[0-5]|c:[A-Za-z0-9_-]{1,80})$/.test(k))entries[k]=valid(v);
 }
 return {elements:entries};
}
function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||"{}"));}catch{return {elements:{}};}}
let state=load(),active="data",history=[],future=[];
const key=()=>window.CITROEN_METRIC_EDITOR?.selected?.()||null;
function panel(k){
 if(!k)return null;
 if(k.startsWith("k:"))return document.querySelector('#c3Kpis [data-metric-slot="'+k.slice(2)+'"]');
 if(k.startsWith("n:"))return $(k.slice(2));
 return Array.from(document.querySelectorAll('#studioCards .studio-card')).find(el=>el.dataset.id===k.slice(2))||null;
}
function get(k){return {...DEFAULT,...(state.elements[k]||{})};}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function commit(){
 history.push(JSON.stringify(state));if(history.length>50)history.shift();
 future.length=0;
}
function set(k,partial){
 if(!k||!panel(k))return;
 commit();
 state.elements[k]=valid({...get(k),...partial});
 persist();applyAll();refresh();
 // Original and custom SVGs use these style settings without changing source data.
 document.dispatchEvent(new Event("citroen:style-settings"));
}
function replace(other){commit();state=normalize(other);persist();applyAll();refresh();document.dispatchEvent(new Event("citroen:style-settings"));}
function reset(k){
 if(!k)return;
 commit();delete state.elements[k];persist();applyAll();refresh();document.dispatchEvent(new Event("citroen:style-settings"));
}
function applyAll(){
 const keys=["k:0","k:1","k:2","k:3","k:4","k:5","n:c3ComparePanel","n:c3FunnelPanel","n:c3ModelsPanel","n:c3CampaignPanel","n:c3InsightsPanel",...Array.from(document.querySelectorAll('#studioCards .studio-card')).map(el=>"c:"+el.dataset.id)];
 for(const k of keys){
  const el=panel(k);if(!el)continue;
  const stored=state.elements[k];
  el.classList.toggle("studio-visual-customized",!!stored);
  el.classList.remove("studio-no-grid","studio-no-legend","studio-show-values");
  if(!stored){for(const name of ["--studio-primary","--studio-secondary","--studio-bg","--studio-text","--studio-border","--studio-radius","--studio-border-width","--studio-font-scale","--studio-chart-opacity","--studio-shadow","--studio-font-family"])el.style.removeProperty(name);continue;}
  const v=get(k);
  el.style.setProperty("--studio-primary",v.primary);
  el.style.setProperty("--studio-secondary",v.secondary);
  el.style.setProperty("--studio-bg",v.background);
  el.style.setProperty("--studio-text",v.text);
  el.style.setProperty("--studio-border",v.border);
  el.style.setProperty("--studio-radius",v.radius+"px");
  el.style.setProperty("--studio-border-width",v.borderWidth+"px");
  el.style.setProperty("--studio-font-scale",v.fontScale);
  el.style.setProperty("--studio-chart-opacity",v.opacity/100);
  el.style.setProperty("--studio-shadow",v.shadow==="none"?"none":v.shadow==="strong"?"0 14px 34px rgba(18,52,77,.23)":"0 7px 22px rgba(36,83,105,.07)");
  el.style.setProperty("--studio-font-family",v.fontFamily==="Georgia"?"Georgia,serif":v.fontFamily==="Arial"?"Arial,sans-serif":v.fontFamily==="Inter"?"Inter,Arial,sans-serif":"Manrope,Arial,sans-serif");
  el.classList.toggle("studio-no-grid",!v.showGrid);
  el.classList.toggle("studio-no-legend",!v.showLegend);
  el.classList.toggle("studio-show-values",v.showLabels);
 }
}
function tab(name){
 active=["data","style","layout"].includes(name)?name:"data";
 for(const n of ["data","style","layout"]){
  const pane=$({data:"metricDataPane",style:"metricStylePane",layout:"metricLayoutPane"}[n]);
  if(pane)pane.hidden=n!==active;
 }
 document.querySelectorAll("[data-inspector-tab]").forEach(b=>{b.classList.toggle("is-active",b.dataset.inspectorTab===active);b.setAttribute("aria-selected",String(b.dataset.inspectorTab===active));});
 refresh();
}
function refresh(){
 const selected=key();
 if(active==="style"){
  const pane=$("metricStylePane");if(!pane)return;
  const v=get(selected);
  const disabled=!selected||!panel(selected);
  pane.querySelectorAll("[data-style-field]").forEach(el=>{
   if(Object.hasOwn(v,el.dataset.styleField))el.type==="checkbox"?el.checked=!!v[el.dataset.styleField]:el.value=String(v[el.dataset.styleField]);
   el.disabled=disabled;
  });
  $("metricStylePresets").innerHTML=PALETTES.map(p=>'<button type="button" data-palette="'+p.id+'" '+(disabled?"disabled":"")+' title="'+safe(p.label)+'"><span class="metric-palette-dots">'+p.colors.slice(0,4).map(c=>'<i style="background:'+c+'"></i>').join("")+'</span><small>'+safe(p.label)+'</small></button>').join("");
  $("metricStyleReset").disabled=disabled;
  $("metricStyleApplyAll").disabled=disabled;
  $("metricStyleUndo").disabled=history.length===0;
  $("metricStyleRedo").disabled=future.length===0;
  $("metricStyleStatus").textContent=disabled?"Selecciona una tarjeta o gráfico para editarlo.":"Editando "+(selected.startsWith("k:")?"indicador":selected.startsWith("n:")?"gráfico original":"gráfico personalizado")+". Los estilos se guardan automáticamente.";
 }
 if(active==="layout")drawLayout();
}
function updateFromInput(e){
 const target=e.target.closest("[data-style-field]");if(!target)return;
 const prop=target.dataset.styleField,typed=target.type==="checkbox"?target.checked:target.value;
 set(key(),{[prop]:typed});
}
function moveSelected(action){
 const k=key();if(!k)return;
 const el=panel(k);if(!el)return;
 const native=k.startsWith("n:");
 if(action==="hide"&&native)el.querySelector('[data-native-act="hide"]')?.click();
 if(action==="hide"&&!native&&k.startsWith("c:"))el.querySelector('[data-act="remove"]')?.click();
 if(["up","down"].includes(action))el.querySelector(native?'[data-native-act="'+action+'"]':'[data-act="'+action+'"]')?.click();
}
function drawLayout(){
 const pane=$("metricLayoutPane"),k=key();if(!pane)return;
 if(!k||!panel(k)){pane.innerHTML='<p class="metric-empty">Selecciona un panel para editar su tamaño, orden, título y propiedades.</p>';return;}
 const el=panel(k),native=k.startsWith("n:"),kpi=k.startsWith("k:"),custom=k.startsWith("c:");
 const widthSelect=native?el.querySelector("[data-native-size]"):custom?el.querySelector("[data-card-size]"):null;
 const width=widthSelect?.value||"3";
 const title=native?el.querySelector(".c3-panel-heading h3")?.textContent:custom?el.querySelector(".studio-card-title")?.value:el.querySelector("h4")?.textContent;
 const source=custom?el.querySelector('[data-control="source"]')?.value||"plan":"";
 const layout=custom?'<div class="metric-style-section"><strong>Configuración del gráfico</strong>'+
 '<label class="metric-style-row">Origen<select data-layout-field="source"><option value="plan">Plan 2026</option><option value="meta">Meta Ads real</option><option value="compare">Plan vs Meta</option></select></label>'+
 '<label class="metric-style-row">Visualización<select data-layout-field="chart"><option value="bar">Barras</option><option value="line">Líneas</option><option value="area">Área</option><option value="table">Tabla</option></select></label>'+
 '<label class="metric-style-row">Dimensión<select data-layout-field="dimension"><option value="month">Mes</option><option value="model">Modelo</option></select></label>'+
 '<label class="metric-style-row">Orden<select data-layout-field="sort"><option value="original">Original</option><option value="desc">Mayor a menor</option><option value="asc">Menor a mayor</option></select></label>'+
 '<label class="metric-style-row">Límite<select data-layout-field="limit"><option value="0">Todas</option><option value="3">3 categorías</option><option value="5">5 categorías</option><option value="10">10 categorías</option></select></label>'+
 '<label class="metric-style-row">Modelo<select data-layout-field="model">'+(Array.from(document.querySelectorAll("#studioModel option")).map(o=>'<option value="'+safe(o.value)+'">'+safe(o.textContent)+'</option>').join(""))+'</select></label></div>':"";
 pane.innerHTML='<div class="metric-style-kicker">ORGANIZAR VISUALIZACIÓN</div>'+
 '<div class="metric-style-intro">'+(kpi?"Las tarjetas de indicadores no cambian de posición, pero puedes editar su aspecto desde Estilo.":"Organiza el panel conservando las cifras originales.")+'</div>'+
 (!kpi?'<div class="metric-style-section"><strong>Tamaño y posición</strong>'+
 '<label class="metric-style-row">Anchura<select data-layout-field="width"><option value="2">Compacto · ⅓</option><option value="3">Mitad · ½</option><option value="4">Amplio · ⅔</option><option value="6">Completo</option></select></label>'+
 '<div class="metric-style-actions"><button data-layout-action="up" type="button">← Mover antes</button><button data-layout-action="down" type="button">Mover después →</button></div></div>':"")+
 (custom||native?'<div class="metric-style-section"><strong>Título</strong><label class="metric-layout-title-label">Texto del encabezado<input type="text" maxlength="90" data-layout-field="title" placeholder="Nombre del gráfico" value="'+safe(title||"")+'"></label></div>':"")+
 layout+
 (custom?'<div class="metric-style-section"><strong>Acciones</strong><div class="metric-style-actions"><button type="button" data-layout-action="duplicate">Duplicar gráfico</button><button type="button" data-layout-action="hide">Eliminar gráfico</button></div></div>':native?'<div class="metric-style-section"><strong>Visibilidad</strong><button type="button" class="metric-style-fullbutton" data-layout-action="hide">Ocultar este panel</button><p class="metric-style-note">Puedes recuperarlo con Restaurar resumen.</p></div>':"");
 pane.querySelectorAll("[data-layout-field]").forEach(c=>{
  const kf=c.dataset.layoutField;
  let v="";
  if(kf==="width")v=width;
  else if(kf==="title")v=title||"";
  else v=el.querySelector('[data-control="'+kf+'"]')?.value||({sort:"original",limit:"0",model:"",source,chart:"bar",dimension:"month"}[kf]||"");
  c.value=String(v);
 });
}
function updateLayout(e){
 const el=e.target.closest("[data-layout-field]");if(!el)return;
 const k=key(),p=panel(k);if(!p)return;
 const field=el.dataset.layoutField,value=el.value;
 if(field==="width"){
  const target=p.querySelector(k.startsWith("n:")?"[data-native-size]":"[data-card-size]");
  if(target){target.value=value;target.dispatchEvent(new Event("change",{bubbles:true}));}
 }else if(field==="title"){
  const t=p.querySelector(k.startsWith("n:")?".c3-panel-heading h3":".studio-card-title");
  if(t){if(k.startsWith("n:")){t.textContent=value;t.dispatchEvent(new Event("blur"));}else{t.value=value;t.dispatchEvent(new Event("change"));}}
 }else if(k.startsWith("c:")){
  window.CITROEN_STUDIO_ACTIONS?.updateCustom?.(k,{[field]:value});
 }
}
function resetAllStyles(){commit();state={elements:{}};persist();applyAll();refresh();document.dispatchEvent(new Event("citroen:style-settings"));}
function wire(){
 const inspector=$("metricInspector");if(!inspector)return;
 document.querySelectorAll("[data-inspector-tab]").forEach(b=>b.onclick=()=>tab(b.dataset.inspectorTab));
 $("metricStylePane").addEventListener("change",updateFromInput);
 $("metricStylePane").addEventListener("input",e=>{if(e.target.type==="color")updateFromInput(e);});
 $("metricStylePresets").addEventListener("click",e=>{const b=e.target.closest("[data-palette]");if(!b)return;const p=PALETTES.find(x=>x.id===b.dataset.palette);if(p)set(key(),Object.fromEntries(["primary","secondary","background","text","border"].map((field,i)=>[field,p.colors[i]])));});
 $("metricStyleReset").onclick=()=>reset(key());
 $("metricStyleApplyAll").onclick=()=>{const sample=get(key());commit();for(const k of ["k:0","k:1","k:2","k:3","k:4","k:5","n:c3ComparePanel","n:c3FunnelPanel","n:c3ModelsPanel","n:c3CampaignPanel","n:c3InsightsPanel",...Array.from(document.querySelectorAll("#studioCards .studio-card")).map(el=>"c:"+el.dataset.id)])state.elements[k]=valid(sample);persist();applyAll();refresh();document.dispatchEvent(new Event("citroen:style-settings"));};
 $("metricStyleUndo").onclick=()=>{if(!history.length)return;future.push(JSON.stringify(state));state=normalize(JSON.parse(history.pop()));persist();applyAll();refresh();document.dispatchEvent(new Event("citroen:style-settings"));};
 $("metricStyleRedo").onclick=()=>{if(!future.length)return;history.push(JSON.stringify(state));state=normalize(JSON.parse(future.pop()));persist();applyAll();refresh();document.dispatchEvent(new Event("citroen:style-settings"));};
 $("metricLayoutPane").onchange=updateLayout;
 $("metricLayoutPane").onclick=e=>{const btn=e.target.closest("[data-layout-action]");if(!btn)return;const k=key();const action=btn.dataset.layoutAction;if(action==="duplicate")window.CITROEN_STUDIO_ACTIONS?.duplicate?.(k);else moveSelected(action);};
 document.addEventListener("citroen:selection-changed",refresh);
 document.addEventListener("citroen:studio-layout",()=>{applyAll();if(active==="layout"||active==="style")refresh();});
 document.addEventListener("citroen:summary-rendered",applyAll);
 applyAll();tab("data");
}
window.CITROEN_STYLE_EDITOR={get,export:()=>JSON.parse(JSON.stringify(state)),replace,resetAll:resetAllStyles,reset,apply:applyAll};
document.addEventListener("DOMContentLoaded",wire);
})();