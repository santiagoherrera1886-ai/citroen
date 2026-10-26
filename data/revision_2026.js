/* Correcciones trazables a Excel Abril V4 y Mayo V4, recibidos el 26/10/2026. Nunca confundir plan con ejecución. */
(function(){
"use strict";
const packed="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";
let memo;
async function payload(){
 if(memo)return memo;
 const data=Uint8Array.from(atob(packed),c=>c.charCodeAt(0));
 const result=await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
 const v=JSON.parse(result);
 if(v.schema!=="citroen-revision-2026-10-26/v1"||v.months.length!==2||v.models.length!==12||v.lines.length!==138)throw Error("Correcciones Citroen incompletas");
 return memo=v;
}
window.CITROEN_PATCH_PLAN=async function(plan){
 const v=await payload();
 for(let i=0;i<2;i++){const ix=i+3;plan.months[ix]=v.months[i];}
 plan.models=plan.models.filter(r=>r[0]!==3&&r[0]!==4).concat(v.models).sort((a,b)=>a[0]-b[0]);
 plan.lines=plan.lines.filter(r=>r[0]!==3&&r[0]!==4).concat(v.lines).sort((a,b)=>a[0]-b[0]);
 plan.quality=(plan.quality||[]).filter(r=>!["ABRIL","MAYO"].includes(r[1])).concat(v.quality);
 plan.revision="26/10/2026 · Excel abril V4 / mayo V4";
 return plan;
};
window.CITROEN_PATCH_AUDIT=function(audit){
 audit.audited_at="2026-10-26";
 audit.months[3]=["2026-04",65000000.45,58500000.45,6500000,6095.794720583624,628.875,6095.794720583624,"BOT SEGUIMIENTO ABRIL V.1!C8,E8","BERLINGO!O4 / O6","ESTRUCTURA"];
 audit.months[4]=["2026-05",141316554,130485356,10831198,14647.449348363236,1247.5464178760653,14647.449348363236,"BOT SEGUIMIENTO MAYO V.1!C8,E8","BERLINGO!O4 / O6","ESTRUCTURA"];
 audit.sources[3]="ABRIL V4";audit.sources[4]="MAYO V4";
 audit.scenarios=audit.scenarios.map(r=>r[0]==="MAYO"?["MAYO","DIFERENCIA DE VERSIÓN","BOT MAYO V4 + BERLINGO!O4",141316554,"Proyección actualizada. Sustituye el escenario anterior de 14,27 millones. Existe diferencia de 992.624 COP entre BOT y estructura."]:r);
 audit.alerts=audit.alerts.filter(r=>!(r[1]==="MAYO"&&(/#REF!|Seguimiento roto|Seguimiento no es reporte/.test(r[2]))));
 audit.alerts.push(["Alta","MAYO","Descuadre en estructura","ESTRUCTURA!H108","BOT pasajeros 130.485.356 vs estructura 131.477.980: diferencia 992.624 COP","Pendiente de validación; mantener advertencia visible"]);
 audit.alerts.push(["Alta","MAYO","Diferencia Berlingo","BERLINGO!H3 / O4","Partida H3 9.750.000; total O4 10.831.198","Usar O4 provisionalmente y solicitar validación"]);
 audit.methodology="Revisión del 26/10/2026: escenario abril 65 M, mayo 141,316554 M. Total enero-octubre 1.086.316.554,45 COP; 992.624 de diferencia mayo BOT/estructura sin resolución. No sumar adicional de abril sin aprobación.";
};
})();