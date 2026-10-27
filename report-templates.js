/* Citroën Studio templates — structures only. Every measurement is computed from connected Meta data.
 * No hard-coded marketing figures, imaginary goals, or automatically invented conclusions.
 */
(function(){
'use strict';
const metric=(title,metric,x,y,w=270,h=180)=>({type:'metric',title,source:'meta',metric,dimension:'month',shape:'bar',x,y,w,h});
const chart=(title,metric,dimension,shape,x,y,w=560,h=330)=>({type:'chart',title,source:'meta',metric,dimension,shape,x,y,w,h});
const note=(x,y,w=1152,h=174)=>({type:'note',title:'Hallazgos y próximos pasos',source:'meta',text:'Pendiente de análisis: escribe aquí tus insights, decisiones y responsables. No publiques conclusiones sin validarlas con los datos.',metric:'spend',dimension:'month',shape:'bar',x,y,w,h});
const TEMPLATES=[
 {
  id:'executive',title:'Resumen ejecutivo',subtitle:'La vista para presentar resultados al cliente',
  label:'KPIs · tendencia · modelos · insights',icon:'▣',accent:'#f04457',
  cards:[
   metric('Inversión ejecutada','spend',24,24),metric('Formularios','forms',318,24),
   metric('Costo por formulario','cpl',612,24),metric('Impresiones','impressions',906,24),
   chart('Inversión mensual','spend','month','bar',24,224),
   chart('Formularios por modelo','forms','model','barh',616,224),
   note(24,582)
  ]
 },
 {
  id:'models',title:'Rendimiento por modelo',subtitle:'Comparativos reales entre C3, Basalt, Aircross y otros',
  label:'Modelos · inversión · CPL · formularios',icon:'▤',accent:'#2373a1',
  cards:[
   metric('Formularios recibidos','forms',24,24,368),metric('Inversión total','spend',418,24,368),
   metric('Costo por formulario','cpl',812,24,364),
   chart('Formularios por modelo','forms','model','barh',24,239),
   chart('Inversión por modelo','spend','model','bar',616,239),
   chart('CPL por modelo','cpl','model','bar',24,598,1152,315)
  ]
 },
 {
  id:'evolution',title:'Evolución y eficiencia',subtitle:'Lectura mensual del desempeño de las campañas',
  label:'Tendencias · CTR · inversión · leads',icon:'⌁',accent:'#338a88',
  cards:[
   metric('Inversión acumulada','spend',24,24,368),metric('Leads de formulario','forms',418,24,368),
   metric('CTR de enlace','ctr',812,24,364),
   chart('Tendencia de inversión','spend','month','area',24,239),
   chart('Formularios por mes','forms','month','line',616,239),
   chart('Evolución del CPL','cpl','month','line',24,598,1152,315)
  ]
 },
 {
  id:'conversion',title:'Interacción y conversión',subtitle:'De impresiones a acciones, sin mezclar eventos distintos',
  label:'Impresiones · clics · formularios · conversaciones',icon:'◎',accent:'#8a65a8',
  cards:[
   metric('Impresiones','impressions',24,24),metric('Clics al enlace','clicks',318,24),
   metric('Formularios','forms',612,24),metric('Conversaciones','messages',906,24),
   chart('Clics al enlace por mes','clicks','month','area',24,224),
   chart('Formularios por mes','forms','month','bar',616,224),
   {type:'note',title:'Lectura metodológica',text:'Los formularios y las conversaciones son eventos diferentes; no deben sumarse como leads únicos. Contrasta inversión y conversiones antes de redactar conclusiones.',source:'meta',metric:'spend',dimension:'month',shape:'bar',x:24,y:582,w:1152,h:180}
  ]
 },
 {
  id:'territories',title:'Análisis territorial',subtitle:'Distribución geográfica y oportunidades por zona',
  label:'Territorios · leads · inversión · CPL',icon:'◇',accent:'#9d713d',
  cards:[
   metric('Formularios totales','forms',24,24,368),metric('Inversión total','spend',418,24,368),
   metric('Costo por formulario','cpl',812,24,364),
   chart('Formularios por territorio','forms','territory','barh',24,239),
   chart('Inversión por territorio','spend','territory','barh',616,239),
   chart('CPL por territorio','cpl','territory','bar',24,598,1152,315)
  ]
 }
];
const ALL=new Set(['metric','chart','note','image','filter']);
function get(id){return TEMPLATES.find(x=>x.id===id)||null;}
function instantiate(id,uid){
 const template=get(id);
 if(!template||typeof uid!=='function')return null;
 const cards=template.cards.map(card=>{
  const copy={...card,id:uid(),goal:null,color:'#8abbd8',background:'#ffffff',textColor:'#173e57'};
  if(!ALL.has(copy.type))throw new Error('Tipo de tarjeta no compatible');
  return copy;
 });
 return {id:uid(),title:template.title,cards};
}
window.CITROEN_REPORT_TEMPLATES={
 list:()=>TEMPLATES.map(({id,title,subtitle,label,icon,accent,cards})=>({id,title,subtitle,label,icon,accent,count:cards.length})),
 instantiate
};
})();
