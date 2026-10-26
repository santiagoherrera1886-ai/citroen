/* Citroen 2026 — constructor de informes, editable y local. Sin datos simulados. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const html=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s||'').trim().toUpperCase();
const COP=x=>x==null?"—":new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(x);
const N=x=>x==null?"—":new Intl.NumberFormat("es-CO",{maximumFractionDigits:1}).format(x);
const SHORT=x=>x==null?"—":Math.abs(x)>=1000000?N(x/1000000)+" M":Math.abs(x)>=1000?N(x/1000)+" mil":N(x);
const monthNames=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct"];
const categories={month:"Mes",model:"Modelo"};
const metricLabels={investment:"Inversión",leads:"Leads / formularios",cpl:"Costo por lead / formulario",impressions:"Impresiones"};
const defaults=[
 {id:"a",title:"Inversión planeada vs. Meta",source:"compare",metric:"investment",dimension:"month",chart:"bar",model:""},
 {id:"b",title:"Presupuesto por modelo",source:"plan",metric:"investment",dimension:"model",chart:"bar",model:""},
 {id:"c",title:"Metas de leads proyectadas",source:"plan",metric:"leads",dimension:"month",chart:"line",model:""},
 {id:"d",title:"Formularios reportados por Meta",source:"meta",metric:"leads",dimension:"month",chart:"line",model:""}
];
const state={cards:[],month:"",model:"",edit:true};
const KEY="citroen_workspace_editable_v1";
let plan=null,meta=[],dragged=null,ready=false;
function saved(){try{return JSON.parse(localStorage.getItem(KEY)||"null");}catch{return null;}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({cards:state.cards,month:state.month,model:state.model,edit:state.edit}));}catch{}}
function download(text,name,type){const u=URL.createObjectURL(new Blob([text],{type:type||"application/json;charset=utf-8"}));const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
function alertStatus(msg){const el=$("studioStatus");if(el)el.textContent=msg;}
function opt(arr,current){return arr.map(x=>'<option value="'+html(x[0])+'"'+(x[0]===current?" selected":"")+'>'+html(x[1])+"</option>").join("");}
function nextId(){return "c"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function rowsFor(card){
 const selectedMonths=plan.months.map(x=>x[0]).filter(m=>!state.month||state.month===m);
 const selectedModels=Array.from(new Set(plan.models.map(x=>x[1])));
 const useModel=card.model||state.model;
 const groupVals=card.dimension==="month"?selectedMonths:selectedModels.filter(m=>!useModel||useModel===m);
 return groupVals.map(key=>{
  const p=plan.models.filter(r=>(card.dimension==="month"?plan.months[r[0]][0]===key: norm(r[1])===norm(key))&&(!state.month||plan.months[r[0]][0]===state.month)&&(!useModel||norm(r[1])===norm(useModel)));
  const a=meta.filter(r=>(card.dimension==="month"?r.month===key:norm(r.model)===norm(key))&&(!state.month||r.month===state.month)&&(!useModel||norm(r.model)===norm(useModel)));
  const included=card.metric==="leads"||card.metric==="cpl" ? p.filter(r=>useModel||card.dimension==="model"||r[1]!=="BERLINGO") : p;
  const pi=p.reduce((v,r)=>v+(Number(r[2])||0),0);
  const pl=included.some(r=>r[3]==null)?null:included.reduce((v,r)=>v+(Number(r[3])||0),0);
  const passengerBudget=included.reduce((v,r)=>v+(Number(r[2])||0),0);
  const ai=a.reduce((v,r)=>v+r.spend,0),al=a.reduce((v,r)=>v+r.forms,0),imp=a.reduce((v,r)=>v+r.impressions,0);
  const planned=card.metric==="investment"?pi:card.metric==="leads"?pl:card.metric==="cpl"?(pl>0?passengerBudget/pl:null):null;
  const actual=card.metric==="investment"?ai:card.metric==="leads"?al:card.metric==="cpl"?(al>0?ai/al:null):card.metric==="impressions"?imp:null;
  return {key,label:card.dimension==="month"?monthNames[Number(key.slice(-2))-1]||key:key,planned:p.length?planned:null,actual:a.length?actual:null};
 }).filter(x=>x.planned!=null||x.actual!=null);
}
function modeValues(card,data){return data.map(x=>({label:x.label,one:card.source==="meta"?x.actual:x.planned,two:card.source==="compare"?x.actual:null}));}
function chartSvg(data,card){
 if(!data.length)return '<p class="studio-empty">No existen registros para los filtros elegidos.</p>';
 const s=modeValues(card,data);const max=Math.max(1,...s.map(r=>Math.max(r.one||0,r.two||0)));const W=760,H=245,l=58,r=20,t=30,b=46,pw=W-l-r,ph=H-t-b,step=pw/s.length;
 const sy=v=>t+ph-(Math.max(0,v||0)/max)*ph;
 let grid="";
 for(let i=0;i<=4;i++){const y=t+ph*i/4;grid+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y+'" y2="'+y+'" stroke="#e5edf4"/><text x="'+(l-7)+'" y="'+(y+4)+'" font-size="10" text-anchor="end" fill="#60798b">'+html(SHORT(max*(1-i/4)))+"</text>";}
 let marks="";let path1=[],path2=[];
 s.forEach((v,i)=>{
  const x=l+step*(i+.5),barW=Math.min(24,step*.29);
  if(card.chart==="bar"){
   if(v.one!=null)marks+='<rect x="'+(x-(v.two!=null?barW+2:barW/2))+'" y="'+sy(v.one)+'" width="'+barW+'" height="'+Math.max(0,t+ph-sy(v.one))+'" rx="3" fill="#2f6590"><title>'+html(v.label+" · "+N(v.one))+"</title></rect>";
   if(v.two!=null)marks+='<rect x="'+(x+2)+'" y="'+sy(v.two)+'" width="'+barW+'" height="'+Math.max(0,t+ph-sy(v.two))+'" rx="3" fill="#f07583"><title>'+html(v.label+" · "+N(v.two))+"</title></rect>";
  }else{
   if(v.one!=null)path1.push(x+","+sy(v.one));
   if(v.two!=null)path2.push(x+","+sy(v.two));
   if(v.one!=null)marks+='<circle cx="'+x+'" cy="'+sy(v.one)+'" r="4" fill="#2f6590"/>';
   if(v.two!=null)marks+='<circle cx="'+x+'" cy="'+sy(v.two)+'" r="4" fill="#f07583"/>';
  }
  marks+='<text x="'+x+'" y="'+(H-14)+'" text-anchor="middle" font-size="'+(s.length>10?9:11)+'" fill="#385267">'+html(v.label.length>13?v.label.slice(0,12)+"…":v.label)+"</text>";
 });
 if(card.chart==="line"){
  if(path1.length>1)marks+='<polyline points="'+path1.join(" ")+'" fill="none" stroke="#2f6590" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
  if(path2.length>1)marks+='<polyline points="'+path2.join(" ")+'" fill="none" stroke="#f07583" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
 }
 return '<svg class="studio-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+html(card.title)+'">'+grid+marks+"</svg>";
}
function table(data,card){
 if(!data.length)return '<p class="studio-empty">No hay datos en esta selección.</p>';
 let head="<tr><th>"+html(categories[card.dimension])+"</th><th>"+(card.source==="meta"?"Meta Ads":"Planeado")+"</th>"+(card.source==="compare"?"<th>Meta Ads</th>":"")+"</tr>";
 return '<div class="studio-table-wrap"><table><thead>'+head+"</thead><tbody>"+data.map(r=>"<tr><td>"+html(r.label)+"</td><td>"+(card.source==="meta"?format(r.actual,card.metric):format(r.planned,card.metric))+"</td>"+(card.source==="compare"?"<td>"+format(r.actual,card.metric)+"</td>":"")+"</tr>").join("")+"</tbody></table></div>";
}
function format(v,metric){return metric==="investment"||metric==="cpl"?COP(v):N(v);}
function cardHtml(card,index){
 const data=rowsFor(card);
 const metrics=card.source==="plan"?[["investment","Inversión"],["leads","Metas de leads"],["cpl","CPL proyectado"]]:card.source==="meta"?[["investment","Inversión"],["leads","Formularios"],["cpl","Costo por formulario"],["impressions","Impresiones"]]:[["investment","Inversión"],["leads","Leads*"],["cpl","Costos*"]];
 const current=metrics.some(x=>x[0]===card.metric)?card.metric:"investment";
 const controls=state.edit?'<div class="studio-card-tools">'+
 '<label>Fuente<select data-control="source">'+opt([["plan","Plan 2026"],["meta","Meta Ads real"],["compare","Comparar plan y Meta"]],card.source)+"</select></label>"+
 '<label>Métrica<select data-control="metric">'+opt(metrics,current)+"</select></label>"+
 '<label>Eje<select data-control="dimension">'+opt([["month","Mes"],["model","Modelo"]],card.dimension)+"</select></label>"+
 '<label>Vista<select data-control="chart">'+opt([["bar","Barras"],["line","Líneas"],["table","Tabla"]],card.chart)+"</select></label>"+
 '<button type="button" data-act="up" title="Mover arriba" aria-label="Mover panel a la izquierda">←</button>'+
 '<button type="button" data-act="down" title="Mover abajo" aria-label="Mover panel a la derecha">→</button>'+
 '<button type="button" data-act="remove" class="studio-danger" title="Eliminar gráfico" aria-label="Eliminar gráfico">×</button></div>':"";
 const notes=card.source==="compare"?"El plan incluye varios medios; la ejecución cubre solo Meta. No representa cumplimiento. Las metas de leads y los formularios no son equivalentes.":card.source==="meta"?"Resultados Meta Ads del export cargado, hasta el 20 de octubre. No son resultados multicanal.":"Plan de inversión o metas comerciales, no ejecución. Mayo tiene una diferencia pendiente de conciliación de $992.624.";
 return '<article class="studio-card" data-id="'+html(card.id)+'" role="group" aria-label="'+html(card.title)+'">'+
 '<div class="studio-card-head"><span class="studio-drag" title="Arrastrar tarjeta" draggable="'+state.edit+'">⠿</span><input class="studio-card-title" aria-label="Título de gráfico" value="'+html(card.title)+'" '+(state.edit?"":"readonly")+'><span class="studio-card-label">'+html(card.source==="compare"?"COMPARATIVO":card.source==="plan"?"PROYECCIÓN":"META REAL")+"</span></div>"+
 controls+'<div class="studio-visual">'+(card.chart==="table"?table(data,card):chartSvg(data,card))+'</div>'+
 (card.source==="compare"?'<div class="studio-legend"><span><i class="studio-dot plan"></i> Planeado total</span><span><i class="studio-dot meta"></i> Meta Ads</span></div>':"")+
 '<p class="studio-card-note">'+html(notes)+"</p></article>";
}
function draw(){
 if(!ready)return;
 $("studioCards").innerHTML=state.cards.map(cardHtml).join("");
 $("studioCount").textContent=state.cards.length+" paneles · configuración guardada en este navegador";
 $("studioEdit").textContent=state.edit?"Bloquear diseño":"Editar diseño";
 $("studioEdit").setAttribute("aria-pressed",String(state.edit));
 document.querySelectorAll(".studio-card").forEach(el=>{
  const index=state.cards.findIndex(c=>c.id===el.dataset.id),card=state.cards[index];
  el.querySelector(".studio-card-title").onchange=e=>{card.title=e.target.value.slice(0,90)||"Gráfico sin título";persist();draw();};
  el.querySelectorAll("[data-control]").forEach(sel=>sel.onchange=e=>{
   card[sel.dataset.control]=e.target.value;
   if(sel.dataset.control==="source"&&card.source==="compare"&&card.metric==="impressions")card.metric="investment";
   if(sel.dataset.control==="source"&&card.source==="plan"&&card.metric==="impressions")card.metric="investment";
   persist();draw();
  });
  el.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{
   const a=b.dataset.act;
   if(a==="remove")state.cards.splice(index,1);
   else if(a==="up"&&index>0)[state.cards[index-1],state.cards[index]]=[state.cards[index],state.cards[index-1]];
   else if(a==="down"&&index<state.cards.length-1)[state.cards[index+1],state.cards[index]]=[state.cards[index],state.cards[index+1]];
   persist();draw();
  });
  el.addEventListener("dragstart",e=>{if(!state.edit){e.preventDefault();return;}dragged=el.dataset.id;e.dataTransfer.effectAllowed="move";el.classList.add("studio-moving");});
  el.addEventListener("dragend",()=>{dragged=null;el.classList.remove("studio-moving");});
  el.addEventListener("dragover",e=>{if(dragged){e.preventDefault();e.dataTransfer.dropEffect="move";}});
  el.addEventListener("drop",e=>{e.preventDefault();if(!dragged||dragged===el.dataset.id)return;const a=state.cards.findIndex(c=>c.id===dragged),b=state.cards.findIndex(c=>c.id===el.dataset.id);if(a<0||b<0)return;const [v]=state.cards.splice(a,1);state.cards.splice(b,0,v);persist();draw();});
 });
}
function add(source){
 const id=nextId();state.cards.push({id,title:source==="compare"?"Comparativo personalizado":"Nuevo gráfico",source,metric:"investment",dimension:"month",chart:"bar",model:""});
 state.edit=true;persist();draw();$("studioCards").lastElementChild.scrollIntoView({behavior:"smooth",block:"center"});
}
function exportCsv(){
 let lines=[["Panel","Fuente","Eje","Grupo","Planeado","Meta Ads"].join(";")];
 for(const card of state.cards)for(const r of rowsFor(card))lines.push([card.title,card.source,card.dimension,r.label,r.planned==null?"":r.planned,r.actual==null?"":r.actual].map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(";"));
 download("\uFEFF"+lines.join("\r\n"),"citroen_vista_personalizada_2026.csv","text/csv;charset=utf-8");
}
function wire(){
 $("studioAdd").onclick=()=>add("plan");
 $("studioCompare").onclick=()=>add("compare");
 $("studioEdit").onclick=()=>{state.edit=!state.edit;persist();draw();};
 $("studioSave").onclick=()=>{persist();alertStatus("Vista guardada en este navegador. Para compartir, exporta el diseño JSON.");};
 $("studioExport").onclick=()=>download(JSON.stringify({schema:"citroen-workspace/v1",cards:state.cards,month:state.month,model:state.model},null,2),"citroen_dashboard_diseno.json");
 $("studioCsv").onclick=exportCsv;
 $("studioImport").onchange=async e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  try{const o=JSON.parse(await f.text());if(o.schema!=="citroen-workspace/v1"||!Array.isArray(o.cards)||o.cards.length>40)throw Error("Formato de diseño no válido");
   state.cards=o.cards.filter(c=>["plan","meta","compare"].includes(c.source)&&["bar","line","table"].includes(c.chart)&&["month","model"].includes(c.dimension)&&typeof c.title==="string").map(c=>({id:nextId(),title:c.title.slice(0,90),source:c.source,metric:["investment","leads","cpl","impressions"].includes(c.metric)?c.metric:"investment",dimension:c.dimension,chart:c.chart,model:""}));
   state.month=typeof o.month==="string"?o.month:"";state.model=typeof o.model==="string"?o.model:"";$("studioMonth").value=state.month;$("studioModel").value=state.model;persist();draw();alertStatus("Diseño importado.");}
  catch(err){alertStatus("No se importó: "+err.message);}
  e.target.value="";
 };
 $("studioReset").onclick=()=>{if(!confirm("¿Restablecer la disposición de gráficos de esta vista?"))return;state.cards=defaults.map(c=>({...c}));state.month="";state.model="";$("studioMonth").value="";$("studioModel").value="";persist();draw();};
 for(const [id,field] of [["studioMonth","month"],["studioModel","model"]])$(id).onchange=e=>{state[field]=e.target.value;persist();draw();};
}
async function start(){
 if(!$("studioCards"))return;
 try{
  const encoded=String(window.CITROEN_PLAN_PACKED||"");
  if(!encoded)throw Error("Falta la planeación del repositorio.");
  const binary=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  plan=JSON.parse(await new Response(new Blob([binary]).stream().pipeThrough(new DecompressionStream("gzip"))).text());
  if(window.CITROEN_PATCH_PLAN)await window.CITROEN_PATCH_PLAN(plan);
  try{
   const response=await fetch("./data/meta_2026_daily.json",{cache:"no-store"});
   if(response.ok){const raw=await response.json(),dict=raw.dictionaries;
    meta=raw.daily.map(r=>({month:String(dict.dates[r[0]]).slice(0,7),model:String(dict.models[r[1]]),spend:Number(r[4])||0,forms:Number(r[5])||0,impressions:Number(r[7])||0}));
   }
  }catch(err){console.warn("Studio: ejecución Meta no disponible",err);}
  const store=saved();state.cards=Array.isArray(store?.cards)&&store.cards.length<=40?store.cards:defaults.map(c=>({...c}));
  state.month=store&&typeof store.month==="string"?store.month:"";
  state.model=store&&typeof store.model==="string"?store.model:"";
  state.edit=store?.edit!==false;
  $("studioMonth").innerHTML=opt([["","Enero – Octubre"],...plan.months.map((m,i)=>[m[0],monthNames[i]+" 2026"])],state.month);
  $("studioModel").innerHTML=opt([["","Todos los modelos"],...Array.from(new Set(plan.models.map(x=>x[1]))).sort().map(m=>[m,m])],state.model);
  ready=true;wire();draw();
  alertStatus("Datos: 10 planes 2026 con correcciones de abril/mayo · Meta Ads hasta el 20/10 · mayo pendiente de conciliación.");
 }catch(err){console.error("Studio",err);alertStatus("No fue posible iniciar el constructor: "+err.message);}
}
document.addEventListener("DOMContentLoaded",start);
})();