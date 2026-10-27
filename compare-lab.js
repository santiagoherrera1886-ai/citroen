/* Citroën | Comparador avanzado de períodos
 * Independiente de edición; solo datos Meta reales ya cargados por el dashboard.
 * No suma alcance: muestra estimación Sainsbury con universo fijo de 15M.
 */
(function(root){
'use strict';
const U=15000000;
const metrics={
 spend:{label:'Inversión',unit:'money',good:'neutral'},
 forms:{label:'Formularios',unit:'number',good:'up'},
 messages:{label:'Conversaciones',unit:'number',good:'up'},
 impressions:{label:'Impresiones',unit:'number',good:'up'},
 clicks:{label:'Clics de enlace',unit:'number',good:'up'},
 cpl:{label:'CPL',unit:'money',good:'down'},
 ctr:{label:'CTR de enlace',unit:'percent',good:'up'},
 reach:{label:'Alcance estimado',unit:'number',good:'neutral'}
};
const dimensions={model:'Modelo',territory:'Territorio',account:'Cuenta Meta'};
const day=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const t=Date.parse(s+'T00:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===s?s:null;};
const key=s=>String(s??'').trim()||'Sin clasificar';
function aggregate(rows,metric,estimator){
 if(!metrics[metric]||!Array.isArray(rows)||rows.length===0)return null;
 const sum=f=>rows.reduce((a,r)=>a+(Number.isFinite(Number(r[f]))?Math.max(0,Number(r[f])):0),0);
 const spend=sum('spend'),forms=sum('forms'),impressions=sum('impressions');
 if(metric==='cpl')return forms>0?spend/forms:null;
 if(metric==='ctr')return impressions>0?100*sum('clicks')/impressions:null;
 if(metric==='reach'){
  if(typeof estimator!=='function'||!rows.length)return null;
  const estimate=estimator(rows.map(r=>Number(r.reach)||0),U);
  return estimate==null||!Number.isFinite(Number(estimate))?null:Number(estimate);
 }
 return sum(metric);
}
function delta(a,b){
 if(a==null||b==null)return null;
 return b===0?null:(a-b)/Math.abs(b)*100;
}
function quality(metric,d){
 if(d==null)return 'unknown';
 if(d===0||metrics[metric].good==='neutral')return 'neutral';
 return (metrics[metric].good==='down'?d<0:d>0)?'positive':'negative';
}
function daysBetween(start,end){return Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1;}
function range(row,start,end){const d=day(row?.date);return d!=null&&d>=start&&d<=end;}
function calculate(rows,settings,estimator){
 const {aStart,aEnd,bStart,bEnd,metric='forms',group='model',model='',territory=''}=settings||{};
 if(!Array.isArray(rows)||!metrics[metric]||!dimensions[group])return {ok:false,error:'La métrica o dimensión no está disponible.'};
 if(![aStart,aEnd,bStart,bEnd].every(day)||aStart>aEnd||bStart>bEnd)return {ok:false,error:'Selecciona dos rangos de fechas válidos, con inicio anterior al final.'};
 if(daysBetween(aStart,aEnd)>366||daysBetween(bStart,bEnd)>366)return {ok:false,error:'Cada rango puede tener máximo 366 días.'};
 const valid=rows.filter(r=>r&&day(r.date)&&(!model||r.model===model)&&(!territory||r.territory===territory));
 const a=valid.filter(r=>range(r,aStart,aEnd));
 const b=valid.filter(r=>range(r,bStart,bEnd));
 const activeDates=v=>new Set(v.map(x=>x.date)).size;
 const totalA=aggregate(a,metric,estimator),totalB=aggregate(b,metric,estimator);
 const labels=new Set([...a,...b].map(r=>key(r[group])));
 const parts=[...labels].sort((x,y)=>x.localeCompare(y,'es',{numeric:true})).map(label=>{
  const rowsA=a.filter(r=>key(r[group])===label),rowsB=b.filter(r=>key(r[group])===label);
  const current=aggregate(rowsA,metric,estimator),prior=aggregate(rowsB,metric,estimator);
  const change=delta(current,prior);
  return {label,current,prior,change,favorable:quality(metric,change),aRows:rowsA.length,bRows:rowsB.length};
 });
 parts.sort((x,y)=>(y.current??-Infinity)-(x.current??-Infinity)||x.label.localeCompare(y.label,'es'));
 const totalChange=delta(totalA,totalB);
 return {
  ok:true,metric,group,source:'Meta Ads · registros diarios',aStart,aEnd,bStart,bEnd,
  totalA,totalB,totalChange,totalQuality:quality(metric,totalChange),
  aRecords:a.length,bRecords:b.length,aDates:activeDates(a),bDates:activeDates(b),
  aDays:daysBetween(aStart,aEnd),bDays:daysBetween(bStart,bEnd),
  groups:parts,hasDifferentLength:daysBetween(aStart,aEnd)!==daysBetween(bStart,bEnd),
  hasIncompleteCoverage:activeDates(a)<daysBetween(aStart,aEnd)||activeDates(b)<daysBetween(bStart,bEnd),
  reachCaveat:metric==='reach'?'Alcance calculado mediante estimación Sainsbury, con universo de 15 millones. No equivale a alcance único deduplicado observado.':null
 };
}
function defaults(rows){
 const valid=rows.map(x=>day(x?.date)).filter(Boolean).sort();
 if(!valid.length)return {aStart:'',aEnd:'',bStart:'',bEnd:''};
 const latest=valid[valid.length-1],aStart=latest.slice(0,7)+'-01';
 const firstOfMonth=new Date(aStart+'T00:00:00Z');
 firstOfMonth.setUTCMonth(firstOfMonth.getUTCMonth()-1);
 const bStart=firstOfMonth.toISOString().slice(0,10);
 const monthEnd=new Date(Date.UTC(firstOfMonth.getUTCFullYear(),firstOfMonth.getUTCMonth()+1,0)).getUTCDate();
 const lastDay=Math.min(Number(latest.slice(8)),monthEnd);
 return {aStart,aEnd:latest,bStart,bEnd:bStart.slice(0,8)+String(lastDay).padStart(2,'0')};
}
function csvCell(value){
 let s=value==null?'':String(value);
 if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function toCSV(result){
 if(!result?.ok)return '';
 const lines=[
  ['Dimensión','Período A '+result.aStart+' a '+result.aEnd,'Período B '+result.bStart+' a '+result.bEnd,'Variación (%)'],
  ['TOTAL',result.totalA,result.totalB,result.totalChange],
  ...result.groups.map(r=>[r.label,r.current,r.prior,r.change])
 ];
 return '\ufeff'+lines.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(v,metric){if(v==null||!Number.isFinite(v))return '—';
 if(metrics[metric].unit==='money')return '$ '+new Intl.NumberFormat('es-CO',{maximumFractionDigits:0}).format(v);
 if(metrics[metric].unit==='percent')return new Intl.NumberFormat('es-CO',{maximumFractionDigits:2}).format(v)+' %';
 return new Intl.NumberFormat('es-CO',{maximumFractionDigits:0}).format(v);
}
function percent(n){return n==null?'Sin base comparable':(n>0?'+':'')+new Intl.NumberFormat('es-CO',{maximumFractionDigits:1}).format(n)+' %';}
function options(choices,selected,empty){return '<option value="">'+empty+'</option>'+choices.map(x=>'<option value="'+esc(x)+'" '+(x===selected?'selected':'')+'>'+esc(x)+'</option>').join('');}
let rows=[],host=null,initialized=false,settings={},latest=null;
function setRows(next){
 rows=Array.isArray(next)?next:[];
 if(!settings.aStart&&rows.length){settings={...settings,...defaults(rows),metric:settings.metric||'forms',group:settings.group||'model',model:settings.model||'',territory:settings.territory||''};}
 if(host)refresh(true);
}
function choose(name){
 return [...new Set(rows.map(r=>key(r[name])).filter(x=>x!=='Sin clasificar'))].sort((a,b)=>a.localeCompare(b,'es'));
}
function build(){
 host.innerHTML=
 '<div class="compare-lab-head"><div class="builder-eyebrow">CITROËN / ANÁLISIS REAL</div><h3>Comparador avanzado</h3><p>Contrasta dos rangos de fechas y desglosa el resultado por modelo, territorio o cuenta Meta. Cambiar los controles no altera el informe publicado.</p></div>'+
 '<form id="compareLabForm" class="compare-lab-form">'+
  '<fieldset><legend>Período A · referencia actual</legend><label>Desde<input name="aStart" type="date" required></label><label>Hasta<input name="aEnd" type="date" required></label></fieldset>'+
  '<fieldset><legend>Período B · comparación</legend><label>Desde<input name="bStart" type="date" required></label><label>Hasta<input name="bEnd" type="date" required></label></fieldset>'+
  '<div class="compare-lab-config"><label>Indicador<select name="metric">'+Object.entries(metrics).map(([k,v])=>'<option value="'+k+'">'+esc(v.label)+'</option>').join('')+'</select></label>'+
  '<label>Desglose<select name="group">'+Object.entries(dimensions).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join('')+'</select></label>'+
  '<label>Filtrar modelo<select name="model"></select></label><label>Filtrar territorio<select name="territory"></select></label></div>'+
  '<div class="compare-lab-actions"><button type="submit">Actualizar comparativo</button><button type="button" id="compareLabReset">Mes actual vs. anterior</button><button type="button" id="compareLabCSV">Exportar CSV</button></div>'+
 '</form><p id="compareLabError" role="status" class="compare-lab-error"></p><div id="compareLabResults"></div>';
 const form=host.querySelector('#compareLabForm');
 form.onsubmit=e=>{e.preventDefault();settings=Object.fromEntries(new FormData(form).entries());renderResults();};
 host.querySelector('#compareLabReset').onclick=()=>{settings={...defaults(rows),metric:settings.metric||'forms',group:settings.group||'model',model:settings.model||'',territory:settings.territory||''};fill();renderResults();};
 host.querySelector('#compareLabCSV').onclick=()=>{
  if(!latest?.ok)return;
  const blob=new Blob([toCSV(latest)],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='citroen-comparativo-'+latest.metric+'.csv';
  document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
 };
 fill();renderResults();
}
function fill(){
 const form=host?.querySelector('#compareLabForm');if(!form)return;
 for(const n of ['aStart','aEnd','bStart','bEnd','metric','group'])form.elements[n].value=settings[n]||'';
 form.elements.model.innerHTML=options(choose('model'),settings.model,'Todos los modelos');
 form.elements.territory.innerHTML=options(choose('territory'),settings.territory,'Todos los territorios');
}
function renderResults(){
 if(!host)return;
 const form=host.querySelector('#compareLabForm');
 if(form)settings=Object.fromEntries(new FormData(form).entries());
 const output=host.querySelector('#compareLabResults'),error=host.querySelector('#compareLabError');
 latest=calculate(rows,settings,root.CITROEN_REACH_MATH?.estimate);
 if(!latest.ok){error.textContent=latest.error;output.replaceChildren();return;}
 error.textContent='';
 const r=latest,barmax=Math.max(1,...r.groups.flatMap(g=>[g.current||0,g.prior||0])),listed=r.groups.slice(0,15);
 const chart=listed.map(g=>{
  const wA=Math.max(0,(g.current||0)/barmax*100),wB=Math.max(0,(g.prior||0)/barmax*100);
  return '<div class="compare-lab-bar-row"><span title="'+esc(g.label)+'">'+esc(g.label)+'</span><div class="compare-lab-bars"><i style="width:'+wA.toFixed(2)+'%"></i><em style="width:'+wB.toFixed(2)+'%"></em></div></div>';
 }).join('');
 const caveats=[
  r.hasDifferentLength?'Los períodos seleccionados tienen diferente duración. Sus acumulados no son directamente equivalentes.':'',
  r.hasIncompleteCoverage?'Hay fechas sin registros dentro de uno o ambos rangos. Una fecha sin filas no demuestra inversión cero.':'',
  r.totalChange==null?'La variación porcentual no se calcula cuando falta el denominador o es cero.':'',
  r.reachCaveat||''
 ].filter(Boolean);
 output.innerHTML=
 '<div class="compare-lab-kpis">'+
  '<article><small>A · '+esc(r.aStart)+' — '+esc(r.aEnd)+'</small><strong>'+fmt(r.totalA,r.metric)+'</strong><span>'+r.aDates+' fechas con registros · '+r.aRecords+' filas</span></article>'+
  '<article><small>B · '+esc(r.bStart)+' — '+esc(r.bEnd)+'</small><strong>'+fmt(r.totalB,r.metric)+'</strong><span>'+r.bDates+' fechas con registros · '+r.bRecords+' filas</span></article>'+
  '<article><small>Variación del indicador</small><strong class="compare-lab-'+r.totalQuality+'">'+percent(r.totalChange)+'</strong><span>Comparación A frente a B</span></article></div>'+
 '<div class="compare-lab-visual"><div><h4>Comparación por '+esc(dimensions[r.group].toLowerCase())+'</h4><div class="compare-lab-legend"><span>Período A</span><span>Período B</span></div>'+
 (listed.length?chart:'<p>Sin registros para los filtros y rangos elegidos.</p>')+'</div><div class="compare-lab-table-wrap"><table><thead><tr><th>'+esc(dimensions[r.group])+'</th><th>Período A</th><th>Período B</th><th>Var.</th></tr></thead><tbody>'+
 r.groups.map(g=>'<tr><td>'+esc(g.label)+'</td><td>'+fmt(g.current,r.metric)+'</td><td>'+fmt(g.prior,r.metric)+'</td><td class="compare-lab-'+g.favorable+'">'+percent(g.change)+'</td></tr>').join('')+
 '</tbody></table></div></div>'+
 '<div class="compare-lab-method"><strong>Notas metodológicas</strong><p>Fuente: Meta Ads, registros diarios cargados al dashboard. CTR = clics / impresiones; CPL = inversión / formularios. No se promedian porcentajes diarios.</p>'+
 caveats.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>';
}
function refresh(force){
 if(!host)return;
 if(!initialized){initialized=true;settings={...defaults(rows),metric:'forms',group:'model',model:'',territory:''};}
 if(force&&host.querySelector('#compareLabForm')){fill();renderResults();return;}
 build();
}
function mount(container,nextRows){
 if(!container)return;
 const changed=host!==container;
 host=container;
 if(Array.isArray(nextRows))rows=nextRows;
 if(changed||!host.querySelector('#compareLabForm'))refresh(false);
 else renderResults();
}
root.CITROEN_COMPARISON_LAB={calculate,aggregate,defaults,toCSV,mount,setRows};
if(typeof module!=='undefined'&&module.exports)module.exports={calculate,aggregate,defaults,toCSV};
})(typeof window!=='undefined'?window:{});
