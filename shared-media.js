/* Upload once, reference everywhere. Files remain private until a dashboard publishes the image URL. */
(function(){
'use strict';
const pattern=/^\/api\/media\?id=m-[a-f0-9]{32}$/;
async function upload(image){
 if(typeof image!=='string'||!/^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(image)||image.length>460000)throw Error('La imagen debe estar optimizada como JPG de máximo 330 KB.');
 const response=await fetch('/api/media',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({image})});
 let payload={};try{payload=await response.json();}catch{}
 if(!response.ok||!pattern.test(payload.url||''))throw Error(payload.error||'No fue posible subir la imagen al servidor.');
 return payload.url;
}
window.CITROEN_SHARED_MEDIA={upload,isManaged:url=>pattern.test(url||'')};
})();
