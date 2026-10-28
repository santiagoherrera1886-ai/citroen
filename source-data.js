/* Shared, testable number handling for connected Sheets and BigQuery data. */
(function(root){
'use strict';
function number(value,format='auto'){
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 let s=String(value??'').trim();if(!s||/^(?:-|—|n\/a|null)$/i.test(s))return null;
 const negative=/^\(.*\)$/.test(s);
 s=s.replace(/(?:COP|USD|EUR|\$|€|£|%|\s|\u00a0|[()])/gi,'');
 if(!/^[+-]?\d[\d.,]*$/.test(s))return null;
 if(format==='es-CO')s=s.replace(/\./g,'').replace(',','.');
 else if(format==='en-US')s=s.replace(/,/g,'');
 else if(s.includes(',')&&s.includes('.')){
  const decimal=s.lastIndexOf(',')>s.lastIndexOf('.')?',':'.';
  s=decimal===','?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
 }else if(/^[+-]?\d{1,3}(?:[.,]\d{3})+$/.test(s))s=s.replace(/[.,]/g,'');
 else s=s.replace(',','.');
 const n=Number(s);return Number.isFinite(n)?(negative?-n:n):null;
}
function fields(source){
 return (source?.columns||[]).map(name=>{
  const nonempty=(source.rows||[]).map(r=>r[name]).filter(v=>String(v??'').trim()).slice(0,100);
  const numeric=nonempty.length>0&&nonempty.every(v=>number(v,source.numberFormat)!==null);
  return {name,type:numeric?'metric':'text'};
 });
}
function aggregate(source,dimension,metric,operation='sum'){
 const groups=new Map();let invalid=0;
 for(const row of source.rows||[]){
  const key=String(row[dimension]??'').trim()||'Sin dato';
  const value=operation==='count'?1:number(row[metric],source.numberFormat);
  if(value===null){invalid++;continue;}
  const g=groups.get(key)||{name:key,sum:0,count:0,min:Infinity,max:-Infinity};
  g.sum+=value;g.count++;g.min=Math.min(g.min,value);g.max=Math.max(g.max,value);groups.set(key,g);
 }
 return {points:[...groups.values()].map(g=>({name:g.name,value:operation==='avg'?g.sum/g.count:operation==='min'?g.min:operation==='max'?g.max:g.sum})),invalid};
}
root.CITROEN_SOURCE_DATA={number,fields,aggregate};
})(typeof window!=='undefined'?window:globalThis);
