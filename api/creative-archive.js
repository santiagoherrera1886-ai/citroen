import {createHash} from 'node:crypto';
import {get,put,BlobNotFoundError} from '@vercel/blob';
import {archiveCatalog,getArchivedFile} from '../lib/citroen-archive-catalog.mjs';
export const config={api:{bodyParser:false}};
const PREFIX='archives/citroen/2026/';
const allowed=new Set(archiveCatalog.files);
const filenamePattern=/^[a-f0-9]{20}\.webp$/;
const ZIP_PARTS={'imagenes-recuperadas.part1':'0e7fc00b739651746299badbe92562223cc8239c36e288c06de01cde6bdf6116','imagenes-recuperadas.part2':'42050da35df5c1d5e548d955cdb173850731b4554a21bcd907b3d53c8300373e'};
const cache='public, max-age=3600, s-maxage=2592000, stale-while-revalidate=86400';
function send(res,status,body){
 res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');
 return res.end(JSON.stringify(body));
}
async function readPrivate(name){
 try{
  const result=await get(PREFIX+name,{access:'private'});
  if(!result||result.statusCode!==200)return null;
  return Buffer.from(await new Response(result.stream).arrayBuffer());
 }catch(e){if(e instanceof BlobNotFoundError||e?.name==='BlobNotFoundError')return null;throw e}
}
function verify(name,raw){
 if(Object.hasOwn(ZIP_PARTS,name))return createHash('sha256').update(raw).digest('hex')===ZIP_PARTS[name];
 if(!allowed.has(name)||!filenamePattern.test(name))return false;
 return createHash('sha256').update(raw).digest('hex').startsWith(name.slice(0,20));
}
async function readBody(req,max){
 const chunks=[];let size=0;
 for await(const part of req){
  const bytes=Buffer.isBuffer(part)?part:Buffer.from(part);
  size+=bytes.length;
  if(size>max)throw new Error('Archivo demasiado grande.');
  chunks.push(bytes);
 }
 return Buffer.concat(chunks);
}
export default async function handler(req,res){
 try{
  if(req.method==='GET'&&req.query?.catalog==='1'){
   res.setHeader('Cache-Control','public, s-maxage=3600');
   return send(res,200,{ok:true,brand:'citroen',year:2026,source:'DATA CITROEN AÑO',keys:Object.keys(archiveCatalog.map),images:archiveCatalog.unique,downloaded:archiveCatalog.downloaded,sourceRows:archiveCatalog.mediaRecs});
  }
  if(req.method==='GET'){
   const key=String(req.query?.key||'');
   const zip=req.query?.zip==='1';
   if(!zip&&!/^\d{1,4}(?:\.\d{1,5}){3}$/.test(key))return send(res,400,{ok:false,error:'Identificador no válido.'});
   const name=zip?null:getArchivedFile(key);
   if(!zip&&!name)return send(res,404,{ok:false,error:'No hay una imagen archivada para este anuncio.'});
   const bytes=zip?await Promise.all(Object.keys(ZIP_PARTS).map(readPrivate)).then(parts=>parts.every(Boolean)?Buffer.concat(parts):null):await readPrivate(name);
   if(!bytes)return send(res,404,{ok:false,error:'Archivo pendiente de archivado.'});
   res.statusCode=200;
   res.setHeader('Content-Type',zip?'application/zip':'image/webp');
   res.setHeader('Content-Length',String(bytes.length));
   res.setHeader('Cache-Control',cache);
   res.setHeader('X-Content-Type-Options','nosniff');
   if(zip)res.setHeader('Content-Disposition','attachment; filename="citroen-creativos-2026.zip"');
   return res.end(bytes);
  }
  if(req.method!=='POST')return send(res,405,{ok:false,error:'Método no permitido.'});
  // One-way immutable archival import: file names must match a pre-verified
  // SHA-256 digest already embedded in the read-only repository catalog.
  // No arbitrary filenames, URLs, JSON payloads or overwrites are accepted.
  const name=String(req.query?.asset||'');
  if(!Object.hasOwn(ZIP_PARTS,name)&&!allowed.has(name))return send(res,403,{ok:false,error:'Archivo fuera del catálogo autorizado.'});
  if(!/^application\/octet-stream(?:;|$)/i.test(String(req.headers['content-type']||'')))return send(res,415,{ok:false,error:'Tipo de archivo no admitido.'});
  const max=Object.hasOwn(ZIP_PARTS,name)?3500000:250000;
  if(Number(req.headers['content-length']||0)>max)return send(res,413,{ok:false,error:'Archivo demasiado grande.'});
  const bytes=await readBody(req,max);
  if(!verify(name,bytes))return send(res,422,{ok:false,error:'La firma del archivo no coincide con el archivo original verificado.'});
  const exists=await readPrivate(name);
  if(exists)return send(res,200,{ok:true,stored:true,existing:true,bytes:exists.length});
  const contentType=Object.hasOwn(ZIP_PARTS,name)?'application/octet-stream':'image/webp';
  await put(PREFIX+name,bytes,{access:'private',contentType,addRandomSuffix:false,allowOverwrite:false});
  return send(res,201,{ok:true,stored:true,existing:false,bytes:bytes.length});
 }catch(e){
  console.error('Creative archive request failed',e?.name||'Error');
  return send(res,500,{ok:false,error:'No fue posible acceder al archivo.'});
 }
}