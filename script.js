// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const CONFIG = {
  sheetId: localStorage.getItem('sheetId') || '',
  scriptUrl: localStorage.getItem('scriptUrl') || '',
  syncInterval: null,
  lastSync: localStorage.getItem('lastSync') || null,
  isOnline: navigator.onLine,
  deviceId: localStorage.getItem('deviceId') || generarDeviceId()
};

// Datos locales
let lotes = JSON.parse(localStorage.getItem('lotes')) || [];
let compras = JSON.parse(localStorage.getItem('compras')) || [];
let ventas = JSON.parse(localStorage.getItem('ventas')) || [];
let abonos = JSON.parse(localStorage.getItem('abonos')) || [];
let cobros = JSON.parse(localStorage.getItem('cobros')) || [];

// Variables temporales
let productosLoteTemp = [];
let productosCompraTemp = [];
let productosVentaTemp = [];
let loteSeleccionadoId = null;
let compraSeleccionadaId = null;
let ventaSeleccionadaId = null;
let productosSeleccionados = [];

// ==========================================
// INICIALIZACIÓN
// ==========================================
window.onload = function() {
  // Cargar datos iniciales si no hay nada
  if (lotes.length === 0 && typeof initialLotes !== 'undefined') {
    lotes = JSON.parse(JSON.stringify(initialLotes));
    saveLocalData();
  }
  if (ventas.length === 0 && typeof initialVentas !== 'undefined') {
    ventas = JSON.parse(JSON.stringify(initialVentas));
    saveLocalData();
  }

  // Eventos online/offline
  window.addEventListener('online', () => {
    CONFIG.isOnline = true;
    updateSyncStatus('online');
    sincronizarAhora();
  });
  
  window.addEventListener('offline', () => {
    CONFIG.isOnline = false;
    updateSyncStatus('offline');
  });

  if (CONFIG.scriptUrl && localStorage.getItem('syncAuto') !== 'false') {
    iniciarSyncAutomatico();
  }

  updateSyncStatus(CONFIG.isOnline ? (CONFIG.scriptUrl ? 'synced' : 'online') : 'offline');
  showSection('lotes');
  updateResumen();
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW registrado'))
      .catch(err => console.log('Error SW:', err));
  }
};

function generarDeviceId() {
  const id = 'device_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('deviceId', id);
  return id;
}

// ==========================================
// SINCRONIZACIÓN
// ==========================================
function extraerIdDeUrl(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function mostrarConfigSync() {
  document.getElementById('sheetUrl').value = CONFIG.scriptUrl || '';
  document.getElementById('syncAuto').checked = localStorage.getItem('syncAuto') !== 'false';
  
  const estado = !CONFIG.scriptUrl ? 'No configurado' : 
                 !CONFIG.isOnline ? 'Sin conexión' :
                 CONFIG.lastSync ? `Última: ${new Date(CONFIG.lastSync).toLocaleTimeString()}` : 'Pendiente';
  document.getElementById('estadoSync').textContent = estado;
  
  document.getElementById('modalConfigSync').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

function guardarConfigSync() {
  const url = document.getElementById('sheetUrl').value.trim();
  const syncAuto = document.getElementById('syncAuto').checked;
  
  if (!url) {
    alert('Ingresa la URL de Google Sheets o SheetDB');
    return;
  }
  
  CONFIG.scriptUrl = url;
  localStorage.setItem('scriptUrl', url);
  localStorage.setItem('syncAuto', syncAuto);
  
  // Extraer sheet ID para referencia
  const sheetId = extraerIdDeUrl(url);
  if (sheetId) {
    CONFIG.sheetId = sheetId;
    localStorage.setItem('sheetId', sheetId);
  }
  
  if (syncAuto) iniciarSyncAutomatico();
  else detenerSyncAutomatico();
  
  cerrarModal('modalConfigSync');
  sincronizarAhora();
  showToast('Configuración guardada');
}

function iniciarSyncAutomatico() {
  detenerSyncAutomatico();
  CONFIG.syncInterval = setInterval(sincronizarAhora, 30000);
}

function detenerSyncAutomatico() {
  if (CONFIG.syncInterval) {
    clearInterval(CONFIG.syncInterval);
    CONFIG.syncInterval = null;
  }
}

async function sincronizarAhora() {
  if (!CONFIG.scriptUrl || !CONFIG.isOnline) {
    showToast('Sin conexión o sin configurar');
    return;
  }

  document.getElementById('syncIndicator').classList.remove('hidden');
  updateSyncStatus('syncing');

  try {
    const datosLocales = {
      lotes,
      compras,
      ventas,
      abonos,
      cobros,
      timestamp: Date.now(),
      deviceId: CONFIG.deviceId
    };
    
    console.log('Enviando datos:', datosLocales); // Debug
    
    const response = await fetch(CONFIG.scriptUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosLocales),
      // Importante: no usar mode: 'cors' explícitamente, dejar que el navegador lo maneje
    });
    
    console.log('Response status:', response.status); // Debug
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const datosRemotos = await response.json();
    console.log('Datos recibidos:', datosRemotos); // Debug
    
    if (datosRemotos.success === false) {
      throw new Error(datosRemotos.error || 'Error del servidor');
    }
    
    // Solo hacer merge si hay datos remotos válidos
    if (datosRemotos.lotes || datosRemotos.ventas) {
      mergeDatos(datosRemotos);
    }
    
    CONFIG.lastSync = new Date().toISOString();
    localStorage.setItem('lastSync', CONFIG.lastSync);
    updateSyncStatus('synced');
    showToast('Sincronizado correctamente ✅');
    
  } catch (error) {
    console.error('Sync error detallado:', error);
    updateSyncStatus('error');
    showToast('Error: ' + error.message);
  } finally {
    document.getElementById('syncIndicator').classList.add('hidden');
  }
}
  
  // Merge con estrategia: timestamp más reciente gana
  if (datosRemotos.lotes) lotes = mergeArrays(lotes, datosRemotos.lotes, 'id');
  if (datosRemotos.compras) compras = mergeArrays(compras, datosRemotos.compras, 'id');
  if (datosRemotos.ventas) ventas = mergeArrays(ventas, datosRemotos.ventas, 'id');
  if (datosRemotos.abonos) abonos = mergeArrays(abonos, datosRemotos.abonos, 'id');
  if (datosRemotos.cobros) cobros = mergeArrays(cobros, datosRemotos.cobros, 'id');
  
  saveLocalData();
  renderCurrentSection();
  updateResumen();
}

function mergeArrays(local, remoto, keyField) {
  if (!Array.isArray(local)) local = [];
  if (!Array.isArray(remoto)) remoto = [];
  
  const merged = [...local];
  
  remoto.forEach(item => {
    if (!item || !item[keyField]) return;
    const idx = merged.findIndex(i => i && i[keyField] === item[keyField]);
    if (idx === -1) {
      merged.push(item);
    } else {
      const localTime = merged[idx].lastModified || 0;
      const remotoTime = item.lastModified || 0;
      if (remotoTime > localTime) merged[idx] = item;
    }
  });
  
  return merged;
}

function updateSyncStatus(status) {
  const indicator = document.getElementById('syncStatus');
  const icons = {
    online: '<span class="w-2 h-2 rounded-full bg-green-500"></span><span class="text-green-600 dark:text-green-400">En línea</span>',
    offline: '<span class="w-2 h-2 rounded-full bg-red-500"></span><span class="text-red-600 dark:text-red-400">Sin conexión</span>',
    syncing: '<span class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span><span class="text-yellow-600 dark:text-yellow-400">Sincronizando...</span>',
    synced: '<span class="w-2 h-2 rounded-full bg-blue-500"></span><span class="text-blue-600 dark:text-blue-400">Sincronizado</span>',
    error: '<span class="w-2 h-2 rounded-full bg-orange-500"></span><span class="text-orange-600 dark:text-orange-400">Error</span>'
  };
  indicator.innerHTML = icons[status] || icons.offline;
}

function exportarDatos() {
  const datos = { lotes, compras, ventas, abonos, cobros, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-control-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  showToast('Datos exportados');
}

// ==========================================
// DATOS LOCALES
// ==========================================
function saveLocalData() {
  localStorage.setItem('lotes', JSON.stringify(lotes));
  localStorage.setItem('compras', JSON.stringify(compras));
  localStorage.setItem('ventas', JSON.stringify(ventas));
  localStorage.setItem('abonos', JSON.stringify(abonos));
  localStorage.setItem('cobros', JSON.stringify(cobros));
  updateResumen();
}

function updateResumen() {
  const deudaCarmen = lotes.reduce((sum, l) => sum + (l.saldoPendiente || 0), 0);
  const totalCompras = compras.reduce((sum, c) => {
    const stock = c.productos?.filter(p => !p.vendido).reduce((s, p) => s + ((p.precioCompra || 0) * (p.cantidad || 1)), 0) || 0;
    return sum + stock;
  }, 0);
  const clientesDeben = ventas.reduce((sum, v) => sum + (v.saldo || 0), 0);
  
  const gananciaEstimada = ventas.reduce((sum, v) => {
    const costo = v.productos?.reduce((c, p) => {
      const precioCosto = p.precioCarmen || p.precioCompra || 0;
      return c + (precioCosto * (p.cantidad || 1));
    }, 0) || 0;
    return sum + ((v.precioTotal || 0) - costo);
  }, 0);

  document.getElementById('deudaCarmen').textContent = `C$${deudaCarmen.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('totalCompras').textContent = `C$${totalCompras.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('clientesDeben').textContent = `C$${clientesDeben.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('gananciaEstimada').textContent = `C$${gananciaEstimada.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  
  document.getElementById('countLotes').textContent = lotes.filter(l => l.estado === 'PENDIENTE').length;
  document.getElementById('countCompras').textContent = compras.length;
  document.getElementById('countVentas').textContent = ventas.filter(v => v.estado === 'PENDIENTE').length;
  
  const totalStock = [...lotes, ...compras].reduce((sum, item) => {
    return sum + (item.productos?.filter(p => !p.vendido).length || 0);
  }, 0);
  document.getElementById('countStock').textContent = totalStock;
}

// ==========================================
// NAVEGACIÓN
// ==========================================
function showSection(section) {
  ['lotes', 'compras', 'ventas', 'finanzas'].forEach(s => {
    document.getElementById(`section${s.charAt(0).toUpperCase() + s.slice(1)}`).classList.add('hidden');
  });
  document.getElementById(`section${section.charAt(0).toUpperCase() + section.slice(1)}`).classList.remove('hidden');
  
  if (section === 'lotes') renderLotes();
  else if (section === 'compras') renderCompras();
  else if (section === 'ventas') renderVentas();
  else if (section === 'finanzas') { renderAbonos(); renderCobros(); }
}

function renderCurrentSection() {
  const sections = ['lotes', 'compras', 'ventas', 'finanzas'];
  for (let s of sections) {
    if (!document.getElementById(`section${s.charAt(0).toUpperCase() + s.slice(1)}`).classList.contains('hidden')) {
      if (s === 'lotes') renderLotes();
      else if (s === 'compras') renderCompras();
      else if (s === 'ventas') renderVentas();
      else if (s === 'finanzas') { renderAbonos(); renderCobros(); }
      break;
    }
  }
}

function hideForms() {
  document.getElementById('formOverlay').classList.add('hidden');
  ['formLote', 'formCompra', 'formVenta', 'formAbono', 'formCobro', 'selectorProductos'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
}

function cerrarModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
  document.getElementById('formOverlay').classList.add('hidden');
}

// ==========================================
// LOTES - CRUD COMPLETO CON REAPERTURA
// ==========================================
function showForm(type, editId = null) {
  hideForms();
  document.getElementById('formOverlay').classList.remove('hidden');
  
  if (type === 'lote') {
    const form = document.getElementById('formLote');
    form.classList.remove('hidden');
    
    if (editId) {
      const lote = lotes.find(l => l.id === editId);
      if (!lote) return;
      
      document.getElementById('tituloFormLote').textContent = 'Editar Lote';
      document.getElementById('loteEditId').value = editId;
      document.getElementById('loteId').value = lote.id;
      document.getElementById('loteId').disabled = true;
      document.getElementById('loteFecha').value = lote.fechaRecepcion;
      document.getElementById('loteFechaLimite').value = lote.fechaLimite;
      
      productosLoteTemp = JSON.parse(JSON.stringify(lote.productos || []));
      renderProductosLote();
      
      const opcionesPagado = document.getElementById('opcionesLotePagado');
      if (lote.estado === 'PAGADO') {
        opcionesPagado.classList.remove('hidden');
        document.getElementById('reabrirLote').checked = false;
      } else {
        opcionesPagado.classList.add('hidden');
      }
    } else {
      document.getElementById('tituloFormLote').textContent = 'Nuevo Lote';
      document.getElementById('loteEditId').value = '';
      document.getElementById('loteId').value = '';
      document.getElementById('loteId').disabled = false;
      document.getElementById('loteFecha').valueAsDate = new Date();
      const fechaLimite = new Date();
      fechaLimite.setMonth(fechaLimite.getMonth() + 2);
      document.getElementById('loteFechaLimite').valueAsDate = fechaLimite;
      productosLoteTemp = [];
      renderProductosLote();
      document.getElementById('opcionesLotePagado').classList.add('hidden');
    }
  } else if (type === 'compra') {
    const form = document.getElementById('formCompra');
    form.classList.remove('hidden');
    
    if (editId) {
      const compra = compras.find(c => c.id === editId);
      if (!compra) return;
      
      document.getElementById('tituloFormCompra').textContent = 'Editar Compra';
      document.getElementById('compraEditId').value = editId;
      document.getElementById('compraId').value = compra.id;
      document.getElementById('compraId').disabled = true;
      document.getElementById('compraFecha').value = compra.fecha;
      document.getElementById('compraProveedor').value = compra.proveedor || '';
      
      productosCompraTemp = JSON.parse(JSON.stringify(compra.productos || []));
      renderProductosCompra();
    } else {
      document.getElementById('tituloFormCompra').textContent = 'Nueva Compra';
      document.getElementById('compraEditId').value = '';
      document.getElementById('compraId').value = '';
      document.getElementById('compraId').disabled = false;
      document.getElementById('compraFecha').valueAsDate = new Date();
      document.getElementById('compraProveedor').value = '';
      productosCompraTemp = [];
      renderProductosCompra();
    }
  } else if (type === 'venta') {
    const form = document.getElementById('formVenta');
    form.classList.remove('hidden');
    
    if (editId) {
      const venta = ventas.find(v => v.id === editId);
      if (!venta) return;
      
      document.getElementById('tituloFormVenta').textContent = 'Editar Venta';
      document.getElementById('ventaEditId').value = editId;
      document.getElementById('ventaId').value = venta.id;
      document.getElementById('ventaId').disabled = true;
      document.getElementById('ventaCliente').value = venta.cliente;
      document.getElementById('ventaTelefono').value = venta.telefono || '';
      document.getElementById('ventaFecha').value = venta.fecha;
      document.getElementById('ventaPrima').value = venta.prima || 0;
      document.getElementById('ventaMeses').value = venta.meses || 12;
      
      productosVentaTemp = JSON.parse(JSON.stringify(venta.productos || []));
      renderProductosVenta();
      calcularVenta();
      
      const opcionesPagada = document.getElementById('opcionesVentaPagada');
      if (venta.estado === 'PAGADO') {
        opcionesPagada.classList.remove('hidden');
        document.getElementById('reactivarVenta').checked = false;
      } else {
        opcionesPagada.classList.add('hidden');
      }
    } else {
      document.getElementById('tituloFormVenta').textContent = 'Nueva Venta';
      document.getElementById('ventaEditId').value = '';
      document.getElementById('ventaId').value = '';
      document.getElementById('ventaId').disabled = false;
      document.getElementById('ventaFecha').valueAsDate = new Date();
      document.getElementById('ventaMeses').value = '12';
      productosVentaTemp = [];
      renderProductosVenta();
      calcularVenta();
      document.getElementById('opcionesVentaPagada').classList.add('hidden');
    }
  } else if (type === 'abono') {
    document.getElementById('formAbono').classList.remove('hidden');
    cargarSelectLotes();
    document.getElementById('abonoEditId').value = '';
    document.getElementById('abonoFecha').valueAsDate = new Date();
    document.getElementById('abonoMonto').value = '';
    document.getElementById('abonoNotas').value = '';
    document.getElementById('infoLoteAbono').classList.add('hidden');
  } else if (type === 'cobro') {
    document.getElementById('formCobro').classList.remove('hidden');
    document.getElementById('cobroEditId').value = '';
    document.getElementById('cobroFecha').valueAsDate = new Date();
    document.getElementById('cobroMonto').value = '';
    document.getElementById('cobroNotas').value = '';
    document.getElementById('cobroBusqueda').value = '';
    document.getElementById('resultadosBusquedaCobro').classList.add('hidden');
    document.getElementById('infoVentaCobro').classList.add('hidden');
  }
}

// Productos Lote
function agregarProductoLote() {
  productosLoteTemp.push({ 
    id: Date.now() + Math.random(), 
    nombre: '', 
    cantidad: 1, 
    precioCarmen: 0,
    vendido: false 
  });
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

function guardarLote() {
  const editId = document.getElementById('loteEditId').value;
  const id = document.getElementById('loteId').value.trim().toUpperCase();
  const fecha = document.getElementById('loteFecha').value;
  const fechaLimite = document.getElementById('loteFechaLimite').value;
  
  if (!id || !fecha || !fechaLimite) {
    alert('Completa todos los campos obligatorios');
    return;
  }
  
  const productosValidos = productosLoteTemp.filter(p => p.nombre && p.precioCarmen > 0);
  if (productosValidos.length === 0) {
    alert('Agrega al menos un producto válido');
    return;
  }
  
  const totalInicial = productosValidos.reduce((sum, p) => sum + (p.precioCarmen * p.cantidad), 0);
  
  if (editId) {
    // Editar lote existente
    const lote = lotes.find(l => l.id === editId);
    if (!lote) return;
    
    // Verificar si se quiere reabrir lote pagado
    const reabrir = document.getElementById('reabrirLote').checked;
    
    // Mantener productos vendidos y agregar nuevos
    const productosVendidos = lote.productos?.filter(p => p.vendido) || [];
    const nuevosProductos = productosValidos.filter(np => 
      !productosVendidos.some(vp => vp.nombre === np.nombre && vp.cantidad === np.cantidad)
    );
    
    lote.fechaRecepcion = fecha;
    lote.fechaLimite = fechaLimite;
    lote.productos = [...productosVendidos, ...nuevosProductos];
    
    if (reabrir && lote.estado === 'PAGADO') {
      const nuevoTotal = nuevosProductos.reduce((sum, p) => sum + (p.precioCarmen * p.cantidad), 0);
      lote.totalInicial = (lote.totalInicial || 0) + nuevoTotal;
      lote.saldoPendiente = (lote.saldoPendiente || 0) + nuevoTotal;
      lote.estado = 'PENDIENTE';
      showToast('Lote reabierto con nuevos productos');
    } else {
      // Recalcular totales
      lote.totalInicial = totalInicial;
      lote.saldoPendiente = totalInicial - (lote.abonado || 0);
      if (lote.saldoPendiente <= 0) lote.estado = 'PAGADO';
    }
    
    lote.lastModified = Date.now();
    showToast('Lote actualizado');
  } else {
    // Nuevo lote
    if (lotes.some(l => l.id === id)) {
      alert('Ya existe un lote con este ID');
      return;
    }
    
    lotes.push({
      id,
      fechaRecepcion: fecha,
      fechaLimite,
      totalInicial,
      abonado: 0,
      saldoPendiente: totalInicial,
      estado: 'PENDIENTE',
      productos: productosValidos,
      lastModified: Date.now()
    });
    showToast('Lote creado exitosamente');
  }
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderLotes();
}

function renderLotes() {
  const container = document.getElementById('listaLotes');
  const filtro = document.getElementById('filtroLotes').value;
  
  let lotesFiltrados = lotes;
  if (filtro === 'pendientes') lotesFiltrados = lotes.filter(l => l.estado === 'PENDIENTE');
  else if (filtro === 'pagados') lotesFiltrados = lotes.filter(l => l.estado === 'PAGADO');
  
  if (lotesFiltrados.length === 0) {
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8 italic">No hay lotes</p>';
    return;
  }
  
  const lotesOrdenados = [...lotesFiltrados].sort((a, b) => new Date(a.fechaLimite) - new Date(b.fechaLimite));
  
  container.innerHTML = lotesOrdenados.map(lote => {
    const isPending = lote.estado === 'PENDIENTE';
    const progress = lote.totalInicial > 0 ? ((lote.totalInicial - lote.saldoPendiente) / lote.totalInicial * 100) : 0;
    const diasRestantes = Math.ceil((new Date(lote.fechaLimite) - new Date()) / (1000 * 60 * 60 * 24));
    
    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 border ${isPending ? 'border-red-200 dark:border-red-800' : 'border-green-200 dark:border-green-800'}">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
              ${lote.id}
              ${diasRestantes <= 7 && isPending ? '<span class="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">¡Urgente!</span>' : ''}
              ${!isPending ? '<span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Pagado</span>' : ''}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Recibido: ${formatFecha(lote.fechaRecepcion)}</p>
            <p class="text-xs ${diasRestantes < 0 && isPending ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-gray-400'}">
              Límite: ${formatFecha(lote.fechaLimite)} ${diasRestantes < 0 && isPending ? '(Vencido)' : ''}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
            <p class="text-xl font-bold ${isPending ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">
              C$${lote.saldoPendiente.toLocaleString()}
            </p>
          </div>
        </div>
        
        <div class="mb-3">
          <div class="flex justify-between text-xs mb-1">
            <span class="text-gray-600 dark:text-gray-400">Progreso: ${progress.toFixed(1)}%</span>
            <span class="text-gray-600 dark:text-gray-400">${lote.productos?.filter(p => p.vendido).length || 0}/${lote.productos?.length || 0} vendidos</span>
          </div>
          <div class="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full ${isPending ? 'bg-red-500' : 'bg-green-500'}" style="width: ${progress}%"></div>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button onclick="verDetalleLote('${lote.id}')" class="flex-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 py-2 rounded-xl text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50">
            Ver Detalle
          </button>
          <button onclick="showForm('lote', '${lote.id}')" class="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50" title="Editar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function verDetalleLote(loteId) {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote) return;
  
  loteSeleccionadoId = loteId;
  document.getElementById('tituloDetalleLote').textContent = `Detalle ${lote.id}`;
  
  const productosHtml = lote.productos?.map(p => `
    <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-xl ${p.vendido ? 'opacity-60' : ''}">
      <div>
        <p class="font-medium text-gray-800 dark:text-white ${p.vendido ? 'line-through' : ''}">${p.nombre}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">${p.cantidad} × C$${p.precioCarmen.toLocaleString()}</p>
      </div>
      <div class="text-right">
        <p class="font-bold text-gray-800 dark:text-white">C$${(p.precioCarmen * p.cantidad).toLocaleString()}</p>
        ${p.vendido ? '<span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Vendido</span>' : '<span class="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Stock</span>'}
      </div>
    </div>
  `).join('') || '<p class="text-gray-500 text-center">Sin productos</p>';
  
  const abonosLote = abonos.filter(a => a.loteId === loteId);
  const abonosHtml = abonosLote.length > 0 ? abonosLote.map(a => `
    <div class="flex justify-between items-center p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-sm">
      <div>
        <p class="font-medium text-indigo-800 dark:text-indigo-300">${formatFecha(a.fecha)}</p>
        <p class="text-xs text-indigo-600 dark:text-indigo-400">${a.metodo} ${a.notas ? '- ' + a.notas : ''}</p>
      </div>
      <p class="font-bold text-indigo-800 dark:text-indigo-300">C$${a.monto.toLocaleString()}</p>
    </div>
  `).join('') : '<p class="text-gray-500 text-sm text-center italic">Sin abonos</p>';
  
  document.getElementById('contenidoDetalleLote').innerHTML = `
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl">
        <p class="text-xs text-indigo-600 dark:text-indigo-400">Total Inicial</p>
        <p class="text-lg font-bold text-indigo-800 dark:text-indigo-300">C$${lote.totalInicial.toLocaleString()}</p>
      </div>
      <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
        <p class="text-xs text-red-600 dark:text-red-400">Saldo Pendiente</p>
        <p class="text-lg font-bold text-red-800 dark:text-red-300">C$${lote.saldoPendiente.toLocaleString()}</p>
      </div>
    </div>
    
    <div class="mb-4">
      <h4 class="font-bold text-gray-800 dark:text-white mb-2">Productos (${lote.productos?.length || 0})</h4>
      <div class="space-y-2 max-h-48 overflow-y-auto">${productosHtml}</div>
    </div>
    
    <div>
      <h4 class="font-bold text-gray-800 dark:text-white mb-2">Historial de Abonos (${abonosLote.length})</h4>
      <div class="space-y-2 max-h-40 overflow-y-auto">${abonosHtml}</div>
    </div>
  `;
  
  document.getElementById('modalDetalleLote').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

function editarLoteDesdeModal() {
  cerrarModal('modalDetalleLote');
  showForm('lote', loteSeleccionadoId);
}

// ==========================================
// COMPRAS PERSONALES - CRUD
// ==========================================
function agregarProductoCompra() {
  productosCompraTemp.push({
    id: Date.now() + Math.random(),
    nombre: '',
    cantidad: 1,
    precioCompra: 0,
    vendido: false
  });
  renderProductosCompra();
}

function renderProductosCompra() {
  const container = document.getElementById('productosCompraContainer');
  let total = 0;
  
  container.innerHTML = productosCompraTemp.map((prod, idx) => {
    total += (prod.precioCompra || 0) * (prod.cantidad || 1);
    return `
      <div class="flex gap-2 items-center bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
        <div class="flex-1">
          <input type="text" placeholder="Nombre del producto" value="${prod.nombre}" 
            onchange="actualizarProductoCompra(${idx}, 'nombre', this.value)"
            class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white mb-2">
          <div class="flex gap-2">
            <input type="number" placeholder="Cant" value="${prod.cantidad}" min="1"
              onchange="actualizarProductoCompra(${idx}, 'cantidad', parseInt(this.value)||1)"
              class="w-20 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white">
            <input type="number" placeholder="Precio Compra" value="${prod.precioCompra || ''}" min="0" step="0.01"
              onchange="actualizarProductoCompra(${idx}, 'precioCompra', parseFloat(this.value)||0)"
              class="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white">
          </div>
        </div>
        <button onclick="eliminarProductoCompra(${idx})" class="text-red-500 hover:text-red-700 p-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
    `;
  }).join('');
  
  document.getElementById('previewTotalCompra').textContent = `C$${total.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
}

function actualizarProductoCompra(idx, campo, valor) {
  productosCompraTemp[idx][campo] = valor;
  if (campo === 'cantidad' || campo === 'precioCompra') renderProductosCompra();
}

function eliminarProductoCompra(idx) {
  productosCompraTemp.splice(idx, 1);
  renderProductosCompra();
}

function guardarCompra() {
  const editId = document.getElementById('compraEditId').value;
  const id = document.getElementById('compraId').value.trim().toUpperCase();
  const fecha = document.getElementById('compraFecha').value;
  const proveedor = document.getElementById('compraProveedor').value.trim();
  
  if (!id || !fecha) {
    alert('Completa los campos obligatorios');
    return;
  }
  
  const productosValidos = productosCompraTemp.filter(p => p.nombre && p.precioCompra > 0);
  if (productosValidos.length === 0) {
    alert('Agrega al menos un producto válido');
    return;
  }
  
  if (editId) {
    const compra = compras.find(c => c.id === editId);
    if (compra) {
      compra.fecha = fecha;
      compra.proveedor = proveedor;
      compra.productos = productosValidos;
      compra.lastModified = Date.now();
      showToast('Compra actualizada');
    }
  } else {
    if (compras.some(c => c.id === id)) {
      alert('Ya existe una compra con este ID');
      return;
    }
    
    compras.push({
      id,
      fecha,
      proveedor,
      productos: productosValidos,
      lastModified: Date.now()
    });
    showToast('Compra registrada');
  }
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderCompras();
}

function renderCompras() {
  const container = document.getElementById('listaCompras');
  const filtro = document.getElementById('filtroCompras').value;
  
  let comprasFiltradas = compras;
  if (filtro === 'stock') {
    comprasFiltradas = compras.filter(c => c.productos?.some(p => !p.vendido));
  } else if (filtro === 'vendidos') {
    comprasFiltradas = compras.filter(c => c.productos?.every(p => p.vendido));
  }
  
  if (comprasFiltradas.length === 0) {
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8 italic">No hay compras</p>';
    return;
  }
  
  container.innerHTML = comprasFiltradas.map(compra => {
    const totalProductos = compra.productos?.length || 0;
    const vendidos = compra.productos?.filter(p => p.vendido).length || 0;
    const enStock = totalProductos - vendidos;
    const totalValor = compra.productos?.reduce((sum, p) => sum + ((p.precioCompra || 0) * (p.cantidad || 1)), 0) || 0;
    
    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 border border-purple-200 dark:border-purple-800">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-bold text-lg text-gray-800 dark:text-white">${compra.id}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">${formatFecha(compra.fecha)}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${compra.proveedor || 'Sin proveedor'}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p class="text-lg font-bold text-purple-600 dark:text-purple-400">C$${totalValor.toLocaleString()}</p>
          </div>
        </div>
        
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">${enStock} en stock</span>
          <span class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full">${vendidos} vendidos</span>
        </div>
        
        <div class="flex gap-2">
          <button onclick="verDetalleCompra('${compra.id}')" class="flex-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 py-2 rounded-xl text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50">
            Ver Detalle
          </button>
          <button onclick="showForm('compra', '${compra.id}')" class="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50" title="Editar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function verDetalleCompra(compraId) {
  const compra = compras.find(c => c.id === compraId);
  if (!compra) return;
  
  compraSeleccionadaId = compraId;
  document.getElementById('tituloDetalleCompra').textContent = `Detalle ${compra.id}`;
  
  const productosHtml = compra.productos?.map(p => `
    <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-xl ${p.vendido ? 'opacity-60' : ''}">
      <div>
        <p class="font-medium text-gray-800 dark:text-white ${p.vendido ? 'line-through' : ''}">${p.nombre}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">${p.cantidad} × C$${p.precioCompra.toLocaleString()}</p>
      </div>
      <div class="text-right">
        <p class="font-bold text-gray-800 dark:text-white">C$${(p.precioCompra * p.cantidad).toLocaleString()}</p>
        ${p.vendido ? '<span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Vendido</span>' : '<span class="text-xs bg-purple-500 text-white px-2 py-0.5 rounded">Stock</span>'}
      </div>
    </div>
  `).join('') || '<p class="text-gray-500 text-center">Sin productos</p>';
  
  document.getElementById('contenidoDetalleCompra').innerHTML = `
    <div class="mb-4">
      <p class="text-sm text-gray-600 dark:text-gray-400">Fecha: <span class="font-medium text-gray-800 dark:text-white">${formatFecha(compra.fecha)}</span></p>
      <p class="text-sm text-gray-600 dark:text-gray-400">Proveedor: <span class="font-medium text-gray-800 dark:text-white">${compra.proveedor || 'N/A'}</span></p>
    </div>
    <div>
      <h4 class="font-bold text-gray-800 dark:text-white mb-2">Productos</h4>
      <div class="space-y-2 max-h-96 overflow-y-auto">${productosHtml}</div>
    </div>
  `;
  
  document.getElementById('modalDetalleCompra').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

function editarCompraDesdeModal() {
  cerrarModal('modalDetalleCompra');
  showForm('compra', compraSeleccionadaId);
}

// ==========================================
// VENTAS - CRUD CON REAPERTURA
// ==========================================
function mostrarSelectorProductos(tipo) {
  document.getElementById('selectorProductos').classList.remove('hidden');
  document.getElementById('tituloSelectorProductos').textContent = tipo === 'lotes' ? 'Productos de Lotes' : 'Productos de Compras';
  
  const lista = document.getElementById('listaSelectorProductos');
  productosSeleccionados = [];
  
  if (tipo === 'lotes') {
    const productosDisponibles = [];
    lotes.forEach(lote => {
      lote.productos?.forEach((prod, idx) => {
        if (!prod.vendido) {
          productosDisponibles.push({
            ...prod,
            loteId: lote.id,
            source: 'lote',
            uniqueId: `${lote.id}_${idx}`
          });
        }
      });
    });
    
    lista.innerHTML = productosDisponibles.map(p => `
      <label class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600">
        <input type="checkbox" value="${p.uniqueId}" onchange="toggleProductoSeleccionado('${p.uniqueId}', ${JSON.stringify(p).replace(/"/g, '&quot;')})" class="w-5 h-5 text-green-600 rounded">
        <div class="flex-1">
          <p class="font-medium text-gray-800 dark:text-white">${p.nombre}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">${p.loteId} | Costo: C$${p.precioCarmen.toLocaleString()}</p>
        </div>
        <span class="text-sm font-bold text-gray-600 dark:text-gray-400">×${p.cantidad}</span>
      </label>
    `).join('');
    
    if (productosDisponibles.length === 0) {
      lista.innerHTML = '<p class="text-gray-500 text-center py-4">No hay productos disponibles en lotes</p>';
    }
  } else {
    const productosDisponibles = [];
    compras.forEach(compra => {
      compra.productos?.forEach((prod, idx) => {
        if (!prod.vendido) {
          productosDisponibles.push({
            ...prod,
            compraId: compra.id,
            source: 'compra',
            uniqueId: `${compra.id}_${idx}`
          });
        }
      });
    });
    
    lista.innerHTML = productosDisponibles.map(p => `
      <label class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600">
        <input type="checkbox" value="${p.uniqueId}" onchange="toggleProductoSeleccionado('${p.uniqueId}', ${JSON.stringify(p).replace(/"/g, '&quot;')})" class="w-5 h-5 text-green-600 rounded">
        <div class="flex-1">
          <p class="font-medium text-gray-800 dark:text-white">${p.nombre}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">${p.compraId} | Costo: C$${p.precioCompra.toLocaleString()}</p>
        </div>
        <span class="text-sm font-bold text-gray-600 dark:text-gray-400">×${p.cantidad}</span>
      </label>
    `).join('');
    
    if (productosDisponibles.length === 0) {
      lista.innerHTML = '<p class="text-gray-500 text-center py-4">No hay productos disponibles en compras</p>';
    }
  }
}

function toggleProductoSeleccionado(uniqueId, producto) {
  const idx = productosSeleccionados.findIndex(p => p.uniqueId === uniqueId);
  if (idx > -1) {
    productosSeleccionados.splice(idx, 1);
  } else {
    productosSeleccionados.push({...producto, uniqueId});
  }
}

function cerrarSelectorProductos() {
  document.getElementById('selectorProductos').classList.add('hidden');
}

function confirmarSeleccionProductos() {
  productosSeleccionados.forEach(p => {
    productosVentaTemp.push({
      id: Date.now() + Math.random(),
      nombre: p.nombre,
      cantidad: p.cantidad,
      precioCarmen: p.precioCarmen || 0,
      precioCompra: p.precioCompra || 0,
      precioVenta: 0,
      sourceId: p.loteId || p.compraId,
      sourceType: p.source
    });
  });
  
  renderProductosVenta();
  calcularVenta();
  cerrarSelectorProductos();
}

function agregarProductoVentaManual() {
  productosVentaTemp.push({
    id: Date.now() + Math.random(),
    nombre: '',
    cantidad: 1,
    precioCarmen: 0,
    precioCompra: 0,
    precioVenta: 0,
    sourceType: 'manual'
  });
  renderProductosVenta();
}

function renderProductosVenta() {
  const container = document.getElementById('productosVentaContainer');
  
  container.innerHTML = productosVentaTemp.map((prod, idx) => `
    <div class="flex gap-2 items-center bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
      <div class="flex-1">
        <input type="text" placeholder="Producto" value="${prod.nombre}" 
          onchange="actualizarProductoVenta(${idx}, 'nombre', this.value)"
          class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white mb-2" ${prod.sourceType !== 'manual' ? 'readonly' : ''}>
        <div class="flex gap-2">
          <input type="number" placeholder="Cant" value="${prod.cantidad}" min="1"
            onchange="actualizarProductoVenta(${idx}, 'cantidad', parseInt(this.value)||1)"
            class="w-16 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white" ${prod.sourceType !== 'manual' ? 'readonly' : ''}>
          <input type="number" placeholder="Costo" value="${prod.precioCarmen || prod.precioCompra || ''}" min="0" step="0.01"
            class="w-24 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-gray-400" readonly>
          <input type="number" placeholder="Precio Venta" value="${prod.precioVenta || ''}" min="0" step="0.01"
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

function guardarVenta() {
  const editId = document.getElementById('ventaEditId').value;
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
  
  // Marcar productos como vendidos en su origen
  productosValidos.forEach(pv => {
    if (pv.sourceType === 'lote' && pv.sourceId) {
      const lote = lotes.find(l => l.id === pv.sourceId);
      if (lote) {
        const prod = lote.productos?.find(p => p.nombre === pv.nombre && !p.vendido);
        if (prod) prod.vendido = true;
      }
    } else if (pv.sourceType === 'compra' && pv.sourceId) {
      const compra = compras.find(c => c.id === pv.sourceId);
      if (compra) {
        const prod = compra.productos?.find(p => p.nombre === pv.nombre && !p.vendido);
        if (prod) prod.vendido = true;
      }
    }
  });
  
  if (editId) {
    const venta = ventas.find(v => v.id === editId);
    if (venta) {
      // Si está pagada y quiere agregar más productos
      const reactivar = document.getElementById('reactivarVenta').checked;
      
      if (reactivar && venta.estado === 'PAGADO') {
        // Crear nueva venta vinculada
        const nuevoId = id + '_EXT';
        const saldo = precioTotal - prima;
        const cuotaMensual = saldo > 0 && meses > 0 ? saldo / meses : 0;
        const proximaFecha = new Date(fecha);
        proximaFecha.setMonth(proximaFecha.getMonth() + 1);
        
        ventas.push({
          id: nuevoId,
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
          ventaOriginal: editId,
          lastModified: Date.now()
        });
        
        showToast('Nueva venta creada para cliente existente');
      } else {
        // Editar venta normal
        venta.cliente = cliente;
        venta.telefono = telefono;
        venta.fecha = fecha;
        venta.productos = productosValidos;
        venta.precioTotal = precioTotal;
        venta.prima = prima;
        venta.meses = meses;
        venta.saldo = precioTotal - venta.pagado;
        venta.cuotaMensual = venta.saldo > 0 && meses > 0 ? venta.saldo / meses : 0;
        if (venta.saldo <= 0) venta.estado = 'PAGADO';
        venta.lastModified = Date.now();
        
        showToast('Venta actualizada');
      }
    }
  } else {
    if (ventas.some(v => v.id === id)) {
      alert('Ya existe una venta con este ID');
      return;
    }
    
    const saldo = precioTotal - prima;
    const cuotaMensual = saldo > 0 && meses > 0 ? saldo / meses : 0;
    const proximaFecha = new Date(fecha);
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
      lastModified: Date.now()
    });
    
    showToast('Venta registrada exitosamente');
  }
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderVentas();
}

function renderVentas() {
  const container = document.getElementById('listaVentas');
  const filtro = document.getElementById('filtroVentas').value;
  
  let ventasFiltradas = ventas;
  if (filtro === 'pendientes') ventasFiltradas = ventas.filter(v => v.estado === 'PENDIENTE');
  else if (filtro === 'pagados') ventasFiltradas = ventas.filter(v => v.estado === 'PAGADO');
  
  if (ventasFiltradas.length === 0) {
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8 italic">No hay ventas</p>';
    return;
  }
  
  const ventasOrdenadas = [...ventasFiltradas].sort((a, b) => new Date(a.proximaFechaCobro) - new Date(b.proximaFechaCobro));
  
  container.innerHTML = ventasOrdenadas.map(venta => {
    const isPending = venta.estado === 'PENDIENTE';
    const progress = venta.precioTotal > 0 ? ((venta.precioTotal - venta.saldo) / venta.precioTotal * 100) : 0;
    const proximoCobro = new Date(venta.proximaFechaCobro);
    const diasRestantes = Math.ceil((proximoCobro - new Date()) / (1000 * 60 * 60 * 24));
    
    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 border ${isPending ? 'border-orange-200 dark:border-orange-800' : 'border-green-200 dark:border-green-800'}">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
              ${venta.cliente}
              ${!isPending ? '<span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Pagado</span>' : ''}
              ${venta.ventaOriginal ? '<span class="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Extensión</span>' : ''}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">${venta.id} | ${venta.telefono || 'Sin teléfono'}</p>
            ${isPending ? `<p class="text-xs ${diasRestantes < 0 ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-gray-400'}">
              Próximo cobro: ${formatFecha(venta.proximaFechaCobro)} ${diasRestantes < 0 ? '(Atrasado)' : ''}
            </p>` : ''}
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
            <p class="text-xl font-bold ${isPending ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}">
              C$${venta.saldo.toLocaleString()}
            </p>
          </div>
        </div>
        
        <div class="mb-3">
          <div class="flex justify-between text-xs mb-1">
            <span class="text-gray-600 dark:text-gray-400">Progreso: ${progress.toFixed(1)}%</span>
            <span class="text-gray-600 dark:text-gray-400">Cuota: C$${venta.cuotaMensual?.toLocaleString() || 0}</span>
          </div>
          <div class="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full ${isPending ? 'bg-orange-500' : 'bg-green-500'}" style="width: ${progress}%"></div>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button onclick="verDetalleVenta('${venta.id}')" class="flex-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 py-2 rounded-xl text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50">
            Ver Detalle
          </button>
          <button onclick="showForm('venta', '${venta.id}')" class="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50" title="Editar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function verDetalleVenta(ventaId) {
  const venta = ventas.find(v => v.id === ventaId);
  if (!venta) return;
  
  ventaSeleccionadaId = ventaId;
  document.getElementById('tituloDetalleVenta').textContent = venta.cliente;
  
  const productosHtml = venta.productos?.map(p => `
    <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
      <div>
        <p class="font-medium text-gray-800 dark:text-white">${p.nombre}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">${p.cantidad} × C$${p.precioVenta.toLocaleString()}</p>
      </div>
      <div class="text-right">
        <p class="font-bold text-gray-800 dark:text-white">C$${(p.precioVenta * p.cantidad).toLocaleString()}</p>
        <p class="text-xs text-green-600">Costo: C$${(p.precioCarmen || p.precioCompra || 0).toLocaleString()}</p>
      </div>
    </div>
  `).join('') || '<p class="text-gray-500 text-center">Sin productos</p>';
  
  const cobrosVenta = cobros.filter(c => c.ventaId === ventaId);
  const cobrosHtml = cobrosVenta.length > 0 ? cobrosVenta.map(c => `
    <div class="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
      <div>
        <p class="font-medium text-green-800 dark:text-green-300">${formatFecha(c.fecha)}</p>
        <p class="text-xs text-green-600 dark:text-green-400">${c.metodo} ${c.notas ? '- ' + c.notas : ''}</p>
      </div>
      <p class="font-bold text-green-800 dark:text-green-300">C$${c.monto.toLocaleString()}</p>
    </div>
  `).join('') : '<p class="text-gray-500 text-sm text-center italic">Sin cobros registrados</p>';
  
  document.getElementById('contenidoDetalleVenta').innerHTML = `
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
        <p class="text-xs text-green-600 dark:text-green-400">Total Venta</p>
        <p class="text-lg font-bold text-green-800 dark:text-green-300">C$${venta.precioTotal.toLocaleString()}</p>
      </div>
      <div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl">
        <p class="text-xs text-orange-600 dark:text-orange-400">Saldo Pendiente</p>
        <p class="text-lg font-bold text-orange-800 dark:text-orange-300">C$${venta.saldo.toLocaleString()}</p>
      </div>
    </div>
    
    <div class="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl mb-4">
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Información del Crédito</p>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><span class="text-gray-600 dark:text-gray-400">Meses:</span> <span class="font-medium text-gray-800 dark:text-white">${venta.meses}</span></div>
        <div><span class="text-gray-600 dark:text-gray-400">Cuota:</span> <span class="font-medium text-gray-800 dark:text-white">C$${venta.cuotaMensual?.toLocaleString() || 0}</span></div>
        <div><span class="text-gray-600 dark:text-gray-400">Prima:</span> <span class="font-medium text-gray-800 dark:text-white">C$${venta.prima.toLocaleString()}</span></div>
        <div><span class="text-gray-600 dark:text-gray-400">Próximo:</span> <span class="font-medium text-gray-800 dark:text-white">${formatFecha(venta.proximaFechaCobro)}</span></div>
      </div>
    </div>
    
    <div class="mb-4">
      <h4 class="font-bold text-gray-800 dark:text-white mb-2">Productos Vendidos</h4>
      <div class="space-y-2 max-h-40 overflow-y-auto">${productosHtml}</div>
    </div>
    
    <div>
      <h4 class="font-bold text-gray-800 dark:text-white mb-2">Historial de Cobros (${cobrosVenta.length})</h4>
      <div class="space-y-2 max-h-40 overflow-y-auto">${cobrosHtml}</div>
    </div>
  `;
  
  document.getElementById('modalDetalleVenta').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

function editarVentaDesdeModal() {
  cerrarModal('modalDetalleVenta');
  showForm('venta', ventaSeleccionadaId);
}

// ==========================================
// ABONOS Y COBROS
// ==========================================
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
        <div class="flex justify-between"><span class="text-sm text-gray-600 dark:text-gray-400">Total:</span><span class="font-bold text-indigo-800 dark:text-indigo-300">C$${lote.totalInicial.toLocaleString()}</span></div>
        <div class="flex justify-between"><span class="text-sm text-gray-600 dark:text-gray-400">Abonado:</span><span class="font-bold text-green-600 dark:text-green-400">C$${lote.abonado.toLocaleString()}</span></div>
        <div class="flex justify-between border-t border-indigo-200 dark:border-indigo-800 pt-2"><span class="text-sm font-medium text-gray-700 dark:text-gray-300">Saldo:</span><span class="font-bold text-red-600 dark:text-red-400">C$${lote.saldoPendiente.toLocaleString()}</span></div>
      </div>
    `;
    infoDiv.classList.remove('hidden');
  }
}

function guardarAbono() {
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
    alert(`El monto no puede superar el saldo (C$${lote.saldoPendiente.toLocaleString()})`);
    return;
  }
  
  abonos.push({
    id: Date.now(),
    loteId,
    fecha,
    monto,
    metodo,
    notas,
    saldoDespues: lote.saldoPendiente - monto,
    lastModified: Date.now()
  });
  
  lote.abonado += monto;
  lote.saldoPendiente -= monto;
  if (lote.saldoPendiente <= 0) {
    lote.estado = 'PAGADO';
    lote.fechaPagoTotal = fecha;
  }
  lote.lastModified = Date.now();
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderAbonos();
  showToast(`Abono de C$${monto.toLocaleString()} registrado`);
}

function renderAbonos() {
  const container = document.getElementById('listaAbonos');
  
  if (abonos.length === 0) {
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4 italic">No hay abonos</p>';
    return;
  }
  
  const abonosOrdenados = [...abonos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10);
  
  container.innerHTML = abonosOrdenados.map(abono => `
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow p-3 border border-indigo-200 dark:border-indigo-800">
      <div class="flex justify-between items-start">
        <div>
          <p class="font-bold text-gray-800 dark:text-white">${abono.loteId}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">${formatFecha(abono.fecha)} | ${abono.metodo}</p>
          ${abono.notas ? `<p class="text-xs text-gray-500 dark:text-gray-400">${abono.notas}</p>` : ''}
        </div>
        <p class="text-lg font-bold text-indigo-600 dark:text-indigo-400">C$${abono.monto.toLocaleString()}</p>
      </div>
    </div>
  `).join('');
}

function buscarVentaCobro() {
  const busqueda = document.getElementById('cobroBusqueda').value.trim().toUpperCase();
  const resultadosDiv = document.getElementById('resultadosBusquedaCobro');
  
  if (busqueda.length < 2) {
    resultadosDiv.classList.add('hidden');
    return;
  }
  
  const resultados = ventas.filter(v => 
    v.estado === 'PENDIENTE' && 
    (v.id.toUpperCase().includes(busqueda) || v.cliente.toUpperCase().includes(busqueda))
  );
  
  if (resultados.length === 0) {
    resultadosDiv.innerHTML = '<p class="text-gray-500 text-sm text-center py-2">No se encontraron ventas</p>';
    resultadosDiv.classList.remove('hidden');
    return;
  }
  
  resultadosDiv.innerHTML = resultados.map(v => `
    <div onclick="seleccionarVentaCobro('${v.id}')" class="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
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
  const venta = ventas.find(v => v.id === ventaId);
  if (!venta) return;
  
  document.getElementById('cobroVentaId').value = ventaId;
  document.getElementById('resultadosBusquedaCobro').classList.add('hidden');
  
  const infoDiv = document.getElementById('infoVentaCobro');
  infoDiv.innerHTML = `
    <div class="space-y-2">
      <div class="flex justify-between"><span class="text-sm font-medium text-gray-700 dark:text-gray-300">Cliente:</span><span class="text-sm font-bold text-gray-800 dark:text-white">${venta.cliente}</span></div>
      <div class="flex justify-between"><span class="text-sm text-gray-600 dark:text-gray-400">Total:</span><span class="text-sm font-medium text-gray-800 dark:text-white">C$${venta.precioTotal.toLocaleString()}</span></div>
      <div class="flex justify-between"><span class="text-sm text-gray-600 dark:text-gray-400">Pagado:</span><span class="text-sm font-medium text-green-600 dark:text-green-400">C$${venta.pagado.toLocaleString()}</span></div>
      <div class="flex justify-between border-t border-green-200 dark:border-green-800 pt-2"><span class="text-sm font-medium text-gray-700 dark:text-gray-300">Saldo:</span><span class="text-sm font-bold text-orange-600 dark:text-orange-400">C$${venta.saldo.toLocaleString()}</span></div>
    </div>
  `;
  infoDiv.classList.remove('hidden');
}

function guardarCobro() {
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
    alert(`El monto no puede superar el saldo (C$${venta.saldo.toLocaleString()})`);
    return;
  }
  
  cobros.push({
    id: Date.now(),
    ventaId,
    fecha,
    monto,
    metodo,
    notas,
    lastModified: Date.now()
  });
  
  venta.pagado += monto;
  venta.saldo -= monto;
  
  const proximaFecha = new Date(venta.proximaFechaCobro);
  proximaFecha.setMonth(proximaFecha.getMonth() + 1);
  venta.proximaFechaCobro = proximaFecha.toISOString().split('T')[0];
  
  if (venta.saldo <= 0) {
    venta.estado = 'PAGADO';
    venta.fechaPagoTotal = fecha;
  }
  venta.lastModified = Date.now();
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderCobros();
  showToast(`Cobro de C$${monto.toLocaleString()} registrado`);
}

function renderCobros() {
  const container = document.getElementById('listaCobros');
  
  if (cobros.length === 0) {
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4 italic">No hay cobros</p>';
    return;
  }
  
  const cobrosOrdenados = [...cobros].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10);
  
  container.innerHTML = cobrosOrdenados.map(cobro => {
    const venta = ventas.find(v => v.id === cobro.ventaId);
    return `
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow p-3 border border-green-200 dark:border-green-800">
        <div class="flex justify-between items-start">
          <div>
            <p class="font-bold text-gray-800 dark:text-white">${venta?.cliente || 'Cliente'}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${formatFecha(cobro.fecha)} | ${cobro.metodo}</p>
            ${cobro.notas ? `<p class="text-xs text-gray-500 dark:text-gray-400">${cobro.notas}</p>` : ''}
          </div>
          <p class="text-lg font-bold text-green-600 dark:text-green-400">C$${cobro.monto.toLocaleString()}</p>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// UTILIDADES
// ==========================================
function formatFecha(fechaStr) {
  if (!fechaStr) return 'N/A';
  const fecha = new Date(fechaStr);
  return fecha.toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = message;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3000);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideForms();
    cerrarModal('modalDetalleLote');
    cerrarModal('modalDetalleCompra');
    cerrarModal('modalDetalleVenta');
    cerrarModal('modalConfigSync');
  }
});