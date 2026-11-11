/* Citroen · noviembre 2026 · transcripción trazable del XLSX aportado por el cliente.
   FUENTES: "ESTRUCTURA PERFORMANCE CITROEN NOVIEMBRE 2026 V1 2.xlsx",
   BOT SEGUIMIENTO NOVIEMBRE V.1!C8:E8; ESTRUCTURA!H3:H58;
   ESTRUCTURA!R3:Y5. Total $90 M = $86 M Meta + $2 M TAKATA + $2 M LinkedIn.
   Los eventos proyectados no equivalen necesariamente a personas únicas. */
(function(){
"use strict";
const modelInputs=[["C3 MAX",21368475,2640.1249414013064,"BOT SEGUIMIENTO NOVIEMBRE V.1!C18:E18"],["AIRCROSS MAX",34268475,4665.989921269713,"BOT SEGUIMIENTO NOVIEMBRE V.1!C27:E27"],["C3",4454900,890.158097797048,"BOT SEGUIMIENTO NOVIEMBRE V.1!C36:E36"],["AIRCROSS",8797175,1369.6857426886368,"BOT SEGUIMIENTO NOVIEMBRE V.1!C45:E45"],["BASALT",12810975,2108.735069519499,"BOT SEGUIMIENTO NOVIEMBRE V.1!C53:E53"],["BERLINGO",4300000,673.8755680927754,"ESTRUCTURA!X5:Y5; ESTRUCTURA!H58"]];
const modelNames=modelInputs.slice(0,5).map(x=>x[0]);
const models=modelInputs.map(([name,budget,leads,source])=>({name,budget,leads,source,cpl:leads>0?budget/leads:null}));
const lines=[];
const push=(row,model,budget,campaign,type,region,scope)=>{
 if(!budget)return;
 lines.push({row,model,budget,campaign,type,region,scope,source:"ESTRUCTURA!H"+row});
};
[4300000,6880000,860000,1720000,2580000].forEach((budget,i)=>
 push(3+i*2,modelNames[i],budget,"CAMPAÑA "+modelNames[i],"WHATSAPP","TODO EL PAÍS","ALWAYS ON"));
const groups=[
 ["CAMPAÑA WHATSAPP","WHATSAPP","TODO EL PAÍS","RESTO COLOMBIA",13,[4920475,7926175,1001900,1914775,2916675]],
 ["CAMPAÑA REGIONES","REGIONES","CUNDINAMARCA","BOGOTÁ",18,[3870000,6192000,774000,1548000,2322000]],
 ["CAMPAÑA REGIONES","REGIONES","ANTIOQUIA","MEDELLIN-PEREIRA-MANIZALES",23,[2580000,4128000,516000,1032000,1548000]],
 ["CAMPAÑA REGIONES","REGIONES","VALLE DEL CAUCA","CALI - PALMIRA",28,[2150000,3440000,430000,860000,1290000]],
 ["Concesionario DG ANDINA","WHATSAPP","CUCUTA","CUCUTA",33,[516250,838750,0,322500,322500]],
 ["Concesionario AUTOMOTORES EUROPA","WHATSAPP","BOGOTÁ","BOGOTÁ",38,[774250,1251550,0,496900,477300]],
 ["CALLE 13","WHATSAPP","BOGOTÁ","BOGOTÁ",43,[752500,1204000,291000,301000,451500]],
 ["CALLE 26","WHATSAPP","BOGOTÁ","BOGOTÁ",48,[752500,1204000,291000,301000,451500]],
 ["CALLE 72","WHATSAPP","BOGOTÁ","BOGOTÁ",53,[752500,1204000,291000,301000,451500]]
];
for(const [campaign,type,region,scope,start,budgets] of groups)
 budgets.forEach((budget,i)=>push(start+i,modelNames[i],budget,campaign,type,region,scope));
push(58,"BERLINGO",4300000,"CAMPAÑA BERLINGO","WHATSAPP","TODO EL PAÍS","NACIONAL");
const budget=lines.reduce((v,x)=>v+x.budget,0);
const leads=models.reduce((v,x)=>v+x.leads,0);
if(lines.length!==49||budget!==86000000||Math.abs(leads-12348.56934076898)>.00001)
 throw Error("El plan de noviembre no concilia con el XLSX.");
for(const m of models){
 const assigned=lines.filter(x=>x.model===m.name).reduce((v,x)=>v+x.budget,0);
 if(Math.abs(assigned-m.budget)>.01)throw Error("Descuadre noviembre: "+m.name);
}
const november={month:"2026-11",label:"Noviembre",budget,leads,cpl:budget/leads,
  metaBudget:86000000,takataBudget:2000000,linkedInBudget:2000000,totalEnvelope:90000000,
  passengerBudget:81700000,passengerLeads:11674.693772676204,berlingoBudget:4300000,
  berlingoLeads:673.8755680927754,models,lines,
  source:"ESTRUCTURA PERFORMANCE CITROEN NOVIEMBRE 2026 V1 2.xlsx"};
window.CITROEN_NOVEMBER_PLAN=november;
const priorPatch=window.CITROEN_PATCH_PLAN;
window.CITROEN_PATCH_PLAN=async function(plan){
 if(typeof priorPatch==="function")await priorPatch(plan);
 if(plan.months.some(m=>m[0]==="2026-11"))return plan;
 if(plan.months.length!==10||plan.models.length!==60)throw Error("La base enero-octubre cambió; no se puede adjuntar noviembre sin verificar.");
 plan.months.push(["2026-11","Noviembre",budget,null,november.passengerBudget,november.passengerLeads,november.berlingoBudget,november.berlingoLeads]);
 const position=plan.months.length-1;
 plan.models.push(...models.map(m=>[position,m.name,m.budget,m.leads]));
 plan.lines.push(...lines.map(r=>[position,"ESTRUCTURA",r.row,r.campaign,r.type,r.region,r.scope,r.model,r.budget,"H"+r.row]));
 plan.quality=Array.isArray(plan.quality)?plan.quality:[];
 plan.quality.push(["MEDIA","NOVIEMBRE","Archivo de proyecciones recibido",
  "Meta: $86.000.000 y 12.348,57 resultados objetivo. Berlingo $4,3 M incluido una sola vez. $2 M Takata y $2 M LinkedIn fuera de este plan Meta. Metas de eventos, no contactos únicos."]);
 plan.novemberSource=november.source;
 return plan;
};
})();