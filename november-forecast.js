/* Noviembre 2026: consulta del plan XLSX recibido; no es un simulador ni datos ejecutados. */
(function(){
"use strict";
const $=id=>document.getElementById(id), f=new Intl.NumberFormat("es-CO",{maximumFractionDigits:0});
const money=n=>n==null?"—":"$"+f.format(Math.round(n));
const num=n=>n==null?"—":f.format(Math.round(n));
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function csv(rows){
 const content="\uFEFF"+rows.map(r=>r.map(x=>'"'+String(x??"").replace(/"/g,'""')+'"').join(";")).join("\r\n");
 const blob=new Blob([content],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="citroen_plan_noviembre_2026_recibido.csv";document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function init(){
 const p=window.CITROEN_NOVEMBER_PLAN;
 if(!$("novForecast"))return;
 if(!p){$("novLoading").textContent="No se pudo abrir el plan de noviembre.";return}
 $("novBudgetValue").textContent=money(p.metaBudget);
 $("novResultValue").textContent=num(p.leads);
 $("novCprValue").textContent=money(p.cpl);
 $("novVariationValue").textContent=money(p.takataBudget+p.linkedInBudget);
 $("novScenarioState").textContent="PLAN RECIBIDO · NO EJECUTADO";
 $("novMix").innerHTML=p.models.map(m=>{
  const share=m.budget/p.metaBudget;
  return '<div class="cit-nov-mixline"><span class="cit-nov-mixname">'+esc(m.name)+'</span><div class="cit-nov-track"><div style="width:'+(share*100).toFixed(2)+'%"></div></div><b>'+money(m.budget)+'</b></div>';
 }).join("");
 $("novWeeks").innerHTML=p.weeklyAllocation.map(w=>
  '<div class="cit-nov-mixline"><span class="cit-nov-mixname">'+esc(w[0])+'</span><div class="cit-nov-track"><div style="width:'+(w[1]*100).toFixed(1)+'%"></div></div><b>'+money(w[2])+' · '+Math.round(w[1]*100)+'%</b></div>'
 ).join("");
 $("novModelRows").innerHTML=p.models.map(m=>{
  const share=m.budget/p.metaBudget;
  return '<tr><td><strong>'+esc(m.name)+'</strong></td><td>'+money(m.budget)+'</td><td>'+(share*100).toLocaleString("es-CO",{maximumFractionDigits:1})+'%</td><td class="cit-nov-result">'+num(m.leads)+'</td><td>'+money(m.cpl)+'</td><td><small>'+esc(m.source)+'</small></td></tr>';
 }).join("");
 $("novLoading").hidden=true;$("novBody").hidden=false;$("novForecast").dataset.loaded="true";
 $("novOpen").onclick=()=>$("novForecast").scrollIntoView({behavior:"smooth",block:"start"});
 $("novExport").onclick=()=>csv([
  ["Mes","Modelo","Presupuesto Meta COP","Meta de eventos","CPL proyectado COP","Fuente"],
  ...p.models.map(m=>[p.month,m.name,m.budget,m.leads,m.cpl,m.source]),
  [p.month,"TOTAL META",p.metaBudget,p.leads,p.cpl,"BOT SEGUIMIENTO NOVIEMBRE V.1!C8:H8"],
  [p.month,"TAKATA (fuera de Meta)",p.takataBudget,"","","ESTRUCTURA!R18"],
  [p.month,"LINKEDIN (fuera de Meta)",p.linkedInBudget,"","","ESTRUCTURA!R18"]
 ]);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();