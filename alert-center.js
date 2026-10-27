/* Citroën alert center - reader view + authenticated rule editing. */
(function(){
'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let rows=[],rules=[],onChange=()=>{},ready=false;
const canEdit=()=>window.CITROEN_ACCESS?.canEdit?.()&&$('c3Dashboard')?.classList.contains('studio-edit-on');
const fieldNames={cpl:'CPL',ctr:'CTR',spend:'Inversión',forms:'Formularios',messages:'Conversaciones'};
function format(v,m){if(v==null)return 'No disponible';return (m==='spend'||m==='cpl'?'$ ':'')+new Intl.NumberFormat('es-CO',{maximumFractionDigits:m==='ctr'?2:0}).format(v)+(m==='ctr'?' %':'');}
function mount(container){if(!container)return;container.innerHTML='<div class="alert-hub-head"><h3>Centro de alertas</h3><p>Monitorea las métricas del último mes presente en los registros de Meta Ads. Las reglas se publican para que todo el equipo pueda consultarlas.</p></div><div class="alert-hub-actions"><button id="alertAdd" type="button" hidden>＋ Nueva regla</button><small>Los avisos se calculan al abrir el dashboard; no son notificaciones automáticas.</small></div><div id="alertList" class="alert-hub-grid"></div><p class="alert-hub-footnote">Los resultados corresponden a las fechas realmente cargadas. Un mes incompleto no equivale al cierre mensual. Sin formularios o impresiones suficientes, CPL y CTR no se calculan.</p>';render();}
function setRows(next){rows=Array.isArray(next)?next:[];render();}
function setRules(next){rules=(Array.isArray(next)?next:[]).map(r=>window.CITROEN_ALERT_ENGINE?.validate(r)).filter(Boolean).slice(0,35);render();}
function configure(change){onChange=typeof change==='function'?change:()=>{};}
function saveRule(old){
 if(!canEdit())return;
 const title=prompt('Nombre de la alerta',old?.title||'Control de CPL');if(title===null)return;
 const metric=prompt('Métrica: cpl, ctr, spend, forms, messages',old?.metric||'cpl');if(metric===null)return;
 const operator=prompt('Condición: gt (mayor que) o lt (menor que)',old?.operator||'gt');if(operator===null)return;
 const threshold=prompt('Umbral numérico',old?.threshold??70000);if(threshold===null)return;
 const candidate=window.CITROEN_ALERT_ENGINE?.validate({id:old?.id||'rule-'+Date.now().toString(36),title,metric:metric.trim().toLowerCase(),operator:operator.trim().toLowerCase(),threshold,model:old?.model||'',territory:old?.territory||'',enabled:true});
 if(!candidate){alert('Métrica, condición o umbral inválidos. No se guardó la regla.');return;}
 if(old)rules=rules.map(x=>x.id===old.id?candidate:x);else{if(rules.length>=35)return alert('Máximo 35 reglas.');rules.push(candidate);}
 onChange(rules.map(x=>({...x})));render();
}
function render(){
 const container=$('alertList');if(!container)return;
 const results=window.CITROEN_ALERT_ENGINE?.evaluate(rows,rules)||[];
 const add=$('alertAdd');if(add){add.hidden=!canEdit();add.onclick=()=>saveRule();}
 if(!results.length){container.innerHTML='<div class="builder-empty-page">No hay reglas publicadas todavía. Entra a Diseño para crear controles de CPL, CTR, inversión y resultados.</div>';return;}
 container.replaceChildren();
 for(const rule of results){
  const article=document.createElement('article');article.className='alert-rule alert-'+rule.status;
  article.innerHTML='<div class="alert-rule-top"><strong>'+esc(rule.title)+'</strong><span>'+({alert:'Supera umbral',ok:'Dentro del umbral','no-data':'Sin datos',disabled:'Desactivada'}[rule.status]||rule.status)+'</span></div><div class="alert-rule-value">'+format(rule.result,rule.metric)+'</div><div class="alert-rule-target">'+esc(fieldNames[rule.metric])+' '+(rule.operator==='gt'?'mayor que ':'menor que ')+format(rule.threshold,rule.metric)+'</div><small>Período '+esc(rule.month||'sin fecha')+' · '+rule.records+' registros</small>';
  if(canEdit()){
   const box=document.createElement('div');box.className='alert-rule-controls';
   const edit=document.createElement('button');edit.textContent='Editar';edit.onclick=()=>saveRule(rule);
   const remove=document.createElement('button');remove.textContent='Eliminar';remove.onclick=()=>{if(!confirm('¿Eliminar esta regla?'))return;rules=rules.filter(x=>x.id!==rule.id);onChange(rules.map(x=>({...x})));render();};
   box.append(edit,remove);article.append(box);
  }
  container.append(article);
 }
}
window.CITROEN_ALERT_CENTER={mount,setRows,setRules,configure,render};
})();
