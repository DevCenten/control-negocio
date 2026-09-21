/* ═══════════════════════════════════════════════════════════
   app.js — Variedades Karen · Sistema de Gestión Empresarial
   Fase 3: Dashboard con gráficas, Reportes, Notificaciones
   ═══════════════════════════════════════════════════════════ */

const App = {
  seccionActual: 'dashboard',
  subseccion: null,
  compraEnEdicion: null,
  ventaEnEdicion: null,
  proveedorEnEdicion: null,
  clienteEnEdicion: null,
  productosCompraTemp: [],
  productosVentaTemp: [],
  scannerActivo: null,
  productoEscanerDestino: null,
  stockDisponible: [],
  charts: {},
  rangoReporte: { desde: null, hasta: null }
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
    if (migro) setTimeout(() => toast('✅ Datos migrados'), 800);
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
  actualizarBadgeNotif();
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
  // Refrescar gráficas
  if (App.seccionActual === 'dashboard') navegar('dashboard');
  else if (App.seccionActual === 'reportes') navegar('reportes');
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
  // Destruir gráficas anteriores
  Object.values(App.charts).forEach(c => { try { c.destroy(); } catch(e){} });
  App.charts = {};
  App.seccionActual = seccion;
  App.subseccion = sub || App.subseccion;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.nav === seccion));
  const main = document.getElementById('appMain');
  main.innerHTML = '';
  switch (seccion) {
    case 'dashboard': renderDashboard(main); break;
    case 'compras': renderCompras(main); break;
    case 'ventas': renderVentas(main); break;
    case 'reportes': renderReportes(main); break;
    case 'mas': renderMas(main); break;
  }
  actualizarHeader();
}

function cambiarSubtab(sub) {
  App.subseccion = sub;
  navegar(App.seccionActual, sub);
}

/* ═══════════ HELPERS DE ANÁLISIS ═══════════ */
function ventasPorMes(meses = 6) {
  const resultado = [];
  const hoy = new Date();
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-NI', { month: 'short' });
    const total = DB.ventas
      .filter(v => (v.fecha || '').startsWith(key))
      .reduce((s, v) => s + (parseFloat(v.precioTotal) || 0), 0);
    resultado.push({ label, total, key });
  }
  return resultado;
}

function topProductos(limite = 5) {
  const contador = {};
  DB.ventas.forEach(v => {
    (v.productos || []).forEach(p => {
      const key = p.nombre || 'Sin nombre';
      if (!contador[key]) contador[key] = { cantidad: 0, ingresos: 0 };
      contador[key].cantidad += parseInt(p.cantidad) || 1;
      contador[key].ingresos += (parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1);
    });
  });
  return Object.entries(contador)
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, limite);
}

function distribucionCartera() {
  const hoy = new Date();
  const buckets = { alDia: 0, porVencer: 0, vencido: 0, pagado: 0 };
  DB.ventas.forEach(v => {
    const saldo = parseFloat(v.saldo) || 0;
    if (v.estado === 'PAGADO' || saldo <= 0) { buckets.pagado += parseFloat(v.precioTotal) || 0; return; }
    const dias = v.proximaFechaCobro ? diffDias(v.proximaFechaCobro) : 0;
    if (dias < 0) buckets.vencido += saldo;
    else if (dias <= 7) buckets.porVencer += saldo;
    else buckets.alDia += saldo;
  });
  return buckets;
}

function flujoCaja(meses = 6) {
  const resultado = [];
  const hoy = new Date();
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-NI', { month: 'short' });
    const ingresos = DB.cobros.filter(c => (c.fecha || '').startsWith(key)).reduce((s, c) => s + (parseFloat(c.monto) || 0), 0);
    const egresos = DB.pagosProveedor.filter(p => (p.fecha || '').startsWith(key)).reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
    resultado.push({ label, ingresos, egresos });
  }
  return resultado;
}

/* ═══════════ NOTIFICACIONES ═══════════ */
function calcularNotificaciones() {
  const notifs = [];
  const hoy = new Date();

  // Cobros vencidos
  DB.ventas.filter(v => v.estado === 'PENDIENTE' && v.proximaFechaCobro).forEach(v => {
    const dias = diffDias(v.proximaFechaCobro);
    if (dias < 0) {
      notifs.push({
        tipo: 'danger', icono: '⚠️', titulo: 'Cobro vencido',
        mensaje: `${v.cliente} - ${Math.abs(dias)} días atrasado`,
        monto: fmtC(v.cuotaMensual),
        accion: () => abrirModalCobroPara(v.id)
      });
    } else if (dias === 0) {
      notifs.push({
        tipo: 'warning', icono: '🔔', titulo: 'Cobro HOY',
        mensaje: `${v.cliente}`,
        monto: fmtC(v.cuotaMensual),
        accion: () => abrirModalCobroPara(v.id)
      });
    } else if (dias <= 7) {
      notifs.push({
        tipo: 'info', icono: '📅', titulo: `Cobro en ${dias} días`,
        mensaje: `${v.cliente}`,
        monto: fmtC(v.cuotaMensual),
        accion: () => abrirModalCobroPara(v.id)
      });
    }
  });

  // Deudas con proveedores
  DB.compras.filter(c => (parseFloat(c.saldo) || 0) > 0).forEach(c => {
    const prov = DB.proveedores.find(p => p.id === c.proveedorId);
    notifs.push({
      tipo: 'info', icono: '💳', titulo: 'Deuda con proveedor',
      mensaje: `${prov ? prov.nombre : 'N/A'} - Compra ${c.id}`,
      monto: fmtC(c.saldo),
      accion: () => abrirModalPagoPara(c.proveedorId)
    });
  });

  return notifs;
}

function actualizarBadgeNotif() {
  const notifs = calcularNotificaciones();
  const badge = document.getElementById('badgeNotif');
  if (!badge) return;
  const criticas = notifs.filter(n => n.tipo === 'danger' || n.tipo === 'warning').length;
  if (criticas > 0) {
    badge.textContent = criticas > 99 ? '99+' : criticas;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function abrirPanelNotificaciones() {
  const notifs = calcularNotificaciones();
  const cont = document.getElementById('listaNotificaciones');
  if (notifs.length === 0) {
    cont.innerHTML = '<div class="text-center py-12"><p class="text-5xl mb-3">🎉</p><p class="text-slate-500">Todo al día</p></div>';
  } else {
    const colores = {
      danger: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600',
      warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
      info: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600'
    };
    cont.innerHTML = notifs.map((n, i) => `
      <div class="notif-item cursor-pointer" onclick="cerrarModales(); setTimeout(() => { App.notifsAcciones[${i}](); }, 200)">
        <div class="notif-icon ${colores[n.tipo]}">
          <span class="text-xl">${n.icono}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm text-slate-800 dark:text-white">${n.titulo}</p>
          <p class="text-xs text-slate-500 truncate">${n.mensaje}</p>
          <p class="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">${n.monto}</p>
        </div>
      </div>`).join('');
    App.notifsAcciones = notifs.map(n => n.accion);
  }
  abrirModal('modalNotificaciones');
}

/* ═══════════ DASHBOARD CON GRÁFICAS ═══════════ */
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
    .slice(0, 4);

  el.innerHTML = `
    <div class="anim-in space-y-4">
      <div class="grid grid-cols-2 gap-3">
        ${kpiCard('Deuda con proveedores', fmtC(deudaTotal), 'rose', 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z')}
        ${kpiCard('Clientes me deben', fmtC(carteraClientes), 'amber', 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z')}
        ${kpiCard('Stock valorizado', fmtC(stockValor), 'brand', 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4')}
        ${kpiCard('Ganancia estimada', fmtC(ganancia), 'emerald', 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6')}
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-sm text-slate-800 dark:text-white">📊 Ventas últimos 6 meses</h3>
          <span class="text-xs text-slate-500">Total: ${fmtC(ventasPorMes(6).reduce((s, m) => s + m.total, 0))}</span>
        </div>
        <div class="chart-container"><canvas id="chartVentasMes"></canvas></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="card">
          <h3 class="font-bold text-sm text-slate-800 dark:text-white mb-3">🥧 Estado de cartera</h3>
          <div class="chart-container"><canvas id="chartCartera"></canvas></div>
        </div>
        <div class="card">
          <h3 class="font-bold text-sm text-slate-800 dark:text-white mb-3">💰 Flujo de caja</h3>
          <div class="chart-container"><canvas id="chartFlujo"></canvas></div>
        </div>
      </div>

      <div class="card">
        <h3 class="font-bold text-sm text-slate-800 dark:text-white mb-3">🏆 Top 5 productos</h3>
        <div class="chart-container-lg"><canvas id="chartTopProductos"></canvas></div>
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
            <p class="font-bold text-sm">Cobrar</p>
          </button>
          <button onclick="abrirModalPago()" class="p-4 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 text-white text-left shadow-lg">
            <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 9v1"/></svg>
            <p class="font-bold text-sm">Pagar</p>
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
              return `<div class="p-3 rounded-xl border ${cls} flex justify-between items-center cursor-pointer" onclick="abrirModalCobroPara('${v.id}')">
                <div class="min-w-0"><p class="font-semibold text-sm text-slate-800 dark:text-white truncate">${v.cliente}</p><p class="text-xs text-slate-500">Cuota: ${fmtC(v.cuotaMensual)}</p></div>
                <div class="text-right"><span class="badge ${v.dias < 0 ? 'badge-danger' : v.dias === 0 ? 'badge-warning' : 'badge-info'}">${txt}</span><p class="text-xs mt-1 text-slate-500">Saldo: ${fmtC(v.saldo)}</p></div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}
    </div>
  `;

  // Renderizar gráficas después de insertar HTML
  setTimeout(() => renderizarGraficasDashboard(), 50);
}

function kpiCard(titulo, valor, color, iconPath) {
  const colors = { rose: 'from-rose-500 to-rose-700', amber: 'from-amber-500 to-amber-700', brand: 'from-brand-500 to-brand-700', emerald: 'from-emerald-500 to-emerald-700' };
  return `<div class="kpi">
    <div class="w-9 h-9 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white mb-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/></svg>
    </div>
    <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">${titulo}</p>
    <p class="text-base font-extrabold text-slate-800 dark:text-white truncate">${valor}</p>
  </div>`;
}

function renderizarGraficasDashboard() {
  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#cbd5e1' : '#475569';

  // Ventas por mes
  const ventas = ventasPorMes(6);
  const ctxVentas = document.getElementById('chartVentasMes');
  if (ctxVentas) {
    App.charts.ventasMes = new Chart(ctxVentas, {
      type: 'bar',
      data: {
        labels: ventas.map(v => v.label),
        datasets: [{
          label: 'Ventas C$',
          data: ventas.map(v => v.total),
          backgroundColor: '#4f46e5',
          borderRadius: 8,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: textColor, callback: v => 'C$' + (v/1000).toFixed(0) + 'k' }, grid: { color: gridColor } },
          x: { ticks: { color: textColor }, grid: { display: false } }
        }
      }
    });
  }

  // Cartera (dona)
  const cartera = distribucionCartera();
  const ctxCartera = document.getElementById('chartCartera');
  if (ctxCartera) {
    App.charts.cartera = new Chart(ctxCartera, {
      type: 'doughnut',
      data: {
        labels: ['Al día', 'Por vencer', 'Vencido', 'Pagado'],
        datasets: [{
          data: [cartera.alDia, cartera.porVencer, cartera.vencido, cartera.pagado],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#6366f1'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 }, padding: 8, boxWidth: 12 } }
        },
        cutout: '65%'
      }
    });
  }

  // Flujo de caja
  const flujo = flujoCaja(6);
  const ctxFlujo = document.getElementById('chartFlujo');
  if (ctxFlujo) {
    App.charts.flujo = new Chart(ctxFlujo, {
      type: 'line',
      data: {
        labels: flujo.map(f => f.label),
        datasets: [
          { label: 'Ingresos', data: flujo.map(f => f.ingresos), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.3, fill: true },
          { label: 'Egresos', data: flujo.map(f => f.egresos), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.3, fill: true }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 }, padding: 8, boxWidth: 12 } } },
        scales: {
          y: { beginAtZero: true, ticks: { color: textColor, callback: v => 'C$' + (v/1000).toFixed(0) + 'k' }, grid: { color: gridColor } },
          x: { ticks: { color: textColor }, grid: { display: false } }
        }
      }
    });
  }

  // Top productos
  const top = topProductos(5);
  const ctxTop = document.getElementById('chartTopProductos');
  if (ctxTop) {
    App.charts.topProductos = new Chart(ctxTop, {
      type: 'bar',
      data: {
        labels: top.map(t => t.nombre.length > 25 ? t.nombre.slice(0, 25) + '…' : t.nombre),
        datasets: [{
          label: 'Unidades vendidas',
          data: top.map(t => t.cantidad),
          backgroundColor: '#ec4899',
          borderRadius: 8,
          maxBarThickness: 30
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
  }
}

/* ═══════════ COMPRAS ═══════════ */
function renderCompras(el) {
  if (!App.subseccion || !['historial', 'deudas'].includes(App.subseccion)) App.subseccion = 'historial';
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
    </div>`;
}

function renderComprasHistorial() {
  const compras = [...DB.compras].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (compras.length === 0) return '<div class="card text-center py-12"><p class="text-4xl mb-2">📦</p><p class="text-slate-500 text-sm">Sin compras</p></div>';
  return `<div class="space-y-3">${compras.map(c => {
    const prov = DB.proveedores.find(p => p.id === c.proveedorId);
    const pendiente = (parseFloat(c.saldo) || 0) > 0;
    return `<div class="card cursor-pointer" onclick="verDetalleCompra('${c.id}')">
      <div class="flex justify-between items-start mb-2">
        <div class="min-w-0"><p class="font-bold text-slate-800 dark:text-white">${c.id}</p><p class="text-xs text-slate-500">${prov ? prov.nombre : 'Sin proveedor'} · ${fmtFecha(c.fecha)}</p></div>
        <span class="badge ${pendiente ? 'badge-danger' : 'badge-success'}">${pendiente ? 'Pendiente' : 'Pagado'}</span>
      </div>
      <div class="flex justify-between items-center text-sm"><span class="text-slate-500">Total: ${fmtC(c.total)}</span><span class="font-bold ${pendiente ? 'text-rose-600' : 'text-emerald-600'}">Saldo: ${fmtC(c.saldo)}</span></div>
    </div>`;
  }).join('')}</div>`;
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
  return `<div class="space-y-3">${items.map(([provId, data]) => {
    const prov = DB.proveedores.find(p => p.id === provId);
    return `<div class="card">
      <div class="flex justify-between items-center mb-2">
        <div><p class="font-bold text-slate-800 dark:text-white">${prov ? prov.nombre : 'N/A'}</p><p class="text-xs text-slate-500">${data.compras.length} compras pendientes</p></div>
        <p class="text-lg font-extrabold text-rose-600">${fmtC(data.total)}</p>
      </div>
      <button onclick="abrirModalPagoPara('${provId}')" class="w-full py-2 rounded-xl bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-semibold text-sm">Pagar a este proveedor</button>
    </div>`;
  }).join('')}</div>`;
}

/* ═══════════ MODALES COMPRA (igual que fase 2) ═══════════ */
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
      <input type="text" placeholder="Nombre *" value="${p.nombre || ''}" oninput="actualizarProductoCompra(${i}, 'nombre', this.value)" class="inp text-sm">
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
  if (productos.length === 0) return toast('⚠️ Agrega productos');
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
      <div><p class="font-bold text-sm mb-2">Productos (${c.productos.length})</p>
        <div class="space-y-2 max-h-60 overflow-y-auto">
          ${c.productos.map(p => `<div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex justify-between items-center ${p.vendido ? 'opacity-60' : ''}">
            <div class="min-w-0"><p class="font-medium text-sm ${p.vendido ? 'line-through' : ''}">${p.nombre}</p><p class="text-xs text-slate-500">${p.cantidad} × ${fmtC(p.precioCompra)}${p.serie ? ' · S/N: ' + p.serie : ''}${p.modelo ? ' · Mod: ' + p.modelo : ''}</p></div>
            ${p.vendido ? '<span class="badge badge-success">Vendido</span>' : '<span class="badge badge-info">Stock</span>'}
          </div>`).join('')}
        </div>
      </div>
      ${pagos.length > 0 ? `<div><p class="font-bold text-sm mb-2">Pagos (${pagos.length})</p>
        <div class="space-y-2 max-h-48 overflow-y-auto">${pagos.map(p => `<div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 flex justify-between items-center"><div><p class="text-sm font-medium">${fmtFecha(p.fecha)}</p><p class="text-xs">${p.metodo}${p.notas ? ' · ' + p.notas : ''}</p></div><p class="font-bold text-emerald-700">${fmtC(p.monto)}</p></div>`).join('')}</div>
      </div>` : ''}
      <div class="flex gap-2 pt-2">
        <button onclick="abrirModalCompra('${c.id}')" class="btn-primary flex-1 text-sm">✏️ Editar</button>
        <button onclick="cerrarModales()" class="btn-ghost text-sm">Cerrar</button>
      </div>
    </div>`;
  abrirModalContenido('Detalle Compra', html);
}

/* ═══════════ VENTAS ═══════════ */
function renderVentas(el) {
  if (!App.subseccion || !['activas', 'pagadas', 'clientes'].includes(App.subseccion)) App.subseccion = 'activas';
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
    </div>`;
}

function renderVentasActivas() {
  const ventas = DB.ventas.filter(v => v.estado === 'PENDIENTE').sort((a, b) => new Date(a.proximaFechaCobro || a.fecha) - new Date(b.proximaFechaCobro || b.fecha));
  if (ventas.length === 0) return '<div class="card text-center py-12"><p class="text-4xl mb-2">🎉</p><p class="text-slate-500 text-sm">Sin ventas pendientes</p></div>';
  return `<div class="space-y-3">${ventas.map(v => {
    const dias = v.proximaFechaCobro ? diffDias(v.proximaFechaCobro) : 999;
    const cls = dias < 0 ? 'border-rose-300 dark:border-rose-800' : dias <= 7 ? 'border-amber-300 dark:border-amber-800' : 'border-slate-200 dark:border-slate-800';
    const progress = v.precioTotal > 0 ? ((v.precioTotal - v.saldo) / v.precioTotal * 100) : 0;
    return `<div class="card border-2 ${cls} cursor-pointer" onclick="verDetalleVenta('${v.id}')">
      <div class="flex justify-between items-start mb-2">
        <div class="min-w-0"><p class="font-bold text-slate-800 dark:text-white truncate">${v.cliente}</p><p class="text-xs text-slate-500">${v.id} · ${v.telefono || 'Sin teléfono'}</p></div>
        <p class="font-extrabold text-orange-600">${fmtC(v.saldo)}</p>
      </div>
      <div class="flex justify-between text-xs mb-2"><span class="text-slate-500">Cuota: ${fmtC(v.cuotaMensual)}</span><span class="${dias < 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}">${v.proximaFechaCobro ? (dias < 0 ? `Vencido ${Math.abs(dias)}d` : dias === 0 ? 'Hoy' : `En ${dias}d`) : 'Sin fecha'}</span></div>
      <div class="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"><div class="h-full bg-orange-500" style="width: ${progress}%"></div></div>
    </div>`;
  }).join('')}</div>`;
}

function renderVentasPagadas() {
  const ventas = DB.ventas.filter(v => v.estado === 'PAGADO').sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (ventas.length === 0) return '<div class="card text-center py-12"><p class="text-4xl mb-2">📭</p><p class="text-slate-500 text-sm">Sin ventas pagadas</p></div>';
  return `<div class="space-y-2">${ventas.map(v => `
    <div class="card cursor-pointer flex justify-between items-center" onclick="verDetalleVenta('${v.id}')">
      <div class="min-w-0"><p class="font-semibold text-slate-800 dark:text-white truncate">${v.cliente}</p><p class="text-xs text-slate-500">${v.id} · ${fmtFecha(v.fecha)}</p></div>
      <div class="text-right"><p class="font-bold text-emerald-600">${fmtC(v.precioTotal)}</p><span class="badge badge-success">Pagado</span></div>
    </div>`).join('')}</div>`;
}

function renderClientesLista() {
  const clientes = [...DB.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (clientes.length === 0) return '<div class="card text-center py-12"><p class="text-4xl mb-2">👥</p><p class="text-slate-500 text-sm">Sin clientes</p></div>';
  return `<div class="card mb-3"><input type="text" id="buscarCliente" class="inp" placeholder="🔍 Buscar..." oninput="filtrarClientes()"></div>
    <button onclick="abrirModalCliente()" class="btn-primary w-full mb-3 text-sm">+ Nuevo Cliente</button>
    <div id="listaClientesCont" class="space-y-2">
      ${clientes.map(c => {
        const ventas = DB.ventas.filter(v => v.clienteId === c.id);
        const deuda = ventas.reduce((s, v) => s + (parseFloat(v.saldo) || 0), 0);
        return `<div class="card cursor-pointer flex justify-between items-center" data-nombre="${c.nombre.toLowerCase()}" onclick="abrirModalCliente('${c.id}')">
          <div class="min-w-0"><p class="font-semibold text-slate-800 dark:text-white truncate">${c.nombre}</p><p class="text-xs text-slate-500">${c.telefono || 'Sin teléfono'} · ${ventas.length} ventas</p></div>
          <div class="text-right"><p class="text-xs text-slate-500">Debe</p><p class="font-bold ${deuda > 0 ? 'text-rose-600' : 'text-emerald-600'}">${fmtC(deuda)}</p></div>
        </div>`;
      }).join('')}
    </div>`;
}

function filtrarClientes() {
  const q = document.getElementById('buscarCliente').value.toLowerCase();
  document.querySelectorAll('#listaClientesCont [data-nombre]').forEach(el => { el.style.display = el.dataset.nombre.includes(q) ? '' : 'none'; });
}

/* ═══════════ MODAL VENTA ═══════════ */
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
    cont.innerHTML = '<p class="text-center text-slate-400 text-sm py-4">Sin productos.</p>';
    return;
  }
  cont.innerHTML = App.productosVentaTemp.map((p, i) => `
    <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-slate-500">${p.sourceType === 'stock' ? '📦 Stock' : '✏️ Manual'}</span>
        <button onclick="quitarProductoVenta(${i})" class="text-rose-500 p-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
      </div>
      <input type="text" value="${p.nombre || ''}" ${p.sourceType === 'stock' ? 'readonly' : ''} oninput="actualizarProductoVenta(${i}, 'nombre', this.value)" class="inp text-sm">
      <div class="grid grid-cols-3 gap-2">
        <input type="number" value="${p.cantidad || 1}" ${p.sourceType === 'stock' ? 'readonly' : ''} oninput="actualizarProductoVenta(${i}, 'cantidad', parseInt(this.value)||1)" class="inp text-sm">
        <input type="number" value="${p.precioCompra || 0}" readonly class="inp text-sm bg-slate-100 dark:bg-slate-800">
        <input type="number" placeholder="Venta C$" value="${p.precioVenta || ''}" oninput="actualizarProductoVenta(${i}, 'precioVenta', parseFloat(this.value)||0); recalcularVenta();" class="inp text-sm bg-emerald-50 dark:bg-emerald-900/20">
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
      if (!p.vendido) stock.push({ ...p, compraId: c.id, proveedorNombre: prov ? prov.nombre : '', precioCompra: parseFloat(p.precioCompra) || 0, precioVentaSugerido: parseFloat(p.precioVenta) || 0, uniqueId: `${c.id}_${idx}`, sourceType: 'stock', sourceId: c.id, indexEnCompra: idx });
    });
  });
  App.stockDisponible = stock;
  renderListaProductosStock(stock);
  abrirModal('modalSelectorProductos');
}

function renderListaProductosStock(lista) {
  const cont = document.getElementById('listaProductosStock');
  if (lista.length === 0) { cont.innerHTML = '<p class="text-center text-slate-500 py-8">Sin productos</p>'; return; }
  cont.innerHTML = lista.map(p => `
    <div class="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onclick="seleccionarProductoStock('${p.uniqueId}')">
      <div class="min-w-0"><p class="font-semibold text-sm text-slate-800 dark:text-white truncate">${p.nombre}</p><p class="text-xs text-slate-500">${p.compraId} · ${p.proveedorNombre}${p.serie ? ' · S/N: ' + p.serie : ''}</p></div>
      <div class="text-right shrink-0"><p class="font-bold text-sm">${fmtC(p.precioVentaSugerido || p.precioCompra)}</p><p class="text-xs text-slate-500">Costo: ${fmtC(p.precioCompra)}</p></div>
    </div>`).join('');
}

function filtrarProductosStock() {
  const q = document.getElementById('buscarProductoStock').value.toLowerCase();
  renderListaProductosStock((App.stockDisponible || []).filter(p => (p.nombre || '').toLowerCase().includes(q) || (p.serie || '').toLowerCase().includes(q)));
}

function seleccionarProductoStock(uniqueId) {
  const p = App.stockDisponible.find(x => x.uniqueId === uniqueId);
  if (!p) return;
  App.productosVentaTemp.push({ nombre: p.nombre, cantidad: p.cantidad || 1, precioCompra: p.precioCompra, precioVenta: p.precioVentaSugerido || 0, sourceType: 'stock', sourceId: p.sourceId, indexEnCompra: p.indexEnCompra, serie: p.serie, modelo: p.modelo });
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
  if (productos.length === 0) return toast('⚠️ Agrega productos con precio');
  const cliente = DB.clientes.find(c => c.id === clienteId);
  if (!cliente) return toast('⚠️ Cliente no encontrado');
  const total = productos.reduce((s, p) => s + ((parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1)), 0);
  if (tipoPago === 'credito' && prima > total) return toast('⚠️ Prima mayor al total');
  const saldo = tipoPago === 'contado' ? 0 : Math.max(0, total - prima);
  const cuota = tipoPago === 'credito' && meses > 0 ? saldo / meses : 0;
  const editando = !!App.ventaEnEdicion;
  if (!editando && DB.ventas.some(v => v.id === id)) return toast('⚠️ Ya existe ese ID');
  if (editando) await liberarProductosDeVenta(App.ventaEnEdicion);
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
  const venta = { id, clienteId, cliente: cliente.nombre, telefono: cliente.telefono, fecha, productos, precioTotal: total, prima, saldo, pagado: prima, meses, cuotaMensual: cuota, estado: saldo <= 0 ? 'PAGADO' : 'PENDIENTE', proximaFechaCobro: tipoPago === 'contado' ? fecha : proximaFecha, tipoPago, frecuenciaPago: frecuencia, fechasPersonalizadas: [], lastModified: Date.now() };
  await DB.guardarVenta(venta);
  const idx = DB.ventas.findIndex(v => v.id === id);
  if (idx >= 0) DB.ventas[idx] = venta; else DB.ventas.push(venta);
  if (prima > 0) {
    for (const c of DB.cobros.filter(x => x.ventaId === id && x.origen === 'prima')) { await DB.eliminarCobro(c.id); DB.cobros = DB.cobros.filter(x => x.id !== c.id); }
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
  if (!confirm(`¿Eliminar la venta ${App.ventaEnEdicion.id}?`)) return;
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
        ${v.tipoPago === 'credito' ? `<div class="flex justify-between text-sm"><span>Cuota:</span><span class="font-bold">${fmtC(v.cuotaMensual)}</span></div><div class="flex justify-between text-sm"><span>Próximo:</span><span class="font-bold">${fmtFecha(v.proximaFechaCobro)}</span></div>` : ''}
      </div>
      <div><p class="font-bold text-sm mb-2">Productos (${v.productos.length})</p>
        <div class="space-y-2 max-h-40 overflow-y-auto">${v.productos.map(p => `<div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3"><p class="font-medium text-sm">${p.nombre}</p><p class="text-xs text-slate-500">${p.cantidad} × ${fmtC(p.precioVenta)}${p.serie ? ' · S/N: ' + p.serie : ''}</p></div>`).join('')}</div>
      </div>
      ${cobros.length > 0 ? `<div><p class="font-bold text-sm mb-2">Cobros (${cobros.length})</p>
        <div class="space-y-2 max-h-40 overflow-y-auto">${cobros.map(c => `<div class="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 flex justify-between items-center"><div><p class="text-sm font-medium">${fmtFecha(c.fecha)}</p><p class="text-xs">${c.metodo}${c.notas ? ' · ' + c.notas : ''}</p></div><p class="font-bold text-brand-700">${fmtC(c.monto)}</p></div>`).join('')}</div>
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
    </div>`;
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
function abrirModalClienteRapido() { abrirModalCliente(); }

async function guardarCliente() {
  const nombre = document.getElementById('clienteNombre').value.trim();
  if (!nombre) return toast('⚠️ Ingresa el nombre');
  const cliente = { id: document.getElementById('clienteId').value || 'cli_' + generarId(), nombre, telefono: document.getElementById('clienteTelefono').value.trim(), notas: document.getElementById('clienteNotas').value.trim(), lastModified: Date.now() };
  await DB.guardarCliente(cliente);
  const idx = DB.clientes.findIndex(c => c.id === cliente.id);
  if (idx >= 0) DB.clientes[idx] = cliente; else DB.clientes.push(cliente);
  const ventaCliente = document.getElementById('ventaCliente');
  if (ventaCliente) {
    ventaCliente.innerHTML = '<option value="">Seleccione...</option>' + DB.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    ventaCliente.value = cliente.id;
  }
  toast('✅ Cliente guardado');
  cerrarModales();
  if (App.seccionActual === 'ventas' && App.subseccion === 'clientes') navegar('ventas', 'clientes');
}

async function eliminarCliente() {
  if (!App.clienteEnEdicion) return;
  const ventas = DB.ventas.filter(v => v.clienteId === App.clienteEnEdicion.id);
  if (ventas.length > 0) return toast(`⚠️ Tiene ${ventas.length} ventas`);
  if (!confirm(`¿Eliminar a "${App.clienteEnEdicion.nombre}"?`)) return;
  await DB.eliminarCliente(App.clienteEnEdicion.id);
  DB.clientes = DB.clientes.filter(c => c.id !== App.clienteEnEdicion.id);
  toast('🗑️ Cliente eliminado');
  cerrarModales();
  navegar('ventas', 'clientes');
}

/* ═══════════ COBROS ═══════════ */
function abrirModalCobro() {
  document.getElementById('tituloModalCobro').textContent = 'Registrar Cobro';
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
  const res = DB.ventas.filter(v => v.estado === 'PENDIENTE' && (v.id.toUpperCase().includes(q) || v.cliente.toUpperCase().includes(q)));
  cont.innerHTML = res.length === 0 ? '<p class="text-center text-sm text-slate-500 py-2">Sin resultados</p>' :
    res.map(v => `<div onclick="seleccionarVentaParaCobro('${v.id}')" class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-900/20"><p class="font-semibold text-sm">${v.cliente}</p><div class="flex justify-between text-xs text-slate-500"><span>${v.id}</span><span>Saldo: ${fmtC(v.saldo)}</span></div></div>`).join('');
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
  const v = DB.ventas.find(x => x.id === ventaId);
  if (!v) return;
  if (monto > (parseFloat(v.saldo) || 0) + 0.01) return toast(`⚠️ Monto supera saldo (${fmtC(v.saldo)})`);
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
  navegar(App.seccionActual);
}

/* ═══════════ PAGOS A PROVEEDOR ═══════════ */
function abrirModalPago() {
  document.getElementById('tituloModalPago').textContent = 'Pago a Proveedor';
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
  navegar(App.seccionActual);
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

/* ═══════════ REPORTES ═══════════ */
function renderReportes(el) {
  // Inicializar rango por defecto: mes actual
  if (!App.rangoReporte.desde) {
    const hoy = new Date();
    App.rangoReporte.desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    App.rangoReporte.hasta = hoyISO();
  }

  el.innerHTML = `
    <div class="anim-in space-y-4">
      <h2 class="text-xl font-extrabold text-slate-800 dark:text-white">Reportes</h2>

      <div class="card">
        <label class="lbl">Rango de fechas</label>
        <div class="date-range">
          <input type="date" id="repDesde" class="inp" value="${App.rangoReporte.desde}">
          <span class="text-slate-400">→</span>
          <input type="date" id="repHasta" class="inp" value="${App.rangoReporte.hasta}">
        </div>
        <div class="grid grid-cols-3 gap-2 mt-3">
          <button onclick="setRango('hoy')" class="text-xs py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium">Hoy</button>
          <button onclick="setRango('mes')" class="text-xs py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium">Este mes</button>
          <button onclick="setRango('año')" class="text-xs py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium">Este año</button>
        </div>
        <button onclick="aplicarRangoReporte()" class="btn-primary w-full mt-3 text-sm">Aplicar</button>
      </div>

      <div id="resultadosReporte"></div>
    </div>
  `;
  setTimeout(() => aplicarRangoReporte(), 100);
}

function setRango(tipo) {
  const hoy = new Date();
  if (tipo === 'hoy') {
    App.rangoReporte.desde = hoyISO();
    App.rangoReporte.hasta = hoyISO();
  } else if (tipo === 'mes') {
    App.rangoReporte.desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    App.rangoReporte.hasta = hoyISO();
  } else if (tipo === 'año') {
    App.rangoReporte.desde = new Date(hoy.getFullYear(), 0, 1).toISOString().split('T')[0];
    App.rangoReporte.hasta = hoyISO();
  }
  document.getElementById('repDesde').value = App.rangoReporte.desde;
  document.getElementById('repHasta').value = App.rangoReporte.hasta;
  aplicarRangoReporte();
}

function aplicarRangoReporte() {
  App.rangoReporte.desde = document.getElementById('repDesde').value;
  App.rangoReporte.hasta = document.getElementById('repHasta').value;
  const { desde, hasta } = App.rangoReporte;

  const enRango = (f) => f >= desde && f <= hasta;

  const ventas = DB.ventas.filter(v => enRango(v.fecha));
  const cobros = DB.cobros.filter(c => enRango(c.fecha));
  const compras = DB.compras.filter(c => enRango(c.fecha));
  const pagos = DB.pagosProveedor.filter(p => enRango(p.fecha));

  const totalVentas = ventas.reduce((s, v) => s + (parseFloat(v.precioTotal) || 0), 0);
  const totalCobros = cobros.reduce((s, c) => s + (parseFloat(c.monto) || 0), 0);
  const totalCompras = compras.reduce((s, c) => s + (parseFloat(c.total) || 0), 0);
  const totalPagos = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const utilidadBruta = ventas.reduce((s, v) => {
    const costo = (v.productos || []).reduce((c, p) => c + (parseFloat(p.precioCompra) || 0) * (parseInt(p.cantidad) || 1), 0);
    return s + ((parseFloat(v.precioTotal) || 0) - costo);
  }, 0);

  const gananciaNeta = totalCobros - totalPagos;

  const cont = document.getElementById('resultadosReporte');
  cont.innerHTML = `
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="kpi"><p class="text-[11px] text-slate-500">Ventas del período</p><p class="text-lg font-extrabold text-brand-600">${fmtC(totalVentas)}</p><p class="text-xs text-slate-500">${ventas.length} ventas</p></div>
      <div class="kpi"><p class="text-[11px] text-slate-500">Cobros del período</p><p class="text-lg font-extrabold text-emerald-600">${fmtC(totalCobros)}</p><p class="text-xs text-slate-500">${cobros.length} cobros</p></div>
      <div class="kpi"><p class="text-[11px] text-slate-500">Compras del período</p><p class="text-lg font-extrabold text-rose-600">${fmtC(totalCompras)}</p><p class="text-xs text-slate-500">${compras.length} compras</p></div>
      <div class="kpi"><p class="text-[11px] text-slate-500">Pagos a proveedores</p><p class="text-lg font-extrabold text-orange-600">${fmtC(totalPagos)}</p><p class="text-xs text-slate-500">${pagos.length} pagos</p></div>
    </div>

    <div class="card mb-4">
      <h3 class="font-bold text-sm text-slate-800 dark:text-white mb-2">💰 Utilidad</h3>
      <div class="report-row"><span>Utilidad bruta (ventas - costo)</span><span class="font-bold text-brand-600">${fmtC(utilidadBruta)}</span></div>
      <div class="report-row"><span>Cobrado - Pagado</span><span class="font-bold ${gananciaNeta >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${fmtC(gananciaNeta)}</span></div>
    </div>

    <div class="card mb-4">
      <h3 class="font-bold text-sm text-slate-800 dark:text-white mb-3">📊 Resumen por mes (últimos 6)</h3>
      <div class="chart-container"><canvas id="chartRepVentas"></canvas></div>
    </div>

    <div class="card">
      <h3 class="font-bold text-sm text-slate-800 dark:text-white mb-3">🏆 Top 5 del período</h3>
      <div id="topPeriodo">${renderTopPeriodo(ventas)}</div>
    </div>

    <div class="grid grid-cols-2 gap-3 mt-4">
      <button onclick="exportarReportePDF()" class="btn-primary text-sm">📄 Exportar PDF</button>
      <button onclick="compartirReporte()" class="btn-accent text-sm">💬 Compartir</button>
    </div>
  `;

  // Gráfica del reporte
  setTimeout(() => {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const ventasMes = ventasPorMes(6);
    const ctx = document.getElementById('chartRepVentas');
    if (ctx) {
      App.charts.repVentas = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ventasMes.map(v => v.label),
          datasets: [{ label: 'Ventas', data: ventasMes.map(v => v.total), backgroundColor: '#6366f1', borderRadius: 8, maxBarThickness: 40 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { color: textColor, callback: v => 'C$' + (v/1000).toFixed(0) + 'k' }, grid: { color: gridColor } },
            x: { ticks: { color: textColor }, grid: { display: false } }
          }
        }
      });
    }
  }, 50);
}

function renderTopPeriodo(ventas) {
  const contador = {};
  ventas.forEach(v => {
    (v.productos || []).forEach(p => {
      const k = p.nombre || 'Sin nombre';
      if (!contador[k]) contador[k] = { cantidad: 0, ingresos: 0 };
      contador[k].cantidad += parseInt(p.cantidad) || 1;
      contador[k].ingresos += (parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1);
    });
  });
  const top = Object.entries(contador).map(([nombre, d]) => ({ nombre, ...d })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
  if (top.length === 0) return '<p class="text-center text-slate-500 text-sm py-4">Sin datos</p>';
  return `<div class="space-y-2">${top.map((t, i) => `
    <div class="report-row">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 flex items-center justify-center text-xs font-bold shrink-0">${i+1}</span>
        <span class="text-sm font-medium truncate">${t.nombre}</span>
      </div>
      <div class="text-right shrink-0">
        <p class="text-sm font-bold">${t.cantidad} uds</p>
        <p class="text-xs text-slate-500">${fmtC(t.ingresos)}</p>
      </div>
    </div>`).join('')}</div>`;
}

function exportarReportePDF() {
  const { desde, hasta } = App.rangoReporte;
  const ventas = DB.ventas.filter(v => v.fecha >= desde && v.fecha <= hasta);
  const cobros = DB.cobros.filter(c => c.fecha >= desde && c.fecha <= hasta);
  const compras = DB.compras.filter(c => c.fecha >= desde && c.fecha <= hasta);
  const pagos = DB.pagosProveedor.filter(p => p.fecha >= desde && p.fecha <= hasta);

  const totalVentas = ventas.reduce((s, v) => s + (parseFloat(v.precioTotal) || 0), 0);
  const totalCobros = cobros.reduce((s, c) => s + (parseFloat(c.monto) || 0), 0);
  const totalCompras = compras.reduce((s, c) => s + (parseFloat(c.total) || 0), 0);
  const totalPagos = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const utilidadBruta = ventas.reduce((s, v) => {
    const costo = (v.productos || []).reduce((c, p) => c + (parseFloat(p.precioCompra) || 0) * (parseInt(p.cantidad) || 1), 0);
    return s + ((parseFloat(v.precioTotal) || 0) - costo);
  }, 0);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18); doc.setTextColor(79,70,229);
  doc.text('VARIEDADES KAREN', 105, 20, null, null, 'center');
  doc.setFontSize(11); doc.setTextColor(0);
  doc.text('Reporte de Gestión', 105, 28, null, null, 'center');
  doc.setFontSize(10);
  doc.text(`Período: ${fmtFecha(desde)} al ${fmtFecha(hasta)}`, 105, 36, null, null, 'center');
  doc.setFontSize(12);
  let y = 55;
  doc.text('RESUMEN GENERAL', 20, y); y += 10;
  doc.setFontSize(10);
  doc.text(`Ventas del período: ${ventas.length}  |  Total: ${fmtC(totalVentas)}`, 20, y); y += 8;
  doc.text(`Cobros del período: ${cobros.length}  |  Total: ${fmtC(totalCobros)}`, 20, y); y += 8;
  doc.text(`Compras del período: ${compras.length}  |  Total: ${fmtC(totalCompras)}`, 20, y); y += 8;
  doc.text(`Pagos a proveedores: ${pagos.length}  |  Total: ${fmtC(totalPagos)}`, 20, y); y += 8;
  doc.text(`Utilidad bruta: ${fmtC(utilidadBruta)}`, 20, y); y += 15;
  doc.setFontSize(12);
  doc.text('TOP 5 PRODUCTOS', 20, y); y += 10;
  doc.setFontSize(10);
  const contador = {};
  ventas.forEach(v => (v.productos || []).forEach(p => {
    const k = p.nombre || 'Sin nombre';
    if (!contador[k]) contador[k] = { cantidad: 0, ingresos: 0 };
    contador[k].cantidad += parseInt(p.cantidad) || 1;
    contador[k].ingresos += (parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1);
  }));
  const top = Object.entries(contador).map(([n, d]) => ({ nombre: n, ...d })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
  top.forEach((t, i) => { doc.text(`${i+1}. ${t.nombre} - ${t.cantidad} uds - ${fmtC(t.ingresos)}`, 25, y); y += 7; });
  y += 10;
  doc.setFontSize(10); doc.setTextColor(79,70,229);
  doc.text('Variedades Karen - Sistema de Gestión', 105, y, null, null, 'center');
  doc.save(`Reporte_${desde}_a_${hasta}.pdf`);
  toast('📄 Reporte exportado');
}

function compartirReporte() {
  const { desde, hasta } = App.rangoReporte;
  const ventas = DB.ventas.filter(v => v.fecha >= desde && v.fecha <= hasta);
  const cobros = DB.cobros.filter(c => c.fecha >= desde && c.fecha <= hasta);
  const totalVentas = ventas.reduce((s, v) => s + (parseFloat(v.precioTotal) || 0), 0);
  const totalCobros = cobros.reduce((s, c) => s + (parseFloat(c.monto) || 0), 0);
  const msg = `🦋 *VARIEDADES KAREN* 🦋\n\n📊 *Reporte del período*\nDel ${fmtFecha(desde)} al ${fmtFecha(hasta)}\n\n` +
    `💰 Ventas: ${fmtC(totalVentas)} (${ventas.length})\n` +
    `✅ Cobros: ${fmtC(totalCobros)} (${cobros.length})\n\n🌹 Sistema de Gestión`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
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
          <p>Versión: 3.0 (Fase 3)</p>
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
  const proveedor = { id: document.getElementById('provId').value || 'prov_' + generarId(), nombre, telefono: document.getElementById('provTelefono').value.trim(), tipo: document.getElementById('provTipo').value, notas: document.getElementById('provNotas').value.trim(), lastModified: Date.now() };
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
  if (compras.length > 0) return toast(`⚠️ Tiene ${compras.length} compras`);
  if (!confirm(`¿Eliminar a "${App.proveedorEnEdicion.nombre}"?`)) return;
  await DB.eliminarProveedor(App.proveedorEnEdicion.id);
  DB.proveedores = DB.proveedores.filter(p => p.id !== App.proveedorEnEdicion.id);
  toast('🗑️ Proveedor eliminado');
  cerrarModales();
  navegar('mas');
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
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
      (texto) => {
        document.getElementById('resultadoEscaner').textContent = '✅ ' + texto;
        if (App.productoEscanerDestino) {
          const { contexto, index, campo } = App.productoEscanerDestino;
          if (contexto === 'compra') { App.productosCompraTemp[index][campo] = texto; renderProductosCompraTemp(); }
          else if (contexto === 'venta') { App.productosVentaTemp[index][campo] = texto; renderProductosVentaTemp(); }
          toast('✅ Código capturado');
        }
        cerrarEscaner();
      }, () => {}
    ).catch(e => { toast('❌ No se pudo abrir la cámara'); cerrarEscaner(); });
  }, 300);
}

function cerrarEscaner() {
  if (App.scannerActivo) {
    App.scannerActivo.stop().then(() => { App.scannerActivo.clear(); App.scannerActivo = null; }).catch(() => { App.scannerActivo = null; });
  }
  App.productoEscanerDestino = null;
  cerrarModales();
}

/* ═══════════ PDF VENTA ═══════════ */
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
  msg += `*ID:* ${v.id}\n*Cliente:* ${v.cliente}\n*Fecha:* ${fmtFecha(v.fecha)}\n\n*PRODUCTOS:*\n`;
  v.productos.forEach((p, i) => { msg += `${i+1}. ${p.nombre} x${p.cantidad} - C$${((parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1)).toLocaleString()}\n`; });
  msg += `\n*TOTAL:* C$${(v.precioTotal).toLocaleString()}\n*Tipo:* ${v.tipoPago === 'contado' ? 'Contado' : 'Crédito'}\n`;
  if (v.tipoPago === 'credito') msg += `*Prima:* C$${(v.prima).toLocaleString()}\n*Saldo:* C$${(v.saldo).toLocaleString()}\n*Cuota:* C$${(v.cuotaMensual).toLocaleString()}\n*Próximo:* ${fmtFecha(v.proximaFechaCobro)}\n`;
  msg += `\n🌹 ¡Gracias por su compra! 🌹`;
  const tel = (v.telefono || '').replace(/[^0-9]/g, '');
  window.open(tel ? `https://wa.me/505${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ═══════════ MODALES ═══════════ */
function abrirModal(id) {
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
  const card = document.querySelector(`#${id} > div`);
  if (card) card.classList.add('slide-up');
}
function cerrarModales() {
  if (App.scannerActivo) { try { App.scannerActivo.stop(); App.scannerActivo.clear(); } catch(e){} App.scannerActivo = null; }
  document.getElementById('modalOverlay').classList.add('hidden');
  ['modalProveedor','modalCompra','modalPagoProveedor','modalVenta','modalCliente','modalCobro','modalSelectorProductos','modalEscaner','modalBackup','modalContenido','modalNotificaciones'].forEach(id => {
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
  const datos = { version: 3, exportadoEn: new Date().toISOString(), app: 'Variedades Karen', proveedores: DB.proveedores, compras: DB.compras, ventas: DB.ventas, clientes: DB.clientes, pagosProveedor: DB.pagosProveedor, cobros: DB.cobros };
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