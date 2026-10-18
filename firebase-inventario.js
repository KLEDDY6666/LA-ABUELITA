import {auditarInventario} from './inventario-auditoria.js';
// ETAPA 2: base del inventario inicial. NO PUBLICAR SIN REGLAS REVISADAS.
import {auth,db} from './firebase-auth.js';
import {doc,getDoc,runTransaction,onSnapshot,collection,getDocsFromServer} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
const configRef=doc(db,'configuracion','inventarioInicial');
let config=null, stop=null;
function listo(){return config && ['en_proceso','finalizado'].includes(config.estado)}
window.abuelitaInventario={
 get estado(){return config?.estado||'sin_inicializar'},
 get listo(){return listo()},
 get enProceso(){return config?.estado==='en_proceso'},
 async auditar(){
  const u=auth.currentUser;if(!u||!navigator.onLine)throw Error('La auditoría requiere conexión');
  const usuario=await getDoc(doc(db,'usuarios',u.uid));
  if(!usuario.exists()||usuario.data().estado!=='activo'||usuario.data().rol!=='admin')throw Error('Solo el administrador puede revisar el cierre');
  const snap=await getDocsFromServer(collection(db,'productos'));
  return auditarInventario(snap.docs.map(d=>({...d.data(),codigo:d.id})));
 },
 // La cantidad física se introduce al contar, NO al editar nombre/precio.
 async registrarConteo(codigo,cantidad){
  const u=auth.currentUser;if(!u||!navigator.onLine)throw Error('El conteo requiere sesión y conexión');
  if(!Number.isSafeInteger(cantidad)||cantidad<0)throw Error('Cantidad física inválida');
  const usuario=await getDoc(doc(db,'usuarios',u.uid));
  if(!usuario.exists()||usuario.data().estado!=='activo'||(usuario.data().rol!=='admin'&&usuario.data().permisos?.conteo!==true))throw Error('Su cuenta no tiene permiso de conteo físico');
  await runTransaction(db,async tx=>{
   const cfg=await tx.get(configRef), ref=doc(db,'productos',String(codigo)), p=await tx.get(ref);
   if(!cfg.exists()||cfg.data().estado!=='en_proceso')throw Error('El inventario inicial no está activo');
   if(!p.exists())throw Error('Producto no encontrado');
   if(p.data().contadoEn)throw Error('Este producto ya fue contado. Use un ajuste de inventario separado');
   tx.update(ref,{cantidad,contadoEn:new Date().toISOString(),contadoPor:u.uid});
  });
 }
};
onAuthStateChanged(auth,u=>{
 if(stop){stop();stop=null}config=null;
 if(!u)return;
 stop=onSnapshot(configRef,s=>{if(!s.metadata.fromCache){config=s.exists()?s.data():null;window.dispatchEvent(new Event('abuelita-inventario-cambio'))}},e=>console.warn('Configuración de inventario:',e.message));
});
