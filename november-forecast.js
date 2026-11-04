/* CITROEN | Escenario noviembre 2026.
   Octubre es la REFERENCIA auditada; noviembre no es una planeación aprobada.
   No altera data/proyecciones_2026.js, presupuestos históricos ni datos reales. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const KEY='citroen.noviembre2026.escenario.v1';
 const month='2026-11';
 const fmt=new Intl.NumberFormat('es-CO',{maximumFractionDigits:0});
 const currency=n=>'$'+fmt.format(Math.round(n||0));
 const number=n=>fmt.format(Math.round(n||0));
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const multipliers={prudente:1.15,base:1,eficiente:.85};
 let source=[],draft=null,dirty=false;
 const budgetNumber=(n,min=0,max=5000000000)=>{
  const v=Number(n);
  return Number.isFinite(v)?Math.min(max,Math.max(min,Math.round(v))):min;
 };
 async function reference(){
  const packed=String(window.CITROEN_PLAN_PACKED||'').trim();
  if(!packed||!('DecompressionStream' in window))throw Error('No se pudo abrir el consolidado auditado de octubre.');
  const zipped=Uint8Array.from(atob(packed),c=>c.charCodeAt(0));
  const text=await new Response(new Blob([zipped]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  const data=JSON.parse(text);
  if(data.schema!=='citroen-planning-2026/v1'||data.months[9]?.[0]!=='2026-10')throw Error('La fuente de planeación de octubre cambió.');
  const models=data.models.filter(r=>r[0]===9).map(r=>({name:String(r[1]),budget:budgetNumber(r[2]),results:Number(r[3])||0}));
  if(models.length!==6||!models.some(x=>x.name==='BERLINGO'))throw Error('No se encontró el desglose de seis modelos de octubre.');
  const budget=models.reduce((a,x)=>a+x.budget,0);
  if(Math.abs(budget-Number(data.months[9][2]))>1)throw Error('El presupuesto por modelo no concilia con octubre.');
  return models;
 }
 function makeDraft(){
  return {mode:'base',budgets:Object.fromEntries(source.map(x=>[x.name,x.budget]))};
 }
 function validated(input){
  const budgets={};
  for(const model of source)budgets[model.name]=budgetNumber(input?.budgets?.[model.name]??model.budget);
  return {mode:Object.hasOwn(multipliers,input?.mode)?input.mode:'base',budgets};
 }
 function total(){return source.reduce((sum,m)=>sum+(draft.budgets[m.name]||0),0)}
 function forecast(model){
  const budget=draft.budgets[model.name]||0;
  const cpr=model.results>0?model.budget/model.results:null;
  const expected=cpr?budget/(cpr*multipliers[draft.mode]):null;
  return {budget,cpr,expected};
 }
 function calc(){
  const items=source.map(m=>({...m,...forecast(m)}));
  const octBudget=source.reduce((a,m)=>a+m.budget,0);
  const octResults=source.reduce((a,m)=>a+m.results,0);
  const novBudget=items.reduce((a,m)=>a+m.budget,0);
  const novResults=items.every(m=>m.expected!==null)?items.reduce((a,m)=>a+m.expected,0):null;
  const cpr=novResults&&novResults>0?novBudget/novResults:null;
  return {items,octBudget,octResults,novBudget,novResults,cpr,variation:octBudget>0?(novBudget/octBudget-1):0};
 }
 function progressBadge(){
  const badge=$('novScenarioState');
  if(badge)badge.textContent=dirty?'ESCENARIO MODIFICADO · NO APROBADO':'REFERENCIA OCTUBRE · NO APROBADO';
 }
 function reflect(rebuildRows=true){
  if(!draft)return;
  const v=calc();
  $('novTotalBudget').value=String(v.novBudget);
  $('novMode').value=draft.mode;
  $('novBudgetValue').textContent=currency(v.novBudget);
  $('novResultValue').textContent=v.novResults===null?'No calculable':number(v.novResults);
  $('novCprValue').textContent=v.cpr===null?'—':currency(v.cpr);
  $('novVariationValue').textContent=(v.variation>=0?'+':'')+(v.variation*100).toLocaleString('es-CO',{maximumFractionDigits:1})+'%';
  $('novBaseBudget').textContent=currency(v.octBudget);
  $('novBaseResults').textContent=number(v.octResults);
  $('novBudgetDelta').textContent=(v.variation>=0?'+':'')+(v.variation*100).toLocaleString('es-CO',{maximumFractionDigits:1})+'%';
  $('novResultsFactor').textContent=draft.mode==='prudente'?'CPR octubre +15%':draft.mode==='eficiente'?'CPR octubre −15%':'Mismo CPR octubre';
  $('novMix').innerHTML=v.items.map(m=>{
    const share=v.novBudget?m.budget/v.novBudget:0;
    return '<div class="cit-nov-mixline"><span class="cit-nov-mixname">'+esc(m.name)+'</span><div class="cit-nov-track"><div style="width:'+(share*100).toFixed(2)+'%"></div></div><b>'+currency(m.budget)+'</b></div>';
  }).join('');
  if(rebuildRows)$('novModelRows').innerHTML=v.items.map(m=>{
    const pct=v.novBudget?m.budget/v.novBudget*100:0;
    return '<tr><td><strong>'+esc(m.name)+'</strong></td><td>'+currency(m.budget===undefined?0:m.budget)+'</td>'+
      '<td><label class="cit-nov-budget-cell"><span class="sr-only">Presupuesto noviembre '+esc(m.name)+'</span><input data-nov-model="'+esc(m.name)+'" type="number" inputmode="numeric" min="0" max="5000000000" step="100000" value="'+m.budget+'"></label></td>'+
      '<td>'+pct.toLocaleString('es-CO',{maximumFractionDigits:1})+'%</td><td class="cit-nov-result">'+(m.expected===null?'—':number(m.expected))+'</td>'+
      '<td>'+(m.cpr===null?'—':currency(m.cpr*multipliers[draft.mode]))+'</td></tr>';
  }).join('');
  progressBadge();
 }
 function save(){
  try{
   localStorage.setItem(KEY,JSON.stringify({version:1,month,budgets:draft.budgets,mode:draft.mode}));
   dirty=true;progressBadge();status('Escenario guardado en este navegador. No se publicó ni cambió el plan oficial.');
  }catch{status('No se pudo guardar el escenario en este navegador.');}
 }
 function status(message){const el=$('novMessage');el.textContent=message;el.hidden=false;}
 function scale(value){
  const target=budgetNumber(value);
  const current=total();
  const names=source.map(x=>x.name);
  if(!current){draft.budgets=makeDraft().budgets;return scale(target)}
  let sum=0;
  for(let i=0;i<names.length;i++){
   const n=names[i];
   const amount=i===names.length-1?target-sum:Math.floor(target*draft.budgets[n]/current);
   draft.budgets[n]=budgetNumber(amount);sum+=draft.budgets[n];
  }
  // Exact sum after rounding, without introducing extra media budget.
  const difference=target-total();
  draft.budgets[names[names.length-1]]+=difference;
  dirty=true;reflect();
 }
 function exportCSV(){
  const rows=[['Mes','Estado','Modelo','Presupuesto octubre (referencia)','Presupuesto noviembre (escenario)','Resultados estimados','CPR estimado'],
   ...source.map(m=>{const r=forecast(m);return [month,'ESTIMACIÓN NO APROBADA',m.name,m.budget,r.budget,r.expected===null?'':Math.round(r.expected),r.cpr===null?'':Math.round(r.cpr*multipliers[draft.mode])]})];
  const content='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='citroen-proyeccion-noviembre-2026-escenario.csv';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 async function init(){
  if(!$('novForecast'))return;
  try{
   source=await reference();
   draft=makeDraft();
   try{const stored=JSON.parse(localStorage.getItem(KEY)||'null');if(stored?.month===month){draft=validated(stored);dirty=true}}catch{}
   reflect();
   $('novForecast').dataset.loaded='true';$('novLoading').hidden=true;$('novBody').hidden=false;
  }catch(e){$('novLoading').textContent='No fue posible cargar la referencia de octubre: '+e.message;return;}
  $('novMode').onchange=e=>{draft.mode=e.target.value;dirty=true;reflect()};
  $('novTotalBudget').addEventListener('change',e=>scale(e.target.value));
  $('novModelRows').addEventListener('input',e=>{
   const field=e.target.closest('input[data-nov-model]');if(!field)return;
   if(!Object.hasOwn(draft.budgets,field.dataset.novModel))return;
   draft.budgets[field.dataset.novModel]=budgetNumber(field.value);dirty=true;reflect(false);
  });
  $('novModelRows').addEventListener('change',e=>{
   const field=e.target.closest('[data-nov-model]');if(!field)return;
   if(!Object.hasOwn(draft.budgets,field.dataset.novModel))return;
   draft.budgets[field.dataset.novModel]=budgetNumber(field.value);dirty=true;reflect();
  });
  $('novReset').onclick=()=>{draft=makeDraft();dirty=false;try{localStorage.removeItem(KEY)}catch{}reflect();status('Restablecido al escenario de referencia de octubre. Ningún dato histórico fue alterado.')};
  $('novSave').onclick=save;$('novExport').onclick=exportCSV;
  $('novOpen').onclick=()=>{$('novForecast').scrollIntoView({behavior:'smooth',block:'start'})};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();