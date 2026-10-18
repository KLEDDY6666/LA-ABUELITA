// Evaluación pura y de solo lectura. No finaliza ni modifica el inventario.
export function auditarInventario(productos) {
 if (!Array.isArray(productos)) throw Error('Catálogo inválido');
 const pendientes=[], negativos=[], invalidos=[];
 let contados=0;
 for (const p of productos) {
  const codigo=String(p.codigo??'');
  if (!codigo || !Number.isSafeInteger(p.cantidad)) {invalidos.push(codigo||'(sin código)');continue}
  if (!p.contadoEn) pendientes.push(codigo); else contados++;
  if (p.cantidad<0) negativos.push({codigo,cantidad:p.cantidad});
 }
 return {total:productos.length,contados,
  pendientes,negativos,invalidos,apto:productos.length>0 && pendientes.length===0 && negativos.length===0 && invalidos.length===0};
}
