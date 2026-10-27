/* Citroën Studio — direct manipulation of native graphs AND KPI cards.
   Drag the selected object itself (no extra grip required), resize from its corner,
   and share positions through the existing published summaryLayout object. */
(function(){
'use strict';
const KEY='citroen_free_summary_layout_v1',$=id=>document.getElementById(id);
const editing=()=>window.CITROEN_ACCESS?.canEdit()===true&&$('c3Dashboard')?.classList.contains('studio-edit-on')===true;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Math.round(Number(v)||0)));
let state={enabled:false,items:{}},busy=null,booted=false;
try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw&&typeof raw==='object')state={enabled:raw.enabled===true,items:raw.items||{}};}catch{}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}};
const panels=()=>Array.from($('studioCards')?.children||[]).filter(el=>el.dataset.panelKey&&!el.hidden);
const kpis=()=>Array.from($('c3Kpis')?.querySelectorAll('[data-metric-slot]')||[]);
const lookup=(node)=>node?.dataset?.panelKey|| (node?.hasAttribute('data-metric-slot')?'k:'+node.dataset.metricSlot:null);
const rectPosition=(el,container,fallback)=>{
 const parent=container.getBoundingClientRect(),box=el.getBoundingClientRect();
 return {
  x:clamp(box.width>30?box.left-parent.left:fallback.x,0,2600),
  y:clamp(box.height>30?box.top-parent.top:fallback.y,0,6800),
  w:clamp(box.width>80?box.width:fallback.w,170,1400),
  h:clamp(box.height>60?box.height:fallback.h,100,1100)
 };
};
function initialPanels(){
 const board=$('studioCards');if(!board)return;
 const width=Math.max(1180,board.clientWidth||1250),nodes=panels();
 let fallbackY=16;
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i],key=lookup(node);
  if(state.items[key])continue;
  const cols=Number((node.style.gridColumn||'').replace(/\D/g,''))||3;
  const approximateW=clamp(Math.round((width-12*5)*cols/6),270,1240);
  const position=rectPosition(node,board,{x:(i%2)*(approximateW+12)+14,y:fallbackY,w:approximateW,h:node.id==='c3ComparePanel'||node.id==='c3FunnelPanel'?360:310});
  state.items[key]=position;
  if(i%2===1)fallbackY+=Math.max(position.h,330)+18;
 }
}
function initialKPIs(){
 const board=$('c3Kpis');if(!board)return;
 const width=Math.max(1180,board.clientWidth||1250),all=kpis(),gap=12,w=(width-gap*5)/6;
 for(let i=0;i<all.length;i++){
  const key=lookup(all[i]);if(state.items[key])continue;
  state.items[key]=rectPosition(all[i],board,{x:i*(w+gap),y:0,w,h:135});
 }
}
function clearElement(el){
 for(const name of ['left','top','width','height','position','zIndex'])el.style.removeProperty(name);
 el.querySelector(':scope > .citroen-free-resize')?.remove();
 el.classList.remove('le-pointer-selected');
}
function clearLayout(container,elements){
 container?.classList.remove('citroen-free-mode','citroen-free-kpis');
 if(container)container.style.removeProperty('minHeight');
 for(const el of elements)clearElement(el);
}
function applyContainer(container,nodes,kind){
 if(!container)return;
 const active=state.enabled;
 container.classList.toggle(kind==='kpi'?'citroen-free-kpis':'citroen-free-mode',active);
 if(!active){clearLayout(container,nodes);return;}
 let bottom=kind==='kpi'?150:650;
 for(const el of nodes){
  const k=lookup(el),p=state.items[k];
  if(!p)continue;
  el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.width=p.w+'px';el.style.height=p.h+'px';
  el.style.position='absolute';bottom=Math.max(bottom,p.y+p.h+26);
  const old=el.querySelector(':scope > .citroen-free-resize');
  if(editing()){
   if(!old){
    const h=document.createElement('span');h.className='citroen-free-resize';
    h.title='Arrastra para cambiar el tamaño';h.setAttribute('aria-hidden','true');el.appendChild(h);
   }
  }else old?.remove();
  const grip=el.querySelector('.studio-drag');if(grip)grip.draggable=false;
 }
 container.style.minHeight=bottom+'px';
}
function apply(){
 const board=$('studioCards'),kp=$('c3Kpis');
 if(!board||!kp)return;
 if(state.enabled){initialPanels();initialKPIs();}
 applyContainer(board,panels(),'panels');
 applyContainer(kp,kpis(),'kpi');
 const btn=$('studioFreeLayout');
 if(btn){
  btn.setAttribute('aria-pressed',String(state.enabled));
  btn.textContent=state.enabled?'▦ Restablecer cuadrícula':'✥ Activar posicionamiento libre';
 }
}
function enable(){
 if(!editing())return;
 if(state.enabled){apply();return;}
 state.enabled=true;
 // Measure against the natural 6-column grid before setting absolute positions.
 initialPanels();initialKPIs();
 persist();apply();
}
function toggle(){
 if(!editing())return;
 if(state.enabled){
  state.enabled=false;persist();apply();
 }else enable();
}
function editableHit(node,container){
 const el=node?.closest?.(container.id==='c3Kpis'?'[data-metric-slot]':'.c3-panel,.studio-card');
 return el&&container.contains(el)?el:null;
}
const INTERACTIVE='button,select,input,textarea,a,[contenteditable="true"],[role="button"],[data-board-filter],.lk-control,.lk-native-filters,.citroen-free-resize';
const isInteractive=t=>!!t?.closest?.(INTERACTIVE);
function pointerStart(ev,container){
 if(!editing()||!state.enabled||busy)return;
 if(ev.pointerType!=='touch'&&ev.button!==0)return;
 const el=editableHit(ev.target,container);
 if(!el)return;
 const handle=ev.target.closest('.citroen-free-resize');
 if(!handle&&isInteractive(ev.target))return;
 const key=lookup(el),p=state.items[key];
 if(!p)return;
 // Match Looker: pointer-down selects immediately; dragging keeps that selection.
 if(!el.classList.contains('metric-selected'))el.click();
 const resize=!!handle,initial={...p},before=exported(),start={x:ev.clientX,y:ev.clientY},scale=window.CITROEN_EDITOR_ZOOM||1;
 const peers=(container.id==='c3Kpis'?kpis():panels()).filter(n=>n!==el).map(n=>state.items[lookup(n)]).filter(Boolean);
 const assist=window.CITROEN_LAYOUT_HISTORY;
 let moved=false;
 // Normal clicks are intentionally left alone: metric-editor.js selects that card.
 function movement(e){
  if(e.pointerId!==ev.pointerId)return;
  const dx=(e.clientX-start.x)/scale,dy=(e.clientY-start.y)/scale;
  if(!moved&&Math.hypot(dx,dy)<5)return;
  if(!moved){
   moved=true;document.body.classList.add('le-dragging');
   el.classList.add('le-direct-active');
   if(e.cancelable)e.preventDefault();
  }
  const raw=resize
   ?{...initial,w:initial.w+dx,h:initial.h+dy}
   :{...initial,x:initial.x+dx,y:initial.y+dy};
  const aligned=assist?.snap(raw,peers,{mode:resize?'resize':'move',bypass:e.altKey,grid:8,tolerance:7,gap:12})||raw;
  if(resize){
   p.w=clamp(aligned.w,container.id==='c3Kpis'?174:280,1400);
   p.h=clamp(aligned.h,container.id==='c3Kpis'?115:190,1100);
  }else{
   p.x=clamp(aligned.x,0,2600);p.y=clamp(aligned.y,0,6800);
  }
  assist?.guides(container,aligned.guides||[]);
  Object.assign(el.style,{left:p.x+'px',top:p.y+'px',width:p.w+'px',height:p.h+'px'});
  container.style.minHeight=Math.max(container.id==='c3Kpis'?150:650,...(container.id==='c3Kpis'?kpis():panels()).map(n=>{
   const v=state.items[lookup(n)];return v?v.y+v.h+27:0;
  }))+'px';
 }
 function finish(e){
  if(e.pointerId!==ev.pointerId)return;
  window.removeEventListener('pointermove',movement);
  window.removeEventListener('pointerup',finish);
  window.removeEventListener('pointercancel',finish);
  assist?.guides(container,[]);
  if(moved){
   if(e.type==='pointercancel')state.items[key]={...initial};
   else{persist();assist?.record('summary',before,exported());document.dispatchEvent(new CustomEvent('citroen:layout-committed',{detail:{scope:'summary'}}));}
   document.body.classList.remove('le-dragging');el.classList.remove('le-direct-active');
   // Keep native card selected and suppress the click emitted after a drag.
   const cancelClick=click=>{if(click.target===el||el.contains(click.target)){click.preventDefault();click.stopImmediatePropagation();}};
   document.addEventListener('click',cancelClick,{capture:true,once:true});
  }
  busy=null;if(e.type==='pointercancel')apply();
 }
 busy={element:el,key};
 window.addEventListener('pointermove',movement,{passive:false});
 window.addEventListener('pointerup',finish);
 window.addEventListener('pointercancel',finish);
 if(resize){ev.preventDefault();ev.stopPropagation();}
}
function exported(){return {enabled:state.enabled,items:JSON.parse(JSON.stringify(state.items))};}
function imported(data){
 if(!data||typeof data!=='object')return;
 const items={};
 for(const [key,pos]of Object.entries(data.items||{})){
  if(!/^[nck]:[\w-]{1,100}$/.test(key)||!pos||typeof pos!=='object')continue;
  items[key]={
   x:clamp(pos.x,0,2600),y:clamp(pos.y,0,6800),
   w:clamp(pos.w,170,1400),h:clamp(pos.h,100,1100)
  };
 }
 state={enabled:data.enabled===true,items};
 persist();apply();
}
function init(){
 if(booted)return;booted=true;
 const h=window.CITROEN_LAYOUT_HISTORY;
 h?.bind('summary',exported,data=>{imported(data);document.dispatchEvent(new CustomEvent('citroen:layout-committed',{detail:{scope:'summary'}}));});
 h?.bindNudge('summary',(dx,dy)=>{
  if(!editing()||!state.enabled)return false;
  const key=window.CITROEN_METRIC_EDITOR?.selected?.();
  if(!key||!state.items[key])return false;
  const p=state.items[key],before=exported(),maxX=2600,maxY=6800;
  p.x=clamp(p.x+dx,0,maxX);p.y=clamp(p.y+dy,0,maxY);
  if(!h.record('summary',before,exported()))return false;
  persist();apply();
  document.dispatchEvent(new CustomEvent('citroen:layout-committed',{detail:{scope:'summary'}}));
  return true;
 });
 const updateHistory=()=>{
  for(const [id,act] of [['studioUndoPosition','canUndo'],['studioRedoPosition','canRedo']]){
   const el=$(id);if(el)el.disabled=!editing()||!h?.[act]('summary');
  }
 };
 $('studioUndoPosition')?.addEventListener('click',()=>h?.undo('summary'));
 $('studioRedoPosition')?.addEventListener('click',()=>h?.redo('summary'));
 document.addEventListener('citroen:layout-history',updateHistory);
 document.addEventListener('citroen:studio-layout',updateHistory);
 updateHistory();
 $('studioFreeLayout')?.addEventListener('click',toggle);
 for(const id of ['studioCards','c3Kpis'])$(id)?.addEventListener('pointerdown',e=>pointerStart(e,$(id)));
 document.addEventListener('citroen:studio-layout',()=>{
  if(editing()&&!state.enabled)enable();
  else apply();
 });
 document.addEventListener('citroen:summary-rendered',apply);
 window.addEventListener('resize',()=>{if(state.enabled)apply();});
 if(typeof MutationObserver!=='undefined'){
  let queued=false;
  const redraw=()=>{
   if(queued)return;queued=true;
   Promise.resolve().then(()=>{queued=false;if(state.enabled)apply();});
  };
  // Only observe direct added KPI cards; mutations of style attributes must not loop.
  const kp=$('c3Kpis');if(kp)new MutationObserver(redraw).observe(kp,{childList:true});
 }
 apply();
}
window.CITROEN_FREE_LAYOUT={export:exported,import:imported,apply,enable};
document.addEventListener('DOMContentLoaded',init);
})();