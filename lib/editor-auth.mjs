import {createHmac,createHash,randomBytes,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';
import {get,put} from '@vercel/blob';

const ADMIN_EMAIL=(process.env.CITROEN_ADMIN_EMAIL||'santiago.herrera@vml.com').trim().toLowerCase();
const ADMIN_HASH=process.env.CITROEN_ADMIN_PASSWORD_HASH||'';
const SESSION_SECRET=process.env.CITROEN_SESSION_SECRET||(process.env.BLOB_READ_WRITE_TOKEN?createHmac('sha256',process.env.BLOB_READ_WRITE_TOKEN).update('citroen.editor.session.v1').digest('hex'):'');
const USERS_PATH='private/citroen-editor-users-v1.json';
const COOKIE='citroen_editor_session';
const MAX_AGE=8*60*60;
const EMPTY={users:{}};
const attempts=new Map();

export function ready(){return Boolean(ADMIN_EMAIL&&SESSION_SECRET.length>=40&&process.env.BLOB_READ_WRITE_TOKEN);}
export const ownerEmail=ADMIN_EMAIL;
const ACTIVATION_HASH='18a62369cee3abd612606d938dbac12a584e528f4af81d47f6f728538dafb345';
export function verifyActivation(code){if(typeof code!=='string'||code.length>200)return false;const input=code.trim().replace(/[\s\u200b-\u200d\ufeff]/g,'');const canonical=input.startsWith('CITROEN-')?input:'CITROEN-'+input;const a=createHash('sha256').update(canonical).digest('hex');return timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(ACTIVATION_HASH,'hex'));}
export function json(res,status,data){res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');return res.status(status).json(data);}
export function error(res,status,message){return json(res,status,{ok:false,error:message});}
export function sameOrigin(req){
 const origin=req.headers.origin;
 if(!origin||!/^https?:\/\//.test(origin))return false;
 try{const host=req.headers['x-forwarded-host']||req.headers.host;return new URL(origin).host===host;}catch{return false;}
}
export function validEmail(s){return typeof s==='string'&&s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);}
export function emailOf(s){return String(s||'').trim().toLowerCase();}
export function validStrongPassword(s){return typeof s==='string'&&s.length>=12&&s.length<=128&&(/[A-Za-z]/.test(s)&&/\d/.test(s));}
export function hashPassword(password){
 const salt=randomBytes(16).toString('hex');
 return 'scrypt$16384$'+salt+'$'+scryptSync(password,Buffer.from(salt,'hex'),64,{N:16384,r:8,p:1}).toString('hex');
}
export function matches(password,record){
 try{
  if(typeof password!=='string'||password.length>256)return false;
  const [algorithm,n,salt,hex]=String(record||'').split('$');
  if(algorithm!=='scrypt'||n!=='16384'||!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(hex))return false;
  const computed=scryptSync(password,Buffer.from(salt,'hex'),64,{N:16384,r:8,p:1});
  return timingSafeEqual(computed,Buffer.from(hex,'hex'));
 }catch{return false;}
}
export async function usersRead(){
 const r=await get(USERS_PATH,{access:'private'});
 if(!r||r.statusCode===404)return {...EMPTY,users:{}};
 if(r.statusCode!==200)throw Error('No fue posible leer la base privada de usuarios.');
 const raw=JSON.parse(await new Response(r.stream).text());
 if(!raw||typeof raw!=='object'||typeof raw.users!=='object'||Array.isArray(raw.users))throw Error('Datos de usuarios no válidos');
 return {users:raw.users,etag:r.blob?.etag};
}
export async function usersWrite(db){
 const options={access:'private',contentType:'application/json',allowOverwrite:Boolean(db.etag),addRandomSuffix:false};
 if(db.etag)options.ifMatch=db.etag;
 await put(USERS_PATH,JSON.stringify({users:db.users}),options);
}
export function findAccount(db,email){
 const u=db.users[email];
 if(u)return {...u,email};
 if(email===ADMIN_EMAIL&&ADMIN_HASH)return {email,role:'owner',active:true,hash:ADMIN_HASH,revision:'bootstrap',mustChange:true};
 return null;
}
const b64=s=>Buffer.from(s).toString('base64url');
function sign(payload){const raw=b64(JSON.stringify(payload));const sig=createHmac('sha256',SESSION_SECRET).update(raw).digest('base64url');return raw+'.'+sig;}
export function cookieHeader(payload){
 const value=sign({...payload,exp:Math.floor(Date.now()/1000)+MAX_AGE});
 return COOKIE+'='+value+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age='+MAX_AGE;
}
export function clearCookie(){return COOKIE+'=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';}
function verifyCookie(cookie){
 try{
  const value=(cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!value||value.length>5000)return null;
  const parts=value.split('.');
  if(parts.length!==2)return null;
  const expected=createHmac('sha256',SESSION_SECRET).update(parts[0]).digest('base64url');
  if(parts[1].length!==expected.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(parts[1])))return null;
  const p=JSON.parse(Buffer.from(parts[0],'base64url').toString());
  if(!p||!Number.isInteger(p.exp)||p.exp<=Math.floor(Date.now()/1000)||p.exp>Math.floor(Date.now()/1000)+MAX_AGE+60)return null;
  if(!validEmail(p.email)||typeof p.revision!=='string')return null;
  return p;
 }catch{return null;}
}
export async function currentUser(req){
 const token=verifyCookie(req.headers.cookie);
 if(!token)return null;
 const db=await usersRead();
 const user=findAccount(db,token.email);
 if(!user||!user.active||user.revision!==token.revision)return null;
 return {email:user.email,role:user.role,mustChange:Boolean(user.mustChange),revision:user.revision};
}
export function publicUser(user){return user?{email:user.email,role:user.role,mustChange:!!user.mustChange}:null;}
export function newRecord(email,role,hash){return {email,role,hash,active:true,mustChange:false,createdAt:new Date().toISOString(),revision:randomUUID()};}
export function recordFailure(req){
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].slice(0,100);
 const now=Date.now(),rec=attempts.get(ip)||{count:0,at:now};
 if(now-rec.at>15*60*1000){rec.count=0;rec.at=now;}
 rec.count++;attempts.set(ip,rec);
 if(attempts.size>10000)attempts.clear();
}
export function isRateLimited(req){
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].slice(0,100);
 const rec=attempts.get(ip);
 return !!rec&&rec.count>=8&&(Date.now()-rec.at)<15*60*1000;
}
export function resetFailures(req){
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].slice(0,100);
 attempts.delete(ip);
}
