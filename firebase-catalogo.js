import {auth,db} from './firebase-auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {doc,getDoc,collection,getDocsFromServer} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const KEY='la_abuelita_productos_v1';
const state=document.getElementById('firebaseCatalogoEstado');
function say(s){if(state)state.textContent=s;}
let running=false;
async function hydrate(user){
 if(running)return;running=true;
 try{
  const permiso=await getDoc(doc(db,'usuarios',user.uid));
  if(!permiso.exists()||permiso.data().estado!=='activo')return;
  const local=JSON.parse(localStorage.getItem(KEY)||'[]');
  if(!Array.isArray(local))throw Error('Catálogo local no válido; se conserva sin cambios.');
  if(local.length){say('📱 Catálogo local: '+local.length+' productos. No se reemplazaron datos locales.');return;}
  say('☁️ Descargando catálogo de Firebase…');
  const snap=await getDocsFromServer(collection(db,'productos'));
  if(snap.empty){say('No hay productos en Firebase.');return;}
  const items=snap.docs.map(d=>{const p=d.data();return {codigo:String(p.codigo),nombre:String(p.nombre),precio:Number(p.precio),cantidad:Number(p.cantidad),creado:String(p.creado||'')}});
  if(items.some(p=>!p.codigo||!p.nombre||!Number.isFinite(p.precio)||!Number.isSafeInteger(p.cantidad)))throw Error('Datos de productos no válidos.');
  // No sobrescribir una edición realizada mientras se descargaba el catálogo.
  const current=JSON.parse(localStorage.getItem(KEY)||'[]');
  if(!Array.isArray(current)||current.length){say('Catálogo local cambiado; no se reemplazó.');return;}
  localStorage.setItem(KEY,JSON.stringify(items));
  // app.js usa una variable léxica global; actualizarla sin recargar y refrescar las vistas.
  if(typeof productos!=='undefined'){productos=items; if(typeof render==='function')render();}
  say('✓ '+items.length+' productos descargados y guardados en este dispositivo.');
 }catch(e){say('⚠️ No se pudo descargar el catálogo: '+(e.code||e.message)+'. Los datos locales siguen intactos.');}
 finally{running=false;}
}
onAuthStateChanged(auth,user=>{if(user)hydrate(user);else say('Inicia sesión para consultar el catálogo.');});
