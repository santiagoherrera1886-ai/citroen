import {ready,json,error,sameOrigin,emailOf,validEmail,validStrongPassword,hashPassword,matches,usersRead,usersWrite,findAccount,cookieHeader,clearCookie,currentUser,publicUser,newRecord,recordFailure,isRateLimited,resetFailures,ownerEmail,verifyActivation} from './_auth.mjs';

export default async function handler(req,res){
 try{
  if(!ready())return error(res,503,'El acceso privado está pendiente de configuración en Vercel.');
  if(req.method==='GET'){
   const u=await currentUser(req);
   return json(res,200,{ok:true,authenticated:!!u,user:publicUser(u)});
  }
  if(req.method!=='POST')return error(res,405,'Método no permitido.');
  if(!sameOrigin(req)||!String(req.headers['content-type']||'').includes('application/json'))return error(res,403,'Solicitud no autorizada.');
  const body=req.body||{},action=String(body.action||'');
  if(action==='logout'){
   res.setHeader('Set-Cookie',clearCookie());
   return json(res,200,{ok:true});
  }
  if(action==='activate'){
   if(isRateLimited(req))return error(res,429,'Demasiados intentos.');
   const email=emailOf(body.email);
   if(email!==ownerEmail)return error(res,403,'Ese correo no corresponde al propietario.');
   if(!verifyActivation(body.activationCode)){recordFailure(req);return error(res,403,'Código de activación incorrecto.');}
   if(typeof body.password!=='string'||body.password.length<4||body.password.length>128)return error(res,400,'Introduce tu contraseña inicial de acceso.');
   const db=await usersRead();
   if(db.users[ownerEmail])return error(res,409,'Esta cuenta ya fue activada.');
   const u={...newRecord(ownerEmail,'owner',hashPassword(body.password)),mustChange:true};
   db.users[ownerEmail]=u;
   await usersWrite(db);
   resetFailures(req);
   const session={email:ownerEmail,role:'owner',revision:u.revision,mustChange:true};
   res.setHeader('Set-Cookie',cookieHeader(session));
   return json(res,201,{ok:true,authenticated:true,user:publicUser(session)});
  }
  if(action==='login'){
   if(isRateLimited(req))return error(res,429,'Demasiados intentos. Intenta de nuevo más tarde.');
   const email=emailOf(body.email);
   if(!validEmail(email)||typeof body.password!=='string'||body.password.length>256)return error(res,400,'Datos de acceso no válidos.');
   const db=await usersRead(),account=findAccount(db,email);
   if(!account||!account.active||!matches(body.password,account.hash)){
    recordFailure(req);return error(res,401,'Usuario o contraseña incorrectos.');
   }
   resetFailures(req);
   const u={email:account.email,role:account.role,revision:account.revision,mustChange:!!account.mustChange};
   res.setHeader('Set-Cookie',cookieHeader(u));
   return json(res,200,{ok:true,authenticated:true,user:publicUser(u)});
  }
  if(action==='change-password'){
   const current=await currentUser(req);
   if(!current)return error(res,401,'Inicia sesión.');
   const old=body.currentPassword,newPass=body.newPassword;
   if(!validStrongPassword(newPass))return error(res,400,'Usa una clave nueva de 12 a 128 caracteres que incluya letras y números.');
   const db=await usersRead(),account=findAccount(db,current.email);
   if(!account||!matches(old,account.hash))return error(res,401,'La contraseña actual no coincide.');
   if(matches(newPass,account.hash))return error(res,400,'La nueva contraseña debe ser diferente.');
   db.users[current.email]={...newRecord(current.email,account.role,hashPassword(newPass)),createdAt:account.createdAt||new Date().toISOString()};
   await usersWrite(db);
   const u={email:current.email,role:account.role,revision:db.users[current.email].revision,mustChange:false};
   res.setHeader('Set-Cookie',cookieHeader(u));
   return json(res,200,{ok:true,authenticated:true,user:publicUser(u)});
  }
  return error(res,400,'Acción no reconocida.');
 }catch(e){
  console.error('Citroen auth error',e?.message||'error');
  return error(res,503,'No se pudo validar el acceso privado. Intenta de nuevo.');
 }
}
