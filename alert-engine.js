/* Citroën performance alert rules — pure, no fabricated data or unique-reach summation. */
(function(root){
'use strict';
const allowed={cpl:'CPL',ctr:'CTR de enlace',spend:'Inversión',forms:'Formularios',messages:'Conversaciones'};
const operators=new Set(['gt','lt']);
function calculate(rows,metric){
 if(!allowed[metric]||!Array.isArray(rows)||!rows.length)return null;
 const sum=f=>rows.reduce((a,r)=>a+(Number.isFinite(Number(r[f]))?Math.max(0,Number(r[f])):0),0);
 const spend=sum('spend'),forms=sum('forms'),impressions=sum('impressions');
 if(metric==='cpl')return forms>0?spend/forms:null;
 if(metric==='ctr')return impressions>0?100*sum('clicks')/impressions:null;
 return sum(metric);
}
function validate(rule){
 if(!rule||typeof rule!=='object')return null;
 const metric=rule.metric,operator=rule.operator,threshold=Number(rule.threshold);
 if(!allowed[metric]||!operators.has(operator)||!Number.isFinite(threshold)||threshold<0||threshold>1e12)return null;
 return {id:typeof rule.id==='string'&&/^[\w-]{3,80}$/.test(rule.id)?rule.id:'rule-default',
  title:String(rule.title||allowed[metric]).slice(0,90),metric,operator,threshold,
  model:String(rule.model||'').slice(0,80),territory:String(rule.territory||'').slice(0,80),enabled:rule.enabled!==false};
}
function evaluate(rows,rules,options={}){
 const validRows=(Array.isArray(rows)?rows:[]).filter(r=>r&&typeof r.date==='string');
 const allDates=validRows.map(r=>r.date).sort(),latest=allDates.at(-1)||null;
 const month=options.month||latest?.slice(0,7)||null;
 return (Array.isArray(rules)?rules:[]).map(raw=>{
  const rule=validate(raw);if(!rule)return null;
  const selected=validRows.filter(r=>r.date.startsWith(month||'____')&&(!rule.model||r.model===rule.model)&&(!rule.territory||r.territory===rule.territory));
  const result=calculate(selected,rule.metric);
  const triggered=result!=null&&(rule.operator==='gt'?result>rule.threshold:result<rule.threshold);
  return {...rule,status:!rule.enabled?'disabled':result==null?'no-data':triggered?'alert':'ok',
   result,month,records:selected.length,latestDate:selected.map(r=>r.date).sort().at(-1)||null};
 }).filter(Boolean);
}
const api={allowed,calculate,validate,evaluate};
root.CITROEN_ALERT_ENGINE=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:{});
