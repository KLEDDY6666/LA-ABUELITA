// V1.47 - Preparación local de la fotografía del homenaje.
// Este archivo todavía no escribe en Firebase.
(() => {
  const $ = id => document.getElementById(id);
  const archivo = $('homenajeArchivo');
  const vista = $('homenajeVista');
  const opacidad = $('homenajeOpacidad');
  const porcentaje = $('homenajePorcentaje');
  const mensaje = $('homenajeMensaje');
  const guardar = $('homenajeGuardar');

  let imagenPreparada = null;

  window.abuelitaHomenajeImagen = () => imagenPreparada;

  opacidad.addEventListener('input', () => {
    porcentaje.textContent = opacidad.value;
    const img = vista.querySelector('img');
    if (img) img.style.opacity = Number(opacidad.value) / 100;
  });

  archivo.addEventListener('change', async () => {
    imagenPreparada = null;
    vista.replaceChildren();
    mensaje.textContent = '';

    const foto = archivo.files?.[0];
    if (!foto) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(foto.type)) {
      mensaje.textContent = 'Selecciona una fotografía JPG, PNG o WebP.';
      archivo.value = '';
      return;
    }

    if (foto.size > 15 * 1024 * 1024) {
      mensaje.textContent = 'La fotografía original no debe superar 15 MB.';
      archivo.value = '';
      return;
    }

    try {
      mensaje.textContent = 'Preparando fotografía…';

      const bitmap = await createImageBitmap(foto);
      const escala = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * escala));
      canvas.height = Math.max(1, Math.round(bitmap.height * escala));

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo preparar la imagen.');

      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();

      const calidad = [0.75, 0.60, 0.45, 0.30];
      let resultado = null;

      for (const q of calidad) {
        const candidato = canvas.toDataURL('image/webp', q);
        if (!candidato.startsWith('data:image/webp;base64,')) {
          throw new Error('Este navegador no admite la compresión WebP.');
        }
        if (candidato.length <= 180000) {
          resultado = candidato;
          break;
        }
      }

      if (!resultado) {
        throw new Error('La imagen es demasiado grande incluso comprimida.');
      }

      imagenPreparada = resultado;

      const img = document.createElement('img');
      img.src = resultado;
      img.alt = 'Vista previa del homenaje a La Abuelita';
      img.style.cssText =
        'max-width:100%;max-height:300px;object-fit:contain;' +
        'border-radius:14px;opacity:' + (Number(opacidad.value) / 100);

      vista.appendChild(img);
      mensaje.textContent =
        '✓ Fotografía preparada. Falta conectar el guardado en Firebase.';

    } catch (error) {
      imagenPreparada = null;
      mensaje.textContent = 'No se pudo preparar la fotografía: ' + error.message;
    }
  });

  window.abuelitaLimpiarFotoPendiente = () => {
    imagenPreparada = null;
    archivo.value = '';
  };

  guardar.disabled = true;
  guardar.title = 'Se habilitará al conectar Firebase';
})();
