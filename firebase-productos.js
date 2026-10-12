import { auth, db } from './firebase-auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { collection, doc, getDoc, getDocs, writeBatch, waitForPendingWrites } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const $=id=>document.getElementById(id);
const card=$('firebaseImportCard'), status=$('firebaseProductosEstado'), message=$('firebaseProductosMensaje'), file=$('firebaseProductosArchivo');
let authorizedAdmin=false;
function note(s,error=false){message.textContent=s;message.className='msg '+(error?'err':'ok');}
async function check(){
  if(!authorizedAdmin)return;
  try { const snap=await getDocs(collection(db,'productos')); status.textContent='Productos en Firebase: '+snap.size+'. '+(snap.empty?'Listo para la carga inicial.':'La colección ya tiene datos: no se permitirá otra importación.'); file.disabled=!snap.empty; }
  catch(e){status.textContent='No se pudo consultar productos: '+(e.code||e.message);file.disabled=true;}
}
onAuthStateChanged(auth,async user=>{
  authorizedAdmin=false;card.style.display='none';file.disabled=true;
  if(!user)return;
  try{
    const snap=await getDoc(doc(db,'usuarios',user.uid));
    if(!snap.exists()||snap.data().estado!=='activo'||snap.data().rol!=='admin')return;
    authorizedAdmin=true;card.style.display='block';await check();
  }catch(e){ /* El panel principal de acceso mostrará el error de autorización. */ }
});
file.addEventListener('change',async()=>{
  const selected=file.files?.[0];if(!selected||!authorizedAdmin)return;
  file.disabled=true;
  try{
    if(!navigator.onLine)throw Error('Conéctate a internet antes de importar.');
    const raw=JSON.parse(await selected.text());
    if(!Array.isArray(raw.productos))throw Error('El JSON no contiene la lista de productos.');
    const items=raw.productos;
    if(items.length!==189)throw Error('Se esperaban 189 productos; este archivo contiene '+items.length+'.');
    const codes=new Set();
    const valid=items.map(p=>{
      const codigo=String(p.codigo??'').trim();
      if(!codigo||codigo.includes('/')||codes.has(codigo))throw Error('Código vacío, inválido o repetido: '+codigo);
      codes.add(codigo);
      const nombre=String(p.nombre??'').trim(),precio=Number(p.precio),cantidad=Number(p.cantidad);
      if(!nombre||!Number.isFinite(precio)||precio<0||!Number.isSafeInteger(cantidad)||cantidad<0)throw Error('Producto con datos inválidos: '+codigo);
      return {codigo,nombre,precio,cantidad,creado:String(p.creado||''),importadoPor:auth.currentUser.uid};
    });
    const existing=await getDocs(collection(db,'productos'));
    if(!existing.empty)throw Error('Firestore ya contiene '+existing.size+' productos. No se importó nada.');
    if(!confirm('¿Cargar exactamente 189 productos a Firebase? No cambiará los datos locales.'))return;
    note('Enviando los 189 productos a Firebase. No cierres esta pantalla…');
    const batch=writeBatch(db);
    valid.forEach(p=>batch.set(doc(db,'productos',p.codigo),p));
    await batch.commit();
    await waitForPendingWrites(db);
    const after=await getDocs(collection(db,'productos'));
    if(after.size!==189)throw Error('La escritura terminó, pero se leyeron '+after.size+' productos. Verifica Firestore antes de reintentar.');
    note('✓ Carga comprobada: 189 productos en Firestore. Los datos locales no se modificaron.');
    await check();
  }catch(e){note('No se completó la importación: '+(e.code||e.message),true);await check();}
  finally{file.value=''; if(authorizedAdmin && status.textContent.includes('Listo para la carga'))file.disabled=false;}
});
