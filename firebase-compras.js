import {auth,db} from './firebase-auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {doc,getDoc,runTransaction,collection,query,orderBy,limit,onSnapshot} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const MAX=4;
async function autorizado(){
 const u=auth.currentUser;if(!u)throw Error('Inicie sesión');
 const s=await getDoc(doc(db,'usuarios',u.uid));const d=s.data();
 if(!s.exists()||d.estado!=='activo'||!['admin','usuario'].includes(d.rol))throw Error('Cuenta no autorizada');
 if(d.rol!=='admin'&&d.permisos?.compras===false)throw Error('No tiene permiso para registrar compras');
 return u;
}
window.abuelitaComprasCloud={async registrar(c){
 const u=await autorizado();if(!navigator.onLine)throw Error('Conéctese a internet');
 if(typeof c.id!=='string'||!/^C[0-9]+_[a-z0-9]+$/.test(c.id))throw Error('Identificador de compra inválido');
 if(typeof c.proveedorNombre!=='string'||!c.proveedorNombre.trim()||c.proveedorNombre.length>150)throw Error('Proveedor inválido');
 if(!Array.isArray(c.items)||c.items.length<1||c.items.length>MAX)throw Error('Máximo cuatro productos diferentes');
 const lineas=new Map();for(const i of c.items){const codigo=String(i.codigo),cantidad=Number(i.cantidad);if(!codigo||codigo.includes('/')||!Number.isSafeInteger(cantidad)||cantidad<1||lineas.has(codigo))throw Error('Código o cantidad inválida');lineas.set(codigo,cantidad)}
 const refCompra=doc(db,'compras',c.id);
 await runTransaction(db,async tx=>{
  const existe=await tx.get(refCompra);if(existe.exists()){if(existe.data().registradoPor!==u.uid)throw Error('ID de compra utilizado');return}
  const productos=[];
  for(const [codigo,cantidad] of [...lineas].sort(([a],[b])=>a.localeCompare(b))){
   const ref=doc(db,'productos',codigo),s=await tx.get(ref);if(!s.exists())throw Error('Producto no encontrado: '+codigo);
   const p=s.data();if(!Number.isSafeInteger(p.cantidad)||p.cantidad<0||p.cantidad+cantidad>2147483647)throw Error('Cantidad no válida: '+codigo);
   productos.push({ref,codigo,cantidad,p});
  }
  const items=productos.map(({codigo,cantidad,p})=>({codigo,nombre:p.nombre,cantidad}));
  const cantidades=Object.fromEntries(productos.map(p=>[p.codigo,p.cantidad]));
  for(const x of productos)tx.update(x.ref,{cantidad:x.p.cantidad+x.cantidad,ultimaCompraId:c.id});
  tx.set(refCompra,{id:c.id,fecha:c.fecha,proveedorNombre:c.proveedorNombre,items,cantidades,registradoPor:u.uid});
 });
}};
let cancelar=null;
onAuthStateChanged(auth,u=>{if(cancelar){cancelar();cancelar=null}if(!u){window.abuelitaAplicarComprasCompartidas?.([]);return}
 cancelar=onSnapshot(query(collection(db,'compras'),orderBy('fecha','desc'),limit(300)),s=>{
  if(s.metadata.fromCache)return;
  window.abuelitaAplicarComprasCompartidas?.(s.docs.map(d=>d.data()));
 },e=>console.warn('No se pudieron consultar compras:',e.message));
});
