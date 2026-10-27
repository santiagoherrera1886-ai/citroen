import {get,put} from '@vercel/blob';
import {json,error,ready,currentUser,sameOrigin} from '../lib/editor-auth.mjs';
const PATH='private/citroen-published-workspace-v1.json';
const EMPTY={version:1,pages:[],creatives:[],insights:[],filters:{month:true,model:true,territory:true}};
function safeText(x,max=180){return typeof x==='string'?x.slice(0,max):'';}
function clean(state){
 if(!state||typeof state!=='object'||Array.isArray(state))throw Error('Estructura inválida');
 const pages=Array.isArray(state.pages)?state.pages:[];
 const creatives=Array.isArray(state.creatives)?state.creatives:[];
 const insights=Array.isArray(state.insights)?state.insights:[];
 if(pages.length>15||creatives.length>40||insights.length>80)throw Error('El espacio supera el máximo de páginas, creativos o insights.');
 const validId=id=>typeof id==='string'&&/^[\w-]{3,80}$/.test(id);
 const fixCard=c=>{
  if(!c||!validId(c.id)||!['metric','note','chart','image','filter'].includes(c.type))return null;
  const metric=c.source==='external'&&typeof c.metric==='string'&&c.metric.length<=90?c.metric:['spend','forms','messages','impressions','reach','clicks','ctr','cpl'].includes(c.metric)?c.metric:'spend';
  const dimension=c.source==='external'&&typeof c.dimension==='string'&&c.dimension.length<=90?c.dimension:['month','model'].includes(c.dimension)?c.dimension:'month';
  const shape=['bar','line','area','table'].includes(c.shape)?c.shape:'bar';
  const number=(v,min,max,def)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.round(Number(v)))):def;
  return {id:c.id,type:c.type,title:safeText(c.title,100),text:safeText(c.text,7000),source:c.source==='external'?'external':'meta',metric,dimension,shape,
   x:number(c.x,0,2400,24),y:number(c.y,0,6000,24),w:number(c.w,220,1200,410),h:number(c.h,170,850,270),
   image:typeof c.image==='string'&&(c.image.startsWith('https://')||/^data:image\/(?:png|jpeg|webp);base64,/.test(c.image))&&c.image.length<120000?c.image:'',
   filter:['month','model'].includes(c.filter)?c.filter:'month'};
 };
 const TYPES=new Set(['date','relative','select','multi','list','search','number','checkbox','advanced']);
 const FIELDS=new Set(['date','month','model','territory','account','platform','spend','forms','messages','impressions','reach','clicks']);
 const OPS=new Set(['contains','equals','starts','ends','notcontains','gt','gte','lt','lte','between','in','notin','empty','notempty','regex']);
 const iso=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)?x:'';
 const cleanControl=d=>{
  if(!d||typeof d!=='object'||!/^[\w-]{3,85}$/.test(d.id||'')||!TYPES.has(d.type)||!FIELDS.has(d.field))return null;
  const scope=['report','page','chart'].includes(d.scope)?d.scope:'page';
  return {id:d.id,type:d.type,field:d.field,label:safeText(d.label,80),scope,
   pageId:safeText(d.pageId,100),cardId:safeText(d.cardId,100),operator:OPS.has(d.operator)?d.operator:'contains',
   logic:d.logic==='OR'?'OR':'AND',value:safeText(d.value,180),values:Array.isArray(d.values)?d.values.slice(0,40).map(x=>safeText(x,120)):[],
   preset:safeText(d.preset,20),start:iso(d.start),end:iso(d.end),
   min:d.min!=null&&Number.isFinite(Number(d.min))?Number(d.min):null,
   max:d.max!=null&&Number.isFinite(Number(d.max))?Number(d.max):null,
   exclude:d.exclude===true,enabled:d.enabled!==false};
 };
 const controls=(Array.isArray(state.controls)?state.controls:[]).slice(0,40).map(cleanControl).filter(Boolean);
 const sl=state.summaryLayout;
 const items={};
 if(sl?.items&&typeof sl.items==='object')for(const [k,v] of Object.entries(sl.items))if(/^[nc]:[\w-]{1,100}$/.test(k)&&v&&typeof v==='object')items[k]=Object.fromEntries(['x','y','w','h'].map(t=>[t,Number.isFinite(Number(v[t]))?Math.max(0,Math.min(6000,Math.round(Number(v[t])))):0]));
 return {version:1,summaryLayout:{enabled:sl?.enabled===true,items},controls,
  pages:pages.filter(p=>p&&validId(p.id)).map(p=>({id:p.id,title:safeText(p.title,70),cards:(Array.isArray(p.cards)?p.cards:[]).slice(0,45).map(fixCard).filter(Boolean)})),
  insights:insights.filter(a=>a&&validId(a.id)).map(a=>({id:a.id,title:safeText(a.title,110),body:safeText(a.body,12000),updatedAt:safeText(a.updatedAt,50)})),
  creatives:creatives.filter(a=>a&&validId(a.id)).map(a=>({id:a.id,title:safeText(a.title,110),campaign:safeText(a.campaign,150),format:['Imagen','Vídeo','Carrusel','Otro'].includes(a.format)?a.format:'Otro',image:typeof a.image==='string'&&(a.image.startsWith('https://')||/^data:image\/(?:png|jpeg|webp);base64,/.test(a.image))&&a.image.length<120000?a.image:'',notes:safeText(a.notes,1000)})),
  filters:Object.fromEntries(['month','model','territory'].map(k=>[k,state.filters?.[k]!==false]))
 };
}
async function read(){
 const stored=await get(PATH,{access:'private'});
 if(!stored||stored.statusCode===404)return EMPTY;
 if(stored.statusCode!==200)throw Error('No fue posible leer el espacio publicado.');
 return clean(JSON.parse(await new Response(stored.stream).text()));
}
export default async function handler(req,res){
 try{
  if(!ready())return error(res,503,'El almacenamiento privado no está configurado.');
  if(req.method==='GET')return json(res,200,{ok:true,workspace:await read()});
  if(req.method!=='POST')return error(res,405,'Método no permitido.');
  const user=await currentUser(req);
  if(!user||user.mustChange)return error(res,401,'Debes iniciar sesión como editor autorizado.');
  if(!sameOrigin(req)||!String(req.headers['content-type']||'').includes('application/json'))return error(res,403,'Origen no autorizado.');
  const raw=JSON.stringify(req.body||{});
  if(raw.length>350000)return error(res,413,'La configuración supera el tamaño permitido.');
  const workspace=clean(req.body?.workspace);
  await put(PATH,JSON.stringify(workspace),{access:'private',contentType:'application/json',allowOverwrite:true,addRandomSuffix:false});
  return json(res,200,{ok:true,workspace,updatedBy:user.email});
 }catch(e){console.error('Citroen workspace',e?.message||'error');return error(res,503,'No se pudo guardar o cargar la versión publicada.');}
}
