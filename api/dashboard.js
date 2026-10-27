import {get,put} from '@vercel/blob';
import {randomUUID} from 'node:crypto';
import {json,error,ready,currentUser,sameOrigin} from '../lib/editor-auth.mjs';
const PATH='private/citroen-published-workspace-v1.json';
const EMPTY={version:1,revision:'initial',publishedAt:null,pages:[],creatives:[],insights:[],filters:{month:true,model:true,territory:true}};
function safeText(x,max=180){return typeof x==='string'?x.slice(0,max):'';}
const isMedia=x=>typeof x==='string'&&/^\/api\/media\?id=m-[a-f0-9]{32}$/.test(x);
const imageRef=x=>typeof x==='string'&&(isMedia(x)||x.startsWith('https://')&&x.length<=2048||/^data:image\/(?:png|jpeg|webp);base64,/.test(x)&&x.length<120000)?x:'';
function cleanSummary(source){
 if(!source||typeof source!=='object')return null;
 const allowedSource=new Set(['plan','meta','compare']),allowedChart=new Set(['bar','line','area','table']),allowedDimension=new Set(['month','model']);
 const cards=(Array.isArray(source.cards)?source.cards:[]).slice(0,40).filter(c=>c&&typeof c==='object'&&/^[a-zA-Z0-9_-]{3,85}$/.test(c.id||'')&&allowedSource.has(c.source)&&allowedChart.has(c.chart)&&allowedDimension.has(c.dimension)).map(c=>({
  id:c.id,title:safeText(c.title,90),source:c.source,metric:safeText(c.metric,70),dimension:c.dimension,chart:c.chart,model:safeText(c.model,80),sort:['original','asc','desc'].includes(c.sort)?c.sort:'original',limit:['0','3','5','10'].includes(String(c.limit))?String(c.limit):'0'
 }));
 const keys=new Set(['c3ComparePanel','c3FunnelPanel','c3ModelsPanel','c3CampaignPanel','c3InsightsPanel'].map(x=>'n:'+x).concat(cards.map(c=>'c:'+c.id)));
 const order=Array.isArray(source.order)?source.order.filter(k=>keys.has(k)).slice(0,65):[];
 const hidden=Array.isArray(source.hidden)?source.hidden.filter(k=>keys.has(k)).slice(0,65):[];
 const sizes={};for(const [k,v] of Object.entries(source.sizes||{}))if(keys.has(k)&&[2,3,4,6].includes(Number(v)))sizes[k]=Number(v);
 const titles={};for(const [k,v] of Object.entries(source.titles||{}))if(keys.has(k))titles[k]=safeText(v,90);
 const m=source.metrics&&typeof source.metrics==='object'?source.metrics:{};
 const slots={};for(const [k,v] of Object.entries(m.slots||{}))if(/^[0-5]$/.test(k)&&/^[a-z_]{1,45}$/.test(String(v)))slots[k]=v;
 const native={};for(const [k,v] of Object.entries(m.native||{}))if(/^[a-zA-Z_]{1,50}$/.test(k)&&/^[a-z_]{1,45}$/.test(String(v)))native[k]=v;
 const universe=Number(m.universe);
 const metrics={slots,native,universe:Number.isSafeInteger(universe)&&universe>=1&&universe<=1e10?universe:15000000};
 const styles={elements:{}};
 const fields=['primary','secondary','background','text','border'];
 const numberFields={radius:[0,32],fontScale:[.8,1.5],borderWidth:[0,5],opacity:[30,100]};
 for(const [k,v] of Object.entries(source.styles?.elements||{}).slice(0,70)){
  if(!keys.has(k)&&!/^[k]:[0-5]$/.test(k))continue;
  if(!v||typeof v!=='object')continue;
  const val={};
  for(const field of fields)if(typeof v[field]==='string'&&/^#[a-fA-F0-9]{6}$/.test(v[field]))val[field]=v[field];
  for(const [field,[min,max]] of Object.entries(numberFields))if(v[field]!=null&&Number(v[field])>=min&&Number(v[field])<=max)val[field]=Number(v[field]);
  for(const field of ['showGrid','showLegend','showLabels'])if(typeof v[field]==='boolean')val[field]=v[field];
  if(['none','soft','strong'].includes(v.shadow))val.shadow=v.shadow;
  if(['Manrope','Inter','Arial','Georgia'].includes(v.fontFamily))val.fontFamily=v.fontFamily;
  if(['bar','line','area'].includes(v.chartType))val.chartType=v.chartType;
  styles.elements[k]=val;
 }
 const photos={};
 for(const [key,url] of Object.entries(source.photos||{})){
  if(!['C3','Basalt','Aircross','BERLINGO','HERO'].includes(key)||typeof url!=='string'||url.length>2048)continue;
  if(isMedia(url)){photos[key]=url;continue;}
  try{const u=new URL(url);if(u.protocol==='https:'&&!u.username&&!u.password)photos[key]=u.href;}catch{}
 }
 return {cards,order,hidden,sizes,titles,metrics,styles,photos};
}
function clean(state){
 if(!state||typeof state!=='object'||Array.isArray(state))throw Error('Estructura inválida');
 const pages=Array.isArray(state.pages)?state.pages:[];
 const creatives=Array.isArray(state.creatives)?state.creatives:[];
 const insights=Array.isArray(state.insights)?state.insights:[];
 if(pages.length>15||creatives.length>40||insights.length>80)throw Error('El espacio supera el máximo de páginas, creativos o insights.');
 const validId=id=>typeof id==='string'&&/^[\w-]{3,80}$/.test(id);
 const fixCard=c=>{
  if(!c||!validId(c.id)||!['metric','note','chart','comparison','ab','image','filter'].includes(c.type))return null;
  const metric=c.source==='external'&&typeof c.metric==='string'&&c.metric.length<=90?c.metric:['spend','forms','messages','impressions','reach','clicks','ctr','cpl'].includes(c.metric)?c.metric:'spend';
  const dimension=c.source==='external'&&typeof c.dimension==='string'&&c.dimension.length<=90?c.dimension:['date','week','month','quarter','model','territory','account'].includes(c.dimension)?c.dimension:'month';
  const shape=['bar','barh','line','area','table','pie','donut','gauge'].includes(c.shape)?c.shape:'bar';
  const number=(v,min,max,def)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.round(Number(v)))):def;
  const iso=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x?x:'';
  const abGroup=['model','territory','account'].includes(c.abGroup)?c.abGroup:'model';
  return {id:c.id,type:c.type,title:safeText(c.title,100),text:safeText(c.text,7000),source:c.type==='ab'?'meta':c.source==='external'?'external':'meta',metric,dimension,shape,
   abGroup,aStart:iso(c.aStart),aEnd:iso(c.aEnd),bStart:iso(c.bStart),bEnd:iso(c.bEnd),
   abModel:safeText(c.abModel,100),abTerritory:safeText(c.abTerritory,100),
   x:number(c.x,0,2400,24),y:number(c.y,0,6000,24),w:number(c.w,220,1200,410),h:number(c.h,170,850,270),
   goal:Number.isFinite(Number(c.goal))&&Number(c.goal)>0?Math.min(1e12,Number(c.goal)):null,
   color:/^#[0-9a-f]{6}$/i.test(c.color||'')?c.color:'#8abbd8',background:/^#[0-9a-f]{6}$/i.test(c.background||'')?c.background:'#ffffff',textColor:/^#[0-9a-f]{6}$/i.test(c.textColor||'')?c.textColor:'#173e57',
   image:imageRef(c.image),
   filter:['month','model'].includes(c.filter)?c.filter:'month'};
 };
 const TYPES=new Set(['date','relative','select','multi','list','radio','search','number','slider','checkbox','advanced']);
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
 if(sl?.items&&typeof sl.items==='object')for(const [k,v] of Object.entries(sl.items))if(/^[nck]:[\w-]{1,100}$/.test(k)&&v&&typeof v==='object')items[k]=Object.fromEntries(['x','y','w','h'].map(t=>[t,Number.isFinite(Number(v[t]))?Math.max(0,Math.min(6000,Math.round(Number(v[t])))):0]));
 return {version:1,revision:safeText(state.revision,85)||'initial',publishedAt:safeText(state.publishedAt,48)||null,summary:cleanSummary(state.summary),summaryLayout:{enabled:sl?.enabled===true,items},controls,
  pages:pages.filter(p=>p&&validId(p.id)).map(p=>({id:p.id,title:safeText(p.title,70),cards:(Array.isArray(p.cards)?p.cards:[]).slice(0,45).map(fixCard).filter(Boolean)})),
  insights:insights.filter(a=>a&&validId(a.id)).map(a=>({id:a.id,title:safeText(a.title,110),body:safeText(a.body,12000),updatedAt:safeText(a.updatedAt,50)})),
  creatives:creatives.filter(a=>a&&validId(a.id)).map(a=>({id:a.id,title:safeText(a.title,110),campaign:safeText(a.campaign,150),format:['Imagen','Vídeo','Carrusel','Otro'].includes(a.format)?a.format:'Otro',image:imageRef(a.image),notes:safeText(a.notes,1000)})),
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
  if(req.method==='GET'){const workspace=await read();return json(res,200,{ok:true,workspace,revision:workspace.revision,publishedAt:workspace.publishedAt});}
  if(req.method!=='POST')return error(res,405,'Método no permitido.');
  const user=await currentUser(req);
  if(!user||user.mustChange)return error(res,401,'Debes iniciar sesión como editor autorizado.');
  if(!sameOrigin(req)||!String(req.headers['content-type']||'').includes('application/json'))return error(res,403,'Origen no autorizado.');
  const raw=JSON.stringify(req.body||{});
  if(raw.length>350000)return error(res,413,'La configuración supera el tamaño permitido.');
  const published=await read();
  const expected=req.body?.expectedRevision;
  if(typeof expected!=='string'||expected!==published.revision){
   return json(res,409,{ok:false,code:'REVISION_CONFLICT',error:'Otro editor publicó una versión nueva. Tu borrador no se sobrescribió.',revision:published.revision,publishedAt:published.publishedAt});
  }
  const workspace=clean(req.body?.workspace);
  workspace.revision=randomUUID();
  workspace.publishedAt=new Date().toISOString();
  // Preserve the version being replaced, before changing the live report.
  // Snapshots are immutable, readable only by authenticated owners.
  if(published.revision!=='initial'&&/^[a-f0-9-]{36}$/i.test(published.revision)){
   const archive='private/citroen-history/'+published.revision+'.json';
   await put(archive,JSON.stringify(published),{
    access:'private',contentType:'application/json',
    addRandomSuffix:false,allowOverwrite:false
   }).catch(e=>{
    // An existing snapshot is fine; unexpected storage errors must block publication.
    if(!/already exists|precondition/i.test(String(e?.message||'')))throw e;
   });
  }
  await put(PATH,JSON.stringify(workspace),{access:'private',contentType:'application/json',allowOverwrite:true,addRandomSuffix:false});
  return json(res,200,{ok:true,revision:workspace.revision,publishedAt:workspace.publishedAt,workspace});
 }catch(e){console.error('Citroen workspace',e?.message||'error');return error(res,503,'No se pudo guardar o cargar la versión publicada.');}
}
