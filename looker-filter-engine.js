(function(root){
'use strict';
const FIELDS={date:'Fecha',month:'Mes',model:'Modelo',territory:'Territorio',account:'Cuenta',platform:'Plataforma',spend:'Inversión',forms:'Formularios',messages:'Conversaciones',impressions:'Impresiones',reach:'Alcance por fila',clicks:'Clics de enlace'};
const TYPES={date:'Calendario',relative:'Fecha relativa',select:'Desplegable',multi:'Selección múltiple',list:'Lista fija',search:'Buscar',number:'Rango numérico',checkbox:'Casilla',advanced:'Condición avanzada'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const shift=(s,n)=>{if(!date(s))return '';const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function range(p,ref=today()){
 if(!date(ref))return {start:'',end:''};
 const d=new Date(ref+'T00:00:00Z'),y=d.getUTCFullYear(),m=d.getUTCMonth(),start=(y+'-'+String(m+1).padStart(2,'0')+'-01'),wd=(d.getUTCDay()+6)%7;
 const first=(yy,mm)=>new Date(Date.UTC(yy,mm,1)).toISOString().slice(0,10);
 const endPrev=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
 const choices={all:['',''],today:[ref,ref],yesterday:[shift(ref,-1),shift(ref,-1)],last7:[shift(ref,-6),ref],last14:[shift(ref,-13),ref],last28:[shift(ref,-27),ref],last30:[shift(ref,-29),ref],last90:[shift(ref,-89),ref],thisweek:[shift(ref,-wd),ref],lastweek:[shift(ref,-wd-7),shift(ref,-wd-1)],thismonth:[start,ref],lastmonth:[first(y,m-1),endPrev],thisquarter:[first(y,Math.floor(m/3)*3),ref],thisyear:[y+'-01-01',ref],lastyear:[(y-1)+'-01-01',(y-1)+'-12-31']};
 const v=choices[p]||choices.all;return {start:v[0],end:v[1]};
}
const value=(r,k)=>{
 if(r&&Object.prototype.hasOwnProperty.call(r,k))return r[k];
 if(k==='platform')return 'Meta Ads';
 const i={spend:0,forms:1,messages:2,impressions:3,clicks:4,reach:6};
 return Array.isArray(r?.v)&&Object.prototype.hasOwnProperty.call(i,k)?r.v[i[k]]:null;
};
function normalize(d){
 if(!d||typeof d!=='object'||typeof d.id!=='string'||!/^[\w-]{3,85}$/.test(d.id))return null;
 const type=TYPES[d.type]?d.type:'select',field=Object.hasOwn(FIELDS,d.field)?d.field:'model';
 if((type==='date'||type==='relative')&&field!=='date')return null;
 if(type==='number'&&!['spend','forms','messages','impressions','reach','clicks'].includes(field))return null;
 return {id:d.id,type,field,label:String(d.label||FIELDS[field]).slice(0,80),
 scope:['report','page','chart'].includes(d.scope)?d.scope:'page',pageId:String(d.pageId||'resumen').slice(0,100),cardId:String(d.cardId||'').slice(0,100),
 operator:['contains','equals','starts','ends','notcontains','gt','gte','lt','lte','between','in','notin','empty','notempty','regex'].includes(d.operator)?d.operator:'contains',
 preset:['all','today','yesterday','last7','last14','last28','last30','last90','thisweek','lastweek','thismonth','lastmonth','thisquarter','thisyear','lastyear'].includes(d.preset)?d.preset:'all',
 value:String(d.value??'').slice(0,180),values:Array.isArray(d.values)?d.values.slice(0,40).map(x=>String(x).slice(0,120)):[],
 start:date(d.start)?d.start:'',end:date(d.end)?d.end:'',min:Number.isFinite(Number(d.min))&&d.min!==''&&d.min!=null?Number(d.min):null,max:Number.isFinite(Number(d.max))&&d.max!==''&&d.max!=null?Number(d.max):null,
 enabled:d.enabled!==false,exclude:d.exclude===true,logic:d.logic==='OR'?'OR':'AND'};
}
function condition(row,d,setting={},ref=today()){
 const raw=value(row,d.field),text=String(raw??''),q=String(setting.value??d.value),lower=text.toLocaleLowerCase('es-CO'),term=q.toLocaleLowerCase('es-CO');
 let match=true;
 if(d.type==='date'||d.type==='relative'){
  const period=d.type==='relative'?range(setting.preset??d.preset,ref):{start:setting.start??d.start,end:setting.end??d.end};
  match=(!period.start&&!period.end)||(date(String(raw||'').slice(0,10))&&(!period.start||raw>=period.start)&&(!period.end||raw<=period.end));
 }else if(d.type==='number'){
  const n=Number(raw),lo=setting.min??d.min,hi=setting.max??d.max;
  match=raw!=null&&Number.isFinite(n)&&(lo==null||n>=lo)&&(hi==null||n<=hi);
 }else if(d.type==='multi'||d.type==='list'){const selected=setting.values??d.values;match=!selected.length||selected.includes(text);}
 else if(d.type==='checkbox'||d.type==='select')match=!q||text===q;
 else if(d.type==='search')match=!term||lower.includes(term);
 else {
  switch(d.operator){
   case 'equals':match=lower===term;break;case 'starts':match=lower.startsWith(term);break;case 'ends':match=lower.endsWith(term);break;
   case 'notcontains':match=!lower.includes(term);break;case 'gt':match=Number(raw)>Number(q);break;case 'gte':match=Number(raw)>=Number(q);break;case 'lt':match=Number(raw)<Number(q);break;case 'lte':match=Number(raw)<=Number(q);break;
   case 'in':match=term.split(',').map(x=>x.trim()).includes(lower);break;case 'notin':match=!term.split(',').map(x=>x.trim()).includes(lower);break;
   case 'empty':match=raw==null||!text;break;case 'notempty':match=raw!=null&&!!text;break;
   case 'regex':try{match=q.length<=100&&new RegExp(q,'i').test(text.slice(0,300));}catch{match=false;}break;
   case 'between':match=Number(raw)>=Number(setting.min??d.min)&&Number(raw)<=Number(setting.max??d.max);break;
   default:match=lower.includes(term);
  }
 }
 return d.exclude?!match:match;
}
const normalizeAll=a=>Array.isArray(a)?a.slice(0,40).map(normalize).filter(Boolean):[];
function apply(rows,defs,settings={},page='resumen',card='',ref=today()){
 if(!Array.isArray(rows))return [];
 const filters=normalizeAll(defs).filter(d=>d.enabled&&(d.scope==='report'||(d.pageId===page&&(d.scope==='page'||(d.scope==='chart'&&d.cardId===card)))));
 return filters.length?rows.filter(row=>{let yes=null;for(const d of filters){const m=condition(row,d,settings[d.id]||{},ref);yes=yes===null?m:d.logic==='OR'?yes||m:yes&&m;}return yes;}):rows;
}
let definitions=[],settings={},dataset=[],reference=null;
const event=()=>document.dispatchEvent(new Event('citroen:advanced-filter-changed'));
const options=field=>[...new Set(dataset.map(r=>value(r,field)).filter(x=>x!=null&&x!==''))].map(String).sort((a,b)=>a.localeCompare(b,'es',{numeric:true})).slice(0,120);
function controls(page,card=''){return definitions.filter(d=>d.enabled&&(d.scope==='report'||(d.pageId===page&&(d.scope==='page'||(d.scope==='chart'&&d.cardId===card)))));}
function render(host,page='resumen',card=''){
 const el=typeof host==='string'?document.getElementById(host):host;if(!el)return;
 const arr=controls(page,card);
 el.innerHTML=arr.length?'<div class="lk-controls">'+arr.map(d=>{
  const chosen=settings[d.id]||{},s=esc(d.label),id=esc(d.id),p=' data-lk-id="'+id+'" ';
  const values=options(d.field);
  let html='';
  if(d.type==='date')html='<div class="lk-pair"><input type="date" '+p+' data-part="start" value="'+esc(chosen.start??d.start)+'" aria-label="Desde"><input type="date" '+p+' data-part="end" value="'+esc(chosen.end??d.end)+'" aria-label="Hasta"></div>';
  else if(d.type==='relative')html='<select '+p+' data-part="preset" aria-label="'+s+'">'+[['all','Todo'],['today','Hoy'],['yesterday','Ayer'],['last7','Últimos 7 días'],['last14','Últimos 14 días'],['last28','Últimos 28 días'],['last30','Últimos 30 días'],['last90','Últimos 90 días'],['thisweek','Esta semana'],['lastweek','Semana pasada'],['thismonth','Este mes'],['lastmonth','Mes anterior'],['thisquarter','Este trimestre'],['thisyear','Este año'],['lastyear','Año anterior']].map(([a,b])=>'<option value="'+a+'" '+((chosen.preset??d.preset)===a?'selected':'')+'>'+b+'</option>').join('')+'</select>';
  else if(d.type==='number')html='<div class="lk-pair"><input type="number" '+p+' data-part="min" value="'+(chosen.min??d.min??'')+'" placeholder="Mín." aria-label="Mínimo"><input type="number" '+p+' data-part="max" value="'+(chosen.max??d.max??'')+'" placeholder="Máx." aria-label="Máximo"></div>';
  else if(d.type==='multi'||d.type==='list')html='<div class="lk-list">'+values.map(v=>'<label><input type="checkbox" '+p+' data-part="values" value="'+esc(v)+'" '+((chosen.values??d.values).includes(v)?'checked':'')+'>'+esc(v)+'</label>').join('')+'</div>';
  else if(d.type==='select'||d.type==='checkbox')html='<select '+p+' data-part="value" aria-label="'+s+'"><option value="">Todos</option>'+values.map(v=>'<option value="'+esc(v)+'" '+((chosen.value??d.value)===v?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select>';
  else html='<input type="search" '+p+' data-part="value" placeholder="'+(d.type==='advanced'?esc(d.operator):'Buscar…')+'" value="'+esc(chosen.value??d.value)+'" aria-label="'+s+'">';
  return '<div class="lk-control"><div class="lk-control-head">'+s+'<small>'+esc(FIELDS[d.field])+'</small></div>'+html+'</div>';
 }).join('')+'<button class="lk-reset" type="button" data-lk-reset>Limpiar</button></div>':'';
 el.onchange=e=>{const inp=e.target.closest('[data-lk-id]');if(!inp)return;update(inp,el);};
 el.oninput=e=>{const inp=e.target.closest('[data-lk-id]');if(inp?.type==='search')update(inp,el);};
 el.onclick=e=>{if(e.target.closest('[data-lk-reset]')){for(const d of arr)delete settings[d.id];render(el,page,card);event();}};
}
function update(input,host){
 const id=input.dataset.lkId,part=input.dataset.part;
 const next={...(settings[id]||{})};
 if(part==='values')next.values=Array.from(host.querySelectorAll('input[data-lk-id="'+id+'"]:checked')).map(x=>x.value);
 else if(part==='min'||part==='max')next[part]=input.value===''?null:Number(input.value);
 else next[part]=input.value;
 settings[id]=next;event();
}
function setDefinitions(d){definitions=normalizeAll(d);settings={};event();}
function setRows(r){dataset=Array.isArray(r)?r:[];}
const api={FIELDS,TYPES,date,today,shift,range,normalize,normalizeAll,condition,apply,options,setDefinitions,setRows,render,
 getDefinitions:()=>definitions.slice(),getValues:()=>({...settings}),setValue(id,v){settings[id]=v;event();},reset(){settings={};event();},
 filter(rows,page='resumen',card=''){return apply(rows,definitions,settings,page,card,reference||today());},setReference(x){reference=date(x)?x:null;}};
root.CITROEN_FILTER_ENGINE=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
