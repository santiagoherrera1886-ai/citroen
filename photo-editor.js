/* Self-service Citroen vehicle media manager. Images are optional user overrides, never synthesized. */
(function(){
"use strict";
const KEY="citroen_vehicle_images_v1";
const items=[
 {id:"C3",name:"Citroën C3",original:"./assets/models/c3.webp"},
 {id:"Basalt",name:"Citroën Basalt",original:"./assets/models/basalt.webp"},
 {id:"Aircross",name:"Citroën Aircross",original:"./assets/models/aircross.webp"},
 {id:"BERLINGO",name:"Citroën Berlingo",original:"./assets/models/berlingo.webp"},
 {id:"HERO",name:"Portada · C3 Aircross",original:"./assets/models/aircross.webp"}
];
const $=id=>document.getElementById(id);
const dataURI=x=>typeof x==="string"&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x)&&x.length<430000;
const secureURL=x=>{try{const u=new URL(x);return u.protocol==="https:"&&u.username===""&&u.password===""&&u.href.length<2048;}catch{return false;}};
const valid=x=>secureURL(x)||dataURI(x);
let images={};
function restore(){try{const o=JSON.parse(localStorage.getItem(KEY)||"{}");if(o&&typeof o==="object")for(const item of items){if(valid(o[item.id]))images[item.id]=o[item.id]}}catch{}}
restore();
function save(){try{localStorage.setItem(KEY,JSON.stringify(images));return true;}catch{notify("No se pudo guardar: el navegador alcanzó su límite local. Prueba con fotos más pequeñas.");return false;}}
function notify(s){if($("studioPhotoStatus"))$("studioPhotoStatus").textContent=s;}
function apply(){
 const current=Array.from(document.querySelectorAll("#c3Models .c3-model-card"));
 for(const card of current){
  const m=card.querySelector(".c3-model-photo>span")?.textContent?.trim();
  const target=items.find(it=>it.id.toLowerCase()===String(m||"").toLowerCase());if(!target)continue;
  const img=card.querySelector(".c3-model-photo img");if(!img)continue;
  const custom=images[target.id];
  if(custom){
   if(img.getAttribute("src")!==custom){
    img.onerror=()=>{img.onerror=null;img.src=target.original;notify("La imagen de "+target.name+" no pudo cargarse. Se muestra la foto original.");};
    img.src=custom;img.style.display="";
   }
  }
 }
 const hero=$("c3HeroCar");
 if(hero&&images.HERO&&hero.getAttribute("src")!==images.HERO){
  hero.onerror=()=>{hero.onerror=null;hero.src=items[2].original;notify("No se pudo cargar la imagen de portada; se restauró visualmente la original.");};
  hero.src=images.HERO;hero.style.display="";
 }
 const grid=$("studioPhotoModels");
 if(grid)grid.querySelectorAll("[data-photo-preview]").forEach(el=>{const item=items.find(x=>x.id===el.dataset.photoPreview);if(item){const val=images[item.id]||item.original;if(el.getAttribute("src")!==val)el.src=val;}});
}
function setImage(id,source){
 if(!items.some(x=>x.id===id)||!valid(source))return false;
 images[id]=source;if(!save())return false;
 apply();render();
 return true;
}
function remove(id){
 if(!items.some(x=>x.id===id))return;
 delete images[id];save();
 // Restoring a model photo needs the original rendered DOM; emit a read-only refresh of summary.
 document.dispatchEvent(new Event("citroen:refresh-model-images"));
 const hero=$("c3HeroCar");if(id==="HERO"&&hero){hero.onerror=null;hero.src=items[2].original;hero.style.display="";}
 apply();render();
}
function resetAll(){images={};save();document.dispatchEvent(new Event("citroen:refresh-model-images"));const hero=$("c3HeroCar");if(hero){hero.onerror=null;hero.src=items[2].original;hero.style.display="";}render();notify("Imágenes originales restauradas.");}
function replace(o){
 if(!o||typeof o!=="object")return;
 images={};
 for(const m of items){if(valid(o[m.id]))images[m.id]=o[m.id]}
 save();document.dispatchEvent(new Event("citroen:refresh-model-images"));apply();render();
}
function render(){
 const el=$("studioPhotoModels");if(!el)return;
 el.innerHTML=items.map(item=>
 '<article class="studio-photo-card" data-photo-model="'+item.id+'">'+
 '<img alt="Vista previa de '+item.name+'" data-photo-preview="'+item.id+'" src="'+(images[item.id]||item.original)+'">'+
 '<div class="studio-photo-detail"><strong>'+item.name+'</strong><small>'+ (images[item.id]?"Imagen personalizada · guardada en este navegador":"Imagen original Citroën")+'</small>'+
 '<label class="studio-photo-upload">↑ Subir imagen<input type="file" data-photo-file="'+item.id+'" accept="image/jpeg,image/png,image/webp" aria-label="Subir foto '+item.name+'"></label>'+
 '<div class="studio-photo-url"><input type="url" placeholder="https://.../mi-foto.webp" data-photo-url="'+item.id+'" aria-label="URL de foto de '+item.name+'"><button type="button" data-photo-apply="'+item.id+'">Aplicar URL</button></div>'+
 '<button type="button" class="studio-photo-restore" data-photo-reset="'+item.id+'">Restaurar original</button></div></article>').join("");
}
function open(){render();$("studioPhotoDialog").hidden=false;notify("Selecciona fotos de los modelos y la portada. Se guardan localmente, sin alterar los indicadores.");}
function close(){$("studioPhotoDialog").hidden=true;}
function upload(id,file){
 if(!file)return;
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)){notify("Usa JPG, PNG o WebP.");return;}
 if(file.size>5*1024*1024){notify("La imagen supera 5 MB. Comprime el archivo y vuelve a intentarlo.");return;}
 const reader=new FileReader();
 reader.onerror=()=>notify("No se pudo leer el archivo.");
 reader.onload=()=>{
  const picture=new Image();
  picture.onerror=()=>notify("La imagen no pudo abrirse; utiliza otro JPG, PNG o WebP.");
  picture.onload=()=>{
   const max=950,scale=Math.min(1,max/Math.max(picture.naturalWidth||picture.width,picture.naturalHeight||picture.height));
   const canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.round((picture.naturalWidth||picture.width)*scale));
   canvas.height=Math.max(1,Math.round((picture.naturalHeight||picture.height)*scale));
   const ctx=canvas.getContext("2d");
   if(!ctx){notify("Este navegador no permitió procesar la imagen.");return;}
   ctx.clearRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(picture,0,0,canvas.width,canvas.height);
   let encoded="";
   try{for(const q of [.86,.74,.58,.44]){encoded=canvas.toDataURL("image/jpeg",q);if(dataURI(encoded))break;}}catch{notify("No fue posible comprimir la imagen.");return;}
   if(!dataURI(encoded)){notify("La foto sigue siendo demasiado grande. Utiliza una versión de menor resolución.");return;}
   if(setImage(id,encoded))notify("Foto de "+items.find(x=>x.id===id).name+" actualizada y guardada en este navegador.");
  };
  picture.src=String(reader.result||"");
 };
 reader.readAsDataURL(file);
}
function wire(){
 if(!$("studioPhotos"))return;
 $("studioPhotos").onclick=open;
 $("studioPhotoClose").onclick=close;$("studioPhotoDone").onclick=close;
 $("studioPhotoDialog").addEventListener("click",e=>{if(e.target.hasAttribute("data-photo-close"))close();});
 $("studioPhotoModels").addEventListener("click",e=>{
  const applyB=e.target.closest("[data-photo-apply]");
  if(applyB){
   const id=applyB.dataset.photoApply,field=$("studioPhotoModels").querySelector('[data-photo-url="'+id+'"]');
   if(!valid(field.value)){notify("Utiliza una URL HTTPS de imagen válida, sin credenciales.");return;}
   if(setImage(id,field.value))notify("Fotografía de "+items.find(x=>x.id===id).name+" actualizada.");
  }
  const resetB=e.target.closest("[data-photo-reset]");if(resetB){remove(resetB.dataset.photoReset);notify("Se restauró la imagen de "+items.find(x=>x.id===resetB.dataset.photoReset).name+".");}
 });
 $("studioPhotoModels").addEventListener("change",e=>{const input=e.target.closest("[data-photo-file]");if(input)upload(input.dataset.photoFile,input.files?.[0]);});
 $("studioPhotoResetAll").onclick=()=>{if(confirm("¿Restaurar todas las imágenes originales de Citroën?"))resetAll();};
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("studioPhotoDialog").hidden)close();});
 document.addEventListener("citroen:summary-rendered",apply);
 apply();
}
window.CITROEN_PHOTO_EDITOR={set:setImage,reset:remove,resetAll,replace,export:()=>({...images}),apply};
document.addEventListener("DOMContentLoaded",wire);
})();