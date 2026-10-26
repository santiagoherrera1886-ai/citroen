/* Optional true freeform positioning of Resumen panels. Never changes source metrics. */
(function(){
'use strict';
const KEY='citroen_free_summary_layout_v1',$=id=>document.getElementById(id);
const editing=()=>window.CITROEN_ACCESS?.canEdit()&&$('c3Dashboard')?.classList.contains('studio-edit-on');
let state={enabled:false,items:{}},installed=new WeakSet();
try{const o=JSON.parse(localStorage.getItem(KEY)||'null');if(o&&typeof o==='object')state={enabled:!!o.enabled,items:o.items||{}};}catch{}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
const bounded=(n,min,max)=>Math.max(min,Math.min(max,Math.round(Number(n)||0)));
function nodes(){return Array.from($('studioCards')?.children||[]).filter(el=>el.dataset.panelKey&&!el.hidden);}
function autoLayout(){
 const base=$('studioCards'),rect=base.getBoundingClientRect(),size=base.clientWidth||1180;
 let ix=0,iy=12,rowHeight=0;
 for(const el of nodes()){
  const k=el.dataset.panelKey;if(state.items[k])continue;
  const a=el.getBoundingClientRect(),span=Number((el.style.gridColumn||'').replace(/\D/g,''))||3;
  const w=a.width>100?a.width:Math.min(700,Math.round(size*span/6)-12);
  const h=a.height>100?a.height:el.id==='c3ComparePanel'?365:el.id==='c3FunnelPanel'?365:285;
  let x=a.width>100&&rect.width>0?a.left-rect.left:ix,y=a.height>100&&rect.height>0?a.top-rect.top:iy;
  if(a.width<=100||rect.width===0){if(x+w>size){ix=0;iy+=rowHeight+15;rowHeight=0;}x=ix;y=iy;ix+=w+15;rowHeight=Math.max(rowHeight,h);}
  state.items[k]={x:bounded(x,0,2200),y:bounded(y,0,6000),w:bounded(w,240,1300),h:bounded(h,170,1000)};
 }
 persist();
}
function apply(){
 const canvas=$('studioCards');if(!canvas)return;
 const btn=$('studioFreeLayout');
 if(btn){btn.setAttribute('aria-pressed',String(state.enabled));btn.textContent=state.enabled?'▦ Volver a cuadrícula':'↔ Mover libremente';}
 if(!state.enabled){
  canvas.classList.remove('citroen-free-mode');
  canvas.style.minHeight='';
  for(const el of nodes()){
   el.style.removeProperty('left');el.style.removeProperty('top');el.style.removeProperty('width');el.style.removeProperty('height');
   const grip=el.querySelector('.studio-drag');if(grip)grip.draggable=editing();
   el.querySelector('.citroen-free-resize')?.remove();
  }
  return;
 }
 if(!Object.keys(state.items).length)autoLayout();
 canvas.classList.add('citroen-free-mode');
 let bottom=640;
 for(const el of nodes()){
  const k=el.dataset.panelKey;
  if(!state.items[k]){autoLayout();}
  const pos=state.items[k];if(!pos)continue;
  for(const [style,v] of [['left',pos.x],['top',pos.y],['width',pos.w],['height',pos.h]])el.style[style]=v+'px';
  bottom=Math.max(bottom,pos.y+pos.h+35);
  const grip=el.querySelector('.studio-drag');
  if(grip)grip.draggable=false;
  let resize=el.querySelector('.citroen-free-resize');
  if(!resize){resize=document.createElement('span');resize.className='citroen-free-resize';resize.title='Cambiar tamaño libremente';el.appendChild(resize);}
  resize.hidden=!editing();
  if(grip)bind(el,grip,'move');
  bind(el,resize,'size');
 }
 canvas.style.minHeight=bottom+'px';
}
function bind(el,handle,mode){
 if(!handle||installed.has(handle))return;
 installed.add(handle);handle.style.touchAction='none';
 handle.addEventListener('pointerdown',e=>{
  if(!state.enabled||!editing()||(e.button!==0&&e.pointerType!=='touch'))return;
  e.preventDefault();e.stopPropagation();
  const k=el.dataset.panelKey,start=state.items[k];if(!start)return;
  const init={...start},sx=e.clientX,sy=e.clientY;
  handle.setPointerCapture?.(e.pointerId);
  const move=ev=>{
   const dx=ev.clientX-sx,dy=ev.clientY-sy;
   if(mode==='move'){start.x=bounded(init.x+dx,0,2200);start.y=bounded(init.y+dy,0,6000);}
   else{start.w=bounded(init.w+dx,240,1300);start.h=bounded(init.h+dy,170,1000);}
   el.style.left=start.x+'px';el.style.top=start.y+'px';el.style.width=start.w+'px';el.style.height=start.h+'px';
   $('studioCards').style.minHeight=Math.max(650,...Object.values(state.items).map(x=>x.y+x.h+35))+'px';
  };
  const end=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);persist();};
  handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end,{once:true});handle.addEventListener('pointercancel',end,{once:true});
 });
}
function toggle(){
 if(!editing())return;
 if(!state.enabled){
  state.items={};autoLayout();state.enabled=true;
 }else state.enabled=false;
 persist();apply();
}
function exportData(){return {enabled:!!state.enabled,items:JSON.parse(JSON.stringify(state.items))};}
function importData(other){
 if(!other||typeof other!=='object')return;
 const items={};
 for(const [key,v] of Object.entries(other.items||{})){
  if(!/^[nc]:[\w-]{1,100}$/.test(key)||!v||typeof v!=='object')continue;
  items[key]={x:bounded(v.x,0,2200),y:bounded(v.y,0,6000),w:bounded(v.w,240,1300),h:bounded(v.h,170,1000)};
 }
 state={enabled:!!other.enabled,items};persist();apply();
}
function wire(){
 const btn=$('studioFreeLayout');if(!btn)return;
 btn.onclick=toggle;
 document.addEventListener('citroen:studio-layout',apply);
 window.addEventListener('resize',()=>{if(state.enabled)apply();});
 apply();
}
window.CITROEN_FREE_LAYOUT={export:exportData,import:importData,apply};
document.addEventListener('DOMContentLoaded',wire);
})();