import {get,head,put,BlobNotFoundError,BlobPreconditionFailedError} from '@vercel/blob';

export function isCampaignWriteConflict(error){
 return error instanceof BlobPreconditionFailedError || error?.name==='BlobPreconditionFailedError';
}

export function createCampaignStore(client={get,head,put}){
 async function metadata(path){
  try{
   const result=await client.head(path);
   if(typeof result.etag!=='string'||!result.etag)throw Error('No se pudo verificar la versión guardada.');
   return result;
  }catch(error){
   if(error instanceof BlobNotFoundError)return null;
   throw error;
  }
 }
 async function content(path){
  const result=await client.get(path,{access:'private',useCache:false});
  if(!result||result.statusCode===404)return null;
  if(result.statusCode!==200)throw Error('No se pudo leer la conexión.');
  return {value:JSON.parse(await new Response(result.stream).text())};
 }
 async function read(path,{forWrite=false}={}){
  if(!forWrite)return content(path);
  // Use the storage API's write validator, not the download response's ETag.
  // Bracket the uncached content read so its value and validator are one version.
  for(let attempt=0;attempt<3;attempt++){
   const before=await metadata(path),record=await content(path),after=await metadata(path);
   if(before?.etag===after?.etag){
    if(before&&record)return {...record,etag:before.etag};
    if(!before&&!record)return null;
   }
  }
  throw new BlobPreconditionFailedError();
 }
 async function write(path,value,previous){
  if(previous&&(typeof previous.etag!=='string'||!previous.etag))throw Error('Falta la versión del registro; no se sobrescribirá.');
  return client.put(path,JSON.stringify(value),{
   access:'private',contentType:'application/json',addRandomSuffix:false,
   allowOverwrite:!!previous,...(previous?{ifMatch:previous.etag}:{})
  });
 }
 return {read,write};
}
