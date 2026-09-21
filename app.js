/* ═══════════════════════════════════════════════════════════
   app.js — Variedades Karen · Sistema de Gestión Empresarial
   ═══════════════════════════════════════════════════════════ */

// ─── Estado de la app ───
const App = {
  seccionActual: 'dashboard',
  compraEnEdicion: null,
  proveedorEnEdicion: null
};

// ─── Formato de números y fechas ───
const fmtC = (n) => 'C$' + (parseFloat(n) || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => (parseFloat(n) || 0).toLocaleString('es-NI');
const fmtFecha = (f) => {
  if (!f) return 'N/A';
  const s = f.includes('T') ? f.split('T')[0] : f;
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};
const hoyISO = () => new Date().toISOString().split('T')[0];

/* ═══════════ INICIALIZACIÓN ═══════════ */
window.addEventListener('DOMContentLoaded', async () => {
  cargarTema();
  try {
    // Intentar migrar desde localStorage si hay datos viejos
    const migro = await migrarDesdeLocalStorage();
    if (migro) {
      console.log('✅ Datos migrados del esquema v1 al v2');
      setTimeout(() => toast('✅ Datos migrados correctamente'), 800);
    }
    await DB.cargarTodo();
    actualizarHeader();
    navegar('dashboard');
  } catch (e) {
    console.error('Error init:', e);
    toast('❌ Error al cargar datos');
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(e => console.log('SW:', e));
  }
});

function actualizarHeader() {
  const sub = document.getElementById('headerSubtitle');
  if (sub) {
    sub.textContent = `${DB.proveedores.length} proveedores · ${DB.compras.length} compras · ${DB.ventas.length} ventas`;
  }
}

/* ═══════════ TEMA ═══════════ */
function cargarTema() {
  const t = localStorage.getItem('tema') || 'light';
  if (t === 'dark') document.documentElement.classList.add('dark');
  actualizarIconoTema(t === 'dark');
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
function navegar(seccion) {
  App.seccionActual = seccion;
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.nav === seccion);
  });
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
    .map(v => ({ ...v, dias: Math.ceil((new Date(v.proximaFechaCobro) - hoy) / 86400000) }))
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
        <div class="kpi text-center">
          <p class="text-2xl font-extrabold text-slate-800 dark:text-white">${DB.compras.length}</p>
          <p class="text-xs text-slate-500 mt-1">Compras</p>
        </div>
        <div class="kpi text-center">
          <p class="text-2xl font-extrabold text-slate-800 dark:text-white">${DB.ventas.filter(v => v.estado === 'PENDIENTE').length}</p>
          <p class="text-xs text-slate-500 mt-1">Ventas activas</p>
        </div>
        <div class="kpi text-center">
          <p class="text-2xl font-extrabold text-slate-800 dark:text-white">${DB.proveedores.length}</p>
          <p class="text-xs text-slate-500 mt-1">Proveedores</p>
        </div>
      </div>

      <div>
        <h2 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 px-1">⚡ Acciones rápidas</h2>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="abrirModalCompra()" class="p-4 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-left shadow-lg hover:shadow-xl transition-all">
            <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <p class="font-bold text-sm">Nueva Compra</p>
          </button>
          <button onclick="toast('Módulo de Ventas en Fase 2')" class="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-left shadow-lg hover:shadow-xl transition-all">
            <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <p class="font-bold text-sm">Nueva Venta</p>
          </button>
          <button onclick="abrirModalPago()" class="p-4 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 text-white text-left shadow-lg hover:shadow-xl transition-all">
            <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            <p class="font-bold text-sm">Pagar Proveedor</p>
          </button>
          <button onclick="navegar('mas')" class="p-4 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 text-white text-left shadow-lg hover:shadow-xl transition-all">
            <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            <p class="font-bold text-sm">Reportes</p>
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
                <div class="p-3 rounded-xl border ${cls} flex justify-between items-center">
                  <div class="min-w-0">
                    <p class="font-semibold text-sm text-slate-800 dark:text-white truncate">${v.cliente || 'Cliente'}</p>
                    <p class="text-xs text-slate-500">Cuota: ${fmtC(v.cuotaMensual)}</p>
                  </div>
                  <span class="badge ${v.dias < 0 ? 'badge-danger' : v.dias === 0 ? 'badge-warning' : 'badge-info'}">${txt}</span>
                </div>`;
            }).join('')}
          </div>
        </div>` : ''}
    </div>
  `;
}

function kpiCard(titulo, valor, color, iconPath) {
  const colors = {
    rose: 'from-rose-500 to-rose-700',
    amber: 'from-amber-500 to-amber-700',
    brand: 'from-brand-500 to-brand-700',
    emerald: 'from-emerald-500 to-emerald-700'
  };
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
  const proveedoresOpts = DB.proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

  const comprasOrdenadas = [...DB.compras].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  el.innerHTML = `
    <div class="anim-in space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-xl font-extrabold text-slate-800 dark:text-white">Compras</h2>
        <button onclick="abrirModalCompra()" class="btn-primary text-sm">+ Nueva Compra</button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="kpi">
          <p class="text-xs text-slate-500 font-medium">Total comprado</p>
          <p class="text-lg font-extrabold text-slate-800 dark:text-white">${fmtC(DB.compras.reduce((s, c) => s + (parseFloat(c.total) || 0), 0))}</p>
        </div>
        <div class="kpi">
          <p class="text-xs text-slate-500 font-medium">Saldo por pagar</p>
          <p class="text-lg font-extrabold text-rose-600 dark:text-rose-400">${fmtC(DB.compras.reduce((s, c) => s + (parseFloat(c.saldo) || 0), 0))}</p>
        </div>
      </div>

      ${comprasOrdenadas.length === 0 ? `
        <div class="card text-center py-12">
          <p class="text-4xl mb-2">📦</p>
          <p class="text-slate-500 text-sm">No hay compras registradas</p>
        </div>
      ` : `
        <div class="space-y-3">
          ${comprasOrdenadas.map(c => {
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
        </div>
      `}
    </div>
  `;
}

function abrirModalCompra(compraId = null) {
  const sel = document.getElementById('compraProveedor');
  sel.innerHTML = '<option value="">Seleccione...</option>' +
    DB.proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

  if (compraId) {
    const c = DB.compras.find(x => x.id === compraId);
    if (c) {
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
    }
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
        <button onclick="quitarProductoCompra(${i})" class="text-rose-500 p-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
      <input type="text" placeholder="Nombre del producto *" value="${p.nombre || ''}" oninput="actualizarProductoCompra(${i}, 'nombre', this.value)" class="inp text-sm">
      <div class="grid grid-cols-2 gap-2">
        <input type="text" placeholder="Serie" value="${p.serie || ''}" oninput="actualizarProductoCompra(${i}, 'serie', this.value)" class="inp text-sm">
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
  if (!App.productosCompraTemp) App.productosCompraTemp = [];
  App.productosCompraTemp.push({ nombre: '', cantidad: 1, precioCompra: 0, precioVenta: 0, serie: '', modelo: '', foto: null, vendido: false });
  renderProductosCompraTemp();
}

function actualizarProductoCompra(i, campo, valor) {
  App.productosCompraTemp[i][campo] = valor;
  recalcularCompra();
}

function quitarProductoCompra(i) {
  App.productosCompraTemp.splice(i, 1);
  renderProductosCompraTemp();
  recalcularCompra();
}

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
  if (productos.length === 0) return toast('⚠️ Agrega al menos un producto válido');

  const total = productos.reduce((s, p) => s + ((parseFloat(p.precioCompra) || 0) * (parseInt(p.cantidad) || 1)), 0);
  const pagoInicial = tipoPago === 'contado' ? total : (parseFloat(document.getElementById('compraPagoInicial').value) || 0);
  const saldo = Math.max(0, total - pagoInicial);
  const editando = !!App.compraEnEdicion;

  if (!editando && DB.compras.some(c => c.id === id)) return toast('⚠️ Ya existe una compra con ese ID');

  const compra = {
    id,
    proveedorId,
    fecha,
    tipoPago,
    productos,
    total,
    pagado: pagoInicial,
    saldo,
    estado: saldo <= 0 ? 'PAGADO' : 'PENDIENTE',
    lastModified: Date.now()
  };

  // Si es pago inicial en crédito, registrar como pago
  if (editando && App.compraEnEdicion.tipoPago === 'credito') {
    // Revertir el pago inicial anterior
    const pagosAntiguos = DB.pagosProveedor.filter(p => p.compraId === id && p.origen === 'pago_inicial');
    for (const p of pagosAntiguos) {
      await DB.eliminarPago(p.id);
      DB.pagosProveedor = DB.pagosProveedor.filter(x => x.id !== p.id);
    }
  }

  await DB.guardarCompra(compra);
  const idx = DB.compras.findIndex(c => c.id === id);
  if (idx >= 0) DB.compras[idx] = compra; else DB.compras.push(compra);

  if (tipoPago === 'credito' && pagoInicial > 0) {
    const pago = {
      id: 'pago_' + generarId(),
      proveedorId,
      compraId: id,
      fecha,
      monto: pagoInicial,
      metodo: 'Efectivo',
      notas: 'Pago inicial',
      origen: 'pago_inicial',
      lastModified: Date.now()
    };
    await DB.guardarPago(pago);
    DB.pagosProveedor.push(pago);
  }

  toast(editando ? '✅ Compra actualizada' : '✅ Compra registrada');
  cerrarModales();
  navegar('compras');
  actualizarHeader();
}

async function eliminarCompra() {
  if (!App.compraEnEdicion) return;
  if (!confirm(`¿Eliminar la compra ${App.compraEnEdicion.id}? Se eliminarán también sus pagos asociados.`)) return;
  const id = App.compraEnEdicion.id;
  const pagosAsociados = DB.pagosProveedor.filter(p => p.compraId === id);
  for (const p of pagosAsociados) {
    await DB.eliminarPago(p.id);
  }
  DB.pagosProveedor = DB.pagosProveedor.filter(p => p.compraId !== id);
  await DB.eliminarCompra(id);
  DB.compras = DB.compras.filter(c => c.id !== id);
  toast('🗑️ Compra eliminada');
  cerrarModales();
  navegar('compras');
  actualizarHeader();
}

function verDetalleCompra(id) {
  const c = DB.compras.find(x => x.id === id);
  if (!c) return;
  const prov = DB.proveedores.find(p => p.id === c.proveedorId);
  const pagos = DB.pagosProveedor.filter(p => p.compraId === id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const html = `
    <div class="space-y-3">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-xs text-slate-500">Compra</p>
          <p class="font-bold text-lg text-slate-800 dark:text-white">${c.id}</p>
        </div>
        <span class="badge ${c.saldo > 0 ? 'badge-danger' : 'badge-success'}">${c.saldo > 0 ? 'Pendiente' : 'Pagado'}</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
          <p class="text-xs text-slate-500">Proveedor</p>
          <p class="font-semibold text-slate-800 dark:text-white">${prov ? prov.nombre : 'N/A'}</p>
        </div>
        <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
          <p class="text-xs text-slate-500">Fecha</p>
          <p class="font-semibold text-slate-800 dark:text-white">${fmtFecha(c.fecha)}</p>
        </div>
      </div>
      <div class="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 space-y-1">
        <div class="flex justify-between text-sm"><span>Total:</span><span class="font-bold">${fmtC(c.total)}</span></div>
        <div class="flex justify-between text-sm"><span>Pagado:</span><span class="font-bold text-emerald-600">${fmtC(c.pagado)}</span></div>
        <div class="flex justify-between text-sm border-t border-brand-200 dark:border-brand-800 pt-1"><span>Saldo:</span><span class="font-bold text-rose-600">${fmtC(c.saldo)}</span></div>
      </div>
      <div>
        <p class="font-bold text-sm mb-2 text-slate-700 dark:text-slate-300">Productos (${c.productos.length})</p>
        <div class="space-y-2 max-h-60 overflow-y-auto">
          ${c.productos.map(p => `
            <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex justify-between items-center ${p.vendido ? 'opacity-60' : ''}">
              <div class="min-w-0">
                <p class="font-medium text-sm text-slate-800 dark:text-white ${p.vendido ? 'line-through' : ''}">${p.nombre}</p>
                <p class="text-xs text-slate-500">${p.cantidad} × ${fmtC(p.precioCompra)}${p.serie ? ' · Serie: ' + p.serie : ''}${p.modelo ? ' · Modelo: ' + p.modelo : ''}</p>
              </div>
              ${p.vendido ? '<span class="badge badge-success">Vendido</span>' : '<span class="badge badge-info">Stock</span>'}
            </div>
          `).join('')}
        </div>
      </div>
      ${pagos.length > 0 ? `
        <div>
          <p class="font-bold text-sm mb-2 text-slate-700 dark:text-slate-300">Pagos realizados (${pagos.length})</p>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            ${pagos.map(p => `
              <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <p class="text-sm font-medium text-emerald-800 dark:text-emerald-300">${fmtFecha(p.fecha)}</p>
                  <p class="text-xs text-emerald-600 dark:text-emerald-400">${p.metodo}${p.notas ? ' · ' + p.notas : ''}</p>
                </div>
                <p class="font-bold text-emerald-700 dark:text-emerald-300">${fmtC(p.monto)}</p>
              </div>
            `).join('')}
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

/* ═══════════ VENTAS (Fase 2) ═══════════ */
function renderVentas(el) {
  el.innerHTML = `
    <div class="anim-in space-y-4">
      <h2 class="text-xl font-extrabold text-slate-800 dark:text-white">Ventas</h2>
      <div class="card text-center py-12">
        <p class="text-4xl mb-3">🚧</p>
        <p class="font-bold text-slate-800 dark:text-white">Módulo en construcción</p>
        <p class="text-xs text-slate-500 mt-1">Se activará en la Fase 2</p>
        <p class="text-xs text-slate-500 mt-4">Tus ${DB.ventas.length} ventas están guardadas y visibles en el Dashboard.</p>
      </div>
    </div>`;
}

/* ═══════════ FINANZAS ═══════════ */
function renderFinanzas(el) {
  const totalDeuda = DB.compras.reduce((s, c) => s + (parseFloat(c.saldo) || 0), 0);
  const totalPagado = DB.pagosProveedor.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const pagosRecientes = [...DB.pagosProveedor].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 20);

  el.innerHTML = `
    <div class="anim-in space-y-4">
      <h2 class="text-xl font-extrabold text-slate-800 dark:text-white">Finanzas</h2>
      <div class="grid grid-cols-2 gap-3">
        <div class="kpi">
          <p class="text-xs text-slate-500">Deuda total</p>
          <p class="text-lg font-extrabold text-rose-600">${fmtC(totalDeuda)}</p>
        </div>
        <div class="kpi">
          <p class="text-xs text-slate-500">Total pagado</p>
          <p class="text-lg font-extrabold text-emerald-600">${fmtC(totalPagado)}</p>
        </div>
      </div>
      <button onclick="abrirModalPago()" class="btn-accent w-full">+ Registrar Pago a Proveedor</button>

      <div>
        <h3 class="font-bold text-sm mb-3 text-slate-700 dark:text-slate-300">Pagos recientes</h3>
        ${pagosRecientes.length === 0 ? `
          <div class="card text-center py-8">
            <p class="text-slate-500 text-sm">Sin pagos registrados</p>
          </div>` : `
          <div class="space-y-2">
            ${pagosRecientes.map(p => {
              const prov = DB.proveedores.find(x => x.id === p.proveedorId);
              return `
                <div class="card flex justify-between items-center py-3">
                  <div class="min-w-0">
                    <p class="font-semibold text-sm text-slate-800 dark:text-white">${prov ? prov.nombre : 'N/A'}</p>
                    <p class="text-xs text-slate-500">${fmtFecha(p.fecha)} · ${p.metodo}</p>
                  </div>
                  <p class="font-bold text-emerald-600">${fmtC(p.monto)}</p>
                </div>`;
            }).join('')}
          </div>`}
      </div>
    </div>
  `;
}

/* ═══════════ MÁS ═══════════ */
function renderMas(el) {
  el.innerHTML = `
    <div class="anim-in space-y-4">
      <h2 class="text-xl font-extrabold text-slate-800 dark:text-white">Más opciones</h2>

      <div class="card">
        <h3 class="font-bold text-slate-800 dark:text-white mb-3">Proveedores</h3>
        <button onclick="abrirModalProveedor()" class="btn-primary w-full mb-3 text-sm">+ Nuevo Proveedor</button>
        ${DB.proveedores.length === 0 ? `
          <p class="text-center text-sm text-slate-500 py-4">Sin proveedores</p>` : `
          <div class="space-y-2">
            ${DB.proveedores.map(p => {
              const deuda = DB.compras.filter(c => c.proveedorId === p.id).reduce((s, c) => s + (parseFloat(c.saldo) || 0), 0);
              return `
                <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div class="min-w-0 flex-1" onclick="abrirModalProveedor('${p.id}')">
                    <p class="font-semibold text-sm text-slate-800 dark:text-white truncate">${p.nombre}</p>
                    <p class="text-xs text-slate-500">${p.telefono || 'Sin teléfono'} · ${p.tipo}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs text-slate-500">Deuda</p>
                    <p class="font-bold text-sm ${deuda > 0 ? 'text-rose-600' : 'text-emerald-600'}">${fmtC(deuda)}</p>
                  </div>
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
          <p>Versión: 2.0 (Fase 1)</p>
          <p>Registros: ${DB.proveedores.length} proveedores · ${DB.compras.length} compras · ${DB.ventas.length} ventas</p>
          <p>Pagos: ${DB.pagosProveedor.length} · Cobros: ${DB.cobros.length}</p>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════ PROVEEDORES ═══════════ */
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
  if (!nombre) return toast('⚠️ Ingresa el nombre del proveedor');

  const proveedor = {
    id: document.getElementById('provId').value || 'prov_' + generarId(),
    nombre,
    telefono: document.getElementById('provTelefono').value.trim(),
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
  const comprasAsociadas = DB.compras.filter(c => c.proveedorId === App.proveedorEnEdicion.id);
  if (comprasAsociadas.length > 0) return toast(`⚠️ No se puede eliminar: tiene ${comprasAsociadas.length} compras asociadas`);
  if (!confirm(`¿Eliminar al proveedor "${App.proveedorEnEdicion.nombre}"?`)) return;
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
  sel.innerHTML = '<option value="">Seleccione...</option>' +
    DB.proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  document.getElementById('pagoCompra').innerHTML = '<option value="">Seleccione proveedor primero...</option>';
  document.getElementById('pagoFecha').value = hoyISO();
  document.getElementById('pagoMonto').value = '';
  document.getElementById('pagoMetodo').value = 'Efectivo';
  document.getElementById('pagoNotas').value = '';
  abrirModal('modalPagoProveedor');
}

function cargarComprasDelProveedor() {
  const provId = document.getElementById('pagoProveedor').value;
  const sel = document.getElementById('pagoCompra');
  const compras = DB.compras.filter(c => c.proveedorId === provId && (parseFloat(c.saldo) || 0) > 0);
  if (compras.length === 0) {
    sel.innerHTML = '<option value="">Sin compras pendientes</option>';
    return;
  }
  sel.innerHTML = '<option value="">Aplicar a saldo general</option>' +
    compras.map(c => `<option value="${c.id}">${c.id} - ${fmtC(c.saldo)}</option>`).join('');
}

async function guardarPagoProveedor() {
  const proveedorId = document.getElementById('pagoProveedor').value;
  const compraId = document.getElementById('pagoCompra').value || null;
  const fecha = document.getElementById('pagoFecha').value;
  const monto = parseFloat(document.getElementById('pagoMonto').value) || 0;
  const metodo = document.getElementById('pagoMetodo').value;
  const notas = document.getElementById('pagoNotas').value.trim();

  if (!proveedorId) return toast('⚠️ Selecciona un proveedor');
  if (monto <= 0) return toast('⚠️ Ingresa un monto válido');
  if (!fecha) return toast('⚠️ Selecciona la fecha');

  const pago = {
    id: 'pago_' + generarId(),
    proveedorId,
    compraId,
    fecha,
    monto,
    metodo,
    notas,
    lastModified: Date.now()
  };

  await DB.guardarPago(pago);
  DB.pagosProveedor.push(pago);

  // Aplicar al saldo de la compra (o a la más antigua si no se especificó)
  if (compraId) {
    await aplicarPagoACompra(compraId, monto);
  } else {
    // Distribuir en compras pendientes del proveedor, empezando por la más antigua
    let restante = monto;
    const pendientes = DB.compras
      .filter(c => c.proveedorId === proveedorId && (parseFloat(c.saldo) || 0) > 0)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    for (const c of pendientes) {
      if (restante <= 0) break;
      const aplicar = Math.min(restante, parseFloat(c.saldo) || 0);
      await aplicarPagoACompra(c.id, aplicar);
      restante -= aplicar;
    }
  }

  toast('✅ Pago registrado');
  cerrarModales();
  navegar('finanzas');
  actualizarHeader();
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

/* ═══════════ MODALES ═══════════ */
function abrirModal(id) {
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
  const card = document.querySelector(`#${id} > div`);
  if (card) card.classList.add('slide-up');
}
function cerrarModales() {
  document.getElementById('modalOverlay').classList.add('hidden');
  ['modalProveedor', 'modalCompra', 'modalPagoProveedor', 'modalBackup', 'modalContenido'].forEach(id => {
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
          <button onclick="cerrarModales()" class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
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
function abrirMenuBackup() {
  abrirModal('modalBackup');
}

function exportarBackup() {
  const datos = {
    version: 2,
    exportadoEn: new Date().toISOString(),
    app: 'Variedades Karen',
    proveedores: DB.proveedores,
    compras: DB.compras,
    ventas: DB.ventas,
    clientes: DB.clientes,
    pagosProveedor: DB.pagosProveedor,
    cobros: DB.cobros
  };
  const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `variedades-karen-backup-${fecha}.json`;
  a.click();
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

      if (!confirm(`¿Reemplazar TODOS los datos actuales?\n\nBackup: ${datos.app || 'desconocido'}\nVersión: ${datos.version || 1}\n\nSe guardará un respaldo automático antes de continuar.`)) return;

      // Respaldo automático
      const backup = {
        proveedores: DB.proveedores, compras: DB.compras, ventas: DB.ventas,
        clientes: DB.clientes, pagosProveedor: DB.pagosProveedor, cobros: DB.cobros,
        fecha: new Date().toISOString()
      };
      localStorage.setItem('backup_pre_import', JSON.stringify(backup));

      await DB.vaciarTodo();
      await guardarMultiples('proveedores', migrado.proveedores || []);
      await guardarMultiples('compras', migrado.compras || []);
      await guardarMultiples('ventas', migrado.ventas || []);
      await guardarMultiples('clientes', migrado.clientes || []);
      await guardarMultiples('pagosProveedor', migrado.pagosProveedor || []);
      await guardarMultiples('cobros', migrado.cobros || []);

      await DB.cargarTodo();
      toast('✅ Datos importados correctamente');
      cerrarModales();
      navegar('dashboard');
      actualizarHeader();
    } catch (err) {
      console.error(err);
      toast('❌ Error al importar: ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

async function borrarTodosLosDatos() {
  if (!confirm('⚠️ ¿Borrar TODOS los datos? Esta acción no se puede deshacer.\n\nSe recomienda exportar un backup primero.')) return;
  if (!confirm('¿Estás TOTALMENTE seguro? Se perderán todos los registros.')) return;
  await DB.vaciarTodo();
  await DB.cargarTodo();
  toast('🗑️ Datos borrados');
  cerrarModales();
  navegar('dashboard');
  actualizarHeader();
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