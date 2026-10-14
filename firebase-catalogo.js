import {auth,db} from './firebase-auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {doc,getDoc,collection,getDocsFromServer,runTransaction} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const KEY='la_abuelita_productos_v1';
const el=document.getElementById('firebaseCatalogoEstado');
const boton=document.getElementById('actualizarCatalogoCompartido');
const say=t=>{if(el)el.textContent=t};
let active=false;
function valid(p){return typeof p.codigo==='string'&&p.codigo.length>0&&typeof p.nombre==='string'&&p.nombre.trim().length>0&&Number.isFinite(p.precio)&&p.precio>=0&&Number.isSafeInteger(p.cantidad)&&p.cantidad>=0}
async function allowed(){const u=auth.currentUser;if(!u)throw Error('Inicie sesión');const d=await getDoc(doc(db,'usuarios',u.uid));if(!d.exists()||d.data().estado!=='activo')throw Error('Cuenta no autorizada');return u}
async function refresh(){if(active)return;active=true;try{await allowed();if(!navigator.onLine){say('Sin conexión: se conserva el catálogo local.');return}say('☁️ Actualizando catálogo de Firebase…');const snap=await getDocsFromServer(collection(db,'productos'));const list=snap.docs.map(x=>{const p=x.data();return {codigo:String(p.codigo),nombre:String(p.nombre),precio:Number(p.precio),cantidad:Number(p.cantidad),creado:String(p.creado||'')}});if(!list.every(valid))throw Error('Datos de catálogo no válidos');if(list.length){if(typeof window.abuelitaAplicarCatalogo!=='function')throw Error('Interfaz todavía no preparada');window.abuelitaAplicarCatalogo(list)}say('✓ '+list.length+' productos consultados en Firebase.')}catch(e){say('⚠️ Sin actualización: '+e.message+'. Se mantienen datos locales.')}finally{active=false}}
window.abuelitaProductosCloud={
 async crear(p){const u=await allowed();if(!navigator.onLine)throw Error('Registrar productos requiere conexión en esta versión');if(!valid(p))throw Error('Datos inválidos');await runTransaction(db,async tx=>{const ref=doc(db,'productos',p.codigo);if((await tx.get(ref)).exists())throw Error('Código ya registrado en Firebase');tx.set(ref,{...p,importadoPor:u.uid})})},
 async editar(codigo,cambios){await allowed();if(!navigator.onLine)throw Error('Editar productos requiere conexión en esta versión');await runTransaction(db,async tx=>{const ref=doc(db,'productos',codigo);const old=await tx.get(ref);if(!old.exists())throw Error('Producto no encontrado en Firebase');const p={...old.data(),...cambios};if(!valid(p))throw Error('Datos inválidos');tx.update(ref,cambios)})},
 actualizar:refresh
};
onAuthStateChanged(auth,u=>{if(u)refresh();else say('Inicie sesión para actualizar el catálogo.')});
if(boton)boton.addEventListener('click',refresh);
window.addEventListener('online',()=>{if(auth.currentUser)refresh()});
