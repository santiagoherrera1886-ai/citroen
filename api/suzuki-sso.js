/* Cross-brand authentication bridge for Suzuki.
   Uses the existing Citroën account registry and signed PKCE-bound 90s tickets.
   No passwords or private keys cross between projects. */
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {currentUser,usersRead,findAccount,json,error} from '../lib/editor-auth.mjs';
const audience='dash-suzuki.vercel.app';
const domain='suzuki-bridge-v1';
const isB64=s=>typeof s==='string'&&/^[A-Za-z0-9_-]+$/.test(s);
function signingKey(){
 const token=process.env.BLOB_READ_WRITE_TOKEN;
 if(!token)throw Error('Private Citroën identity storage unavailable.');
 return createHmac('sha256',token).update('inchcape:'+domain).digest();
}
function mac(message){return createHmac('sha256',signingKey()).update(message).digest('base64url');}
const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
function verifyTicket(s){
 if(typeof s!=='string'||s.length>3500)return null;
 const a=s.split('.');if(a.length!==2||!isB64(a[0])||!isB64(a[1]))return null;
 const sig=mac(a[0]);
 if(Buffer.byteLength(sig)!==Buffer.byteLength(a[1])||!timingSafeEqual(Buffer.from(sig),Buffer.from(a[1])))return null;
 const p=JSON.parse(Buffer.from(a[0],'base64url').toString());
 const now=Math.floor(Date.now()/1000);
 if(!p||p.typ!==domain||p.aud!==audience||!Number.isInteger(p.exp)||p.exp<=now||p.exp>now+91||!isB64(p.challenge)||p.challenge.length!==43||!isB64(p.state)||p.state.length<18||p.state.length>90)return null;
 return p;
}
export default async function handler(req,res){
 try{
  if(req.method==='GET'){
   if(req.query?.action!=='issue')return error(res,400,'Acción no válida.');
   const user=await currentUser(req);
   if(!user||user.mustChange)return error(res,401,'Inicia sesión con una cuenta de Citroën autorizada para Diseño.');
   const challenge=req.query?.challenge,state=req.query?.state;
   if(typeof challenge!=='string'||challenge.length!==43||!isB64(challenge)||typeof state!=='string'||state.length<18||state.length>90||!isB64(state))return error(res,400,'Solicitud de conexión inválida.');
   const payload={typ:domain,aud:audience,sub:user.email,role:user.role,revision:user.revision,challenge,state,exp:Math.floor(Date.now()/1000)+90};
   const raw=encode(payload);
   return json(res,200,{ok:true,ticket:raw+'.'+mac(raw)});
  }
  if(req.method==='POST'){
   const body=req.body||{};
   if(body.action!=='verify')return error(res,400,'Acción no válida.');
   const t=verifyTicket(body.ticket);
   if(!t)return error(res,401,'El enlace de acceso venció o es inválido. Intenta ingresar nuevamente.');
   if(typeof body.verifier!=='string'||body.verifier.length<40||body.verifier.length>100||!isB64(body.verifier))return error(res,401,'Validación de acceso inválida.');
   const challenge=createHash('sha256').update(body.verifier).digest('base64url');
   if(!timingSafeEqual(Buffer.from(challenge),Buffer.from(t.challenge)))return error(res,401,'No coincide la solicitud de ingreso.');
   const db=await usersRead();
   const account=findAccount(db,t.sub);
   if(!account||!account.active||account.mustChange||account.revision!==t.revision||account.role!==t.role)return error(res,401,'La cuenta ya no tiene permiso de edición.');
   return json(res,200,{ok:true,user:{email:account.email,role:account.role}});
  }
  return error(res,405,'Método no permitido.');
 }catch(ex){console.error('Suzuki SSO bridge error',ex?.message||'error');return error(res,503,'No fue posible verificar el acceso con Citroën.');}
}
