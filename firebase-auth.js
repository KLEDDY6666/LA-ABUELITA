import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const firebaseConfig = {apiKey:'AIzaSyDcx4GArTYoC_n9UGzZXhQNemd_I_2nlEI',authDomain:'la-abuelita-7e630.firebaseapp.com',projectId:'la-abuelita-7e630',storageBucket:'la-abuelita-7e630.firebasestorage.app',messagingSenderId:'280542897794',appId:'1:280542897794:web:267ee18b2aa9a8e00a769b'};
const app=initializeApp(firebaseConfig);const db=getFirestore(app);const auth=getAuth(app);const provider=new GoogleAuthProvider();
const el=id=>document.getElementById(id), estado=el('firebaseEstado'), entrar=el('firebaseEntrar'), identidad=el('firebaseIdentidad'), salir=el('firebaseSalir');
entrar.onclick=async()=>{entrar.disabled=true;estado.textContent='Abriendo acceso con Google…';try{await signInWithPopup(auth,provider)}catch(e){if(e.code==='auth/popup-blocked'||e.code==='auth/cancelled-popup-request'){await signInWithRedirect(auth,provider)}else{estado.textContent='No se pudo iniciar sesión: '+e.message;entrar.disabled=false}}};
salir.onclick=()=>signOut(auth);
el('firebaseCopiarUid').onclick=async()=>{const uid=el('firebaseUid').textContent;try{await navigator.clipboard.writeText(uid);el('firebaseCopiarUid').textContent='UID COPIADO'}catch(e){prompt('Copia este UID:',uid)}};
onAuthStateChanged(auth, async user=>{
  entrar.disabled=false;
  const panel=el('firebaseLogin');
  panel.style.display='flex';
  if(!user){
    estado.textContent='Ingresa con tu cuenta de Google.';
    entrar.style.display='block';identidad.style.display='none';salir.style.display='none';return;
  }
  entrar.style.display='none';identidad.style.display='block';salir.style.display='block';
  el('firebaseCorreo').textContent=user.email||'';el('firebaseUid').textContent=user.uid;
  estado.textContent='Comprobando autorización en Firestore…';
  el('firebaseMensajePermiso').textContent='Espere mientras verificamos su cuenta.';
  try {
    const registro=await getDoc(doc(db,'usuarios',user.uid));
    if(!registro.exists()){
      estado.textContent='Esta cuenta todavía no está autorizada.';
      el('firebaseMensajePermiso').textContent='Solicita al administrador que registre tu UID en Firebase.';
      return;
    }
    const datos=registro.data();
    if(datos.estado!=='activo'){
      estado.textContent='Cuenta sin acceso activo.';
      el('firebaseMensajePermiso').textContent='Comunícate con el administrador de La Abuelita.';
      return;
    }
    if(!['admin','usuario'].includes(datos.rol)){
      estado.textContent='Rol de usuario pendiente de configurar.';
      el('firebaseMensajePermiso').textContent='Solicita al administrador que configure tu rol.';
      return;
    }
    estado.textContent='Acceso autorizado.';
    panel.style.display='none';
    // Etapa 2: los datos comerciales siguen almacenándose SOLO en este dispositivo.
  }catch(error){
    estado.textContent='No se pudo verificar el permiso.';
    el('firebaseMensajePermiso').textContent='Comprueba tu conexión y las reglas de Firestore. Detalle: '+(error.code||error.message);
  }
});
getRedirectResult(auth).catch(e=>{estado.textContent='Error de inicio de sesión: '+e.message});

export { auth, db };
