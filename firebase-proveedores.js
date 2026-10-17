import {auth,db} from './firebase-auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {doc,getDoc,collection,onSnapshot,setDoc,updateDoc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
async function administrador(){const u=auth.currentUser;if(!u)throw Error('Inicie sesión');const s=await getDoc(doc(db,'usuarios',u.uid));if(!s.exists()||s.data().estado!=='activo'||s.data().rol!=='admin')throw Error('Solo el administrador puede gestionar proveedores');if(!navigator.onLine)throw Error('Se necesita internet');return u}
window.abuelitaProveedoresCloud={
 async crear(p){const u=await administrador();if(!Number.isSafeInteger(p.id)||p.id<1||typeof p.nombre!=='string'||!p.nombre.trim()||p.nombre.length>150)throw Error('Proveedor inválido');await setDoc(doc(db,'proveedores',String(p.id)),{id:p.id,nombre:p.nombre.trim(),activo:true,creadoPor:u.uid});},
 async editar(id,cambios){await administrador();if(!Number.isSafeInteger(id))throw Error('ID inválido');if('nombre' in cambios&&(typeof cambios.nombre!=='string'||!cambios.nombre.trim()||cambios.nombre.length>150))throw Error('Nombre inválido');await updateDoc(doc(db,'proveedores',String(id)),cambios)}
};
let cancelar=null;onAuthStateChanged(auth,u=>{if(cancelar){cancelar();cancelar=null}if(!u)return;
 cancelar=onSnapshot(collection(db,'proveedores'),s=>{if(s.metadata.fromCache)return;window.abuelitaAplicarProveedoresCompartidos?.(s.docs.map(x=>x.data()))},e=>console.warn('Proveedores:',e.message));
});
