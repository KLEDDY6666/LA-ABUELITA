const OFFLINE_SALES_KEY='la_abuelita_ventas_pendientes_v128';
const KEY='la_abuelita_productos_v1', DRAFT_KEY='la_abuelita_producto_borrador_v1', CART_KEY='la_abuelita_carrito_v1', SALES_KEY='la_abuelita_ventas_v1', CREDIT_PENDING='la_abuelita_credito_pendiente_v1', CLIENTS_KEY='la_abuelita_clientes_v1', CREDITS_KEY='la_abuelita_creditos_v1', PAYMENTS_KEY='la_abuelita_pagos_credito_v1', SUPPLIERS_KEY='la_abuelita_proveedores_v1', PURCHASES_KEY='la_abuelita_compras_v1', PURCHASE_CART_KEY='la_abuelita_carrito_compra_v1';
const $=id=>document.getElementById(id); let productos=load(KEY,[]), carrito=load(CART_KEY,[]), ventas=load(SALES_KEY,[]), clientes=load(CLIENTS_KEY,[]), creditos=load(CREDITS_KEY,[]), pagos=load(PAYMENTS_KEY,[]), proveedores=load(SUPPLIERS_KEY,[]), compras=load(PURCHASES_KEY,[]), carritoCompra=load(PURCHASE_CART_KEY,[]); let clienteCreditoSeleccionado=null;
function load(k,d){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch(e){return d}}
function store(k,v){localStorage.setItem(k,JSON.stringify(v))}
function save(){store(KEY,productos);render()}
const screens=['home','administracion','clientes','proveedores','movimientos','productos','registroRapido','venta','compra','consulta','credito','datos','permisos','placeholder'];
function show(id){screens.forEach(x=>$(x).classList.add('hidden'));$(id).classList.remove('hidden');if(id==='clientes')renderClientes();if(id==='proveedores')renderProveedores();if(id==='movimientos')renderMovimientos();if(id==='credito')renderCreditos();if(id==='venta')cargarSelectorVenta();if(id==='compra'){cargarSelectorProveedores();renderCompra()}}
function go(x){if(window.abuelitaPermitePantalla && !window.abuelitaPermitePantalla(x)){alert('Tu cuenta no tiene permiso para abrir este módulo.');return}if(screens.includes(x)){show(x);if(x==='productos'){limpiarEdicionProducto();render();$('buscar').focus()}if(x==='registroRapido'){limpiarRegistroRapido();setTimeout(()=>$('qCodigo').focus(),0)}if(x==='venta'){renderCart();$('vCodigo').focus()}if(x==='consulta'){setTimeout(()=>$('cCodigo').focus(),0)}}else{$('ptitle').textContent=x.toUpperCase();show('placeholder')}}
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
document.querySelectorAll('.back').forEach(b=>b.onclick=()=>show('home'));document.querySelectorAll('.adminBack').forEach(b=>b.onclick=()=>{if(window.abuelitaPermitePantalla && !window.abuelitaPermitePantalla('administracion'))show('home');else show('administracion')});
function msg(t,c){$('msg').textContent=t;$('msg').className='msg '+c} function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function limpiarCamposRegistroRapido(){['qCodigo','qNombre','qPrecio','qCantidad'].forEach(id=>$(id).value='')}
function limpiarRegistroRapido(){limpiarCamposRegistroRapido();$('qMsg').textContent='';$('qMsg').className='msg'}
function productoRapidoDuplicado(ex){
  $('qMsg').textContent=`⚠️ PRODUCTO YA REGISTRADO: ${ex.nombre}`;
  $('qMsg').className='msg err';
  limpiarCamposRegistroRapido();
  setTimeout(()=>$('qCodigo').focus(),0);
}
async function guardarRapido(){
  let codigo=$('qCodigo').value.trim(), nombre=$('qNombre').value.trim();
  let precioTxt=$('qPrecio').value.trim().replace(',','.'), cantTxt=$('qCantidad').value.trim();
  let precio=precioTxt===''?0:Number(precioTxt), cantidad=cantTxt===''?0:parseInt(cantTxt,10);
  if(!codigo||!nombre){$('qMsg').textContent='Código y nombre son obligatorios.';$('qMsg').className='msg err';return}
  let existente=productos.find(p=>String(p.codigo)===codigo);
  if(existente){productoRapidoDuplicado(existente);return}
  if(!(precio>=0)||!(cantidad>=0)){$('qMsg').textContent='Revise precio o stock.';$('qMsg').className='msg err';return}
  const nuevo={codigo,nombre,precio,cantidad,creado:new Date().toISOString()};
  if(!window.abuelitaProductosCloud){$('qMsg').textContent='Espere la conexión segura con Firebase.';return;}
  $('qGuardar').disabled=true;
  try{await window.abuelitaProductosCloud.crear(nuevo)}catch(e){$('qMsg').textContent='No se guardó en Firebase: '+e.message;$('qMsg').className='msg err';return}finally{$('qGuardar').disabled=false}
  productos.unshift(nuevo);store(KEY,productos);render();
  limpiarCamposRegistroRapido();$('qMsg').textContent=`✓ Producto registrado: ${nombre}. Listo para el siguiente.`;$('qMsg').className='msg ok';$('qCodigo').focus();
}
$('qGuardar').onclick=guardarRapido;
let qScanTimer=null;
$('qCodigo').addEventListener('input',()=>{
  // El mensaje anterior permanece hasta que comienza el siguiente registro.
  if($('qMsg').textContent){$('qMsg').textContent='';$('qMsg').className='msg'}
  clearTimeout(qScanTimer);
  qScanTimer=setTimeout(()=>{
    const code=$('qCodigo').value.trim();
    if(!code)return;
    const ex=productos.find(p=>String(p.codigo)===code);
    if(ex) productoRapidoDuplicado(ex);
  },120);
});
$('qCodigo').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(qScanTimer);let code=$('qCodigo').value.trim();if(!code)return;let ex=productos.find(p=>String(p.codigo)===code);if(ex){productoRapidoDuplicado(ex);return}$('qNombre').focus()}});
$('qNombre').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('qPrecio').focus()}});
function limpiarEdicionProducto(){
  $('buscar').value='';$('editOriginalCodigo').value='';['codigo','nombre','precio','cantidad'].forEach(id=>$(id).value='');$('editarProductoCard').classList.add('hidden');$('msg').textContent='';
}
function seleccionarProducto(codigo){
  let p=productos.find(x=>String(x.codigo)===String(codigo));if(!p)return;
  $('editOriginalCodigo').value=p.codigo;$('codigo').value=p.codigo;$('nombre').value=p.nombre;$('precio').value=Number(p.precio||0);$('cantidad').value=Number(p.cantidad||0);$('editarProductoCard').classList.remove('hidden');$('buscar').value='';render();$('nombre').focus();
}
window.seleccionarProducto=seleccionarProducto;
function render(){
  let q=normText($('buscar').value.trim());let arr=q?productos.filter(p=>normText(p.nombre).includes(q)||normText(p.codigo).includes(q)).slice(0,30):[];
  $('contador').textContent=productos.length;
  $('lista').innerHTML=q?(arr.length?arr.map(p=>`<button class='suggestion' onclick='seleccionarProducto(${JSON.stringify(String(p.codigo))})'><span><b>${esc(p.nombre)}</b><small>${esc(p.codigo)} · Stock: ${Number(p.cantidad||0)}</small></span><strong>S/ ${Number(p.precio||0).toFixed(2)}</strong></button>`).join(''):`<p class='muted'>No se encontraron productos.</p>`):`<p class='muted'>Escriba un código o parte del nombre.</p>`;
}
// En Administración → Productos, un código exacto abre directamente la ficha.
// La búsqueda parcial por nombre o código sigue mostrando sugerencias.
let productoScanTimer=null;
function buscarProductoAdministracion(){
  clearTimeout(productoScanTimer);
  const valor=$('buscar').value.trim();
  const exacto=productos.find(p=>String(p.codigo).trim()===valor);
  if(exacto){seleccionarProducto(exacto.codigo);return}
  render();
}
$('buscar').addEventListener('input',buscarProductoAdministracion);
$('buscar').addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  e.preventDefault();
  const q=$('buscar').value.trim();
  const exacto=productos.find(p=>String(p.codigo).trim()===q);
  if(exacto){seleccionarProducto(exacto.codigo);return}
  const arr=q?productos.filter(p=>normText(p.nombre).includes(normText(q))||normText(p.codigo).includes(normText(q))):[];
  if(arr.length===1)seleccionarProducto(arr[0].codigo);
});
$('guardar').onclick=async()=>{
  let original=$('editOriginalCodigo').value,codigo=$('codigo').value.trim(),nombre=$('nombre').value.trim();let precio=Number(($('precio').value||'0').replace(',','.')),cantidad=parseInt($('cantidad').value||'0',10);
  if(!original)return msg('Primero seleccione un producto.','err');if(!codigo||!nombre||!(precio>=0)||!(cantidad>=0))return msg('Revise los datos del producto.','err');
  if(productos.some(p=>String(p.codigo)===codigo&&String(p.codigo)!==String(original)))return msg('Ese código pertenece a otro producto.','err');
  let p=productos.find(x=>String(x.codigo)===String(original));if(!p)return msg('Producto no encontrado.','err');
  if(codigo!==original)return msg('Por seguridad, el código de barras no puede modificarse. Cree otro producto si cambió.','err');
  if(!window.abuelitaProductosCloud)return msg('Espere la conexión segura con Firebase.','err');
  $('guardar').disabled=true;
  try{await window.abuelitaProductosCloud.editar(original,{nombre,precio,cantidad})}catch(e){msg('No se guardó en Firebase: '+e.message,'err');return}finally{$('guardar').disabled=false}
  p.nombre=nombre;p.precio=precio;p.cantidad=cantidad;store(KEY,productos);
  limpiarEdicionProducto();render();$('buscar').focus();
};
$('cancelarEdicionProducto').onclick=()=>{limpiarEdicionProducto();render();$('buscar').focus()};
function addVenta(){let code=$('vCodigo').value.trim();if(!code)return;let p=productos.find(x=>x.codigo===code);if(!p){$('vMsg').textContent='Producto no encontrado.';$('vMsg').className='msg err';$('vCodigo').select();return}let row=carrito.find(x=>x.codigo===code),qty=row?row.cantidad+1:1;if(stockDisponible(p)<=0||qty>stockDisponible(p)){$('vMsg').textContent=`STOCK INSUFICIENTE. Disponible: ${stockDisponible(p)} ${stockDisponible(p)===1?'unidad':'unidades'}.`;$('vMsg').className='msg err';$('vCodigo').value='';$('vCodigo').focus();return}if(!row&&carrito.length>=4){$('vMsg').textContent='Máximo 4 productos diferentes por venta en esta etapa. Finalice esta venta y registre otra.';$('vMsg').className='msg err';return}if(row)row.cantidad++;else carrito.push({codigo:p.codigo,nombre:p.nombre,precio:Number(p.precio),cantidad:1});store(CART_KEY,carrito);$('vCodigo').value='';$('vMsg').textContent=`✓ Agregado al carrito: ${p.nombre}. Stock disponible: ${stockDisponible(p)} ${stockDisponible(p)===1?'unidad':'unidades'}.`;$('vMsg').className='msg ok';renderCart();$('vCodigo').focus()}
$('vCodigo').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addVenta()}});
function pendientesVenta(){return load(OFFLINE_SALES_KEY,[])}
function stockReservado(codigo){return pendientesVenta().filter(x=>x.estado!=='error').reduce((n,v)=>n+(v.items||[]).filter(i=>String(i.codigo)===String(codigo)).reduce((m,i)=>m+Number(i.cantidad||0),0),0)}
function stockDisponible(p){return Math.max(0,Number(p?.cantidad||0)-stockReservado(p?.codigo))}
function pintarPendientes(){const el=$('ventasPendientes');if(!el)return;const arr=pendientesVenta();el.textContent=arr.length?`${arr.length} venta(s) pendiente(s) de sincronizar. ${arr.filter(x=>x.estado==='error').length} requiere(n) revisión.`:'No hay ventas pendientes.';el.style.color=arr.some(x=>x.estado==='error')?'#a20':'#333'}
let sincronizandoPendientes=false;
async function sincronizarPendientes(){
 if(sincronizandoPendientes||!navigator.onLine||!window.abuelitaVentasCloud)return;
 sincronizandoPendientes=true;const btn=$('sincronizarVentas');if(btn)btn.disabled=true;
 try{const arr=pendientesVenta();for(const v of arr){
  if(v.estado==='error')continue;
  try{const {estado,error,...limpia}=v;await window.abuelitaVentasCloud.registrar(limpia);
   const actuales=pendientesVenta().filter(x=>x.id!==v.id);store(OFFLINE_SALES_KEY,actuales);
   if(!ventas.some(x=>x.id===v.id)){ventas.push(v);store(SALES_KEY,ventas)}
  }catch(e){
   // Si falla la red, conservamos el ID para un reintento idempotente.
   if(!navigator.onLine||['unavailable','deadline-exceeded','network-request-failed'].includes(e.code))break;
   const actuales=pendientesVenta();const x=actuales.find(x=>x.id===v.id);
   if(x){x.estado='error';x.error=e.message;store(OFFLINE_SALES_KEY,actuales)}
  }
 }
 if(window.abuelitaProductosCloud?.actualizar)await window.abuelitaProductosCloud.actualizar().catch(()=>{});
 }finally{sincronizandoPendientes=false;if(btn)btn.disabled=false;pintarPendientes();renderCart()}
}
window.addEventListener('online',()=>setTimeout(sincronizarPendientes,1000));
window.addEventListener('focus',()=>{if(navigator.onLine)sincronizarPendientes()});
setInterval(()=>{if(navigator.onLine&&pendientesVenta().some(x=>x.estado!=='error'))sincronizarPendientes()},30000);

function validarStockVenta(items,mensajeEn='payMsg'){for(const item of items){let p=productos.find(x=>String(x.codigo)===String(item.codigo)),stock=stockDisponible(p),pedido=Number(item.cantidad||0);if(!p||pedido>stock){let el=$(mensajeEn)||$('vMsg');if(el){el.textContent=`STOCK INSUFICIENTE. ${p?`${p.nombre}: disponible ${stock} ${stock===1?'unidad':'unidades'}.`:'Producto no encontrado.'}`;el.className='msg err'}return false}}return true}
function normalizarCarritoPorStock(){let cambio=false;carrito=carrito.filter(row=>{let p=productos.find(x=>String(x.codigo)===String(row.codigo)),stock=stockDisponible(p);if(!p||stock<=0){cambio=true;return false}if(Number(row.cantidad)>stock){row.cantidad=stock;cambio=true}return true});if(cambio)store(CART_KEY,carrito)}
function changeQty(i,delta){let row=carrito[i],p=productos.find(x=>String(x.codigo)===String(row.codigo));if(!row||!p)return;let stock=stockDisponible(p),n=Number(row.cantidad)+delta;if(n<=0){carrito.splice(i,1)}else if(n>stock){$('vMsg').textContent=`STOCK INSUFICIENTE. Disponible: ${stock} ${stock===1?'unidad':'unidades'}.`;$('vMsg').className='msg err';$('vCodigo').focus();return}else row.cantidad=n;store(CART_KEY,carrito);renderCart();$('vCodigo').focus()}
function renderCart(){normalizarCarritoPorStock();let total=carrito.reduce((s,x)=>s+Number(x.precio)*Number(x.cantidad),0);$('total').textContent=total.toFixed(2);$('carrito').innerHTML=carrito.length?carrito.map((x,i)=>{let p=productos.find(y=>String(y.codigo)===String(x.codigo)),stock=stockDisponible(p),tope=Number(x.cantidad)>=stock;return `<div class='cartrow'><div class='cartinfo'><b>${esc(x.nombre)}</b><div class='muted'>S/ ${Number(x.precio).toFixed(2)} c/u · Subtotal S/ ${(Number(x.precio)*Number(x.cantidad)).toFixed(2)} · Stock disponible: ${stock}</div></div><div class='qty'><button onclick='changeQty(${i},-1)'>−</button><strong>${x.cantidad}</strong><button onclick='changeQty(${i},1)' ${tope?'disabled title="Stock máximo alcanzado"':''}>+</button><button class='trash' onclick='removeCart(${i})'>🗑️</button></div></div>`}).join(''):`<p class='muted'>Aún no hay productos en esta venta.</p>`}
window.changeQty=changeQty;window.removeCart=i=>{carrito.splice(i,1);store(CART_KEY,carrito);renderCart();$('vCodigo').focus()};
let ventaEnProceso=false;
async function finishPay(medio){
 if(ventaEnProceso)return;
 if(!carrito.length){$('payMsg').textContent='Agregue al menos un producto.';$('payMsg').className='msg err';return}
 if(carrito.length>4){$('payMsg').textContent='Máximo 4 productos diferentes por venta.';$('payMsg').className='msg err';return}
 if(!validarStockVenta(carrito,'payMsg'))return;
 if(medio==='CREDITO'){$('payMsg').textContent='Créditos compartidos aún no habilitados. No se registró ninguna venta.';$('payMsg').className='msg err';return}
 if(!window.abuelitaVentasCloud){$('payMsg').textContent='Espere a que se cargue el módulo de ventas.';$('payMsg').className='msg err';return}
 ventaEnProceso=true;document.querySelectorAll('[data-pay]').forEach(b=>b.disabled=true);
 const items=JSON.parse(JSON.stringify(carrito));const total=items.reduce((a,x)=>a+Number(x.precio)*Number(x.cantidad),0);
 const cid=Number($('ventaCliente')?.value||0),cli=clientes.find(c=>c.id===cid);
 const venta={id:crypto.randomUUID(),fecha:new Date().toISOString(),medio,total:Math.round(total*100)/100,items,clienteId:cli?.id||null,clienteNombre:cli?.nombre||''};
 // Se guarda primero localmente con ID persistente, incluso si la conexión cae.
 try{const arr=pendientesVenta();arr.push({...venta,estado:'pendiente'});store(OFFLINE_SALES_KEY,arr)}catch(e){$('payMsg').textContent='No se pudo guardar la venta en este dispositivo: '+e.message;$('payMsg').className='msg err';return}
 carrito=[];store(CART_KEY,carrito);renderCart();pintarPendientes();
 $('payMsg').textContent='Venta guardada en este dispositivo. Pendiente de confirmar en Firebase.';$('payMsg').className='msg';
 try{
  if(!navigator.onLine){$('payMsg').textContent='✓ Venta guardada SIN INTERNET. Sincronízala al volver la conexión.';$('payMsg').className='msg ok';return}
  await window.abuelitaVentasCloud.registrar(venta);
  store(OFFLINE_SALES_KEY,pendientesVenta().filter(x=>x.id!==venta.id));pintarPendientes();
  ventas.push(venta);store(SALES_KEY,ventas);
  cargarSelectorVenta();
  await window.abuelitaProductosCloud.actualizar();
  $('payMsg').textContent=`✓ Venta sincronizada por ${medio}. Total S/ ${total.toFixed(2)}`;$('payMsg').className='msg ok';
 }catch(e){$('payMsg').textContent='Venta conservada como PENDIENTE. No la registres otra vez. Pulsa SINCRONIZAR al recuperar internet. '+e.message;$('payMsg').className='msg err'}
 finally{ventaEnProceso=false;document.querySelectorAll('[data-pay]').forEach(b=>b.disabled=false)}
}
document.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>finishPay(b.dataset.pay));
function descontarStock(items){for(const item of items){let p=productos.find(x=>x.codigo===item.codigo);if(!p||stockDisponible(p)<Number(item.cantidad||0)){$('payMsg').textContent='Stock insuficiente. Revise la venta.';$('payMsg').className='msg err';return false}}items.forEach(item=>{{let p=productos.find(x=>String(x.codigo)===String(item.codigo));p.cantidad=stockDisponible(p)-Number(item.cantidad||0)}});return true}

function clienteActivo(c){return c.activo!==false}
function renderClientes(){
  $('clienteContador').textContent=clientes.length;
  $('listaClientes').innerHTML=clientes.length?clientes.map((c,i)=>`<div class='clientRow ${clienteActivo(c)?'':'inactiveClient'}'><div><b>${esc(c.nombre)}</b><div class='muted'>${clienteActivo(c)?'Activo':'Desactivado'}</div></div><div class='clientActions'><button class='smallBtn' onclick='editarCliente(${i})'>✏️ Modificar</button><button class='smallBtn ${clienteActivo(c)?'dangerBtn':'activeBtn'}' onclick='toggleCliente(${i})'>${clienteActivo(c)?'Desactivar':'Reactivar'}</button></div></div>`).join(''):`<p class='muted'>Aún no hay clientes registrados.</p>`
}
function crearCliente(nombre){
  nombre=nombre.trim();
  if(!nombre)return {ok:false,msg:'Escriba el nombre del cliente.'};
  if(clientes.some(c=>c.nombre.toLowerCase()===nombre.toLowerCase()))return {ok:false,msg:'Ese cliente ya está registrado.'};
  let c={id:Date.now(),nombre,activo:true};clientes.push(c);clientes.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));store(CLIENTS_KEY,clientes);return {ok:true,cliente:c}
}
$('guardarCliente').onclick=()=>{let r=crearCliente($('clienteNombre').value);if(!r.ok){$('clienteMsg').textContent=r.msg;$('clienteMsg').className='msg err';return}$('clienteNombre').value='';$('clienteMsg').textContent='✓ Cliente registrado.';$('clienteMsg').className='msg ok';renderClientes();$('clienteNombre').focus()};$('clienteNombre').addEventListener('keydown',e=>{if(e.key==='Enter')$('guardarCliente').click()});
window.editarCliente=i=>{let c=clientes[i],nuevo=prompt('Modificar nombre del cliente:',c.nombre);if(nuevo===null)return;nuevo=nuevo.trim();if(!nuevo)return alert('El nombre no puede quedar vacío.');if(clientes.some((x,j)=>j!==i&&x.nombre.toLowerCase()===nuevo.toLowerCase()))return alert('Ya existe un cliente con ese nombre.');let anterior=c.nombre;c.nombre=nuevo;creditos.forEach(x=>{if(x.clienteId===c.id)x.clienteNombre=nuevo});ventas.forEach(x=>{if(x.clienteId===c.id)x.clienteNombre=nuevo});store(CLIENTS_KEY,clientes);store(CREDITS_KEY,creditos);store(SALES_KEY,ventas);clientes.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));store(CLIENTS_KEY,clientes);renderClientes();alert(`Cliente actualizado: ${anterior} → ${nuevo}`)};
window.toggleCliente=i=>{let c=clientes[i],activar=!clienteActivo(c);if(!activar&&!confirm(`¿Desactivar a ${c.nombre}? Ya no aparecerá para nuevos créditos, pero su historial se conservará.`))return;c.activo=activar;store(CLIENTS_KEY,clientes);renderClientes()};
function cargarSelectorClientes(seleccionarId){let activos=clientes.filter(clienteActivo);$('creditoCliente').innerHTML=activos.length?`<option value=''>Seleccione un cliente</option>`+activos.map(c=>`<option value='${c.id}'>${esc(c.nombre)}</option>`).join(''):`<option value=''>No hay clientes activos</option>`;if(seleccionarId)$('creditoCliente').value=String(seleccionarId)}
function creditoTotalCliente(id){return creditos.filter(c=>c.clienteId===id).reduce((s,c)=>s+Number(c.total||0),0)}
function pagosTotalCliente(id){return pagos.filter(p=>p.clienteId===id).reduce((s,p)=>s+Number(p.monto||0),0)}
function saldoCliente(id){return Math.max(0,creditoTotalCliente(id)-pagosTotalCliente(id))}
function fechaHora(f){let d=new Date(f);return d.toLocaleDateString('es-PE')+' · '+d.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}
function renderCreditos(){
 let pendiente=load(CREDIT_PENDING,null);$('creditoPendienteCard').classList.toggle('hidden',!pendiente);
 if(pendiente){$('creditoPendienteDetalle').innerHTML=`<p><b>Total: S/ ${Number(pendiente.total).toFixed(2)}</b></p><p class='muted'>${pendiente.items.map(x=>`${esc(x.nombre)} × ${x.cantidad}`).join(' · ')}</p>`;cargarSelectorClientes()}
 let ids=[...new Set(creditos.map(c=>c.clienteId))], cuentas=ids.map(id=>({id,nombre:(clientes.find(c=>c.id===id)||{}).nombre||creditos.find(c=>c.clienteId===id)?.clienteNombre||'Cliente',saldo:saldoCliente(id)})).filter(x=>x.saldo>0.004).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
 $('listaCreditos').innerHTML=cuentas.length?cuentas.map(x=>`<button class='creditClient' onclick='abrirCreditoCliente(${x.id})'><div><b>${esc(x.nombre)}</b><div class='muted'>Ver detalle y registrar pagos</div></div><div class='creditAmount'>S/ ${x.saldo.toFixed(2)}</div></button>`).join(''):`<p class='muted'>No hay créditos pendientes.</p>`;
 if(clienteCreditoSeleccionado!==null)renderCreditoDetalle(clienteCreditoSeleccionado)
}
function renderCreditoDetalle(id){let cliente=clientes.find(c=>c.id===id), primer=creditos.find(c=>c.clienteId===id);if(!cliente&&!primer){clienteCreditoSeleccionado=null;$('creditoDetalleCard').classList.add('hidden');return}clienteCreditoSeleccionado=id;let nombre=cliente?cliente.nombre:primer.clienteNombre,saldo=saldoCliente(id);$('creditoDetalleNombre').textContent=nombre;$('creditoDetalleSaldo').textContent=saldo.toFixed(2);$('creditoDetalleCard').classList.remove('hidden');
 let mov=[...creditos.filter(c=>c.clienteId===id).map(c=>({fecha:c.fecha,tipo:'Crédito',monto:Number(c.total),items:c.items||[]})),...pagos.filter(p=>p.clienteId===id).map(p=>({fecha:p.fecha,tipo:'Abono',monto:-Number(p.monto),items:[]}))].sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)), running=0;
 $('creditoMovimientos').innerHTML=mov.length?mov.map(m=>{running+=m.monto;return `<div class='movement'><div><b>${m.tipo}</b><div class='muted'>${fechaHora(m.fecha)}</div>${m.items.length?`<div class='movementItems muted'>${m.items.map(x=>`${esc(x.nombre)} × ${x.cantidad}`).join(' · ')}</div>`:''}</div><div class='movementAmount'>${m.monto<0?'− ':'+ '}S/ ${Math.abs(m.monto).toFixed(2)}<div class='muted'>Saldo S/ ${Math.max(0,running).toFixed(2)}</div></div></div>`}).join(''):`<p class='muted'>Sin movimientos.</p>`;
 $('pagarTodoCredito').disabled=saldo<=0;$('abonarCredito').disabled=saldo<=0
}
window.abrirCreditoCliente=id=>{renderCreditoDetalle(id);setTimeout(()=>$('creditoDetalleCard').scrollIntoView({behavior:'smooth',block:'start'}),0)};
$('cerrarCreditoDetalle').onclick=()=>{clienteCreditoSeleccionado=null;$('creditoDetalleCard').classList.add('hidden');$('pagoParcialBox').classList.add('hidden')};
$('abonarCredito').onclick=()=>{if(clienteCreditoSeleccionado===null)return;$('pagoParcialBox').classList.toggle('hidden');if(!$('pagoParcialBox').classList.contains('hidden'))setTimeout(()=>$('montoAbono').focus(),0)};
function registrarPago(monto){let id=clienteCreditoSeleccionado,saldo=saldoCliente(id);monto=Number(monto);if(!(monto>0)){ $('pagoCreditoMsg').textContent='Ingrese un monto válido.';$('pagoCreditoMsg').className='msg err';return false}if(monto>saldo+0.001){$('pagoCreditoMsg').textContent=`El pago no puede superar el saldo de S/ ${saldo.toFixed(2)}.`;$('pagoCreditoMsg').className='msg err';return false}let c=clientes.find(x=>x.id===id),n=c?c.nombre:(creditos.find(x=>x.clienteId===id)||{}).clienteNombre;pagos.push({id:Date.now(),clienteId:id,clienteNombre:n,monto:Number(monto.toFixed(2)),fecha:new Date().toISOString()});store(PAYMENTS_KEY,pagos);$('montoAbono').value='';$('pagoParcialBox').classList.add('hidden');$('pagoCreditoMsg').textContent=`✓ Pago de S/ ${monto.toFixed(2)} registrado. Saldo: S/ ${saldoCliente(id).toFixed(2)}`;$('pagoCreditoMsg').className='msg ok';renderCreditos();return true}
$('guardarAbono').onclick=()=>registrarPago(parseFloat($('montoAbono').value.replace(',','.')));$('montoAbono').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('guardarAbono').click()}});
$('pagarTodoCredito').onclick=()=>{if(clienteCreditoSeleccionado===null)return;let saldo=saldoCliente(clienteCreditoSeleccionado);if(saldo<=0)return;if(confirm(`¿Registrar el pago total de S/ ${saldo.toFixed(2)}?`))registrarPago(saldo)};
$('nuevoClienteCredito').onclick=()=>{$('altaClienteCredito').classList.toggle('hidden');if(!$('altaClienteCredito').classList.contains('hidden'))setTimeout(()=>$('creditoNuevoNombre').focus(),0)};
function guardarClienteRapido(){let r=crearCliente($('creditoNuevoNombre').value);if(!r.ok){$('creditoClienteMsg').textContent=r.msg;$('creditoClienteMsg').className='msg err';return}$('creditoNuevoNombre').value='';$('creditoClienteMsg').textContent=`✓ ${r.cliente.nombre} agregado y seleccionado.`;$('creditoClienteMsg').className='msg ok';cargarSelectorClientes(r.cliente.id);renderClientes();setTimeout(()=>$('altaClienteCredito').classList.add('hidden'),700)}
$('guardarNuevoClienteCredito').onclick=guardarClienteRapido;$('creditoNuevoNombre').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();guardarClienteRapido()}});
$('asignarCredito').onclick=()=>{let pendiente=load(CREDIT_PENDING,null),id=Number($('creditoCliente').value),cliente=clientes.find(c=>c.id===id&&clienteActivo(c));if(!pendiente||!cliente){$('creditoMsg').textContent='Seleccione un cliente.';$('creditoMsg').className='msg err';return}if(!descontarStock(pendiente.items))return;let credito={...pendiente,clienteId:cliente.id,clienteNombre:cliente.nombre,creditoId:pendiente.id||Date.now()};creditos.push(credito);ventas.push({...pendiente,clienteId:cliente.id,clienteNombre:cliente.nombre});store(CREDITS_KEY,creditos);store(SALES_KEY,ventas);store(KEY,productos);localStorage.removeItem(CREDIT_PENDING);carrito=[];store(CART_KEY,carrito);renderCart();render();renderCreditos();$('creditoMsg').textContent=`✓ Crédito guardado a nombre de ${cliente.nombre}.`;$('creditoMsg').className='msg ok'};
$('exportar').onclick=async()=>{
 const estado=$('backupMsg');const boton=$('exportar');boton.disabled=true;estado.textContent='Consultando los datos de Firebase…';estado.className='msg';
 try{
  if(!window.abuelitaRespaldoCloud)throw Error('Espere la conexión con Firebase.');
  const nube=await window.abuelitaRespaldoCloud.exportar();
  const backup={app:'La Abuelita',schemaVersion:2,fecha:new Date().toISOString(),origen:'firebase-y-datos-locales',nube,local:{clientes,creditos,pagos,carrito,carritoCompra}};
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`LA_ABUELITA_RESPALDO_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  estado.textContent=`✓ Respaldo descargado: ${nube.productos.length} productos, ${nube.ventas.length} ventas, ${nube.compras.length} compras y ${nube.proveedores.length} proveedores. Créditos y clientes locales se incluyen por separado.`;estado.className='msg ok';
 }catch(e){estado.textContent='No se pudo descargar el respaldo: '+e.message;estado.className='msg err'}finally{boton.disabled=false}
};
$('importar').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let b=JSON.parse(await f.text());if(b.schemaVersion===2){alert('Esta copia contiene datos de Firebase. Por seguridad, la restauración automática de la nube todavía no está habilitada. No se ha modificado ningún dato.');return}if(!Array.isArray(b.productos))throw 0;if(!confirm(`Se restaurarán ${b.productos.length} productos. ¿Continuar?`))return;productos=b.productos;clientes=Array.isArray(b.clientes)?b.clientes:[];ventas=Array.isArray(b.ventas)?b.ventas:[];creditos=Array.isArray(b.creditos)?b.creditos:[];pagos=Array.isArray(b.pagos)?b.pagos:[];proveedores=Array.isArray(b.proveedores)?b.proveedores:[];compras=Array.isArray(b.compras)?b.compras:[];carrito=Array.isArray(b.carrito)?b.carrito:[];carritoCompra=Array.isArray(b.carritoCompra)?b.carritoCompra:[];store(KEY,productos);store(CLIENTS_KEY,clientes);store(SALES_KEY,ventas);store(CREDITS_KEY,creditos);store(PAYMENTS_KEY,pagos);store(SUPPLIERS_KEY,proveedores);store(PURCHASES_KEY,compras);store(CART_KEY,carrito);store(PURCHASE_CART_KEY,carritoCompra);if(b.creditoPendiente)store(CREDIT_PENDING,b.creditoPendiente);else localStorage.removeItem(CREDIT_PENDING);render();renderCart();renderClientes();$('backupMsg').textContent='✓ Copia restaurada correctamente.';$('backupMsg').className='msg ok'}catch(err){$('backupMsg').textContent='La copia no es válida.';$('backupMsg').className='msg err'}e.target.value=''};
render();renderCart();renderClientes();if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});


// Limpieza de pruebas: conserva productos, clientes y el stock actual.
$('limpiarPruebas').onclick=()=>{
 const ok=confirm('Se borrarán todas las VENTAS, COMPRAS, CRÉDITOS y PAGOS registrados.\n\nLos PRODUCTOS, CLIENTES y el STOCK ACTUAL NO se borrarán.\n\n¿Desea continuar?');
 if(!ok)return;
 ventas=[]; compras=[]; creditos=[]; pagos=[]; carrito=[]; carritoCompra=[]; clienteCreditoSeleccionado=null;
 store(SALES_KEY,ventas); store(PURCHASES_KEY,compras); store(CREDITS_KEY,creditos); store(PAYMENTS_KEY,pagos); store(CART_KEY,carrito); store(PURCHASE_CART_KEY,carritoCompra);
 // Reservamos también esta clave para el módulo de compras que se implementará después.
 
 localStorage.removeItem(CREDIT_PENDING);
 render(); renderCart(); renderCreditos();
 $('limpiarMsg').textContent='✓ Datos de prueba eliminados. Productos, clientes y stock actual se conservaron.';
 $('limpiarMsg').className='msg ok';
};

/* V1.9.1 - buscador unificado por código o cualquier palabra del nombre */
function normText(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function coincidenciasProducto(q){
  const n=normText(q); if(!n)return [];
  return productos.filter(p=>normText(p.nombre).includes(n)||normText(p.codigo).includes(n)).slice(0,30);
}
function productoCodigoExacto(q){const n=String(q??'').trim();return productos.find(p=>String(p.codigo).trim()===n)}
function pintarSugerencias(el,arr,onPick){
  if(!arr.length){el.innerHTML=`<div class='noSuggestion'>No se encontraron productos.</div>`;el.classList.remove('hidden');return}
  el.innerHTML=arr.map((p,i)=>`<button type='button' class='suggestionItem' data-i='${i}'><div><b>${esc(p.nombre)}</b><div class='suggestionMeta'>Código: ${esc(p.codigo)} · Stock: ${p.cantidad}</div></div><div class='suggestionPrice'>S/ ${Number(p.precio).toFixed(2)}</div></button>`).join('');
  el.classList.remove('hidden'); el.querySelectorAll('.suggestionItem').forEach(b=>b.onclick=()=>onPick(arr[Number(b.dataset.i)]));
}
function ocultarSugerencias(el){el.classList.add('hidden');el.innerHTML=''}
function agregarProductoVenta(p){
  if(!p)return; let stock=stockDisponible(p),row=carrito.find(x=>String(x.codigo)===String(p.codigo)),qty=row?Number(row.cantidad)+1:1;
  if(stock<=0||qty>stock){$('vMsg').textContent=`STOCK INSUFICIENTE. Disponible: ${stock} ${stock===1?'unidad':'unidades'}.`;$('vMsg').className='msg err';$('vCodigo').value='';ocultarSugerencias($('vSugerencias'));$('vCodigo').focus();return}
  if(row)row.cantidad=qty;else carrito.push({codigo:p.codigo,nombre:p.nombre,precio:Number(p.precio),cantidad:1});
  store(CART_KEY,carrito);$('vCodigo').value='';ocultarSugerencias($('vSugerencias'));$('vMsg').textContent=`✓ Agregado al carrito: ${p.nombre}. Stock disponible: ${stockDisponible(p)} ${stockDisponible(p)===1?'unidad':'unidades'}.`;$('vMsg').className='msg ok';renderCart();$('vCodigo').focus();
}
function buscarVentaInput(){
  const q=$('vCodigo').value.trim(); if(!q){ocultarSugerencias($('vSugerencias'));return}
  const exacto=productoCodigoExacto(q); if(exacto){agregarProductoVenta(exacto);return}
  pintarSugerencias($('vSugerencias'),coincidenciasProducto(q),agregarProductoVenta);
}
$('vCodigo').oninput=buscarVentaInput;
$('vCodigo').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const exacto=productoCodigoExacto($('vCodigo').value);if(exacto)return agregarProductoVenta(exacto);const arr=coincidenciasProducto($('vCodigo').value);if(arr.length===1)agregarProductoVenta(arr[0]);}};
function prepararSiguienteConsulta(){
  // El código permanece visible, pero queda seleccionado para que el
  // siguiente escaneo USB lo reemplace sin tener que borrarlo a mano.
  setTimeout(()=>{const campo=$('cCodigo');campo.focus();campo.select()},0);
}
function mostrarConsultaProducto(p){
  $('consultaResultado').innerHTML=`<div class='name'>${esc(p.nombre)}</div><div class='bigprice'>S/ ${Number(p.precio).toFixed(2)}</div><div>Stock: <b>${p.cantidad}</b></div>`;
  $('cCodigo').value=String(p.codigo);
  ocultarSugerencias($('cSugerencias'));
  prepararSiguienteConsulta();
}
function buscarConsultaInput(){
  const q=$('cCodigo').value.trim();
  if(!q){ocultarSugerencias($('cSugerencias'));$('consultaResultado').textContent='Escanee un código o escriba parte del nombre.';return}
  const exacto=productoCodigoExacto(q);
  if(exacto){mostrarConsultaProducto(exacto);return}
  // No mostrar los datos del artículo anterior mientras se busca otro.
  $('consultaResultado').textContent='Buscando producto…';
  pintarSugerencias($('cSugerencias'),coincidenciasProducto(q),mostrarConsultaProducto);
}
$('cCodigo').oninput=buscarConsultaInput;
$('cCodigo').onfocus=()=>{if($('cCodigo').value)$('cCodigo').select()};
$('cCodigo').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const exacto=productoCodigoExacto($('cCodigo').value);if(exacto)return mostrarConsultaProducto(exacto);const arr=coincidenciasProducto($('cCodigo').value);if(arr.length===1)return mostrarConsultaProducto(arr[0]);pintarSugerencias($('cSugerencias'),arr,mostrarConsultaProducto)}};



/* V1.10 - cliente opcional en venta, compras, proveedores y movimientos */
function selectorOptions(arr,placeholder){return `<option value=''>${placeholder}</option>`+arr.filter(x=>x.activo!==false).map(x=>`<option value='${x.id}'>${esc(x.nombre)}</option>`).join('')}
function cargarSelectorVenta(sel){if(!$('ventaCliente'))return;$('ventaCliente').innerHTML=selectorOptions(clientes,'Sin cliente / venta rápida');if(sel)$('ventaCliente').value=String(sel)}
$('nuevoClienteVenta').onclick=()=>{$('altaClienteVenta').classList.toggle('hidden');if(!$('altaClienteVenta').classList.contains('hidden'))$('ventaNuevoNombre').focus()};
function altaClienteVenta(){let r=crearCliente($('ventaNuevoNombre').value);if(!r.ok){$('ventaClienteMsg').textContent=r.msg;$('ventaClienteMsg').className='msg err';return}$('ventaNuevoNombre').value='';cargarSelectorVenta(r.cliente.id);renderClientes();$('ventaClienteMsg').textContent='✓ Cliente agregado y seleccionado.';$('ventaClienteMsg').className='msg ok';$('altaClienteVenta').classList.add('hidden')}
$('guardarNuevoClienteVenta').onclick=altaClienteVenta;$('ventaNuevoNombre').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();altaClienteVenta()}});
function proveedorActivo(p){return p.activo!==false}
async function crearProveedor(nombre){
 nombre=nombre.trim();if(!nombre)return {ok:false,msg:'Escriba el nombre del proveedor.'};
 if(proveedores.some(p=>p.nombre.toLowerCase()===nombre.toLowerCase()))return {ok:false,msg:'Ese proveedor ya está registrado.'};
 if(!window.abuelitaProveedoresCloud)return {ok:false,msg:'Conéctese a Firebase para registrar proveedores.'};
 const p={id:Date.now(),nombre,activo:true};
 try{await window.abuelitaProveedoresCloud.crear(p);return {ok:true,proveedor:p}}catch(e){return {ok:false,msg:'Firebase: '+e.message}}
}
window.abuelitaAplicarProveedoresCompartidos=function(lista){
 if(!Array.isArray(lista))return;
 proveedores=lista.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
 store(SUPPLIERS_KEY,proveedores);
 renderProveedores();cargarSelectorProveedores();
};
function renderProveedores(){$('proveedorContador').textContent=proveedores.length;$('listaProveedores').innerHTML=proveedores.length?proveedores.map((p,i)=>`<div class='clientRow ${proveedorActivo(p)?'':'inactiveClient'}'><div><b>${esc(p.nombre)}</b><div class='muted'>${proveedorActivo(p)?'Activo':'Desactivado'}</div></div><div class='clientActions'><button class='smallBtn' onclick='editarProveedor(${i})'>✏️ Modificar</button><button class='smallBtn ${proveedorActivo(p)?'dangerBtn':'activeBtn'}' onclick='toggleProveedor(${i})'>${proveedorActivo(p)?'Desactivar':'Reactivar'}</button></div></div>`).join(''):`<p class='muted'>Aún no hay proveedores registrados.</p>`}
$('guardarProveedor').onclick=async()=>{let r=await crearProveedor($('proveedorNombre').value);if(!r.ok){$('proveedorMsg').textContent=r.msg;$('proveedorMsg').className='msg err';return}$('proveedorNombre').value='';$('proveedorMsg').textContent='✓ Proveedor registrado.';$('proveedorMsg').className='msg ok';renderProveedores()};
window.editarProveedor=async i=>{
 let p=proveedores[i];if(!p)return;let n=prompt('Modificar nombre del proveedor:',p.nombre);if(n===null)return;n=n.trim();
 if(!n)return alert('El nombre no puede quedar vacío.');
 if(proveedores.some((x,j)=>j!==i&&x.nombre.toLowerCase()===n.toLowerCase()))return alert('Ya existe un proveedor con ese nombre.');
 try{await window.abuelitaProveedoresCloud.editar(p.id,{nombre:n});}catch(e){alert('No se guardó: '+e.message)}
};
window.toggleProveedor=async i=>{
 let p=proveedores[i];if(!p)return;let activo=!proveedorActivo(p);
 if(!activo&&!confirm(`¿Desactivar a ${p.nombre}? Su historial de compras se conservará.`))return;
 try{await window.abuelitaProveedoresCloud.editar(p.id,{activo});}catch(e){alert('No se guardó: '+e.message)}
};
function cargarSelectorProveedores(sel){$('compraProveedor').innerHTML=selectorOptions(proveedores,'Seleccione un proveedor');if(sel)$('compraProveedor').value=String(sel)}
$('nuevoProveedorCompra').onclick=()=>{$('altaProveedorCompra').classList.toggle('hidden');if(!$('altaProveedorCompra').classList.contains('hidden'))$('compraNuevoProveedor').focus()};
async function altaProveedorCompra(){let r=await crearProveedor($('compraNuevoProveedor').value);if(!r.ok){$('compraProveedorMsg').textContent=r.msg;$('compraProveedorMsg').className='msg err';return}$('compraNuevoProveedor').value='';cargarSelectorProveedores(r.proveedor.id);renderProveedores();$('compraProveedorMsg').textContent='✓ Proveedor agregado y seleccionado.';$('compraProveedorMsg').className='msg ok';$('altaProveedorCompra').classList.add('hidden')}
$('guardarNuevoProveedorCompra').onclick=altaProveedorCompra;
function agregarCompra(p){if(!carritoCompra.some(x=>x.codigo===p.codigo)&&carritoCompra.length>=4){$('compraMsg').textContent='Máximo 4 productos diferentes por compra en esta versión.';$('compraMsg').className='msg err';return}let r=carritoCompra.find(x=>x.codigo===p.codigo);if(r)r.cantidad++;else carritoCompra.push({codigo:p.codigo,nombre:p.nombre,cantidad:1});store(PURCHASE_CART_KEY,carritoCompra);$('compraBuscar').value='';ocultarSugerencias($('compraSugerencias'));renderCompra();$('compraBuscar').focus()}
function renderCompra(){$('carritoCompra').innerHTML=carritoCompra.length?carritoCompra.map((x,i)=>`<div class='cartrow'><div class='cartinfo'><b>${esc(x.nombre)}</b><div class='muted'>Código ${esc(x.codigo)}</div></div><div class='qty'><button onclick='cambiarCompra(${i},-1)'>−</button><strong>${x.cantidad}</strong><button onclick='cambiarCompra(${i},1)'>+</button><button class='trash' onclick='quitarCompra(${i})'>🗑️</button></div></div>`).join(''):`<p class='muted'>Aún no hay productos en esta compra.</p>`}
window.cambiarCompra=(i,d)=>{let x=carritoCompra[i];if(!x)return;x.cantidad+=d;if(x.cantidad<=0)carritoCompra.splice(i,1);store(PURCHASE_CART_KEY,carritoCompra);renderCompra()};window.quitarCompra=i=>{carritoCompra.splice(i,1);store(PURCHASE_CART_KEY,carritoCompra);renderCompra()};
$('compraBuscar').oninput=()=>{let q=$('compraBuscar').value.trim();if(!q)return ocultarSugerencias($('compraSugerencias'));let ex=productoCodigoExacto(q);if(ex)return agregarCompra(ex);pintarSugerencias($('compraSugerencias'),coincidenciasProducto(q),agregarCompra)};
$('compraBuscar').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();let ex=productoCodigoExacto($('compraBuscar').value);if(ex)return agregarCompra(ex);let a=coincidenciasProducto($('compraBuscar').value);if(a.length===1)agregarCompra(a[0])}};
$('guardarCompra').onclick=async()=>{
 const aviso=$('guardarCompraMsg'),boton=$('guardarCompra');
 const pid=Number($('compraProveedor').value),prov=proveedores.find(p=>p.id===pid&&proveedorActivo(p));
 if(!prov){aviso.textContent='Seleccione un proveedor.';aviso.className='msg err';return}
 if(!carritoCompra.length){aviso.textContent='Agregue al menos un producto.';aviso.className='msg err';return}
 if(carritoCompra.length>4){aviso.textContent='Por seguridad, máximo 4 productos distintos por compra. Registre otra compra para el resto.';aviso.className='msg err';return}
 if(!navigator.onLine){aviso.textContent='Las compras compartidas requieren internet. El carrito se conserva.';aviso.className='msg err';return}
 if(!window.abuelitaComprasCloud){aviso.textContent='Espere la conexión con Firebase.';aviso.className='msg err';return}
 const compra={id:'C'+Date.now()+'_'+Math.random().toString(36).slice(2,8),fecha:new Date().toISOString(),proveedorNombre:prov.nombre,items:carritoCompra.map(x=>({codigo:String(x.codigo),cantidad:Number(x.cantidad)}))};
 boton.disabled=true;aviso.textContent='Guardando compra en Firebase…';aviso.className='msg';
 try{
  await window.abuelitaComprasCloud.registrar(compra);
  carritoCompra=[];store(PURCHASE_CART_KEY,carritoCompra);renderCompra();
  aviso.textContent='✓ Compra confirmada en Firebase. Existencias actualizadas para toda la familia.';aviso.className='msg ok';
 }catch(e){aviso.textContent='No se registró la compra: '+(e.message||e);aviso.className='msg err'}
 finally{boton.disabled=false}
};
const nombresVendedoresCompartidos = Object.create(null);
window.abuelitaAplicarNombresVendedores = function(nombres){Object.assign(nombresVendedoresCompartidos,nombres);if(!$('movimientos').classList.contains('hidden'))renderMovimientos()};
function nombreVendedor(v){const uid=String(v.registradoPor||'');return uid?(nombresVendedoresCompartidos[uid]||'Consultando vendedor…'):'Sin identificar (venta anterior)'}
window.abuelitaAplicarComprasCompartidas=function(lista){
 const locales=load(PURCHASES_KEY,[]).filter(c=>!c.origenFirebase);
 compras=[...locales,...lista.map(c=>({...c,origenFirebase:true}))];
 if($('movTipo')?.value==='compras')renderMovimientos();
};
function renderMovimientos(){if(!$('listaMovimientos'))return;let tipo=$('movTipo').value,desde=$('movDesde').value,hasta=$('movHasta').value,arr=tipo==='ventas'?ventas:compras;arr=arr.filter(x=>{let d=x.fecha.slice(0,10);return(!desde||d>=desde)&&(!hasta||d<=hasta)}).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));let total=tipo==='ventas'?arr.reduce((s,x)=>s+Number(x.total||0),0):arr.length;$('movResumen').innerHTML=tipo==='ventas'?`<b>${arr.length}</b> venta(s) · Total S/ <b>${total.toFixed(2)}</b>`:`<b>${arr.length}</b> compra(s) registrada(s)`;resumenVentasV136(arr);$('listaMovimientos').innerHTML=arr.length?arr.map(x=>`<div class='movement'><div><b>${fechaHora(x.fecha)}</b><div>${tipo==='ventas'?(x.clienteNombre?esc(x.clienteNombre):'Sin cliente'):`Proveedor: ${esc(x.proveedorNombre||'')}`}</div>${tipo==='ventas'?`<div class='movementSeller'>👤 Vendido por: <b>${esc(nombreVendedor(x))}</b></div>`:''}<div class='movementItems'>${(x.items||[]).map(i=>`${esc(i.nombre)} × ${i.cantidad}`).join(' · ')}</div></div><div class='movementAmount'>${tipo==='ventas'?`${esc(x.medio)}<br>S/ ${Number(x.total||0).toFixed(2)}`:`${(x.items||[]).reduce((s,i)=>s+Number(i.cantidad||0),0)} unid.`}</div></div>`).join(''):`<p class='muted'>No hay movimientos para el periodo seleccionado.</p>`}

// V1.36: resumen por vendedor y medio de pago; respeta los filtros de fecha existentes.
function resumenVentasV136(arr){
 const nodo=$('movReportes');if(!nodo)return;
 if($('movTipo').value!=='ventas'){nodo.innerHTML='';return}
 const vendedores=new Map(),medios=new Map();
 for(const v of arr){
  const uid=String(v.registradoPor||'sin-identificar');
  const ven=vendedores.get(uid)||{nombre:nombreVendedor(v),cantidad:0,total:0};
  ven.nombre=nombreVendedor(v);ven.cantidad++;ven.total+=Number(v.total)||0;vendedores.set(uid,ven);
  const medio=String(v.medio||'SIN MEDIO');const m=medios.get(medio)||{cantidad:0,total:0};
  m.cantidad++;m.total+=Number(v.total)||0;medios.set(medio,m);
 }
 const filas=(valores)=>[...valores].map(x=>`<tr><td>${esc(x.nombre||x.medio)}</td><td>${x.cantidad}</td><td>S/ ${x.total.toFixed(2)}</td></tr>`).join('');
 const porVendedor=[...vendedores.values()].sort((a,b)=>b.total-a.total);
 const porMedio=[...medios.entries()].map(([medio,x])=>({...x,medio}));
 nodo.innerHTML=`<h3>👤 Ventas por vendedor</h3><div class="tablaScroll"><table class="reporteTabla"><thead><tr><th>Vendedor</th><th>Ventas</th><th>Total</th></tr></thead><tbody>${filas(porVendedor)||'<tr><td colspan="3">Sin ventas en el periodo</td></tr>'}</tbody></table></div><h3>💵 Ventas por medio de pago</h3><div class="tablaScroll"><table class="reporteTabla"><thead><tr><th>Medio</th><th>Ventas</th><th>Total</th></tr></thead><tbody>${filas(porMedio)||'<tr><td colspan="3">Sin ventas en el periodo</td></tr>'}</tbody></table></div>`;
}
$('verMovimientos').onclick=renderMovimientos;$('movTipo').onchange=renderMovimientos;
cargarSelectorVenta();renderProveedores();renderCompra();


/* PWA MOVIL V1.0 - cámara como lector de código de barras */
let scannerStream=null, scannerTimer=null, scannerTarget=null, scannerBusy=false;
async function cerrarScanner(){
  if(scannerTimer){clearInterval(scannerTimer);scannerTimer=null}
  if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop());scannerStream=null}
  const v=$('scannerVideo'); if(v){v.pause();v.srcObject=null}
  $('scannerModal')?.classList.add('hidden'); scannerBusy=false;
}
function procesarCodigoCamara(codigo){
  codigo=String(codigo||'').trim(); if(!codigo||!scannerTarget)return;
  const input=$(scannerTarget); if(!input)return;
  cerrarScanner(); input.value=codigo;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  if(scannerTarget==='buscar'){
    const p=productos.find(x=>String(x.codigo).trim()===codigo);
    if(p)seleccionarProducto(p.codigo);else{render();$('msg').textContent='Código no registrado: '+codigo;$('msg').className='msg err'}
  }else{input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));}
  setTimeout(()=>{if(scannerTarget!=='buscar')input.focus()},150);
}
async function abrirScanner(target){
  if(scannerBusy)return; scannerBusy=true; scannerTarget=target;
  const status=$('scannerStatus'); $('scannerModal').classList.remove('hidden');
  status.textContent='Solicitando acceso a la cámara…'; status.className='msg';
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('La cámara requiere abrir la PWA desde HTTPS o localhost.');
    scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    const video=$('scannerVideo'); video.srcObject=scannerStream; await video.play();
    if(!('BarcodeDetector' in window))throw new Error('Este navegador no permite lectura automática de códigos. Use Chrome actualizado en Android o escriba el código manualmente.');
    let formats; try{formats=await BarcodeDetector.getSupportedFormats()}catch(e){formats=[]}
    const preferred=['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'];
    const use=preferred.filter(x=>!formats.length||formats.includes(x));
    const detector=new BarcodeDetector(use.length?{formats:use}:undefined);
    status.textContent='Apunte al código. La lectura es automática.'; status.className='msg ok';
    scannerTimer=setInterval(async()=>{
      if(!scannerStream||video.readyState<2)return;
      try{const codes=await detector.detect(video);if(codes?.length)procesarCodigoCamara(codes[0].rawValue)}catch(e){}
    },220);
  }catch(err){status.textContent='⚠️ '+(err?.message||'No se pudo abrir la cámara.');status.className='msg err'; if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop());scannerStream=null} scannerBusy=false;setTimeout(()=>{if(!$('scannerModal').classList.contains('hidden')&&!scannerStream)cerrarScanner()},3500)}
}
document.querySelectorAll('[data-scan-target]').forEach(b=>b.addEventListener('click',()=>abrirScanner(b.dataset.scanTarget)));
$('cerrarScanner')?.addEventListener('click',cerrarScanner);$('cancelarScanner')?.addEventListener('click',cerrarScanner);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!$('scannerModal')?.classList.contains('hidden'))cerrarScanner()});

$('sincronizarVentas').onclick=()=>sincronizarPendientes();pintarPendientes();

// V1.30: puente explícito entre el catálogo Firebase y el estado local de la interfaz.
window.abuelitaAplicarCatalogo=function(lista){
  if(!Array.isArray(lista))throw Error('Catálogo inválido');
  productos=lista;store(KEY,productos);
  render();renderCart();
  if(typeof renderCompra==='function')renderCompra();
};

// Ventas confirmadas desde cualquier cuenta: evita duplicados por ID y conserva la cola offline local.
window.abuelitaAplicarVentasCompartidas=function(remotas){const mapa=new Map(ventas.map(v=>[v.id,v]));for(const v of remotas)mapa.set(v.id,v);ventas=[...mapa.values()];store(SALES_KEY,ventas);if(!$('movimientos').classList.contains('hidden'))renderMovimientos()};
