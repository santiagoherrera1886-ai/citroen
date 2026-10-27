/* Shared Citroën images: authenticated JPEG uploads, readable publicly only after publication. */
import {randomBytes} from 'node:crypto';
import {get,put} from '@vercel/blob';
import {ready,currentUser,json,error,sameOrigin} from '../lib/editor-auth.mjs';
const ID=/^m-[a-f0-9]{32}$/;
const path=id=>'private/citroen-shared-media/'+id+'.jpg';
const mediaRef=id=>'/api/media?id='+id;
function contains(workspace,url){
 const photos=Object.values(workspace?.summary?.photos||{});
 if(photos.includes(url))return true;
 if((workspace?.creatives||[]).some(x=>x.image===url))return true;
 return (workspace?.pages||[]).some(p=>(p.cards||[]).some(c=>c.image===url));
}
async function published(){
 const x=await get('private/citroen-published-workspace-v1.json',{access:'private'});
 if(!x||x.statusCode!==200)return null;
 return JSON.parse(await new Response(x.stream).text());
}
export default async function handler(req,res){
 try{
  if(!ready())return error(res,503,'La biblioteca privada no está configurada.');
  if(req.method==='POST'){
   const actor=await currentUser(req);
   if(!actor||actor.mustChange)return error(res,401,'Debes entrar a Diseño antes de subir imágenes.');
   if(!sameOrigin(req)||!String(req.headers['content-type']||'').includes('application/json'))return error(res,403,'Solicitud no autorizada.');
   const raw=req.body?.image;
   if(typeof raw!=='string'||raw.length>460000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(raw))return error(res,400,'Sube una imagen JPG optimizada (máximo 330 KB).');
   const buffer=Buffer.from(raw.slice('data:image/jpeg;base64,'.length),'base64');
   if(buffer.length<150||buffer.length>330000||buffer[0]!==0xff||buffer[1]!==0xd8||buffer[2]!==0xff)return error(res,400,'Imagen JPEG inválida o demasiado pesada.');
   const id='m-'+randomBytes(16).toString('hex');
   await put(path(id),buffer,{access:'private',contentType:'image/jpeg',addRandomSuffix:false,allowOverwrite:false});
   return json(res,201,{ok:true,id,url:mediaRef(id),size:buffer.length});
  }
  if(req.method==='GET')return await (async()=>{
   const id=String(req.query?.id||'');
   if(!ID.test(id))return error(res,400,'Imagen no válida.');
   const url=mediaRef(id);
   const actor=await currentUser(req).catch(()=>null);
   if(!actor||actor.mustChange){
    const live=await published();
    if(!contains(live,url))return error(res,404,'Imagen no publicada.');
   }
   const x=await get(path(id),{access:'private'});
   if(!x||x.statusCode!==200)return error(res,404,'Imagen no encontrada.');
   const bytes=Buffer.from(await new Response(x.stream).arrayBuffer());
   res.setHeader('Content-Type','image/jpeg');
   res.setHeader('X-Content-Type-Options','nosniff');
   res.setHeader('Cache-Control',actor?'private, max-age=0':'public, max-age=120');
   return res.status(200).end(bytes);
  })();
  return error(res,405,'Método no permitido.');
 }catch(e){console.error('Citroen shared media',e?.message||'error');return error(res,503,'No fue posible almacenar o leer la imagen.');}
}
