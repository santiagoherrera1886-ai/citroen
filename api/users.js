import {randomUUID} from 'node:crypto';
import {ready,json,error,sameOrigin,emailOf,validEmail,validStrongPassword,hashPassword,usersRead,usersWrite,currentUser,newRecord} from '../lib/editor-auth.mjs';

export default async function handler(req,res){
 try{
  if(!ready())return error(res,503,'Configura primero las credenciales privadas en Vercel.');
  const actor=await currentUser(req);
  if(!actor)return error(res,401,'Inicia sesión.');
  if(actor.role!=='owner')return error(res,403,'Se requiere una cuenta administradora.');
  if(actor.mustChange)return error(res,403,'Cambia primero la contraseña de activación.');
  if(req.method==='GET'){
   const db=await usersRead();
   const arr=Object.values(db.users).map(u=>({email:u.email,role:u.role,active:!!u.active,createdAt:u.createdAt||''}));
   const root=process.env.CITROEN_ADMIN_EMAIL?.toLowerCase();
   if(root&&!arr.some(u=>u.email===root))arr.unshift({email:root,role:'owner',active:true,createdAt:'Cuenta inicial'});
   return json(res,200,{ok:true,users:arr});
  }
  if(req.method!=='POST')return error(res,405,'Método no permitido.');
  if(!sameOrigin(req)||!String(req.headers['content-type']||'').includes('application/json'))return error(res,403,'Solicitud no autorizada.');
  const body=req.body||{},action=String(body.action||''),email=emailOf(body.email);
  const db=await usersRead();
  if(!validEmail(email))return error(res,400,'Correo electrónico no válido.');
  if(action==='create'){
   if(email===process.env.CITROEN_ADMIN_EMAIL?.trim().toLowerCase()||db.users[email])return error(res,409,'Ese usuario ya existe.');
   if(!validStrongPassword(body.password))return error(res,400,'La contraseña debe tener 12 a 128 caracteres, con letras y números.');
   if(Object.keys(db.users).length>=100)return error(res,400,'Límite de 100 editores.');
   db.users[email]=newRecord(email,'editor',hashPassword(body.password));
   await usersWrite(db);
   return json(res,201,{ok:true,message:'Editor creado.',user:{email,role:'editor',active:true}});
  }
  if(action==='disable'||action==='enable'||action==='reset-password'){
   const u=db.users[email];
   if(!u)return error(res,404,'Editor no encontrado.');
   if(u.role==='owner')return error(res,403,'El propietario no se puede desactivar ni gestionar desde este panel.');
   if(action==='reset-password'){
    if(!validStrongPassword(body.password))return error(res,400,'La nueva contraseña debe tener al menos 12 caracteres con letras y números.');
    db.users[email]={...u,hash:hashPassword(body.password),revision:randomUUID()};
   }else db.users[email]={...u,active:action==='enable',revision:randomUUID()};
   await usersWrite(db);
   return json(res,200,{ok:true,message:action==='disable'?'Acceso desactivado.':action==='enable'?'Acceso habilitado.':'Contraseña actualizada.'});
  }
  return error(res,400,'Acción no reconocida.');
 }catch(e){console.error('Citroen users error',e?.message||'error');return error(res,503,'No fue posible actualizar los permisos. Intenta de nuevo.');}
}
