/* Citroën Studio: source-of-truth selection bridge.
   Native summary cards, KPI tiles and custom visuals share a single inspector.
   Avoid touching authorization, historical data or the builder's own card engine. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const enabled=()=>document.body.classList.contains('citroen-looker-edit')&&
 $('c3Dashboard')?.classList.contains('studio-edit-on')&&window.CITROEN_ACCESS?.canEdit?.()===true;
let lastKey='',lastAt=0;
function keyFromTarget(target){
 if(!(target instanceof Element))return null;
 const kpi=target.closest('#c3Kpis [data-metric-slot]');
 if(kpi)return 'k:'+kpi.dataset.metricSlot;
 const panel=target.closest('#studioCards .studio-card,#studioCards .c3-panel');
 if(!panel)return null;
 if(panel.classList.contains('studio-card'))return panel.dataset.id?'c:'+panel.dataset.id:null;
 return panel.id?'n:'+panel.id:null;
}
function selectKey(key,force=false){
 if(!enabled()||!key)return false;
 const api=window.CITROEN_METRIC_EDITOR;
 if(!api?.select)return false;
 const now=Date.now();
 if(!force&&key===lastKey&&now-lastAt<150)return true;
 lastKey=key;lastAt=now;
 api.select(key);
 document.body.classList.remove('le-show-data-panel');
 const host=$('metricInspector');if(host)host.hidden=false;
 const fields=document.querySelector('.le-fields-panel');
 if(fields)fields.setAttribute('aria-hidden','false');
 // Keep the original metric editor, not the blank page inspector, above the workspace.
 document.body.classList.toggle('le-native-selection',true);
 const properties=document.querySelector('.le-rail [data-do="focusproperties"]');
 if(properties)properties.classList.add('active');
 const data=document.querySelector('.le-rail [data-do="focusdata"]');
 if(data)data.classList.remove('active');
 const targetTitle=$('metricCurrent')?.textContent?.trim();
 const status=$('leToolbarStatus');
 if(status&&targetTitle)status.textContent='Editando: '+targetTitle+' · elige Datos, Estilo o Diseño a la derecha';
 document.querySelectorAll('#studioCards .c3-panel,#studioCards .studio-card,#c3Kpis [data-metric-slot]').forEach(el=>{
  const k=el.hasAttribute('data-metric-slot')?'k:'+el.dataset.metricSlot:
   el.classList.contains('studio-card')?'c:'+el.dataset.id:'n:'+el.id;
  el.classList.toggle('cit-studio-selected',k===key);
 });
 return true;
}
function onPick(event){
 if(!enabled())return;
 if(event.target.closest('#metricInspector,#leBuilderProperties,#lookerEditorShell'))return;
 const key=keyFromTarget(event.target);
 if(key)selectKey(key);
}
function deselect(){
 document.body.classList.remove('le-native-selection');
 document.querySelectorAll('.cit-studio-selected').forEach(el=>el.classList.remove('cit-studio-selected'));
 lastKey='';
}
function wire(){
 // Pointer Up captures taps on Safari/iPad even when an inner chart consumes click.
 document.addEventListener('pointerup',onPick,true);
 // Click and Enter/Space are fallbacks for accessibility and older pointer implementations.
 document.addEventListener('click',onPick,true);
 document.addEventListener('keydown',event=>{
  if(!enabled()||!['Enter',' '].includes(event.key))return;
  const key=keyFromTarget(event.target);
  if(key){event.preventDefault();selectKey(key,true)}
 },true);
 document.addEventListener('citroen:selection-changed',event=>{
  if(!enabled())return;
  const key=event.detail?.key;
  if(!key){deselect();return}
  lastKey=key;
  document.body.classList.add('le-native-selection');
  const host=$('metricInspector');if(host)host.hidden=false;
 },false);
 document.addEventListener('citroen:studio-layout',()=>{
  if(!enabled()){deselect();return}
  const key=window.CITROEN_METRIC_EDITOR?.getSelection?.();
  if(key)selectKey(key,true);
 },false);
 document.addEventListener('citroen:builder-page-changed',()=>{
  if(!enabled())deselect();
  else if(document.querySelector('.page-section.is-active')?.id!=='resumen')deselect();
 });
 document.getElementById('metricInspectorClose')?.addEventListener('click',deselect);
 window.CITROEN_STUDIO_SELECTION={select:selectKey,current:()=>window.CITROEN_METRIC_EDITOR?.getSelection?.()};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});
else wire();
})();