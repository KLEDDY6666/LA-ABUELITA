// Diagnóstico específico. Ejecutar en la consola de la PWA después de preparar
// el carrito y seleccionar el cliente, SIN pulsar CRÉDITO ni registrar la venta.
// No reemplaza funciones de la aplicación y no confirma ninguna escritura.
// Usa lecturas del servidor independientes, no un snapshot transaccional.
// La comparación con reglas es local: no demuestra cómo evaluó un commit real.
(async () => {
  const hash = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))), b=>b.toString(16).padStart(2,'0')).join('');
  const source = Function.prototype.toString.call(window.abuelitaCreditosCloud?.registrarCredito);
  if (await hash(source) !== 'c5e8a619c25291d5c6923a20c36c299f1f1cf2f6605768125fa1924222be120d') throw Error('La función cargada no es la versión inicial verificada. No se ejecutó.');
  if (typeof carrito === 'undefined' || !Array.isArray(carrito) || !carrito.length) throw Error('Prepare el carrito que falla, sin registrar la venta, y ejecute de nuevo.');
  const seleccion = document.getElementById('ventaCliente')?.value;
  if (!seleccion) throw Error('Seleccione el cliente en VENTA, sin registrar la venta.');
  const input = {id:crypto.randomUUID(),fecha:new Date().toISOString(),clienteId:Number(seleccion),items:JSON.parse(JSON.stringify(carrito))};
  const base = new URL('./',location.href);
  const {auth,db} = await import(new URL('firebase-auth.js',base).href);
  const {doc,getDocFromServer,Transaction} = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');
  const {movimientoInventario} = await import(new URL('inventario-core.js',base).href);
  if (!auth.currentUser) throw Error('Inicie sesión antes del diagnóstico.');
  if (db.app.options.projectId!=='la-abuelita-7e630' && db.app.options.projectId!=='demo-abuelita-browser') throw Error('Proyecto inesperado; no se consultaron documentos.');
  const uid=auth.currentUser.uid;
  const snapshots=new Map(),reads=[],writes=[],checks=[];
  const read=async (ref,dentroTransaccion=true)=>{
    try {
      const s=await getDocFromServer(ref);snapshots.set(ref.path,s);
      reads.push({ruta:ref.path,dentroTransaccion,existe:s.exists(),desdeCache:s.metadata.fromCache});return s;
    } catch(e) {reads.push({ruta:ref.path,dentroTransaccion,error:e.code});throw e;}
  };
  const capture=(method,key,parsed)=>{
    if (!parsed?.data?.value?.mapValue?.fields || parsed.fieldTransforms.length) throw Error('Estructura del SDK inesperada; diagnóstico detenido.');
    writes.push({metodo:method,ruta:key.path.canonicalString(),fields:structuredClone(parsed.data.value.mapValue.fields),mascara:parsed.fieldMask?.fields.map(f=>f.canonicalString())??null});
  };
  // Este objeto NO es la transacción interna del SDK: solo recibe datos en memoria.
  // No tiene commit, transporte, cola persistente ni operaciones de base de datos.
  const sink=Object.freeze({set:(k,p)=>capture('set',k,p),update:(k,p)=>capture('update',k,p),delete:()=>{throw Error('El diagnóstico no admite borrados.');}});
  const parser=new Transaction(db,sink);
  const tx=Object.freeze({get:read,set:parser.set.bind(parser),update:parser.update.bind(parser)});
  const autorizar=async()=>{
    const s=await read(doc(db,'usuarios',uid),false),u=s.data();
    if (!s.exists()||u.estado!=='activo'||!['admin','usuario'].includes(u.rol)) throw Error('Cuenta no autorizada al leer del servidor.');
    if(u.rol!=='admin'&&u.permisos?.creditos===false)throw Error('Créditos deshabilitados en el documento del usuario.');
    return auth.currentUser;
  };
  // Se compila únicamente el método cuya huella se comprobó arriba. Las únicas
  // dependencias que pueden escribir se sustituyen por el capturador anterior.
  // No se llama a runTransaction del SDK ni a la función real de la aplicación.
  const prepare=new Function('autorizar','doc','db','runTransaction','movimientoInventario','cents',
    'return ('+source.replace(/^async registrarCredito\(/,'async function registrarCredito(')+');'
  )(autorizar,doc,db,async(_db,callback)=>callback(tx),movimientoInventario,x=>Math.round(Number(x)*100));
  let preparationError=null;
  try {await prepare(input);} catch(e) {preparationError={codigo:e.code||null,mensaje:e.message};}
  const check=(condicion,valor)=>checks.push({condicion,resultado:valor===true});
  const get=path=>snapshots.get(path)?.data();
  const typed=w=>w?.fields;
  const value=v=>v?.integerValue!==undefined?Number(v.integerValue):v?.doubleValue!==undefined?v.doubleValue:v?.stringValue!==undefined?v.stringValue:v?.booleanValue!==undefined?v.booleanValue:v?.nullValue!==undefined?null:v?.mapValue?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,value(x)])):v?.arrayValue?(v.arrayValue.values||[]).map(value):undefined;
  const wVenta=writes.find(w=>w.ruta==='ventas/'+input.id),wCuenta=writes.find(w=>w.ruta==='cuentas/'+input.clienteId);
  const venta=wVenta?Object.fromEntries(Object.entries(wVenta.fields).map(([k,v])=>[k,value(v)])):null;
  const cuenta=wCuenta?Object.fromEntries(Object.entries(wCuenta.fields).map(([k,v])=>[k,value(v)])):null;
  const cfg=get('configuracion/inventarioInicial'),cli=get('clientes/'+input.clienteId),ant=get('cuentas/'+input.clienteId);
  const isInt=(w,key)=>w?.fields?.[key]?.integerValue!==undefined;
  const iso=f=>typeof f==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(f)&&!Number.isNaN(Date.parse(f));
  if (venta&&cuenta) {
    check('ventas.id == ruta && registradoPor == usuario actual',venta.id===input.id&&venta.registradoPor===uid);
    check('ventas: campos permitidos y requeridos',Object.keys(venta).length===10&&['id','fecha','medio','total','totalCent','items','cantidades','clienteId','clienteNombre','registradoPor'].every(k=>k in venta));
    check('fechaMovimientoPermitida: ISO y no anterior a iniciadoEn',iso(venta.fecha)&&(!cfg||(iso(cfg.iniciadoEn)&&Date.parse(venta.fecha)>=Date.parse(cfg.iniciadoEn))));
    check('ventas.total is number && >= 0',typeof venta.total==='number'&&Number.isFinite(venta.total)&&venta.total>=0);
    check('ventas y cuenta: clienteNombre is string',typeof venta.clienteNombre==='string'&&typeof cuenta.clienteNombre==='string');
    check('totalCorrecto: precios numéricos para la multiplicación en reglas',venta.items.every(i=>typeof i.precio==='number'&&Number.isFinite(i.precio)));
    check('ventas.totalCent is int && > 0',isInt(wVenta,'totalCent')&&venta.totalCent>0);
    check('ventas.clienteId is int',isInt(wVenta,'clienteId'));
    check('ventas: cliente activo',cli?.activo===true);
    check('ventas: entre 1 y 3 productos y mapa cantidades del mismo tamaño',venta.items.length>=1&&venta.items.length<=3&&Object.keys(venta.cantidades).length===venta.items.length);
    check('ventas: total y totalCent coherentes',Math.abs(venta.totalCent-venta.total*100)<=0.01&&Math.abs(venta.total-venta.items.reduce((n,i)=>n+i.precio*i.cantidad,0))<=0.011);
    for (let index=0;index<venta.items.length;index++) {
      const i=venta.items[index],p=get('productos/'+i.codigo),wp=writes.find(w=>w.ruta==='productos/'+i.codigo);
      const pendiente=cfg?.estado==='en_proceso'&&(!('contadoEn' in p)||p.contadoEn===null||(typeof p.contadoEn==='string'&&venta.fecha<p.contadoEn));
      const ip=wVenta.fields.items.arrayValue.values[index].mapValue.fields;
      check(`itemCreditoValido[${index}]: tipo, cantidad y mapa`,typeof i.codigo==='string'&&!!i.codigo&&ip.cantidad.integerValue!==undefined&&i.cantidad>0&&venta.cantidades[i.codigo]===i.cantidad);
      check(`itemCreditoValido[${index}]: nombre y precio de Firestore`,i.nombre===p.nombre&&i.precio===p.precio);
      const raw=snapshots.get('productos/'+i.codigo)?._document?.data?.value?.mapValue?.fields;
      check(`itemCreditoValido[${index}]: stock almacenado is int`,raw?.cantidad?.integerValue!==undefined);
      if(pendiente)check(`itemCreditoValido[${index}]: pendiente no modifica producto`,!wp);
      else {
        check(`itemCreditoValido[${index}]: antes.cantidad >= cantidad solicitada (regla original)`,p.cantidad>=i.cantidad);
        check(`itemCreditoValido[${index}]: descuento y ultimaVentaId exactos`,!!wp&&value(wp.fields.cantidad)===p.cantidad-i.cantidad&&value(wp.fields.ultimaVentaId)===venta.id&&wp.mascara.every(k=>['cantidad','ultimaVentaId'].includes(k)));
      }
    }
    check('getAfter(cuenta): misma venta y tipo CREDITO',cuenta.ultimaOperacionId===venta.id&&cuenta.ultimaOperacionTipo==='CREDITO');
    check('cuentaCampos: siete campos requeridos',Object.keys(cuenta).length===7&&['clienteId','clienteNombre','totalCent','pagadoCent','saldoCent','ultimaOperacionId','ultimaOperacionTipo'].every(k=>k in cuenta));
    check('cuentaCampos: identificador y centavos is int',['clienteId','totalCent','pagadoCent','saldoCent'].every(k=>isInt(wCuenta,k))&&String(cuenta.clienteId)===String(input.clienteId));
    check('cuentaCampos: importes no negativos y saldo = total - pagado',cuenta.totalCent>=0&&cuenta.pagadoCent>=0&&cuenta.saldoCent>=0&&cuenta.saldoCent===cuenta.totalCent-cuenta.pagadoCent);
    check('cuentaCredito: registradoPor, cliente y total de venta',venta.registradoPor===uid&&venta.medio==='CREDITO'&&venta.clienteId===cuenta.clienteId&&isInt(wVenta,'totalCent')&&venta.totalCent>0);
    check('cuentaCredito: venta no existía',snapshots.get('ventas/'+input.id)?.exists()===false);
    check(ant?'cuentaCredito: acumulación sobre cuenta existente':'cuentaCreditoNuevo: cuenta inicial y saldo',ant?cuenta.totalCent===ant.totalCent+venta.totalCent&&cuenta.pagadoCent===ant.pagadoCent&&cuenta.saldoCent===ant.saldoCent+venta.totalCent:cuenta.totalCent===venta.totalCent&&cuenta.pagadoCent===0&&cuenta.saldoCent===venta.totalCent);
    if(ant){
      check('cuentas.update: nombre vigente del cliente',cuenta.clienteNombre===cli.nombre);
      const cambios=[...new Set([...Object.keys(ant),...Object.keys(cuenta)])].filter(k=>JSON.stringify(ant[k])!==JSON.stringify(cuenta[k]));
      check('cuentas.update: affectedKeys solo campos permitidos',cambios.every(k=>['clienteNombre','totalCent','pagadoCent','saldoCent','ultimaOperacionId','ultimaOperacionTipo'].includes(k)));
    }
  }
  const writtenPaths=new Set(writes.map(w=>w.ruta));
  const verifies=reads.filter(r=>r.dentroTransaccion&&!r.error&&!writtenPaths.has(r.ruta)).map(r=>({ruta:r.ruta,operacion:'verify',nota:'Prevista por el SDK para un documento leído y no modificado; no se envió.'}));
  const relevant=new Set(['rol','estado','permisos','iniciadoEn','codigo','nombre','precio','cantidad','contadoEn','contadoPor','activo','id','clienteId','clienteNombre','totalCent','pagadoCent','saldoCent','ultimaOperacionId','ultimaOperacionTipo']);
  const before=Object.fromEntries([...snapshots].map(([path,snapshot])=>{
    const raw=snapshot._document?.data?.value?.mapValue?.fields||{};
    return [path,{existe:snapshot.exists(),tipos:Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,Object.keys(v)[0]])),camposRelevantes:Object.fromEntries(Object.entries(raw).filter(([k])=>relevant.has(k)))}];
  }));
  const privateKeys=new Set(['nombre','clienteNombre','correo','email','creadoPor','importadoPor','registradoPor','contadoPor']);
  const aliases=new Map([[uid,'USUARIO_ACTUAL']]);let serial=0;
  const alias=s=>{if(!aliases.has(s))aliases.set(s,'DATO_PRIVADO_'+(++serial));return aliases.get(s);};
  const scrub=(x,key='')=>{
    if (typeof x==='string')return x===uid?'USUARIO_ACTUAL':privateKeys.has(key)?alias(x):x.replaceAll(uid,'USUARIO_ACTUAL');
    if(Array.isArray(x))return x.map(v=>scrub(v,key));
    if(x&&typeof x==='object'){
      if(privateKeys.has(key)&&'stringValue'in x)return {stringValue:alias(x.stringValue)};
      return Object.fromEntries(Object.entries(x).map(([k,v])=>[k.replaceAll(uid,'USUARIO_ACTUAL'),scrub(v,k)]));
    }
    return x;
  };
  const result=scrub({tipo:'EJECUCION_EN_SECO_SIN_COMMIT',proyecto:db.app.options.projectId,fechaPreparada:input.fecha,
    lecturas:reads,documentosLeidos:before,errorPreparacion:preparationError,escriturasSoloEnMemoria:writes,verificacionesPrevistasSinEnviar:verifies,condiciones:checks,
    observacion:'Las lecturas son independientes. Las condiciones se calculan localmente; no son una traza del evaluador de producción. No se envió Commit, Write ni BatchWrite.'});
  console.log('ABUELITA_TRANSACCION_EN_SECO\n'+JSON.stringify(result,null,2));
  return result;
})().catch(e=>console.error('Diagnóstico detenido sin confirmar escrituras:',e.message));
