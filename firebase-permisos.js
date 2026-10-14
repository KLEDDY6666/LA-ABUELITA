import {auth,db} from './firebase-auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {collection,doc,getDocs,onSnapshot,updateDoc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const modulos=[['consulta','🔍 Consultar precios'],['ventas','🛒 Ventas'],['productos','🏷️ Productos (agregar y modificar)'],['compras','📦 Compras'],['creditos','💳 Créditos'],['reportes','📊 Reportes']];
const $=id=>document.getElementById(id);
let rol='',permisos={},usuarios=[],unsubscribe=null,session=0;
const permitido=k=>rol==='admin'||permisos[k]!==false;
const pantallaModulo={consulta:'consulta',venta:'ventas',registroRapido:'productos',productos:'productos',compra:'compras',credito:'creditos',movimientos:'reportes',permisos:'admin'};
window.abuelitaPermitePantalla=p=>p==='permisos'?rol==='admin':(pantallaModulo[p]?permitido(pantallaModulo[p]):true);
function refrescar(){
 const elementos={venta:'ventas',compra:'compras',consulta:'consulta',credito:'creditos',registroRapido:'productos',productos:'productos',movimientos:'reportes',permisos:'admin'};
 for(const b of document.querySelectorAll('[data-go]')){const k=elementos[b.dataset.go];if(k)b.style.display=k==='admin'?(rol==='admin'?'':'none'):(permitido(k)?'':'none')}
 $('btnPermisosAdmin').style.display=rol==='admin'?'':'none';
 // Administración permanece accesible para otras funciones que no son parte de estos módulos.
 const visible=document.querySelector('section.screen:not(.hidden)');if(visible&&!window.abuelitaPermitePantalla(visible.id)){document.querySelectorAll('.screen').forEach(e=>e.classList.add('hidden'));$('home').classList.remove('hidden')}
}
function pintar(){const id=$('permUsuario').value;const u=usuarios.find(x=>x.uid===id);$('permChecks').innerHTML='';if(!u)return;for(const [k,label] of modulos){const fila=document.createElement('label');fila.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 3px;border-bottom:1px solid #ddd;font-size:17px';const txt=document.createElement('span');txt.textContent=label;const cb=document.createElement('input');cb.type='checkbox';cb.dataset.permiso=k;cb.checked=u.permisos?.[k]!==false;cb.style.cssText='width:25px;height:25px;flex-shrink:0';fila.append(txt,cb);$('permChecks').append(fila)}$('permMensaje').textContent=''}
async function cargarUsuarios(){const snap=await getDocs(collection(db,'usuarios'));usuarios=snap.docs.filter(d=>d.data().rol==='usuario').map(d=>({uid:d.id,...d.data()}));const anterior=$('permUsuario').value;$('permUsuario').replaceChildren();for(const u of usuarios){const op=document.createElement('option');op.value=u.uid;op.textContent=u.nombre||u.correo||u.uid;$('permUsuario').append(op)}if(usuarios.some(u=>u.uid===anterior))$('permUsuario').value=anterior;pintar()}
$('permUsuario').addEventListener('change',pintar);
$('permGuardar').addEventListener('click',async()=>{if(rol!=='admin')return;const uid=$('permUsuario').value;const p={};for(const cb of $('permChecks').querySelectorAll('input[data-permiso]'))p[cb.dataset.permiso]=cb.checked;const btn=$('permGuardar');btn.disabled=true;$('permMensaje').textContent='Guardando…';try{await updateDoc(doc(db,'usuarios',uid),{permisos:p});const u=usuarios.find(x=>x.uid===uid);if(u)u.permisos=p;$('permMensaje').textContent='✓ Permisos guardados en Firebase.'}catch(e){$('permMensaje').textContent='No se pudo guardar: '+(e.code||e.message)}finally{btn.disabled=false}});
onAuthStateChanged(auth,user=>{session++;const actual=session;if(unsubscribe){unsubscribe();unsubscribe=null}rol='';permisos={};refrescar();if(!user)return;unsubscribe=onSnapshot(doc(db,'usuarios',user.uid),snap=>{if(actual!==session)return;const d=snap.data()||{};rol=d.estado==='activo'?d.rol:'';permisos=d.permisos||{};refrescar();if(rol==='admin')cargarUsuarios().catch(e=>{$('permMensaje').textContent='Error consultando usuarios: '+e.message})},e=>console.warn('Permisos no disponibles:',e.message))});
