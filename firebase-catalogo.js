import {auth,db} from './firebase-auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {doc,getDoc,collection,onSnapshot,runTransaction} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const KEY='la_abuelita_productos_v1';
const el=document.getElementById('firebaseCatalogoEstado');
const say=t=>{if(el)el.textContent=t};
let unsubscribe=null;
let lastSignature='';
function valid(p){return typeof p.codigo==='string'&&p.codigo.length>0&&typeof p.nombre==='string'&&p.nombre.trim().length>0&&Number.isFinite(p.precio)&&p.precio>=0&&Number.isSafeInteger(p.cantidad)&&p.cantidad>=0}
async function allowed(){const u=auth.currentUser;if(!u)throw Error('Inicie sesión');const d=await getDoc(doc(db,'usuarios',u.uid));if(!d.exists()||d.data().estado!=='activo'||!['admin','usuario'].includes(d.data().rol))throw Error('Cuenta no autorizada');if(d.data().rol!=='admin' && d.data().permisos?.productos===false)throw Error('No tienes permiso para modificar productos');return u}
function stop(){if(unsubscribe){unsubscribe();unsubscribe=null}lastSignature=''}
function listen(){
 stop();
 if(!auth.currentUser){say('Inicie sesión para sincronizar el catálogo.');return}
 say(navigator.onLine?'☁️ Conectando con el catálogo compartido…':'Sin internet: se conserva el catálogo local.');
 // Firestore mantiene una escucha y reconecta automáticamente al regresar internet.
 unsubscribe=onSnapshot(collection(db,'productos'),{includeMetadataChanges:true},snap=>{
  if(snap.metadata.fromCache){say('Sin conexión con Firebase: se conserva el catálogo local.');return}
  const list=snap.docs.map(x=>{const p=x.data();return {codigo:String(p.codigo??''),nombre:String(p.nombre??''),precio:Number(p.precio),cantidad:Number(p.cantidad),creado:String(p.creado||'')}});
  const fallas=list.filter(p=>!valid(p));
  if(fallas.length){say('⚠️ Hay '+fallas.length+' productos inválidos en Firebase. Se conserva el catálogo anterior.');return}
  if(!list.length){say('⚠️ Catálogo vacío en Firebase. Se conservan los productos locales.');return}
  // Los cambios de metadatos y reconexiones no obligan a repintar toda la pantalla.
  const signature=JSON.stringify(list);
  if(signature!==lastSignature){
   try{if(typeof window.abuelitaAplicarCatalogo!=='function')throw Error('Interfaz todavía no preparada');window.abuelitaAplicarCatalogo(list);lastSignature=signature}
   catch(e){say('⚠️ No se pudo aplicar el catálogo: '+e.message);return}
  }
  say('✓ '+list.length+' productos sincronizados automáticamente.');
 },e=>say('⚠️ Sin sincronización: '+e.message+'. Se conservan los productos locales.'));
}
function refresh(){listen()}
window.abuelitaProductosCloud={
 async crear(p){const u=await allowed();if(!navigator.onLine)throw Error('Registrar productos requiere conexión en esta versión');if(!valid(p))throw Error('Datos inválidos');await runTransaction(db,async tx=>{const ref=doc(db,'productos',p.codigo);if((await tx.get(ref)).exists())throw Error('Código ya registrado en Firebase');tx.set(ref,{...p,importadoPor:u.uid})})},
 async editar(codigo,cambios){await allowed();if(!navigator.onLine)throw Error('Editar productos requiere conexión en esta versión');await runTransaction(db,async tx=>{const ref=doc(db,'productos',codigo);const old=await tx.get(ref);if(!old.exists())throw Error('Producto no encontrado en Firebase');const p={...old.data(),...cambios};if(!valid(p))throw Error('Datos inválidos');tx.update(ref,cambios)})},
 actualizar:refresh
};
onAuthStateChanged(auth,u=>{if(u)listen();else{stop();say('Inicie sesión para sincronizar el catálogo.')}});
window.addEventListener('online',()=>{if(auth.currentUser&&!unsubscribe)listen()});
