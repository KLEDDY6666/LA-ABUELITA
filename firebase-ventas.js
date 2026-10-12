import {auth,db} from './firebase-auth.js';
import {doc,getDoc,runTransaction} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
async function verificar(){const u=auth.currentUser;if(!u)throw Error('Inicie sesión');const a=await getDoc(doc(db,'usuarios',u.uid));if(!a.exists()||a.data().estado!=='activo'||a.data().rol!=='admin')throw Error('En esta etapa las ventas requieren una cuenta administradora');return u}
window.abuelitaVentasCloud={async registrar(v){
 const u=await verificar();if(!navigator.onLine)throw Error('Sin internet');
 if(!['EFECTIVO','YAPE'].includes(v.medio))throw Error('Medio no habilitado');
 if(!Array.isArray(v.items)||!v.items.length||v.items.length>80)throw Error('Venta inválida');
 const lineas=new Map();
 for(const i of v.items){const codigo=String(i.codigo),cantidad=Number(i.cantidad);if(!codigo||!Number.isSafeInteger(cantidad)||cantidad<1)throw Error('Cantidad inválida');lineas.set(codigo,(lineas.get(codigo)||0)+cantidad)}
 const orden=[...lineas.entries()].sort(([a],[b])=>a.localeCompare(b));
 const vr=doc(db,'ventas',String(v.id));
 await runTransaction(db,async tx=>{
   const existe=await tx.get(vr);if(existe.exists())return; // reintento idempotente
   const productos=[];
   for(const [codigo,cantidad] of orden){const ref=doc(db,'productos',codigo);const snap=await tx.get(ref);if(!snap.exists())throw Error('Producto no encontrado: '+codigo);const stock=snap.data().cantidad;if(!Number.isSafeInteger(stock)||stock<cantidad)throw Error('Stock insuficiente para '+snap.data().nombre);productos.push({ref,stock,cantidad})}
   for(const p of productos)tx.update(p.ref,{cantidad:p.stock-p.cantidad});
   tx.set(vr,{...v,registradoPor:u.uid});
 });
}};
