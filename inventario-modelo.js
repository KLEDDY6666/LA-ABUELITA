// Funciones puras para probar la regla del conteo inicial.
export function stockTrasMovimiento(producto, tipo, unidades, modo){
 if(!Number.isSafeInteger(unidades)||unidades<1)throw Error('Unidades inválidas');
 if(modo==='en_proceso'&&!producto.contadoEn)return producto.cantidad;
 const nuevo=producto.cantidad+(tipo==='compra'?unidades:-unidades);
 if(modo!=='en_proceso'&&nuevo<0)throw Error('Stock insuficiente');
 return nuevo;
}
export function contar(producto,unidades,fecha){
 if(producto.contadoEn)throw Error('Ya contado');
 if(!Number.isSafeInteger(unidades)||unidades<0)throw Error('Conteo inválido');
 return {...producto,cantidad:unidades,contadoEn:fecha};
}
