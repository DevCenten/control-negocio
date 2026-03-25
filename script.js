// Datos persistentes
let lotes = JSON.parse(localStorage.getItem('lotes')) || [];
let ventas = JSON.parse(localStorage.getItem('ventas')) || [];
let abonos = JSON.parse(localStorage.getItem('abonos')) || [];
let cobros = JSON.parse(localStorage.getItem('cobros')) || [];

// Variables temporales
let productosLoteTemp = [];
let productosVentaTemp = [];
let ventaSeleccionadaCobro = null;

// Inicialización
window.onload = function() {
  // Cargar datos iniciales si no hay datos
  if (lotes.length === 0 && typeof initialLotes !== 'undefined') {
    lotes = JSON.parse(JSON.stringify(initialLotes));
  }
  if (ventas.length === 0 && typeof initialVentas !== 'undefined') {
    ventas = JSON.parse(JSON.stringify(initialVentas));
  }
  
  saveData();
  showSection('lotes');
  updateResumen();
  
  // Registrar Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW registrado'))
      .catch(err => console.log('Error SW:', err));
  }
};

// Guardar datos
function saveData() {
  localStorage.setItem('lotes', JSON.stringify(lotes));
  localStorage.setItem('ventas', JSON.stringify(ventas));
  localStorage.setItem('abonos', JSON.stringify(abonos));
  localStorage.setItem('cobros', JSON.stringify(cobros));
  updateResumen();
}

// Actualizar resumen general
function updateResumen() {
  // Deuda con Carmen (suma de saldos pendientes de lotes)
  const deudaCarmen = lotes.reduce((sum, l) => sum + (l.saldoPendiente || 0), 0);
  
  // Clientes me deben
  const clientesDeben = ventas.reduce((sum, v) => sum + (v.saldo || 0), 0);
  
  // Total inventario (productos en lotes no vendidos)
  let totalInventario = 0;
  lotes.forEach(lote => {
    lote.productos?.forEach(prod => {
      if (!prod.vendido) {
        totalInventario += (prod.precioCarmen || 0) * (prod.cantidad || 1);
      }
    });
  });
  
  // Ganancia estimada (35% sobre precio de venta total)
  const gananciaEstimada = ventas.reduce((sum, v) => {
    const costo = v.productos?.reduce((c, p) => c + ((p.precioCarmen || 0) * (p.cantidad || 1)), 0) || 0;
    return sum + ((v.precioTotal || 0) - costo);
  }, 0);
  
  // Ventas activas (pendientes)
  const ventasActivas = ventas.filter(v => v.estado === 'PENDIENTE').length;
  
  // Lotes pendientes
  const lotesPendientes = lotes.filter(l => l.estado === 'PENDIENTE').length;
  
  // Próximos cobros (vencen este mes)
  const hoy = new Date();
  const proximosCobros = ventas.filter(v => {
    if (v.estado !== 'PENDIENTE') return false;
    const proximaFecha = new Date(v.proximaFechaCobro);
    return proximaFecha.getMonth() === hoy.getMonth() && proximaFecha.getFullYear() === hoy.getFullYear();
  }).length;

  // Actualizar DOM
  document.getElementById('deudaCarmen').textContent = `C$${deudaCarmen.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('clientesDeben').textContent = `C$${clientesDeben.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('totalInventario').textContent = `C$${totalInventario.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('gananciaEstimada').textContent = `C$${gananciaEstimada.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('ventasActivas').textContent = ventasActivas;
  document.getElementById('lotesPendientes').textContent = lotesPendientes;
  document.getElementById('proximosCobros').textContent = proximosCobros;
  
  // Próximo pago a Carmen
  const lotesPend = lotes.filter(l => l.estado === 'PENDIENTE');
  if (lotesPend.length > 0) {
    const proximo = lotesPend.sort((a, b) => new Date(a.fechaLimite) - new Date(b.fechaLimite))[0];
    const diasRestantes = Math.ceil((new Date(proximo.fechaLimite) - hoy) / (1000 * 60 * 60 * 24));
    const textoDias = diasRestantes < 0 ? `Venció hace ${Math.abs(diasRestantes)} días` : 
                      diasRestantes === 0 ? 'Vence hoy' : 
                      `Vence en ${diasRestantes} días`;
    document.getElementById('proximoPagoCarmen').textContent = `${proximo.id}: ${textoDias}`;
  } else {
    document.getElementById('proximoPagoCarmen').textContent = 'Sin deuda';
  }
}

// Navegación entre secciones
function showSection(section) {
  // Ocultar todas las secciones
  ['lotes', 'ventas', 'abonos', 'cobros'].forEach(s => {
    document.getElementById(`section${s.charAt(0).toUpperCase() + s.slice(1)}`).classList.add('hidden');
  });
  
  // Mostrar sección seleccionada
  document.getElementById(`section${section.charAt(0).toUpperCase() + section.slice(1)}`).classList.remove('hidden');
  
  // Renderizar contenido
  if (section === 'lotes') renderLotes();
  else if (section === 'ventas') renderVentas();
  else if (section === 'abonos') renderAbonos();
  else if (section === 'cobros') renderCobros();
}

// Mostrar formularios
function showForm(type) {
  hideForms();
  document.getElementById('formOverlay').classList.remove('hidden');
  document.getElementById(`form${type.charAt(0).toUpperCase() + type.slice(1)}`).classList.remove('hidden');
  
  // Inicializar valores por defecto
  if (type === 'lote') {
    productosLoteTemp = [];
    document.getElementById('loteFecha').valueAsDate = new Date();
    // Fecha límite default: 2 meses desde hoy
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() + 2);
    document.getElementById('loteFechaLimite').valueAsDate = fechaLimite;
    renderProductosLote();
  } else if (type === 'venta') {
    productosVentaTemp = [];
    document.getElementById('ventaFecha').valueAsDate = new Date();
    document.getElementById('ventaMeses').value = '12';
    renderProductosVenta();
    calcularVenta();
  } else if (type === 'abono') {
    cargarSelectLotes();
    document.getElementById('abonoFecha').valueAsDate = new Date();
  } else if (type === 'cobro') {
    document.getElementById('cobroFecha').valueAsDate = new Date();
    document.getElementById('cobroBusqueda').value = '';
    document.getElementById('resultadosBusquedaCobro').classList.add('hidden');
    document.getElementById('infoVentaCobro').classList.add('hidden');
    ventaSeleccionadaCobro = null;
  }
}

function hideForms() {
  document.getElementById('formOverlay').classList.add('hidden');
  ['formLote', 'formVenta', 'formAbono', 'formCobro'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
}

// ========== GESTIÓN DE LOTES ==========

function agregarProductoLote() {
  const id = productosLoteTemp.length + 1;
  productosLoteTemp.push({ id, nombre: '', cantidad: 1, precioCarmen: 0 });
  renderProductosLote();
}

function renderProductosLote() {
  const container = document.getElementById('productosLoteContainer');
  let total = 0;
  
  container.innerHTML = productosLoteTemp.map((prod, idx) => {
    total += (prod.precioCarmen || 0) * (prod.cantidad || 1);
    return `
      <div class="flex gap-2 items-center bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
        <div class="flex-1">
          <input type="text" placeholder="Nombre del producto" value="${prod.nombre}" 
            onchange="actualizarProductoLote(${idx}, 'nombre', this.value)"
            class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white mb-2">
          <div class="flex gap-2">
            <input type="number" placeholder="Cant" value="${prod.cantidad}" min="1"
              onchange="actualizarProductoLote(${idx}, 'cantidad', parseInt(this.value)||1)"
              class="w-20 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white">
            <input type="number" placeholder="Precio Carmen" value="${prod.precioCarmen || ''}" min="0" step="0.01"
              onchange="actualizarProductoLote(${idx}, 'precioCarmen', parseFloat(this.value)||0)"
              class="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white">
          </div>
        </div>
        <button onclick="eliminarProductoLote(${idx})" class="text-red-500 hover:text-red-700 p-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
    `;
  }).join('');
  
  document.getElementById('previewTotalLote').textContent = `C$${total.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
}

function actualizarProductoLote(idx, campo, valor) {
  productosLoteTemp[idx][campo] = valor;
  if (campo === 'cantidad' || campo === 'precioCarmen') renderProductosLote();
}

function eliminarProductoLote(idx) {
  productosLoteTemp.splice(idx, 1);
  renderProductosLote();
}

function addLote() {
  const id = document.getElementById('loteId').value.trim().toUpperCase();
  const fecha = document.getElementById('loteFecha').value;
  const fechaLimite = document.getElementById('loteFechaLimite').value;
  
  if (!id || !fecha || !fechaLimite) {
    alert('Completa todos los campos obligatorios');
    return;
  }
  
  if (lotes.some(l => l.id === id)) {
    alert('Ya existe un lote con este ID');
    return;
  }
  
  if (productosLoteTemp.length === 0 || productosLoteTemp.every(p => !p.nombre)) {
    alert('Agrega al menos un producto');
    return;
  }
  
  // Filtrar productos válidos
  const productosValidos = productosLoteTemp.filter(p => p.nombre && p.precioCarmen > 0);
  const totalInicial = productosValidos.reduce((sum, p) => sum + (p.precioCarmen * p.cantidad), 0);
  
  lotes.push({
    id,
    fechaRecepcion: fecha,
    fechaLimite,
    totalInicial,
    abonado: 0,
    saldoPendiente: totalInicial,
    estado: 'PENDIENTE',
    productos: productosValidos.map(p => ({...p, vendido: false}))
  });
  
  saveData();
  renderLotes();
  hideForms();
  showToast('Lote guardado exitosamente');
}

function renderLotes() {
  const container = document.getElementById('listaLotes');
  
  if (lotes.length === 0) {
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8 italic">No hay lotes registrados</p>';
    return;
  }
  
  // Ordenar por fecha límite (más urgentes primero)
  const lotesOrdenados = [...lotes].sort((a, b) => new Date(a.fechaLimite) - new Date(b.fechaLimite));
  
  container.innerHTML = lotesOrdenados.map(lote => {
    const isPending = lote.estado === 'PENDIENTE';
    const progress = lote.totalInicial > 0 ? ((lote.totalInicial - lote.saldoPendiente) / lote.totalInicial * 100) : 0;
    const diasRestantes = Math.ceil((new Date(lote.fechaLimite) - new Date()) / (1000 * 60 * 60 * 24));
    const alertaVencimiento = diasRestantes <= 7 && isPending ? 'animate-pulse' : '';
    
    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 border ${isPending ? 'border-red-200 dark:border-red-800' : 'border-green-200 dark:border-green-800'} ${alertaVencimiento}">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
              ${lote.id}
              ${diasRestantes <= 7 && isPending ? '<span class="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">¡Pronto!</span>' : ''}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Recibido: ${formatFecha(lote.fechaRecepcion)}</p>
            <p class="text-xs ${diasRestantes < 0 ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-gray-400'}">
              Límite: ${formatFecha(lote.fechaLimite)} ${diasRestantes < 0 ? '(Vencido)' : ''}
            </p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold ${isPending ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'}">
            ${lote.estado}
          </span>
        </div>
        
        <div class="grid grid-cols-3 gap-2 mb-3 text-center">
          <div class="bg-gray-50 dark:bg-slate-700 p-2 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p class="font-bold text-sm text-gray-800 dark:text-white">C$${lote.totalInicial.toLocaleString()}</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-700 p-2 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-gray-400">Abonado</p>
            <p class="font-bold text-sm text-green-600 dark:text-green-400">C$${lote.abonado.toLocaleString()}</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-700 p-2 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
            <p class="font-bold text-sm text-red-600 dark:text-red-400">C$${lote.saldoPendiente.toLocaleString()}</p>
          </div>
        </div>
        
        <div class="mb-3">
          <div class="flex justify-between text-xs mb-1">
            <span class="text-gray-600 dark:text-gray-400">Progreso de pago</span>
            <span class="font-medium">${progress.toFixed(1)}%</span>
          </div>
          <div class="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full ${isPending ? 'bg-red-500' : 'bg-green-500'} transition-all duration-500" style="width: ${progress}%"></div>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button onclick="verDetalleLote('${lote.id}')" class="flex-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 py-2 rounded-xl text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors">
            Ver Detalle
          </button>
          <button onclick="eliminarLote('${lote.id}')" class="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function verDetalleLote(loteId) {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote) return;
  
  document.getElementById('tituloDetalleLote').textContent = `Detalle ${lote.id}`;
  
  const productosHtml = lote.productos?.map(p => `
    <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-xl ${p.vendido ? 'opacity-50' : ''}">
      <div>
        <p class="font-medium text-gray-800 dark:text-white ${p.vendido ? 'line-through' : ''}">${p.nombre}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">Cant: ${p.cantidad} × C$${p.precioCarmen.toLocaleString()}</p>
      </div>
      <div class="text-right">
        <p class="font-bold text-gray-800 dark:text-white">C$${(p.precioCarmen * p.cantidad).toLocaleString()}</p>
        ${p.vendido ? '<span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Vendido</span>' : '<span class="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">En stock</span>'}
      </div>
    </div>
  `).join('') || '<p class="text-gray-500 text-center">Sin productos</p>';
  
  const abonosLote = abonos.filter(a => a.loteId === loteId);
  const abonosHtml = abonosLote.length > 0 ? abonosLote.map(a => `
    <div class="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm">
      <div>
        <p class="font-medium text-purple-800 dark:text-purple-300">${formatFecha(a.fecha)}</p>
        <p class="text-xs text-purple-600 dark:text-purple-400">${a.metodo} ${a.notas ? '- ' + a.notas : ''}</p>
      </div>
      <p class="font-bold text-purple-800 dark:text-purple-300">C$${a.monto.toLocaleString()}</p>
    </div>
  `).join('') : '<p class="text-gray-500 text-sm text-center italic">Sin abonos registrados</p>';
  
  document.getElementById('contenidoDetalleLote').innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl">
          <p class="text-xs text-indigo-600 dark:text-indigo-400">Total Inicial</p>
          <p class="text-lg font-bold text-indigo-800 dark:text-indigo-300">C$${lote.totalInicial.toLocaleString()}</p>
        </div>
        <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
          <p class="text-xs text-red-600 dark:text-red-400">Saldo Pendiente</p>
          <p class="text-lg font-bold text-red-800 dark:text-red-300">C$${lote.saldoPendiente.toLocaleString()}</p>
        </div>
      </div>
      
      <div>
        <h4 class="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
          <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
          Productos (${lote.productos?.length || 0})
        </h4>
        <div class="space-y-2 max-h-48 overflow-y-auto">
          ${productosHtml}
        </div>
      </div>
      
      <div>
        <h4 class="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
          <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Historial de Abonos (${abonosLote.length})
        </h4>
        <div class="space-y-2 max-h-40 overflow-y-auto">
          ${abonosHtml}
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('modalDetalleLote').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

function eliminarLote(loteId) {
  if (!confirm('¿Eliminar este lote? Se perderán todos los datos asociados.')) return;
  
  const idx = lotes.findIndex(l => l.id === loteId);
  if (idx > -1) {
    lotes.splice(idx, 1);
    // Eliminar abonos asociados
    abonos = abonos.filter(a => a.loteId !== loteId);
    saveData();
    renderLotes();
    showToast('Lote eliminado');
  }
}

// ========== GESTIÓN DE VENTAS ==========

function agregarProductoVenta() {
  const id = productosVentaTemp.length + 1;
  productosVentaTemp.push({ id, nombre: '', cantidad: 1, precioCarmen: 0, precioVenta: 0 });
  renderProductosVenta();
}

function renderProductosVenta() {
  const container = document.getElementById('productosVentaContainer');
  
  container.innerHTML = productosVentaTemp.map((prod, idx) => `
    <div class="flex gap-2 items-center bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
      <div class="flex-1">
        <input type="text" placeholder="Producto" value="${prod.nombre}" 
          onchange="actualizarProductoVenta(${idx}, 'nombre', this.value)"
          class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white mb-2">
        <div class="flex gap-2">
          <input type="number" placeholder="Cant" value="${prod.cantidad}" min="1"
            onchange="actualizarProductoVenta(${idx}, 'cantidad', parseInt(this.value)||1)"
            class="w-16 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white">
          <input type="number" placeholder="Costo" value="${prod.precioCarmen || ''}" min="0" step="0.01"
            onchange="actualizarProductoVenta(${idx}, 'precioCarmen', parseFloat(this.value)||0)"
            class="w-24 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white">
          <input type="number" placeholder="Venta" value="${prod.precioVenta || ''}" min="0" step="0.01"
            onchange="actualizarProductoVenta(${idx}, 'precioVenta', parseFloat(this.value)||0); calcularVenta();"
            class="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white bg-green-50 dark:bg-green-900/20">
        </div>
      </div>
      <button onclick="eliminarProductoVenta(${idx})" class="text-red-500 hover:text-red-700 p-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      </button>
    </div>
  `).join('');
  
  calcularVenta();
}

function actualizarProductoVenta(idx, campo, valor) {
  productosVentaTemp[idx][campo] = valor;
}

function eliminarProductoVenta(idx) {
  productosVentaTemp.splice(idx, 1);
  renderProductosVenta();
}

function calcularVenta() {
  const total = productosVentaTemp.reduce((sum, p) => sum + ((p.precioVenta || 0) * (p.cantidad || 1)), 0);
  const prima = parseFloat(document.getElementById('ventaPrima').value) || 0;
  const meses = parseInt(document.getElementById('ventaMeses').value) || 12;
  const saldo = Math.max(0, total - prima);
  const cuota = saldo > 0 && meses > 0 ? saldo / meses : 0;
  
  document.getElementById('previewTotalVenta').textContent = `C$${total.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('previewSaldoVenta').textContent = `C$${saldo.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('previewCuotaVenta').textContent = `C$${cuota.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
}

function addVenta() {
  const id = document.getElementById('ventaId').value.trim().toUpperCase();
  const cliente = document.getElementById('ventaCliente').value.trim();
  const telefono = document.getElementById('ventaTelefono').value.trim();
  const fecha = document.getElementById('ventaFecha').value;
  const prima = parseFloat(document.getElementById('ventaPrima').value) || 0;
  const meses = parseInt(document.getElementById('ventaMeses').value) || 12;
  
  if (!id || !cliente || !fecha) {
    alert('Completa los campos obligatorios');
    return;
  }
  
  if (ventas.some(v => v.id === id)) {
    alert('Ya existe una venta con este ID');
    return;
  }
  
  const productosValidos = productosVentaTemp.filter(p => p.nombre && p.precioVenta > 0);
  if (productosValidos.length === 0) {
    alert('Agrega al menos un producto con precio de venta');
    return;
  }
  
  const precioTotal = productosValidos.reduce((sum, p) => sum + (p.precioVenta * p.cantidad), 0);
  
  if (prima > precioTotal) {
    alert('La prima no puede ser mayor que el total');
    return;
  }
  
  const saldo = precioTotal - prima;
  const cuotaMensual = saldo > 0 && meses > 0 ? saldo / meses : 0;
  
  // Calcular próxima fecha de cobro (1 mes desde la venta)
  const fechaVenta = new Date(fecha);
  const proximaFecha = new Date(fechaVenta);
  proximaFecha.setMonth(proximaFecha.getMonth() + 1);
  
  ventas.push({
    id,
    cliente,
    telefono,
    fecha,
    productos: productosValidos,
    precioTotal,
    prima,
    saldo,
    meses,
    cuotaMensual,
    pagado: prima,
    estado: saldo <= 0 ? 'PAGADO' : 'PENDIENTE',
    proximaFechaCobro: proximaFecha.toISOString().split('T')[0],
    historialCobros: []
  });
  
  // Marcar productos como vendidos en el lote (si existen)
  productosValidos.forEach(pv => {
    for (let lote of lotes) {
      const prod = lote.productos?.find(p => p.nombre === pv.nombre && !p.vendido);
      if (prod) {
        prod.vendido = true;
        break;
      }
    }
  });
  
  saveData();
  renderVentas();
  hideForms();
  showToast('Venta registrada exitosamente');
}

function renderVentas() {
  const container = document.getElementById('listaVentas');
  
  if (ventas.length === 0) {
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8 italic">No hay ventas registradas</p>';
    return;
  }
  
  // Ordenar por próximo cobro
  const ventasOrdenadas = [...ventas].sort((a, b) => new Date(a.proximaFechaCobro) - new Date(b.proximaFechaCobro));
  
  container.innerHTML = ventasOrdenadas.map(venta => {
    const isPending = venta.estado === 'PENDIENTE';
    const progress = venta.precioTotal > 0 ? ((venta.precioTotal - venta.saldo) / venta.precioTotal * 100) : 0;
    const proximoCobro = new Date(venta.proximaFechaCobro);
    const hoy = new Date();
    const diasRestantes = Math.ceil((proximoCobro - hoy) / (1000 * 60 * 60 * 24));
    
    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 border ${isPending ? 'border-orange-200 dark:border-orange-800' : 'border-green-200 dark:border-green-800'}">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="font-bold text-lg text-gray-800 dark:text-white">${venta.cliente}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">ID: ${venta.id} | ${venta.telefono || 'Sin teléfono'}</p>
            <p class="text-xs ${diasRestantes < 0 ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-gray-400'}">
              Próximo cobro: ${formatFecha(venta.proximaFechaCobro)} ${diasRestantes < 0 ? '(Atrasado)' : ''}
            </p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold ${isPending ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'}">
            ${venta.estado}
          </span>
        </div>
        
        <div class="grid grid-cols-3 gap-2 mb-3 text-center">
          <div class="bg-gray-50 dark:bg-slate-700 p-2 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p class="font-bold text-sm text-gray-800 dark:text-white">C$${venta.precioTotal.toLocaleString()}</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-700 p-2 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-gray-400">Pagado</p>
            <p class="font-bold text-sm text-green-600 dark:text-green-400">C$${venta.pagado.toLocaleString()}</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-700 p-2 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
            <p class="font-bold text-sm text-orange-600 dark:text-orange-400">C$${venta.saldo.toLocaleString()}</p>
          </div>
        </div>
        
        <div class="mb-3">
          <div class="flex justify-between text-xs mb-1">
            <span class="text-gray-600 dark:text-gray-400">Progreso</span>
            <span class="font-medium">${progress.toFixed(1)}% | Cuota: C$${venta.cuotaMensual?.toLocaleString() || 0}/mes</span>
          </div>
          <div class="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full ${isPending ? 'bg-orange-500' : 'bg-green-500'} transition-all duration-500" style="width: ${progress}%"></div>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button onclick="verDetalleVenta('${venta.id}')" class="flex-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 py-2 rounded-xl text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
            Ver Detalle
          </button>
          <button onclick="eliminarVenta('${venta.id}')" class="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function verDetalleVenta(ventaId) {
  const venta = ventas.find(v => v.id === ventaId);
  if (!venta) return;
  
  document.getElementById('tituloDetalleVenta').textContent = venta.cliente;
  
  const productosHtml = venta.productos?.map(p => `
    <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
      <div>
        <p class="font-medium text-gray-800 dark:text-white">${p.nombre}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">${p.cantidad} × C$${p.precioVenta.toLocaleString()}</p>
      </div>
      <div class="text-right">
        <p class="font-bold text-gray-800 dark:text-white">C$${(p.precioVenta * p.cantidad).toLocaleString()}</p>
        <p class="text-xs text-green-600">Costo: C$${p.precioCarmen.toLocaleString()}</p>
      </div>
    </div>
  `).join('') || '<p class="text-gray-500 text-center">Sin productos</p>';
  
  const cobrosVenta = cobros.filter(c => c.ventaId === ventaId);
  const cobrosHtml = cobrosVenta.length > 0 ? cobrosVenta.map(c => `
    <div class="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm">
      <div>
        <p class="font-medium text-orange-800 dark:text-orange-300">${formatFecha(c.fecha)}</p>
        <p class="text-xs text-orange-600 dark:text-orange-400">${c.metodo} ${c.notas ? '- ' + c.notas : ''}</p>
      </div>
      <p class="font-bold text-orange-800 dark:text-orange-300">C$${c.monto.toLocaleString()}</p>
    </div>
  `).join('') : '<p class="text-gray-500 text-sm text-center italic">Sin cobros registrados</p>';
  
  document.getElementById('contenidoDetalleVenta').innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
          <p class="text-xs text-green-600 dark:text-green-400">Total Venta</p>
          <p class="text-lg font-bold text-green-800 dark:text-green-300">C$${venta.precioTotal.toLocaleString()}</p>
        </div>
        <div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl">
          <p class="text-xs text-orange-600 dark:text-orange-400">Saldo Pendiente</p>
          <p class="text-lg font-bold text-orange-800 dark:text-orange-300">C$${venta.saldo.toLocaleString()}</p>
        </div>
      </div>
      
      <div class="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Información del Crédito</p>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div><span class="text-gray-600 dark:text-gray-400">Meses:</span> <span class="font-medium text-gray-800 dark:text-white">${venta.meses}</span></div>
          <div><span class="text-gray-600 dark:text-gray-400">Cuota:</span> <span class="font-medium text-gray-800 dark:text-white">C$${venta.cuotaMensual?.toLocaleString() || 0}</span></div>
          <div><span class="text-gray-600 dark:text-gray-400">Prima:</span> <span class="font-medium text-gray-800 dark:text-white">C$${venta.prima.toLocaleString()}</span></div>
          <div><span class="text-gray-600 dark:text-gray-400">Próximo:</span> <span class="font-medium text-gray-800 dark:text-white">${formatFecha(venta.proximaFechaCobro)}</span></div>
        </div>
      </div>
      
      <div>
        <h4 class="font-bold text-gray-800 dark:text-white mb-2">Productos Vendidos</h4>
        <div class="space-y-2 max-h-40 overflow-y-auto">
          ${productosHtml}
        </div>
      </div>
      
      <div>
        <h4 class="font-bold text-gray-800 dark:text-white mb-2">Historial de Cobros (${cobrosVenta.length})</h4>
        <div class="space-y-2 max-h-40 overflow-y-auto">
          ${cobrosHtml}
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('modalDetalleVenta').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

function eliminarVenta(ventaId) {
  if (!confirm('¿Eliminar esta venta? Se perderán todos los cobros asociados.')) return;
  
  const idx = ventas.findIndex(v => v.id === ventaId);
  if (idx > -1) {
    ventas.splice(idx, 1);
    cobros = cobros.filter(c => c.ventaId !== ventaId);
    saveData();
    renderVentas();
    showToast('Venta eliminada');
  }
}

// ========== GESTIÓN DE ABONOS A CARMEN ==========

function cargarSelectLotes() {
  const select = document.getElementById('abonoLoteId');
  select.innerHTML = '<option value="">Seleccione un lote...</option>';
  
  lotes.filter(l => l.estado === 'PENDIENTE').forEach(l => {
    select.innerHTML += `<option value="${l.id}">${l.id} - Saldo: C$${l.saldoPendiente.toLocaleString()}</option>`;
  });
}

function mostrarInfoLoteAbono() {
  const loteId = document.getElementById('abonoLoteId').value;
  const infoDiv = document.getElementById('infoLoteAbono');
  
  if (!loteId) {
    infoDiv.classList.add('hidden');
    return;
  }
  
  const lote = lotes.find(l => l.id === loteId);
  if (lote) {
    infoDiv.innerHTML = `
      <div class="space-y-2">
        <div class="flex justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Total Inicial:</span>
          <span class="font-bold text-purple-800 dark:text-purple-300">C$${lote.totalInicial.toLocaleString()}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Abonado:</span>
          <span class="font-bold text-green-600 dark:text-green-400">C$${lote.abonado.toLocaleString()}</span>
        </div>
        <div class="flex justify-between border-t border-purple-200 dark:border-purple-800 pt-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Saldo Pendiente:</span>
          <span class="font-bold text-red-600 dark:text-red-400">C$${lote.saldoPendiente.toLocaleString()}</span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Fecha límite: ${formatFecha(lote.fechaLimite)}</p>
      </div>
    `;
    infoDiv.classList.remove('hidden');
  }
}

function addAbono() {
  const loteId = document.getElementById('abonoLoteId').value;
  const fecha = document.getElementById('abonoFecha').value;
  const monto = parseFloat(document.getElementById('abonoMonto').value) || 0;
  const metodo = document.getElementById('abonoMetodo').value;
  const notas = document.getElementById('abonoNotas').value.trim();
  
  if (!loteId || !fecha || monto <= 0) {
    alert('Complete todos los campos obligatorios');
    return;
  }
  
  const lote = lotes.find(l => l.id === loteId);
  if (!lote) return;
  
  if (monto > lote.saldoPendiente) {
    alert(`El monto no puede superar el saldo pendiente (C$${lote.saldoPendiente.toLocaleString()})`);
    return;
  }
  
  abonos.push({
    id: Date.now(),
    loteId,
    fecha,
    monto,
    metodo,
    notas,
    saldoDespues: lote.saldoPendiente - monto
  });
  
  lote.abonado += monto;
  lote.saldoPendiente -= monto;
  if (lote.saldoPendiente <= 0) {
    lote.estado = 'PAGADO';
  }
  
  saveData();
  renderAbonos();
  hideForms();
  showToast(`Abono de C$${monto.toLocaleString()} registrado`);
}

function renderAbonos() {
  const container = document.getElementById('listaAbonos');
  
  if (abonos.length === 0) {
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8 italic">No hay abonos registrados</p>';
    return;
  }
  
  // Ordenar por fecha descendente
  const abonosOrdenados = [...abonos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
  container.innerHTML = abonosOrdenados.map(abono => {
    const lote = lotes.find(l => l.id === abono.loteId);
    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 border border-purple-200 dark:border-purple-800">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-bold text-gray-800 dark:text-white">${abono.loteId}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">${formatFecha(abono.fecha)}</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
            ${abono.metodo}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <div>
            <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">C$${abono.monto.toLocaleString()}</p>
            ${abono.notas ? `<p class="text-xs text-gray-500 dark:text-gray-400">${abono.notas}</p>` : ''}
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500 dark:text-gray-400">Saldo después</p>
            <p class="font-bold text-gray-700 dark:text-gray-300">C$${abono.saldoDespues.toLocaleString()}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ========== GESTIÓN DE COBROS A CLIENTES ==========

function buscarVentaCobro() {
  const busqueda = document.getElementById('cobroBusqueda').value.trim().toUpperCase();
  const resultadosDiv = document.getElementById('resultadosBusquedaCobro');
  
  if (busqueda.length < 2) {
    resultadosDiv.classList.add('hidden');
    return;
  }
  
  const resultados = ventas.filter(v => 
    v.estado === 'PENDIENTE' && 
    (v.id.includes(busqueda) || v.cliente.toUpperCase().includes(busqueda))
  );
  
  if (resultados.length === 0) {
    resultadosDiv.innerHTML = '<p class="text-gray-500 text-sm text-center py-2">No se encontraron ventas</p>';
    resultadosDiv.classList.remove('hidden');
    return;
  }
  
  resultadosDiv.innerHTML = resultados.map(v => `
    <div onclick="seleccionarVentaCobro('${v.id}')" class="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors">
      <p class="font-bold text-gray-800 dark:text-white">${v.cliente}</p>
      <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>${v.id}</span>
        <span>Saldo: C$${v.saldo.toLocaleString()}</span>
      </div>
    </div>
  `).join('');
  
  resultadosDiv.classList.remove('hidden');
}

function seleccionarVentaCobro(ventaId) {
  ventaSeleccionadaCobro = ventas.find(v => v.id === ventaId);
  if (!ventaSeleccionadaCobro) return;
  
  document.getElementById('cobroVentaId').value = ventaId;
  document.getElementById('resultadosBusquedaCobro').classList.add('hidden');
  
  const infoDiv = document.getElementById('infoVentaCobro');
  infoDiv.innerHTML = `
    <div class="space-y-2">
      <div class="flex justify-between">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Cliente:</span>
        <span class="text-sm font-bold text-gray-800 dark:text-white">${ventaSeleccionadaCobro.cliente}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-sm text-gray-600 dark:text-gray-400">Total:</span>
        <span class="text-sm font-medium text-gray-800 dark:text-white">C$${ventaSeleccionadaCobro.precioTotal.toLocaleString()}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-sm text-gray-600 dark:text-gray-400">Pagado:</span>
        <span class="text-sm font-medium text-green-600 dark:text-green-400">C$${ventaSeleccionadaCobro.pagado.toLocaleString()}</span>
      </div>
      <div class="flex justify-between border-t border-orange-200 dark:border-orange-800 pt-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Saldo Pendiente:</span>
        <span class="text-sm font-bold text-orange-600 dark:text-orange-400">C$${ventaSeleccionadaCobro.saldo.toLocaleString()}</span>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400">Cuota mensual: C$${ventaSeleccionadaCobro.cuotaMensual?.toLocaleString() || 0}</p>
    </div>
  `;
  infoDiv.classList.remove('hidden');
}

function addCobro() {
  const ventaId = document.getElementById('cobroVentaId').value;
  const fecha = document.getElementById('cobroFecha').value;
  const monto = parseFloat(document.getElementById('cobroMonto').value) || 0;
  const metodo = document.getElementById('cobroMetodo').value;
  const notas = document.getElementById('cobroNotas').value.trim();
  
  if (!ventaId || !fecha || monto <= 0) {
    alert('Complete todos los campos obligatorios');
    return;
  }
  
  const venta = ventas.find(v => v.id === ventaId);
  if (!venta) return;
  
  if (monto > venta.saldo) {
    alert(`El monto no puede superar el saldo pendiente (C$${venta.saldo.toLocaleString()})`);
    return;
  }
  
  cobros.push({
    id: Date.now(),
    ventaId,
    fecha,
    monto,
    metodo,
    notas
  });
  
  venta.pagado += monto;
  venta.saldo -= monto;
  
  // Actualizar próxima fecha de cobro
  const proximaFecha = new Date(venta.proximaFechaCobro);
  proximaFecha.setMonth(proximaFecha.getMonth() + 1);
  venta.proximaFechaCobro = proximaFecha.toISOString().split('T')[0];
  
  if (venta.saldo <= 0) {
    venta.estado = 'PAGADO';
  }
  
  saveData();
  renderCobros();
  hideForms();
  showToast(`Cobro de C$${monto.toLocaleString()} registrado`);
}

function renderCobros() {
  const container = document.getElementById('listaCobros');
  
  if (cobros.length === 0) {
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8 italic">No hay cobros registrados</p>';
    return;
  }
  
  // Ordenar por fecha descendente
  const cobrosOrdenados = [...cobros].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
  container.innerHTML = cobrosOrdenados.map(cobro => {
    const venta = ventas.find(v => v.id === cobro.ventaId);
    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 border border-orange-200 dark:border-orange-800">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-bold text-gray-800 dark:text-white">${venta?.cliente || 'Cliente desconocido'}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">${formatFecha(cobro.fecha)} | ${cobro.ventaId}</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
            ${cobro.metodo}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">C$${cobro.monto.toLocaleString()}</p>
          ${cobro.notas ? `<p class="text-xs text-gray-500 dark:text-gray-400 max-w-[50%] text-right">${cobro.notas}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ========== UTILIDADES ==========

function formatFecha(fechaStr) {
  if (!fechaStr) return 'N/A';
  const fecha = new Date(fechaStr);
  return fecha.toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function cerrarModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
  document.getElementById('formOverlay').classList.add('hidden');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  toastMessage.textContent = message;
  toast.classList.remove('opacity-0');
  setTimeout(() => {
    toast.classList.add('opacity-0');
  }, 3000);
}

// Cerrar con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideForms();
    cerrarModal('modalDetalleLote');
    cerrarModal('modalDetalleVenta');
  }
});