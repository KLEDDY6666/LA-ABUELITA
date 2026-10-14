import {auth,db} from './firebase-auth.js';
import {doc,getDoc,runTransaction,collection,query,orderBy,limit,onSnapshot} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const MAX=4;
async function verificar(){const u=auth.currentUser;if(!u)throw Error('Inicie sesión');const a=await getDoc(doc(db,'usuarios',u.uid));if(!a.exists()||a.data().estado!=='activo'||!['admin','usuario'].includes(a.data().rol))throw Error('La cuenta no tiene permiso para registrar ventas');return u}
window.abuelitaVentasCloud={async registrar(v){
 const u=await verificar();if(!navigator.onLine)throw Error('Sin internet');
 if(!['EFECTIVO','YAPE'].includes(v.medio))throw Error('Medio no habilitado');
 if(!Array.isArray(v.items)||!v.items.length||v.items.length>MAX)throw Error('Por seguridad, cada venta admite hasta '+MAX+' productos diferentes.');
 const lineas=new Map();
 for(const i of v.items){const codigo=String(i.codigo),cantidad=Number(i.cantidad);if(!codigo||codigo.includes('/')||!Number.isSafeInteger(cantidad)||cantidad<1||lineas.has(codigo))throw Error('Productos o cantidades inválidos');lineas.set(codigo,cantidad)}
 const orden=[...lineas.entries()].sort(([a],[b])=>a.localeCompare(b));
 const vr=doc(db,'ventas',String(v.id));
 await runTransaction(db,async tx=>{
  const existe=await tx.get(vr);if(existe.exists()){if(existe.data().registradoPor!==u.uid)throw Error('ID de venta ya utilizado');return}
  const productos=[];
  for(const [codigo,cantidad] of orden){const ref=doc(db,'productos',codigo);const snap=await tx.get(ref);if(!snap.exists())throw Error('Producto no encontrado: '+codigo);const p=snap.data();if(!Number.isSafeInteger(p.cantidad)||p.cantidad<cantidad)throw Error('Stock insuficiente para '+p.nombre);productos.push({ref,codigo,cantidad,p})}
  const items=productos.map(({codigo,cantidad,p})=>({codigo,nombre:p.nombre,precio:p.precio,cantidad}));
  const total=Math.round(items.reduce((s,i)=>s+i.precio*i.cantidad,0)*100)/100;
  const cantidades=Object.fromEntries(productos.map(p=>[p.codigo,p.cantidad]));
  for(const {ref,cantidad,p} of productos)tx.update(ref,{cantidad:p.cantidad-cantidad,ultimaVentaId:v.id});
  tx.set(vr,{id:v.id,fecha:v.fecha,medio:v.medio,total,items,cantidades,clienteId:v.clienteId??null,clienteNombre:v.clienteNombre||'',registradoPor:u.uid});
 });
}};
// Historial compartido: muestra ventas de todos los usuarios activos, no solo del dispositivo.
let stop=null;
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
onAuthStateChanged(auth,u=>{
 if(stop){stop();stop=null}if(!u)return;
 stop=onSnapshot(query(collection(db,'ventas'),orderBy('fecha','desc'),limit(300)),snap=>{
  if(snap.metadata.fromCache)return;
  const data=snap.docs.map(d=>d.data());
  if(typeof window.abuelitaAplicarVentasCompartidas==='function')window.abuelitaAplicarVentasCompartidas(data);
 },e=>console.warn('Historial compartido no disponible:',e.message));
});
