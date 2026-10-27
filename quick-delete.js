/* Quick delete for only user-created charts. Delete is a local draft until Publish. */
(function(){
'use strict';
let current=null,timer=0;
const $=id=>document.getElementById(id);
const editing=()=>window.CITROEN_ACCESS?.canEdit?.()===true&&$('c3Dashboard')?.classList.contains('studio-edit-on');
function close(){
 if(timer){clearTimeout(timer);timer=0;}
 if(current?.el)current.el.remove();
 current=null;
}
function offer(label,undo){
 close();
 if(!editing()||typeof undo!=='function')return;
 const root=document.createElement('div');
 root.className='citroen-delete-toast';
 root.setAttribute('role','status');
 root.setAttribute('aria-live','polite');
 const message=document.createElement('span');
 message.textContent='«'+String(label||'Gráfico').slice(0,90)+'» eliminado del borrador.';
 const restore=document.createElement('button');
 restore.type='button';restore.className='citroen-delete-undo';restore.textContent='↶ Deshacer';
 restore.setAttribute('aria-label','Deshacer eliminación');
 const dismiss=document.createElement('button');
 dismiss.type='button';dismiss.className='citroen-delete-dismiss';dismiss.textContent='×';
 dismiss.setAttribute('aria-label','Cerrar mensaje');
 const item={el:root,undo};
 restore.addEventListener('click',()=>{
  if(current!==item||!editing())return;
  const ok=undo();
  close();
  if(ok===false)return;
 });
 dismiss.addEventListener('click',close);
 root.append(message,restore,dismiss);
 document.body.appendChild(root);
 current=item;
 timer=setTimeout(close,12000);
}
function shortcut(event){
 if(!editing()||event.key!=='Delete'&&event.key!=='Backspace'||event.altKey||event.ctrlKey||event.metaKey)return;
 if(event.target?.closest?.('input,textarea,select,button,a,[contenteditable="true"],[role="textbox"]'))return;
 const page=window.CITROEN_BUILDER?.getCurrentPage?.()||'resumen';
 let result=false;
 if(page.startsWith('report-')){
  const id=window.CITROEN_BUILDER?.getSelectedCardId?.();
  if(id)result=window.CITROEN_BUILDER?.removeCard?.(page.slice(7),id);
 }else if(page==='resumen'){
  const key=window.CITROEN_METRIC_EDITOR?.selected?.();
  if(key?.startsWith('c:'))result=window.CITROEN_STUDIO_ACTIONS?.deleteCustom?.(key);
 }
 if(result){event.preventDefault();event.stopPropagation();}
}
document.addEventListener('keydown',shortcut,true);
document.addEventListener('citroen:studio-layout',()=>{if(!editing())close();});
window.CITROEN_QUICK_DELETE={offer,close};
})();