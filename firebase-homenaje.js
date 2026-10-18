import {auth,db} from './firebase-auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {doc,getDoc,onSnapshot,setDoc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const $=id=>document.getElementById(id);
const ref=doc(db,'configuracion','homenaje');

const archivo=$('homenajeArchivo');
const opacidad=$('homenajeOpacidad');
const porcentaje=$('homenajePorcentaje');
const visible=$('homenajeVisible');
const guardar=$('homenajeGuardar');
const mensaje=$('homenajeMensaje');

let usuario=null;
let administrador=false;
let imagenActual='';
let configuracionActual={imagen:'',opacidad:6,visible:false};
let unsubscribe=null;
let sesion=0;

const fondo=document.createElement('div');
fondo.id='homenajeFondo';
fondo.setAttribute('aria-hidden','true');
document.body.prepend(fondo);

function aplicar(data){
  const imagen=typeof data.imagen==='string'?data.imagen:'';
  const intensidad=Number.isInteger(data.opacidad)?data.opacidad:6;
  const mostrar=data.visible===true;

  imagenActual=imagen;

  // La fotografía sustituye al logotipo de la cabecera.
  // Si todavía no hay fotografía, se conserva el logotipo original.
  document.querySelectorAll('header .brandLogo').forEach(img => {
    if (!img.dataset.logoOriginal) {
      img.dataset.logoOriginal = img.getAttribute('src') || 'icon-192.png';
    }
    img.src = imagen || img.dataset.logoOriginal;
    img.style.objectFit = 'cover';
    img.style.borderRadius = '50%';
  });

  configuracionActual={imagen,opacidad:intensidad,visible:mostrar};

  fondo.style.backgroundImage=mostrar&&imagen
    ? `url("${imagen}")`
    : 'none';

  fondo.style.opacity=mostrar?String(intensidad/100):'0';

  // No reemplazar la vista previa de una fotografía nueva sin guardar.
  const nueva=window.abuelitaHomenajeImagen?.();

  if(!nueva){
    const vista=$('homenajeVista');
    vista.replaceChildren();

    if(imagen){
      const img=document.createElement('img');
      img.src=imagen;
      img.alt='Fotografía actual del homenaje';
      img.style.cssText=
        'max-width:100%;max-height:300px;object-fit:contain;' +
        'border-radius:14px;opacity:'+(intensidad/100);
      vista.appendChild(img);
    }

    opacidad.value=String(intensidad);
    porcentaje.textContent=String(intensidad);
    visible.checked=mostrar;
  }
}

function estado(texto,error=false){
  mensaje.textContent=texto;
  mensaje.className='msg '+(error?'err':'ok');
}

guardar.addEventListener('click',async()=>{
  if(!usuario||!administrador){
    estado('Solo el administrador puede guardar el homenaje.',true);
    return;
  }

  const nueva=window.abuelitaHomenajeImagen?.();
  const imagen=nueva||imagenActual;

  if(!imagen){
    estado('Primero selecciona una fotografía.',true);
    return;
  }

  const intensidad=Number(opacidad.value);

  if(!Number.isInteger(intensidad)||intensidad<2||intensidad>15){
    estado('La intensidad debe estar entre 2 % y 15 %.',true);
    return;
  }

  guardar.disabled=true;
  estado('Guardando fotografía en Firebase…');

  try{
    await setDoc(ref,{
      imagen,
      opacidad:intensidad,
      visible:visible.checked,
      actualizadoPor:usuario.uid
    });

    window.abuelitaLimpiarFotoPendiente?.();
    aplicar({
      imagen,
      opacidad:intensidad,
      visible:visible.checked
    });
    estado('✓ Homenaje guardado y sincronizado.');
  }catch(e){
    estado('No se pudo guardar: '+(e.code||e.message),true);
  }finally{
    guardar.disabled=!administrador;
  }
});

$('homenajeCancelar').addEventListener('click',()=>{
  window.abuelitaLimpiarFotoPendiente?.();
  aplicar(configuracionActual);
  estado('Cambio de fotografía cancelado.');
});

onAuthStateChanged(auth,async user=>{
  const actual=++sesion;

  if(unsubscribe){
    unsubscribe();
    unsubscribe=null;
  }

  usuario=null;
  administrador=false;
  imagenActual='';
  aplicar({imagen:'',opacidad:6,visible:false});
  guardar.disabled=true;

  if(!user)return;

  try{
    const registro=await getDoc(doc(db,'usuarios',user.uid));
    if(actual!==sesion)return;

    const datos=registro.data()||{};
    if(datos.estado!=='activo'||!['admin','usuario'].includes(datos.rol))return;

    usuario=user;
    administrador=datos.rol==='admin';
    guardar.disabled=!administrador;

    unsubscribe=onSnapshot(ref,snap=>{
      if(actual!==sesion)return;
      if(snap.exists()){
        aplicar(snap.data());
      }else{
        aplicar({imagen:'',opacidad:6,visible:false});
      }
    },e=>{
      if(actual===sesion)console.warn('Homenaje no disponible:',e.message);
    });

  }catch(e){
    console.warn('No se pudo inicializar el homenaje:',e.message);
  }
});
