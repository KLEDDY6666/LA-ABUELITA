import {movimientoInventario} from './inventario-core.js';
import {auth,db} from './firebase-auth.js';
import {doc,getDoc,collection,onSnapshot,runTransaction} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
const cents=x=>Math.round(Number(x)*100);
async function autorizar(modulo='creditos'){
 const u=auth.currentUser;if(!u||!navigator.onLine)throw Error('Inicie sesión y compruebe su conexión');
 const s=await getDoc(doc(db,'usuarios',u.uid));if(!s.exists()||s.data().estado!=='activo'||!['admin','usuario'].includes(s.data().rol))throw Error('Cuenta no autorizada');
 if(s.data().rol!=='admin'&&s.data().permisos?.[modulo]===false)throw Error('No tiene permiso para '+modulo);
 return u;
}
window.abuelitaCreditosCloud={
 async crearCliente(c){const u=await autorizar();if(!Number.isSafeInteger(c.id)||!c.nombre?.trim())throw Error('Cliente inválido');await runTransaction(db,async tx=>{const r=doc(db,'clientes',String(c.id));if((await tx.get(r)).exists())throw Error('El identificador ya existe');tx.set(r,{id:c.id,nombre:c.nombre.trim(),activo:true,creadoPor:u.uid})})},
 async editarCliente(id,cambio){await autorizar();const r=doc(db,'clientes',String(id));await runTransaction(db,async tx=>{const s=await tx.get(r);if(!s.exists())throw Error('Cliente no encontrado');if('nombre'in cambio&&(!cambio.nombre?.trim()||cambio.nombre.length>150))throw Error('Nombre inválido');tx.update(r,cambio)})},
 async registrarCredito(v){
  const u=await autorizar();if(!Array.isArray(v.items)||v.items.length<1||v.items.length>4)throw Error('Máximo cuatro productos distintos');
  const id=String(v.clienteId),cliRef=doc(db,'clientes',id),ctaRef=doc(db,'cuentas',id),ventaRef=doc(db,'ventas',v.id);
  const lineas=new Map();for(const i of v.items){const cod=String(i.codigo),n=Number(i.cantidad);if(!cod||cod.includes('/')||!Number.isSafeInteger(n)||n<1||lineas.has(cod))throw Error('Productos inválidos');lineas.set(cod,n)}
  await runTransaction(db,async tx=>{
   const [cl,cta,ex]=await Promise.all([tx.get(cliRef),tx.get(ctaRef),tx.get(ventaRef)]);
   if(ex.exists())throw Error('La venta ya existe');if(!cl.exists()||cl.data().activo!==true)throw Error('Cliente inactivo o no registrado');
   const cfgSnap=await tx.get(doc(db,'configuracion','inventarioInicial'));
   const enProceso=cfgSnap.exists()&&cfgSnap.data().estado==='en_proceso';
   const prods=[];for(const [cod,n] of [...lineas.entries()].sort(([a],[b])=>a.localeCompare(b))){const r=doc(db,'productos',cod),s=await tx.get(r);if(!s.exists()||!Number.isSafeInteger(s.data().cantidad)||(!enProceso && s.data().cantidad<n))throw Error('Stock insuficiente: '+cod);prods.push({r,cod,n,p:s.data()})}
   const items=prods.map(x=>({codigo:x.cod,nombre:x.p.nombre,precio:x.p.precio,cantidad:x.n}));const totalCent=cents(items.reduce((sum,x)=>sum+Number(x.precio)*Number(x.cantidad),0));
   if(totalCent<=0)throw Error('El crédito debe tener importe positivo');
   const ant=cta.exists()?cta.data():{totalCent:0,pagadoCent:0,saldoCent:0};
   const venta={id:v.id,fecha:v.fecha,medio:'CREDITO',total:totalCent/100,totalCent,items,cantidades:Object.fromEntries(prods.map(x=>[x.cod,x.n])),clienteId:v.clienteId,clienteNombre:cl.data().nombre,registradoPor:u.uid};
   for(const x of prods){const m=movimientoInventario(x.p,x.n,'venta',v.fecha,enProceso);if(m.actualizar)tx.update(x.r,{cantidad:m.cantidad,ultimaVentaId:v.id})}
   tx.set(ventaRef,venta);
   tx.set(ctaRef,{clienteId:v.clienteId,clienteNombre:cl.data().nombre,totalCent:ant.totalCent+totalCent,pagadoCent:ant.pagadoCent,saldoCent:ant.saldoCent+totalCent,ultimaOperacionId:v.id,ultimaOperacionTipo:'CREDITO'});
  });
 },
 async registrarPago(p){
  const u=await autorizar();if(!Number.isSafeInteger(p.montoCent)||p.montoCent<1)throw Error('Monto inválido');
  const ctaRef=doc(db,'cuentas',String(p.clienteId)),pagRef=doc(db,'pagos',p.id);
  await runTransaction(db,async tx=>{
   const [cta,ex]=await Promise.all([tx.get(ctaRef),tx.get(pagRef)]);if(ex.exists())throw Error('Pago ya registrado');if(!cta.exists())throw Error('Cuenta no encontrada');
   const ant=cta.data();if(ant.saldoCent<p.montoCent)throw Error('El abono supera el saldo pendiente');
   tx.set(pagRef,{id:p.id,clienteId:p.clienteId,clienteNombre:ant.clienteNombre,monto:p.montoCent/100,montoCent:p.montoCent,fecha:p.fecha,registradoPor:u.uid});
   tx.update(ctaRef,{pagadoCent:ant.pagadoCent+p.montoCent,saldoCent:ant.saldoCent-p.montoCent,ultimaOperacionId:p.id,ultimaOperacionTipo:'PAGO'});
  });
 }
};
let deteners=[],datos={clientes:[],cuentas:[],creditos:[],pagos:[]},cargados=new Set();
function publicar(){if(cargados.size===4&&typeof window.abuelitaAplicarCreditosCompartidos==='function')window.abuelitaAplicarCreditosCompartidos(datos)}
onAuthStateChanged(auth,u=>{
 deteners.forEach(f=>f());deteners=[];cargados.clear();datos={clientes:[],cuentas:[],creditos:[],pagos:[]};if(!u)return;
 for(const [col,campo] of [['clientes','clientes'],['cuentas','cuentas'],['ventas','creditos'],['pagos','pagos']]){
  const stop=onSnapshot(collection(db,col),snap=>{
   if(snap.metadata.fromCache)return;
   datos[campo]=snap.docs.map(d=>d.data()).filter(x=>campo!=='creditos'||x.medio==='CREDITO');
   cargados.add(campo);publicar();
  },e=>console.warn('Créditos '+col+':',e.message));deteners.push(stop);
 }
});
