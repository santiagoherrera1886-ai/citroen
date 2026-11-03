/* Internal identity service for first-party Inchcape dashboards.
   Uses Citroën's EXISTING users database, without copying passwords or hashes to Suzuki.
   Strict server-to-server key; never exposes credentials to the browser. */
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {ready,json,error,emailOf,validEmail,validStrongPassword,hashPassword,matches,usersRead,usersWrite,findAccount,newRecord,ownerEmail} from '../lib/editor-auth.mjs';

const failures=new Map();
function authorized(req){
 const expected=process.env.INCHCAPE_AUTH_BRIDGE_SECRET;
 const supplied=req.headers['x-inchcape-service-key'];
 if(typeof expected!=='string'||expected.length<40||typeof supplied!=='string')return false;
 const a=Buffer.from(expected),b=Buffer.from(supplied);
 return a.length===b.length&&timingSafeEqual(a,b);
}
function actorFor(db,body){
 const email=emailOf(body.actorEmail),revision=body.actorRevision;
 if(!validEmail(email)||typeof revision!=='string')return null;
 const u=findAccount(db,email);
 return u&&u.active&&u.revision===revision?u:null;
}
function asPublic(u){return {email:u.email,role:u.role,revision:u.revision,mustChange:!!u.mustChange};}
function limitKey(req,email){
 const claimed=String(req.headers['x-inchcape-user-ip']||'').replace(/[^0-9a-fA-F.:]/g,'').slice(0,48);
 return claimed+':'+email;
}
function limited(key){const record=failures.get(key);return !!record&&record.count>=8&&Date.now()-record.at<15*60*1000;}
function failed(key){let row=failures.get(key);if(!row||Date.now()-row.at>=15*60*1000)row={count:0,at:Date.now()};row.count++;failures.set(key,row);if(failures.size>3000)failures.clear();}
export default async function handler(req,res){
 try{
  if(req.method!=='POST')return error(res,405,'Método no permitido.');
  if(!ready())return error(res,503,'El servicio de acceso de Citroën no está configurado.');
  if(!authorized(req))return error(res,403,'Solicitud de servicio no autorizada.');
  if(!String(req.headers['content-type']||'').includes('application/json'))return error(res,415,'Formato no admitido.');
  const body=req.body||{},action=String(body.action||'');
  const db=await usersRead();

  if(action==='login'){
   const email=emailOf(body.email),key=limitKey(req,email);
   if(!validEmail(email)||typeof body.password!=='string'||body.password.length>256)return error(res,400,'Datos de acceso no válidos.');
   if(limited(key))return error(res,429,'Demasiados intentos. Intenta más tarde.');
   const user=findAccount(db,email);
   if(!user||!user.active||!matches(body.password,user.hash)){
    failed(key);return error(res,401,'Usuario o contraseña incorrectos.');
   }
   failures.delete(key);
   return json(res,200,{ok:true,user:asPublic(user)});
  }

  if(action==='validate'){
   const actor=actorFor(db,body);
   if(!actor)return error(res,401,'Sesión vencida o cuenta sin permisos.');
   return json(res,200,{ok:true,user:asPublic(actor)});
  }

  if(action==='change-password'){
   const actor=actorFor(db,body);
   if(!actor)return error(res,401,'Sesión vencida.');
   const oldPass=body.currentPassword,newPass=body.newPassword;
   if(!validStrongPassword(newPass))return error(res,400,'La nueva contraseña debe tener entre 12 y 128 caracteres, letras y números.');
   if(!matches(oldPass,actor.hash))return error(res,401,'La contraseña actual no coincide.');
   if(matches(newPass,actor.hash))return error(res,400,'La contraseña nueva debe ser diferente.');
   const record={...newRecord(actor.email,actor.role,hashPassword(newPass)),createdAt:actor.createdAt||new Date().toISOString()};
   db.users[actor.email]=record;await usersWrite(db);
   return json(res,200,{ok:true,user:asPublic(record)});
  }

  if(action==='users'||action==='manage-user'){
   const actor=actorFor(db,body);
   if(!actor||actor.mustChange||actor.role!=='owner')return error(res,403,'Se requiere una cuenta administradora autorizada.');
   if(action==='users'){
    const users=Object.values(db.users).map(u=>({email:u.email,role:u.role,active:!!u.active,createdAt:u.createdAt||''}));
    if(!users.some(u=>u.email===ownerEmail))users.unshift({email:ownerEmail,role:'owner',active:true,createdAt:'Cuenta inicial'});
    return json(res,200,{ok:true,users});
   }
   const email=emailOf(body.email),change=String(body.change||'');
   if(!validEmail(email))return error(res,400,'Correo electrónico no válido.');
   if(change==='create'){
    if(email===ownerEmail||db.users[email])return error(res,409,'Ese usuario ya existe.');
    if(!validStrongPassword(body.password))return error(res,400,'La contraseña debe tener al menos 12 caracteres, letras y números.');
    if(Object.keys(db.users).length>=100)return error(res,400,'Límite de 100 usuarios.');
    db.users[email]=newRecord(email,'editor',hashPassword(body.password));
    await usersWrite(db);
    return json(res,201,{ok:true,user:{email,role:'editor',active:true},message:'Editor creado para Citroën y Suzuki.'});
   }
   if(!['enable','disable','reset-password'].includes(change))return error(res,400,'Acción no válida.');
   const user=db.users[email];
   if(!user)return error(res,404,'Editor no encontrado.');
   if(user.role==='owner')return error(res,403,'No se puede modificar la cuenta administradora.');
   if(change==='reset-password'){
    if(!validStrongPassword(body.password))return error(res,400,'La contraseña debe incluir 12 caracteres, letras y números.');
    db.users[email]={...user,hash:hashPassword(body.password),revision:randomUUID()};
   }else db.users[email]={...user,active:change==='enable',revision:randomUUID()};
   await usersWrite(db);
   return json(res,200,{ok:true,message:change==='enable'?'Editor habilitado.':change==='disable'?'Editor suspendido.':'Contraseña cambiada.'});
  }
  return error(res,400,'Acción no reconocida.');
 }catch(e){
  console.error('Inchcape identity bridge failure',e?.message||'error');
  return error(res,503,'No fue posible comprobar las credenciales con Citroën.');
 }
}
