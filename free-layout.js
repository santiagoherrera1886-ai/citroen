/* Citroën 2026 | One freeform Summary canvas
 * Header, hero, context, ONE filter dock, 6 KPIs and all graph panels share
 * absolute coordinates. Legacy relative KPI / chart positions are migrated
 * once, and the layout is compatible with published summaryLayout.
 */
(function(){
'use strict';
const KEY='citroen_free_summary_layout_v1',$=id=>document?.getElementById?.(id);
const editing=()=>window.CITROEN_ACCESS?.canEdit()===true&&$('c3Dashboard')?.classList.contains('studio-edit-on')===true;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Math.round(Number(v)||0)));
const DEFAULT_KEYS=['b:header','b:hero','b:context','b:filters'];
let state={enabled:false,version:2,items:{}},busy=null,booted=false,selected=null;
try{
 const raw=JSON.parse(localStorage.getItem(KEY)||'null');
 if(raw&&typeof raw==='object'){
  // Legacy layouts could position KPI cards on top of the header.
  // Keep coordinates available but NEVER auto-enable free positioning after reload.
  state={enabled:false,version:raw.version===2?2:1,items:raw.items||{}};
 }
}catch{}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
const panels=()=>Array.from($('studioCards')?.children||[]).filter(el=>el.dataset.panelKey&&!el.hidden);
const kpis=()=>Array.from($('c3Kpis')?.querySelectorAll('[data-metric-slot]')||[]);
const fixed=()=>[document.querySelector('#c3DesignCanvas > .c3-header'),document.querySelector('#c3DesignCanvas > .c3-hero'),$('c3Context'),$('c3FilterDock')].filter(Boolean);
const all=()=>[...fixed(),...kpis(),...panels()];
function lookup(el){
 if(!el)return null;
 if(el.matches?.('.c3-header'))return 'b:header';
 if(el.matches?.('.c3-hero'))return 'b:hero';
 if(el.id==='c3Context')return 'b:context';
 if(el.id==='c3FilterDock')return 'b:filters';
 if(el.hasAttribute?.('data-metric-slot'))return 'k:'+el.dataset.metricSlot;
 return el.dataset?.panelKey||null;
}
function safePosition(el,board,fallback){
 const br=board.getBoundingClientRect(),r=el.getBoundingClientRect();
 return {x:clamp(r.width>50?r.left-br.left:fallback.x,0,2600),
  y:clamp(r.height>30?r.top-br.top:fallback.y,0,6800),
  w:clamp(r.width>80?r.width:fallback.w,170,1400),
  h:clamp(r.height>30?r.height:fallback.h,60,1100)};
}
function createSurface(){
 const dash=$('c3Dashboard');if(!dash)return;
 let canvas=$('c3DesignCanvas');
 if(canvas)return canvas;
 const header=dash.querySelector(':scope > .c3-header');
 const hero=dash.querySelector(':scope > .c3-hero');
 const context=$('c3Context'),legacy=$('lkGlobalFilters'),kp=$('c3Kpis'),charts=$('studioCards');
 if(!header||!hero||!context||!legacy||!kp||!charts)return;
 canvas=document.createElement('div');canvas.id='c3DesignCanvas';canvas.className='c3-design-canvas';
 dash.insertBefore(canvas,header);
 // Keep the editor toolbar outside the saved design, ABOVE the design canvas.
 const tools=$('studioTools');
 if(tools)dash.insertBefore(tools,canvas);
 canvas.append(header,hero,context);
 const filter=document.createElement('section');filter.id='c3FilterDock';filter.className='c3-filter-dock';
 filter.setAttribute('aria-label','Filtros del informe');
 filter.innerHTML='<div class="c3-filter-dock-title"><strong>Filtros del informe</strong><small>Al cambiar un filtro, se actualizan los KPIs y gráficos del Resumen.</small></div><div class="c3-filter-dock-content"><div id="c3NativeFilters" class="c3-native-filters"></div></div>';
 const native=filter.querySelector('#c3NativeFilters');
 const holder=filter.querySelector('.c3-filter-dock-content');
 for(const id of ['c3Month','c3Territory','c3Model']){
  const el=$(id),label=el?.closest('label');if(label)native.append(label);
 }
 holder.append(legacy);
 canvas.append(filter,kp,charts);
 return canvas;
}
function filterConsolidation(){
 const engine=window.CITROEN_FILTER_ENGINE;
 const defs=engine?.getDefinitions?.()||[];
 const enabled=defs.filter(d=>d.enabled&&(d.scope==='report'||d.pageId==='resumen'&&d.scope==='page'));
 const covered={
  c3Month:enabled.some(d=>['date','month'].includes(d.field)||(d.type==='relative'&&d.field==='date')),
  c3Territory:enabled.some(d=>d.field==='territory'),
  c3Model:enabled.some(d=>d.field==='model')
 };
 for(const [id,duplicate] of Object.entries(covered)){
  const select=$(id),label=select?.closest('label');
  if(!select||!label)continue;
  // The configurable control replaces the legacy control. Clearing the old value
  // prevents invisible double-filtering when the editor creates a new filter.
  if(duplicate&&select.value){select.value='';select.dispatchEvent(new Event('change',{bubbles:true}));}
  label.hidden=duplicate||window.CITROEN_BUILDER?.getFilterVisibility?.({c3Month:'month',c3Territory:'territory',c3Model:'model'}[id])===false;
  label.dataset.replacedByAdvanced=duplicate?'true':'false';
 }
 const native=$('c3NativeFilters');
 const advanced=$('lkGlobalFilters');
 const dock=$('c3FilterDock');
 if(dock) {
  const hasNative=!!native?.querySelector('label:not([hidden])');
  const hasAdvanced=!!advanced?.querySelector('.lk-control');
  dock.classList.toggle('c3-filter-empty',!hasNative&&!hasAdvanced);
 }
}
function basePositions(){
 const canvas=$('c3DesignCanvas');if(!canvas)return;
 const width=Math.max(1100,canvas.clientWidth||1200),inset=12;
 const map={
  'b:header':{x:0,y:0,w:width,h:95},
  'b:hero':{x:0,y:111,w:width,h:248},
  'b:context':{x:0,y:374,w:width,h:36},
  'b:filters':{x:0,y:427,w:width,h:112}
 };
 const kpW=(width-5*12)/6;
 for(let i=0;i<6;i++)map['k:'+i]={x:i*(kpW+12),y:559,w:kpW,h:142};
 let y=727;
 for(let i=0;i<panels().length;i++){
  const el=panels()[i],key=lookup(el);
  if(!key)continue;
  const w=i===0?Math.min(width,1180):Math.min((width-16)/2,570);
  const x=i===0?0:(i%2===1?0:w+16);
  map[key]={x,y,w,h:335};
  if(i===0||i%2===0)y+=352;
 }
 return map;
}
function initializePositions(){
 const canvas=$('c3DesignCanvas');if(!canvas)return;
 const fallback=basePositions(),rect=canvas.getBoundingClientRect();
 // Old saved KPI/chart coordinates were relative to separate grids. Translate
 // them into a single Summary coordinate system exactly once.
 if(state.version!==2){
  for(const node of [...kpis(),...panels()]){
   const key=lookup(node),old=state.items[key],parent=node.parentElement;
   if(!key||!old||!parent)continue;
   const box=parent.getBoundingClientRect();
   const offsetX=box.width?box.left-rect.left:fallback[key]?.x||0;
   const offsetY=box.height?box.top-rect.top:(key.startsWith('k:')?559:727);
   state.items[key]={...old,x:clamp(old.x+offsetX,0,2600),y:clamp(old.y+offsetY,0,6800)};
  }
  state.version=2;
 }
 for(const el of all()){
  const key=lookup(el);
  if(!key||state.items[key])continue;
  const guess=fallback[key]||{x:12,y:740,w:480,h:310};
  state.items[key]=safePosition(el,canvas,guess);
 }
 persist();
}
function clearElement(el){
 for(const field of ['left','top','width','height','position','zIndex'])el.style.removeProperty(field);
 el.querySelector(':scope > .citroen-free-resize')?.remove();
 el.querySelector(':scope > .c3-layout-grip')?.remove();
 el.classList.remove('le-pointer-selected');
}
function controls(el){
 if(!el.querySelector(':scope > .citroen-free-resize')){
  const corner=document.createElement('span');corner.className='citroen-free-resize';corner.title='Cambiar tamaño';corner.setAttribute('aria-hidden','true');el.append(corner);
 }
 if(lookup(el)?.startsWith('b:')&&!el.querySelector(':scope > .c3-layout-grip')){
  const handle=document.createElement('span');handle.className='c3-layout-grip';
  handle.textContent='⠿ Mover';handle.title='Arrastrar este bloque';handle.setAttribute('aria-label','Mover elemento del informe');
  el.append(handle);
 }
}
function apply(){
 const canvas=$('c3DesignCanvas');if(!canvas)return;
 // Report viewers and new sessions always see the stable responsive grid.
 const enabled=state.enabled&&editing();
 canvas.classList.toggle('c3-canvas-free',enabled);
 $('c3Kpis')?.classList.toggle('citroen-free-kpis',enabled);
 $('studioCards')?.classList.toggle('citroen-free-mode',enabled);
 if(enabled)initializePositions();
 let bottom=650;
 for(const el of all()){
  const key=lookup(el),p=state.items[key];
  if(enabled&&p){
   Object.assign(el.style,{position:'absolute',left:p.x+'px',top:p.y+'px',width:p.w+'px',height:p.h+'px'});
   bottom=Math.max(bottom,p.y+p.h+28);
   if(editing())controls(el);
   else{el.querySelector(':scope > .citroen-free-resize')?.remove();el.querySelector(':scope > .c3-layout-grip')?.remove();}
  }else clearElement(el);
  if(el.querySelector('.studio-drag'))el.querySelector('.studio-drag').draggable=false;
  el.classList.toggle('le-pointer-selected',enabled&&editing()&&selected===key);
 }
 canvas.style.minHeight=enabled?bottom+'px':'';
 const btn=$('studioFreeLayout');
 if(btn){btn.setAttribute('aria-pressed',String(enabled));btn.textContent=enabled?'▦ Volver a cuadrícula':'✥ Posicionamiento libre';}
 filterConsolidation();
}
function enable(){
 if(!editing())return;
 if(!state.enabled){
  // New free-mode session begins from currently rendered normal grid, not stale
  // absolute positions stored in a previous viewport (or a broken version).
  state.items={};state.version=2;
  initializePositions();state.enabled=true;persist();
 }
 apply();
}
function toggle(){
 if(!editing())return;
 if(state.enabled){state.enabled=false;persist();apply();}
 else enable();
}
const INTERACTIVE='button,select,input,textarea,a,[contenteditable="true"],[role="button"],[data-board-filter],.lk-control,.lk-native-filters,.citroen-free-resize';
function hit(target){
 const match=target?.closest?.('.c3-header,.c3-hero,#c3Context,#c3FilterDock,[data-metric-slot],[data-panel-key]');
 return match&&$('c3DesignCanvas')?.contains(match)?match:null;
}
function pointerStart(ev){
 if(!editing()||!state.enabled||busy||(ev.pointerType!=='touch'&&ev.button!==0))return;
 const el=hit(ev.target);if(!el)return;
 const resizing=!!ev.target.closest('.citroen-free-resize');
 const fromHandle=!!ev.target.closest('.c3-layout-grip');
 if(!resizing&&!fromHandle&&ev.target.closest(INTERACTIVE))return;
 const key=lookup(el),p=state.items[key];if(!p)return;
 selected=key;
 el.classList.add('le-pointer-selected');
 // Retain the inspector behavior of native KPI/chart objects.
 if(key.startsWith('k:')||key.startsWith('n:')||key.startsWith('c:')){
  if(!el.classList.contains('metric-selected'))el.click();
 }
 const initial={...p},before=exported(),sx=ev.clientX,sy=ev.clientY,scale=window.CITROEN_EDITOR_ZOOM||1;
 const peers=all().filter(n=>n!==el).map(n=>state.items[lookup(n)]).filter(Boolean);
 const assist=window.CITROEN_LAYOUT_HISTORY;
 let moved=false;
 function move(e){
  if(e.pointerId!==ev.pointerId)return;
  const dx=(e.clientX-sx)/scale,dy=(e.clientY-sy)/scale;
  if(!moved&&Math.hypot(dx,dy)<4)return;
  if(!moved){moved=true;document.body.classList.add('le-dragging');el.classList.add('le-direct-active');}
  const raw=resizing?{...initial,w:initial.w+dx,h:initial.h+dy}:{...initial,x:initial.x+dx,y:initial.y+dy};
  const result=assist?.snap(raw,peers,{mode:resizing?'resize':'move',bypass:e.altKey,grid:8,tolerance:7,gap:12})||raw;
  if(resizing){p.w=clamp(result.w,key.startsWith('k:')?174:230,1400);p.h=clamp(result.h,key.startsWith('k:')?115:60,1100);}
  else{p.x=clamp(result.x,0,2600);p.y=clamp(result.y,0,6800);}
  assist?.guides($('c3DesignCanvas'),result.guides||[]);
  Object.assign(el.style,{left:p.x+'px',top:p.y+'px',width:p.w+'px',height:p.h+'px'});
  $('c3DesignCanvas').style.minHeight=Math.max(650,...Object.values(state.items).map(x=>x.y+x.h+28))+'px';
  if(e.cancelable)e.preventDefault();
 }
 function finish(e){
  if(e.pointerId!==ev.pointerId)return;
  window.removeEventListener('pointermove',move);
  window.removeEventListener('pointerup',finish);
  window.removeEventListener('pointercancel',finish);
  assist?.guides($('c3DesignCanvas'),[]);
  if(e.type==='pointercancel'){state.items[key]={...initial};apply();}
  else if(moved){
   persist();assist?.record('summary',before,exported());
   document.dispatchEvent(new CustomEvent('citroen:layout-committed',{detail:{scope:'summary'}}));
  }
  document.body.classList.remove('le-dragging');el.classList.remove('le-direct-active');
  busy=null;
  if(moved){
   // Only suppress the actual post-drag click, not the next unrelated user action.
   const once=e2=>{
    const associated=e2.target===el||el.contains(e2.target);
    if(associated){e2.stopImmediatePropagation();e2.preventDefault();}
   };
   el.addEventListener('click',once,{capture:true,once:true});
  }
 }
 busy={element:el,key};
 window.addEventListener('pointermove',move,{passive:false});
 window.addEventListener('pointerup',finish);
 window.addEventListener('pointercancel',finish);
 if(resizing||fromHandle){ev.preventDefault();ev.stopPropagation();}
}
function exported(){return {enabled:state.enabled,version:2,items:JSON.parse(JSON.stringify(state.items))};}
function imported(value,{keepEnabled=false}={}){
 if(!value||typeof value!=='object')return;
 const items={};
 for(const [key,pos] of Object.entries(value.items||{})){
  if(!/^(?:[nck]:[\w-]{1,100}|b:(?:header|hero|context|filters))$/.test(key)||!pos||typeof pos!=='object')continue;
  items[key]={x:clamp(pos.x,0,2600),y:clamp(pos.y,0,6800),
   w:clamp(pos.w,170,1400),h:clamp(pos.h,60,1100)};
 }
 // Import coordinates for later manual editing; never apply an old free layout
 // just because it was published or saved by an earlier version.
 state={enabled:keepEnabled&&editing()&&value.enabled===true,version:value.version===2?2:1,items};
 selected=null;persist();apply();
}
function init(){
 if(booted)return;booted=true;
 const canvas=createSurface();if(!canvas)return;
 const assist=window.CITROEN_LAYOUT_HISTORY;
 assist?.bind('summary',exported,x=>{
  imported(x,{keepEnabled:true});document.dispatchEvent(new CustomEvent('citroen:layout-committed',{detail:{scope:'summary'}}));
 });
 assist?.bindNudge('summary',(dx,dy)=>{
  if(!editing()||!state.enabled)return false;
  const key=selected&&state.items[selected]?selected:window.CITROEN_METRIC_EDITOR?.selected?.();
  if(!key||!state.items[key])return false;
  const p=state.items[key],before=exported();
  p.x=clamp(p.x+dx,0,2600);p.y=clamp(p.y+dy,0,6800);
  if(!assist?.record('summary',before,exported()))return false;
  persist();apply();
  document.dispatchEvent(new CustomEvent('citroen:layout-committed',{detail:{scope:'summary'}}));
  return true;
 });
 const buttons=()=>{
  for(const [id,action] of [['studioUndoPosition','canUndo'],['studioRedoPosition','canRedo']]){
   const b=$(id);if(b)b.disabled=!editing()||!assist?.[action]('summary');
  }
 };
 $('studioUndoPosition')?.addEventListener('click',()=>assist?.undo('summary'));
 $('studioRedoPosition')?.addEventListener('click',()=>assist?.redo('summary'));
 $('studioFreeLayout')?.addEventListener('click',toggle);
 canvas.addEventListener('pointerdown',pointerStart);
 document.addEventListener('citroen:layout-history',buttons);
 document.addEventListener('citroen:studio-layout',()=>{
  // Explicit user intent is required to activate absolute positioning.
  // Simply clicking Editar resumen must not rearrange the entire report.
  if(!editing()&&state.enabled){state.enabled=false;persist();}
  apply();buttons();
 });
 document.addEventListener('citroen:summary-rendered',apply);
 document.addEventListener('citroen:advanced-filter-changed',filterConsolidation);
 document.addEventListener('citroen:filter-definitions-loaded',filterConsolidation);
 window.addEventListener('resize',()=>{if(state.enabled&&editing()){state.enabled=false;persist();apply();}else apply();});
 if(typeof MutationObserver!=='undefined'){
  let queued=false;
  const redraw=()=>{
   if(queued)return;queued=true;
   Promise.resolve().then(()=>{queued=false;if(document?.documentElement&&state.enabled&&editing())apply();});
  };
  if($('c3Kpis'))new MutationObserver(redraw).observe($('c3Kpis'),{childList:true});
  if($('studioCards'))new MutationObserver(redraw).observe($('studioCards'),{childList:true});
 }
 filterConsolidation();apply();buttons();
}
window.CITROEN_FREE_LAYOUT={export:exported,import:imported,apply,enable};
document.addEventListener('DOMContentLoaded',init);
})();