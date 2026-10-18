// Lógica pura: los movimientos anteriores al conteo no modifican el stock contado.
export function movimientoInventario(producto, cantidad, tipo, fecha, enProceso) {
  if (!Number.isSafeInteger(cantidad) || cantidad < 1) throw Error('Cantidad inválida');
  if (!['venta','compra'].includes(tipo)) throw Error('Movimiento inválido');
  if (!Number.isSafeInteger(producto.cantidad)) throw Error('Stock inválido');
  const contadoEn = producto.contadoEn;
  // Mismo formato UTC que aceptan las reglas de Firestore; evita diferencias entre cliente y servidor.
  const fechaValida = f => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(f) && Number.isFinite(Date.parse(f)) && new Date(Date.parse(f)).toISOString() === f;
  if (!fechaValida(fecha)) throw Error('Fecha del movimiento inválida');
  if (contadoEn && !fechaValida(contadoEn)) throw Error('Fecha del conteo inválida');
  const fechaMovimiento = Date.parse(fecha);
  if (enProceso && (!contadoEn || fechaMovimiento < Date.parse(contadoEn))) {
    return {actualizar:false, cantidad:producto.cantidad};
  }
  const nuevo = producto.cantidad + (tipo==='compra' ? cantidad : -cantidad);
  if (!enProceso && nuevo < 0) throw Error('Stock insuficiente');
  if (!Number.isSafeInteger(nuevo) || Math.abs(nuevo)>2147483647) throw Error('Stock fuera de rango');
  return {actualizar:true,cantidad:nuevo};
}
