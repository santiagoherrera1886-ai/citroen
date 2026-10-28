/* Citroën editor auth. All credential checking happens in the server routes. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let user=null,opening=false;
const ui={login:'citroenAuthModal',master:'citroenMasterModal'};
function status(id,text,isError=false){const el=$(id);if(el){el.textContent=text;el.classList.toggle('error',isError);}}
function open(id){$(id).hidden=false;$(id).querySelector('input')?.focus();}
function close(id){$(id).hidden=true;}
function publicState(){
 document.dispatchEvent(new Event('citroen:auth-changed'));
 $('citroenMasterOpen').hidden=!(user&&user.role==='owner'&&!user.mustChange);
 $('studioEdit').hidden=!(user&&!user.mustChange);
 const entry=$('citroenSidebarLogin');if(entry){entry.hidden=!!(user&&!user.mustChange);entry.textContent=user?.mustChange?'Completar seguridad':'Ingresar a Diseño';}
 $('citroenAuthLogout').hidden=!user;
 $('citroenMasterIdentity').textContent=user?user.email:'';
}
async function request(url,method='GET',body){
 const headers=method==='POST'?{'Content-Type':'application/json'}:{};
 const res=await fetch(url,{method,headers,credentials:'same-origin',cache:'no-store',...(body?{body:JSON.stringify(body)}:{})});
 let data;try{data=await res.json();}catch{data={error:'El servidor respondió sin datos.'};}
 if(!res.ok)throw new Error(data.error||'No fue posible completar la operación.');
 return data;
}
async function refresh(){
 try{
  const result=await request('/api/auth');
  user=result.authenticated?result.user:null;
 }catch{user=null;}
 publicState();return user;
}
function showLogin(){
 $('citroenAuthLoginPane').hidden=false;
 $('citroenAuthChangePane').hidden=true;
 $('citroenActivatePane').hidden=true;
 $('citroenAuthTitle').textContent='Acceso al modo Diseño';
 status('citroenAuthStatus','');
 open(ui.login);
}
function showActivate(){
 $('citroenAuthLoginPane').hidden=true;
 $('citroenAuthChangePane').hidden=true;
 $('citroenActivatePane').hidden=false;
 $('citroenAuthTitle').textContent='Activación del control maestro';
 status('citroenAuthStatus','Utiliza tu correo, la contraseña inicial y el código de activación privado.');
 open(ui.login);
}
async function activate(e){
 e.preventDefault();
 const f=e.currentTarget,data=new FormData(f);
 status('citroenAuthStatus','Activando cuenta de administrador…');
 try{
  const res=await request('/api/auth','POST',{action:'activate',email:data.get('email'),password:data.get('password'),activationCode:data.get('activationCode')});
  f.reset();user=res.user;publicState();showChange();
 }catch(ex){status('citroenAuthStatus',ex.message,true);}
}
function showChange(){
 $('citroenAuthLoginPane').hidden=true;
 $('citroenActivatePane').hidden=true;
 $('citroenAuthChangePane').hidden=false;
 $('citroenAuthTitle').textContent='Protege tu cuenta de administrador';
 status('citroenAuthStatus','La contraseña inicial debe cambiarse antes de entrar a Diseño.');
 open(ui.login);
}
function unlock(){
 if(!user||user.mustChange)return false;
 if(typeof window.CITROEN_STUDIO_UNLOCK!=='function'){status('citroenAuthStatus','El editor todavía no cargó. Actualiza la página.',true);return false;}
 window.CITROEN_STUDIO_UNLOCK();
 close(ui.login);return true;
}
async function requestEdit(){
 if(opening)return false;
 opening=true;
 try{
  const latest=await request('/api/auth');user=latest.authenticated?latest.user:null;publicState();
  if(user?.mustChange){showChange();return false;}
  if(user)return unlock();
  showLogin();return false;
 }catch(e){showLogin();status('citroenAuthStatus',e.message,true);return false;}
 finally{opening=false;}
}
async function login(e){
 e.preventDefault();
 const form=e.currentTarget,values=new FormData(form);
 status('citroenAuthStatus','Comprobando acceso…');
 try{
  const d=await request('/api/auth','POST',{action:'login',email:values.get('email'),password:values.get('password')});
  form.querySelector('[name="password"]').value='';
  user=d.user;publicState();
  if(user.mustChange){showChange();return;}
  unlock();
 }catch(ex){status('citroenAuthStatus',ex.message,true);}
}
async function changePassword(e){
 e.preventDefault();
 const form=e.currentTarget,d=new FormData(form);
 status('citroenAuthStatus','Guardando nueva contraseña…');
 try{
  const answer=await request('/api/auth','POST',{action:'change-password',currentPassword:d.get('currentPassword'),newPassword:d.get('newPassword')});
  user=answer.user;form.reset();publicState();unlock();
 }catch(ex){status('citroenAuthStatus',ex.message,true);}
}
async function logout(){
 try{await request('/api/auth','POST',{action:'logout'});}catch{}
 user=null;publicState();
 window.CITROEN_STUDIO_LOCK?.();
 close(ui.master);close(ui.login);
}
function makePassword(){
 const abc='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
 const random=new Uint32Array(20);crypto.getRandomValues(random);
 return [...random].map(n=>abc[n%abc.length]).join('');
}
function rowForEditor(u){
 const card=document.createElement('div');card.className='citroen-user-row';
 const who=document.createElement('div'),title=document.createElement('strong'),sub=document.createElement('small');
 title.textContent=u.email;sub.textContent=(u.role==='owner'?'Propietario · ':'Editor · ')+(u.active?'Activo':'Suspendido');
 who.append(title,sub);card.append(who);
 if(u.role!=='owner'){
  const actions=document.createElement('div');actions.className='citroen-user-actions';
  for(const [action,label] of [[u.active?'disable':'enable',u.active?'Suspender':'Activar'],['reset-password','Cambiar clave']]){
   const btn=document.createElement('button');btn.type='button';btn.textContent=label;
   btn.onclick=async()=>{
    const input=action==='reset-password'?prompt('Escribe la nueva contraseña (mínimo 12 caracteres, letras y números):',makePassword()):null;
    if(action==='reset-password'&&input===null)return;
    if(action==='disable'&&!confirm('¿Suspender el acceso de '+u.email+'?'))return;
    try{await request('/api/users','POST',{action,email:u.email,...(input?{password:input}:{})});status('citroenMasterStatus','Acceso actualizado.');await renderUsers();}
    catch(e){status('citroenMasterStatus',e.message,true);}
   };
   actions.append(btn);
  }
  card.append(actions);
 }
 return card;
}
async function renderUsers(){
 try{
  const data=await request('/api/users');
  $('citroenMasterUsers').replaceChildren(...data.users.map(rowForEditor));
 }catch(e){status('citroenMasterStatus',e.message,true);}
}
async function showMaster(){
 const fresh=await refresh();
 if(!fresh||fresh.role!=='owner'){showLogin();return;}
 if(fresh.mustChange){showChange();return;}
 status('citroenMasterStatus','');
 open(ui.master);await renderUsers();
}
async function createEditor(e){
 e.preventDefault();
 const f=e.currentTarget,values=new FormData(f);
 status('citroenMasterStatus','Creando usuario…');
 try{
  await request('/api/users','POST',{action:'create',email:values.get('email'),password:values.get('password')});
  f.reset();status('citroenMasterStatus','Editor creado. Comparte su correo y contraseña por un canal seguro.');
  await renderUsers();
 }catch(e){status('citroenMasterStatus',e.message,true);}
}
async function checkSessionDuringEdit(){
 if(!$('c3Dashboard')?.classList.contains('studio-edit-on'))return;
 const wasLoggedIn=!!user,latest=await refresh();
 if(wasLoggedIn&&!latest){window.CITROEN_STUDIO_LOCK?.();status('citroenAuthStatus','Tu sesión venció o tu cuenta fue suspendida. Vuelve a iniciar sesión.',true);}
}
function wire(){
 $('citroenActivateLink').onclick=showActivate;
 $('citroenPasteActivation').onclick=async()=>{try{const value=await navigator.clipboard.readText();const el=$('citroenActivateForm').querySelector('[name="activationCode"]');el.value=value.trim();status('citroenAuthStatus','Código pegado. Comprueba el correo y la clave inicial.');}catch{status('citroenAuthStatus','Tu navegador no permitió pegar automáticamente. Usa Ctrl+V o Cmd+V en el campo.',true);}};
 $('citroenSidebarLogin').onclick=()=>requestEdit();
 $('citroenBackLogin').onclick=showLogin;
 $('citroenActivateForm').addEventListener('submit',activate);
 $('citroenLoginForm').addEventListener('submit',login);
 $('citroenChangeForm').addEventListener('submit',changePassword);
 $('citroenNewEditorForm').addEventListener('submit',createEditor);
 $('citroenAuthClose').onclick=()=>close(ui.login);
 $('citroenMasterClose').onclick=()=>close(ui.master);
 $('citroenMasterOpen').onclick=()=>showMaster().catch(e=>status('citroenMasterStatus',e.message,true));
 $('citroenAuthLogout').onclick=logout;
 $('citroenMasterLogout').onclick=logout;
 $('citroenGeneratePassword').onclick=()=>{$('citroenNewEditorForm').querySelector('[name="password"]').value=makePassword();};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){close(ui.login);close(ui.master);}});
 refresh();
 // Revalidate server permissions while editing. All sensitive master actions check again server-side.
 window.setInterval(()=>checkSessionDuringEdit().catch(()=>{}),90000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkSessionDuringEdit().catch(()=>{});});
}
window.CITROEN_ACCESS={identity:()=>user?.email||null,requestEdit,canEdit:()=>Boolean(user&&!user.mustChange),isOwner:()=>Boolean(user&&!user.mustChange&&user.role==='owner'),logout,showMaster};
document.addEventListener('DOMContentLoaded',wire);
})();