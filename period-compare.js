/* Citroën Studio — comparable month-to-date calculations from actual daily records.
 * Pure metrics; never fills missing dates, invents budget, or merges distinct conversion events.
 */
(function(root){
'use strict';
const METRICS=new Set(['spend','forms','messages','impressions','clicks','cpl','ctr','reach']);
const pad=n=>String(n).padStart(2,'0');
function monthKey(date){return typeof date==='string'&&/^\d{4}-\d{2}(?:-\d{2})?$/.test(date)?date.slice(0,7):null;}
function asDay(date){const value=typeof date==='string'?date:'';const m=value.match(/^\d{4}-\d{2}-(\d{2})$/);return m?Number(m[1]):null;}
function value(metric,rows,opts={}){
 if(!METRICS.has(metric)||!Array.isArray(rows))return null;
 const total=k=>rows.reduce((a,r)=>a+(Number.isFinite(Number(r[k]))?Number(r[k]):0),0);
 const spend=total('spend'),forms=total('forms'),impressions=total('impressions');
 if(metric==='cpl')return forms>0?spend/forms:null;
 if(metric==='ctr')return impressions>0?total('clicks')/impressions*100:null;
 if(metric==='reach'){
  if(typeof opts.reachEstimator!=='function')return null;
  const estimate=opts.reachEstimator(rows.map(r=>Math.max(0,Number(r.reach)||0)),opts.universe||15000000);
  return estimate!==null&&estimate!==undefined&&Number.isFinite(Number(estimate))?Number(estimate):null;
 }
 return total(metric);
}
function compare(rows,metric,opts={}){
 if(!Array.isArray(rows)||!METRICS.has(metric))return {ok:false,reason:'invalid'};
 const filtered=rows.filter(r=>monthKey(r.month||r.date)&&asDay(r.date)!=null);
 const months=Array.from(new Set(filtered.map(r=>monthKey(r.month||r.date)))).sort();
 if(months.length<2)return {ok:false,reason:'missing-month',months,description:'Se necesitan registros diarios de al menos dos meses con los filtros actuales.'};
 const currentMonth=months[months.length-1],previousMonth=months[months.length-2];
 const currentRows=filtered.filter(r=>monthKey(r.month||r.date)===currentMonth);
 const latest=Math.max(...currentRows.map(r=>asDay(r.date)));
 const aligned=(month)=>filtered.filter(r=>monthKey(r.month||r.date)===month&&asDay(r.date)<=latest);
 const previousRows=aligned(previousMonth),nowRows=aligned(currentMonth);
 if(!previousRows.length||!nowRows.length)return {ok:false,reason:'missing-cutoff',months:[previousMonth,currentMonth],description:'No hay datos suficientes en ambos meses al mismo día de corte.'};
 const previous=value(metric,previousRows,opts),current=value(metric,nowRows,opts);
 const delta=previous==null||current==null?null:current-previous;
 const change=previous==null||previous===0||current==null?null:(current-previous)/Math.abs(previous)*100;
 const best=metric==='cpl'?'down':metric==='spend'?'neutral':'up';
 const favorable=change==null?'unknown':best==='neutral'?'neutral':change===0?'neutral':(best==='down'?change<0:change>0)?'positive':'negative';
 return {ok:true,metric,currentMonth,previousMonth,cutoffDay:latest,
  current,previous,delta,change,favorable,method:'same-calendar-day-mtd',
  currentRows:nowRows.length,previousRows:previousRows.length,
  description:'Compara registros disponibles del día 1 al '+latest+' en ambos meses. No completa días faltantes ni corrige atrasos de reporte.'};
}
const api={compare,value,METRICS:Array.from(METRICS)};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.CITROEN_PERIOD_COMPARE=api;
})(typeof window!=='undefined'?window:null);
