(function(){
'use strict';
const sourceUrl='https://docs.google.com/spreadsheets/d/1ku1vk57fU0_wHChmXObUaUpvw4KARMj6T1vqLpp5YBo/edit';
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(){
 const el=document.getElementById('campaignSyncState');if(!el)return;
 const s=window.CITROEN_CAMPAIGN_FEED?.status()||{};
 el.textContent=s.connected?`${s.rows.toLocaleString('es-CO')} registros · Último dato: ${s.dateMax} · Último envío: ${new Date(s.syncedAt).toLocaleString('es-CO',{timeZone:'America/Bogota'})}`+(s.stale?' · No se ha recibido una actualización reciente.':'')+(s.scheduled?' · Activador horario confirmado por el script.':' · No se ha confirmado un activador horario.'): 'Pendiente de autorización en Google. El dashboard conserva la exportación anterior hasta recibir la primera sincronización.';
}
function mount(root){
 if(!window.CITROEN_ACCESS?.canEdit())return;
 root.innerHTML=`<section class="source-card campaign-connection"><div><span class="source-eyebrow">FUENTE PRINCIPAL DEL DASHBOARD</span><h3>DATA CITROEN AÑO <span class="source-pill">Cada hora</span></h3><p>Citroen Seguimiento de campañas · pestaña anual · columnas A:P · resultados de 2026.</p><p id="campaignSyncState" role="status"></p><p>Actualiza Resumen, Meta Ads y gráficos de Meta en el editor. Cada envío reemplaza la versión completa: no suma otra vez los mismos registros. El informe publicado mostrará las métricas y nombres de campañas de esta pestaña.</p></div><div class="campaign-connection-actions"><a href="${sourceUrl}" target="_blank" rel="noopener">Abrir hoja original ↗</a><button type="button" id="campaignPrepare" class="source-primary">Preparar actualización automática</button><button type="button" id="campaignCheck">Comprobar conexión</button></div><details id="campaignSetup" hidden><summary>Activación inicial en Google</summary><ol><li>Copia el código de abajo.</li><li>Abre <b>Extensiones → Apps Script</b> desde la hoja, o usa tu proyecto independiente de Apps Script. Pega el código en un archivo nuevo <b>CitroenSync.gs</b>.</li><li>Guarda, elige <b>instalarCitroenSync</b>, pulsa <b>Ejecutar</b> y autoriza con tu cuenta de Google.</li><li>Vuelve aquí y pulsa <b>Comprobar conexión</b>. El primer envío puede tardar unos minutos.</li></ol><p>La hoja permanece privada. El script lee únicamente DATA CITROEN AÑO y envía sus métricas al dashboard. Abre el archivo por su ID. Google solicitará acceso a Sheets; el código solo lee la pestaña indicada y no modifica celdas. No necesita una cuenta de servicio. Si Google Workspace bloquea el permiso, solicita aprobación al administrador.</p><label for="campaignScript">Código privado de conexión<textarea id="campaignScript" readonly spellcheck="false"></textarea></label><button type="button" id="campaignCopy">Copiar código</button><p>Generar otro código reemplaza la clave anterior. Para pausar, ejecuta <b>pausarCitroenSync</b> en Apps Script.</p></details><p id="campaignSetupMessage" role="status"></p></section>`;
 const prepare=root.querySelector('#campaignPrepare'),msg=root.querySelector('#campaignSetupMessage');
 prepare.disabled=!window.CITROEN_ACCESS.isOwner?.();
 if(prepare.disabled)msg.textContent='El administrador del dashboard debe activar esta conexión.';
 prepare.onclick=async()=>{
  prepare.disabled=true;msg.textContent='Preparando la conexión con la pestaña anual…';
  try{
   const response=await fetch('/api/campaign-sync',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'setup'})});const result=await response.json();
   if(!response.ok||!result.ok)throw Error(result.error||'No se pudo preparar la conexión.');
   // Discard the credential if the session ended while the request was running.
   if(!window.CITROEN_ACCESS?.canEdit())return;
   const details=root.querySelector('#campaignSetup');details.hidden=false;details.open=true;root.querySelector('#campaignScript').value=result.script;
   msg.textContent='Código listo. Falta ejecutarlo y autorizarlo en Google; todavía no confirma una conexión.';
   prepare.textContent='Generar código nuevo (reemplaza la clave)';
  }catch(e){msg.textContent=e.message;}finally{prepare.disabled=!window.CITROEN_ACCESS?.isOwner?.();}
 };
 root.querySelector('#campaignCopy').onclick=async()=>{const area=root.querySelector('#campaignScript');try{await navigator.clipboard.writeText(area.value);msg.textContent='Código copiado. Pégalo en el archivo nuevo CitroenSync.gs.';}catch{area.focus();area.select();msg.textContent='Seleccioné el código. Cópialo con Ctrl/Cmd+C.';}};
 root.querySelector('#campaignCheck').onclick=async()=>{await window.CITROEN_CAMPAIGN_FEED?.refresh();status();};
 status();void window.CITROEN_CAMPAIGN_FEED?.refresh();
}
document.addEventListener('citroen:campaign-status',status);
document.addEventListener('citroen:auth-changed',()=>{if(!window.CITROEN_ACCESS?.canEdit()){const panel=document.getElementById('campaignSyncPanel');if(panel)panel.replaceChildren();}});
window.CITROEN_CAMPAIGN_CONNECTION={mount};
})();
