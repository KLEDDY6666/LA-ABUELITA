import {auth,db} from './firebase-auth.js';
import {doc,getDoc,collection,getDocs} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
window.abuelitaRespaldoCloud={async exportar(){
 const u=auth.currentUser;if(!u||!navigator.onLine)throw Error('Debe iniciar sesión y tener internet');
 const r=await getDoc(doc(db,'usuarios',u.uid));if(!r.exists()||r.data().rol!=='admin'||r.data().estado!=='activo')throw Error('Solo el administrador puede descargar respaldos');
 const nombres=['productos','ventas','compras','proveedores','usuarios'];const salida={};
 for(const n of nombres){const s=await getDocs(collection(db,n));salida[n]=s.docs.map(d=>({documentoId:d.id,...d.data()}));}
 return salida;
}};
