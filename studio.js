/* Citroen 2026 — constructor de informes, editable y local. Sin datos simulados. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const html=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s||'').trim().toUpperCase();
const COP=x=>x==null?"—":new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(x);
const N=x=>x==null?"—":new Intl.NumberFormat("es-CO",{maximumFractionDigits:1}).format(x);
const SHORT=x=>x==null?"—":Math.abs(x)>=1000000?N(x/1000000)+" M":Math.abs(x)>=1000?N(x/1000)+" mil":N(x);
const monthNames=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const categories={month:"Mes",model:"Modelo"};
const metricLabels={investment:'Inversión',leads:'Formularios',cpl:'Costo por formulario',impressions:'Impresiones',reach:'Alcance estimado*',clicks:'Clics enlace',all_clicks:'Clics totales',messages:'Conversaciones',ctr:'CTR enlace',cpm:'CPM',cost_message:'Costo/conversación'};
const legacyDefaults=[
 {id:"a",title:"Inversión planeada vs. Meta",source:"compare",metric:"investment",dimension:"month",chart:"bar",model:""},
 {id:"b",title:"Presupuesto por modelo",source:"plan",metric:"investment",dimension:"model",chart:"bar",model:""},
 {id:"c",title:"Metas de leads proyectadas",source:"plan",metric:"leads",dimension:"month",chart:"line",model:""},
 {id:"d",title:"Formularios reportados por Meta",source:"meta",metric:"leads",dimension:"month",chart:"line",model:""}
];
const nativeIds=["c3ComparePanel","c3FunnelPanel","c3ModelsPanel","c3CampaignPanel","c3InsightsPanel"];
const nativeDefaultSizes={c3ComparePanel:4,c3FunnelPanel:2,c3ModelsPanel:3,c3CampaignPanel:2,c3InsightsPanel:1};
const defaultOrder=nativeIds.map(id=>"n:"+id);
const state={cards:[],month:"",model:"",edit:false,order:[],sizes:{},hidden:[],titles:{}};
const KEY="citroen_workspace_summary_v2";
let plan=null,meta=[],dragged=null,ready=false,pendingPublishedSummary=null;
function saved(key=KEY){try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({cards:state.cards,month:state.month,model:state.model,edit:state.edit,order:state.order,sizes:state.sizes,hidden:state.hidden,titles:state.titles}));}catch{}}
function download(text,name,type){const u=URL.createObjectURL(new Blob([text],{type:type||"application/json;charset=utf-8"}));const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
function alertStatus(msg){const el=$("studioStatus");if(el)el.textContent=msg;}
function opt(arr,current){return arr.map(x=>'<option value="'+html(x[0])+'"'+(x[0]===current?" selected":"")+'>'+html(x[1])+"</option>").join("");}
let idCounter=0;
function nextId(){return "c"+Date.now().toString(36)+(++idCounter).toString(36);}
function rowsFor(card){
 const selectedMonths=[...new Set([...plan.months.map(x=>x[0]),...meta.map(r=>r.month)])].sort().filter(m=>!state.month||state.month===m);
 const selectedModels=[...new Map([...plan.models.map(x=>x[1]),...meta.map(r=>r.model)].map(m=>[norm(m),m])).values()];
 const useModel=card.model||state.model;
 const groupVals=card.dimension==="month"?selectedMonths:selectedModels.filter(m=>!useModel||useModel===m);
 const rows=groupVals.map(key=>{
  const p=plan.models.filter(r=>(card.dimension==="month"?plan.months[r[0]][0]===key: norm(r[1])===norm(key))&&(!state.month||plan.months[r[0]][0]===state.month)&&(!useModel||norm(r[1])===norm(useModel)));
  const candidate=window.CITROEN_FILTER_ENGINE?.filter(meta,'resumen','c:'+card.id)||meta;
  const a=candidate.filter(r=>(card.dimension==="month"?r.month===key:norm(r.model)===norm(key))&&(!state.month||r.month===state.month)&&(!useModel||norm(r.model)===norm(useModel)));
  const included=card.metric==="leads"||card.metric==="cpl" ? p.filter(r=>useModel||card.dimension==="model"||r[1]!=="BERLINGO") : p;
  const pi=p.reduce((v,r)=>v+(Number(r[2])||0),0);
  const pl=included.some(r=>r[3]==null)?null:included.reduce((v,r)=>v+(Number(r[3])||0),0);
  const passengerBudget=included.reduce((v,r)=>v+(Number(r[2])||0),0);
  const sum=f=>a.reduce((v,r)=>v+(r[f]||0),0),ai=sum('spend'),al=sum('forms'),msg=sum('messages'),imp=sum('impressions'),reach=window.CITROEN_REACH_MATH?.estimate(a.map(r=>r.reach),window.CITROEN_REACH_MATH.currentUniverse())??null,clicks=sum('clicks'),allClicks=sum('all_clicks');
  const planned=card.metric==="investment"?pi:card.metric==="leads"?pl:card.metric==="cpl"?(pl>0?passengerBudget/pl:null):null;
  const actual=card.metric==='investment'?ai:card.metric==='leads'?al:card.metric==='cpl'?(al>0?ai/al:null):card.metric==='impressions'?imp:card.metric==='reach'?reach:card.metric==='clicks'?clicks:card.metric==='all_clicks'?allClicks:card.metric==='messages'?msg:card.metric==='ctr'?(imp>0?100*clicks/imp:null):card.metric==='cpm'?(imp>0?1000*ai/imp:null):card.metric==='cost_message'?(msg>0?ai/msg:null):null;
  return {key,label:card.dimension==="month"?monthNames[Number(key.slice(-2))-1]||key:key,planned:p.length?planned:null,actual:a.length?actual:null};
 }).filter(x=>x.planned!=null||x.actual!=null);
 if(["asc","desc"].includes(card.sort)){
  const dir=card.sort==="asc"?1:-1,key=card.source==="meta"?"actual":"planned";
  rows.sort((a,b)=>((a[key]||0)-(b[key]||0))*dir);
 }
 return Number(card.limit)>0?rows.slice(0,Number(card.limit)):rows;
}
function modeValues(card,data){return data.map(x=>({label:x.label,one:card.source==="meta"?x.actual:x.planned,two:card.source==="compare"?x.actual:null}));}
function chartSvg(data,card){
 if(!data.length)return '<p class="studio-empty">No existen registros para los filtros elegidos.</p>';
 const styling=window.CITROEN_STYLE_EDITOR?.get("c:"+card.id)||{},values=styling.showLabels===true;
 const s=modeValues(card,data),max=Math.max(1,...s.map(r=>Math.max(r.one||0,r.two||0)));
 const W=760,H=245,l=58,r=20,t=30,b=46,pw=W-l-r,ph=H-t-b,step=pw/s.length;
 const sy=v=>t+ph-(Math.max(0,v||0)/max)*ph;
 let grid="",marks="",p1=[],p2=[];
 for(let i=0;i<=4;i++){const y=t+ph*i/4;grid+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y+'" y2="'+y+'" stroke="#e5edf4"/><text x="'+(l-7)+'" y="'+(y+4)+'" font-size="10" text-anchor="end" fill="#60798b">'+html(SHORT(max*(1-i/4)))+"</text>";}
 s.forEach((v,i)=>{
  const x=l+step*(i+.5),w=Math.min(24,step*.29);
  if(card.chart==="bar"){
   if(v.one!=null){
    const bx=x-(v.two!=null?w+2:w/2);
    marks+='<rect x="'+bx+'" y="'+sy(v.one)+'" width="'+w+'" height="'+Math.max(0,t+ph-sy(v.one))+'" rx="3" fill="#2f6590"><title>'+html(v.label+" · "+N(v.one))+"</title></rect>";
    if(values)marks+='<text x="'+(bx+w/2)+'" y="'+Math.max(13,sy(v.one)-5)+'" font-size="10" text-anchor="middle" fill="#2f6590">'+html(SHORT(v.one))+"</text>";
   }
   if(v.two!=null){
    marks+='<rect x="'+(x+2)+'" y="'+sy(v.two)+'" width="'+w+'" height="'+Math.max(0,t+ph-sy(v.two))+'" rx="3" fill="#f07583"><title>'+html(v.label+" · "+N(v.two))+"</title></rect>";
    if(values)marks+='<text x="'+(x+2+w/2)+'" y="'+Math.max(13,sy(v.two)-5)+'" font-size="10" text-anchor="middle" fill="#f07583">'+html(SHORT(v.two))+"</text>";
   }
  }else{
   if(v.one!=null){p1.push([x,sy(v.one)]);marks+='<circle cx="'+x+'" cy="'+sy(v.one)+'" r="4" fill="#2f6590"/>';if(values)marks+='<text x="'+x+'" y="'+Math.max(13,sy(v.one)-10)+'" font-size="10" text-anchor="middle" fill="#2f6590">'+html(SHORT(v.one))+"</text>";}
   if(v.two!=null){p2.push([x,sy(v.two)]);marks+='<circle cx="'+x+'" cy="'+sy(v.two)+'" r="4" fill="#f07583"/>';if(values)marks+='<text x="'+x+'" y="'+Math.max(13,sy(v.two)-10)+'" font-size="10" text-anchor="middle" fill="#f07583">'+html(SHORT(v.two))+"</text>";}
  }
  marks+='<text x="'+x+'" y="'+(H-14)+'" text-anchor="middle" font-size="'+(s.length>10?9:11)+'" fill="#385267">'+html(v.label.length>13?v.label.slice(0,12)+"…":v.label)+"</text>";
 });
 if(card.chart==="line"||card.chart==="area"){
  for(const [points,color] of [[p1,"#2f6590"],[p2,"#f07583"]]){
   if(points.length<2)continue;
   const coords=points.map(([x,y])=>x+","+y).join(" ");
   if(card.chart==="area")marks+='<polygon points="'+points[0][0]+','+(t+ph)+' '+coords+' '+points[points.length-1][0]+','+(t+ph)+'" fill="'+color+'" opacity=".14"/>';
   marks+='<polyline points="'+coords+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
  }
 }
 return '<svg class="studio-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+html(card.title)+'">'+grid+marks+"</svg>";
}
function table(data,card){
 if(!data.length)return '<p class="studio-empty">No hay datos en esta selección.</p>';
 let head="<tr><th>"+html(categories[card.dimension])+"</th><th>"+(card.source==="meta"?"Meta Ads":"Planeado")+"</th>"+(card.source==="compare"?"<th>Meta Ads</th>":"")+"</tr>";
 return '<div class="studio-table-wrap"><table><thead>'+head+"</thead><tbody>"+data.map(r=>"<tr><td>"+html(r.label)+"</td><td>"+(card.source==="meta"?format(r.actual,card.metric):format(r.planned,card.metric))+"</td>"+(card.source==="compare"?"<td>"+format(r.actual,card.metric)+"</td>":"")+"</tr>").join("")+"</tbody></table></div>";
}
function format(v,metric){return v==null?"—":["investment","cpl","cpm","cost_message"].includes(metric)?COP(v):metric==="ctr"?N(v)+" %":N(v);}
function cardHtml(card,index){
 const data=rowsFor(card);
 const metrics=card.source==="plan"?[["investment","Inversión"],["leads","Metas de leads"],["cpl","CPL proyectado"]]:card.source==="meta"?[["investment","Inversión"],["leads","Formularios"],["cpl","Costo por formulario"],...Object.entries(metricLabels).filter(([k])=>!["investment","leads","cpl"].includes(k)).map(([k,v])=>[k,v])]:[["investment","Inversión"],["leads","Leads*"],["cpl","Costos*"]];
 const current=metrics.some(x=>x[0]===card.metric)?card.metric:"investment";
 const controls=state.edit?'<div class="studio-card-tools">'+
 '<label>Fuente<select data-control="source">'+opt([["plan","Plan 2026"],["meta","Meta Ads real"],["compare","Comparar plan y Meta"]],card.source)+"</select></label>"+
 '<label>Métrica<select data-control="metric">'+opt(metrics,current)+"</select></label>"+
 '<label>Eje<select data-control="dimension">'+opt([["month","Mes"],["model","Modelo"]],card.dimension)+"</select></label>"+
 '<label>Vista<select data-control="chart">'+opt([["bar","Barras"],["line","Líneas"],["area","Área"],["table","Tabla"]],card.chart)+"</select></label>"+
 '<button type="button" data-act="up" title="Mover arriba" aria-label="Mover panel a la izquierda">←</button>'+
 '<button type="button" data-act="down" title="Mover abajo" aria-label="Mover panel a la derecha">→</button>'+
 '<label>Tamaño<select data-card-size>'+sizeOptions(state.sizes["c:"+card.id]||3)+'</select></label>'+
 '</div>':"";
 const notes=card.source==="compare"?"El plan incluye varios medios; la ejecución cubre solo Meta. No representa cumplimiento. Las metas de leads y los formularios no son equivalentes.":card.source==="meta"?"Resultados de la fuente Meta Ads; la fecha de corte aparece en el resumen. El alcance usa estimación Sainsbury solo cuando hay universo configurado.":"Plan de inversión o metas comerciales, no ejecución. Mayo tiene una diferencia pendiente de conciliación de $992.624.";
 return '<article class="studio-card" data-id="'+html(card.id)+'" role="group" aria-label="'+html(card.title)+'">'+
 '<div class="studio-card-head"><span class="studio-drag" title="Arrastrar tarjeta" draggable="'+state.edit+'">⠿</span><input class="studio-card-title" aria-label="Título de gráfico" value="'+html(card.title)+'" '+(state.edit?"":"readonly")+'><span class="studio-card-label">'+html(card.source==="compare"?"COMPARATIVO":card.source==="plan"?"PROYECCIÓN":"META REAL")+'</span>'+(state.edit?'<button type="button" class="studio-card-quick-remove" title="Eliminar gráfico creado" aria-label="Eliminar gráfico '+html(card.title)+'">×</button>':"")+'</div>'+
 controls+'<div class="studio-visual">'+(card.chart==="table"?table(data,card):chartSvg(data,card))+'</div>'+
 (card.source==="compare"?'<div class="studio-legend"><span><i class="studio-dot plan"></i> Planeado total</span><span><i class="studio-dot meta"></i> Meta Ads</span></div>':"")+
 '<p class="studio-card-note">'+html(notes)+"</p></article>";
}

function allPanelKeys(){return defaultOrder.concat(state.cards.map(c=>"c:"+c.id));}
function validOrder(){
 const available=new Set(allPanelKeys());
 const seen=new Set();
 state.order=[...state.order,...allPanelKeys()].filter(k=>available.has(k)&&!seen.has(k)&&seen.add(k));
}
function movePanel(key,steps){
 validOrder();
 const a=state.order.indexOf(key),b=Math.max(0,Math.min(state.order.length-1,a+steps));
 if(a<0||a===b)return;
 const item=state.order.splice(a,1)[0];state.order.splice(b,0,item);persist();draw();
}
function sizeLabel(){return [["2","Compacto"],["3","Mitad"],["4","Amplio"],["6","Ancho completo"]];}
function sizeOptions(size){return opt(sizeLabel(),String(size));}
function decorateNative(el){
 const key="n:"+el.id;
 el.dataset.panelKey=key;
 let tools=el.querySelector(".studio-native-tools");
 if(!tools){
   tools=document.createElement("div");
   tools.className="studio-native-tools";
   tools.innerHTML='<span class="studio-drag studio-native-drag" title="Arrastrar panel" draggable="true" role="img" aria-label="Arrastrar">⠿</span>'+
    '<label>Anchura <select aria-label="Anchura del panel" data-native-size>'+sizeOptions(state.sizes[key]||nativeDefaultSizes[el.id]||3)+'</select></label>'+
    '<button type="button" data-native-act="up" aria-label="Mover panel antes" title="Mover antes">←</button>'+
    '<button type="button" data-native-act="down" aria-label="Mover panel después" title="Mover después">→</button>'+
    '<button type="button" data-native-act="hide" aria-label="Ocultar panel" title="Ocultar panel">×</button>';
   el.prepend(tools);
 }
 const select=tools.querySelector("[data-native-size]");
 select.value=String(state.sizes[key]||nativeDefaultSizes[el.id]||3);
 select.onchange=e=>{state.sizes[key]=Number(e.target.value);persist();draw();};
 tools.querySelectorAll("[data-native-act]").forEach(b=>b.onclick=()=>{
   if(b.dataset.nativeAct==="up")movePanel(key,-1);
   else if(b.dataset.nativeAct==="down")movePanel(key,1);
   else {state.hidden=Array.from(new Set([...state.hidden,key]));persist();draw();alertStatus("Panel oculto. Usa 'Restaurar resumen' para recuperar los paneles predeterminados.");}
 });
 const title=Array.from(el.querySelectorAll(".c3-panel-heading h3"))[0];
 if(title){
  if(state.titles[key]&&!title.dataset.studioApplied){title.textContent=state.titles[key];title.dataset.studioApplied="1";}
  title.contentEditable=state.edit?"true":"false";
  title.spellcheck=false;
  title.title=state.edit?"Haz clic para editar el título":"";
  title.onblur=()=>{const next=title.textContent.trim().slice(0,90);if(next){state.titles[key]=next;persist();}};
  title.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();title.blur();}};
 }
}
function bindDrag(el){
 const key=el.dataset.panelKey;
 el.ondragstart=e=>{
  if(!state.edit||!e.target.closest(".studio-drag")){e.preventDefault();return;}
  dragged=key;
  if(e.dataTransfer){e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",key);}
  el.classList.add("studio-moving");
 };
 el.ondragend=()=>{dragged=null;el.classList.remove("studio-moving");};
 el.ondragover=e=>{if(dragged&&dragged!==key){e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect="move";}};
 el.ondrop=e=>{
  if(!state.edit||!dragged||dragged===key)return;
  e.preventDefault();
  validOrder();
  const old=state.order.indexOf(dragged),target=state.order.indexOf(key);
  if(old<0||target<0)return;
  const item=state.order.splice(old,1)[0];
  state.order.splice(target,0,item);
  dragged=null;persist();draw();
 };
}
function removeCreatedGraph(key){
 if(!ready||!state.edit||!window.CITROEN_ACCESS?.canEdit?.()||!/^c:[\w-]+$/.test(key))return false;
 const index=state.cards.findIndex(card=>"c:"+card.id===key);
 if(index<0)return false;
 const record={...state.cards[index]},orderIndex=state.order.indexOf(key);
 const size=state.sizes[key],hidden=state.hidden.includes(key),title=state.titles[key];
 state.cards.splice(index,1);state.order=state.order.filter(v=>v!==key);
 delete state.sizes[key];delete state.titles[key];state.hidden=state.hidden.filter(v=>v!==key);
 persist();draw();
 document.dispatchEvent(new CustomEvent("citroen:studio-removed",{detail:{key}}));
 window.CITROEN_QUICK_DELETE?.offer?.(record.title,()=>{
  if(!ready||!state.edit||!window.CITROEN_ACCESS?.canEdit?.()||state.cards.some(c=>c.id===record.id))return false;
  state.cards.splice(Math.min(index,state.cards.length),0,record);
  state.order.splice(Math.min(Math.max(0,orderIndex),state.order.length),0,key);
  if(size!==undefined)state.sizes[key]=size;
  if(title!==undefined)state.titles[key]=title;
  if(hidden&&!state.hidden.includes(key))state.hidden.push(key);
  persist();draw();
  document.dispatchEvent(new CustomEvent("citroen:studio-created",{detail:{key}}));
  return true;
 });
 return true;
}
function bindCustom(el){
 const key=el.dataset.panelKey,card=state.cards.find(c=>"c:"+c.id===key);
 if(!card)return;
 el.querySelector(".studio-card-title").onchange=e=>{card.title=e.target.value.slice(0,90)||"Gráfico sin título";persist();draw();};
 el.querySelectorAll("[data-control]").forEach(sel=>sel.onchange=e=>{
  card[sel.dataset.control]=e.target.value;
  if(["plan","compare"].includes(card.source)&&!["investment","leads","cpl"].includes(card.metric))card.metric="investment";
  persist();draw();
 });
 el.querySelector(".studio-card-quick-remove")?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();removeCreatedGraph(key);});
 el.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{
  const a=b.dataset.act;
  if(a==="remove")return removeCreatedGraph(key);
  if(a==="up")return movePanel(key,-1);
  if(a==="down")return movePanel(key,1);
 });
 const sz=el.querySelector("[data-card-size]");
 if(sz){sz.value=String(state.sizes[key]||3);sz.onchange=e=>{state.sizes[key]=Number(e.target.value);persist();draw();};}
 bindDrag(el);
}
function draw(){
 if(!ready)return;
 const canvas=$("studioCards");if(!canvas)return;
 validOrder();
 canvas.querySelectorAll(".studio-card").forEach(el=>el.remove());
 canvas.insertAdjacentHTML("beforeend",state.cards.map(cardHtml).join(""));
 nativeIds.forEach(id=>{const el=$(id);if(el){decorateNative(el);bindDrag(el);}});
 canvas.querySelectorAll(".studio-card").forEach(el=>{el.dataset.panelKey="c:"+el.dataset.id;bindCustom(el);});
 const elements=new Map(Array.from(canvas.children).map(el=>[el.dataset.panelKey,el]).filter(([k])=>k));
 state.order.forEach(key=>{const el=elements.get(key);if(!el)return;el.style.gridColumn="span "+(state.sizes[key]||(key.startsWith("n:")?nativeDefaultSizes[key.slice(2)]:3));el.hidden=state.hidden.includes(key);canvas.appendChild(el);});
 $("c3Dashboard").classList.toggle("studio-edit-on",state.edit);
 $("studioTools").hidden=!state.edit;
 $("studioEdit").innerHTML=state.edit?"✓ Terminar edición":"✎ Editar resumen";
 $("studioEdit").setAttribute("aria-pressed",String(state.edit));
 $("studioCount").textContent=(nativeIds.length+state.cards.length-state.hidden.length)+" gráficos visibles · inserta nuevos gráficos desde la barra superior o selecciona uno para editarlo";
 document.dispatchEvent(new Event("citroen:studio-layout"));
}
function add(source,chart="bar"){
 const id=nextId();
 state.cards.push({id,title:source==="compare"?"Comparativo personalizado":source==="plan"?"Proyección personalizada":"Nuevo gráfico de Meta",source,metric:"investment",dimension:"month",chart,model:""});
 state.order.push("c:"+id);
 state.edit=true;persist();draw();
 const card=document.querySelector('#studioCards .studio-card[data-id="'+id+'"]');
 document.dispatchEvent(new CustomEvent("citroen:studio-created",{detail:{key:"c:"+id}}));
 if(card)card.scrollIntoView({behavior:"smooth",block:"center"});
}
function exportedSummary(){
 return {
  cards:JSON.parse(JSON.stringify(state.cards)),
  order:[...state.order],hidden:[...state.hidden],
  sizes:{...state.sizes},titles:{...state.titles},
  metrics:window.CITROEN_METRIC_EDITOR?.export()||null,
  styles:window.CITROEN_STYLE_EDITOR?.export()||null,
  photos:Object.fromEntries(Object.entries(window.CITROEN_PHOTO_EDITOR?.export()||{}).filter(([,url])=>typeof url==='string'&&url.startsWith('https://')))
 };
}
function appliedSummary(summary){
 if(!summary||typeof summary!=='object')return false;
 if(!ready){pendingPublishedSummary=summary;return true;}
 const permitted=new Set(['plan','meta','compare']),types=new Set(['bar','line','area','table']),dims=new Set(['month','model']);
 state.cards=(Array.isArray(summary.cards)?summary.cards:[]).slice(0,40).filter(c=>c&&typeof c.id==='string'&&/^[a-z0-9_-]{3,85}$/i.test(c.id)&&permitted.has(c.source)&&types.has(c.chart)&&dims.has(c.dimension)).map(c=>({
  id:c.id,title:String(c.title||'Gráfico').slice(0,90),source:c.source,
  metric:typeof c.metric==='string'&&Object.keys(metricLabels).includes(c.metric)?c.metric:'investment',
  dimension:c.dimension,chart:c.chart,model:typeof c.model==='string'?c.model.slice(0,80):'',
  sort:['original','asc','desc'].includes(c.sort)?c.sort:'original',
  limit:['0','3','5','10'].includes(String(c.limit))?String(c.limit):'0'
 }));
 const allowed=new Set(defaultOrder.concat(state.cards.map(c=>'c:'+c.id)));
 state.order=Array.isArray(summary.order)?summary.order.filter(x=>allowed.has(x)):defaultOrder;
 state.hidden=Array.isArray(summary.hidden)?summary.hidden.filter(x=>allowed.has(x)):[];
 state.sizes={};
 for(const [k,v] of Object.entries(summary.sizes||{}))if(allowed.has(k)&&[2,3,4,6].includes(Number(v)))state.sizes[k]=Number(v);
 state.titles={};
 for(const [k,v] of Object.entries(summary.titles||{}))if(allowed.has(k)&&typeof v==='string')state.titles[k]=v.slice(0,90);
 if(summary.metrics)window.CITROEN_METRIC_EDITOR?.replace(summary.metrics);
 if(summary.styles)window.CITROEN_STYLE_EDITOR?.replace(summary.styles);
 if(summary.photos)window.CITROEN_PHOTO_EDITOR?.replace(summary.photos);
 state.edit=state.edit&&window.CITROEN_ACCESS?.canEdit()===true;
 persist();draw();return true;
}
window.CITROEN_STUDIO_ACTIONS={
 exportPublished:exportedSummary,
 importPublished:appliedSummary,
 deleteCustom:removeCreatedGraph,
 getCustom(k){const c=state.cards.find(x=>"c:"+x.id===k);return c?{...c}:null;},
 updateCustom(k,changes){
  const c=state.cards.find(x=>"c:"+x.id===k);if(!c||!changes||typeof changes!=="object")return;
  for(const [prop,val] of Object.entries(changes)){
   if(prop==="chart"&&["bar","line","area","table"].includes(val))c.chart=val;
   if(prop==="source"&&["plan","meta","compare"].includes(val))c.source=val;
   if(prop==="dimension"&&["month","model"].includes(val))c.dimension=val;
   if(prop==="sort"&&["original","asc","desc"].includes(val))c.sort=val;
   if(prop==="limit"&&["0","3","5","10"].includes(String(val)))c.limit=String(val);
   if(prop==="model"&&typeof val==="string")c.model=val;
   if(prop==="metric"&&Object.hasOwn(metricLabels,val))c.metric=val;
   if(prop==="title"&&typeof val==="string"&&val.trim())c.title=val.trim().slice(0,90);
  }
  if(c.source!=="meta"&&!["investment","leads","cpl"].includes(c.metric))c.metric="investment";
  persist();draw();
 },
 duplicate(k){
  const c=state.cards.find(x=>"c:"+x.id===k);if(!c)return;
  const id=nextId(),idx=state.order.indexOf(k);
  state.cards.push({...c,id,title:(c.title+" · copia").slice(0,90)});
  state.order.splice(idx+1,0,"c:"+id);state.sizes["c:"+id]=state.sizes[k]||3;
  persist();draw();document.dispatchEvent(new CustomEvent("citroen:studio-created",{detail:{key:"c:"+id}}));
 }
};
function exportCsv(){
 let lines=[["Panel","Fuente","Eje","Grupo","Planeado","Meta Ads"].join(";")];
 for(const card of state.cards)for(const r of rowsFor(card))lines.push([card.title,card.source,card.dimension,r.label,r.planned==null?"":r.planned,r.actual==null?"":r.actual].map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(";"));
 download("\uFEFF"+lines.join("\r\n"),"citroen_vista_personalizada_2026.csv","text/csv;charset=utf-8");
}

function wire(){
 document.addEventListener("citroen:metric-settings",()=>{if(ready)draw();});
 document.addEventListener("citroen:style-settings",()=>{if(ready)draw();});
 document.addEventListener("citroen:advanced-filter-changed",()=>{if(ready)draw();});
 $("studioGallery").onclick=e=>{
  const btn=e.target.closest("[data-gallery-chart]");
  if(!btn)return;
  add(btn.dataset.gallerySource,btn.dataset.galleryChart);
 };
 $("studioThemes").onclick=()=>{$("studioQuickThemes").hidden=!$("studioQuickThemes").hidden;};
 $("studioQuickThemes").onclick=e=>{
  const b=e.target.closest("[data-global-palette]");
  if(b&&window.CITROEN_STYLE_EDITOR)window.CITROEN_STYLE_EDITOR.applyGlobalPalette(b.dataset.globalPalette);
 };
 $("studioResetPalette").onclick=()=>window.CITROEN_STYLE_EDITOR?.resetAll();
 $("studioAdd").onclick=()=>add("plan");
 $("studioCompare").onclick=()=>add("compare");
 window.CITROEN_STUDIO_UNLOCK=()=>{if(!ready||!window.CITROEN_ACCESS?.canEdit())return;state.edit=true;persist();draw();};
 window.CITROEN_STUDIO_LOCK=()=>{state.edit=false;persist();draw();};
 $("studioEdit").onclick=()=>{
  if(state.edit){state.edit=false;persist();draw();return;}
  window.CITROEN_ACCESS?.requestEdit();
 };
 $("studioSave").onclick=()=>{persist();alertStatus("Vista del resumen guardada en este navegador. Puedes exportarla para compartirla.");};
 $("studioExport").onclick=()=>{
  download(JSON.stringify({schema:"citroen-workspace/v2",cards:state.cards,month:state.month,model:state.model,order:state.order,sizes:state.sizes,hidden:state.hidden,titles:state.titles,metrics:window.CITROEN_METRIC_EDITOR?window.CITROEN_METRIC_EDITOR.export():null,styles:window.CITROEN_STYLE_EDITOR?.export()||null,photos:window.CITROEN_PHOTO_EDITOR?.export()||null},null,2),"citroen_resumen_editable.json");
 };
 $("studioCsv").onclick=exportCsv;
 $("studioImport").onchange=async e=>{
  const file=e.target.files&&e.target.files[0];if(!file)return;
  try{
   const o=JSON.parse(await file.text());
   if(!["citroen-workspace/v1","citroen-workspace/v2"].includes(o.schema)||!Array.isArray(o.cards)||o.cards.length>40)throw Error("Formato de diseño no válido");
   const idMap={};
   state.cards=o.cards.filter(c=>["plan","meta","compare"].includes(c.source)&&["bar","line","area","table"].includes(c.chart)&&["month","model"].includes(c.dimension)&&typeof c.title==="string").map(c=>{
    const id=nextId();idMap["c:"+c.id]="c:"+id;
    return {id,title:c.title.slice(0,90),source:c.source,metric:Object.keys(metricLabels).includes(c.metric)?c.metric:"investment",dimension:c.dimension,chart:c.chart,model:""};
   });
   state.order=Array.isArray(o.order)?o.order.map(k=>idMap[k]||k):defaultOrder.concat(state.cards.map(c=>"c:"+c.id));
   state.sizes={};for(const [key,value] of Object.entries(o.sizes||{})){const dest=idMap[key]||key;if([2,3,4,6].includes(Number(value)))state.sizes[dest]=Number(value);}
   state.hidden=Array.isArray(o.hidden)?o.hidden.map(k=>idMap[k]||k).filter(k=>defaultOrder.includes(k)):[];
   state.titles=typeof o.titles==="object"&&o.titles&&!Array.isArray(o.titles)?o.titles:{};
   state.month=typeof o.month==="string"?o.month:"";state.model=typeof o.model==="string"?o.model:"";
   $("studioMonth").value=state.month;$("studioModel").value=state.model;
   state.edit=true;
   if(o.metrics&&window.CITROEN_METRIC_EDITOR)window.CITROEN_METRIC_EDITOR.replace(o.metrics);
   if(o.styles&&window.CITROEN_STYLE_EDITOR){
    const changed={};for(const [k,v] of Object.entries(o.styles.elements||{}))changed[idMap[k]||k]=v;
    window.CITROEN_STYLE_EDITOR.replace({elements:changed});
   }
   if(o.photos&&window.CITROEN_PHOTO_EDITOR)window.CITROEN_PHOTO_EDITOR.replace(o.photos);
   persist();draw();alertStatus("Diseño del resumen importado correctamente.");
  }catch(err){alertStatus("No se pudo importar: "+err.message);}
  e.target.value="";
 };
 $("studioReset").onclick=()=>{
  if(!confirm("¿Restaurar la disposición original del Resumen y quitar gráficos personalizados?"))return;
  state.cards=[];state.order=[...defaultOrder];state.sizes={};state.hidden=[];state.titles={};state.month="";state.model="";if(window.CITROEN_METRIC_EDITOR)window.CITROEN_METRIC_EDITOR.reset();if(window.CITROEN_STYLE_EDITOR)window.CITROEN_STYLE_EDITOR.resetAll();if(window.CITROEN_PHOTO_EDITOR)window.CITROEN_PHOTO_EDITOR.resetAll();
  $("studioMonth").value="";$("studioModel").value="";
  for(const id of nativeIds){const heading=$(id)?.querySelector(".c3-panel-heading h3");if(heading){heading.dataset.studioApplied="";if(id==="c3ComparePanel")heading.textContent="Planeado vs Ejecutado";if(id==="c3FunnelPanel")heading.textContent="Funnel de conversión";if(id==="c3ModelsPanel")heading.textContent="Desempeño por modelo";if(id==="c3CampaignPanel")heading.textContent="Campañas principales";if(id==="c3InsightsPanel")heading.textContent="✳ Hallazgos clave";}}
  persist();draw();alertStatus("Resumen restaurado.");
 };
 for(const [id,field] of [["studioMonth","month"],["studioModel","model"]]){
  $(id).onchange=e=>{
   state[field]=e.target.value;
   const target=$(field==="month"?"c3Month":"c3Model");
   if(target&&Array.from(target.options).some(o=>o.value===e.target.value)){
    target.value=e.target.value;target.dispatchEvent(new Event("change",{bubbles:true}));
   }
   persist();draw();
  };
 }
 for(const [id,field] of [["c3Month","month"],["c3Model","model"]]){
  $(id).addEventListener("change",e=>{state[field]=e.target.value;$(field==="month"?"studioMonth":"studioModel").value=state[field];persist();draw();});
 }
}
function installMeta(raw){
 const dict=raw.dictionaries;
    meta=raw.daily.map(r=>({date:String(dict.dates[r[0]]),month:String(dict.dates[r[0]]).slice(0,7),model:String(dict.models[r[1]]),territory:String(dict.territories[r[2]]),account:String(dict.accounts[r[3]]),platform:'Meta Ads',spend:Number(r[4])||0,forms:Number(r[5])||0,messages:Number(r[6])||0,impressions:Number(r[7])||0,clicks:Number(r[8])||0,all_clicks:Number(r[9])||0,reach:Number(r[10])||0}));
 if(ready){sourceFilters();draw();}
}
document.addEventListener("citroen:campaign-data",e=>{if(e.detail)installMeta(e.detail.daily);});
function sourceFilters(){
 const months=[...new Set([...plan.months.map(m=>m[0]),...meta.map(r=>r.month)])].sort();
 $("studioMonth").innerHTML=opt([["","Todos los meses"],...months.map(m=>[m,monthNames[Number(m.slice(5))-1]+" 2026"])],state.month);
 const models=[...new Map([...meta.map(r=>r.model),...plan.models.map(x=>x[1])].map(m=>[norm(m),m])).values()].sort();
 $("studioModel").innerHTML=opt([["","Todos los modelos"],...models.map(m=>[m,m])],state.model);
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
   const response=window.CITROEN_CAMPAIGN_FEED?{ok:true,json:async()=>(await window.CITROEN_CAMPAIGN_FEED.load()).daily}:await fetch("./data/meta_2026_daily.json",{cache:"no-store"});
   if(response.ok){const raw=await response.json(),dict=raw.dictionaries;
    installMeta(raw);
   }
  }catch(err){console.warn("Studio: ejecución Meta no disponible",err);}
  const store=saved();
  const old=saved("citroen_workspace_editable_v1");
  state.cards=Array.isArray(store?.cards)&&store.cards.length<=40?store.cards:
   Array.isArray(old?.cards)?old.cards.filter(c=>!["a","b","c","d"].includes(c.id)).slice(0,36):[];
  state.order=Array.isArray(store?.order)?store.order:defaultOrder.concat(state.cards.map(c=>"c:"+c.id));
  state.sizes=store?.sizes&&typeof store.sizes==="object"?store.sizes:{};
  state.hidden=Array.isArray(store?.hidden)?store.hidden:[];
  state.titles=store?.titles&&typeof store.titles==="object"?store.titles:{};
  state.month=store&&typeof store.month==="string"?store.month:"";
  state.model=store&&typeof store.model==="string"?store.model:"";
  state.edit=false; // Never trust a prior localStorage edit flag without an authenticated session.
  sourceFilters();
  ready=true;wire();draw();
  if(pendingPublishedSummary){const summary=pendingPublishedSummary;pendingPublishedSummary=null;appliedSummary(summary);}
  alertStatus("Datos: 10 planes 2026 con correcciones de abril/mayo · Meta Ads: fecha de corte indicada en el resumen · mayo pendiente de conciliación.");
 }catch(err){console.error("Studio",err);alertStatus("No fue posible iniciar el constructor: "+err.message);}
}
document.addEventListener("DOMContentLoaded",start);
})();