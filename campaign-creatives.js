/* Live ad library: image and metrics are joined by account, campaign, ad set and ad. */
(function(){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=value=>Number(value||0).toLocaleString('es-CO',{maximumFractionDigits:0});
const money=value=>'$ '+number(value);
const imageURL=value=>typeof value==='string'&&value.length<=4096&&/^https:\/\/(?:[a-z0-9-]+\.)*(?:fbcdn\.net|fbsbx\.com|cdninstagram\.com)\/[^\s\\<>"']+$/i.test(value)?value:'';
const keyOf=values=>JSON.stringify(values);
const filters={month:'',model:'',search:'',sort:'spend',images:false};
let root=null,snapshot=null,seed=null,seedPromise=null,page=1,visible=[],returnFocus=null;
const pageSize=24;
function seedCatalog(){
 if(seedPromise)return seedPromise;
 seedPromise=fetch('./data/campaign-media.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Catálogo no disponible');return r.json();}).then(data=>{seed=data;return data;}).catch(()=>({items:[]}));
 return seedPromise;
}
function rows(){
 const detail=snapshot?.detail,d=detail?.dictionaries;
 if(!d||!Array.isArray(detail.creatives))return [];
 const media=new Map();
 if(detail.media_version===1){
  for(const item of detail.creative_media||[])media.set(keyOf(item.slice(0,4)),{date:item[4],image:imageURL(item[5]),thumbnail:imageURL(item[6])});
 }else{
  for(const item of seed?.items||[])media.set(keyOf(item.key),{date:item.date,image:imageURL(item.image),thumbnail:imageURL(item.thumbnail)});
 }
 const groups=new Map(),query=filters.search.trim().toLocaleLowerCase('es');
 for(const values of detail.creatives){
  const month=d.months[values[0]],campaign=d.campaigns[values[1]],adset=d.adsets[values[2]],ad=d.ads[values[3]],account=d.accounts[values[4]],model=d.models[values[5]];
  if(filters.month&&month!==filters.month||filters.model&&model!==filters.model)continue;
  if(query&&![ad,adset,campaign,account,model].join(' ').toLocaleLowerCase('es').includes(query))continue;
  const identity=[values[4],values[1],values[2],values[3]],key=keyOf(identity);
  const asset=media.get(detail.media_version===1?key:keyOf([account,campaign,adset,ad]))||{};
  if(filters.images&&!asset.image&&!asset.thumbnail)continue;
  let row=groups.get(key);
  if(!row){row={key,ad,adset,campaign,account,model,...asset,spend:0,forms:0,messages:0,impressions:0,clicks:0};groups.set(key,row);}
  ['spend','forms','messages','impressions','clicks'].forEach((field,index)=>row[field]+=values[7+index]);
 }
 return [...groups.values()].sort((a,b)=>filters.sort==='recent'?String(b.date||'').localeCompare(String(a.date||''))||b.spend-a.spend:b[filters.sort]-a[filters.sort]||a.ad.localeCompare(b.ad));
}
function previewImage(image,item,failure){
 const primary=item.image||item.thumbnail;
 image.referrerPolicy='no-referrer';image.decoding='async';
 image.onerror=()=>{
  if(item.thumbnail&&image.getAttribute('src')!==item.thumbnail){image.src=item.thumbnail;return;}
  image.hidden=true;failure.hidden=false;
 };
 image.src=primary;
}
function closePreview(){
 const dialog=document.getElementById('campaignMediaPreview');if(!dialog)return;
 if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
 returnFocus?.focus();
}
function openPreview(item,trigger){
 let dialog=document.getElementById('campaignMediaPreview');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='campaignMediaPreview';dialog.className='campaign-media-dialog';document.body.append(dialog);dialog.addEventListener('click',event=>{if(event.target===dialog)closePreview();});}
 returnFocus=trigger;
 dialog.setAttribute('aria-label','Vista del anuncio '+item.ad);
 dialog.innerHTML='<button type="button" class="campaign-media-close" aria-label="Cerrar anuncio">×</button><div class="campaign-media-stage"><img alt="'+esc(item.ad)+'"><p class="campaign-image-failed" hidden>La imagen no está disponible. Se conserva el rendimiento del anuncio.</p></div><div class="campaign-media-info"><span class="campaign-media-eyebrow">'+esc(item.model)+' · META ADS</span><h3>'+esc(item.ad||'Anuncio sin nombre')+'</h3><p>'+esc(item.campaign)+'</p><p>Conjunto: '+esc(item.adset)+'</p><p>Cuenta: '+esc(item.account)+'</p><div class="campaign-media-metrics"><span>Inversión<strong>'+money(item.spend)+'</strong></span><span>Formularios<strong>'+number(item.forms)+'</strong></span><span>Conversaciones<strong>'+number(item.messages)+'</strong></span><span>CTR enlace<strong>'+(item.impressions?(100*item.clicks/item.impressions).toLocaleString('es-CO',{maximumFractionDigits:2})+' %':'—')+'</strong></span></div><small>Imagen más reciente disponible: '+esc(item.date||'sin fecha')+'. Las métricas corresponden al período seleccionado.</small></div>';
 dialog.querySelector('.campaign-media-close').onclick=closePreview;
 previewImage(dialog.querySelector('img'),item,dialog.querySelector('.campaign-image-failed'));
 if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
 dialog.querySelector('button').focus();
}
function drawResults(){
 if(!root?.isConnected||!snapshot)return;
 const all=rows();page=Math.max(1,Math.min(page,Math.ceil(all.length/pageSize)||1));
 const sums=all.reduce((s,r)=>({spend:s.spend+r.spend,forms:s.forms+r.forms,messages:s.messages+r.messages,images:s.images+Number(!!(r.image||r.thumbnail))}),{spend:0,forms:0,messages:0,images:0});
 root.querySelector('.campaign-media-summary').innerHTML=[['Anuncios',number(all.length)],['Con imagen',number(sums.images)],['Inversión Meta',money(sums.spend)],['Formularios',number(sums.forms)],['Conversaciones',number(sums.messages)]].map(([label,value])=>'<div><span>'+label+'</span><strong>'+value+'</strong></div>').join('');
 visible=all.slice((page-1)*pageSize,page*pageSize);
 const grid=root.querySelector('.campaign-media-grid');
 grid.innerHTML=visible.length?visible.map((item,index)=>'<article class="campaign-media-card"><button type="button" class="campaign-media-view" data-preview="'+index+'" aria-label="Ver anuncio '+esc(item.ad)+'" '+(!item.image&&!item.thumbnail?'disabled':'')+'>'+(item.image||item.thumbnail?'<img loading="lazy" alt="'+esc(item.ad)+'"><span class="campaign-media-enlarge">Ampliar ↗</span>':'')+'<span class="campaign-image-failed" '+(item.image||item.thumbnail?'hidden':'')+'>Imagen no disponible</span></button><div class="campaign-media-caption"><span class="campaign-media-model">'+esc(item.model)+'</span><h3 title="'+esc(item.ad)+'">'+esc(item.ad||'Anuncio sin nombre')+'</h3><p title="'+esc(item.campaign)+'">'+esc(item.campaign)+'</p><div class="campaign-media-metrics"><span>Inversión<strong>'+money(item.spend)+'</strong></span><span>Formularios<strong>'+number(item.forms)+'</strong></span><span>Conversaciones<strong>'+number(item.messages)+'</strong></span></div><small>'+esc(item.account)+' · '+esc(item.date||'Sin imagen en la fuente')+'</small></div></article>').join(''):'<div class="builder-empty">No hay anuncios con estos filtros. Prueba otro período o búsqueda.</div>';
 grid.querySelectorAll('[data-preview]').forEach(button=>{const item=visible[Number(button.dataset.preview)],image=button.querySelector('img');if(image)previewImage(image,item,button.querySelector('.campaign-image-failed'));button.onclick=()=>openPreview(item,button);});
 root.querySelector('.campaign-media-pagination').innerHTML='<button type="button" data-page="previous" '+(page===1?'disabled':'')+'>← Anterior</button><span role="status">'+(all.length?((page-1)*pageSize+1)+'–'+Math.min(page*pageSize,all.length):'0')+' de '+number(all.length)+' anuncios</span><button type="button" data-page="next" '+(page*pageSize>=all.length?'disabled':'')+'>Siguiente →</button>';
 root.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>{page+=button.dataset.page==='next'?1:-1;drawResults();root.querySelector('.campaign-media-filters').scrollIntoView({block:'start'});});
}
function render(){
 if(!root?.isConnected||!snapshot)return;
 const d=snapshot.detail.dictionaries;
 const option=(value,label)=>'<option value="'+esc(value)+'">'+esc(label)+'</option>';
 root.innerHTML='<div class="campaign-media-heading"><div><span class="campaign-media-eyebrow">META ADS · DATA CITROEN AÑO</span><h3>Biblioteca de anuncios</h3><p>Las piezas de tus campañas, junto a sus resultados.</p></div><span class="campaign-media-source">'+(snapshot.detail.media_version===1?'Imágenes sincronizadas':'Imágenes del Sheet · 28 oct. 2026')+'</span></div><div class="campaign-media-summary"></div><div class="campaign-media-filters"><label class="campaign-media-search">Buscar anuncio o campaña<input type="search" data-filter="search" placeholder="Nombre, campaña, conjunto…" value="'+esc(filters.search)+'"></label><label>Período<select data-filter="month">'+option('','Todo 2026')+[...d.months].sort().reverse().map(value=>option(value,new Date(value+'-02T12:00:00Z').toLocaleDateString('es-CO',{month:'long',year:'numeric',timeZone:'UTC'}))).join('')+'</select></label><label>Modelo<select data-filter="model">'+option('','Todos los modelos')+[...d.models].sort().map(value=>option(value,value)).join('')+'</select></label><label>Ordenar por<select data-filter="sort">'+[['spend','Mayor inversión'],['forms','Más formularios'],['messages','Más conversaciones'],['recent','Imagen más reciente']].map(([value,label])=>option(value,label)).join('')+'</select></label><label class="campaign-media-toggle"><input type="checkbox" data-filter="images"> Solo con imagen</label><button type="button" class="campaign-media-reset">Limpiar</button></div><p class="campaign-media-note">Formularios y conversaciones son resultados separados. La vista muestra la imagen más reciente disponible de cada anuncio.</p><div class="campaign-media-grid"></div><div class="campaign-media-pagination"></div>';
 root.querySelectorAll('[data-filter]').forEach(control=>{
  const field=control.dataset.filter;if(field==='images')control.checked=filters.images;else control.value=filters[field];
  control.addEventListener(field==='search'?'input':'change',()=>{filters[field]=field==='images'?control.checked:control.value;page=1;drawResults();});
 });
 root.querySelector('.campaign-media-reset').onclick=()=>{Object.assign(filters,{month:'',model:'',search:'',sort:'spend',images:false});page=1;render();};
 drawResults();
}
async function mount(target){
 root=target;
 if(snapshot){if(snapshot.detail.media_version!==1&&!seed)await seedCatalog();render();return;}
 target.innerHTML='<p class="builder-empty" role="status">Cargando anuncios e imágenes…</p>';
 try{const [data]=await Promise.all([window.CITROEN_CAMPAIGN_FEED.load(),seedCatalog()]);snapshot=data;render();}
 catch{if(root?.isConnected)root.innerHTML='<p class="builder-empty">No se pudo cargar la biblioteca. Vuelve a abrir Creativos para reintentar.</p>';}
}
document.addEventListener('citroen:campaign-data',event=>{if(event.detail){snapshot=event.detail;render();}});
window.CITROEN_CAMPAIGN_CREATIVES={mount};
})();
