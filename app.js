/* ═══════════════════════════════════════════════════════════
   app.js — Variedades Karen · Sistema de Gestión Empresarial
   Fase 2: Ventas, Clientes, Cobros, Escáner
   ═══════════════════════════════════════════════════════════ */

const App = {
  seccionActual: 'dashboard',
  subseccion: null,
  compraEnEdicion: null,
  ventaEnEdicion: null,
  proveedorEnEdicion: null,
  clienteEnEdicion: null,
  cobroEnEdicion: null,
  productosCompraTemp: [],
  productosVentaTemp: [],
  scannerActivo: null,
  productoEscanerDestino: null
};

const fmtC = (n) => 'C$' + (parseFloat(n) || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtFecha = (f) => {
  if (!f) return 'N/A';
  const s = f.includes('T') ? f.split('T')[0] : f;
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};
const hoyISO = () => new Date().toISOString().split('T')[0];
const diffDias = (fecha) => Math.ceil((new Date(fecha) - new Date()) / 86400000);

/* ═══════════ INICIALIZACIÓN ═══════════ */
window.addEventListener('DOMContentLoaded', async () => {
  cargarTema();
  try {
    const migro = await migrarDesdeLocalStorage();
    if (migro) {
      console.log('✅ Migración v1→v2 completada');
      setTimeout(() => toast('✅ Datos migrados'), 800);
    }
    await DB.cargarTodo();
    actualizarHeader();
    navegar('dashboard');
  } catch (e) {
    console.error('Error init:', e);
    toast('❌ Error al cargar datos');
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});

function actualizarHeader() {
  const sub = document.getElementById('headerSubtitle');
  if (sub) sub.textContent = `${DB.proveedores.length} prov · ${DB.compras.length} compras · ${DB.ventas.length} ventas · ${DB.clientes.length} clientes`;
}

/* ═══════════ TEMA ═══════════ */
function cargarTema() {
  if (localStorage.getItem('tema') === 'dark') document.documentElement.classList.add('dark');
  actualizarIconoTema(document.documentElement.classList.contains('dark'));
}
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('tema', isDark ? 'dark' : 'light');
  actualizarIconoTema(isDark);
}
function actualizarIconoTema(isDark) {
  const i = document.getElementById('themeIcon');
  if (!i) return;
  i.innerHTML = isDark
    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>'
    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>';
}

/* ═══════════ NAVEGACIÓN ═══════════ */
function navegar(seccion, sub = null) {
  App.seccionActual = seccion;
  App.subseccion = sub;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.nav === seccion));
  const main = document.getElementById('appMain');
  main.innerHTML = '';
  switch (seccion) {
    case 'dashboard': renderDashboard(main); break;
    case 'compras': renderCompras(main); break;
    case 'ventas': renderVentas(main); break;
    case 'finanzas': renderFinanzas(main); break;
    case 'mas': renderMas(main); break;
  }
  actualizarHeader();
}

function cambiarSubtab(sub) {
  App.subseccion = sub;
  navegar(App.seccionActual, sub);
}

/* ═══════════ DASHBOARD ═══════════ */
function renderDashboard(el) {
  const deudaTotal = DB.compras.reduce((s, c) => s + (parseFloat(c.saldo) || 0), 0);
  const carteraClientes = DB.ventas.reduce((s, v) => s + (parseFloat(v.saldo) || 0), 0);
  const stockValor = DB.compras.reduce((s, c) =>
    s + (c.productos || []).filter(p => !p.vendido).reduce((ss, p) =>
      ss + (parseFloat(p.precioCompra) || 0) * (parseInt(p.cantidad) || 1), 0), 0);
  const ganancia = DB.ventas.reduce((s, v) => {
    const costo = (v.productos || []).reduce((c, p) =>
      c + (parseFloat(p.precioCompra) || parseFloat(p.precioCarmen) || 0) * (parseInt(p.cantidad) || 1), 0);
    return s + ((parseFloat(v.precioTotal) || 0) - costo);
  }, 0);

  const hoy = new Date();
  const alertas = DB.ventas.filter(v => v.estado === 'PENDIENTE' && v.proximaFechaCobro)
    .map(v => ({ ...v, dias: diffDias(v.proximaFechaCobro) }))
    .filter(v => v.dias <= 7)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 5);

  el.innerHTML = `
    <div class="anim-in space-y-4">
      <div class="grid grid-cols-2 gap-3">
        ${kpiCard('Deuda con proveedores', fmtC(deudaTotal), 'rose', 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z')}
        ${kpiCard('Clientes me deben', fmtC(carteraClientes), 'amber', 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z')}
        ${kpiCard('Stock valorizado', fmtC(stockValor), 'brand', 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4')}
        ${kpiCard('Ganancia estimada', fmtC(ganancia), 'emerald', 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6')}
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div class="kpi text-center"><p class="text-2xl font-extrabold text-slate-800 dark:text-white">${DB.compras.length}</p><p class="text-xs text-slate-500 mt-1">Compras</p></div>
        <div class="kpi text-center"><p class="text-2xl font-extrabold text-slate-800 dark:text-white">${DB.ventas.filter(v => v.estado === 'PENDIENTE').length}</p><p class="text-xs text-slate-500 mt-1">Ventas activas</p></div>
        <div class="kpi text-center"><p class="text-2xl font-extrabold text-slate-800 dark:text-white">${DB.clientes.length}</p><p class="text-xs text-slate-500 mt-1">Clientes</p></div>
      </div>

      <div>
        <h2 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 px-1">⚡ Acciones rápidas</h2>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="abrirModalVenta()" class="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-left shadow-lg">
            <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <p class="font-bold text-sm">Nueva Venta</p>
          </button>
          <button onclick="abrirModalCompra()" class="p-4 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-left shadow-lg">
            <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4"/></svg>
            <p class="font-bold text-sm">Nueva Compra</p>
          </button>
          <button onclick="abrirModalCobro()" class="p-4 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 text-white text-left shadow-lg">
            <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            <p class="font-bold text-sm">Cobrar Cliente</p>
          </button>
          <button onclick="abrirModalPago()" class="p-4 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 text-white text-left shadow-lg">
            <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 9v1"/></svg>
            <p class="font-bold text-sm">Pagar Proveedor</p>
          </button>
        </div>
      </div>

      ${alertas.length > 0 ? `
        <div class="card">
          <h2 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">🔔 Alertas de cobro</h2>
          <div class="space-y-2">
            ${alertas.map(v => {
              const cls = v.dias < 0 ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20' :
                          v.dias === 0 ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' :
                          'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800';
              const txt = v.dias < 0 ? `Vencido ${Math.abs(v.dias)}d` : v.dias === 0 ? '¡Hoy!' : `En ${v.dias}d`;
              return `
                <div class="p-3 rounded-xl border ${cls} flex justify-between items-center cursor-pointer" onclick="abrirModalCobroPara('${v.id}')">
                  <div class="min-w-0">
                    <p class="font-semibold text-sm text-slate-800 dark:text-white truncate">${v.cliente}</p>
                    <p class="text-xs text-slate-500">Cuota: ${fmtC(v.cuotaMensual)}</p>
                  </div>
                  <div class="text-right">
                    <span class="badge ${v.dias < 0 ? 'badge-danger' : v.dias === 0 ? 'badge-warning' : 'badge-info'}">${txt}</span>
                    <p class="text-xs mt-1 text-slate-500">Saldo: ${fmtC(v.saldo)}</p>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>` : ''}
    </div>
  `;
}

function kpiCard(titulo, valor, color, iconPath) {
  const colors = { rose: 'from-rose-500 to-rose-700', amber: 'from-amber-500 to-amber-700', brand: 'from-brand-500 to-brand-700', emerald: 'from-emerald-500 to-emerald-700' };
  return `
    <div class="kpi">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white mb-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/></svg>
      </div>
      <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">${titulo}</p>
      <p class="text-base font-extrabold text-slate-800 dark:text-white truncate">${valor}</p>
    </div>
  `;
}

/* ═══════════ COMPRAS ═══════════ */
function renderCompras(el) {
  if (!App.subseccion) App.subseccion = 'historial';
  const sub = App.subseccion;

  el.innerHTML = `
    <div class="anim-in space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-xl font-extrabold text-slate-800 dark:text-white">Compras</h2>
        <button onclick="abrirModalCompra()" class="btn-primary text-sm">+ Nueva</button>
      </div>

      <div class="subtabs">
        <button class="subtab ${sub === 'historial' ? 'active' : ''}" onclick="cambiarSubtab('historial')">📋 Historial</button>
        <button class="subtab ${sub === 'deudas' ? 'active' : ''}" onclick="cambiarSubtab('deudas')">💳 Por Pagar</button>
      </div>

      ${sub === 'historial' ? renderComprasHistorial() : renderComprasDeudas()}
    </div>
  `;
}

function renderComprasHistorial() {
  const compras = [...DB.compras].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (compras.length === 0) return '<div class="card text-center py-12"><p class="text-4xl mb-2">📦</p><p class="text-slate-500 text-sm">Sin compras</p></div>';
  return `
    <div class="space-y-3">
      ${compras.map(c => {
        const prov = DB.proveedores.find(p => p.id === c.proveedorId);
        const pendiente = (parseFloat(c.saldo) || 0) > 0;
        return `
          <div class="card cursor-pointer" onclick="verDetalleCompra('${c.id}')">
            <div class="flex justify-between items-start mb-2">
              <div class="min-w-0">
                <p class="font-bold text-slate-800 dark:text-white">${c.id}</p>
                <p class="text-xs text-slate-500">${prov ? prov.nombre : 'Sin proveedor'} · ${fmtFecha(c.fecha)}</p>
              </div>
              <span class="badge ${pendiente ? 'badge-danger' : 'badge-success'}">${pendiente ? 'Pendiente' : 'Pagado'}</span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-slate-500">Total: ${fmtC(c.total)}</span>
              <span class="font-bold ${pendiente ? 'text-rose-600' : 'text-emerald-600'}">Saldo: ${fmtC(c.saldo)}</span>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function renderComprasDeudas() {
  const porProveedor = {};
  DB.compras.forEach(c => {
    if ((parseFloat(c.saldo) || 0) <= 0) return;
    if (!porProveedor[c.proveedorId]) porProveedor[c.proveedorId] = { total: 0, compras: [] };
    porProveedor[c.proveedorId].total += parseFloat(c.saldo) || 0;
    porProveedor[c.proveedorId].compras.push(c);
  });

  const items = Object.entries(porProveedor).sort((a, b) => b[1].total - a[1].total);
  if (items.length === 0) return '<div class="card text-center py-12"><p class="text-4xl mb-2">🎉</p><p class="text-slate-500 text-sm">No hay deudas pendientes</p></div>';

  return `
    <div class="space-y-3">
      ${items.map(([provId, data]) => {
        const prov = DB.proveedores.find(p => p.id === provId);
        return `
          <div class="card">
            <div class="flex justify-between items-center mb-2">
              <div>
                <p class="font-bold text-slate-800 dark:text-white">${prov ? prov.nombre : 'N/A'}</p>
                <p class="text-xs text-slate-500">${data.compras.length} compras pendientes</p>
              </div>
              <p class="text-lg font-extrabold text-rose-600">${fmtC(data.total)}</p>
            </div>
            <button onclick="abrirModalPagoPara('${provId}')" class="w-full py-2 rounded-xl bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-semibold text-sm">Pagar a este proveedor</button>
          </div>`;
      }).join('')}
    </div>`;
}

function abrirModalCompra(compraId = null) {
  const sel = document.getElementById('compraProveedor');
  sel.innerHTML = '<option value="">Seleccione...</option>' + DB.proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

  if (compraId) {
    const c = DB.compras.find(x => x.id === compraId);
    if (!c) return;
    document.getElementById('tituloModalCompra').textContent = 'Editar Compra';
    document.getElementById('compraId').value = c.id;
    document.getElementById('compraCodigo').value = c.id;
    document.getElementById('compraCodigo').disabled = true;
    document.getElementById('compraFecha').value = c.fecha;
    document.getElementById('compraProveedor').value = c.proveedorId || '';
    document.getElementById('compraTipoPago').value = c.tipoPago || 'contado';
    document.getElementById('compraPagoInicial').value = c.pagado || 0;
    App.compraEnEdicion = c;
    App.productosCompraTemp = JSON.parse(JSON.stringify(c.productos || []));
    document.getElementById('btnEliminarCompra').classList.remove('hidden');
  } else {
    document.getElementById('tituloModalCompra').textContent = 'Nueva Compra';
    document.getElementById('compraId').value = '';
    document.getElementById('compraCodigo').value = 'C' + String(DB.compras.length + 1).padStart(3, '0');
    document.getElementById('compraCodigo').disabled = false;
    document.getElementById('compraFecha').value = hoyISO();
    document.getElementById('compraProveedor').value = '';
    document.getElementById('compraTipoPago').value = 'contado';
    document.getElementById('compraPagoInicial').value = 0;
    App.compraEnEdicion = null;
    App.productosCompraTemp = [];
    document.getElementById('btnEliminarCompra').classList.add('hidden');
  }
  cambiarTipoPagoCompra();
  renderProductosCompraTemp();
  abrirModal('modalCompra');
}

function cambiarTipoPagoCompra() {
  const tipo = document.getElementById('compraTipoPago').value;
  document.getElementById('contenedorPagoInicial').classList.toggle('hidden', tipo === 'contado');
  recalcularCompra();
}

function renderProductosCompraTemp() {
  const cont = document.getElementById('listaProductosCompra');
  if (!App.productosCompraTemp || App.productosCompraTemp.length === 0) {
    cont.innerHTML = '<p class="text-center text-slate-400 text-sm py-4">Sin productos. Toca "+ Agregar".</p>';
    return;
  }
  cont.innerHTML = App.productosCompraTemp.map((p, i) => `
    <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-slate-500">Producto #${i+1}</span>
        <button onclick="quitarProductoCompra(${i})" class="text-rose-500 p-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
      </div>
      <input type="text" placeholder="Nombre del producto *" value="${p.nombre || ''}" oninput="actualizarProductoCompra(${i}, 'nombre', this.value)" class="inp text-sm">
      <div class="grid grid-cols-2 gap-2">
        <div class="relative">
          <input type="text" placeholder="Serie" value="${p.serie || ''}" oninput="actualizarProductoCompra(${i}, 'serie', this.value)" class="inp text-sm pr-10">
          <button type="button" onclick="escanearParaProducto('compra', ${i}, 'serie')" class="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
          </button>
        </div>
        <input type="text" placeholder="Modelo" value="${p.modelo || ''}" oninput="actualizarProductoCompra(${i}, 'modelo', this.value)" class="inp text-sm">
      </div>
      <div class="grid grid-cols-3 gap-2">
        <input type="number" placeholder="Cant" min="1" value="${p.cantidad || 1}" oninput="actualizarProductoCompra(${i}, 'cantidad', parseInt(this.value)||1)" class="inp text-sm">
        <input type="number" placeholder="Costo C$" min="0" step="0.01" value="${p.precioCompra || ''}" oninput="actualizarProductoCompra(${i}, 'precioCompra', parseFloat(this.value)||0)" class="inp text-sm">
        <input type="number" placeholder="Venta C$" min="0" step="0.01" value="${p.precioVenta || ''}" oninput="actualizarProductoCompra(${i}, 'precioVenta', parseFloat(this.value)||0)" class="inp text-sm">
      </div>
    </div>
  `).join('');
}

function agregarProductoCompra() {
  App.productosCompraTemp.push({ nombre: '', cantidad: 1, precioCompra: 0, precioVenta: 0, serie: '', modelo: '', foto: null, vendido: false });
  renderProductosCompraTemp();
}
function actualizarProductoCompra(i, campo, valor) { App.productosCompraTemp[i][campo] = valor; recalcularCompra(); }
function quitarProductoCompra(i) { App.productosCompraTemp.splice(i, 1); renderProductosCompraTemp(); recalcularCompra(); }

function recalcularCompra() {
  const productos = App.productosCompraTemp || [];
  const total = productos.reduce((s, p) => s + ((parseFloat(p.precioCompra) || 0) * (parseInt(p.cantidad) || 1)), 0);
  const tipo = document.getElementById('compraTipoPago').value;
  const pagoInicial = tipo === 'contado' ? total : (parseFloat(document.getElementById('compraPagoInicial').value) || 0);
  const saldo = Math.max(0, total - pagoInicial);
  document.getElementById('compraTotal').textContent = fmtC(total);
  document.getElementById('compraPagado').textContent = fmtC(pagoInicial);
  document.getElementById('compraSaldo').textContent = fmtC(saldo);
}

async function guardarCompra() {
  const id = document.getElementById('compraCodigo').value.trim().toUpperCase();
  const fecha = document.getElementById('compraFecha').value;
  const proveedorId = document.getElementById('compraProveedor').value;
  const tipoPago = document.getElementById('compraTipoPago').value;
  const productos = (App.productosCompraTemp || []).filter(p => p.nombre && (parseFloat(p.precioCompra) || 0) > 0);

  if (!id || !fecha || !proveedorId) return toast('⚠️ Completa ID, fecha y proveedor');
  if (productos.length === 0) return toast('⚠️ Agrega al menos un producto');

  const total = productos.reduce((s, p) => s + ((parseFloat(p.precioCompra) || 0) * (parseInt(p.cantidad) || 1)), 0);
  const pagoInicial = tipoPago === 'contado' ? total : (parseFloat(document.getElementById('compraPagoInicial').value) || 0);
  const saldo = Math.max(0, total - pagoInicial);
  const editando = !!App.compraEnEdicion;

  if (!editando && DB.compras.some(c => c.id === id)) return toast('⚠️ Ya existe una compra con ese ID');

  const compra = { id, proveedorId, fecha, tipoPago, productos, total, pagado: pagoInicial, saldo, estado: saldo <= 0 ? 'PAGADO' : 'PENDIENTE', lastModified: Date.now() };

  if (editando && App.compraEnEdicion.tipoPago === 'credito') {
    const pagosAntiguos = DB.pagosProveedor.filter(p => p.compraId === id && p.origen === 'pago_inicial');
    for (const p of pagosAntiguos) { await DB.eliminarPago(p.id); DB.pagosProveedor = DB.pagosProveedor.filter(x => x.id !== p.id); }
  }

  await DB.guardarCompra(compra);
  const idx = DB.compras.findIndex(c => c.id === id);
  if (idx >= 0) DB.compras[idx] = compra; else DB.compras.push(compra);

  if (tipoPago === 'credito' && pagoInicial > 0) {
    const pago = { id: 'pago_' + generarId(), proveedorId, compraId: id, fecha, monto: pagoInicial, metodo: 'Efectivo', notas: 'Pago inicial', origen: 'pago_inicial', lastModified: Date.now() };
    await DB.guardarPago(pago);
    DB.pagosProveedor.push(pago);
  }

  toast(editando ? '✅ Compra actualizada' : '✅ Compra registrada');
  cerrarModales();
  navegar('compras');
}

async function eliminarCompra() {
  if (!App.compraEnEdicion) return;
  if (!confirm(`¿Eliminar la compra ${App.compraEnEdicion.id}?`)) return;
  const id = App.compraEnEdicion.id;
  for (const p of DB.pagosProveedor.filter(x => x.compraId === id)) await DB.eliminarPago(p.id);
  DB.pagosProveedor = DB.pagosProveedor.filter(p => p.compraId !== id);
  await DB.eliminarCompra(id);
  DB.compras = DB.compras.filter(c => c.id !== id);
  toast('🗑️ Compra eliminada');
  cerrarModales();
  navegar('compras');
}

function verDetalleCompra(id) {
  const c = DB.compras.find(x => x.id === id);
  if (!c) return;
  const prov = DB.proveedores.find(p => p.id === c.proveedorId);
  const pagos = DB.pagosProveedor.filter(p => p.compraId === id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const html = `
    <div class="space-y-3">
      <div class="flex justify-between items-start">
        <div><p class="text-xs text-slate-500">Compra</p><p class="font-bold text-lg text-slate-800 dark:text-white">${c.id}</p></div>
        <span class="badge ${c.saldo > 0 ? 'badge-danger' : 'badge-success'}">${c.saldo > 0 ? 'Pendiente' : 'Pagado'}</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3"><p class="text-xs text-slate-500">Proveedor</p><p class="font-semibold text-slate-800 dark:text-white">${prov ? prov.nombre : 'N/A'}</p></div>
        <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3"><p class="text-xs text-slate-500">Fecha</p><p class="font-semibold text-slate-800 dark:text-white">${fmtFecha(c.fecha)}</p></div>
      </div>
      <div class="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 space-y-1">
        <div class="flex justify-between text-sm"><span>Total:</span><span class="font-bold">${fmtC(c.total)}</span></div>
        <div class="flex justify-between text-sm"><span>Pagado:</span><span class="font-bold text-emerald-600">${fmtC(c.pagado)}</span></div>
        <div class="flex justify-between text-sm border-t border-brand-200 dark:border-brand-800 pt-1"><span>Saldo:</span><span class="font-bold text-rose-600">${fmtC(c.saldo)}</span></div>
      </div>
      <div>
        <p class="font-bold text-sm mb-2">Productos (${c.productos.length})</p>
        <div class="space-y-2 max-h-60 overflow-y-auto">
          ${c.productos.map(p => `
            <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex justify-between items-center ${p.vendido ? 'opacity-60' : ''}">
              <div class="min-w-0">
                <p class="font-medium text-sm ${p.vendido ? 'line-through' : ''}">${p.nombre}</p>
                <p class="text-xs text-slate-500">${p.cantidad} × ${fmtC(p.precioCompra)}${p.serie ? ' · S/N: ' + p.serie : ''}${p.modelo ? ' · Mod: ' + p.modelo : ''}</p>
              </div>
              ${p.vendido ? '<span class="badge badge-success">Vendido</span>' : '<span class="badge badge-info">Stock</span>'}
            </div>`).join('')}
        </div>
      </div>
      ${pagos.length > 0 ? `
        <div><p class="font-bold text-sm mb-2">Pagos (${pagos.length})</p>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            ${pagos.map(p => `<div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 flex justify-between items-center"><div><p class="text-sm font-medium">${fmtFecha(p.fecha)}</p><p class="text-xs">${p.metodo}${p.notas ? ' · ' + p.notas : ''}</p></div><p class="font-bold text-emerald-700">${fmtC(p.monto)}</p></div>`).join('')}
          </div>
        </div>` : ''}
      <div class="flex gap-2 pt-2">
        <button onclick="abrirModalCompra('${c.id}')" class="btn-primary flex-1 text-sm">✏️ Editar</button>
        <button onclick="cerrarModales()" class="btn-ghost text-sm">Cerrar</button>
      </div>
    </div>
  `;
  abrirModalContenido('Detalle Compra', html);
}

/* ═══════════ VENTAS ═══════════ */
function renderVentas(el) {
  if (!App.subseccion) App.subseccion = 'activas';
  const sub = App.subseccion;

  el.innerHTML = `
    <div class="anim-in space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-xl font-extrabold text-slate-800 dark:text-white">Ventas</h2>
        <button onclick="abrirModalVenta()" class="btn-primary text-sm">+ Nueva</button>
      </div>
      <div class="subtabs">
        <button class="subtab ${sub === 'activas' ? 'active' : ''}" onclick="cambiarSubtab('activas')">🔴 Activas</button>
        <button class="subtab ${sub === 'pagadas' ? 'active' : ''}" onclick="cambiarSubtab('pagadas')">✅ Pagadas</button>
        <button class="subtab ${sub === 'clientes' ? 'active' : ''}" onclick="cambiarSubtab('clientes')">👥 Clientes</button>
      </div>
      ${sub === 'activas' ? renderVentasActivas() : sub === 'pagadas' ? renderVentasPagadas() : renderClientesLista()}
    </div>
  `;
}

function renderVentasActivas() {
  const ventas = DB.ventas.filter(v => v.estado === 'PENDIENTE')
    .sort((a, b) => new Date(a.proximaFechaCobro || a.fecha) - new Date(b.proximaFechaCobro || b.fecha));
  if (ventas.length === 0) return '<div class="card text-center py-12"><p class="text-4xl mb-2">🎉</p><p class="text-slate-500 text-sm">Sin ventas pendientes</p></div>';

  return `<div class="space-y-3">
    ${ventas.map(v => {
      const dias = v.proximaFechaCobro ? diffDias(v.proximaFechaCobro) : 999;
      const cls = dias < 0 ? 'border-rose-300 dark:border-rose-800' : dias <= 7 ? 'border-amber-300 dark:border-amber-800' : 'border-slate-200 dark:border-slate-800';
      const progress = v.precioTotal > 0 ? ((v.precioTotal - v.saldo) / v.precioTotal * 100) : 0;
      return `
        <div class="card border-2 ${cls} cursor-pointer" onclick="verDetalleVenta('${v.id}')">
          <div class="flex justify-between items-start mb-2">
            <div class="min-w-0">
              <p class="font-bold text-slate-800 dark:text-white truncate">${v.cliente}</p>
              <p class="text-xs text-slate-500">${v.id} · ${v.telefono || 'Sin teléfono'}</p>
            </div>
            <p class="font-extrabold text-orange-600">${fmtC(v.saldo)}</p>
          </div>
          <div class="flex justify-between text-xs mb-2">
            <span class="text-slate-500">Cuota: ${fmtC(v.cuotaMensual)}</span>
            <span class="${dias < 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}">${v.proximaFechaCobro ? (dias < 0 ? `Vencido ${Math.abs(dias)}d` : dias === 0 ? 'Hoy' : `En ${dias}d`) : 'Sin fecha'}</span>
          </div>
          <div class="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-orange-500" style="width: ${progress}%"></div>
          </div>
        </div>`;
    }).join('')}
  </div>`;
}

function renderVentasPagadas() {
  const ventas = DB.ventas.filter(v => v.estado === 'PAGADO').sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (ventas.length === 0) return '<div class="card text-center py-12"><p class="text-4xl mb-2">📭</p><p class="text-slate-500 text-sm">Sin ventas pagadas</p></div>';
  return `<div class="space-y-2">
    ${ventas.map(v => `
      <div class="card cursor-pointer flex justify-between items-center" onclick="verDetalleVenta('${v.id}')">
        <div class="min-w-0">
          <p class="font-semibold text-slate-800 dark:text-white truncate">${v.cliente}</p>
          <p class="text-xs text-slate-500">${v.id} · ${fmtFecha(v.fecha)}</p>
        </div>
        <div class="text-right">
          <p class="font-bold text-emerald-600">${fmtC(v.precioTotal)}</p>
          <span class="badge badge-success">Pagado</span>
        </div>
      </div>`).join('')}
  </div>`;
}

function renderClientesLista() {
  const clientes = [...DB.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (clientes.length === 0) return '<div class="card text-center py-12"><p class="text-4xl mb-2">👥</p><p class="text-slate-500 text-sm">Sin clientes</p></div>';
  return `
    <div class="card mb-3">
      <input type="text" id="buscarCliente" class="inp" placeholder="🔍 Buscar cliente..." oninput="filtrarClientes()">
    </div>
    <button onclick="abrirModalCliente()" class="btn-primary w-full mb-3 text-sm">+ Nuevo Cliente</button>
    <div id="listaClientesCont" class="space-y-2">
      ${clientes.map(c => {
        const ventas = DB.ventas.filter(v => v.clienteId === c.id);
        const deuda = ventas.reduce((s, v) => s + (parseFloat(v.saldo) || 0), 0);
        return `
          <div class="card cursor-pointer flex justify-between items-center" data-nombre="${c.nombre.toLowerCase()}" onclick="abrirModalCliente('${c.id}')">
            <div class="min-w-0">
              <p class="font-semibold text-slate-800 dark:text-white truncate">${c.nombre}</p>
              <p class="text-xs text-slate-500">${c.telefono || 'Sin teléfono'} · ${ventas.length} ventas</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-slate-500">Debe</p>
              <p class="font-bold ${deuda > 0 ? 'text-rose-600' : 'text-emerald-600'}">${fmtC(deuda)}</p>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function filtrarClientes() {
  const q = document.getElementById('buscarCliente').value.toLowerCase();
  document.querySelectorAll('#listaClientesCont [data-nombre]').forEach(el => {
    el.style.display = el.dataset.nombre.includes(q) ? '' : 'none';
  });
}

function abrirModalVenta(ventaId = null) {
  const sel = document.getElementById('ventaCliente');
  sel.innerHTML = '<option value="">Seleccione...</option>' + DB.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');

  if (ventaId) {
    const v = DB.ventas.find(x => x.id === ventaId);
    if (!v) return;
    document.getElementById('tituloModalVenta').textContent = 'Editar Venta';
    document.getElementById('ventaId').value = v.id;
    document.getElementById('ventaCodigo').value = v.id;
    document.getElementById('ventaCodigo').disabled = true;
    document.getElementById('ventaFecha').value = v.fecha;
    document.getElementById('ventaCliente').value = v.clienteId || '';
    document.getElementById('ventaPrima').value = v.prima || 0;
    document.getElementById('ventaTipoPago').value = v.tipoPago || 'credito';
    document.getElementById('ventaMeses').value = v.meses || 12;
    document.getElementById('ventaFrecuencia').value = v.frecuenciaPago || 'mensual';
    document.getElementById('ventaProximaFecha').value = v.proximaFechaCobro || v.fecha;
    App.ventaEnEdicion = v;
    App.productosVentaTemp = JSON.parse(JSON.stringify(v.productos || []));
    document.getElementById('btnEliminarVenta').classList.remove('hidden');
  } else {
    document.getElementById('tituloModalVenta').textContent = 'Nueva Venta';
    document.getElementById('ventaId').value = '';
    document.getElementById('ventaCodigo').value = 'V' + String(DB.ventas.length + 1).padStart(3, '0');
    document.getElementById('ventaCodigo').disabled = false;
    document.getElementById('ventaFecha').value = hoyISO();
    document.getElementById('ventaCliente').value = '';
    document.getElementById('ventaPrima').value = 0;
    document.getElementById('ventaTipoPago').value = 'credito';
    document.getElementById('ventaMeses').value = 12;
    document.getElementById('ventaFrecuencia').value = 'mensual';
    document.getElementById('ventaProximaFecha').value = hoyISO();
    App.ventaEnEdicion = null;
    App.productosVentaTemp = [];
    document.getElementById('btnEliminarVenta').classList.add('hidden');
  }
  cambiarTipoPagoVenta();
  renderProductosVentaTemp();
  abrirModal('modalVenta');
}

function cambiarTipoPagoVenta() {
  const tipo = document.getElementById('ventaTipoPago').value;
  document.getElementById('contenedorCredito').classList.toggle('hidden', tipo === 'contado');
  recalcularVenta();
}

function cambiarFrecuenciaVenta() {
  const frec = document.getElementById('ventaFrecuencia').value;
  const input = document.getElementById('ventaProximaFecha');
  const hoy = new Date();
  if (frec === 'semanal') hoy.setDate(hoy.getDate() + 7);
  else if (frec === 'quincenal') hoy.setDate(hoy.getDate() + 15);
  else hoy.setMonth(hoy.getMonth() + 1);
  input.value = hoy.toISOString().split('T')[0];
  recalcularVenta();
}

function renderProductosVentaTemp() {
  const cont = document.getElementById('listaProductosVenta');
  if (!App.productosVentaTemp || App.productosVentaTemp.length === 0) {
    cont.innerHTML = '<p class="text-center text-slate-400 text-sm py-4">Sin productos. Usa "+ Del Stock" o "+ Manual".</p>';
    return;
  }
  cont.innerHTML = App.productosVentaTemp.map((p, i) => `
    <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-slate-500">${p.sourceType === 'stock' ? '📦 Del stock' : '✏️ Manual'}</span>
        <button onclick="quitarProductoVenta(${i})" class="text-rose-500 p-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
      </div>
      <input type="text" placeholder="Producto *" value="${p.nombre || ''}" ${p.sourceType === 'stock' ? 'readonly' : ''} oninput="actualizarProductoVenta(${i}, 'nombre', this.value)" class="inp text-sm">
      <div class="grid grid-cols-3 gap-2">
        <input type="number" placeholder="Cant" value="${p.cantidad || 1}" ${p.sourceType === 'stock' ? 'readonly' : ''} oninput="actualizarProductoVenta(${i}, 'cantidad', parseInt(this.value)||1)" class="inp text-sm">
        <input type="number" placeholder="Costo" value="${p.precioCompra || 0}" readonly class="inp text-sm bg-slate-100 dark:bg-slate-800">
        <input type="number" placeholder="Venta C$ *" value="${p.precioVenta || ''}" oninput="actualizarProductoVenta(${i}, 'precioVenta', parseFloat(this.value)||0); recalcularVenta();" class="inp text-sm bg-emerald-50 dark:bg-emerald-900/20">
      </div>
    </div>
  `).join('');
}

function agregarProductoVentaManual() {
  App.productosVentaTemp.push({ nombre: '', cantidad: 1, precioCompra: 0, precioVenta: 0, sourceType: 'manual', sourceId: null });
  renderProductosVentaTemp();
}
function actualizarProductoVenta(i, campo, valor) { App.productosVentaTemp[i][campo] = valor; }
function quitarProductoVenta(i) { App.productosVentaTemp.splice(i, 1); renderProductosVentaTemp(); recalcularVenta(); }

function abrirSelectorProductosVenta() {
  const stock = [];
  DB.compras.forEach(c => {
    const prov = DB.proveedores.find(p => p.id === c.proveedorId);
    (c.productos || []).forEach((p, idx) => {
      if (!p.vendido) {
        stock.push({
          ...p,
          compraId: c.id,
          proveedorNombre: prov ? prov.nombre : '',
          precioCompra: parseFloat(p.precioCompra) || 0,
          precioVentaSugerido: parseFloat(p.precioVenta) || 0,
          uniqueId: `${c.id}_${idx}`,
          sourceType: 'stock',
          sourceId: c.id,
          indexEnCompra: idx
        });
      }
    });
  });
  App.stockDisponible = stock;
  renderListaProductosStock(stock);
  abrirModal('modalSelectorProductos');
}

function renderListaProductosStock(lista) {
  const cont = document.getElementById('listaProductosStock');
  if (lista.length === 0) { cont.innerHTML = '<p class="text-center text-slate-500 py-8">Sin productos en stock</p>'; return; }
  cont.innerHTML = lista.map(p => `
    <div class="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onclick="seleccionarProductoStock('${p.uniqueId}')">
      <div class="min-w-0">
        <p class="font-semibold text-sm text-slate-800 dark:text-white truncate">${p.nombre}</p>
        <p class="text-xs text-slate-500">${p.compraId} · ${p.proveedorNombre}${p.serie ? ' · S/N: ' + p.serie : ''}</p>
      </div>
      <div class="text-right shrink-0">
        <p class="font-bold text-sm">${fmtC(p.precioVentaSugerido || p.precioCompra)}</p>
        <p class="text-xs text-slate-500">Costo: ${fmtC(p.precioCompra)}</p>
      </div>
    </div>`).join('');
}

function filtrarProductosStock() {
  const q = document.getElementById('buscarProductoStock').value.toLowerCase();
  renderListaProductosStock((App.stockDisponible || []).filter(p => (p.nombre || '').toLowerCase().includes(q) || (p.serie || '').toLowerCase().includes(q)));
}

function seleccionarProductoStock(uniqueId) {
  const p = App.stockDisponible.find(x => x.uniqueId === uniqueId);
  if (!p) return;
  App.productosVentaTemp.push({
    nombre: p.nombre,
    cantidad: p.cantidad || 1,
    precioCompra: p.precioCompra,
    precioVenta: p.precioVentaSugerido || 0,
    sourceType: 'stock',
    sourceId: p.sourceId,
    indexEnCompra: p.indexEnCompra,
    serie: p.serie,
    modelo: p.modelo
  });
  renderProductosVentaTemp();
  recalcularVenta();
  cerrarModales();
  toast('📦 Producto agregado');
}

function recalcularVenta() {
  const productos = App.productosVentaTemp || [];
  const total = productos.reduce((s, p) => s + ((parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1)), 0);
  const prima = parseFloat(document.getElementById('ventaPrima').value) || 0;
  const tipo = document.getElementById('ventaTipoPago').value;
  const meses = parseInt(document.getElementById('ventaMeses').value) || 12;
  const saldo = Math.max(0, total - prima);
  const cuota = tipo === 'credito' && meses > 0 ? saldo / meses : 0;

  document.getElementById('ventaTotal').textContent = fmtC(total);
  document.getElementById('ventaPrimaVer').textContent = fmtC(prima);
  document.getElementById('ventaSaldo').textContent = fmtC(tipo === 'contado' ? 0 : saldo);
  document.getElementById('ventaCuota').textContent = fmtC(cuota);
}

async function guardarVenta() {
  const id = document.getElementById('ventaCodigo').value.trim().toUpperCase();
  const fecha = document.getElementById('ventaFecha').value;
  const clienteId = document.getElementById('ventaCliente').value;
  const prima = parseFloat(document.getElementById('ventaPrima').value) || 0;
  const tipoPago = document.getElementById('ventaTipoPago').value;
  const meses = parseInt(document.getElementById('ventaMeses').value) || 12;
  const frecuencia = document.getElementById('ventaFrecuencia').value;
  const proximaFecha = document.getElementById('ventaProximaFecha').value;
  const productos = (App.productosVentaTemp || []).filter(p => p.nombre && (parseFloat(p.precioVenta) || 0) > 0);

  if (!id || !fecha || !clienteId) return toast('⚠️ Completa ID, fecha y cliente');
  if (productos.length === 0) return toast('⚠️ Agrega al menos un producto con precio');

  const cliente = DB.clientes.find(c => c.id === clienteId);
  if (!cliente) return toast('⚠️ Cliente no encontrado');

  const total = productos.reduce((s, p) => s + ((parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1)), 0);
  if (tipoPago === 'credito' && prima > total) return toast('⚠️ La prima no puede ser mayor al total');

  const saldo = tipoPago === 'contado' ? 0 : Math.max(0, total - prima);
  const cuota = tipoPago === 'credito' && meses > 0 ? saldo / meses : 0;
  const editando = !!App.ventaEnEdicion;

  if (!editando && DB.ventas.some(v => v.id === id)) return toast('⚠️ Ya existe una venta con ese ID');

  // Liberar productos de la venta anterior si editamos
  if (editando) await liberarProductosDeVenta(App.ventaEnEdicion);

  // Marcar productos como vendidos
  for (const p of productos) {
    if (p.sourceType === 'stock' && p.sourceId != null && p.indexEnCompra != null) {
      const compra = DB.compras.find(c => c.id === p.sourceId);
      if (compra && compra.productos[p.indexEnCompra]) {
        compra.productos[p.indexEnCompra].vendido = true;
        compra.lastModified = Date.now();
        await DB.guardarCompra(compra);
      }
    }
  }

  const venta = {
    id, clienteId, cliente: cliente.nombre, telefono: cliente.telefono,
    fecha, productos, precioTotal: total, prima, saldo,
    pagado: prima, meses, cuotaMensual: cuota,
    estado: saldo <= 0 ? 'PAGADO' : 'PENDIENTE',
    proximaFechaCobro: tipoPago === 'contado' ? fecha : proximaFecha,
    tipoPago, frecuenciaPago: frecuencia,
    fechasPersonalizadas: [],
    lastModified: Date.now()
  };

  await DB.guardarVenta(venta);
  const idx = DB.ventas.findIndex(v => v.id === id);
  if (idx >= 0) DB.ventas[idx] = venta; else DB.ventas.push(venta);

  // Registrar prima como cobro inicial (si aplica)
  if (prima > 0) {
    const cobrosPrevios = DB.cobros.filter(c => c.ventaId === id && c.origen === 'prima');
    for (const c of cobrosPrevios) { await DB.eliminarCobro(c.id); DB.cobros = DB.cobros.filter(x => x.id !== c.id); }
    const cobro = { id: 'cobro_' + generarId(), ventaId: id, fecha, monto: prima, metodo: 'Efectivo', notas: 'Prima', origen: 'prima', lastModified: Date.now() };
    await DB.guardarCobro(cobro);
    DB.cobros.push(cobro);
  }

  toast(editando ? '✅ Venta actualizada' : '✅ Venta registrada');
  cerrarModales();
  navegar('ventas');
}

async function liberarProductosDeVenta(venta) {
  for (const p of venta.productos || []) {
    if (p.sourceType === 'stock' && p.sourceId != null && p.indexEnCompra != null) {
      const compra = DB.compras.find(c => c.id === p.sourceId);
      if (compra && compra.productos[p.indexEnCompra]) {
        compra.productos[p.indexEnCompra].vendido = false;
        compra.lastModified = Date.now();
        await DB.guardarCompra(compra);
      }
    }
  }
}

async function eliminarVenta() {
  if (!App.ventaEnEdicion) return;
  if (!confirm(`¿Eliminar la venta ${App.ventaEnEdicion.id}? Se eliminarán también sus cobros.`)) return;
  const id = App.ventaEnEdicion.id;
  await liberarProductosDeVenta(App.ventaEnEdicion);
  for (const c of DB.cobros.filter(x => x.ventaId === id)) await DB.eliminarCobro(c.id);
  DB.cobros = DB.cobros.filter(c => c.ventaId !== id);
  await DB.eliminarVenta(id);
  DB.ventas = DB.ventas.filter(v => v.id !== id);
  toast('🗑️ Venta eliminada');
  cerrarModales();
  navegar('ventas');
}

function verDetalleVenta(id) {
  const v = DB.ventas.find(x => x.id === id);
  if (!v) return;
  const cobros = DB.cobros.filter(c => c.ventaId === id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const html = `
    <div class="space-y-3">
      <div class="flex justify-between items-start">
        <div><p class="text-xs text-slate-500">Cliente</p><p class="font-bold text-lg text-slate-800 dark:text-white">${v.cliente}</p><p class="text-xs text-slate-500">${v.id} · ${v.telefono || 'Sin teléfono'}</p></div>
        <span class="badge ${v.estado === 'PENDIENTE' ? 'badge-warning' : 'badge-success'}">${v.estado}</span>
      </div>
      <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 space-y-1">
        <div class="flex justify-between text-sm"><span>Total:</span><span class="font-bold">${fmtC(v.precioTotal)}</span></div>
        <div class="flex justify-between text-sm"><span>Pagado:</span><span class="font-bold text-emerald-600">${fmtC(v.pagado)}</span></div>
        <div class="flex justify-between text-sm border-t border-emerald-200 dark:border-emerald-800 pt-1"><span>Saldo:</span><span class="font-bold text-rose-600">${fmtC(v.saldo)}</span></div>
        ${v.tipoPago === 'credito' ? `
          <div class="flex justify-between text-sm"><span>Cuota:</span><span class="font-bold">${fmtC(v.cuotaMensual)}</span></div>
          <div class="flex justify-between text-sm"><span>Próximo cobro:</span><span class="font-bold">${fmtFecha(v.proximaFechaCobro)}</span></div>` : ''}
      </div>
      <div>
        <p class="font-bold text-sm mb-2">Productos (${v.productos.length})</p>
        <div class="space-y-2 max-h-40 overflow-y-auto">
          ${v.productos.map(p => `<div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3"><p class="font-medium text-sm">${p.nombre}</p><p class="text-xs text-slate-500">${p.cantidad} × ${fmtC(p.precioVenta)}${p.serie ? ' · S/N: ' + p.serie : ''}</p></div>`).join('')}
        </div>
      </div>
      ${cobros.length > 0 ? `
        <div><p class="font-bold text-sm mb-2">Cobros (${cobros.length})</p>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            ${cobros.map(c => `<div class="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 flex justify-between items-center"><div><p class="text-sm font-medium">${fmtFecha(c.fecha)}</p><p class="text-xs">${c.metodo}${c.notas ? ' · ' + c.notas : ''}</p></div><p class="font-bold text-brand-700">${fmtC(c.monto)}</p></div>`).join('')}
          </div>
        </div>` : ''}
      <div class="flex flex-wrap gap-2 pt-2">
        <button onclick="generarPDFVenta('${v.id}')" class="btn-ghost text-sm flex-1">📄 PDF</button>
        <button onclick="enviarWhatsAppVenta('${v.id}')" class="btn-ghost text-sm flex-1">💬 WhatsApp</button>
      </div>
      <div class="flex flex-wrap gap-2">
        ${v.estado === 'PENDIENTE' ? `<button onclick="abrirModalCobroPara('${v.id}')" class="btn-primary text-sm flex-1">💰 Cobrar</button>` : ''}
        <button onclick="abrirModalVenta('${v.id}')" class="btn-accent text-sm flex-1">✏️ Editar</button>
      </div>
      <button onclick="cerrarModales()" class="btn-ghost w-full text-sm">Cerrar</button>
    </div>
  `;
  abrirModalContenido('Detalle Venta', html);
}

/* ═══════════ CLIENTES ═══════════ */
function abrirModalCliente(id = null) {
  if (id) {
    const c = DB.clientes.find(x => x.id === id);
    if (!c) return;
    document.getElementById('tituloModalCliente').textContent = 'Editar Cliente';
    document.getElementById('clienteId').value = c.id;
    document.getElementById('clienteNombre').value = c.nombre;
    document.getElementById('clienteTelefono').value = c.telefono || '';
    document.getElementById('clienteNotas').value = c.notas || '';
    document.getElementById('btnEliminarCliente').classList.remove('hidden');
    App.clienteEnEdicion = c;
  } else {
    document.getElementById('tituloModalCliente').textContent = 'Nuevo Cliente';
    document.getElementById('clienteId').value = '';
    document.getElementById('clienteNombre').value = '';
    document.getElementById('clienteTelefono').value = '';
    document.getElementById('clienteNotas').value = '';
    document.getElementById('btnEliminarCliente').classList.add('hidden');
    App.clienteEnEdicion = null;
  }
  abrirModal('modalCliente');
}

function abrirModalClienteRapido() {
  abrirModalCliente();
}

async function guardarCliente() {
  const nombre = document.getElementById('clienteNombre').value.trim();
  if (!nombre) return toast('⚠️ Ingresa el nombre');
  const cliente = {
    id: document.getElementById('clienteId').value || 'cli_' + generarId(),
    nombre,
    telefono: document.getElementById('clienteTelefono').value.trim(),
    notas: document.getElementById('clienteNotas').value.trim(),
    lastModified: Date.now()
  };
  await DB.guardarCliente(cliente);
  const idx = DB.clientes.findIndex(c => c.id === cliente.id);
  if (idx >= 0) DB.clientes[idx] = cliente; else DB.clientes.push(cliente);

  // Si venimos del modal de venta, autoseleccionar
  const ventaCliente = document.getElementById('ventaCliente');
  if (ventaCliente) {
    ventaCliente.innerHTML = '<option value="">Seleccione...</option>' + DB.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    ventaCliente.value = cliente.id;
  }

  toast('✅ Cliente guardado');
  cerrarModales();
  // Si estábamos en el modal de venta, reabrirlo
  if (!document.getElementById('modalVenta').classList.contains('hidden')) return;
  if (App.seccionActual === 'ventas') navegar('ventas', 'clientes');
}

async function eliminarCliente() {
  if (!App.clienteEnEdicion) return;
  const ventas = DB.ventas.filter(v => v.clienteId === App.clienteEnEdicion.id);
  if (ventas.length > 0) return toast(`⚠️ No se puede eliminar: tiene ${ventas.length} ventas`);
  if (!confirm(`¿Eliminar al cliente "${App.clienteEnEdicion.nombre}"?`)) return;
  await DB.eliminarCliente(App.clienteEnEdicion.id);
  DB.clientes = DB.clientes.filter(c => c.id !== App.clienteEnEdicion.id);
  toast('🗑️ Cliente eliminado');
  cerrarModales();
  navegar('ventas', 'clientes');
}

/* ═══════════ COBROS ═══════════ */
function abrirModalCobro() {
  document.getElementById('tituloModalCobro').textContent = 'Registrar Cobro';
  document.getElementById('cobroId').value = '';
  document.getElementById('cobroBusqueda').value = '';
  document.getElementById('cobroVentaId').value = '';
  document.getElementById('cobroFecha').value = hoyISO();
  document.getElementById('cobroMonto').value = '';
  document.getElementById('cobroMetodo').value = 'Efectivo';
  document.getElementById('cobroNotas').value = '';
  document.getElementById('resultadosCobro').classList.add('hidden');
  document.getElementById('infoVentaCobro').classList.add('hidden');
  abrirModal('modalCobro');
}

function abrirModalCobroPara(ventaId) {
  cerrarModales();
  setTimeout(() => {
    abrirModalCobro();
    seleccionarVentaParaCobro(ventaId);
  }, 200);
}

function buscarVentaParaCobro() {
  const q = document.getElementById('cobroBusqueda').value.trim().toUpperCase();
  const cont = document.getElementById('resultadosCobro');
  if (q.length < 2) { cont.classList.add('hidden'); return; }
  const res = DB.ventas.filter(v => v.estado === 'PENDIENTE' &&
    (v.id.toUpperCase().includes(q) || v.cliente.toUpperCase().includes(q)));
  if (res.length === 0) {
    cont.innerHTML = '<p class="text-center text-sm text-slate-500 py-2">Sin resultados</p>';
  } else {
    cont.innerHTML = res.map(v => `
      <div onclick="seleccionarVentaParaCobro('${v.id}')" class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-900/20">
        <p class="font-semibold text-sm">${v.cliente}</p>
        <div class="flex justify-between text-xs text-slate-500"><span>${v.id}</span><span>Saldo: ${fmtC(v.saldo)}</span></div>
      </div>`).join('');
  }
  cont.classList.remove('hidden');
}

function seleccionarVentaParaCobro(ventaId) {
  const v = DB.ventas.find(x => x.id === ventaId);
  if (!v) return;
  document.getElementById('cobroVentaId').value = v.id;
  document.getElementById('resultadosCobro').classList.add('hidden');
  document.getElementById('cobroBusqueda').value = v.cliente + ' (' + v.id + ')';
  document.getElementById('infoVentaCobro').innerHTML = `
    <div class="space-y-1 text-sm">
      <div class="flex justify-between"><span class="text-slate-600 dark:text-slate-400">Cliente:</span><span class="font-bold">${v.cliente}</span></div>
      <div class="flex justify-between"><span class="text-slate-600 dark:text-slate-400">Total:</span><span>${fmtC(v.precioTotal)}</span></div>
      <div class="flex justify-between"><span class="text-slate-600 dark:text-slate-400">Pagado:</span><span class="text-emerald-600">${fmtC(v.pagado)}</span></div>
      <div class="flex justify-between border-t border-emerald-200 dark:border-emerald-800 pt-1"><span class="font-semibold">Saldo:</span><span class="font-bold text-rose-600">${fmtC(v.saldo)}</span></div>
      <div class="flex justify-between"><span class="text-slate-600 dark:text-slate-400">Cuota:</span><span>${fmtC(v.cuotaMensual)}</span></div>
    </div>`;
  document.getElementById('infoVentaCobro').classList.remove('hidden');
  document.getElementById('cobroMonto').value = (parseFloat(v.cuotaMensual) || 0).toFixed(2);
}

async function guardarCobro() {
  const ventaId = document.getElementById('cobroVentaId').value;
  const fecha = document.getElementById('cobroFecha').value;
  const monto = parseFloat(document.getElementById('cobroMonto').value) || 0;
  const metodo = document.getElementById('cobroMetodo').value;
  const notas = document.getElementById('cobroNotas').value.trim();

  if (!ventaId) return toast('⚠️ Selecciona una venta');
  if (monto <= 0) return toast('⚠️ Ingresa un monto');
  if (!fecha) return toast('⚠️ Selecciona la fecha');

  const v = DB.ventas.find(x => x.id === ventaId);
  if (!v) return;
  if (monto > (parseFloat(v.saldo) || 0) + 0.01) return toast(`⚠️ El monto supera el saldo (${fmtC(v.saldo)})`);

  const cobro = { id: 'cobro_' + generarId(), ventaId, fecha, monto, metodo, notas, lastModified: Date.now() };
  await DB.guardarCobro(cobro);
  DB.cobros.push(cobro);

  v.pagado = (parseFloat(v.pagado) || 0) + monto;
  v.saldo = Math.max(0, (parseFloat(v.precioTotal) || 0) - v.pagado);
  v.estado = v.saldo <= 0 ? 'PAGADO' : 'PENDIENTE';
  if (v.estado === 'PENDIENTE' && v.tipoPago === 'credito') {
    const frec = v.frecuenciaPago || 'mensual';
    const next = new Date(fecha);
    if (frec === 'semanal') next.setDate(next.getDate() + 7);
    else if (frec === 'quincenal') next.setDate(next.getDate() + 15);
    else next.setMonth(next.getMonth() + 1);
    v.proximaFechaCobro = next.toISOString().split('T')[0];
  }
  v.lastModified = Date.now();
  await DB.guardarVenta(v);

  toast('✅ Cobro registrado');
  cerrarModales();
  if (App.seccionActual === 'ventas') navegar('ventas');
  else if (App.seccionActual === 'dashboard') navegar('dashboard');
}

/* ═══════════ FINANZAS ═══════════ */
function renderFinanzas(el) {
  const totalDeuda = DB.compras.reduce((s, c) => s + (parseFloat(c.saldo) || 0), 0);
  const totalPagado = DB.pagosProveedor.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const totalCobrado = DB.cobros.reduce((s, c) => s + (parseFloat(c.monto) || 0), 0);

  const movimientos = [
    ...DB.pagosProveedor.map(p => ({ tipo: 'pago', fecha: p.fecha, monto: p.monto, desc: DB.proveedores.find(x => x.id === p.proveedorId)?.nombre || '', metodo: p.metodo })),
    ...DB.cobros.map(c => ({ tipo: 'cobro', fecha: c.fecha, monto: c.monto, desc: DB.ventas.find(x => x.id === c.ventaId)?.cliente || '', metodo: c.metodo }))
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 30);

  el.innerHTML = `
    <div class="anim-in space-y-4">
      <h2 class="text-xl font-extrabold text-slate-800 dark:text-white">Finanzas</h2>

      <div class="grid grid-cols-3 gap-3">
        <div class="kpi text-center"><p class="text-xs text-slate-500">Por pagar</p><p class="text-base font-extrabold text-rose-600">${fmtC(totalDeuda)}</p></div>
        <div class="kpi text-center"><p class="text-xs text-slate-500">Pagado</p><p class="text-base font-extrabold text-emerald-600">${fmtC(totalPagado)}</p></div>
        <div class="kpi text-center"><p class="text-xs text-slate-500">Cobrado</p><p class="text-base font-extrabold text-brand-600">${fmtC(totalCobrado)}</p></div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button onclick="abrirModalPago()" class="btn-accent text-sm">💸 Pagar Proveedor</button>
        <button onclick="abrirModalCobro()" class="btn-primary text-sm">💰 Cobrar Cliente</button>
      </div>

      <div>
        <h3 class="font-bold text-sm mb-3 text-slate-700 dark:text-slate-300">Movimientos recientes</h3>
        ${movimientos.length === 0 ? '<div class="card text-center py-8"><p class="text-slate-500 text-sm">Sin movimientos</p></div>' : `
          <div class="space-y-2">
            ${movimientos.map(m => `
              <div class="card flex justify-between items-center py-3">
                <div class="min-w-0">
                  <p class="font-semibold text-sm text-slate-800 dark:text-white truncate">${m.desc}</p>
                  <p class="text-xs text-slate-500">${fmtFecha(m.fecha)} · ${m.metodo}</p>
                </div>
                <p class="font-bold ${m.tipo === 'pago' ? 'text-rose-600' : 'text-emerald-600'}">${m.tipo === 'pago' ? '-' : '+'}${fmtC(m.monto)}</p>
              </div>`).join('')}
          </div>`}
      </div>
    </div>
  `;
}

/* ═══════════ MÁS ═══════════ */
function renderMas(el) {
  el.innerHTML = `
    <div class="anim-in space-y-4">
      <h2 class="text-xl font-extrabold text-slate-800 dark:text-white">Más</h2>
      <div class="card">
        <h3 class="font-bold text-slate-800 dark:text-white mb-3">Proveedores</h3>
        <button onclick="abrirModalProveedor()" class="btn-primary w-full mb-3 text-sm">+ Nuevo Proveedor</button>
        ${DB.proveedores.length === 0 ? '<p class="text-center text-sm text-slate-500 py-4">Sin proveedores</p>' : `
          <div class="space-y-2">
            ${DB.proveedores.map(p => {
              const deuda = DB.compras.filter(c => c.proveedorId === p.id).reduce((s, c) => s + (parseFloat(c.saldo) || 0), 0);
              return `<div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer" onclick="abrirModalProveedor('${p.id}')">
                <div class="min-w-0"><p class="font-semibold text-sm truncate">${p.nombre}</p><p class="text-xs text-slate-500">${p.telefono || 'Sin teléfono'} · ${p.tipo}</p></div>
                <div class="text-right"><p class="text-xs text-slate-500">Deuda</p><p class="font-bold text-sm ${deuda > 0 ? 'text-rose-600' : 'text-emerald-600'}">${fmtC(deuda)}</p></div>
              </div>`;
            }).join('')}
          </div>`}
      </div>
      <div class="card">
        <h3 class="font-bold text-slate-800 dark:text-white mb-3">Backup y datos</h3>
        <button onclick="abrirMenuBackup()" class="btn-ghost w-full text-sm">Abrir opciones de backup</button>
      </div>
      <div class="card">
        <h3 class="font-bold text-slate-800 dark:text-white mb-3">Información</h3>
        <div class="space-y-1 text-xs text-slate-500">
          <p>Versión: 2.0 (Fase 2)</p>
          <p>${DB.proveedores.length} proveedores · ${DB.compras.length} compras · ${DB.ventas.length} ventas</p>
          <p>${DB.clientes.length} clientes · ${DB.cobros.length} cobros · ${DB.pagosProveedor.length} pagos</p>
        </div>
      </div>
    </div>`;
}

function abrirModalProveedor(id = null) {
  if (id) {
    const p = DB.proveedores.find(x => x.id === id);
    if (!p) return;
    document.getElementById('tituloModalProveedor').textContent = 'Editar Proveedor';
    document.getElementById('provId').value = p.id;
    document.getElementById('provNombre').value = p.nombre;
    document.getElementById('provTelefono').value = p.telefono || '';
    document.getElementById('provTipo').value = p.tipo || 'credito';
    document.getElementById('provNotas').value = p.notas || '';
    document.getElementById('btnEliminarProv').classList.remove('hidden');
    App.proveedorEnEdicion = p;
  } else {
    document.getElementById('tituloModalProveedor').textContent = 'Nuevo Proveedor';
    document.getElementById('provId').value = '';
    document.getElementById('provNombre').value = '';
    document.getElementById('provTelefono').value = '';
    document.getElementById('provTipo').value = 'credito';
    document.getElementById('provNotas').value = '';
    document.getElementById('btnEliminarProv').classList.add('hidden');
    App.proveedorEnEdicion = null;
  }
  abrirModal('modalProveedor');
}

async function guardarProveedor() {
  const nombre = document.getElementById('provNombre').value.trim();
  if (!nombre) return toast('⚠️ Ingresa el nombre');
  const proveedor = {
    id: document.getElementById('provId').value || 'prov_' + generarId(),
    nombre, telefono: document.getElementById('provTelefono').value.trim(),
    tipo: document.getElementById('provTipo').value,
    notas: document.getElementById('provNotas').value.trim(),
    lastModified: Date.now()
  };
  await DB.guardarProveedor(proveedor);
  const idx = DB.proveedores.findIndex(p => p.id === proveedor.id);
  if (idx >= 0) DB.proveedores[idx] = proveedor; else DB.proveedores.push(proveedor);
  toast('✅ Proveedor guardado');
  cerrarModales();
  if (App.seccionActual === 'mas') navegar('mas');
}

async function eliminarProveedor() {
  if (!App.proveedorEnEdicion) return;
  const compras = DB.compras.filter(c => c.proveedorId === App.proveedorEnEdicion.id);
  if (compras.length > 0) return toast(`⚠️ Tiene ${compras.length} compras asociadas`);
  if (!confirm(`¿Eliminar a "${App.proveedorEnEdicion.nombre}"?`)) return;
  await DB.eliminarProveedor(App.proveedorEnEdicion.id);
  DB.proveedores = DB.proveedores.filter(p => p.id !== App.proveedorEnEdicion.id);
  toast('🗑️ Proveedor eliminado');
  cerrarModales();
  navegar('mas');
}

/* ═══════════ PAGOS A PROVEEDOR ═══════════ */
function abrirModalPago() {
  document.getElementById('tituloModalPago').textContent = 'Pago a Proveedor';
  document.getElementById('pagoId').value = '';
  const sel = document.getElementById('pagoProveedor');
  sel.innerHTML = '<option value="">Seleccione...</option>' + DB.proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  document.getElementById('pagoCompra').innerHTML = '<option value="">Seleccione proveedor primero...</option>';
  document.getElementById('pagoFecha').value = hoyISO();
  document.getElementById('pagoMonto').value = '';
  document.getElementById('pagoMetodo').value = 'Efectivo';
  document.getElementById('pagoNotas').value = '';
  abrirModal('modalPagoProveedor');
}

function abrirModalPagoPara(provId) {
  abrirModalPago();
  setTimeout(() => {
    document.getElementById('pagoProveedor').value = provId;
    cargarComprasDelProveedor();
  }, 100);
}

function cargarComprasDelProveedor() {
  const provId = document.getElementById('pagoProveedor').value;
  const sel = document.getElementById('pagoCompra');
  const compras = DB.compras.filter(c => c.proveedorId === provId && (parseFloat(c.saldo) || 0) > 0);
  if (compras.length === 0) { sel.innerHTML = '<option value="">Sin compras pendientes</option>'; return; }
  sel.innerHTML = '<option value="">Aplicar a saldo general</option>' + compras.map(c => `<option value="${c.id}">${c.id} - ${fmtC(c.saldo)}</option>`).join('');
}

async function guardarPagoProveedor() {
  const proveedorId = document.getElementById('pagoProveedor').value;
  const compraId = document.getElementById('pagoCompra').value || null;
  const fecha = document.getElementById('pagoFecha').value;
  const monto = parseFloat(document.getElementById('pagoMonto').value) || 0;
  const metodo = document.getElementById('pagoMetodo').value;
  const notas = document.getElementById('pagoNotas').value.trim();

  if (!proveedorId) return toast('⚠️ Selecciona proveedor');
  if (monto <= 0) return toast('⚠️ Ingresa monto');
  if (!fecha) return toast('⚠️ Selecciona fecha');

  const pago = { id: 'pago_' + generarId(), proveedorId, compraId, fecha, monto, metodo, notas, lastModified: Date.now() };
  await DB.guardarPago(pago);
  DB.pagosProveedor.push(pago);

  if (compraId) {
    await aplicarPagoACompra(compraId, monto);
  } else {
    let restante = monto;
    const pendientes = DB.compras.filter(c => c.proveedorId === proveedorId && (parseFloat(c.saldo) || 0) > 0).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    for (const c of pendientes) {
      if (restante <= 0) break;
      const aplicar = Math.min(restante, parseFloat(c.saldo) || 0);
      await aplicarPagoACompra(c.id, aplicar);
      restante -= aplicar;
    }
  }

  toast('✅ Pago registrado');
  cerrarModales();
  if (App.seccionActual === 'finanzas') navegar('finanzas');
  else if (App.seccionActual === 'compras') navegar('compras');
}

async function aplicarPagoACompra(compraId, monto) {
  const c = DB.compras.find(x => x.id === compraId);
  if (!c) return;
  c.pagado = (parseFloat(c.pagado) || 0) + monto;
  c.saldo = Math.max(0, (parseFloat(c.total) || 0) - c.pagado);
  c.estado = c.saldo <= 0 ? 'PAGADO' : 'PENDIENTE';
  c.lastModified = Date.now();
  await DB.guardarCompra(c);
}

/* ═══════════ ESCÁNER ═══════════ */
function escanearParaProducto(contexto, index, campo) {
  App.productoEscanerDestino = { contexto, index, campo };
  abrirEscaner();
}

function abrirEscaner() {
  abrirModal('modalEscaner');
  setTimeout(() => {
    if (App.scannerActivo) return;
    const scanner = new Html5Qrcode("lectorQR");
    App.scannerActivo = scanner;
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (texto) => {
        document.getElementById('resultadoEscaner').textContent = '✅ ' + texto;
        if (App.productoEscanerDestino) {
          const { contexto, index, campo } = App.productoEscanerDestino;
          if (contexto === 'compra') {
            App.productosCompraTemp[index][campo] = texto;
            renderProductosCompraTemp();
          } else if (contexto === 'venta') {
            App.productosVentaTemp[index][campo] = texto;
            renderProductosVentaTemp();
          }
          toast('✅ Código capturado');
        }
        cerrarEscaner();
      },
      () => {}
    ).catch(e => {
      console.error('Error scanner:', e);
      toast('❌ No se pudo abrir la cámara');
      cerrarEscaner();
    });
  }, 300);
}

function cerrarEscaner() {
  if (App.scannerActivo) {
    App.scannerActivo.stop().then(() => {
      App.scannerActivo.clear();
      App.scannerActivo = null;
    }).catch(() => { App.scannerActivo = null; });
  }
  App.productoEscanerDestino = null;
  cerrarModales();
}

/* ═══════════ PDF ═══════════ */
function generarPDFVenta(ventaId) {
  const v = DB.ventas.find(x => x.id === ventaId);
  if (!v) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18); doc.setTextColor(79,70,229);
  doc.text('VARIEDADES KAREN', 105, 20, null, null, 'center');
  doc.setFontSize(10); doc.setTextColor(0);
  doc.text('Recibo de Venta', 105, 28, null, null, 'center');
  doc.setFontSize(12);
  let y = 45;
  doc.text(`ID: ${v.id}`, 20, y); y += 8;
  doc.text(`Cliente: ${v.cliente}`, 20, y); y += 8;
  doc.text(`Fecha: ${fmtFecha(v.fecha)}`, 20, y); y += 8;
  if (v.telefono) { doc.text(`Teléfono: ${v.telefono}`, 20, y); y += 8; }
  y += 4; doc.text('PRODUCTOS:', 20, y); y += 8;
  v.productos.forEach((p, i) => {
    const sub = (parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1);
    doc.text(`${i+1}. ${p.nombre} x${p.cantidad} - C$${sub.toLocaleString()}`, 25, y);
    if (p.serie) { y += 6; doc.text(`   S/N: ${p.serie}${p.modelo ? ' · Mod: ' + p.modelo : ''}`, 25, y); }
    y += 8;
  });
  y += 4; doc.line(20, y, 190, y); y += 8;
  doc.text(`Tipo: ${v.tipoPago === 'contado' ? 'Contado' : 'Crédito'}`, 20, y); y += 8;
  doc.text(`Total: C$${(v.precioTotal).toLocaleString()}`, 20, y);
  if (v.tipoPago === 'credito') {
    y += 8; doc.text(`Prima: C$${(v.prima).toLocaleString()}`, 20, y);
    y += 8; doc.text(`Saldo: C$${(v.saldo).toLocaleString()}`, 20, y);
    y += 8; doc.text(`Cuota: C$${(v.cuotaMensual).toLocaleString()}`, 20, y);
    y += 8; doc.text(`Próximo cobro: ${fmtFecha(v.proximaFechaCobro)}`, 20, y);
  }
  y += 15; doc.setFontSize(10); doc.setTextColor(79,70,229);
  doc.text('¡Gracias por su compra!', 105, y, null, null, 'center');
  doc.save(`Venta_${v.id}_${v.cliente.replace(/\s+/g, '_')}.pdf`);
  toast('📄 PDF generado');
}

function enviarWhatsAppVenta(ventaId) {
  const v = DB.ventas.find(x => x.id === ventaId);
  if (!v) return;
  let msg = `🦋 *VARIEDADES KAREN* 🦋\n\n📋 *Recibo de Venta*\n\n`;
  msg += `*ID:* ${v.id}\n*Cliente:* ${v.cliente}\n*Fecha:* ${fmtFecha(v.fecha)}\n\n`;
  msg += `*PRODUCTOS:*\n`;
  v.productos.forEach((p, i) => {
    msg += `${i+1}. ${p.nombre} x${p.cantidad} - C$${((parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1)).toLocaleString()}\n`;
  });
  msg += `\n*TOTAL:* C$${(v.precioTotal).toLocaleString()}\n`;
  msg += `*Tipo:* ${v.tipoPago === 'contado' ? 'Contado' : 'Crédito'}\n`;
  if (v.tipoPago === 'credito') {
    msg += `*Prima:* C$${(v.prima).toLocaleString()}\n*Saldo:* C$${(v.saldo).toLocaleString()}\n*Cuota:* C$${(v.cuotaMensual).toLocaleString()}\n`;
    msg += `*Próximo cobro:* ${fmtFecha(v.proximaFechaCobro)}\n`;
  }
  msg += `\n🌹 ¡Gracias por su compra! 🌹`;
  const tel = (v.telefono || '').replace(/[^0-9]/g, '');
  const url = tel ? `https://wa.me/505${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

/* ═══════════ MODALES GENÉRICOS ═══════════ */
function abrirModal(id) {
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
  const card = document.querySelector(`#${id} > div`);
  if (card) card.classList.add('slide-up');
}
function cerrarModales() {
  if (App.scannerActivo) { try { App.scannerActivo.stop(); App.scannerActivo.clear(); } catch(e){} App.scannerActivo = null; }
  document.getElementById('modalOverlay').classList.add('hidden');
  ['modalProveedor','modalCompra','modalPagoProveedor','modalVenta','modalCliente','modalCobro','modalSelectorProductos','modalEscaner','modalBackup','modalContenido'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}
function abrirModalContenido(titulo, html) {
  let modal = document.getElementById('modalContenido');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalContenido';
    modal.className = 'hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between z-10">
          <h3 id="tituloModalContenido" class="text-lg font-bold text-slate-800 dark:text-white"></h3>
          <button onclick="cerrarModales()" class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div id="cuerpoModalContenido" class="p-4"></div>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('tituloModalContenido').textContent = titulo;
  document.getElementById('cuerpoModalContenido').innerHTML = html;
  abrirModal('modalContenido');
}

/* ═══════════ BACKUP ═══════════ */
function abrirMenuBackup() { abrirModal('modalBackup'); }

function exportarBackup() {
  const datos = {
    version: 2, exportadoEn: new Date().toISOString(), app: 'Variedades Karen',
    proveedores: DB.proveedores, compras: DB.compras, ventas: DB.ventas,
    clientes: DB.clientes, pagosProveedor: DB.pagosProveedor, cobros: DB.cobros
  };
  const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `variedades-karen-backup-${fecha}.json`; a.click();
  URL.revokeObjectURL(url);
  toast('✅ Backup exportado');
  cerrarModales();
}

async function importarBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const datos = JSON.parse(e.target.result);
      const migrado = migrarBackup(datos);
      if (!confirm(`¿Reemplazar TODOS los datos?\n\nBackup: ${datos.app || 'desconocido'}\nVersión: ${datos.version || 1}`)) return;
      const backup = { proveedores: DB.proveedores, compras: DB.compras, ventas: DB.ventas, clientes: DB.clientes, pagosProveedor: DB.pagosProveedor, cobros: DB.cobros };
      localStorage.setItem('backup_pre_import', JSON.stringify(backup));
      await DB.vaciarTodo();
      await guardarMultiples('proveedores', migrado.proveedores || []);
      await guardarMultiples('compras', migrado.compras || []);
      await guardarMultiples('ventas', migrado.ventas || []);
      await guardarMultiples('clientes', migrado.clientes || []);
      await guardarMultiples('pagosProveedor', migrado.pagosProveedor || []);
      await guardarMultiples('cobros', migrado.cobros || []);
      await DB.cargarTodo();
      toast('✅ Datos importados');
      cerrarModales();
      navegar('dashboard');
    } catch (err) { console.error(err); toast('❌ Error: ' + err.message); }
    event.target.value = '';
  };
  reader.readAsText(file);
}

async function borrarTodosLosDatos() {
  if (!confirm('⚠️ ¿Borrar TODOS los datos?')) return;
  if (!confirm('¿Estás TOTALMENTE seguro?')) return;
  await DB.vaciarTodo();
  await DB.cargarTodo();
  toast('🗑️ Datos borrados');
  cerrarModales();
  navegar('dashboard');
}

/* ═══════════ TOAST ═══════════ */
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.remove('opacity-0');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('opacity-0'), 3000);
}