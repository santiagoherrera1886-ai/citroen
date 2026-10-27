/* Citroën version history: owner-only immutable snapshots; restore is a draft, never an automatic publish. */
import {get,list} from '@vercel/blob';
import {json,error,ready,currentUser} from '../lib/editor-auth.mjs';

const PREFIX='private/citroen-history/';
const LIVE='private/citroen-published-workspace-v1.json';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function read(path){
 const obj=await get(path,{access:'private'});
 if(!obj||obj.statusCode===404)return null;
 if(obj.statusCode!==200)throw Error('No se pudo leer la revisión.');
 const data=JSON.parse(await new Response(obj.stream).text());
 if(!data||!Array.isArray(data.pages)||typeof data.revision!=='string')throw Error('Revisión dañada.');
 return data;
}
export default async function handler(req,res){
 try{
  if(!ready())return error(res,503,'El almacenamiento privado no está configurado.');
  if(req.method!=='GET')return error(res,405,'Método no permitido.');
  const user=await currentUser(req);
  if(!user)return error(res,401,'Inicia sesión.');
  if(user.role!=='owner'||user.mustChange)return error(res,403,'Solo el administrador maestro puede consultar el historial.');
  const revision=typeof req.query?.revision==='string'?req.query.revision:'';
  if(revision){
   if(!UUID.test(revision))return error(res,400,'Identificador de revisión inválido.');
   const snapshot=await read(PREFIX+revision+'.json');
   if(!snapshot||snapshot.revision!==revision)return error(res,404,'Esa revisión no está disponible.');
   return json(res,200,{ok:true,workspace:snapshot,revision:snapshot.revision});
  }
  const live=await read(LIVE);
  const result=await list({prefix:PREFIX,limit:100});
  const archives=(result.blobs||[]).filter(x=>UUID.test(x.pathname.slice(PREFIX.length).replace(/\.json$/,''))&&x.pathname.endsWith('.json'))
   .sort((a,b)=>new Date(b.uploadedAt)-new Date(a.uploadedAt)).slice(0,30).map(b=>({
    revision:b.pathname.slice(PREFIX.length,-5),
    archivedAt:new Date(b.uploadedAt).toISOString(),
    size:b.size,active:false
   }));
  return json(res,200,{ok:true,current:live?{revision:live.revision,publishedAt:live.publishedAt,active:true}:null,history:archives,hasMore:!!result.hasMore});
 }catch(e){console.error('Citroen version history',e?.message||'error');return error(res,503,'No fue posible consultar el historial de versiones.');}
}
